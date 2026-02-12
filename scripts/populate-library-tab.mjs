#!/usr/bin/env node
/**
 * Populate Library Tab in Template Spreadsheet
 *
 * Adds a "Library" sheet tab to the takeoff template and writes all 80 items
 * from v_library_complete as a static fallback dataset.
 *
 * Usage:
 *   node scripts/populate-library-tab.mjs [--dry-run]
 *
 * Requires: .env.local with GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY
 */

import { createSign } from 'crypto'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load .env.local manually (no dotenv dependency)
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eqIdx = trimmed.indexOf('=')
  if (eqIdx === -1) continue
  const key = trimmed.slice(0, eqIdx).trim()
  let value = trimmed.slice(eqIdx + 1).trim()
  // Strip surrounding quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  if (!process.env[key]) process.env[key] = value
}

const TEMPLATE_ID = '1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4'
const LIBRARY_TAB_NAME = 'Library'
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
]
const IMPERSONATE_USER = 'rfp@masterroofingus.com'
const DRY_RUN = process.argv.includes('--dry-run')

// Column order for the Library tab header
const COLUMNS = [
  'item_id', 'section', 'display_name', 'scope_name',
  'unit_cost', 'default_rate', 'uom', 'row_type',
  'is_system', 'can_standalone', 'can_bundle', 'parent_item_id',
  'system_heading', 'paragraph_description', 'bundle_fragment', 'standalone_description',
  'fragment_sort_order', 'bundling_notes', 'description_status',
  'has_bluebeam_tool', 'has_template_row', 'has_scope_mapping',
  'has_historical_data', 'has_rate', 'has_r_value', 'has_material_type',
  'has_thickness', 'historical_project_count', 'readiness_score', 'notes',
]

