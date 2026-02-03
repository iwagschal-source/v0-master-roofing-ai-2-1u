/**
 * Proposal Preview API (Step 8.C.10)
 *
 * Reads takeoff sheet and returns structured data for proposal preview.
 * Auto-detects row types from Column O formulas (bundles use =SUM()).
 * Fetches descriptions from BigQuery and replaces placeholders.
 */

import { NextResponse } from 'next/server'
import { readSheetValues, readSheetFormulas, getFirstSheetName } from '@/lib/google-sheets'
import { runQuery } from '@/lib/bigquery'

/**
 * GET /api/ko/proposal/[projectId]/preview
 *
 * Fetches all data needed for proposal preview:
 * 1. Project info from BigQuery
 * 2. Takeoff sheet data from Google Sheets
 * 3. Parses row types to build sections
 * 4. Fetches descriptions and replaces placeholders
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = await params

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    // 1. Get project info and spreadsheet ID from BigQuery
    const projectResult = await runQuery(
      `SELECT
        pf.id,
        pf.takeoff_spreadsheet_id,
        pf.project_name,
        pf.address,
        pf.city,
        pf.state,
        pf.zip,
        c.company_name as gc_name
       FROM \`master-roofing-intelligence.mr_main.project_folders\` pf
       LEFT JOIN \`master-roofing-intelligence.mr_main.contacts_companies\` c
         ON pf.contact_id = c.id
       WHERE pf.id = @projectId`,
      { projectId },
      { location: 'US' }
    )

    if (projectResult.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const project = projectResult[0]
    const spreadsheetId = project.takeoff_spreadsheet_id

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'No takeoff spreadsheet found for this project. Create one first.' },
        { status: 400 }
      )
    }

    // 2. Read takeoff sheet data (headers + all data rows)
    // Also read formulas to auto-detect row types from Column O
    const sheetName = await getFirstSheetName(spreadsheetId)
    const [sheetData, sheetFormulas] = await Promise.all([
      readSheetValues(spreadsheetId, `'${sheetName}'!A1:Z100`),
      readSheetFormulas(spreadsheetId, `'${sheetName}'!A1:Z100`)
    ])

    if (!sheetData || sheetData.length < 2) {
      return NextResponse.json({
        project: formatProjectInfo(project),
        sections: [],
        standaloneItems: [],
        totals: { sectionTotals: [], grandTotal: 0 },
        message: 'Takeoff sheet is empty'
      })
    }

    // 3. Find header row dynamically (template has headers in row 3, not row 1)
    let headerRowIdx = 0
    for (let i = 0; i < Math.min(sheetData.length, 10); i++) {
      const row = sheetData[i] || []
      const rowText = row.join(' ').toLowerCase()
      if (rowText.includes('item_id') || rowText.includes('scope') && rowText.includes('cost')) {
        headerRowIdx = i
        break
      }
    }

    const headers = sheetData[headerRowIdx].map(h => (h || '').toString().toLowerCase().trim())
    const columnMap = findColumnIndices(headers)

    // 4. Parse rows into structured data with auto-detected row types
    // Skip rows before and including header row
    const dataStartIdx = headerRowIdx + 1
    const rows = sheetData.slice(dataStartIdx).map((row, idx) => {
      const actualRowNum = dataStartIdx + idx + 1 // 1-based sheet row number
      const formulaRow = sheetFormulas[dataStartIdx + idx] || []
      const totalCostFormula = getCellValue(formulaRow, columnMap.totalCost)
      const scopeValue = getCellValue(row, columnMap.scope)
      const itemId = getCellValue(row, columnMap.itemId)

      // Auto-detect row type from formula patterns
      const autoRowType = detectRowTypeFromFormula(totalCostFormula, scopeValue, itemId, actualRowNum)

      return {
        rowNumber: actualRowNum,
        itemId,
        unitCost: parseFloat(getCellValue(row, columnMap.unitCost)) || 0,
        rValue: getCellValue(row, columnMap.rValue),
        thickness: getCellValue(row, columnMap.thickness),
        materialType: getCellValue(row, columnMap.materialType),
        scope: scopeValue,
        totalMeasurements: parseFloat(getCellValue(row, columnMap.totalMeasurements)) || 0,
        totalCost: parseFloat(getCellValue(row, columnMap.totalCost)) || 0,
        rowType: autoRowType, // Use auto-detected type
        formula: totalCostFormula, // Include for debugging
        locations: extractLocations(row, columnMap)
      }
    })

    // 5. Parse row types to build sections
    const { sections, standaloneItems, sectionTotals, grandTotal } = parseRowTypes(rows)

    // 6. Fetch descriptions from BigQuery for all item_ids
    const itemIds = [...new Set(rows.filter(r => r.itemId).map(r => r.itemId))]
    const descriptions = await fetchDescriptions(itemIds)

    // 7. Build final preview data with descriptions and placeholder replacement
    const enrichedSections = sections.map(section => ({
      ...section,
      items: section.items.map(item => ({
        ...item,
        description: buildDescription(item, descriptions)
      }))
    }))

    const enrichedStandalones = standaloneItems.map(item => ({
      ...item,
      description: buildDescription(item, descriptions)
    }))

    return NextResponse.json({
      project: formatProjectInfo(project),
      sections: enrichedSections,
      standaloneItems: enrichedStandalones,
      totals: {
        sectionTotals,
        grandTotal
      },
      columnMap,
      rowCount: rows.length
    })

  } catch (err) {
    console.error('Proposal preview error:', err)
    return NextResponse.json(
      { error: 'Failed to generate proposal preview: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * Find column indices from header row
 * Handles the shifted layout after item_id was added
 */
