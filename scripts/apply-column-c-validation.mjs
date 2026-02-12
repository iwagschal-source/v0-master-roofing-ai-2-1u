#!/usr/bin/env node
/**
 * Apply Column C Data Validation (Dropdowns) to Template
 *
 * Applies ONE_OF_RANGE data validation to column C of every item row on the
 * takeoff template. Dropdown source lists come from FILTER formulas on the
 * Library tab (AF-AQ).
 *
 * Three dropdown types per section:
 *   - System rows → is_system=TRUE items (Library AF-AI)
 *   - Component rows (inside bundle) → can_bundle=TRUE items (Library AJ-AM)
 *   - Standalone rows (outside bundle) → can_standalone=TRUE items (Library AN-AQ)
 *
 * All dropdowns use strict=false (allows custom values).
 *
 * Usage:
 *   node scripts/apply-column-c-validation.mjs [--dry-run]
 */

import { createSign } from 'crypto'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  if (!process.env[key]) process.env[key] = value
}

const TEMPLATE_ID = '1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4'
const TAKEOFF_TAB_NAME = 'DATE'
const DRY_RUN = process.argv.includes('--dry-run')

// ── Row classification ──────────────────────────────────────────────────
// Each item row is classified as system/component/standalone for its section.
// Classification based on: (a) bundle zone position, (b) is_system flag.
//
// FILTER formula columns on Library tab (row 2 has the FILTER, spills down):
//   AF: roofing_systems      AG: balconies_systems    AH: exterior_systems    AI: waterproofing_systems
//   AJ: roofing_bundle       AK: balconies_bundle     AL: exterior_bundle     AM: waterproofing_bundle
//   AN: roofing_standalone   AO: balconies_standalone  AP: exterior_standalone  AQ: waterproofing_standalone

// Validation range column letters for each section × type
const VAL_COLUMNS = {
  ROOFING:        { system: 'AF', component: 'AJ', standalone: 'AN' },
  BALCONIES:      { system: 'AG', component: 'AK', standalone: 'AO' },
  EXTERIOR:       { system: 'AH', component: 'AL', standalone: 'AP' },
  WATERPROOFING:  { system: 'AI', component: 'AM', standalone: 'AQ' },
}

