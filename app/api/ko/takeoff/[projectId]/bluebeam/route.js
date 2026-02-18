/**
 * Bluebeam Import API
 *
 * Import Bluebeam CSV data into a project's takeoff Google Sheet tab.
 *
 * Supports two parsing modes:
 * 1. DETERMINISTIC: If project has a saved config, parses using PIPE delimiter
 *    Subject format: "ITEM_CODE | LOCATION" (e.g., "MR-VB | FL1")
 *
 * 2. LEGACY/FUZZY: Falls back to pattern matching for older exports
 */

import { NextResponse } from 'next/server'
import https from 'https'
import { fillBluebeamDataToTab, fillBluebeamDataToSpreadsheet, getTakeoffTab, createTakeoffTab, getAccessToken } from '@/lib/google-sheets'
import { runQuery } from '@/lib/bigquery'
import { readSetupConfig } from '@/lib/version-management'
import { setFilePublicRead } from '@/lib/google-drive'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://136.111.252.120:8000'

// Custom fetch that ignores SSL cert errors
const fetchWithSSL = async (url, options = {}) => {
  const agent = new https.Agent({ rejectUnauthorized: false })
  return fetch(url, { ...options, agent })
}

// Pattern matching for Bluebeam layer names → item codes
const ITEM_PATTERNS = [
  { pattern: /river\s*rock|ballast/i, code: 'OVERBURDEN' },
  { pattern: /artificial\s*turf|green\s*roof|vegetat/i, code: 'GREEN' },
  { pattern: /ptac|ac\s*unit|dunnage/i, code: 'AC' },
  { pattern: /paver|concrete\s*paver/i, code: 'PAVER' },
  { pattern: /w\.?p\.?|waterproof|liquid\s*wp/i, code: 'LIQUID-WP' },
  { pattern: /vapor\s*barrier|vb\b/i, code: 'VB' },
  { pattern: /drain|roof\s*drain/i, code: 'DRAIN' },
  { pattern: /coping|cope\b/i, code: 'COPE' },
  { pattern: /traffic\s*coat/i, code: 'TRAFFIC' },
  { pattern: /pitch\s*pocket|pitch\b/i, code: 'PITCH' },
  { pattern: /2\s*ply|two\s*ply|buildup/i, code: 'ROOF-2PLY' },
  { pattern: /irma/i, code: 'IRMA' },
  { pattern: /pmma/i, code: 'PMMA' },
  { pattern: /scupper|leader/i, code: 'SCUPPER' },
  { pattern: /door\s*pan|door\s*std|threshold/i, code: 'DOOR-STD' },
  { pattern: /hatch|skylight/i, code: 'HATCH' },
  { pattern: /mech\s*pad|equipment\s*pad/i, code: 'MECH-PAD' },
  { pattern: /fence|guard/i, code: 'FENCE' },
  { pattern: /rail|hand\s*rail/i, code: 'RAIL' },
  { pattern: /plumb|pipe\s*boot/i, code: 'PLUMB' },
  { pattern: /mech\s*pen|penetration/i, code: 'MECH-PEN' },
  { pattern: /davit|anchor/i, code: 'DAVIT' },
  { pattern: /flash|flashing/i, code: 'FLASH' },
  { pattern: /drip\s*cap/i, code: 'DRIPCAP' },
  { pattern: /sill/i, code: 'SILL' },
  { pattern: /tie\s*in|tiein/i, code: 'TIEIN' },
  { pattern: /brick|masonry/i, code: 'BRICK' },
  { pattern: /panel|metal\s*panel/i, code: 'PANEL' },
  { pattern: /eifs|stucco/i, code: 'EIFS' },
  { pattern: /up\s*over|upover/i, code: 'UP-OVER' }
]

// Floor detection patterns (for legacy/fuzzy parsing)
const FLOOR_PATTERNS = [
  { pattern: /\bfl\s*1\b|\bfloor\s*1\b|1st\s*floor/i, floor: 'FL1' },
  { pattern: /\bfl\s*2\b|\bfloor\s*2\b|2nd\s*floor/i, floor: 'FL2' },
  { pattern: /\bfl\s*3\b|\bfloor\s*3\b|3rd\s*floor/i, floor: 'FL3' },
  { pattern: /\bfl\s*4\b|\bfloor\s*4\b|4th\s*floor/i, floor: 'FL4' },
  { pattern: /\bfl\s*cellar\b|cellar|basement/i, floor: 'FL1' },
  { pattern: /main\s*roof|roof\b/i, floor: 'ROOF' },
  { pattern: /stair|bulkhead/i, floor: 'STAIR' },
  { pattern: /elev/i, floor: 'ELEV' }
]

