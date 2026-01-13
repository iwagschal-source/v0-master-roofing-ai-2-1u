#!/usr/bin/env node
import { createSign } from 'crypto'
import { readFileSync } from 'fs'

const PAT = '2/1210265196196335/1212775865924391:725275789145e9e8e1946d3737a9e8b9'
const PROJECTS_GID = '916647532526133'

const prodEnv = readFileSync('.env.production.local', 'utf-8')
const EMAIL = prodEnv.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL="([^"]+)"/)?.[1]?.replace(/\\n/g, '')
const KEY = prodEnv.match(/GOOGLE_PRIVATE_KEY="([\s\S]+?)"\n/)?.[1]?.replace(/\\n/g, '\n')

async function getToken(scopes, impersonate = null) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: EMAIL, scope: scopes, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  if (impersonate) payload.sub = impersonate
  const encH = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encP = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createSign('RSA-SHA256').update(`${encH}.${encP}`).sign(KEY, 'base64url')
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${encH}.${encP}.${sig}` })
  })
  return (await resp.json()).access_token
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
  const bqToken = await getToken('https://www.googleapis.com/auth/bigquery')
  
  // Find email tables in mr_brain
  console.log('=== mr_brain tables ===')
  const tables = await runQuery(bqToken, `
    SELECT table_name FROM \`master-roofing-intelligence.mr_brain.INFORMATION_SCHEMA.TABLES\`
    ORDER BY table_name
  `)
  tables.rows?.forEach(r => console.log('  -', r.f[0].v))
  
  // Check email-related tables
  console.log('\n=== Checking gmail_messages structure ===')
  const gmailCols = await runQuery(bqToken, `
    SELECT column_name FROM \`master-roofing-intelligence.mr_brain.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'gmail_messages'
  `)
  console.log('Columns:', gmailCols.rows?.map(r => r.f[0].v).join(', '))
  
  const gmailCount = await runQuery(bqToken, `
    SELECT COUNT(*) as c FROM \`master-roofing-intelligence.mr_brain.gmail_messages\`
  `)
  console.log('Total emails:', gmailCount.rows?.[0]?.f?.[0]?.v)
  
  // Check for fkohn and sufrin emails
  console.log('\n=== Emails by fkohn/sufrin ===')
  const userEmails = await runQuery(bqToken, `
    SELECT 
      LOWER(sender_email) as sender,
      COUNT(*) as cnt
    FROM \`master-roofing-intelligence.mr_brain.gmail_messages\`
    WHERE LOWER(sender_email) LIKE '%fkohn%' OR LOWER(sender_email) LIKE '%sufrin%'
    GROUP BY 1
    ORDER BY 2 DESC
  `)
  userEmails.rows?.forEach(r => console.log(`  ${r.f[0].v}: ${r.f[1].v}`))
}

main().catch(console.error)
