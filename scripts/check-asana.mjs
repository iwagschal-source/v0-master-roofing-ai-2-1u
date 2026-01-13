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
  
  // Check raw_asana_projects structure
  console.log('=== mr_raw.raw_asana_projects ===')
  const rawCols = await runQuery(bqToken, `
    SELECT column_name FROM \`master-roofing-intelligence.mr_raw.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'raw_asana_projects'
  `)
  console.log('Columns:', rawCols.rows?.map(r => r.f[0].v).join(', '))
  
  const rawCount = await runQuery(bqToken, `SELECT COUNT(*) as c FROM \`master-roofing-intelligence.mr_raw.raw_asana_projects\``)
  console.log('Total rows:', rawCount.rows?.[0]?.f?.[0]?.v)
  
  // Check if there's a pipeline/section column
  const rawSample = await runQuery(bqToken, `
    SELECT * FROM \`master-roofing-intelligence.mr_raw.raw_asana_projects\` LIMIT 3
  `)
  if (rawSample.schema) {
    console.log('\nSample:')
    rawSample.rows?.slice(0,2).forEach((r, i) => {
      const obj = {}
      rawSample.schema.fields.forEach((f, j) => obj[f.name] = r.f[j].v)
      console.log(`Row ${i+1}:`, JSON.stringify(obj).slice(0, 300))
    })
  }
  
  // Check asana_tasks_current for pipeline info
  console.log('\n=== mr_staging.asana_tasks_current ===')
  const taskCols = await runQuery(bqToken, `
    SELECT column_name FROM \`master-roofing-intelligence.mr_staging.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'asana_tasks_current'
  `)
  console.log('Columns:', taskCols.rows?.map(r => r.f[0].v).join(', '))
  
  // Check for "Projects" in section/pipeline names
  const sections = await runQuery(bqToken, `
    SELECT DISTINCT memberships_section_name, COUNT(*) as cnt
    FROM \`master-roofing-intelligence.mr_staging.asana_tasks_current\`
    GROUP BY 1 ORDER BY 2 DESC LIMIT 20
  `)
  console.log('\nSections:')
  sections.rows?.forEach(r => console.log(`  ${r.f[0].v}: ${r.f[1].v}`))
}

main().catch(console.error)
