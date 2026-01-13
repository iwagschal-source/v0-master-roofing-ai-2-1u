#!/usr/bin/env node
import { createSign } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function getAccessToken(scopes, impersonate = null) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: email, scope: scopes, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  if (impersonate) payload.sub = impersonate
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
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  return (await tokenResponse.json()).access_token
}

async function runQuery(token, sql) {
  const resp = await fetch('https://bigquery.googleapis.com/bigquery/v2/projects/master-roofing-intelligence/queries', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, useLegacySql: false, timeoutMs: 120000 })
  })
  const r = await resp.json()
  if (r.error) console.log('BQ Error:', r.error.message)
  return r
}

async function main() {
  const bqToken = await getAccessToken('https://www.googleapis.com/auth/bigquery')
  
  // Find all Asana-related tables
  console.log('=== Asana tables in BigQuery ===')
  for (const dataset of ['mr_core', 'mr_staging', 'mr_brain', 'mr_raw']) {
    const result = await runQuery(bqToken, `
      SELECT table_name FROM \`master-roofing-intelligence.${dataset}.INFORMATION_SCHEMA.TABLES\`
      WHERE LOWER(table_name) LIKE '%asana%'
    `)
    if (result.rows?.length > 0) {
      console.log(`\n${dataset}:`)
      result.rows.forEach(r => console.log('  -', r.f[0].v))
    }
  }
  
  // Check mr_brain.asana_tasks or similar for "Projects" pipeline
  console.log('\n=== Looking for Projects pipeline ===')
  
  // Check dim_project_stage1_asana
  const asanaCols = await runQuery(bqToken, `
    SELECT column_name FROM \`master-roofing-intelligence.mr_core.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'dim_project_stage1_asana'
  `)
  console.log('\ndim_project_stage1_asana columns:')
  asanaCols.rows?.forEach(r => console.log('  -', r.f[0].v))
  
  const asanaCount = await runQuery(bqToken, `
    SELECT COUNT(*) as c, COUNT(DISTINCT project_id) as u
    FROM \`master-roofing-intelligence.mr_core.dim_project_stage1_asana\`
  `)
  if (asanaCount.rows) {
    console.log(`\nRows: ${asanaCount.rows[0].f[0].v}, Unique project_ids: ${asanaCount.rows[0].f[1].v}`)
  }
  
  // Sample to see structure
  const sample = await runQuery(bqToken, `
    SELECT * FROM \`master-roofing-intelligence.mr_core.dim_project_stage1_asana\` LIMIT 3
  `)
  if (sample.schema) {
    console.log('\nSample data:')
    sample.rows?.slice(0,2).forEach((r, i) => {
      console.log(`Row ${i+1}:`, r.f.map((f, j) => `${sample.schema.fields[j].name}=${f.v}`).join(', '))
    })
  }
}

main().catch(console.error)