// Every item row on the template with its section and type
// Type determined by: bundle zone position + is_system flag from BigQuery
const ROW_MAP = [
  // ── ROOFING: Bundle 1 (rows 4-13, total=14) ──
  { row: 4,  section: 'ROOFING', type: 'component' },  // MR-001VB (is_system=FALSE)
  { row: 5,  section: 'ROOFING', type: 'component' },  // MR-002PITCH
  { row: 6,  section: 'ROOFING', type: 'system' },      // MR-003BU2PLY (is_system=TRUE)
  { row: 7,  section: 'ROOFING', type: 'component' },  // MR-004UO
  { row: 8,  section: 'ROOFING', type: 'component' },  // MR-010DRAIN
  { row: 9,  section: 'ROOFING', type: 'component' },  // MR-011DOORSTD
  { row: 10, section: 'ROOFING', type: 'component' },  // MR-017RAIL
  { row: 11, section: 'ROOFING', type: 'component' },  // MR-018PLUMB
  { row: 12, section: 'ROOFING', type: 'component' },  // MR-019MECH
  { row: 13, section: 'ROOFING', type: 'component' },  // MR-021AC
  // ── ROOFING: Bundle 2 (rows 15-20, total=21) ──
  { row: 15, section: 'ROOFING', type: 'system' },      // MR-006IRMA (is_system=TRUE)
  { row: 16, section: 'ROOFING', type: 'component' },  // MR-007PMMA
  { row: 17, section: 'ROOFING', type: 'component' },  // MR-008PMMA
  { row: 18, section: 'ROOFING', type: 'component' },  // MR-009UOPMMA
  { row: 19, section: 'ROOFING', type: 'component' },  // MR-011DOORSTD (dup in B2)
  { row: 20, section: 'ROOFING', type: 'component' },  // MR-010DRAIN (dup in B2)
  // ── ROOFING: Coping bundle (rows 22-24, total=25) ──
  { row: 22, section: 'ROOFING', type: 'system' },      // MR-022COPELO (is_system=TRUE)
  { row: 23, section: 'ROOFING', type: 'system' },      // MR-023COPEHI (is_system=TRUE)
  { row: 24, section: 'ROOFING', type: 'component' },  // MR-024INSUCOPE
  // ── ROOFING: Flashing bundle (rows 26-27, total=28) ──
  { row: 26, section: 'ROOFING', type: 'system' },      // MR-025FLASHBLDG (is_system=TRUE)
  { row: 27, section: 'ROOFING', type: 'system' },      // MR-026FLASHPAR (is_system=TRUE)
  // ── ROOFING: Paver/IRMA bundle (rows 29-31, total=32) ──
  { row: 29, section: 'ROOFING', type: 'system' },      // MR-027OBIRMA (is_system=TRUE)
  { row: 30, section: 'ROOFING', type: 'system' },      // MR-028PAVER (is_system=TRUE)
  { row: 31, section: 'ROOFING', type: 'component' },  // MR-029FLASHPAV
  // ── ROOFING: Green Roof bundle (rows 33-34, total=35) ──
  { row: 33, section: 'ROOFING', type: 'system' },      // MR-030GREEN (is_system=TRUE)
  { row: 34, section: 'ROOFING', type: 'component' },  // MR-031FLASHGRN

  // ── WATERPROOFING: all standalone (rows 37-39) ──
  { row: 37, section: 'WATERPROOFING', type: 'standalone' },  // MR-032RECESSWP
  { row: 38, section: 'WATERPROOFING', type: 'standalone' },  // MR-FIRE-LIQ
  { row: 39, section: 'WATERPROOFING', type: 'standalone' },  // MR-THORO

  // ── BALCONIES: one bundle (rows 41-44, total=45) ──
  { row: 41, section: 'BALCONIES', type: 'system' },      // MR-033TRAFFIC (is_system=TRUE)
  { row: 42, section: 'BALCONIES', type: 'component' },  // MR-034DRIP
  { row: 43, section: 'BALCONIES', type: 'component' },  // MR-036DOORBAL
  { row: 44, section: 'BALCONIES', type: 'component' },  // MR-035LFLASH

  // ── EXTERIOR: Brickwp bundle (rows 50-52, total=53) ──
  { row: 50, section: 'EXTERIOR', type: 'system' },      // MR-037BRICKWP (is_system=TRUE)
  { row: 51, section: 'EXTERIOR', type: 'component' },  // MR-038OPNBRKEA
  { row: 52, section: 'EXTERIOR', type: 'component' },  // MR-039OPNBRKLF
  // ── EXTERIOR: Panelwp bundle (rows 54-56, total=57) ──
  { row: 54, section: 'EXTERIOR', type: 'system' },      // MR-040PANELWP (is_system=TRUE)
  { row: 55, section: 'EXTERIOR', type: 'component' },  // MR-041OPNPNLEA
  { row: 56, section: 'EXTERIOR', type: 'component' },  // MR-042OPNPNLLF
  // ── EXTERIOR: EIFS bundle (rows 58-61, total=62) ──
  { row: 58, section: 'EXTERIOR', type: 'system' },      // MR-043EIFS (is_system=TRUE)
  { row: 59, section: 'EXTERIOR', type: 'component' },  // MR-044OPNSTCEA
  { row: 60, section: 'EXTERIOR', type: 'component' },  // MR-045OPNSTCLF
  { row: 61, section: 'EXTERIOR', type: 'component' },  // MR-046STUCCO
  // ── EXTERIOR: standalones (rows 63-67) ──
  { row: 63, section: 'EXTERIOR', type: 'standalone' },  // MR-047DRIPCAP
  { row: 64, section: 'EXTERIOR', type: 'standalone' },  // MR-048SILL
  { row: 65, section: 'EXTERIOR', type: 'standalone' },  // MR-049TIEIN
  { row: 66, section: 'EXTERIOR', type: 'standalone' },  // MR-050ADJHORZ
  { row: 67, section: 'EXTERIOR', type: 'standalone' },  // MR-051ADJVERT
]

