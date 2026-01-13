#!/usr/bin/env node
/**
 * Check Asana projects against BigQuery - more thorough matching
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
  const range = encodeURIComponent("In Asana Not HubSpot!A2:A200")
  const response = await fetch(
    'https://sheets.googleapis.com/v4/spreadsheets/' + SHEET_ID + '/values/' + range,
    { headers: { 'Authorization': 'Bearer ' + accessToken } }
  )
  const data = await response.json()
  return data.values ? data.values.map(row => row[0]) : []
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

// Extract street number from address
function extractStreetNumber(str) {
  const match = str.match(/^(\d+[\-\d]*)/);
  return match ? match[1] : null;
}

// Normalize for matching
function normalize(str) {
  return str.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .replace(/\s+/g, ' ')       // Collapse whitespace
    .trim();
}

// Extract key address components
function extractAddressKey(str) {
  const normalized = normalize(str);
  // Remove common suffixes/annotations
  const cleaned = normalized
    .replace(/\s*(buzzbid|jacob|shaya|isaac|issac|roofing|waterproofing|credit update|hanging|panel|budgeting|certified payroll|mwbe|studio|phase|zev|citywide|hh has|royal|tfj|aka\s+\d+.*$).*$/gi, '')
    .trim();

  // Try to extract number + street name
  const match = cleaned.match(/^([\d\-]+)\s+(.+)/);
  if (match) {
    return {
      number: match[1].replace(/-/g, ''),
      street: match[2].split(/\s+(st|street|ave|avenue|blvd|boulevard|pl|place|ct|court|dr|drive|rd|road|pkwy|parkway|hwy|highway)\b/i)[0]
    };
  }
  return { number: null, street: cleaned };
}

async function main() {
  // Step 1: Read Asana project names from sheet
  console.log('1. Reading Asana projects from sheet...')
  const sheetToken = await getSheetToken()
  const asanaProjects = await readSheet(sheetToken)
  console.log(`   Found ${asanaProjects.length} Asana projects\n`)

  // Step 2: Get all project names from BigQuery project_master
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

  const bqProjectsRaw = bqResult.rows ? bqResult.rows.map(r => r.f[0].v) : []
  console.log(`   Found ${bqProjectsRaw.length} projects in project_master\n`)

  // Build lookup structures
  const bqNormalized = new Map()
  const bqByNumber = new Map()

  for (const proj of bqProjectsRaw) {
    const norm = normalize(proj)
    bqNormalized.set(norm, proj)

    const key = extractAddressKey(proj)
    if (key.number) {
      if (!bqByNumber.has(key.number)) bqByNumber.set(key.number, [])
      bqByNumber.get(key.number).push({ original: proj, street: key.street, norm })
    }
  }

  // Step 3: Match with multiple strategies
  console.log('3. Matching Asana projects to BigQuery (thorough)...\n')

  const matched = []
  const notMatched = []

  for (const asanaName of asanaProjects) {
    const asanaNorm = normalize(asanaName)
    const asanaKey = extractAddressKey(asanaName)
    let found = null
    let matchType = ''

    // Strategy 1: Exact normalized match
    if (bqNormalized.has(asanaNorm)) {
      found = bqNormalized.get(asanaNorm)
      matchType = 'exact'
    }

    // Strategy 2: Match by street number + partial street name
    if (!found && asanaKey.number && bqByNumber.has(asanaKey.number)) {
      const candidates = bqByNumber.get(asanaKey.number)
      for (const c of candidates) {
        if (c.street.includes(asanaKey.street) || asanaKey.street.includes(c.street)) {
          found = c.original
          matchType = 'number+street'
          break
        }
      }
      // Even looser: just street number match with similar length street
      if (!found) {
        for (const c of candidates) {
          // Check if streets share first word
          const asanaFirstWord = asanaKey.street.split(' ')[0]
          const bqFirstWord = c.street.split(' ')[0]
          if (asanaFirstWord === bqFirstWord ||
              asanaFirstWord.includes(bqFirstWord) ||
              bqFirstWord.includes(asanaFirstWord)) {
            found = c.original
            matchType = 'number+partial'
            break
          }
        }
      }
    }

    // Strategy 3: Contains match (either direction)
    if (!found) {
      for (const [norm, orig] of bqNormalized) {
        if (norm.includes(asanaNorm) || asanaNorm.includes(norm)) {
          found = orig
          matchType = 'contains'
          break
        }
      }
    }

    // Strategy 4: Street number anywhere in BQ project
    if (!found && asanaKey.number) {
      for (const [norm, orig] of bqNormalized) {
        if (norm.includes(asanaKey.number) && asanaKey.street) {
          const streetWords = asanaKey.street.split(' ')
          if (streetWords.some(w => w.length > 2 && norm.includes(w))) {
            found = orig
            matchType = 'loose'
            break
          }
        }
      }
    }

    if (found) {
      matched.push({ asana: asanaName, bq: found, type: matchType })
    } else {
      notMatched.push(asanaName)
    }
  }

  // Results
  console.log('=== RESULTS ===\n')
  console.log(`Total Asana projects: ${asanaProjects.length}`)
  console.log(`Matched in project_master: ${matched.length}`)
  console.log(`NOT in project_master: ${notMatched.length}`)
  console.log(`Match rate: ${(matched.length / asanaProjects.length * 100).toFixed(1)}%\n`)

  // Match breakdown by type
  const byType = {}
  matched.forEach(m => { byType[m.type] = (byType[m.type] || 0) + 1 })
  console.log('Match breakdown:')
  Object.entries(byType).forEach(([type, count]) => console.log(`  ${type}: ${count}`))

  console.log('\n--- ALL MATCHED ---')
  matched.forEach(m => {
    console.log(`  ✓ [${m.type}] ${m.asana}`)
    console.log(`    → ${m.bq}`)
  })

  console.log('\n--- NOT MATCHED ---')
  notMatched.forEach(n => {
    console.log(`  ✗ ${n}`)
  })
}

main().catch(console.error)