// Map from BQ field names to our column names
const FIELD_MAP = {
  'template_unit_cost': 'unit_cost',
  'template_has_thickness': 'has_thickness',
  'template_notes': 'notes',
}

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !privateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY in .env.local')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: email,
    sub: IMPERSONATE_USER,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  const sign = createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(privateKey, 'base64url')

  const jwt = `${signatureInput}.${signature}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    throw new Error(`Token error: ${error}`)
  }

  return (await tokenResponse.json()).access_token
}

function loadData() {
  const dataFile = JSON.parse(readFileSync('/tmp/library_data.json', 'utf-8'))
  const descFile = JSON.parse(readFileSync('/tmp/library_descriptions.json', 'utf-8'))

  // Build description lookup by item_id
  const descMap = {}
  for (const d of descFile) {
    descMap[d.item_id] = d
  }

  // Merge data + descriptions, sorted by section then display_name
  const merged = dataFile.map(item => {
    const desc = descMap[item.item_id] || {}
    return { ...item, ...desc }
  })

  // Sort by section order, then display_name alphabetically
  const sectionOrder = { BALCONIES: 0, EXTERIOR: 1, ROOFING: 2, WATERPROOFING: 3 }
  merged.sort((a, b) => {
    const sa = sectionOrder[a.section] ?? 99
    const sb = sectionOrder[b.section] ?? 99
    if (sa !== sb) return sa - sb
    return (a.display_name || '').localeCompare(b.display_name || '')
  })

  return merged
}

function itemToRow(item) {
  return COLUMNS.map(col => {
    // Map BQ field names to column names
    const bqField = Object.entries(FIELD_MAP).find(([_, v]) => v === col)?.[0]
    const value = item[col] ?? (bqField ? item[bqField] : null)

    if (value === null || value === undefined || value === '') return ''

    // Convert booleans
    if (value === 'true') return 'TRUE'
    if (value === 'false') return 'FALSE'

    // Convert numeric strings
    if (col === 'unit_cost' || col === 'default_rate' || col === 'fragment_sort_order' ||
        col === 'historical_project_count' || col === 'readiness_score') {
      const num = Number(value)
      if (!isNaN(num)) return num
    }

    return value
  })
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

async function main() {
  console.log('=== Populate Library Tab ===')
  console.log(`Template: ${TEMPLATE_ID}`)
  console.log(`Dry run: ${DRY_RUN}`)

  // 1. Load and merge data
  console.log('\n1. Loading data from /tmp/library_data.json + /tmp/library_descriptions.json...')
  const items = loadData()
  console.log(`   Loaded ${items.length} items`)

  // Show section breakdown
  const sectionCounts = {}
  for (const item of items) {
    sectionCounts[item.section] = (sectionCounts[item.section] || 0) + 1
  }
  console.log('   Sections:', JSON.stringify(sectionCounts))

  // 2. Get access token
  console.log('\n2. Authenticating...')
  const accessToken = await getAccessToken()
  console.log('   Got access token')

  // 3. Check if Library tab already exists
  console.log('\n3. Checking for existing Library tab...')
  const spreadsheet = await sheetsApi(accessToken, 'GET', '?fields=sheets.properties')
  const existingTab = spreadsheet.sheets.find(s => s.properties.title === LIBRARY_TAB_NAME)

  if (existingTab) {
    console.log(`   Library tab already exists (sheetId: ${existingTab.properties.sheetId})`)
    console.log('   Will clear and repopulate.')
    if (!DRY_RUN) {
      // Clear existing content
      await sheetsApi(accessToken, 'POST', '/values/Library!A:AD:clear', {})
      console.log('   Cleared existing content')
    }
  } else {
    console.log('   Library tab does not exist — creating...')
    if (!DRY_RUN) {
      await sheetsApi(accessToken, 'POST', ':batchUpdate', {
        requests: [{
          addSheet: {
            properties: {
              title: LIBRARY_TAB_NAME,
              index: 1, // Second tab (after Takeoff)
            }
          }
        }]
      })
      console.log('   Created Library tab')
    }
  }

  // 4. Build rows: header + data
  console.log('\n4. Building rows...')
  const headerRow = COLUMNS
  const dataRows = items.map(itemToRow)
  const allRows = [headerRow, ...dataRows]
  console.log(`   Header: ${COLUMNS.length} columns`)
  console.log(`   Data: ${dataRows.length} rows`)
  console.log(`   Total: ${allRows.length} rows (header + data)`)

  // Show first data row as sanity check
  console.log('\n   Sample row (first item):')
  console.log(`   item_id: ${dataRows[0][0]}`)
  console.log(`   section: ${dataRows[0][1]}`)
  console.log(`   display_name: ${dataRows[0][2]}`)
  console.log(`   unit_cost: ${dataRows[0][4]}`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would write rows to Library tab. Exiting.')
    return
  }

  // 5. Write all data in one batch
  console.log('\n5. Writing data to Library tab...')
  await sheetsApi(accessToken, 'PUT',
    `/values/Library!A1:AD${allRows.length}?valueInputOption=RAW`,
    { values: allRows }
  )
  console.log(`   Wrote ${allRows.length} rows x ${COLUMNS.length} columns`)

  // 6. Format: bold header, freeze row 1, auto-resize columns
  console.log('\n6. Formatting...')

  // Get the sheetId for the Library tab
  const updated = await sheetsApi(accessToken, 'GET', '?fields=sheets.properties')
  const libraryTab = updated.sheets.find(s => s.properties.title === LIBRARY_TAB_NAME)
  const sheetId = libraryTab.properties.sheetId

  await sheetsApi(accessToken, 'POST', ':batchUpdate', {
    requests: [
      // Bold header row
      {
        repeatCell: {
          range: {
            sheetId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: COLUMNS.length,
          },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
            }
          },
          fields: 'userEnteredFormat(textFormat,backgroundColor)',
        }
      },
      // Freeze row 1
      {
        updateSheetProperties: {
          properties: {
            sheetId,
            gridProperties: { frozenRowCount: 1 },
          },
          fields: 'gridProperties.frozenRowCount',
        }
      },
      // Auto-resize first 12 columns (the important ones)
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 12,
          }
        }
      },
    ]
  })
  console.log('   Applied: bold header, frozen row 1, auto-resized columns A-L')

  console.log('\n=== Done ===')
  console.log(`Library tab populated with ${items.length} items in template ${TEMPLATE_ID}`)
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
