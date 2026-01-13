#!/usr/bin/env node
/**
 * Check how many Asana projects exist in BigQuery project_master
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

  const bqProjects = bqResult.rows ? bqResult.rows.map(r => r.f[0].v.toLowerCase().trim()) : []
  console.log(`   Found ${bqProjects.length} projects in project_master\n`)

  // Step 3: Match - check exact and fuzzy matches
  console.log('3. Matching Asana projects to BigQuery...\n')

  const matched = []
  const notMatched = []

  for (const asanaName of asanaProjects) {
    const cleanName = asanaName.toLowerCase().trim()
      .replace(/\s*-\s*(buzzbid|jacob|shaya|isaac|issac|roofing|waterproofing|credit update|hanging|panel|budgeting|certified payroll.*|mwbe|studio.*|phase.*|zev.*|citywide|hh has.*|royal.*|tfj).*$/i, '')
      .replace(/\s+/g, ' ')
      .trim()

    // Extract just address portion
    const addressMatch = cleanName.match(/^[\d\-]+\s+[\w\s]+(?:st|street|ave|avenue|blvd|boulevard|pl|place|ct|court|dr|drive|rd|road|pkwy|parkway|hwy|highway)/i)
    const searchTerm = addressMatch ? addressMatch[0] : cleanName

    // Check for matches
    const exactMatch = bqProjects.find(p => p === cleanName || p === searchTerm)
    const partialMatch = bqProjects.find(p =>
      p.includes(searchTerm) ||
      searchTerm.includes(p) ||
      p.replace(/\s+/g, '').includes(searchTerm.replace(/\s+/g, ''))
    )

    if (exactMatch || partialMatch) {
      matched.push({ asana: asanaName, bq: exactMatch || partialMatch })
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

  if (matched.length > 0) {
    console.log('--- MATCHED (first 20) ---')
    matched.slice(0, 20).forEach(m => {
      console.log(`  ✓ ${m.asana}`)
      console.log(`    → ${m.bq}`)
    })
    if (matched.length > 20) console.log(`  ... and ${matched.length - 20} more`)
  }

  console.log('\n--- NOT MATCHED (first 20) ---')
  notMatched.slice(0, 20).forEach(n => {
    console.log(`  ✗ ${n}`)
  })
  if (notMatched.length > 20) console.log(`  ... and ${notMatched.length - 20} more`)
}

main().catch(console.error)
