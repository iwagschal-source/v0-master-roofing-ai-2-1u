#!/usr/bin/env node
/**
 * Create Setup Tab in Template Spreadsheet
 *
 * Adds a "Setup" sheet tab to the takeoff template that mirrors
 * the takeoff tab's row layout exactly. Used for item configuration,
 * location toggles, and bid type selection.
 *
 * Phase 1A tasks: 1A.1 through 1A.16
 *
 * Usage:
 *   node scripts/create-setup-tab.mjs [--dry-run]
 */

import { createSign } from 'crypto'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#')) continue
  const eq = t.indexOf('=')
  if (eq === -1) continue
  const key = t.slice(0, eq).trim()
  let val = t.slice(eq + 1).trim()
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1)
  if (!process.env[key]) process.env[key] = val
}

const TEMPLATE_ID = '1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4'
const SETUP_TAB_NAME = 'Setup'
const DRY_RUN = process.argv.includes('--dry-run')

// ========================================================
// Template row layout — mirrors takeoff tab EXACTLY
// ========================================================

// Section headers (row numbers where "item_id" header row appears)
const SECTION_HEADERS = {
  3: { name: 'ROOFING', locations: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor', 'Main Roof', 'Stair Bulkhead', 'Elev. Bulkhead'] },
  36: { name: 'WATERPROOFING', locations: ['1st Floor', '2nd Floor', '3rd Floor', '4th Floor', 'Main Roof', 'Stair Bulkhead', 'Elev. Bulkhead'] },
  40: { name: 'BALCONIES', locations: ['1st floor Balconies', '2nd floor Balconies', '3rd floor Balconies', '4th floor Balconies', '5th floor Balconies', '6th floor Balconies', '7th floor Balconies'] },
  49: { name: 'EXTERIOR', locations: ['Front / Elevation', 'Rear / Elevation', 'Right / Elevation', 'Left / Elevation', 'Bulkhead', 'Overhang', 'Inside Parapet'] },
}

// Item rows: {row: [item_id, scope_name]}
// These match the takeoff tab EXACTLY
const ITEM_ROWS = {
  4: ['MR-001VB', 'Vapor Barrier or Temp waterproofing'],
  5: ['MR-002PITCH', 'Upcharge for 1/4" Pitch'],
  6: ['MR-003BU2PLY', 'Roofing - Builtup - 2 ply Scope'],
  7: ['MR-004UO', 'Up and over'],
  8: ['MR-010DRAIN', 'Drains'],
  9: ['MR-011DOORSTD', 'Doorpans - Standard 3-6 ft'],
  10: ['MR-017RAIL', 'Railing Posts'],
  11: ['MR-018PLUMB', 'Plumbing Penetrations'],
  12: ['MR-019MECH', 'Mechanical Penetrations'],
  13: ['MR-021AC', 'AC Units/Dunnage'],
  14: [null, 'BUNDLE TOTAL'],
  15: ['MR-006IRMA', 'Roofing - IRMA'],
  16: ['MR-007PMMA', 'PMMA (Liquid) or 2ply Torch@Building Wall'],
  17: ['MR-008PMMA', 'PMMA (Liquid) or 2ply Torch@Parapet Wall'],
  18: ['MR-009UOPMMA', 'Up and over - PMMA'],
  19: ['MR-011DOORSTD', 'Doorpans - Standard 3-6 ft'],
  20: ['MR-010DRAIN', 'Drains'],
  21: [null, 'BUNDLE TOTAL'],
  22: ['MR-022COPELO', 'Coping (Low Parapet) Gravel stop/Edge Flashing'],
  23: ['MR-023COPEHI', 'Coping (High Parapet)'],
  24: ['MR-024INSUCOPE', 'Insulation under Coping'],
  25: [null, 'BUNDLE TOTAL'],
  26: ['MR-025FLASHBLDG', 'Metal Flashing at building wall'],
  27: ['MR-026FLASHPAR', 'Metal Flashing at Parapet wall'],
  28: [null, 'BUNDLE TOTAL'],
  29: ['MR-027OBIRMA', 'Overburden for IRMA Roof'],
  30: ['MR-028PAVER', 'Pavers'],
  31: ['MR-029FLASHPAV', 'Metal Edge flashing at paver Termination'],
  32: [null, 'BUNDLE TOTAL'],
  33: ['MR-030GREEN', 'Green Roof Scope'],
  34: ['MR-031FLASHGRN', 'Metal Edge flashing at Green Roof'],
  35: [null, 'BUNDLE TOTAL'],
  // WATERPROOFING items
  37: ['MR-032RECESSWP', 'Recessed floor - Liquid Waterproofing'],
  38: ['MR-FIRE-LIQ', 'Firestone Liquid WP'],
  39: ['MR-THORO', 'Thorocoat'],
  // BALCONIES items
  41: ['MR-033TRAFFIC', 'Traffic Coating'],
  42: ['MR-034DRIP', 'Aluminum Drip edge'],
  43: ['MR-036DOORBAL', 'Doorpans - Balconies'],
  44: ['MR-035LFLASH', 'Liquid L Flashing'],
  45: [null, 'BUNDLE TOTAL'],
  // EXTERIOR items
  50: ['MR-037BRICKWP', 'Brick area - Waterproofing'],
  51: ['MR-038OPNBRKEA', 'Openings at brick areas (Count) < 32lf'],
  52: ['MR-039OPNBRKLF', 'Openings at brick areas (LF) > 32lf'],
  53: [null, 'BUNDLE TOTAL'],
  54: ['MR-040PANELWP', 'Panel Area - Waterproofing'],
  55: ['MR-041OPNPNLEA', 'Openings at panel areas (Count) < 32lf'],
  56: ['MR-042OPNPNLLF', 'Openings at panel areas (LF) > 32lf'],
  57: [null, 'BUNDLE TOTAL'],
  58: ['MR-043EIFS', 'EIFS Scope'],
  59: ['MR-044OPNSTCEA', 'Openings at stucco areas (Count) < 32lf'],
  60: ['MR-045OPNSTCLF', 'Openings at stucco areas (LF) > 32lf'],
  61: ['MR-046STUCCO', 'Transitional stucco'],
  62: [null, 'BUNDLE TOTAL'],
  63: ['MR-047DRIPCAP', 'Drip cap'],
  64: ['MR-048SILL', 'Sills'],
  65: ['MR-049TIEIN', 'Tie-In'],
  66: ['MR-050ADJHORZ', 'Adj. building horizontal (Custom Metal Flashing)'],
  67: ['MR-051ADJVERT', 'Adj. building vertical'],
}

// Total rows
const TOTAL_ROWS = {
  47: 'TOTAL COST FOR ALL THE ROOFING, BALCONIES, & WATERPROOFING WORKS',
  68: 'TOTAL COST FOR ALL THE EXTERIOR WORKS',
  70: 'TOTAL COST FOR ALL WORK LISTED IN THIS PROPOSAL -',
}

// Setup tab column layout:
// A: item_id (INDEX+MATCH from Library)
// B: unit_cost (INDEX+MATCH from Library)
// C: display_name (dropdown validated)
// D: R value (editable)
// E: IN / thickness (editable)
// F: TYPE / material (editable)
// G-M: Location toggles (7 columns)
// N: UOM (INDEX+MATCH from Library)
// O: Bid Type (dropdown: BASE, ALTERNATE)
// P: Bluebeam Tool Name (INDEX+MATCH from Library)
// Q: Bluebeam Tool Status (formula)
// R: Selected Location Count (COUNTA formula)

const SETUP_HEADERS = [
  'item_id', 'Unit Cost', 'Scope/Item', 'R', 'IN', 'TYPE',
  '', '', '', '', '', '', '', // G-M placeholders (filled per section)
  'UOM', 'BID TYPE', 'Bluebeam Tool', 'Tool Status', 'Locations Selected',
]

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !privateKey) throw new Error('Missing credentials')

  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    sub: 'rfp@masterroofingus.com',
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url')

  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const sig = sign.sign(privateKey, 'base64url')

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${payload}.${sig}`,
    }),
  })
  return (await r.json()).access_token
}

async function sheetsApi(accessToken, method, endpoint, body = null) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}${endpoint}`
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Sheets API ${method} ${endpoint} failed (${res.status}): ${text}`)
  }
  return res.json()
}

function buildSetupRows() {
  // Build 70 rows for the Setup tab
  const rows = []

  for (let rowNum = 1; rowNum <= 70; rowNum++) {
    const row = new Array(18).fill('')

    if (rowNum === 1) {
      // Title row
      row[0] = 'BLUEBEAM SETUP & PROJECT CONFIGURATION'
      rows.push(row)
      continue
    }

    if (rowNum === 2) {
      // Project name row
      row[0] = '{PROJECT_NAME}'
      rows.push(row)
      continue
    }

    // Section header rows
    if (SECTION_HEADERS[rowNum]) {
      const section = SECTION_HEADERS[rowNum]
      row[0] = 'item_id'
      row[1] = 'Unit Cost'
      row[2] = 'Scope/Item'
      row[3] = 'R'
      row[4] = 'IN'
      row[5] = 'TYPE'
      // G-M: location names
      const locs = section.locations
      for (let i = 0; i < 7; i++) {
        row[6 + i] = locs[i] || ''
      }
      row[13] = 'UOM'
      row[14] = 'BID TYPE'
      row[15] = 'Bluebeam Tool'
      row[16] = 'Tool Status'
      row[17] = 'Locations Selected'
      rows.push(row)
      continue
    }

    // Item rows
    if (ITEM_ROWS[rowNum]) {
      const [itemId, scopeName] = ITEM_ROWS[rowNum]
      if (itemId === null) {
        // Bundle total row — no formulas on Setup tab, just label
        row[2] = scopeName
        rows.push(row)
        continue
      }
      // Column A: INDEX+MATCH for item_id from Library
      row[0] = `=IFERROR(INDEX(Library!$A$2:$A$81, MATCH(C${rowNum}, Library!$C$2:$C$81, 0)), C${rowNum})`
      // Column B: INDEX+MATCH for unit_cost from Library
      row[1] = `=IFERROR(INDEX(Library!$E$2:$E$81, MATCH(C${rowNum}, Library!$C$2:$C$81, 0)), "")`
      // Column C: scope name (dropdown validated — validation added separately)
      row[2] = scopeName
      // D, E, F: empty (editable R, IN, TYPE)
      // G-M: empty (location toggles — user fills)
      // Column N (13): UOM from Library (col G = index 7)
      row[13] = `=IFERROR(INDEX(Library!$G$2:$G$81, MATCH(C${rowNum}, Library!$C$2:$C$81, 0)), "")`
      // Column O (14): Bid Type — default BASE
      row[14] = 'BASE'
      // Column P (15): Bluebeam Tool Name from Library (col AE = bluebeam_tool_name, col 31)
      row[15] = `=IFERROR(INDEX(Library!$AE$2:$AE$81, MATCH(C${rowNum}, Library!$C$2:$C$81, 0)), "")`
      // Column Q (16): Tool Status
      row[16] = `=IF(P${rowNum}<>"", "✓ Ready", "✗ Missing")`
      // Column R (17): Location count
      row[17] = `=COUNTA(G${rowNum}:M${rowNum})`

      rows.push(row)
      continue
    }

    // Total rows
    if (TOTAL_ROWS[rowNum]) {
      row[1] = TOTAL_ROWS[rowNum]
      rows.push(row)
      continue
    }

    // Empty/spacer rows
    rows.push(row)
  }

  return rows
}

async function main() {
  console.log('=== Create Setup Tab ===')
  console.log(`Template: ${TEMPLATE_ID}`)
  console.log(`Dry run: ${DRY_RUN}`)

  const accessToken = await getAccessToken()
  console.log('Authenticated')

  // 1. Check existing tabs
  const spreadsheet = await sheetsApi(accessToken, 'GET', '?fields=sheets.properties')
  const existingSetup = spreadsheet.sheets.find(s => s.properties.title === SETUP_TAB_NAME)

  if (existingSetup) {
    console.log(`Setup tab already exists (sheetId: ${existingSetup.properties.sheetId}). Deleting and recreating...`)
    if (!DRY_RUN) {
      await sheetsApi(accessToken, 'POST', ':batchUpdate', {
        requests: [{ deleteSheet: { sheetId: existingSetup.properties.sheetId } }],
      })
      console.log('Deleted existing Setup tab')
    }
  }

  // 2. Create Setup tab at index 0 (first tab)
  console.log('\n1. Creating Setup tab at index 0...')
  let setupSheetId
  if (!DRY_RUN) {
    const result = await sheetsApi(accessToken, 'POST', ':batchUpdate', {
      requests: [{
        addSheet: {
          properties: {
            title: SETUP_TAB_NAME,
            index: 0,
            gridProperties: { rowCount: 80, columnCount: 18 },
          },
        },
      }],
    })
    setupSheetId = result.replies[0].addSheet.properties.sheetId
    console.log(`Created Setup tab (sheetId: ${setupSheetId})`)
  } else {
    setupSheetId = 999999
    console.log('[DRY RUN] Would create Setup tab')
  }

  // 3. Write all row data
  console.log('\n2. Building and writing row data...')
  const rows = buildSetupRows()
  console.log(`   Built ${rows.length} rows`)

  if (!DRY_RUN) {
    await sheetsApi(accessToken, 'PUT',
      `/values/'Setup'!A1:R${rows.length}?valueInputOption=USER_ENTERED`,
      { values: rows }
    )
    console.log(`   Wrote ${rows.length} rows`)
  }

  // 4. Formatting batch update
  console.log('\n3. Applying formatting...')
  const formatRequests = []

  // Title row (row 1): large, bold, merged
  formatRequests.push({
    mergeCells: {
      range: { sheetId: setupSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 18 },
      mergeType: 'MERGE_ALL',
    },
  })
  formatRequests.push({
    repeatCell: {
      range: { sheetId: setupSheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 18 },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true, fontSize: 14 },
          horizontalAlignment: 'CENTER',
          backgroundColor: { red: 0.15, green: 0.25, blue: 0.45 },
          textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 1, green: 1, blue: 1 } },
        },
      },
      fields: 'userEnteredFormat(textFormat,horizontalAlignment,backgroundColor)',
    },
  })

  // Project name row (row 2): bold, merged
  formatRequests.push({
    mergeCells: {
      range: { sheetId: setupSheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 18 },
      mergeType: 'MERGE_ALL',
    },
  })
  formatRequests.push({
    repeatCell: {
      range: { sheetId: setupSheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 18 },
      cell: {
        userEnteredFormat: {
          textFormat: { bold: true, fontSize: 12 },
          backgroundColor: { red: 0.85, green: 0.88, blue: 0.95 },
        },
      },
      fields: 'userEnteredFormat(textFormat,backgroundColor)',
    },
  })

  // Section header rows: bold, colored background
  for (const headerRow of Object.keys(SECTION_HEADERS).map(Number)) {
    formatRequests.push({
      repeatCell: {
        range: { sheetId: setupSheetId, startRowIndex: headerRow - 1, endRowIndex: headerRow, startColumnIndex: 0, endColumnIndex: 18 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
            backgroundColor: { red: 0.8, green: 0.85, blue: 0.9 },
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)',
      },
    })
  }

  // Bundle total rows: bold, light gray
  const bundleTotalRows = Object.entries(ITEM_ROWS)
    .filter(([_, v]) => v[0] === null)
    .map(([k]) => Number(k))

  for (const btr of bundleTotalRows) {
    formatRequests.push({
      repeatCell: {
        range: { sheetId: setupSheetId, startRowIndex: btr - 1, endRowIndex: btr, startColumnIndex: 0, endColumnIndex: 18 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true, italic: true },
            backgroundColor: { red: 0.93, green: 0.93, blue: 0.93 },
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)',
      },
    })
  }

  // Total rows: bold
  for (const totalRow of Object.keys(TOTAL_ROWS).map(Number)) {
    formatRequests.push({
      repeatCell: {
        range: { sheetId: setupSheetId, startRowIndex: totalRow - 1, endRowIndex: totalRow, startColumnIndex: 0, endColumnIndex: 18 },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
            backgroundColor: { red: 0.9, green: 0.93, blue: 0.85 },
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)',
      },
    })
  }

  // Freeze first 3 rows (title + project name + first section header)
  // Cannot freeze columns because rows 1-2 are merged across all columns
  formatRequests.push({
    updateSheetProperties: {
      properties: {
        sheetId: setupSheetId,
        gridProperties: { frozenRowCount: 3 },
      },
      fields: 'gridProperties.frozenRowCount',
    },
  })

  // Column widths
  const columnWidths = [
    { start: 0, end: 1, width: 120 },  // A: item_id
    { start: 1, end: 2, width: 80 },   // B: unit_cost
    { start: 2, end: 3, width: 250 },  // C: scope/item
    { start: 3, end: 6, width: 50 },   // D-F: R, IN, TYPE
    { start: 6, end: 13, width: 90 },  // G-M: locations
    { start: 13, end: 14, width: 50 }, // N: UOM
    { start: 14, end: 15, width: 100 }, // O: Bid Type
    { start: 15, end: 16, width: 150 }, // P: Tool Name
    { start: 16, end: 17, width: 90 },  // Q: Tool Status
    { start: 17, end: 18, width: 110 }, // R: Locations Selected
  ]
  for (const cw of columnWidths) {
    formatRequests.push({
      updateDimensionProperties: {
        range: { sheetId: setupSheetId, dimension: 'COLUMNS', startIndex: cw.start, endIndex: cw.end },
        properties: { pixelSize: cw.width },
        fields: 'pixelSize',
      },
    })
  }

  // Conditional formatting: cells G-M with any value → solid blue fill, white text (1A.10)
  // Applies to all data rows (4-67)
  formatRequests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: setupSheetId, startRowIndex: 3, endRowIndex: 70, startColumnIndex: 6, endColumnIndex: 13 }],
        booleanRule: {
          condition: { type: 'NOT_BLANK' },
          format: {
            backgroundColor: { red: 0.2, green: 0.4, blue: 0.7 },
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
          },
        },
      },
      index: 0,
    },
  })

  // Conditional formatting: Column O (Bid Type) ALTERNATE → orange/red highlight (1A.13)
  formatRequests.push({
    addConditionalFormatRule: {
      rule: {
        ranges: [{ sheetId: setupSheetId, startRowIndex: 3, endRowIndex: 70, startColumnIndex: 14, endColumnIndex: 15 }],
        booleanRule: {
          condition: {
            type: 'TEXT_EQ',
            values: [{ userEnteredValue: 'ALTERNATE' }],
          },
          format: {
            backgroundColor: { red: 1, green: 0.6, blue: 0.2 },
            textFormat: { bold: true },
          },
        },
      },
      index: 1,
    },
  })

  if (!DRY_RUN) {
    await sheetsApi(accessToken, 'POST', ':batchUpdate', { requests: formatRequests })
    console.log(`   Applied ${formatRequests.length} formatting rules`)
  } else {
    console.log(`   [DRY RUN] Would apply ${formatRequests.length} formatting rules`)
  }

  // 5. Data validation: Column O (Bid Type) dropdown
  console.log('\n4. Adding data validation...')
  const validationRequests = []

  // Bid Type dropdown (Column O, index 14) for all item rows
  validationRequests.push({
    setDataValidation: {
      range: { sheetId: setupSheetId, startRowIndex: 3, endRowIndex: 70, startColumnIndex: 14, endColumnIndex: 15 },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: [
            { userEnteredValue: 'BASE' },
            { userEnteredValue: 'ALTERNATE' },
          ],
        },
        strict: true,
        showCustomUi: true,
      },
    },
  })

  // Column C dropdown validation (scope/item name) — per section, from Library FILTER formulas
  // ROOFING section (rows 4-35): uses Library AF (systems), AJ (bundle), AN (standalone)
  // For now, use the same 3-type validation that the takeoff tab uses
  // The validation source is the Library tab FILTER formulas in AF-AQ
  const sectionValidations = [
    { startRow: 3, endRow: 35, section: 'ROOFING' },     // rows 4-35
    { startRow: 36, endRow: 39, section: 'WATERPROOFING' }, // rows 37-39
    { startRow: 40, endRow: 45, section: 'BALCONIES' },   // rows 41-45
    { startRow: 49, endRow: 67, section: 'EXTERIOR' },     // rows 50-67
  ]

  // FILTER formula columns in Library:
  // AF=roofing_systems, AG=balconies_systems, AH=exterior_systems, AI=waterproofing_systems
  // AJ=roofing_bundle, AK=balconies_bundle, AL=exterior_bundle, AM=waterproofing_bundle
  // AN=roofing_standalone, AO=balconies_standalone, AP=exterior_standalone, AQ=waterproofing_standalone
  const SECTION_COLS = {
    'ROOFING': { systems: 'AF', bundle: 'AJ', standalone: 'AN' },
    'BALCONIES': { systems: 'AG', bundle: 'AK', standalone: 'AO' },
    'EXTERIOR': { systems: 'AH', bundle: 'AL', standalone: 'AP' },
    'WATERPROOFING': { systems: 'AI', bundle: 'AM', standalone: 'AQ' },
  }

  for (const sv of sectionValidations) {
    const cols = SECTION_COLS[sv.section]
    if (!cols) continue
    // Use custom formula validation that checks if value is in any of the 3 lists
    // Actually, Sheets API supports ONE_OF_RANGE for dropdown from a range
    // But FILTER formulas create variable-length lists. Use strict: false to allow custom values
    validationRequests.push({
      setDataValidation: {
        range: { sheetId: setupSheetId, startRowIndex: sv.startRow, endRowIndex: sv.endRow, startColumnIndex: 2, endColumnIndex: 3 },
        rule: {
          condition: {
            type: 'ONE_OF_RANGE',
            values: [{ userEnteredValue: `=Library!${cols.systems}$2:${cols.standalone}$100` }],
          },
          strict: false,
          showCustomUi: true,
        },
      },
    })
  }

  if (!DRY_RUN) {
    await sheetsApi(accessToken, 'POST', ':batchUpdate', { requests: validationRequests })
    console.log(`   Applied ${validationRequests.length} validation rules`)
  } else {
    console.log(`   [DRY RUN] Would apply ${validationRequests.length} validation rules`)
  }

  console.log('\n=== Setup Tab Created ===')
  console.log('Tasks completed:')
  console.log('  1A.1: Setup tab at index 0 ✓')
  console.log('  1A.2: Title row ✓')
  console.log('  1A.3: Project name row ✓')
  console.log('  1A.4: 4 sections mirrored ✓')
  console.log('  1A.5: Column A (item_id INDEX+MATCH) ✓')
  console.log('  1A.6: Column B (unit_cost INDEX+MATCH) ✓')
  console.log('  1A.7: Column C (display_name dropdown) ✓')
  console.log('  1A.8: Columns D-F (R, IN, TYPE editable) ✓')
  console.log('  1A.9: Columns G-M (location toggles) ✓')
  console.log('  1A.10: Conditional formatting (blue fill) ✓')
  console.log('  1A.11: Column N (UOM INDEX+MATCH) ✓')
  console.log('  1A.12: Column O (Bid Type dropdown) ✓')
  console.log('  1A.13: Column O conditional formatting (ALT orange) ✓')
  console.log('  1A.14: Column P (Tool Name INDEX+MATCH) ✓')
  console.log('  1A.15: Column Q (Tool Status formula) ✓')
  console.log('  1A.16: Column R (Location Count COUNTA) ✓')
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
