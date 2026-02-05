/**
 * Proposal Generate API (Step 8.D)
 *
 * Generates a proposal document by merging takeoff data into the Word template.
 * Saves the generated document to the project's Proposals folder in Google Drive.
 * Returns the document for download.
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'
import { getAccessToken } from '@/lib/google-sheets'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'

/**
 * POST /api/ko/proposal/[projectId]/generate
 *
 * Generates a proposal document from takeoff data.
 *
 * Body (optional):
 * - editedDescriptions: Object mapping item keys to custom descriptions
 *
 * Returns:
 * - The generated .docx file for download
 * - Also saves to Google Drive Proposals folder
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json().catch(() => ({}))
    const { editedDescriptions = {} } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    // 1. Get preview data (reuse the preview endpoint logic)
    const previewData = await getProposalPreviewData(projectId, request)

    if (!previewData) {
      return NextResponse.json(
        { error: 'Failed to get proposal preview data' },
        { status: 500 }
      )
    }

    // 2. Transform data for docxtemplater
    const templateData = transformForTemplate(previewData, editedDescriptions)

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
      outputBuffer
    )

    // 7. Return the document for download
    const filename = `Proposal_${previewData.project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`

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
async function getProposalPreviewData(projectId, request) {
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
    const previewRes = await fetch(previewUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    if (!previewRes.ok) {
      const errData = await previewRes.json()
      throw new Error(errData.error || 'Preview fetch failed')
    }

    const previewData = await previewRes.json()

    // Add drive_folder_id to project info
    previewData.project.driveFolderId = project.drive_folder_id

    return previewData

  } catch (err) {
    console.error('Failed to get preview data:', err)
    return null
  }
}

/**
 * Transform preview data for docxtemplater
 */
function transformForTemplate(previewData, editedDescriptions) {
  const { project, sections, standaloneItems, totals } = previewData

  // Format date
  const today = new Date()
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Build line items from sections
  const lineItems = []

  for (const section of sections || []) {
    // Find the main item (the one with paragraph_description) for specs
    // Fall back to first item if no main item identified
    const mainItem = section.mainItemId
      ? section.items?.find(i => i.itemId === section.mainItemId)
      : section.items?.[0]

    // Add section as a line item
    lineItems.push({
      section_title: section.title || section.sectionType || 'Work Section',
      r_value: mainItem?.rValue || '',
      size: mainItem?.thickness || '',
      type: mainItem?.materialType || '',
      price: formatCurrency(section.subtotal),
      areas: formatAreas(section.items),
      description: buildSectionDescription(section, editedDescriptions)
    })
  }

  // Add standalone items
  for (const item of standaloneItems || []) {
    const descKey = `standalone-${item.rowNumber}`
    lineItems.push({
      section_title: item.name || item.itemId || 'Additional Item',
      r_value: item.rValue || '',
      size: item.thickness || '',
      type: item.materialType || '',
      price: formatCurrency(item.totalCost),
      areas: item.totalMeasurements ? `${item.totalMeasurements.toLocaleString()} SF` : '',
      description: editedDescriptions[descKey] || item.description || ''
    })
  }

  // Build project summary
  const projectSummary = buildProjectSummary(previewData)

  // Alt line items (empty for now - can be populated from takeoff alternates)
  const altLineItems = []

  // Calculate grand total from line items
  const grandTotal = lineItems.reduce((sum, item) => {
    const priceNum = parseFloat((item.price || '0').replace(/[^0-9.-]/g, ''))
    return sum + (isNaN(priceNum) ? 0 : priceNum)
  }, 0)

  return {
    project_name: project.name || project.address || 'Project',
    date: formattedDate,
    prepared_for: project.gcName || 'General Contractor',
    date_drawings: '', // Can be populated from project metadata if available
    proposal_version: 'Rev 1',
    project_summary: projectSummary,
    line_items: lineItems,
    alt_line_items: altLineItems,
    grand_total_bid: formatCurrency(grandTotal)
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
 * Format areas from section items
 * Shows location names where measurements exist (e.g., "1st Floor, Main Roof: 74.79 SF")
 */
function formatAreas(items) {
  if (!items || items.length === 0) return ''

  // Collect all locations with measurements across items
  const locationTotals = {}
  for (const item of items) {
    if (item.locations) {
      for (const [locName, value] of Object.entries(item.locations)) {
        // Skip col_ prefixed keys (old format) - use actual names
        if (!locName.startsWith('col_')) {
          locationTotals[locName] = (locationTotals[locName] || 0) + (value || 0)
        }
      }
    }
  }

  const locationNames = Object.keys(locationTotals).filter(k => locationTotals[k] > 0)
  const totalSF = items.reduce((sum, item) => sum + (item.totalMeasurements || 0), 0)

  if (locationNames.length > 0) {
    // Show location names with total
    return `${locationNames.join(', ')}: ${totalSF.toLocaleString()} SF`
  }

  return totalSF > 0 ? `${totalSF.toLocaleString()} SF` : ''
}

/**
 * Build project summary text
 */
function buildProjectSummary(previewData) {
  const { project, sections, standaloneItems } = previewData

  const scopeTypes = []
  for (const section of sections || []) {
    if (section.sectionType) {
      scopeTypes.push(section.sectionType)
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
async function saveToGoogleDrive(projectId, projectName, docBuffer) {
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

    // Upload the document
    const filename = `Proposal_${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`

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