// ── Auth ──────────────────────────────────────────────────────────────────

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !privateKey) throw new Error('Missing Google credentials in .env.local')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: email, sub: 'rfp@masterroofingus.com',
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const sign = createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(privateKey, 'base64url')
  const jwt = `${signatureInput}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  if (!res.ok) throw new Error(`Token error: ${await res.text()}`)
  return (await res.json()).access_token
}

async function sheetsApi(accessToken, method, endpoint, body = null) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}${endpoint}`
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  if (!res.ok) throw new Error(`Sheets API ${method} ${endpoint} failed (${res.status}): ${await res.text()}`)
  return res.json()
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Apply Column C Data Validation ===')
  console.log(`Template: ${TEMPLATE_ID}`)
  console.log(`Dry run: ${DRY_RUN}`)
  console.log(`Total item rows: ${ROW_MAP.length}`)

  // Summarize by type
  const typeCounts = {}
  for (const { type } of ROW_MAP) typeCounts[type] = (typeCounts[type] || 0) + 1
  console.log(`Types: ${JSON.stringify(typeCounts)}`)

  const accessToken = await getAccessToken()
  console.log('Authenticated.')

  // Get sheetId for the DATE (takeoff) tab
  const spreadsheet = await sheetsApi(accessToken, 'GET', '?fields=sheets.properties')
  const dateTab = spreadsheet.sheets.find(s => s.properties.title === TAKEOFF_TAB_NAME)
  if (!dateTab) throw new Error(`Tab "${TAKEOFF_TAB_NAME}" not found in template`)
  const sheetId = dateTab.properties.sheetId
  console.log(`DATE tab sheetId: ${sheetId}`)

  // Group consecutive rows with same section+type into ranges for efficiency
  const groups = []
  let current = null
  for (const entry of ROW_MAP) {
    const key = `${entry.section}|${entry.type}`
    if (current && current.key === key && entry.row === current.endRow + 1) {
      current.endRow = entry.row
    } else {
      if (current) groups.push(current)
      current = { key, section: entry.section, type: entry.type, startRow: entry.row, endRow: entry.row }
    }
  }
  if (current) groups.push(current)

  console.log(`\nGrouped into ${groups.length} validation ranges:`)

  // Build setDataValidation requests
  const requests = []
  for (const group of groups) {
    const col = VAL_COLUMNS[group.section][group.type]
    // Reference: Library!$COL$2:$COL$100 (generous range for FILTER spill)
    const rangeRef = `=Library!$${col}$2:$${col}$100`
    const rowLabel = group.startRow === group.endRow
      ? `row ${group.startRow}`
      : `rows ${group.startRow}-${group.endRow}`

    console.log(`  ${group.section} ${group.type} ${rowLabel} → ${col}`)

    requests.push({
      setDataValidation: {
        range: {
          sheetId,
          startRowIndex: group.startRow - 1,  // 0-indexed
          endRowIndex: group.endRow,           // exclusive
          startColumnIndex: 2,                 // Column C
          endColumnIndex: 3,                   // exclusive
        },
        rule: {
          condition: {
            type: 'ONE_OF_RANGE',
            values: [{ userEnteredValue: rangeRef }],
          },
          strict: false,
          showCustomUi: true,
        },
      },
    })
  }

  console.log(`\nTotal batchUpdate requests: ${requests.length}`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN] Would apply data validation. Exiting.')
    return
  }

  // Apply all validation in one batchUpdate
  console.log('\nApplying data validation...')
  await sheetsApi(accessToken, 'POST', ':batchUpdate', { requests })
  console.log('Done! Data validation applied to all item rows on column C.')

  // Verify by reading back a sample
  console.log('\nVerifying (reading DATE!C4 and DATE!C6 validation)...')
  const verify = await sheetsApi(accessToken, 'GET',
    `?fields=sheets(properties,data.rowData.values.dataValidation)&ranges=DATE!C4:C6`
  )
  const rows = verify.sheets?.[0]?.data?.[0]?.rowData || []
  for (let i = 0; i < rows.length; i++) {
    const dv = rows[i]?.values?.[0]?.dataValidation
    if (dv) {
      console.log(`  Row ${4 + i}: ${dv.condition?.type} → ${dv.condition?.values?.[0]?.userEnteredValue} (strict=${dv.strict})`)
    }
  }

  console.log('\n=== Done ===')
}

main().catch(err => {
  console.error('FATAL:', err.message)
  process.exit(1)
})
