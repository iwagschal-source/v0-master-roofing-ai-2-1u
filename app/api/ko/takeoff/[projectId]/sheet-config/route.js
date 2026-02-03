/**
 * Sheet Config API - Read takeoff configuration directly from Google Sheet
 *
 * GET /api/ko/takeoff/[projectId]/sheet-config
 *
 * Returns:
 * - selected_items: item_ids from Column A (non-empty rows only)
 * - locations: location names from section header rows (cols G-L)
 * - project_name: from BigQuery project_folders table
 *
 * This endpoint reads the actual sheet state, unlike /config which reads
 * the wizard-generated config from backend/BigQuery.
 */

import { NextResponse } from 'next/server'
import { readSheetValues } from '@/lib/google-sheets'
import { runQuery } from '@/lib/bigquery'

// Section definitions matching lib/google-sheets.js
const SECTIONS = {
  ROOFING: { headerRow: 3, startRow: 4, endRow: 43, name: 'Roofing' },
  BALCONIES: { headerRow: 45, startRow: 46, endRow: 53, name: 'Balconies' },
  EXTERIOR: { headerRow: 54, startRow: 55, endRow: 72, name: 'Exterior' }
}

/**
 * GET /api/ko/takeoff/[projectId]/sheet-config
 * Read takeoff configuration directly from the Google Sheet
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = await params

    // Step 1: Get spreadsheet ID and project name from BigQuery
    let spreadsheetId = null
    let projectName = null

    try {
      const bqResult = await runQuery(
        `SELECT takeoff_spreadsheet_id, project_name
         FROM \`master-roofing-intelligence.mr_main.project_folders\`
         WHERE id = @projectId`,
        { projectId },
        { location: 'US' }
      )
      if (bqResult.length > 0) {
        spreadsheetId = bqResult[0].takeoff_spreadsheet_id
        projectName = bqResult[0].project_name
      }
    } catch (bqErr) {
      console.warn('[sheet-config] BigQuery lookup failed:', bqErr.message)
    }

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'No takeoff spreadsheet found for this project', exists: false },
        { status: 404 }
      )
    }

    const sheetName = 'DATE'

    // Step 2: Read Column A (item_ids) - rows 4-72
    const colAValues = await readSheetValues(spreadsheetId, `'${sheetName}'!A4:A72`)

    // Step 3: Read header rows for each section (cols G-L)
    const roofingHeader = await readSheetValues(spreadsheetId, `'${sheetName}'!G3:L3`)
    const balconiesHeader = await readSheetValues(spreadsheetId, `'${sheetName}'!G45:L45`)
    const exteriorHeader = await readSheetValues(spreadsheetId, `'${sheetName}'!G54:L54`)

    // Step 4: Parse selected items from Column A
    const selectedItems = []
    for (let i = 0; i < colAValues.length; i++) {
      const itemId = colAValues[i]?.[0]?.toString().trim()
      if (itemId && itemId.startsWith('MR-')) {
        const row = i + 4 // Row 4 is index 0
        const section = getSectionForRow(row)
        selectedItems.push({
          item_id: itemId,
          row,
          section
        })
      }
    }

    // Step 5: Parse locations from header rows
    const locations = {
      ROOFING: parseLocationHeader(roofingHeader[0] || []),
      BALCONIES: parseLocationHeader(balconiesHeader[0] || []),
      EXTERIOR: parseLocationHeader(exteriorHeader[0] || [])
    }

    return NextResponse.json({
      exists: true,
      project_id: projectId,
      project_name: projectName,
      spreadsheet_id: spreadsheetId,
      spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      selected_items: selectedItems,
      locations,
      sections: SECTIONS,
      item_count: selectedItems.length
    })

  } catch (err) {
    console.error('[sheet-config] Error:', err)
    return NextResponse.json(
      { error: 'Failed to read sheet config: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * Determine which section a row belongs to
 */
function getSectionForRow(row) {
  if (row >= 4 && row <= 43) return 'ROOFING'
  if (row >= 46 && row <= 53) return 'BALCONIES'
  if (row >= 55 && row <= 72) return 'EXTERIOR'
  return null
}

/**
 * Parse location names from header row (cols G-L, 6 columns)
 * Returns array of { column, name } for non-empty headers
 *
 * IMPORTANT: Returns raw names WITH spaces (e.g., "1ST FLOOR" not "1STFLOOR")
 * This ensures BTX tool subjects match sheet headers exactly for CSV import.
 * See docs/CANONICAL_DEPENDENCIES.md for location naming conventions.
 */
function parseLocationHeader(headerRow) {
  const columns = ['G', 'H', 'I', 'J', 'K', 'L']
  const locations = []

  for (let i = 0; i < columns.length; i++) {
    const name = headerRow[i]?.toString().trim()
    if (name) {
      locations.push({
        column: columns[i],
        name  // Raw name with spaces - NO normalization
      })
    }
  }

  return locations
}
