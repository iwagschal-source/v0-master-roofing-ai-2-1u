#!/usr/bin/env node
/**
 * Restore original Asana data and match PROPERLY
 */

import { createSign } from 'crypto'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SHEET_SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const BQ_SCOPES = ['https://www.googleapis.com/auth/bigquery']
const IMPERSONATE_USER = 'rfp@masterroofingus.com'
const SHEET_ID = '1MjSa5jVth8E1h4kVQ3uuRH-53-WwUquN04satOQ4ZU0'
const BQ_PROJECT = 'master-roofing-intelligence'
const GCP_KEY_FILE = '/home/iwagschal/aeyecorp/workspace-ingest.json'

// Original 105 projects from the sheet
const ORIGINAL_DATA = [
  ['Asana Project Name', 'Status', 'Last Modified', 'Action Needed'],
  ['1328 39th St', '(No Status)', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['904 E 98th', '(No Status)', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['91 East 111 Street', '(No Status)', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['1537 Vyse Ave buzzbid', '(No Status)', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['919 Freeman St', '(No Status)', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['927-931 41st Street', 'Status to be veified', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['1223 56th St', '(No Status)', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['184 Nostrand', 'Status to be veified', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['24-09 Jackson Avenue-Court Square', 'Status to be veified', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['173 Lexington Ave', 'Status to be veified', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['28 Havens Pl -Buzzbid', 'Status to be veified', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['68-72 Freeman Street', 'Status to be veified', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['94-09 & 94-11 148th Street', 'Status to be veified', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['1580 Story Avenue', 'Status to be veified', '2026-01-09', 'Add to HubSpot MR_ASANA'],
  ['918 Atlantic Ave', 'Status to be veified', '2026-01-08', 'Add to HubSpot MR_ASANA'],
  ['30-01 Northern Blvd', 'Status to be veified', '2026-01-08', 'Add to HubSpot MR_ASANA'],
  ['217 Bedford -', 'Status to be veified', '2026-01-08', 'Add to HubSpot MR_ASANA'],
  ['42-50 24th Street', 'Status to be veified', '2026-01-08', 'Add to HubSpot MR_ASANA'],
  ['230 West 54th Street', 'Status to be veified', '2026-01-08', 'Add to HubSpot MR_ASANA'],
  ['257 Kings HWY', 'Status to be veified', '2026-01-08', 'Add to HubSpot MR_ASANA'],
  ['Domino Refinery - Sugar House', 'Status to be veified', '2026-01-08', 'Add to HubSpot MR_ASANA'],
  ['1116-20 57th Street', 'Status to be veified', '2026-01-07', 'Add to HubSpot MR_ASANA'],
  ['141 Ross', 'Status to be veified', '2026-01-07', 'Add to HubSpot MR_ASANA'],
  ['2-72 Seagirt Blvd.', 'Status to be veified', '2026-01-07', 'Add to HubSpot MR_ASANA'],
  ['2102 Union St-Jacob', 'Status to be veified', '2026-01-06', 'Add to HubSpot MR_ASANA'],
  ['710 Driggs', '(No Status)', '2026-01-06', 'Add to HubSpot MR_ASANA'],
  ['500 W 218th Street-(5089-5099)-Roofing', '(No Status)', '2026-01-06', 'Add to HubSpot MR_ASANA'],
  ['2748 Jerome Ave', '(No Status)', '2026-01-06', 'Add to HubSpot MR_ASANA'],
  ['481 Dekalb Ave', '(No Status)', '2026-01-06', 'Add to HubSpot MR_ASANA'],
  ['460 Park Ave', 'Status to be veified', '2026-01-06', 'Add to HubSpot MR_ASANA'],
  ['350 West 38 St', 'Status to be veified', '2026-01-06', 'Add to HubSpot MR_ASANA'],
  ['404 Van Brunt St-  Buzzbid', 'Status to be veified', '2026-01-06', 'Add to HubSpot MR_ASANA'],
  ['2-26 Watjean Ct.', 'Status to be veified', '2026-01-06', 'Add to HubSpot MR_ASANA'],
  ['1217 Washington Avenue', '(No Status)', '2026-01-05', 'Add to HubSpot MR_ASANA'],
  ['22 MT Hope Pl', '(No Status)', '2026-01-05', 'Add to HubSpot MR_ASANA'],
  ['1643 50 St', 'Status to be veified', '2026-01-05', 'Add to HubSpot MR_ASANA'],
  ['613 Beach 9th St - Roofing & Waterproofing', 'Status to be veified', '2026-01-05', 'Add to HubSpot MR_ASANA'],
  ['Beach 29- 30th Street', 'Status to be veified', '2025-12-31', 'Add to HubSpot MR_ASANA'],
  ['82 Stockholm-Buzzbid', 'Status to be veified', '2025-12-31', 'Add to HubSpot MR_ASANA'],
  ['939 Bedford Ave', 'Status to be veified', '2025-12-31', 'Add to HubSpot MR_ASANA'],
  ['30-11 12th St', 'Status to be veified', '2025-12-31', 'Add to HubSpot MR_ASANA'],
  ['530 St Marks Ave - issac', 'Status to be veified', '2025-12-31', 'Add to HubSpot MR_ASANA'],
  ['1530 Bergen Street Shaya', 'Status to be veified', '2025-12-31', 'Add to HubSpot MR_ASANA'],
  ['312-318 Pearsall Ave Isaac - buzzbid with Jacob', 'Status to be veified', '2025-12-31', 'Add to HubSpot MR_ASANA'],
  ['103 E 26th St', 'Status to be veified', '2025-12-31', 'Add to HubSpot MR_ASANA'],
  ['899 Fulton St', 'Status to be veified', '2025-12-31', 'Add to HubSpot MR_ASANA'],
  ['11 Van Buran', 'Status to be veified', '2025-12-31', 'Add to HubSpot MR_ASANA'],
  ['219 Rockaway Ave', 'Status to be veified', '2025-12-30', 'Add to HubSpot MR_ASANA'],
  ['96 Ellery AKA 499 Marcy - Phase 1 and 2', 'Status to be veified', '2025-12-30', 'Add to HubSpot MR_ASANA'],
  ['590 Union Street', 'Status to be veified', '2025-12-30', 'Add to HubSpot MR_ASANA'],
  ['940-942 Woodycrest Ave', 'Status to be veified', '2025-12-30', 'Add to HubSpot MR_ASANA'],
  ['80-82 Vernon', 'Status to be veified', '2025-12-30', 'Add to HubSpot MR_ASANA'],
  ['570 crown - hanging', 'Status to be veified', '2025-12-29', 'Add to HubSpot MR_ASANA'],
  ['67 4th Ave', '(No Status)', '2025-12-24', 'Add to HubSpot MR_ASANA'],
  ['125 Ditmas Ave', '(No Status)', '2025-12-24', 'Add to HubSpot MR_ASANA'],
  ['558 Saint Johns Place', 'Status to be veified', '2025-12-24', 'Add to HubSpot MR_ASANA'],
  ['500 W 218th Street-(5089-5099)- (Panel)', 'Status to be veified', '2025-12-24', 'Add to HubSpot MR_ASANA'],
  ['1646 University', 'Status to be veified', '2025-12-24', 'Add to HubSpot MR_ASANA'],
  ['75 ross st - Credit update', '(No Status)', '2025-12-23', 'Add to HubSpot MR_ASANA'],
  ['1305 Rockaway Parkway', 'Status to be veified', '2025-12-23', 'Add to HubSpot MR_ASANA'],
  ['2833 Atlantic Ave/ AKA 2433 Atlantic -Shaya', 'Status to be veified', '2025-12-23', 'Add to HubSpot MR_ASANA'],
  ['1514-20 46 Street', 'Status to be veified', '2025-12-23', 'Add to HubSpot MR_ASANA'],
  ['2098 Creston Ave', 'Status to be veified', '2025-12-22', 'Add to HubSpot MR_ASANA'],
  ['1931-1935 Bedford jacob', 'Status to be veified', '2025-12-22', 'Add to HubSpot MR_ASANA'],
  ['38 - 40 Ralph Ave', 'Status to be veified', '2025-12-22', 'Add to HubSpot MR_ASANA'],
  ['307 Beach 67th St shaya', 'Status to be veified', '2025-12-22', 'Add to HubSpot MR_ASANA'],
  ['3-06 Beach 68th St', 'Status to be veified', '2025-12-22', 'Add to HubSpot MR_ASANA'],
  ['19 Gerry St', 'Status to be veified', '2025-12-22', 'Add to HubSpot MR_ASANA'],
  ['1477 3rd Avenue', 'Status to be veified', '2025-12-22', 'Add to HubSpot MR_ASANA'],
  ['213 East 83rd Street', 'Status to be veified', '2025-12-22', 'Add to HubSpot MR_ASANA'],
  ['159 Broadway', 'Status to be veified', '2025-12-22', 'Add to HubSpot MR_ASANA'],
  ['586 Schenectady Ave', 'Status to be veified', '2025-12-22', 'Add to HubSpot MR_ASANA'],
  ['11 Avenue A', 'Status to be veified', '2025-12-22', 'Add to HubSpot MR_ASANA'],
  ['3242 Riverdale Ave', 'Status to be veified', '2025-12-19', 'Add to HubSpot MR_ASANA'],
  ['496 East 134th Street', 'Status to be veified', '2025-12-18', 'Add to HubSpot MR_ASANA'],
  ['116 Warburton Ave - Studio 6 - zev wenger', 'Status to be veified', '2025-12-18', 'Add to HubSpot MR_ASANA'],
  ['22 Lorraine Street - Certified payroll and mwbe', 'Status to be veified', '2025-12-18', 'Add to HubSpot MR_ASANA'],
  ['89-26 162 Street- CityWide', 'Status to be veified', '2025-12-17', 'Add to HubSpot MR_ASANA'],
  ['1314 53rd St-Buzzbid', 'Status to be veified', '2025-12-15', 'Add to HubSpot MR_ASANA'],
  ['209 Butler Street', 'Status to be veified', '2025-12-15', 'Add to HubSpot MR_ASANA'],
  ['9290 West Bay Harbor', 'Status to be veified', '2025-12-15', 'Add to HubSpot MR_ASANA'],
  ['229 Shepherd & 240 Highland', 'Status to be veified', '2025-12-15', 'Add to HubSpot MR_ASANA'],
  ['267 Malcolm X Blvd', 'Status to be veified', '2025-12-15', 'Add to HubSpot MR_ASANA'],
  ['37 Garnet Street', 'Status to be veified', '2025-12-15', 'Add to HubSpot MR_ASANA'],
  ['18 W 116 Street', 'Status to be veified', '2025-12-15', 'Add to HubSpot MR_ASANA'],
  ['35 East 169th Street', 'Status to be veified', '2025-12-15', 'Add to HubSpot MR_ASANA'],
  ['512 park ave', 'Status to be veified', '2025-12-15', 'Add to HubSpot MR_ASANA'],
  ['623 East 178th St Shaya', 'Status to be veified', '2025-12-11', 'Add to HubSpot MR_ASANA'],
  ['230 East 48th St', 'Status to be veified', '2025-12-11', 'Add to HubSpot MR_ASANA'],
  ['195 W Houston', 'Status to be veified', '2025-12-11', 'Add to HubSpot MR_ASANA'],
  ['40-25 Crescent Street - jacob', 'Status to be veified', '2025-12-11', 'Add to HubSpot MR_ASANA'],
  ['5802- 5806 New Utrecht Ave Jacob', 'Status to be veified', '2025-12-11', 'Add to HubSpot MR_ASANA'],
  ['465 Arbuckle Ave- Royal and TFJ', 'Status to be veified', '2025-12-11', 'Add to HubSpot MR_ASANA'],
  ['393 Greene Ave', 'Status to be veified', '2025-12-11', 'Add to HubSpot MR_ASANA'],
  ['950 E 17th St - HH has Contact info', 'Status to be veified', '2025-12-11', 'Add to HubSpot MR_ASANA'],
  ['619 Grove St.', 'Status to be veified', '2025-12-02', 'Add to HubSpot MR_ASANA'],
  ['36 Bruckner Blvd- Budgeting', 'Status to be veified', '2025-12-02', 'Add to HubSpot MR_ASANA'],
  ['1060 Pacific Street', 'Status to be veified', '2025-12-01', 'Add to HubSpot MR_ASANA'],
  ['195 E 206th St', 'Status to be veified', '2025-11-24', 'Add to HubSpot MR_ASANA'],
  ['1428 55th Street', 'Status to be veified', '2025-11-19', 'Add to HubSpot MR_ASANA'],
  ['216 Ross Street', 'Status to be veified', '2025-11-14', 'Add to HubSpot MR_ASANA'],
  ['35 W 125th St', 'Status to be veified', '2025-11-11', 'Add to HubSpot MR_ASANA'],
  ['1718 Crotona Park East', 'Status to be veified', '2025-11-11', 'Add to HubSpot MR_ASANA'],
  ['1677 Eastburn Ave', 'Status to be veified', '2025-11-05', 'Add to HubSpot MR_ASANA'],
  ['1066 University', 'Status to be veified', '2025-11-03', 'Add to HubSpot MR_ASANA'],
];

async function getSheetToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: email, sub: IMPERSONATE_USER, scope: SHEET_SCOPES.join(' '), aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = encodedHeader + '.' + encodedPayload
  const sign = createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(privateKey, 'base64url')
  const jwt = signatureInput + '.' + signature
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function getBigQueryToken() {
  const keyFile = JSON.parse(readFileSync(GCP_KEY_FILE, 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: keyFile.client_email,
    scope: BQ_SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = encodedHeader + '.' + encodedPayload
  const sign = createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(keyFile.private_key, 'base64url')
  const jwt = signatureInput + '.' + signature
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function queryBigQuery(accessToken, sql) {
  const response = await fetch(
    `https://bigquery.googleapis.com/bigquery/v2/projects/${BQ_PROJECT}/queries`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sql, useLegacySql: false, maxResults: 5000 })
    }
  )
  return response.json()
}

async function clearSheet(accessToken, range) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:clear`,
    { method: 'POST', headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' } }
  )
}

async function writeToSheet(accessToken, range, values) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  )
  return response.json()
}

// Normalize address - remove annotations, lowercase, normalize spaces
function normalizeAddress(str) {
  return str.toLowerCase()
    .replace(/\s*-\s*(buzzbid|jacob|shaya|isaac|issac|roofing|waterproofing|credit update|hanging|panel|budgeting|certified payroll|mwbe|studio|phase|zev|citywide|hh has|royal|tfj|aka\s+.*).*$/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract street number (handles ranges like 927-931)
function extractNumber(str) {
  const match = str.match(/^(\d+)/);
  return match ? match[1] : null;
}

// Extract full street name after the street number
function extractStreetName(str) {
  const norm = normalizeAddress(str);
  // Match: leading numbers (address number), then capture the rest (street name)
  // But preserve numbered street names like "12th", "29th", etc.
  // Pattern: one or more groups of digits followed by spaces, then the actual street name
  const match = norm.match(/^(\d+(?:\s+\d+)*)\s+(.+)$/);
  if (match) {
    return match[2].trim();
  }
  return norm;
}

// STRICT matching - requires same number AND same street name
function isStrictMatch(asanaName, bqName) {
  const asanaNorm = normalizeAddress(asanaName);
  const bqNorm = normalizeAddress(bqName);

  // Exact match after normalization
  if (asanaNorm === bqNorm) return true;

  const asanaNum = extractNumber(asanaNorm);
  const bqNum = extractNumber(bqNorm);

  // Must have numbers
  if (!asanaNum || !bqNum) return false;

  // Numbers must match exactly
  if (asanaNum !== bqNum) return false;

  // Get street names
  const asanaStreet = extractStreetName(asanaName);
  const bqStreet = extractStreetName(bqName);

  if (!asanaStreet || !bqStreet) return false;

  // Normalize street suffix abbreviations
  function normalizeStreetName(s) {
    return s
      .replace(/\b(street|str)\b/g, 'st')
      .replace(/\b(avenue)\b/g, 'ave')
      .replace(/\b(boulevard)\b/g, 'blvd')
      .replace(/\b(place)\b/g, 'pl')
      .replace(/\b(drive)\b/g, 'dr')
      .replace(/\b(road)\b/g, 'rd')
      .replace(/\b(court)\b/g, 'ct')
      .replace(/\b(east)\b/g, 'e')
      .replace(/\b(west)\b/g, 'w')
      .replace(/\b(north)\b/g, 'n')
      .replace(/\b(south)\b/g, 's')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const asanaStreetNorm = normalizeStreetName(asanaStreet);
  const bqStreetNorm = normalizeStreetName(bqStreet);

  // Extract the core street identifier (first word, which for numbered streets is "12th", "29th", etc.)
  const asanaCore = asanaStreetNorm.split(' ')[0];
  const bqCore = bqStreetNorm.split(' ')[0];

  // Core identifiers must match (this catches "12th" vs "29th" mismatch)
  if (asanaCore !== bqCore) return false;

  // Must be exact match after normalization, or one is a prefix of the other
  if (asanaStreetNorm === bqStreetNorm) return true;

  // Allow "bedford" to match "bedford ave" but NOT "bedford" to match "bedford park"
  // Only allow if remaining part is just a street suffix
  const suffixes = ['st', 'ave', 'blvd', 'pl', 'dr', 'rd', 'ct', 'hwy', 'pkwy'];

  if (asanaStreetNorm.startsWith(bqCore)) {
    const remainder = asanaStreetNorm.slice(bqCore.length).trim();
    if (remainder === '' || suffixes.includes(remainder)) return true;
  }

  if (bqStreetNorm.startsWith(asanaCore)) {
    const remainder = bqStreetNorm.slice(asanaCore.length).trim();
    if (remainder === '' || suffixes.includes(remainder)) return true;
  }

  return false;
}

async function main() {
  console.log('=== Restore and Properly Match ===\n')

  // Step 1: Get BigQuery projects
  console.log('1. Querying BigQuery project_master...')
  const bqToken = await getBigQueryToken()
  const bqResult = await queryBigQuery(bqToken, `
    SELECT observed_key as project_name
    FROM \`master-roofing-intelligence.mr_agent.project_master\`
  `)

  if (bqResult.error) {
    console.error('BigQuery error:', bqResult.error.message)
    return
  }

  const bqProjects = bqResult.rows ? bqResult.rows.map(r => r.f[0].v) : []
  console.log(`   Found ${bqProjects.length} projects in project_master\n`)

  // Step 2: Match with STRICT logic
  console.log('2. Matching with STRICT logic...\n')

  const header = ORIGINAL_DATA[0]
  const asanaRows = ORIGINAL_DATA.slice(1)

  const matched = []
  const notMatched = []

  for (const row of asanaRows) {
    const asanaName = row[0]
    let foundMatch = null

    for (const bqName of bqProjects) {
      if (isStrictMatch(asanaName, bqName)) {
        foundMatch = bqName
        break
      }
    }

    if (foundMatch) {
      matched.push({ asana: asanaName, bq: foundMatch, row })
    } else {
      notMatched.push(row)
    }
  }

  console.log(`   Total Asana projects: ${asanaRows.length}`)
  console.log(`   Matched in project_master: ${matched.length}`)
  console.log(`   NOT in project_master: ${notMatched.length}\n`)

  // Step 3: Show all matches for verification
  console.log('=== MATCHED (verify these are correct) ===\n')
  matched.forEach(m => {
    console.log(`  ✓ "${m.asana}"`)
    console.log(`    → "${m.bq}"`)
  })

  console.log('\n=== NOT MATCHED (will remain in sheet) ===\n')
  notMatched.forEach(row => {
    console.log(`  ✗ ${row[0]}`)
  })

  // Step 4: Update sheet
  console.log('\n3. Updating sheet with unmatched projects only...')
  const sheetToken = await getSheetToken()

  await clearSheet(sheetToken, "'In Asana Not HubSpot'!A1:D200")

  const newData = [header, ...notMatched]
  const result = await writeToSheet(sheetToken, "'In Asana Not HubSpot'!A1", newData)

  console.log(`   Updated ${result.updatedRows} rows\n`)

  console.log('=== FINAL SUMMARY ===')
  console.log(`Original: 105 projects`)
  console.log(`Matched to project_master: ${matched.length}`)
  console.log(`Remaining in sheet: ${notMatched.length}`)
  console.log(`\nSheet: https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`)
}

main().catch(console.error)
