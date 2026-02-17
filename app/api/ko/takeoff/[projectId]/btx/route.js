/**
 * BTX Generation API - Proxy to Python backend
 * Generates Bluebeam Tool Chest files using the real Bluebeam BTX format
 *
 * Phase 3 (BTX v2): Reads item/location toggles from Setup tab via setup-config,
 * instead of sheet-config from the takeoff tab. Saves BTX zip to Drive Markups folder.
 */

import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/google-sheets'
import { runQuery } from '@/lib/bigquery'
import { readSetupConfig, updateToolStatus } from '@/lib/version-management'

// FastAPI backend on port 8000 (HTTP, not HTTPS)
const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://136.111.252.120:8000'

/**
 * POST /api/ko/takeoff/[projectId]/btx
 * Generate and download BTX file via Python backend
 *
 * Accepts body:
 * - config: { selectedItems: [{scope_code}], columns: [{name, mappings}] } (legacy sheet-config format)
 * - OR setupConfig: { items: [{item_id, locations: [{name}]}], locations: [{name}] } (new setup-config format)
 * - projectName: string
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()

    const projectName = body.projectName || projectId
    let selectedItemIds = []
    let locationsWithNames = []

    // Per-item location data for filtering (only built from setupConfig)
    let itemsWithLocations = null

    if (body.setupConfig) {
      // New Setup tab format (Phase 3)
      const { items, locations } = body.setupConfig

      if (!items?.length || !locations?.length) {
        return NextResponse.json({ error: 'No items or locations toggled on Setup tab.' }, { status: 400 })
      }

      selectedItemIds = items.map(item => item.item_id)
      locationsWithNames = locations.map(loc => ({
        code: loc.name.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        name: loc.name
      }))

      // Build per-item location data so the Python backend can filter
      // each BTX file to only include items that belong to that location
      itemsWithLocations = items.map(item => ({
        item_id: item.item_id,
        locations: (item.locations || []).map(loc => ({
          code: loc.name.toUpperCase().replace(/[^A-Z0-9]/g, ''),
          name: loc.name
        }))
      }))
    } else {
      // Legacy config format (backward compatibility)
      let config = body.config
      if (!config) {
        const configRes = await fetch(`${request.nextUrl.origin}/api/ko/takeoff/${projectId}/config`)
        if (configRes.ok) {
          const data = await configRes.json()
          config = data.config
        }
      }

      if (!config?.selectedItems?.length || !config?.columns?.length) {
        return NextResponse.json({ error: 'No config. Set up takeoff first.' }, { status: 400 })
      }

      selectedItemIds = config.selectedItems.map(item => item.scope_code)
      locationsWithNames = config.columns.map(col => ({
        code: col.mappings?.[0] || col.name.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        name: col.name
      }))
    }

    console.log('[BTX] Per-floor mode:', {
      project_name: projectName,
      selected_items: selectedItemIds,
      locations: locationsWithNames,
      items_with_locations: itemsWithLocations ? `${itemsWithLocations.length} items with per-item locations` : 'none (legacy)'
    })

    const requestBody = {
      project_name: projectName,
      selected_items: selectedItemIds,
      locations: locationsWithNames
    }
    // Include per-item locations when available (setupConfig path)
    if (itemsWithLocations) {
      requestBody.items_with_locations = itemsWithLocations
    }

    const perFloorRes = await fetch(`${BACKEND_URL}/bluebeam/generate-btx-per-floor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000)
    })

    if (!perFloorRes.ok) {
      const errText = await perFloorRes.text()
      console.error('BTX per-floor backend error:', errText)
      return NextResponse.json({ error: 'Per-floor BTX generation failed: ' + errText }, { status: 500 })
    }

    const zipBuffer = await perFloorRes.arrayBuffer()
    console.log('[BTX] Per-floor zip size:', zipBuffer.byteLength, 'bytes')
    const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_')
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `${safeName}-tools-${dateStr}.zip`

    // Save to Google Drive Markups folder (non-fatal — download still works if this fails)
    let driveResult = null
    try {
      driveResult = await saveBtxToDrive(projectId, filename, Buffer.from(zipBuffer))
    } catch (driveErr) {
      console.warn('[BTX] Drive save failed (non-fatal):', driveErr.message)
    }

    // 11E: Mark generated items as "Generated" in Setup tab Column Q (non-fatal)
    try {
      const spreadsheetResult = await runQuery(
        `SELECT takeoff_spreadsheet_id FROM \`master-roofing-intelligence.mr_main.project_folders\` WHERE id = @projectId`,
        { projectId }, { location: 'US' }
      )
      if (spreadsheetResult.length > 0 && spreadsheetResult[0].takeoff_spreadsheet_id) {
        const spreadsheetId = spreadsheetResult[0].takeoff_spreadsheet_id
        const setupConfig = await readSetupConfig(spreadsheetId)
        const generatedItemIds = new Set(selectedItemIds.map(id => id.toUpperCase()))
        const generatedItems = setupConfig.rows
          .filter(r => r.hasAnyToggle && generatedItemIds.has(r.itemId.toUpperCase()))
          .map(r => ({ itemId: r.itemId, rowNum: r.rowNum }))
        await updateToolStatus(spreadsheetId, generatedItems)
      }
    } catch (statusErr) {
      console.warn('[BTX] Tool status update failed (non-fatal):', statusErr.message)
    }

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...(driveResult?.webViewLink ? { 'X-Drive-Link': driveResult.webViewLink } : {})
      }
    })

  } catch (err) {
    console.error('BTX error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * GET /api/ko/takeoff/[projectId]/btx
 * Check BTX readiness + report which items already have tools (11E incremental)
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = await params

    // Try setup-config first (Phase 3), fall back to legacy config
    const setupRes = await fetch(`${request.nextUrl.origin}/api/ko/takeoff/${projectId}/setup-config`)

    if (setupRes.ok) {
      const data = await setupRes.json()
      if (!data.selected_items?.length) {
        return NextResponse.json({ ready: false, message: 'No items toggled on Setup tab' })
      }

      // 11E: Read tool status from Setup tab Column Q
      let alreadyGenerated = 0
      let needsGeneration = 0
      try {
        const spreadsheetResult = await runQuery(
          `SELECT takeoff_spreadsheet_id FROM \`master-roofing-intelligence.mr_main.project_folders\` WHERE id = @projectId`,
          { projectId }, { location: 'US' }
        )
        if (spreadsheetResult.length > 0 && spreadsheetResult[0].takeoff_spreadsheet_id) {
          const setupConfig = await readSetupConfig(spreadsheetResult[0].takeoff_spreadsheet_id)
          for (const row of setupConfig.rows) {
            if (row.hasAnyToggle) {
              if (row.toolStatus && row.toolStatus.startsWith('Generated')) {
                alreadyGenerated++
              } else {
                needsGeneration++
              }
            }
          }
        }
      } catch (statusErr) {
        console.warn('[BTX] Tool status read failed (non-fatal):', statusErr.message)
      }

      return NextResponse.json({
        ready: true,
        toolCount: data.tool_count,
        items: data.items_count,
        locations: data.locations_count,
        source: 'setup-tab',
        alreadyGenerated,
        needsGeneration,
      })
    }

    // Fallback: legacy config
    const configRes = await fetch(`${request.nextUrl.origin}/api/ko/takeoff/${projectId}/config`)
    if (!configRes.ok) {
      return NextResponse.json({ ready: false, message: 'No config' })
    }

    const { config } = await configRes.json()
    if (!config?.selectedItems?.length || !config?.columns?.length) {
      return NextResponse.json({ ready: false, message: 'Config incomplete' })
    }

    const toolCount = config.selectedItems.length * config.columns.length
    return NextResponse.json({
      ready: true,
      toolCount,
      items: config.selectedItems.length,
      locations: config.columns.length,
      source: 'legacy-config',
      alreadyGenerated: 0,
      needsGeneration: config.selectedItems.length,
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * Save BTX zip to Google Drive project folder → Markups subfolder
 */
