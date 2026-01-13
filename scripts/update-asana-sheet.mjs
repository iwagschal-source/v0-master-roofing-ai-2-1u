#!/usr/bin/env node
/**
 * Update "In Asana Not HubSpot" sheet with only projects missing from project_master
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

async function readSheet(accessToken) {
  const range = encodeURIComponent("In Asana Not HubSpot!A1:D200")
  const response = await fetch(
    'https://sheets.googleapis.com/v4/spreadsheets/' + SHEET_ID + '/values/' + range,
    { headers: { 'Authorization': 'Bearer ' + accessToken } }
  )
  const data = await response.json()
  return data.values || []
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
      body: JSON.stringify({
        query: sql,
        useLegacySql: false,
        maxResults: 5000
      })
    }
  )
  return response.json()
}

async function clearSheet(accessToken, range) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:clear`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
    }
  )
  return response.json()
}

async function writeToSheet(accessToken, range, values) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  )
  return response.json()
}

// Normalize for matching
function normalize(str) {
  return str.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if two addresses match - STRICT matching only
function isRealMatch(asanaName, bqName) {
  const asanaNorm = normalize(asanaName);
  const bqNorm = normalize(bqName);

  // Exact match
  if (asanaNorm === bqNorm) return true;

  // Extract street numbers
  const asanaNumMatch = asanaNorm.match(/^(\d+)/);
  const bqNumMatch = bqNorm.match(/^(\d+)/);

  if (!asanaNumMatch || !bqNumMatch) return false;

  const asanaNum = asanaNumMatch[1];
  const bqNum = bqNumMatch[1];

  // Numbers must match exactly (or be within same range for hyphenated addresses)
  if (asanaNum !== bqNum) {
    // Check for range matches like "927-931" matching "927 931"
    const asanaRangeMatch = asanaNorm.match(/^(\d+)\s*(\d+)?/);
    const bqRangeMatch = bqNorm.match(/^(\d+)\s*(\d+)?/);
    if (asanaRangeMatch && bqRangeMatch) {
      if (asanaRangeMatch[1] !== bqRangeMatch[1]) return false;
    } else {
      return false;
    }
  }

  // Extract street names (first significant word after number)
  const asanaStreet = asanaNorm.replace(/^\d+[\s\d]*/, '').trim().split(/\s+/)[0];
  const bqStreet = bqNorm.replace(/^\d+[\s\d]*/, '').trim().split(/\s+/)[0];

  // Street names must match
  if (!asanaStreet || !bqStreet) return false;
  if (asanaStreet !== bqStreet &&
      !asanaStreet.startsWith(bqStreet) &&
      !bqStreet.startsWith(asanaStreet)) {
    return false;
  }

  return true;
}

async function main() {
  console.log('=== Updating "In Asana Not HubSpot" Sheet ===\n')

  // Step 1: Read current sheet data
  console.log('1. Reading current sheet data...')
  const sheetToken = await getSheetToken()
  const sheetData = await readSheet(sheetToken)

  const header = sheetData[0]
  const asanaRows = sheetData.slice(1)
  console.log(`   Found ${asanaRows.length} Asana projects\n`)

  // Step 2: Get BigQuery project_master
  console.log('2. Querying BigQuery project_master...')
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

  // Step 3: Filter - keep only projects NOT in project_master (strict matching)
  console.log('3. Finding projects NOT in project_master (strict matching)...\n')

  const notInProjectMaster = []
  const inProjectMaster = []

  for (const row of asanaRows) {
    const asanaName = row[0]
    let foundMatch = false

    for (const bqName of bqProjects) {
      if (isRealMatch(asanaName, bqName)) {
        foundMatch = true
        inProjectMaster.push({ asana: asanaName, bq: bqName })
        break
      }
    }

    if (!foundMatch) {
      notInProjectMaster.push(row)
    }
  }

  console.log(`   In project_master: ${inProjectMaster.length}`)
  console.log(`   NOT in project_master: ${notInProjectMaster.length}\n`)

  // Step 4: Update sheet with only missing projects
  console.log('4. Updating sheet...')

  // Clear existing data
  await clearSheet(sheetToken, "'In Asana Not HubSpot'!A1:D200")

  // Write header + filtered data
  const newData = [header, ...notInProjectMaster]
  const result = await writeToSheet(sheetToken, "'In Asana Not HubSpot'!A1", newData)

  console.log(`   Updated ${result.updatedRows} rows\n`)

  // Summary
  console.log('=== SUMMARY ===')
  console.log(`Original projects: ${asanaRows.length}`)
  console.log(`Matched to project_master: ${inProjectMaster.length}`)
  console.log(`Remaining (not in project_master): ${notInProjectMaster.length}`)
  console.log(`\nSheet URL: https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`)

  console.log('\n--- Projects REMOVED (now in project_master) ---')
  inProjectMaster.forEach(m => {
    console.log(`  ✓ ${m.asana} → ${m.bq}`)
  })

  console.log('\n--- Projects REMAINING (not in project_master) ---')
  notInProjectMaster.forEach(row => {
    console.log(`  ✗ ${row[0]}`)
  })
}

main().catch(console.error)
