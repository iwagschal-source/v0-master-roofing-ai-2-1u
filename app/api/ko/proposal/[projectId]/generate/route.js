/**
 * Proposal Generate API (Step 8.D)
 *
 * Generates a proposal document by merging takeoff data into the Word template.
 * Saves the generated document to the project's Proposals folder in Google Drive.
 * Returns the document for download.
 *
 * SESSION 24 FIXES:
 * - FIX 1: Standalone items now show location names (e.g., "1st Floor") not just "186.7 SF"
 * - FIX 2: Project summary includes standalone item scopes, not just bundle section titles
 *
 * SESSION 42 (Phase 5):
 * - Accepts sortOrder from UI to reorder sections and items in generated DOCX
 * - Includes version date (sheet name) in proposal metadata
 * - Proposal naming: {project}-proposal-{version_date}-{timestamp}.docx
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'
import { getAccessToken } from '@/lib/google-sheets'
import { updateVersionStatus } from '@/lib/version-management'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

/**
 * POST /api/ko/proposal/[projectId]/generate
 *
 * Generates a proposal document from takeoff data.
 *
 * Body (optional):
 * - editedDescriptions: Object mapping item keys to custom descriptions
 * - sheet: Version sheet name (e.g., "2026-02-13")
 * - sortOrder: { sections: [{rowNumber, itemOrder: [rowNumbers]}], standalones: [rowNumbers] }
 *
 * Returns:
 * - The generated .docx file for download
 * - Also saves to Google Drive Proposals folder
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json().catch(() => ({}))
    const { editedDescriptions = {}, sheet, sortOrder } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    // 1. Get preview data (reuse the preview endpoint logic)
    const previewData = await getProposalPreviewData(projectId, request, sheet)

    if (!previewData) {
      return NextResponse.json(
        { error: 'Failed to get proposal preview data' },
        { status: 500 }
      )
    }

    // 2. Apply sort order if provided (reorder sections and items per user's drag-to-sort)
    if (sortOrder) {
      applySortOrder(previewData, sortOrder)
    }

    // 3. Transform data for docxtemplater
    const templateData = transformForTemplate(previewData, editedDescriptions, sheet)

    // 3. Load template from public URL (works on Vercel)
    const templateUrl = new URL('/templates/Proposal_Template_v1_FIXED.docx', request.url)
    const templateResponse = await fetch(templateUrl)

    if (!templateResponse.ok) {
      throw new Error('Failed to load proposal template')
    }

    const templateBuffer = await templateResponse.arrayBuffer()

    // 4. Try to render template, fall back to JSON if template has issues
    let outputBuffer
    try {
      const zip = new PizZip(templateBuffer)

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: '{', end: '}' },
        nullGetter: () => '',
      })

      doc.render(templateData)
      outputBuffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      })
    } catch (templateErr) {
      // Template has formatting issues - return JSON data instead
      console.error('Template processing failed:', templateErr.message)
      return NextResponse.json({
        success: true,
        format: 'json',
        message: 'Template has formatting issues. Proposal data returned as JSON.',
        proposalData: templateData,
        project: previewData.project
      }, { status: 200 })
    }

    // 6. Save to Google Drive Proposals folder
    const driveResult = await saveToGoogleDrive(
      projectId,
      previewData.project.name,
      outputBuffer,
      sheet
    )

    // 7. Link proposal to version tracker (update status on Setup tab)
    if (sheet && previewData.project.spreadsheetId) {
      try {
        await updateVersionStatus(previewData.project.spreadsheetId, sheet, 'Proposal Generated')
      } catch (trackerErr) {
        // Non-fatal — log but don't fail the generation
        console.warn('[generate] Failed to update version tracker:', trackerErr.message)
      }
    }

    // 8. Return the document for download
    // Naming: {project}-proposal-{version_date}-{timestamp}.docx
    const projectSlug = (previewData.project.name || 'Project').replace(/[^a-zA-Z0-9]/g, '_')
    const versionDate = sheet || new Date().toISOString().split('T')[0]
    const timestamp = Date.now()
    const filename = `${projectSlug}-proposal-${versionDate}-${timestamp}.docx`

    return new NextResponse(outputBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Drive-File-Id': driveResult?.fileId || '',
        'X-Drive-File-Url': driveResult?.webViewLink || ''
      }
    })

  } catch (err) {
    console.error('Proposal generate error:', err)
    // Return detailed error for debugging
    const errorDetails = {
      message: err.message,
      name: err.name,
      // docxtemplater specific errors
      properties: err.properties ? {
        errors: err.properties.errors?.map(e => ({
          message: e.message,
          name: e.name,
          properties: e.properties
        }))
      } : undefined
    }
    return NextResponse.json(
      { error: 'Failed to generate proposal: ' + err.message, details: errorDetails },
      { status: 500 }
    )
  }
}

/**
 * Get proposal preview data (similar to preview endpoint)
 */
