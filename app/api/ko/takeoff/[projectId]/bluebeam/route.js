/**
 * Bluebeam Import API
 *
 * Import Bluebeam CSV data into a project's takeoff Google Sheet tab.
 * Parses CSV locally and fills the Google Sheet directly.
 */

import { NextResponse } from 'next/server'
import { fillBluebeamDataToTab, getTakeoffTab, createTakeoffTab } from '@/lib/google-sheets'

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

// Floor detection patterns
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
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { csv_content, tab_name } = body

    if (!csv_content) {
      return NextResponse.json(
        { error: 'csv_content is required' },
        { status: 400 }
      )
    }

    // Parse CSV to extract items
    const items = parseBluebeamCSV(csv_content)

    if (items.length === 0) {
      return NextResponse.json(
        { error: 'No recognizable items found in CSV. Check that the CSV contains valid Bluebeam data.' },
        { status: 400 }
      )
    }

    // Get or create the takeoff tab
    let tabInfo = null
    if (tab_name) {
      tabInfo = { tabName: tab_name }
    } else {
      tabInfo = await getTakeoffTab(projectId)
      if (!tabInfo) {
        // Create a new tab if none exists
        tabInfo = await createTakeoffTab(projectId, projectId)
      }
    }

    // Fill data into Google Sheet
    const result = await fillBluebeamDataToTab(tabInfo.tabName, items)

    return NextResponse.json({
      success: true,
      items_parsed: items.length,
      cells_updated: result.updated,
      tab_name: tabInfo.tabName,
      storage: 'google_sheets'
    })

  } catch (err) {
    console.error('Bluebeam import error:', err)
    return NextResponse.json(
      { error: 'Failed to import Bluebeam data: ' + err.message },
      { status: 500 }
    )
  }
}