function findColumnIndices(headers) {
  const map = {
    itemId: -1,
    unitCost: -1,
    rValue: -1,
    thickness: -1,
    materialType: -1,
    scope: -1,
    totalMeasurements: -1,
    totalCost: -1,
    rowType: -1,
    locationStart: -1,
    locationEnd: -1
  }

  headers.forEach((h, idx) => {
    const header = h.toLowerCase()
    if (header.includes('item_id') || header === 'item id' || header === 'itemid') {
      map.itemId = idx
    } else if (header.includes('unit') && header.includes('cost')) {
      map.unitCost = idx
    } else if (header === 'r' || header === 'r-value' || header === 'r_value' || header === 'rvalue') {
      map.rValue = idx
    } else if (header === 'in' || header === 'thickness' || header === 'inches') {
      map.thickness = idx
    } else if (header === 'type' || header === 'material' || header === 'material_type') {
      map.materialType = idx
    } else if (header.includes('scope') || header === 'description' || header === 'item') {
      map.scope = idx
    } else if (header.includes('total') && header.includes('meas')) {
      map.totalMeasurements = idx
    } else if (header.includes('total') && header.includes('cost')) {
      map.totalCost = idx
    } else if (header.includes('row') && header.includes('type')) {
      map.rowType = idx
    }
  })

  // Determine location columns (between scope and total measurements)
  // Locations are typically named columns like "Main Roof", "1st Floor", etc.
  if (map.scope >= 0 && map.totalMeasurements > map.scope) {
    map.locationStart = map.scope + 1
    map.locationEnd = map.totalMeasurements - 1
  }

  return map
}

/**
 * Safely get cell value from row
 */
function getCellValue(row, index) {
  if (index < 0 || index >= row.length) return ''
  return (row[index] || '').toString().trim()
}

/**
 * Extract location values from row
 */
function extractLocations(row, columnMap) {
  const locations = {}
  if (columnMap.locationStart < 0 || columnMap.locationEnd < 0) return locations

  for (let i = columnMap.locationStart; i <= columnMap.locationEnd && i < row.length; i++) {
    const value = parseFloat(row[i]) || 0
    if (value > 0) {
      locations[`col_${i}`] = value
    }
  }
  return locations
}

/**
 * Parse row types to build sections, standalone items, and totals
 *
 * Row Types:
 * - ITEM: Regular line item, bundled into nearest SUBTOTAL above
 * - SUBTOTAL:* (e.g., SUBTOTAL:ROOFING): Creates a section with items above it
 * - STANDALONE: Individual line item on proposal
 * - SECTION_TOTAL: Section subtotal
 * - GRAND_TOTAL: Final total
 */
function parseRowTypes(rows) {
  const sections = []
  const standaloneItems = []
  const sectionTotals = []
  let grandTotal = 0

  let currentItems = []

  for (const row of rows) {
    const rowType = (row.rowType || '').toUpperCase()

    if (rowType.startsWith('SUBTOTAL:')) {
      // This is a section header - bundle all items collected so far
      const sectionName = rowType.replace('SUBTOTAL:', '').trim()
      if (currentItems.length > 0 || row.totalCost > 0) {
        sections.push({
          title: `WORK DETAILS FOR ${sectionName}`,
          sectionType: sectionName,
          items: [...currentItems],
          subtotal: row.totalCost,
          rowNumber: row.rowNumber
        })
      }
      currentItems = []
    } else if (rowType === 'STANDALONE') {
      // Standalone item - gets its own line on proposal
      if (row.scope || row.totalCost > 0) {
        standaloneItems.push({
          itemId: row.itemId,
          name: row.scope,
          rValue: row.rValue,
          thickness: row.thickness,
          materialType: row.materialType,
          totalCost: row.totalCost,
          totalMeasurements: row.totalMeasurements,
          locations: row.locations,
          rowNumber: row.rowNumber
        })
      }
    } else if (rowType === 'BUNDLE_TOTAL') {
      // Bundle total - creates a section with items above it
      if (currentItems.length > 0 || row.totalCost > 0) {
        const sectionName = (row.scope || '').replace(/BUNDLE\s*TOTAL\s*-?\s*/i, '').trim() || `Bundle ${sections.length + 1}`
        sections.push({
          title: `WORK DETAILS FOR ${sectionName}`,
          sectionType: sectionName,
          items: [...currentItems],
          subtotal: row.totalCost,
          rowNumber: row.rowNumber
        })
      }
      currentItems = []
    } else if (rowType === 'SECTION_TOTAL') {
      // Section total
      sectionTotals.push({
        name: row.scope || 'Section Total',
        amount: row.totalCost,
        rowNumber: row.rowNumber
      })
    } else if (rowType === 'GRAND_TOTAL') {
      // Grand total
      grandTotal = row.totalCost
    } else if (rowType === 'ITEM' || !rowType) {
      // Regular item - collect for next subtotal
      if (row.scope || row.itemId) {
        currentItems.push({
          itemId: row.itemId,
          name: row.scope,
          rValue: row.rValue,
          thickness: row.thickness,
          materialType: row.materialType,
          unitCost: row.unitCost,
          totalCost: row.totalCost,
          totalMeasurements: row.totalMeasurements,
          locations: row.locations,
          rowNumber: row.rowNumber
        })
      }
    }
  }

  // Handle any remaining items (if no final SUBTOTAL)
  if (currentItems.length > 0) {
    sections.push({
      title: 'ADDITIONAL ITEMS',
      sectionType: 'OTHER',
      items: currentItems,
      subtotal: currentItems.reduce((sum, item) => sum + (item.totalCost || 0), 0),
      rowNumber: -1
    })
  }

  return { sections, standaloneItems, sectionTotals, grandTotal }
}