async function getProposalPreviewData(projectId, request, sheet = null) {
  try {
    // Get project info
    const projectResult = await runQuery(
      `SELECT
        pf.id,
        pf.takeoff_spreadsheet_id,
        pf.project_name,
        pf.address,
        pf.city,
        pf.state,
        pf.zip,
        pf.drive_folder_id,
        c.company_name as gc_name
       FROM \`master-roofing-intelligence.mr_main.project_folders\` pf
       LEFT JOIN \`master-roofing-intelligence.mr_main.contacts_companies\` c
         ON pf.contact_id = c.id
       WHERE pf.id = @projectId`,
      { projectId },
      { location: 'US' }
    )

    if (projectResult.length === 0) {
      throw new Error('Project not found')
    }

    const project = projectResult[0]

    // Get preview from internal API call
    const previewUrl = new URL(`/api/ko/proposal/${projectId}/preview`, request.url)
    if (sheet) previewUrl.searchParams.set('sheet', sheet)
    const previewRes = await fetch(previewUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!previewRes.ok) {
      const errData = await previewRes.json()
      throw new Error(errData.error || 'Preview fetch failed')
    }

    const previewData = await previewRes.json()

    // Add drive_folder_id and spreadsheetId to project info
    previewData.project.driveFolderId = project.drive_folder_id
    previewData.project.spreadsheetId = project.takeoff_spreadsheet_id

    return previewData

  } catch (err) {
    console.error('Failed to get preview data:', err)
    return null
  }
}

/**
 * Apply user's custom sort order to preview data (mutates in place).
 * sortOrder: { sections: [{rowNumber, itemOrder: [rowNumbers]}], standalones: [rowNumbers] }
 */
function applySortOrder(previewData, sortOrder) {
  if (sortOrder.sections && Array.isArray(sortOrder.sections)) {
    const sectionMap = {}
    for (const section of previewData.sections || []) {
      sectionMap[section.rowNumber] = section
    }

    const reordered = []
    for (const entry of sortOrder.sections) {
      const section = sectionMap[entry.rowNumber]
      if (!section) continue

      // Reorder items within section
      if (entry.itemOrder && Array.isArray(entry.itemOrder)) {
        const itemMap = {}
        for (const item of section.items || []) {
          itemMap[item.rowNumber] = item
        }
        const reorderedItems = []
        for (const rowNum of entry.itemOrder) {
          if (itemMap[rowNum]) reorderedItems.push(itemMap[rowNum])
        }
        // Append any items not in the sort order (safety net)
        for (const item of section.items || []) {
          if (!entry.itemOrder.includes(item.rowNumber)) {
            reorderedItems.push(item)
          }
        }
        section.items = reorderedItems
      }

      reordered.push(section)
    }

    // Append any sections not in the sort order
    for (const section of previewData.sections || []) {
      if (!sortOrder.sections.some(s => s.rowNumber === section.rowNumber)) {
        reordered.push(section)
      }
    }

    previewData.sections = reordered
  }

  if (sortOrder.standalones && Array.isArray(sortOrder.standalones)) {
    const standaloneMap = {}
    for (const item of previewData.standaloneItems || []) {
      standaloneMap[item.rowNumber] = item
    }
    const reordered = []
    for (const rowNum of sortOrder.standalones) {
      if (standaloneMap[rowNum]) reordered.push(standaloneMap[rowNum])
    }
    // Append any not in sort order
    for (const item of previewData.standaloneItems || []) {
      if (!sortOrder.standalones.includes(item.rowNumber)) {
        reordered.push(item)
      }
    }
    previewData.standaloneItems = reordered
  }
}

/**
 * Transform preview data for docxtemplater
 *
 * SESSION 24 v2:
 * - Splits items into line_items (BASE) and alt_line_items (ALT) by bidType
 * - Calculates base_bid_total and add_alt_total separately
 * - Drops r_value, size, type from line items (moved into descriptions)
 */
