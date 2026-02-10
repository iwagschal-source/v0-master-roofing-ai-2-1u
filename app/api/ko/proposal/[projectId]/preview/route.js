/**
 * Proposal Preview API (Step 8.C.10)
 *
 * Reads takeoff sheet and returns structured data for proposal preview.
 * Auto-detects row types from Column O formulas (bundles use =SUM()).
 * Fetches descriptions from BigQuery and replaces placeholders.
 *
 * SESSION 24 FIXES:
 * - FIX 1: locationStart now skips R/IN/TYPE columns (uses materialType index)
 * - FIX 2: Bundle membership determined by SUM formula range, not row proximity
 * - FIX 3: $0 bundles with no measurements are excluded from proposal
 * - FIX 4: Section header rows (item_id = "item_id") are skipped
 * - FIX 5: Items not referenced by any SUM formula are detected as STANDALONE
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
    const rawHeaders = sheetData[headerRowIdx] // Keep original case for location names
    const columnMap = findColumnIndices(headers)
    const tcLetter = columnMap.totalCost >= 0 ? indexToLetter(columnMap.totalCost) : 'O'
    const tmLetter = columnMap.totalMeasurements >= 0 ? indexToLetter(columnMap.totalMeasurements) : 'N'

    // 3b. Find ALL section header rows (Roofing, Balconies, Exterior, etc.)
    // Each section can have different location names in the same columns (G-M).
    const sectionHeaders = []
    // First section header is the main header row
    sectionHeaders.push({
      rowIndex: headerRowIdx,
      sheetRow: headerRowIdx + 1, // 1-based
      locationHeaders: buildLocationHeaders(rawHeaders, columnMap)
    })
    // Scan remaining rows for additional section headers
    for (let i = headerRowIdx + 1; i < sheetData.length; i++) {
      if (isSectionHeaderRow(sheetData[i], columnMap)) {
        sectionHeaders.push({
          rowIndex: i,
          sheetRow: i + 1, // 1-based
          locationHeaders: buildLocationHeaders(sheetData[i], columnMap)
        })
      }
    }

    // Build a Set of section header row indices for skipping during data parsing
    const sectionHeaderIndices = new Set(sectionHeaders.map(sh => sh.rowIndex))

    // 4. Parse rows into structured data with auto-detected row types
    // Skip rows before and including header row, and skip section header rows
    const dataStartIdx = headerRowIdx + 1
    const rows = sheetData.slice(dataStartIdx)
      .map((row, idx) => {
        const sheetIdx = dataStartIdx + idx
        const actualRowNum = sheetIdx + 1 // 1-based sheet row number

        // Skip section header rows — they are not data
        if (sectionHeaderIndices.has(sheetIdx)) {
          return null
        }

        const formulaRow = sheetFormulas[sheetIdx] || []
        const totalCostFormula = getCellValue(formulaRow, columnMap.totalCost)
        const scopeValue = getCellValue(row, columnMap.scope)
        const itemId = getCellValue(row, columnMap.itemId)

        // Auto-detect row type from formula patterns
        const autoRowType = detectRowTypeFromFormula(totalCostFormula, scopeValue, itemId, actualRowNum, tcLetter, tmLetter)

        // Get the correct location headers for this row's section
        const locHeaders = getLocationHeadersForRow(actualRowNum, sectionHeaders)

        return {
          rowNumber: actualRowNum,
          itemId,
          unitCost: parseCurrency(getCellValue(row, columnMap.unitCost)),
          rValue: getCellValue(row, columnMap.rValue),
          thickness: getCellValue(row, columnMap.thickness),
          materialType: getCellValue(row, columnMap.materialType),
          scope: scopeValue,
          totalMeasurements: parseFloat(getCellValue(row, columnMap.totalMeasurements)) || 0,
          totalCost: parseCurrency(getCellValue(row, columnMap.totalCost)),
          rowType: autoRowType, // Use auto-detected type
          formula: totalCostFormula, // Include for debugging
          locations: extractLocations(row, columnMap, locHeaders),
          bidType: getCellValue(row, columnMap.bidType) || 'BASE'
        }
      })
      .filter(Boolean) // Remove nulls (skipped section header rows)

    // 4b. [FIX 2 & 5] Parse SUM formula ranges to determine bundle membership
    // Build a map of which sheet rows are referenced by which BUNDLE_TOTAL
    const bundleRanges = parseBundleRanges(rows, tcLetter)

    // Mark items not in any bundle range as STANDALONE
    for (const row of rows) {
      if (row.rowType === 'ITEM') {
        const isInBundle = bundleRanges.some(
          range => row.rowNumber >= range.startRow && row.rowNumber <= range.endRow
        )
        if (!isInBundle) {
          row.rowType = 'STANDALONE'
        }
      }
    }

    // 5. Parse row types to build sections using formula-based bundle ranges
    const { sections, standaloneItems, sectionTotals, grandTotal } = parseRowTypes(rows, bundleRanges)

    // 6. Fetch descriptions from BigQuery for all item_ids
    // [FIX 4] Filter out header row artifacts like "item_id"
    const itemIds = [...new Set(
      rows
        .filter(r => r.itemId && !isHeaderRowArtifact(r.itemId))
        .map(r => r.itemId)
    )]
    const descriptions = await fetchDescriptions(itemIds)

    // 7. Build final preview data with descriptions and placeholder replacement
    // For each section, find the "main item" (one with paragraph_description) for title/description
    const enrichedSections = sections.map(section => {
      // Find the main item in this section (first item with a paragraph_description)
      const mainItem = findMainItem(section.items, descriptions)

      // Build section title from main item or fall back to current logic
      const sectionTitle = mainItem
        ? (descriptions[mainItem.itemId]?.scopeName || descriptions[mainItem.itemId]?.displayName || section.sectionType)
        : section.sectionType

      // Build section description from main item's paragraph_description
      const sectionDescription = mainItem
        ? buildDescription(mainItem, descriptions)
        : null

      return {
        ...section,
        title: sectionTitle,
        sectionType: sectionTitle,
        sectionDescription, // The paragraph_description of the main item
        mainItemId: mainItem?.itemId || null,
        bidType: section.bidType || 'BASE',
        items: section.items.map(item => ({
          ...item,
          description: buildDescription(item, descriptions)
        }))
      }
    })

    const enrichedStandalones = standaloneItems.map(item => ({
      ...item,
      description: buildDescription(item, descriptions),
      bidType: item.bidType || 'BASE'
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
      sectionHeaders: sectionHeaders.map(sh => ({ sheetRow: sh.sheetRow, locationHeaders: sh.locationHeaders })),
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
 *
 * [FIX 1] Location columns start AFTER materialType (TYPE column),
 * not after Scope. R, IN, TYPE are metadata columns, not locations.
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
    locationEnd: -1,
    bidType: -1
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
    } else if (header.includes('bid') && header.includes('type')) {
      map.bidType = idx
    }
  })

  // [FIX 1] Determine location columns: start AFTER the last metadata column
  // (R, IN, TYPE), not after Scope. The order is:
  // A=item_id, B=unit_cost, C=scope, D=R, E=IN, F=TYPE, G+=locations, N=total_meas, O=total_cost
  // Location columns are between TYPE and Total Measurements
  const metadataEnd = Math.max(map.materialType, map.thickness, map.rValue, map.scope)
  if (metadataEnd >= 0 && map.totalMeasurements > metadataEnd) {
    map.locationStart = metadataEnd + 1
    map.locationEnd = map.totalMeasurements - 1
  }

  return map
}

/**
 * Convert a 0-based column index to a column letter (0→A, 1→B, 6→G, 25→Z, 26→AA)
 */