/**
 * DETERMINISTIC PARSING
 * Used when project has a saved config with PIPE delimiter format
 * Subject format: "ITEM_CODE | LOCATION" (e.g., "MR-VB | FL1")
 */
function parseDeterministicCSV(csvContent, config) {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length < 2) return { items: [], mode: 'deterministic', error: 'No data rows' }

  // Parse header
  const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())
  const idIdx = header.findIndex(h => h === 'id')
  const subjectIdx = header.findIndex(h => h.includes('subject') || h.includes('layer') || h.includes('label'))
  // Prioritize exact 'measurement' column - it always has the correct value regardless of item type
  // (Length/Area/Count columns only have values for their specific measurement types)
  let measurementIdx = header.findIndex(h => h === 'measurement')
  if (measurementIdx === -1) {
    // Fallback to partial matches if no exact 'measurement' column
    measurementIdx = header.findIndex(h => h.includes('measurement') || h.includes('area') || h.includes('length') || h.includes('count'))
  }

  if (subjectIdx === -1) {
    return { items: [], mode: 'deterministic', error: 'No Subject column found' }
  }

  // Build location mapping from config
  const locationMap = {}
  for (const col of config.columns || []) {
    const locationCode = col.mappings?.[0] || col.name.toUpperCase().replace(/[^A-Z0-9]/g, '')
    locationMap[locationCode] = col.name
    // Also add the full name mapping
    locationMap[col.name.toUpperCase()] = col.name
    // Add each mapping
    for (const mapping of col.mappings || []) {
      locationMap[mapping.toUpperCase()] = col.name
    }
  }

  // Build item code set from config
  const validItemCodes = new Set(
    (config.selectedItems || []).map(item => item.scope_code.toUpperCase())
  )

  const items = []
  let deterministicCount = 0
  let skippedCount = 0
  let groupRowsSkipped = 0

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 2) continue

    // Skip group/summary rows: empty ID = rolled-up data that duplicates detail rows
    // See docs/BLUEBEAM_CSV_FORMAT.md for full row type classification
    if (idIdx >= 0 && !cols[idIdx]?.trim()) {
      groupRowsSkipped++
      continue
    }

    const subject = cols[subjectIdx] || ''
    const measurement = cols[measurementIdx >= 0 ? measurementIdx : 1] || ''

    // Skip empty subjects
    if (!subject) continue

    // Check for PIPE delimiter format
    if (subject.includes(' | ')) {
      const [itemCode, location] = subject.split(' | ').map(s => s.trim())

      // Extract quantity
      const quantity = parseFloat(measurement.replace(/[^0-9.]/g, '')) || 0
      if (quantity === 0) continue

      // Validate item code exists in config
      if (!validItemCodes.has(itemCode.toUpperCase())) {
        skippedCount++
        continue
      }

      // Strip Bluebeam instance suffixes: "5THFLOOR (1)" → "5THFLOOR"
      const cleanLocation = location.replace(/\s*\(\d+\)$/, '')
      // Map location to column
      const floor = locationMap[cleanLocation.toUpperCase()] || cleanLocation

      items.push({
        code: itemCode,
        floor: floor,
        quantity: quantity
      })
      deterministicCount++
    }
  }

  return {
    items,
    mode: 'deterministic',
    stats: {
      totalRows: lines.length - 1,
      parsed: deterministicCount,
      skipped: skippedCount,
      groupRowsSkipped
    }
  }
}

/**
 * Parse Bluebeam CSV and extract items with code, floor, quantity
 */
function parseBluebeamCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  // Parse header to find columns
  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const idIdx = header.findIndex(h => h === 'id')
  const subjectIdx = header.findIndex(h => h.includes('subject') || h.includes('layer') || h.includes('label'))
  const measurementIdx = header.findIndex(h => h.includes('measurement') || h.includes('area') || h.includes('length') || h.includes('count'))
  const spaceIdx = header.findIndex(h => h.includes('space') || h.includes('page') || h.includes('location'))

  const items = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 2) continue

    // Skip group/summary rows (empty ID = rolled-up data)
    if (idIdx >= 0 && !cols[idIdx]?.trim()) continue

    const subject = cols[subjectIdx >= 0 ? subjectIdx : 0] || ''
    const measurement = cols[measurementIdx >= 0 ? measurementIdx : 1] || ''
    const space = cols[spaceIdx >= 0 ? spaceIdx : 2] || ''

    // Extract quantity from measurement
    const quantity = parseFloat(measurement.replace(/[^0-9.]/g, '')) || 0
    if (quantity === 0) continue

    // Match item code from subject
    let code = null
    for (const { pattern, code: c } of ITEM_PATTERNS) {
      if (pattern.test(subject)) {
        code = c
        break
      }
    }
    if (!code) continue

    // Match floor from space or subject
    let floor = 'ROOF' // default
    const searchText = `${space} ${subject}`
    for (const { pattern, floor: f } of FLOOR_PATTERNS) {
      if (pattern.test(searchText)) {
        floor = f
        break
      }
    }

    items.push({ code, floor, quantity })
  }

  // Aggregate same code+floor combinations
  const aggregated = {}
  for (const item of items) {
    const key = `${item.code}|${item.floor}`
    if (!aggregated[key]) {
      aggregated[key] = { ...item }
    } else {
      aggregated[key].quantity += item.quantity
    }
  }

  return Object.values(aggregated)
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())

  return result
}

