import { batchUpdateSheet, readSheetValues } from '@/lib/google-sheets'
import { NextResponse } from 'next/server'

/**
 * Populate a Google Sheet takeoff template with converted Bluebeam data
 *
 * The template has this structure (starting row 3):
 * Unit Cost | Scope | Cellar Floor | GROUND Floor | 2nd Floor | ... | Total Measurements | Total Cost
 */

// Column mapping for the template (0-indexed from column A)
const COLUMN_MAP = {
  unitCost: 0,      // A
  scope: 1,         // B
  cellarFloor: 2,   // C
  groundFloor: 3,   // D
  floor2: 4,        // E
  floor3: 5,        // F
  floor4: 6,        // G
  floor5: 7,        // H
  floor6: 8,        // I
  floor7: 9,        // J
  mainRoof: 10,     // K
  bulkhead: 11,     // L
  elevatorBulkhead: 12, // M
  totalMeasurements: 13, // N
  totalCost: 14,    // O
}

// Floor name to column mapping
const FLOOR_TO_COLUMN = {
  'Cellar Floor': 'cellarFloor',
  'GROUND Floor': 'groundFloor',
  '2nd Floor': 'floor2',
  '3rd Floor': 'floor3',
  '4th Floor': 'floor4',
  '5th Floor': 'floor5',
  '6th Floor': 'floor6',
  '7th Floor': 'floor7',
  'Main Roof': 'mainRoof',
  'Bulkhead': 'bulkhead',
  'Elevator Bulkhead': 'elevatorBulkhead',
}

// Convert column index to A1 notation letter
function colIndexToLetter(index) {
  if (index < 26) {
    return String.fromCharCode(65 + index)
  }
  // Handle columns beyond Z (AA, AB, etc.)
  return String.fromCharCode(64 + Math.floor(index / 26)) + String.fromCharCode(65 + (index % 26))
}

export async function POST(request) {
  try {
    const { sheetId, templateData } = await request.json()

    if (!sheetId) {
      return NextResponse.json(
        { success: false, error: 'Sheet ID is required' },
        { status: 400 }
      )
    }

    if (!templateData || !templateData.rows) {
      return NextResponse.json(
        { success: false, error: 'Template data is required' },
        { status: 400 }
      )
    }

    // Start populating from row 4 (after headers in row 3)
    const START_ROW = 4
    const batchData = []

    // Process each scope item row
    templateData.rows.forEach((row, index) => {
      const rowNum = START_ROW + index
      const rowData = []

      // Initialize array with empty values
      for (let i = 0; i <= 14; i++) {
        rowData.push('')
      }

      // Unit Cost
      if (row.unit_cost > 0) {
        rowData[COLUMN_MAP.unitCost] = `$${row.unit_cost.toFixed(2)}`
      }

      // Scope item name
      rowData[COLUMN_MAP.scope] = row.scope

      // Floor values
      if (row.floors) {
        Object.entries(row.floors).forEach(([floorName, value]) => {
          const columnKey = FLOOR_TO_COLUMN[floorName]
          if (columnKey && COLUMN_MAP[columnKey] !== undefined) {
            rowData[COLUMN_MAP[columnKey]] = value
          }
        })
      }

      // Total measurements
      rowData[COLUMN_MAP.totalMeasurements] = row.total_qty || 0

      // Total cost (with formula reference or direct value)
      if (row.total_cost > 0) {
        rowData[COLUMN_MAP.totalCost] = `$${row.total_cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }

      // Add to batch update
      batchData.push({
        range: `A${rowNum}:O${rowNum}`,
        values: [rowData],
      })
    })

    // Update project name in header if provided
    if (templateData.project_name) {
      batchData.push({
        range: 'A2',
        values: [[templateData.project_name]],
      })
    }

    // Execute batch update
    if (batchData.length > 0) {
      await batchUpdateSheet(sheetId, batchData)
    }

    return NextResponse.json({
      success: true,
      message: `Populated ${templateData.rows.length} scope items into takeoff template`,
      rowsUpdated: templateData.rows.length,
    })

  } catch (error) {
    console.error('Populate takeoff error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
