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
import { fillBluebeamDataToTab, fillBluebeamDataToSpreadsheet, getTakeoffTab, createTakeoffTab } from '@/lib/google-sheets'
import { runQuery } from '@/lib/bigquery'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

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
  const subjectIdx = header.findIndex(h => h.includes('subject') || h.includes('layer') || h.includes('label'))
  const measurementIdx = header.findIndex(h => h.includes('measurement') || h.includes('area') || h.includes('length') || h.includes('count'))

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

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 2) continue

    const subject = cols[subjectIdx] || ''
    const measurement = cols[measurementIdx >= 0 ? measurementIdx : 1] || ''

    // Skip empty or summary rows
    if (!subject || /^\d+\s*(?:sf|lf|ea)?\s*\(\d+\)$/i.test(subject)) continue

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

      // Map location to column
      const floor = locationMap[location.toUpperCase()] || location

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
      skipped: skippedCount
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
  const subjectIdx = header.findIndex(h => h.includes('subject') || h.includes('layer') || h.includes('label'))
  const measurementIdx = header.findIndex(h => h.includes('measurement') || h.includes('area') || h.includes('length') || h.includes('count'))
  const spaceIdx = header.findIndex(h => h.includes('space') || h.includes('page') || h.includes('location'))

  const items = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i])
    if (cols.length < 2) continue

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
    const { csv_content, tab_name, force_legacy } = body

    if (!csv_content) {
      return NextResponse.json(
        { error: 'csv_content is required' },
        { status: 400 }
      )
    }

    let items = []
    let parseMode = 'legacy'
    let parseStats = null

    // Try deterministic parsing first if not forced to legacy
    if (!force_legacy) {
      try {
        // Fetch project config from local API (no external backend)
        let config = null
        const localConfigRes = await fetch(
          new URL(`/api/ko/takeoff/${projectId}/config`, request.url).toString(),
          { headers: { 'Accept': 'application/json' } }
        )
        if (localConfigRes.ok) {
          const localConfigData = await localConfigRes.json()
          if (localConfigData.exists) {
            config = localConfigData.config
          }
        }

        // Check if CSV has PIPE delimiter format
        const hasPipeDelimiter = csv_content.includes(' | ')

        if (config && config.columns && config.selectedItems && hasPipeDelimiter) {
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

    if (spreadsheetId) {
      // Use standalone spreadsheet (new approach)
      result = await fillBluebeamDataToSpreadsheet(spreadsheetId, items, config)
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

    return NextResponse.json({
      success: true,
      items_parsed: items.length,
      cells_updated: result.updated,
      spreadsheet_id: spreadsheetId,
      storage,
      parse_mode: parseMode,
      parse_stats: parseStats
    })

  } catch (err) {
    console.error('Bluebeam import error:', err)
    return NextResponse.json(
      { error: 'Failed to import Bluebeam data: ' + err.message },
      { status: 500 }
    )
  }
}
