#!/usr/bin/env node
/**
 * Find all Asana-related tables in BigQuery
 */

import { createSign } from 'crypto'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const BQ_SCOPES = ['https://www.googleapis.com/auth/bigquery']
const BQ_PROJECT = 'master-roofing-intelligence'
const GCP_KEY_FILE = '/home/iwagschal/aeyecorp/workspace-ingest.json'

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
      body: JSON.stringify({ query: sql, useLegacySql: false, maxResults: 100 })
    }
  )
  return response.json()
}

async function main() {
  const bqToken = await getBigQueryToken()

  // List all datasets
  console.log('=== BigQuery Datasets ===\n')
  const datasetsResult = await queryBigQuery(bqToken, `
    SELECT schema_name
    FROM \`master-roofing-intelligence.INFORMATION_SCHEMA.SCHEMATA\`
  `)

  const datasets = datasetsResult.rows ? datasetsResult.rows.map(r => r.f[0].v) : []
  console.log('Datasets:', datasets.join(', '))

  // Search for Asana tables in each dataset
  console.log('\n=== Searching for Asana tables ===\n')

  for (const dataset of datasets) {
    const tablesResult = await queryBigQuery(bqToken, `
      SELECT table_name
      FROM \`master-roofing-intelligence.${dataset}.INFORMATION_SCHEMA.TABLES\`
      WHERE LOWER(table_name) LIKE '%asana%'
    `)

    if (tablesResult.rows && tablesResult.rows.length > 0) {
      console.log(`${dataset}:`)
      for (const row of tablesResult.rows) {
        const tableName = row.f[0].v
        console.log(`  - ${tableName}`)

        // Get sample data
        const sampleResult = await queryBigQuery(bqToken, `
          SELECT *
          FROM \`master-roofing-intelligence.${dataset}.${tableName}\`
          LIMIT 3
        `)

        if (sampleResult.schema) {
          console.log(`    Columns: ${sampleResult.schema.fields.map(f => f.name).join(', ')}`)
        }
        if (sampleResult.totalRows) {
          console.log(`    Total rows: ${sampleResult.totalRows}`)
        }
      }
    }
  }

  // Also check for dim_project or similar that might have Asana data
  console.log('\n=== Checking dim_project for Asana dates ===\n')
  const dimResult = await queryBigQuery(bqToken, `
    SELECT column_name
    FROM \`master-roofing-intelligence.mr_core.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'dim_project_v2'
  `)

  if (dimResult.rows) {
    const cols = dimResult.rows.map(r => r.f[0].v)
    console.log('dim_project_v2 columns:', cols.join(', '))

    // Check if there's a created_at or similar
    const dateCol = cols.find(c => c.includes('created') || c.includes('first_seen'))
    if (dateCol) {
      console.log(`\nFound date column: ${dateCol}`)
    }
  }
}

main().catch(console.error)