function transformForTemplate(previewData, editedDescriptions, sheet = null) {
  const { project, sections, standaloneItems, totals } = previewData

  // Format date — use version date (sheet name) if available, otherwise today
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const versionDate = sheet || today.toISOString().split('T')[0]

  // Build ALL line items first, then split by bidType
  const allItems = []

  for (const section of sections || []) {
    const mainItem = section.mainItemId
      ? section.items?.find(i => i.itemId === section.mainItemId)
      : section.items?.[0]

    allItems.push({
      section_title: section.title || section.sectionType || 'Work Section',
      price: formatCurrency(section.subtotal),
      areas: formatAreas(section.items),
      description: buildSectionDescription(section, editedDescriptions),
      bidType: (section.bidType || 'BASE').toUpperCase(),
      _numericPrice: section.subtotal || 0
    })
  }

  for (const item of standaloneItems || []) {
    const descKey = `standalone-${item.rowNumber}`
    allItems.push({
      section_title: item.name || item.itemId || 'Additional Item',
      price: formatCurrency(item.totalCost),
      areas: formatStandaloneAreas(item),
      description: editedDescriptions[descKey] || item.description || '',
      bidType: (item.bidType || 'BASE').toUpperCase(),
      _numericPrice: item.totalCost || 0
    })
  }

  // Split by bid type
  const lineItems = allItems
    .filter(item => item.bidType !== 'ALT')
    .map(({ bidType, _numericPrice, ...rest }) => rest)

  const altLineItems = allItems
    .filter(item => item.bidType === 'ALT')
    .map(({ bidType, _numericPrice, ...rest }) => rest)

  // Calculate totals
  const baseBidTotal = allItems
    .filter(item => item.bidType !== 'ALT')
    .reduce((sum, item) => sum + item._numericPrice, 0)

  const addAltTotal = allItems
    .filter(item => item.bidType === 'ALT')
    .reduce((sum, item) => sum + item._numericPrice, 0)

  const grandTotal = baseBidTotal + addAltTotal

  // Build project summary
  const projectSummary = buildProjectSummary(previewData)

  return {
    project_name: project.name || project.address || 'Project',
    date: formattedDate,
    version_date: versionDate,
    prepared_for: project.gcName || 'General Contractor',
    date_drawings: '',
    proposal_version: 'Rev 1',
    project_summary: projectSummary,
    line_items: lineItems,
    alt_line_items: altLineItems,
    base_bid_total: formatCurrency(baseBidTotal),
    add_alt_total: formatCurrency(addAltTotal),
    add_alt_toatl: formatCurrency(addAltTotal), // Match template typo
    grand_total_bid: formatCurrency(grandTotal),
    has_alternates: altLineItems.length > 0
  }
}

/**
 * Build section description from items
 * Prefers the main item's sectionDescription (from paragraph_description)
 */
function buildSectionDescription(section, editedDescriptions) {
  // Check for edited description first
  const editKey = `section-${section.title}`
  if (editedDescriptions[editKey]) {
    return editedDescriptions[editKey]
  }

  // Use the section's main item description if available
  if (section.sectionDescription) {
    return section.sectionDescription
  }

  // Fall back to joining all item descriptions
  const descriptions = []
  for (const item of section.items || []) {
    const descKey = `section-${section.title}-item-${item.rowNumber}`
    const desc = editedDescriptions[descKey] || item.description
    if (desc && desc !== item.name && desc !== item.itemId && desc !== 'No description') {
      descriptions.push(desc)
    }
  }

  return descriptions.join('\n\n') || `Installation of ${section.title || section.sectionType || 'roofing system'} as specified.`
}

/**
 * Format areas from section items (for bundles)
 * Shows only location names where measurements exist (e.g., "1st Floor, Main Roof")
 */
function formatAreas(items) {
  if (!items || items.length === 0) return ''

  // Collect all locations with measurements across items
  const locationSet = new Set()
  for (const item of items) {
    if (item.locations) {
      for (const [locName, value] of Object.entries(item.locations)) {
        // Skip col_ prefixed keys (old format) - use actual names
        if (!locName.startsWith('col_') && value > 0) {
          locationSet.add(locName)
        }
      }
    }
  }

  const locationNames = Array.from(locationSet)
  return locationNames.length > 0 ? locationNames.join(', ') : ''
}

/**
 * [FIX 1] Format areas for standalone items
 * Shows location names where measurements exist, just like bundles.
 * e.g., "1st Floor" instead of "186.7 SF"
 */