/**
 * POST /api/ko/takeoff/[projectId]/bluebeam
 * Import Bluebeam CSV data into Google Sheet tab
 *
 * Body:
 * - csv_content: Raw CSV content from Bluebeam export
 * - tab_name: Optional tab name to fill (will auto-detect if not provided)
 * - force_legacy: If true, skip deterministic parsing and use fuzzy matching
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { csv_content, csv_filename, tab_name, force_legacy, sheet_name: requestSheetName } = body

    if (!csv_content) {
      return NextResponse.json(
        { error: 'csv_content is required' },
        { status: 400 }
      )
    }

    let items = []
    let parseMode = 'legacy'
    let parseStats = null
    let resolvedSheetName = requestSheetName || null

    // Try deterministic parsing first if not forced to legacy
    if (!force_legacy) {
      try {
        // Fetch sheet-config (reads actual sheet state, not wizard config)
        // Pass ?sheet= if provided
        let config = null
        const sheetConfigUrl = new URL(`/api/ko/takeoff/${projectId}/sheet-config`, request.url)
        if (resolvedSheetName) sheetConfigUrl.searchParams.set('sheet', resolvedSheetName)
        const sheetConfigRes = await fetch(
          sheetConfigUrl.toString(),
          { headers: { 'Accept': 'application/json' } }
        )
        if (sheetConfigRes.ok) {
          const sheetData = await sheetConfigRes.json()
          if (sheetData.exists && sheetData.selected_items && sheetData.locations) {
            // Capture sheet name from sheet-config response
            if (sheetData.sheet_name && !resolvedSheetName) {
              resolvedSheetName = sheetData.sheet_name
            }
            // Transform sheet-config format to expected config format
            const allLocations = Object.values(sheetData.locations || {}).flat()
            config = {
              columns: allLocations.map(loc => ({
                id: loc.column,
                name: loc.name,
                mappings: [loc.name.toUpperCase()]  // Use raw name with spaces
              })),
              selectedItems: sheetData.selected_items.map(item => ({
                scope_code: item.item_id
              }))
            }
          }
        }

        // Check if CSV has PIPE delimiter format
        const hasPipeDelimiter = csv_content.includes(' | ')

        if (config && config.columns && config.selectedItems && config.selectedItems.length > 0 && hasPipeDelimiter) {
          // Use deterministic parsing
          const result = parseDeterministicCSV(csv_content, config)

          if (result.items.length > 0) {
            items = result.items
            parseMode = 'deterministic'
            parseStats = result.stats

            console.log(`Deterministic parsing: ${items.length} items from ${parseStats.parsed} rows`)
          }
        }
      } catch (configErr) {
        console.log('Config fetch failed, using legacy parsing:', configErr.message)
      }
    }

    // Fall back to legacy/fuzzy parsing if deterministic didn't work
    if (items.length === 0) {
      items = parseBluebeamCSV(csv_content)
      parseMode = 'legacy'
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No recognizable items found in CSV. Check that the CSV contains valid Bluebeam data or set up the takeoff configuration first.' },
        { status: 400 }
      )
    }

    // Check for standalone spreadsheet first (8.B.6+ approach)
    let spreadsheetId = null
    let config = null
    try {
      const bqResult = await runQuery(
        `SELECT takeoff_spreadsheet_id FROM \`master-roofing-intelligence.mr_main.project_folders\` WHERE id = @projectId`,
        { projectId },
        { location: 'US' }
      )
      if (bqResult.length > 0 && bqResult[0].takeoff_spreadsheet_id) {
        spreadsheetId = bqResult[0].takeoff_spreadsheet_id
      }

      // Also fetch config for mapping
      const configRes = await fetch(
        new URL(`/api/ko/takeoff/${projectId}/config`, request.url).toString(),
        { headers: { 'Accept': 'application/json' } }
      )
      if (configRes.ok) {
        const configData = await configRes.json()
        if (configData.exists) config = configData.config
      }
    } catch (bqErr) {
      console.warn('BigQuery lookup failed:', bqErr.message)
    }

    let result
    let storage = 'google_sheets'

    let setupConfig = null
    if (spreadsheetId) {
      // Build valid targets from Setup config to skip inactive items/locations
      let validTargets = null
      try {
        setupConfig = await readSetupConfig(spreadsheetId)
        validTargets = new Map()
        for (const item of setupConfig.rows) {
          if (item.hasAnyToggle) {
            const activeLocations = new Set()
            item.toggles.forEach((isActive, i) => {
              if (isActive) activeLocations.add(i) // i = 0-6 maps to columns G-M (sheet index 6-12)
            })
            validTargets.set(item.itemId.toUpperCase(), activeLocations)
          }
        }
      } catch (setupErr) {
        console.warn('Setup config read failed, importing without filter:', setupErr.message)
      }

      // Use standalone spreadsheet (new approach)
      result = await fillBluebeamDataToSpreadsheet(spreadsheetId, items, config, resolvedSheetName, validTargets)
      storage = 'standalone_spreadsheet'
    } else {
      // Fall back to tab-based approach (legacy)
      let tabInfo = null
      if (tab_name) {
        tabInfo = { tabName: tab_name }
      } else {
        tabInfo = await getTakeoffTab(projectId)
        if (!tabInfo) {
          tabInfo = await createTakeoffTab(projectId, projectId)
        }
      }
      result = await fillBluebeamDataToTab(tabInfo.tabName, items)
    }

    // Categorize details for import summary
    const details = result.details || []
    const matchedItems = details.filter(d => d.status === 'MATCHED' || d.status === 'MATCHED_NORMALIZED')
    const unmatchedItems = details.filter(d => d.status === 'NO_ROW_MAPPING' || d.status === 'NO_COLUMN_MAPPING' || d.status === 'ROW_NOT_IN_SECTION')

    // Merge LOCATION_NOT_ACTIVE into unmatched so they appear in reassignment dialog
    const locationNotActive = details.filter(d => d.status === 'LOCATION_NOT_ACTIVE')
    for (const d of locationNotActive) {
      // Build active location names for this item's section from Setup config
      let activeLocationNames = []
      if (setupConfig && d.section && d.code) {
        const sectionNames = setupConfig.sectionLocationNames?.[d.section] || []
        const itemToggles = setupConfig.rows.find(r => r.itemId.toUpperCase() === d.code)?.toggles || []
        activeLocationNames = sectionNames.filter((_, i) => itemToggles[i])
      }
      unmatchedItems.push({
        ...d,
        status: 'NO_COLUMN_MAPPING',
        originalStatus: 'LOCATION_NOT_ACTIVE',
        availableLocations: activeLocationNames,
      })
    }
    const skippedItems = details.filter(d => d.status === 'ITEM_NOT_ACTIVE')
    const errors = []

    if (parseStats?.skipped > 0) {
      errors.push({ message: `${parseStats.skipped} rows skipped (item code not in config)` })
    }

    // Save CSV to Drive Bluebeam folder (non-fatal)
    let csvDriveResult = null
    try {
      // Get project name for filename
      const projectResult = await runQuery(
        `SELECT name, drive_folder_id FROM \`master-roofing-intelligence.mr_main.project_folders\` WHERE id = @projectId`,
        { projectId },
        { location: 'US' }
      )
      if (projectResult.length > 0 && projectResult[0].drive_folder_id) {
        const dateStr = new Date().toISOString().split('T')[0]
        const originalName = csv_filename ? csv_filename.replace(/\.csv$/i, '') : (projectResult[0].name || projectId).replace(/[^a-zA-Z0-9]/g, '_')
        const csvFilename = `import-${dateStr}-${originalName}.csv`
        csvDriveResult = await saveCsvToDrive(projectResult[0].drive_folder_id, csvFilename, csv_content)
      }
    } catch (driveErr) {
      console.warn('[Bluebeam] Drive CSV save failed (non-fatal):', driveErr.message)
    }

    // Record import to BigQuery import_history (non-fatal)
    const importId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    try {
      const safeCsvFilename = csvDriveResult ? (csvDriveResult.filename || '') : ''
      await runQuery(
        `INSERT INTO \`master-roofing-intelligence.mr_main.import_history\`
         (import_id, project_id, spreadsheet_id, target_sheet, import_type, csv_file_id, csv_filename,
          imported_at, imported_by, items_matched, items_unmatched, cells_populated,
          accumulation_mode, status, error_details, notes)
         VALUES (@importId, @projectId, @spreadsheetId, @targetSheet, @importType, @csvFileId, @csvFilename,
                 CURRENT_TIMESTAMP(), @importedBy, @itemsMatched, @itemsUnmatched, @cellsPopulated,
                 @accMode, @status, @errorDetails, @notes)`,
        {
          importId,
          projectId,
          spreadsheetId: spreadsheetId || '',
          targetSheet: resolvedSheetName || '',
          importType: parseMode,
          csvFileId: csvDriveResult?.fileId || '',
          csvFilename: safeCsvFilename,
          importedBy: 'system',
          itemsMatched: matchedItems.length,
          itemsUnmatched: unmatchedItems.length,
          cellsPopulated: result.updated,
          accMode: result.accumulated ? 'accumulate' : 'fresh',
          status: 'completed',
          errorDetails: errors.length > 0 ? JSON.stringify(errors) : '',
          notes: ''
        },
        { location: 'US' }
      )
    } catch (bqErr) {
      console.warn('[Bluebeam] Failed to record import to BigQuery (non-fatal):', bqErr.message)
    }

    return NextResponse.json({
      success: true,
      import_id: importId,
      items_parsed: items.length,
      cells_updated: result.updated,
      spreadsheet_id: spreadsheetId,
      storage,
      parse_mode: parseMode,
      parse_stats: parseStats,
      accumulated: result.accumulated || false,
      accumulatedCount: result.accumulatedCount || 0,
      matchedItems: matchedItems.map(d => ({
        item_id: d.code,
        location: d.floor,
        quantity: d.quantity,
        previousValue: d.previousValue || 0,
        accumulatedTotal: d.accumulatedTotal || d.quantity,
        cell: d.col ? `${d.col}${d.row}` : null
      })),
      unmatchedItems: unmatchedItems.map(d => ({
        raw_name: d.code,
        unmatchType: d.status,
        reason: d.status === 'NO_ROW_MAPPING' ? 'Item not found in sheet'
          : d.originalStatus === 'LOCATION_NOT_ACTIVE' ? `Location "${d.floor}" not active in Setup`
          : d.status === 'NO_COLUMN_MAPPING' ? `Location "${d.floor}" not found`
          : 'Row not in any section',
        quantity: d.quantity,
        location: d.floor,
        row: d.row || null,
        section: d.section || null,
        availableLocations: d.availableLocations || []
      })),
      skippedItems: skippedItems.map(d => ({
        item_id: d.code,
        location: d.floor,
        quantity: d.quantity,
        reason: d.status === 'ITEM_NOT_ACTIVE' ? 'Item not toggled in Setup'
          : 'Location not active for this item in Setup',
      })),
      errors,
      cellsPopulated: result.updated,
      csvFile: csvDriveResult ? { fileId: csvDriveResult.fileId, webViewLink: csvDriveResult.webViewLink } : null
    })

  } catch (err) {
    console.error('Bluebeam import error:', err)
    return NextResponse.json(
      { error: 'Failed to import Bluebeam data: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * Save CSV content to Google Drive project folder → Bluebeam subfolder
 */
