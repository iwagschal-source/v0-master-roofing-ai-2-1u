#!/usr/bin/env node
import { createSign } from 'crypto'
import { readFileSync } from 'fs'

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
  
  // Get sheet IDs
  const sheetToken = await getToken('https://www.googleapis.com/auth/spreadsheets', 'rfp@masterroofingus.com')
  const sheetId = '1D5OYMQ-ab6GUdPYq4Py5xSS6VRhfr75dN3vS0LDW9Fc'
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Sheet1!A:A')}`, {
    headers: { 'Authorization': `Bearer ${sheetToken}` }
  })
  const data = await resp.json()
  const sheetIds = data.values?.slice(1).map(r => r[0]).filter(x => x) || []
  console.log('Sheet project_ids:', sheetIds.length)
  
  const idsStr = sheetIds.map(id => `'${id}'`).join(',')
  
  // Check how many have Sage data
  console.log('\n=== Sheet vs Sage (project_master_backup) ===')
  
  const hasSage = await runQuery(bqToken, `
    SELECT 
      COUNT(*) as total,
      COUNTIF(sage_billed_amount > 0) as has_sage_billed,
      COUNTIF(has_ledger_data = true) as has_ledger,
      COUNTIF(ledger_total_debits > 0) as has_debits,
      COUNTIF(ledger_total_credits > 0) as has_credits,
      SUM(IFNULL(sage_billed_amount, 0)) as total_billed,
      SUM(IFNULL(ledger_total_debits, 0)) as total_debits
    FROM \`master-roofing-intelligence.mr_staging.project_master_backup_2026_01_12\`
    WHERE project_id IN (${idsStr})
  `)
  
  if (hasSage.rows) {
    const r = hasSage.rows[0].f
    console.log(`Total matched: ${r[0].v}`)
    console.log(`Has sage_billed_amount > 0: ${r[1].v}`)
    console.log(`Has ledger data: ${r[2].v}`)
    console.log(`Has ledger debits: ${r[3].v}`)
    console.log(`Has ledger credits: ${r[4].v}`)
    console.log(`Total billed: $${Number(r[5].v).toLocaleString()}`)
    console.log(`Total debits: $${Number(r[6].v).toLocaleString()}`)
  }
  
  // Break down by award_status
  console.log('\n=== Sage data by award_status ===')
  const byStatus = await runQuery(bqToken, `
    SELECT 
      award_status,
      COUNT(*) as cnt,
      COUNTIF(sage_billed_amount > 0) as has_sage,
      COUNTIF(has_ledger_data = true) as has_ledger
    FROM \`master-roofing-intelligence.mr_staging.project_master_backup_2026_01_12\`
    WHERE project_id IN (${idsStr})
    GROUP BY award_status
    ORDER BY cnt DESC
  `)
  byStatus.rows?.forEach(r => {
    console.log(`  ${r.f[0].v || 'NULL'}: ${r.f[1].v} total, ${r.f[2].v} sage, ${r.f[3].v} ledger`)
  })
}

main().catch(console.error)