function formatStandaloneAreas(item) {
  if (!item.locations || Object.keys(item.locations).length === 0) return ''

  const locationNames = []
  for (const [locName, value] of Object.entries(item.locations)) {
    if (!locName.startsWith('col_') && value > 0) {
      locationNames.push(locName)
    }
  }

  return locationNames.length > 0 ? locationNames.join(', ') : ''
}

/**
 * [FIX 2] Build project summary text
 * Includes both bundle section titles AND standalone item names
 */
function buildProjectSummary(previewData) {
  const { project, sections, standaloneItems } = previewData

  const scopeTypes = []

  // Add bundle section titles
  for (const section of sections || []) {
    if (section.sectionType) {
      scopeTypes.push(section.sectionType)
    }
  }

  // Add standalone item names
  for (const item of standaloneItems || []) {
    if (item.name) {
      scopeTypes.push(item.name)
    }
  }

  const uniqueScopes = [...new Set(scopeTypes)]

  if (uniqueScopes.length === 0) {
    return `This proposal covers the roofing and related work for the project located at ${project.address || 'the specified address'}. Our scope includes all labor, materials, and supervision required to complete the work as described herein.`
  }

  const scopeList = uniqueScopes.join(', ').toLowerCase()
  return `This proposal covers ${scopeList} work for the project located at ${project.address || 'the specified address'}. Our scope includes all labor, materials, and supervision required to complete the work as described herein, in accordance with standard industry practices.`
}

/**
 * Format currency
 */
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '$0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value)
}

/**
 * Save generated document to Google Drive Proposals folder
 */
async function saveToGoogleDrive(projectId, projectName, docBuffer, sheet = null) {
  try {
    const accessToken = await getAccessToken()

    // Get the project's Proposals folder ID
    const folderResult = await runQuery(
      `SELECT drive_folder_id FROM \`master-roofing-intelligence.mr_main.project_folders\`
       WHERE id = @projectId`,
      { projectId },
      { location: 'US' }
    )

    if (folderResult.length === 0 || !folderResult[0].drive_folder_id) {
      console.warn('No Drive folder found for project, skipping upload')
      return null
    }

    const parentFolderId = folderResult[0].drive_folder_id

    // Find or create Proposals subfolder
    const proposalsFolderId = await getOrCreateSubfolder(accessToken, parentFolderId, 'Proposals')

    if (!proposalsFolderId) {
      console.warn('Could not get/create Proposals folder, skipping upload')
      return null
    }

    // Upload the document — matches download filename pattern
    const projectSlug = projectName.replace(/[^a-zA-Z0-9]/g, '_')
    const versionDate = sheet || new Date().toISOString().split('T')[0]
    const filename = `${projectSlug}-proposal-${versionDate}-${Date.now()}.docx`

    // Use multipart upload for file content
    const boundary = '-------314159265358979323846'
    const metadata = {
      name: filename,
      parents: [proposalsFolderId],
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }

    const multipartBody =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) + '\r\n' +
      `--${boundary}\r\n` +
      'Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n'

    const multipartEnd = `\r\n--${boundary}--`

    const bodyBuffer = Buffer.concat([
      Buffer.from(multipartBody, 'utf-8'),
      docBuffer,
      Buffer.from(multipartEnd, 'utf-8')
    ])

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
          'Content-Length': bodyBuffer.length.toString()
        },
        body: bodyBuffer
      }
    )

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text()
      console.error('Drive upload failed:', error)
      return null
    }

    const uploadResult = await uploadResponse.json()
    console.log(`[Drive] Uploaded proposal: ${filename} (${uploadResult.id})`)

    return {
      fileId: uploadResult.id,
      webViewLink: uploadResult.webViewLink
    }

  } catch (err) {
    console.error('Failed to save to Drive:', err)
    return null
  }
}

/**
 * Get or create a subfolder within a parent folder
 */
async function getOrCreateSubfolder(accessToken, parentFolderId, subfolderName) {
  try {
    // Search for existing subfolder
    const searchQuery = `name='${subfolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`

    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    )

    if (searchResponse.ok) {
      const data = await searchResponse.json()
      if (data.files && data.files.length > 0) {
        return data.files[0].id
      }
    }

    // Create subfolder if not found
    const createResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: subfolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentFolderId]
        })
      }
    )

    if (createResponse.ok) {
      const folder = await createResponse.json()
      console.log(`[Drive] Created subfolder: ${subfolderName} (${folder.id})`)
      return folder.id
    }

    return null

  } catch (err) {
    console.error('Failed to get/create subfolder:', err)
    return null
  }
}
