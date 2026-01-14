import { batchUpdateSheet, readSheetValues } from '@/lib/google-sheets'
import { NextResponse } from 'next/server'

/**
 * Populate a Google Sheet takeoff template with converted Bluebeam data
 *
 * ACTUAL KO Template structure (Row 3 headers):
 * A: Unit Cost | B: Scope | C: 1st Floor | D: 2nd Floor | E: 3rd Floor | F: 4th Floor |
 * G: Main Roof | H: Stair Bulkhead | I: Elev. Bulkhead | J: Total Measurements | K: Total Cost
 */

// Column mapping matching ACTUAL KO template (0-indexed)
const COLUMN_MAP = {
  unitCost: 0,           // A
  scope: 1,              // B
  floor1: 2,             // C - "1st Floor"
  floor2: 3,             // D - "2nd Floor"
  floor3: 4,             // E - "3rd Floor"
  floor4: 5,             // F - "4th Floor"
  mainRoof: 6,           // G - "Main Roof"
  stairBulkhead: 7,      // H - "Stair Bulkhead"
  elevBulkhead: 8,       // I - "Elev. Bulkhead"
  totalMeasurements: 9,  // J
  totalCost: 10,         // K
}

// Floor name to column mapping - matches Bluebeam space names
const FLOOR_TO_COLUMN = {
  // Ground/1st floor variations
  'GROUND Floor': 'floor1',
  'Ground Floor': 'floor1',
  '1st Floor': 'floor1',
  'First Floor': 'floor1',
  'Cellar Floor': 'floor1',  // Map cellar to 1st if no cellar column

  // Upper floors
  '2nd Floor': 'floor2',
  '3rd Floor': 'floor3',
  '4th Floor': 'floor4',
  '5th Floor': 'floor4',  // Map 5th+ to 4th if limited columns
  '6th Floor': 'floor4',
  '7th Floor': 'floor4',

  // Roof areas
  'Main Roof': 'mainRoof',
  'Roof': 'mainRoof',

  // Bulkheads
  'Bulkhead': 'stairBulkhead',
  'Stair Bulkhead': 'stairBulkhead',
  'Stair BH': 'stairBulkhead',
  'Elevator Bulkhead': 'elevBulkhead',
  'Elev Bulkhead': 'elevBulkhead',
  'Elev BH': 'elevBulkhead',
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

      // Initialize array with empty values (11 columns: A-K)
      for (let i = 0; i <= 10; i++) {
        rowData.push('')
      }

      // Unit Cost (column A)
      if (row.unit_cost > 0) {
        rowData[COLUMN_MAP.unitCost] = row.unit_cost
      }

      // Scope item name (column B)
      rowData[COLUMN_MAP.scope] = row.scope

      // Floor values (columns C-I)
      if (row.floors) {
        Object.entries(row.floors).forEach(([floorName, value]) => {
          const columnKey = FLOOR_TO_COLUMN[floorName]
          if (columnKey && COLUMN_MAP[columnKey] !== undefined) {
            // Accumulate if multiple floors map to same column
            const colIdx = COLUMN_MAP[columnKey]
            const existing = rowData[colIdx]
            rowData[colIdx] = (existing || 0) + (value || 0)
          }
        })
      }

      // Total measurements (column J) - sum of floor values or use provided total
      const floorSum = [
        rowData[COLUMN_MAP.floor1],
        rowData[COLUMN_MAP.floor2],
        rowData[COLUMN_MAP.floor3],
        rowData[COLUMN_MAP.floor4],
        rowData[COLUMN_MAP.mainRoof],
        rowData[COLUMN_MAP.stairBulkhead],
        rowData[COLUMN_MAP.elevBulkhead],
      ].reduce((sum, v) => sum + (parseFloat(v) || 0), 0)

      rowData[COLUMN_MAP.totalMeasurements] = floorSum > 0 ? floorSum : (row.total_qty || 0)

      // Total cost (column K) - calculate from unit cost * total qty
      const totalQty = rowData[COLUMN_MAP.totalMeasurements]
      const unitCost = row.unit_cost || 0
      if (totalQty > 0 && unitCost > 0) {
        rowData[COLUMN_MAP.totalCost] = Math.round(totalQty * unitCost * 100) / 100
      } else if (row.total_cost > 0) {
        rowData[COLUMN_MAP.totalCost] = row.total_cost
      }

      // Clean up: convert 0 to empty string for floor columns
      for (let i = 2; i <= 8; i++) {
        if (rowData[i] === 0 || rowData[i] === '') {
          rowData[i] = ''
        }
      }

      // Add to batch update (columns A-K only)
      batchData.push({
        range: `A${rowNum}:K${rowNum}`,
        values: [rowData],
      })
    })

    // Update project name in cell B3 (the scope header becomes project name)
    if (templateData.project_name) {
      batchData.push({
        range: 'B3',
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
