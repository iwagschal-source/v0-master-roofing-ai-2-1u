#!/usr/bin/env node
import { createSign } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: email, scope: 'https://www.googleapis.com/auth/bigquery', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
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
    body: JSON.stringify({ query: sql, useLegacySql: false, timeoutMs: 60000 })
  })
  const r = await resp.json()
  if (r.error) console.log('ERROR:', r.error.message)
  return r
}

async function main() {
  const token = await getAccessToken()
  
  // List ALL tables in mr_core
  console.log('=== All mr_core tables ===')
  const allTables = await runQuery(token, `
    SELECT table_name FROM \`master-roofing-intelligence.mr_core.INFORMATION_SCHEMA.TABLES\` ORDER BY table_name
  `)
  allTables.rows?.forEach(r => console.log('  -', r.f[0].v))
  
  // Check stg_project_observations
  console.log('\n=== stg_project_observations columns ===')
  const obsCols = await runQuery(token, `
    SELECT column_name FROM \`master-roofing-intelligence.mr_core.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'stg_project_observations' ORDER BY ordinal_position
  `)
  obsCols.rows?.forEach(r => console.log('  -', r.f[0].v))
  
  // Count stg_project_observations
  console.log('\n=== stg_project_observations count ===')
  const cnt = await runQuery(token, `SELECT COUNT(*) as c, COUNT(DISTINCT project_id) as uniq FROM \`master-roofing-intelligence.mr_core.stg_project_observations\``)
  if (cnt.rows) {
    console.log('Total rows:', cnt.rows[0].f[0].v)
    console.log('Unique project_ids:', cnt.rows[0].f[1].v)
  }
  
  // Sample some project_ids to see format
  console.log('\n=== Sample project_ids ===')
  const sample = await runQuery(token, `SELECT DISTINCT project_id FROM \`master-roofing-intelligence.mr_core.stg_project_observations\` LIMIT 5`)
  sample.rows?.forEach(r => console.log('  -', r.f[0].v))
}

main().catch(console.error)
