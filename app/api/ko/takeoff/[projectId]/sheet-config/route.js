/**
 * Sheet Config API - Read takeoff configuration directly from Google Sheet
 *
 * GET /api/ko/takeoff/[projectId]/sheet-config
 *
 * Returns:
 * - selected_items: item_ids from Column A (non-empty rows only)
 * - locations: location names from dynamically detected section header rows
 * - project_name: from BigQuery project_folders table
 *
 * This endpoint reads the actual sheet state, unlike /config which reads
 * the wizard-generated config from backend/BigQuery.
 */

import { NextResponse } from 'next/server'
import { readSheetValues, discoverSheetLayout } from '@/lib/google-sheets'
import { runQuery } from '@/lib/bigquery'

const SECTION_NAMES = ['ROOFING', 'BALCONIES', 'EXTERIOR']

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

    // Step 2: Read entire sheet area for dynamic section detection
    const allRows = await readSheetValues(spreadsheetId, `'${sheetName}'!A1:Z200`)

    // Step 3: Scan for section header rows (same pattern as preview/route.js isSectionHeaderRow)
    const sectionHeaders = []
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i]
      const colA = (row?.[0] || '').toString().trim().toLowerCase()
      if (colA.startsWith('item_id') || colA.startsWith('item id') || colA === 'itemid') {
        const hasScope = row.some((cell, idx) => idx > 0 &&
          /scope|description|item/i.test((cell || '').toString()))
        if (hasScope) {
          const sheetRow = i + 1 // Convert 0-based index to 1-based row number
          const name = SECTION_NAMES[sectionHeaders.length] || `SECTION_${sectionHeaders.length}`
          sectionHeaders.push({ name, headerRow: sheetRow, rowIndex: i })
        }
      }
    }

    if (sectionHeaders.length === 0) {
      sectionHeaders.push({ name: 'ROOFING', headerRow: 3, rowIndex: 2 })
    }

    // Step 4: Build dynamic getSectionForRow from discovered boundaries
    function getSectionForRow(row) {
      for (let i = 0; i < sectionHeaders.length; i++) {
        const startRow = sectionHeaders[i].headerRow + 1
        const endRow = i + 1 < sectionHeaders.length
          ? sectionHeaders[i + 1].headerRow - 2
          : 200
        if (row >= startRow && row <= endRow) return sectionHeaders[i].name
      }
      return null
    }

    // Step 5: Parse selected items from Column A (skip header rows)
    const headerRowIndices = new Set(sectionHeaders.map(s => s.rowIndex))
    const selectedItems = []
    for (let i = 0; i < allRows.length; i++) {
      if (headerRowIndices.has(i)) continue
      const itemId = allRows[i]?.[0]?.toString().trim()
      if (itemId && itemId.startsWith('MR-')) {
        const row = i + 1 // 1-based row number
        const section = getSectionForRow(row)
        selectedItems.push({
          item_id: itemId,
          row,
          section
        })
      }
    }

    // Step 6: Extract locations from discovered section header rows
    const locations = {}
    for (const sh of sectionHeaders) {
      locations[sh.name] = discoverSheetLayout(allRows[sh.rowIndex] || [])
        .locationColumns.map(lc => ({ column: lc.letter, name: lc.name }))
    }

    // Step 7: Build sections object from discovered data
    const sections = {}
    for (let i = 0; i < sectionHeaders.length; i++) {
      const sh = sectionHeaders[i]
      const endRow = i + 1 < sectionHeaders.length
        ? sectionHeaders[i + 1].headerRow - 2
        : allRows.length
      sections[sh.name] = {
        headerRow: sh.headerRow,
        startRow: sh.headerRow + 1,
        endRow,
        name: sh.name.charAt(0) + sh.name.slice(1).toLowerCase()
      }
    }

    return NextResponse.json({
      exists: true,
      project_id: projectId,
      project_name: projectName,
      spreadsheet_id: spreadsheetId,
      spreadsheet_url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
      selected_items: selectedItems,
      locations,
      sections,
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
