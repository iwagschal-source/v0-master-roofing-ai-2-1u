#!/usr/bin/env node
/**
 * Get Asana project creation dates from BigQuery and update the sheet
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

async function readSheet(accessToken) {
  const range = encodeURIComponent("'In Asana Not HubSpot'!A1:E200")
  const response = await fetch(
    'https://sheets.googleapis.com/v4/spreadsheets/' + SHEET_ID + '/values/' + range,
    { headers: { 'Authorization': 'Bearer ' + accessToken } }
  )
  const data = await response.json()
  return data.values || []
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

async function main() {
  console.log('=== Get Asana Creation Dates ===\n')

  // Step 1: Check what columns exist in raw_asana_projects
  console.log('1. Checking raw_asana_projects schema...')
  const bqToken = await getBigQueryToken()

  const schemaResult = await queryBigQuery(bqToken, `
    SELECT column_name, data_type
    FROM \`master-roofing-intelligence.raw_data.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'raw_asana_projects'
  `)

  if (schemaResult.error) {
    // Try mr_agent dataset
    const schemaResult2 = await queryBigQuery(bqToken, `
      SELECT column_name, data_type
      FROM \`master-roofing-intelligence.mr_agent.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = 'raw_asana_projects'
    `)
    if (schemaResult2.rows) {
      console.log('   Found in mr_agent dataset')
      schemaResult2.rows.forEach(r => console.log(`   - ${r.f[0].v}: ${r.f[1].v}`))
    }
  } else if (schemaResult.rows) {
    console.log('   Columns:')
    schemaResult.rows.forEach(r => console.log(`   - ${r.f[0].v}: ${r.f[1].v}`))
  }

  // Step 2: Query all Asana projects with created_at
  console.log('\n2. Querying Asana projects...')

  // Try different possible table locations
  let asanaData = null
  const tables = [
    'master-roofing-intelligence.raw_data.raw_asana_projects',
    'master-roofing-intelligence.mr_agent.raw_asana_projects',
    'master-roofing-intelligence.raw_data.asana_projects'
  ]

  for (const table of tables) {
    const result = await queryBigQuery(bqToken, `
      SELECT * FROM \`${table}\` LIMIT 5
    `)
    if (!result.error && result.rows) {
      console.log(`   Found table: ${table}`)
      asanaData = { table, sample: result }
      break
    }
  }

  if (!asanaData) {
    console.log('   raw_asana_projects not found, trying to find Asana data...')

    // List all tables
    const tablesResult = await queryBigQuery(bqToken, `
      SELECT table_name, table_schema
      FROM \`master-roofing-intelligence.region-us.INFORMATION_SCHEMA.TABLES\`
      WHERE LOWER(table_name) LIKE '%asana%'
    `)

    if (tablesResult.rows) {
      console.log('   Found Asana-related tables:')
      tablesResult.rows.forEach(r => console.log(`   - ${r.f[1].v}.${r.f[0].v}`))
    }
    return
  }

  // Step 3: Get schema of found table
  const tableParts = asanaData.table.split('.')
  const dataset = tableParts[1]
  const tableName = tableParts[2]

  const schemaQuery = await queryBigQuery(bqToken, `
    SELECT column_name
    FROM \`master-roofing-intelligence.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = '${tableName}'
  `)

  const columns = schemaQuery.rows ? schemaQuery.rows.map(r => r.f[0].v) : []
  console.log(`   Columns: ${columns.join(', ')}`)

  // Step 4: Query for name and created_at
  const createdCol = columns.find(c => c.toLowerCase().includes('created'))
  const nameCol = columns.find(c => c.toLowerCase() === 'name' || c.toLowerCase() === 'project_name')

  if (!createdCol || !nameCol) {
    console.log(`   Cannot find created (${createdCol}) or name (${nameCol}) column`)

    // Show sample data
    console.log('\n   Sample data:')
    if (asanaData.sample.schema) {
      console.log('   Schema:', asanaData.sample.schema.fields.map(f => f.name).join(', '))
    }
    if (asanaData.sample.rows && asanaData.sample.rows[0]) {
      console.log('   First row:', JSON.stringify(asanaData.sample.rows[0]))
    }
    return
  }

  console.log(`\n3. Fetching project names and ${createdCol}...`)
  const dataResult = await queryBigQuery(bqToken, `
    SELECT ${nameCol} as name, ${createdCol} as created_at
    FROM \`${asanaData.table}\`
  `)

  if (dataResult.error) {
    console.error('   Error:', dataResult.error.message)
    return
  }

  const asanaProjects = dataResult.rows ? dataResult.rows.map(r => ({
    name: r.f[0].v,
    created_at: r.f[1].v
  })) : []

  console.log(`   Found ${asanaProjects.length} Asana projects`)

  // Step 5: Read current sheet and match
  console.log('\n4. Reading sheet and matching...')
  const sheetToken = await getSheetToken()
  const sheetData = await readSheet(sheetToken)

  const header = sheetData[0]
  const rows = sheetData.slice(1)

  // Add Created Date column if not exists
  if (!header.includes('Asana Created Date')) {
    header.push('Asana Created Date')
  }
  const createdColIdx = header.indexOf('Asana Created Date')

  // Match and update
  let matched = 0
  for (const row of rows) {
    const projectName = row[0].toLowerCase().trim()

    // Find matching Asana project
    const asanaMatch = asanaProjects.find(ap => {
      const apName = ap.name.toLowerCase().trim()
      return apName === projectName ||
             apName.includes(projectName) ||
             projectName.includes(apName)
    })

    if (asanaMatch && asanaMatch.created_at) {
      // Format date
      let dateStr = asanaMatch.created_at
      if (dateStr.includes('T')) {
        dateStr = dateStr.split('T')[0]
      }
      row[createdColIdx] = dateStr
      matched++
    } else {
      row[createdColIdx] = ''
    }
  }

  console.log(`   Matched ${matched} of ${rows.length} projects`)

  // Step 6: Write back to sheet
  console.log('\n5. Updating sheet...')
  const newData = [header, ...rows]
  const result = await writeToSheet(sheetToken, "'In Asana Not HubSpot'!A1", newData)

  console.log(`   Updated ${result.updatedRows} rows`)
  console.log(`\nSheet: https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`)
}

main().catch(console.error)