async function saveBtxToDrive(projectId, filename, zipBuffer) {
  const accessToken = await getAccessToken()

  // Get Drive folder ID for this project
  const folderResult = await runQuery(
    `SELECT drive_folder_id FROM \`master-roofing-intelligence.mr_main.project_folders\`
     WHERE id = @projectId`,
    { projectId },
    { location: 'US' }
  )

  if (!folderResult.length || !folderResult[0].drive_folder_id) {
    console.warn('[BTX] No Drive folder found for project, skipping upload')
    return null
  }

  const parentFolderId = folderResult[0].drive_folder_id

  // Find or create Markups subfolder
  const markupsFolderId = await getOrCreateSubfolder(accessToken, parentFolderId, 'Markups')
  if (!markupsFolderId) {
    console.warn('[BTX] Could not get/create Markups folder, skipping upload')
    return null
  }

  // Multipart upload
  const boundary = '-------btx-upload-boundary'
  const metadata = {
    name: filename,
    parents: [markupsFolderId],
    mimeType: 'application/zip'
  }

  const multipartBody =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    `--${boundary}\r\n` +
    'Content-Type: application/zip\r\n\r\n'

  const multipartEnd = `\r\n--${boundary}--`

  const bodyBuffer = Buffer.concat([
    Buffer.from(multipartBody, 'utf-8'),
    zipBuffer,
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
    console.error('[BTX] Drive upload failed:', error)
    return null
  }

  const result = await uploadResponse.json()
  console.log(`[BTX] Uploaded to Drive: ${filename} (${result.id})`)
  return { fileId: result.id, webViewLink: result.webViewLink }
}

/**
 * Get or create a subfolder within a parent Drive folder
 */
async function getOrCreateSubfolder(accessToken, parentFolderId, subfolderName) {
  try {
    const searchQuery = `name='${subfolderName}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&fields=files(id,name)`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )

    if (searchResponse.ok) {
      const data = await searchResponse.json()
      if (data.files?.length > 0) return data.files[0].id
    }

    // Create if not found
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
      console.log(`[BTX] Created Markups subfolder: ${folder.id}`)
      return folder.id
    }

    return null
  } catch (err) {
    console.error('[BTX] Failed to get/create subfolder:', err)
    return null
  }
}