async function saveCsvToDrive(parentFolderId, filename, csvContent) {
  const accessToken = await getAccessToken()

  // Find or create Bluebeam subfolder (Phase 12: CSV imports → Bluebeam/, not Markups/)
  const bluebeamFolderId = await getOrCreateSubfolder(accessToken, parentFolderId, 'Bluebeam')
  if (!bluebeamFolderId) return null

  const boundary = '-------csv-upload-boundary'
  const metadata = {
    name: filename,
    parents: [bluebeamFolderId],
    mimeType: 'text/csv'
  }

  const multipartBody =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    `--${boundary}\r\n` +
    'Content-Type: text/csv\r\n\r\n' +
    csvContent + '\r\n' +
    `--${boundary}--`

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    }
  )

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    console.error('[Bluebeam] Drive CSV upload failed:', error)
    return null
  }

  const result = await uploadResponse.json()
  console.log(`[Bluebeam] CSV saved to Drive: ${filename} (${result.id})`)

  // Set public read so Drive preview iframe works
  if (result?.id) {
    await setFilePublicRead(accessToken, result.id)
  }

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
      console.log(`[Bluebeam] Created ${subfolderName} subfolder: ${folder.id}`)
      return folder.id
    }

    return null
  } catch (err) {
    console.error(`[Bluebeam] Failed to get/create ${subfolderName}:`, err)
    return null
  }
}
