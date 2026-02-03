#!/usr/bin/env node
/**
 * Debug Monday import - shows exact comparison values
 */

const { readSheetValues } = require('../lib/google-sheets.js')

const SPREADSHEET_ID = '1MmF_trhCwHzEuSt9hcL1YgG2SaY3a1svndIUvl4IP3w'
const SHEET_NAME = 'DATE'

// CSV subjects from new_monday.csv
const CSV_SUBJECTS = [
  'MR-031FLASHGRN | STAIR BULKHEAD',
  'MR-012DOORLG | 2ND FLOOR',
  'MR-002PITCH | 4TH FLOOR',
  'MR-003BU2PLY | STAIR BULKHEAD'
]

function buildLocationMapFromHeader(headerRow) {
  const locationMap = {}
  const locationCols = ['G', 'H', 'I', 'J', 'K', 'L']

  for (let i = 0; i < locationCols.length; i++) {
    const headerIdx = 6 + i
    const headerValue = headerRow[headerIdx]?.toString().trim().toUpperCase() || ''

    if (headerValue) {
      locationMap[headerValue] = locationCols[i]
      const normalized = headerValue.replace(/[^A-Z0-9]/g, '')
      if (normalized !== headerValue) {
        locationMap[normalized] = locationCols[i]
      }
    }
  }
  return locationMap
}

async function main() {
  console.log('=== MONDAY IMPORT DEBUG ===\n')

  // Read sheet headers
  console.log('1. SHEET HEADERS (Row 3, columns G-L):')
  const roofingHeader = await readSheetValues(SPREADSHEET_ID, `'${SHEET_NAME}'!A3:L3`)
  console.log('   Raw row 3:', JSON.stringify(roofingHeader[0]))
  console.log('   G-L only:', JSON.stringify(roofingHeader[0]?.slice(6)))

  // Build location map
  const locationMap = buildLocationMapFromHeader(roofingHeader[0] || [])
  console.log('\n2. LOCATION MAP (what fillBluebeamData uses):')
  for (const [key, col] of Object.entries(locationMap)) {
    console.log(`   "${key}" → column ${col}`)
  }

  // Parse CSV and show matching
  console.log('\n3. CSV PARSING & MATCHING:')
  for (const subject of CSV_SUBJECTS) {
    console.log(`\n   CSV Subject: "${subject}"`)

    if (subject.includes(' | ')) {
      const [itemCode, location] = subject.split(' | ').map(s => s.trim())
      console.log(`   → item_code: "${itemCode}"`)
      console.log(`   → location: "${location}"`)

      const upperLocation = location.toUpperCase()
      console.log(`   → upperLocation: "${upperLocation}"`)

      const col = locationMap[upperLocation]
      console.log(`   → locationMap["${upperLocation}"]: ${col || 'NOT FOUND'}`)

      if (!col) {
        const normalized = upperLocation.replace(/[^A-Z0-9]/g, '')
        console.log(`   → normalized: "${normalized}"`)
        console.log(`   → locationMap["${normalized}"]: ${locationMap[normalized] || 'NOT FOUND'}`)
      }
    }
  }

  console.log('\n=== END DEBUG ===')
}

main().catch(console.error)