function indexToLetter(index) {
  let letter = ''
  let i = index
  while (i >= 0) {
    letter = String.fromCharCode((i % 26) + 65) + letter
    i = Math.floor(i / 26) - 1
  }
  return letter
}

/**
 * Safely get cell value from row
 */
function getCellValue(row, index) {
  if (index < 0 || index >= row.length) return ''
  return (row[index] || '').toString().trim()
}

/**
 * Parse currency string (e.g., "$1,234.56") to number
 */
function parseCurrency(value) {
  if (!value) return 0
  // Remove $ and commas, then parse
  const cleaned = value.toString().replace(/[$,]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

/**
 * Extract location values from row with header names
 */
function extractLocations(row, columnMap, locationHeaders = {}) {
  const locations = {}
  if (columnMap.locationStart < 0 || columnMap.locationEnd < 0) return locations

  for (let i = columnMap.locationStart; i <= columnMap.locationEnd && i < row.length; i++) {
    const value = parseFloat(row[i]) || 0
    if (value > 0) {
      const key = `col_${i}`
      const headerName = locationHeaders[key] || key
      locations[headerName] = value
    }
  }
  return locations
}

/**
 * Build location headers map from a header row: {col_6: "1st Floor", col_7: "2nd Floor", ...}
 */
function buildLocationHeaders(rawRow, columnMap) {
  const locationHeaders = {}
  if (columnMap.locationStart < 0 || columnMap.locationEnd < 0) return locationHeaders

  for (let i = columnMap.locationStart; i <= columnMap.locationEnd; i++) {
    const headerName = (rawRow[i] || '').toString().trim()
    if (headerName) {
      locationHeaders[`col_${i}`] = headerName
    }
  }
  return locationHeaders
}

/**
 * Detect if a row is a section header row (e.g., Balconies, Exterior sections).
 * These rows repeat header text like "item_id", "scope", "unit cost" in the expected columns.
 */
function isSectionHeaderRow(row, columnMap) {
  if (!row) return false
  const itemIdVal = (getCellValue(row, columnMap.itemId) || '').toLowerCase()
  const scopeVal = (getCellValue(row, columnMap.scope) || '').toLowerCase()
  // A section header has "item_id" in the item_id column AND a header-like word in the scope column
  return (itemIdVal === 'item_id' || itemIdVal === 'item id' || itemIdVal === 'itemid') &&
    (scopeVal.includes('scope') || scopeVal.includes('description') || scopeVal.includes('item'))
}

/**
 * Get the correct locationHeaders for a given row number.
 * Returns the headers from the nearest section header ABOVE that row.
 */
function getLocationHeadersForRow(rowNumber, sectionHeaders) {
  let best = sectionHeaders[0]
  for (const sh of sectionHeaders) {
    if (sh.sheetRow <= rowNumber) {
      best = sh
    } else {
      break
    }
  }
  return best ? best.locationHeaders : {}
}

/**
 * [FIX 4] Check if an itemId is actually a header row artifact
 * Section headers like row 45 (Balconies) and row 54 (Exterior) repeat
 * "item_id" in column A — these are not real items.
 */
function isHeaderRowArtifact(itemId) {
  if (!itemId) return false
  const normalized = itemId.toLowerCase().trim()
  return normalized === 'item_id' || normalized === 'item id' || normalized === 'itemid'
}

/**
 * [FIX 2] Parse SUM formula ranges from BUNDLE_TOTAL rows
 *
 * For each BUNDLE_TOTAL row, extract the row range from the SUM formula.
 * e.g., =SUM(O5:O8) means the bundle includes sheet rows 5-8.
 *
 * @param {string} tcLetter - Total Cost column letter (e.g., 'O' or 'L')
 * Returns array of { bundleRow, startRow, endRow }
 */
function parseBundleRanges(rows, tcLetter) {
  const ranges = []

  for (const row of rows) {
    if (row.rowType !== 'BUNDLE_TOTAL') continue

    const formula = (row.formula || '').trim()

    // Parse =SUM({tcLetter}{x}:{tcLetter}{y}) to extract start and end rows
    const sumMatch = formula.match(new RegExp(`^=SUM\\(${tcLetter}(\\d+):${tcLetter}(\\d+)\\)$`, 'i'))
    if (sumMatch) {
      ranges.push({
        bundleRow: row.rowNumber,
        startRow: parseInt(sumMatch[1]),
        endRow: parseInt(sumMatch[2])
      })
    } else {
      // Backup: if detected via scope text "BUNDLE TOTAL" but no SUM formula,
      // we cannot determine range — skip this bundle (it won't group items)
      // Items before it will become standalone since they won't match any range
      console.warn(`Bundle at row ${row.rowNumber} has no parseable SUM formula: "${formula}"`)
    }
  }

  return ranges
}

/**
 * Parse row types to build sections, standalone items, and totals
 *
 * [FIX 2] Uses bundleRanges (from SUM formulas) to determine which items
 * belong to which bundle, instead of grouping by row proximity.
 *
 * [FIX 3] Skips bundles where all items have zero measurements AND zero cost.
 *
 * [FIX 4] Skips header row artifacts.
 *
 * Row Types:
 * - ITEM: Regular line item, belongs to a bundle (determined by SUM range)
 * - STANDALONE: Item not referenced by any SUM formula
 * - BUNDLE_TOTAL: Creates a section from its SUM range members
 * - SECTION_TOTAL: Section subtotal
 * - GRAND_TOTAL: Final total
 */
function parseRowTypes(rows, bundleRanges) {
  const sections = []
  const standaloneItems = []
  const sectionTotals = []
  let grandTotal = 0

  // Build a lookup of rows by their sheet row number
  const rowByNumber = {}
  for (const row of rows) {
    rowByNumber[row.rowNumber] = row
  }

  // Track which BUNDLE_TOTAL rows we've already processed
  const processedBundles = new Set()

  for (const row of rows) {
    const rowType = (row.rowType || '').toUpperCase()

    // [FIX 4] Skip header row artifacts
    if (isHeaderRowArtifact(row.itemId)) {
      continue
    }

    if (rowType === 'BUNDLE_TOTAL') {
      // [FIX 2] Find the bundle range for this BUNDLE_TOTAL
      const range = bundleRanges.find(r => r.bundleRow === row.rowNumber)

      if (range) {
        // Collect items within the SUM formula range
        const bundleItems = []
        for (let r = range.startRow; r <= range.endRow; r++) {
          const item = rowByNumber[r]
          if (item && item.itemId && !isHeaderRowArtifact(item.itemId)) {
            bundleItems.push({
              itemId: item.itemId,
              name: item.scope,
              rValue: item.rValue,
              thickness: item.thickness,
              materialType: item.materialType,
              unitCost: item.unitCost,
              totalCost: item.totalCost,
              totalMeasurements: item.totalMeasurements,
              locations: item.locations,
              rowNumber: item.rowNumber
            })
          }
        }

        // [FIX 3] Only include bundle if it has items with measurements OR cost
        const hasData = bundleItems.some(item => item.totalMeasurements > 0 || item.totalCost > 0)
        if (bundleItems.length > 0 && hasData) {
          const calculatedSubtotal = bundleItems.reduce((sum, item) => sum + (item.totalCost || 0), 0)
          const sectionName = (row.scope || '').replace(/BUNDLE\s*T?OTAL\s*-?\s*/i, '').trim() || `Bundle ${sections.length + 1}`
          sections.push({
            title: sectionName,
            sectionType: sectionName,
            items: bundleItems,
            subtotal: calculatedSubtotal,
            rowNumber: row.rowNumber,
            bidType: row.bidType || 'BASE'
          })
        }
        processedBundles.add(row.rowNumber)
      }
      // If no range found (no parseable SUM), skip — items remain standalone

    } else if (rowType === 'STANDALONE') {
      // [FIX 5] Standalone items — not in any bundle
      // Only include if they have measurements or cost
      if (row.totalMeasurements > 0 || row.totalCost > 0) {
        standaloneItems.push({
          itemId: row.itemId,
          name: row.scope,
          rValue: row.rValue,
          thickness: row.thickness,
          materialType: row.materialType,
          unitCost: row.unitCost,
          totalCost: row.totalCost,
          totalMeasurements: row.totalMeasurements,
          locations: row.locations,
          rowNumber: row.rowNumber,
          bidType: row.bidType || 'BASE'
        })
      }

    } else if (rowType === 'SECTION_TOTAL') {
      sectionTotals.push({
        name: row.scope || 'Section Total',
        amount: row.totalCost,
        rowNumber: row.rowNumber
      })

    } else if (rowType === 'GRAND_TOTAL') {
      grandTotal = row.totalCost
    }
    // ITEM rows are handled via bundle ranges above — no need to collect them here
  }

  return { sections, standaloneItems, sectionTotals, grandTotal }
}

/**
 * Fetch descriptions from BigQuery item_description_mapping table
 * Returns paragraph_description, scope_name, display_name for main item identification
 */
async function fetchDescriptions(itemIds) {
  if (itemIds.length === 0) return {}

  try {
    const result = await runQuery(
      `SELECT
        item_id,
        paragraph_description,
        scope_name,
        display_name,
        section,
        row_type
       FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
       WHERE item_id IN UNNEST(@itemIds)`,
      { itemIds },
      { location: 'US' }
    )

    const descMap = {}
    for (const row of result) {
      descMap[row.item_id] = {
        paragraph: row.paragraph_description || '',
        scopeName: row.scope_name || '',
        displayName: row.display_name || '',
        section: row.section || '',
        rowType: row.row_type || '',
        hasDescription: !!row.paragraph_description
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
 * Find the "main item" in a section - the item that has a paragraph_description
 * This item defines the system being installed (e.g., the roofing system, not its components)
 */
function findMainItem(items, descriptions) {
  if (!items || items.length === 0) return null

  // Find the first item that has a paragraph_description in the descriptions map
  for (const item of items) {
    const desc = descriptions[item.itemId]
    if (desc && desc.hasDescription) {
      return item
    }
  }

  // If no item has a description, return the first item as fallback
  return items[0] || null
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
 * Auto-detect row type from Total Cost formula patterns
 *
 * Rules:
 * - =B{n}*{tmLetter}{n} → ITEM (unit cost × measurements)
 * - =SUM({tcLetter}{x}:{tcLetter}{y}) → BUNDLE_TOTAL
 * - Scope contains "BUNDLE TOTAL" → BUNDLE_TOTAL (backup)
 * - ={tcLetter}{a}+{tcLetter}{b}+... (5+ refs) → SECTION_TOTAL
 *
 * @param {string} tcLetter - Total Cost column letter (e.g., 'O' or 'L')
 * @param {string} tmLetter - Total Measurements column letter (e.g., 'N' or 'K')
 */
function detectRowTypeFromFormula(formula, scopeValue, itemId, rowNumber, tcLetter, tmLetter) {
  const f = (formula || '').trim()
  const scope = (scopeValue || '').toUpperCase()

  // [FIX 4] Skip header row artifacts
  if (isHeaderRowArtifact(itemId)) {
    return 'HEADER'
  }

  // Rule 1: =B{n}*{tmLetter}{n} → ITEM
  if (new RegExp(`^=B(\\d+)\\*${tmLetter}\\1$`, 'i').test(f)) {
    return 'ITEM'
  }

  // Rule 2: =SUM({tcLetter}{x}:{tcLetter}{y}) → BUNDLE_TOTAL
  if (new RegExp(`^=SUM\\(${tcLetter}\\d+:${tcLetter}\\d+\\)$`, 'i').test(f)) {
    return 'BUNDLE_TOTAL'
  }

  // Rule 3: Scope contains "BUNDLE TOTAL" → BUNDLE_TOTAL
  if (/BUNDLE\s*T?OTAL/i.test(scope)) {
    return 'BUNDLE_TOTAL'
  }

  // Rule 4: Count totalCost column references - 5+ means SECTION_TOTAL
  const tcRefs = f.match(new RegExp(`${tcLetter}\\d+`, 'gi')) || []
  if (tcRefs.length >= 5) {
    return 'SECTION_TOTAL'
  }

  // Rule 5: Scope contains "TOTAL COST FOR ALL" → SECTION_TOTAL or GRAND_TOTAL
  if (/TOTAL COST FOR ALL/i.test(scope)) {
    if (/ALL WORK LISTED/i.test(scope)) {
      return 'GRAND_TOTAL'
    }
    return 'SECTION_TOTAL'
  }

  // Default: ITEM if has itemId, else UNKNOWN
  // Note: ITEM may be reclassified to STANDALONE after bundle range analysis
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