/**
 * Fetch descriptions from BigQuery item_description_mapping table
 */
async function fetchDescriptions(itemIds) {
  if (itemIds.length === 0) return {}

  try {
    const result = await runQuery(
      `SELECT
        item_id,
        paragraph_description,
        bullet_points
       FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
       WHERE item_id IN UNNEST(@itemIds)`,
      { itemIds },
      { location: 'US' }
    )

    const descMap = {}
    for (const row of result) {
      descMap[row.item_id] = {
        paragraph: row.paragraph_description || '',
        bullets: row.bullet_points || ''
      }
    }
    return descMap
  } catch (err) {
    console.warn('Failed to fetch descriptions:', err.message)
    // Return empty - will use scope name as fallback
    return {}
  }
}

/**
 * Build description for an item, replacing placeholders
 * Placeholders: {R_VALUE}, {THICKNESS}, {TYPE}
 */
function buildDescription(item, descriptions) {
  const desc = descriptions[item.itemId]

  if (!desc || !desc.paragraph) {
    // Fallback to scope name if no description found
    return item.name || item.itemId || 'No description'
  }

  let text = desc.paragraph

  // Replace placeholders with actual values from the takeoff
  if (item.rValue) {
    text = text.replace(/\{R_VALUE\}/g, item.rValue)
    text = text.replace(/\{r_value\}/gi, item.rValue)
  }
  if (item.thickness) {
    text = text.replace(/\{THICKNESS\}/g, item.thickness)
    text = text.replace(/\{thickness\}/gi, item.thickness)
  }
  if (item.materialType) {
    text = text.replace(/\{TYPE\}/g, item.materialType)
    text = text.replace(/\{type\}/gi, item.materialType)
    text = text.replace(/\{MATERIAL_TYPE\}/g, item.materialType)
    text = text.replace(/\{material_type\}/gi, item.materialType)
  }

  // Clean up any remaining unfilled placeholders
  text = text.replace(/\{[A-Z_]+\}/g, '[TBD]')

  return text
}

/**
 * Auto-detect row type from Column O formula patterns
 *
 * Rules:
 * - =B{n}*N{n} → ITEM (unit cost × measurements)
 * - =SUM(O{x}:O{y}) → BUNDLE_TOTAL
 * - Scope contains "BUNDLE TOTAL" → BUNDLE_TOTAL (backup)
 * - =O{a}+O{b}+... (5+ refs) → SECTION_TOTAL
 */
function detectRowTypeFromFormula(formula, scopeValue, itemId, rowNumber) {
  const f = (formula || '').trim()
  const scope = (scopeValue || '').toUpperCase()

  // Rule 1: =B{n}*N{n} → ITEM
  if (/^=B(\d+)\*N\1$/i.test(f)) {
    return 'ITEM'
  }

  // Rule 2: =SUM(O{x}:O{y}) → BUNDLE_TOTAL
  if (/^=SUM\(O\d+:O\d+\)$/i.test(f)) {
    return 'BUNDLE_TOTAL'
  }

  // Rule 3: Scope contains "BUNDLE TOTAL" → BUNDLE_TOTAL
  if (/BUNDLE\s*TOTAL/i.test(scope)) {
    return 'BUNDLE_TOTAL'
  }

  // Rule 4: Count O references - 5+ means SECTION_TOTAL
  const oRefs = f.match(/O\d+/gi) || []
  if (oRefs.length >= 5) {
    return 'SECTION_TOTAL'
  }

  // Default: ITEM if has itemId, else UNKNOWN
  return itemId ? 'ITEM' : 'UNKNOWN'
}

/**
 * Format project info for response
 */
function formatProjectInfo(project) {
  const addressParts = [project.address, project.city, project.state, project.zip]
    .filter(Boolean)

  return {
    id: project.id,
    name: project.project_name || 'Unnamed Project',
    address: addressParts.join(', ') || 'No address',
    gcName: project.gc_name || 'Unknown GC',
    date: new Date().toISOString().split('T')[0]
  }
}
