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
  
  // Check mr_staging tables
  console.log('=== mr_staging project_master tables ===')
  const tables = ['project_master_backup_2026_01_12', 'stg_project_master_full_match', 'stg_active_project_master_match', 'stg_active_project_master_match_v2']
  
  for (const t of tables) {
    const cnt = await runQuery(bqToken, `SELECT COUNT(*) as c, COUNT(DISTINCT project_id) as u FROM \`master-roofing-intelligence.mr_staging.${t}\``)
    if (cnt.rows) {
      console.log(`${t}: ${cnt.rows[0].f[0].v} rows, ${cnt.rows[0].f[1].v} unique project_ids`)
    }
  }
  
  // Get sheet data
  const sheetToken = await getAccessToken('https://www.googleapis.com/auth/spreadsheets', 'rfp@masterroofingus.com')
  const sheetId = '1D5OYMQ-ab6GUdPYq4Py5xSS6VRhfr75dN3vS0LDW9Fc'
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Sheet1!A:F')}`, {
    headers: { 'Authorization': `Bearer ${sheetToken}` }
  })
  const data = await resp.json()
  const rows = data.values?.slice(1) || []
  const projects = rows.map(r => ({ id: r[0], name: r[1], status: r[5] })).filter(p => p.id)
  const wonProjects = projects.filter(p => p.status === 'WON')
  
  console.log('\nSheet:', projects.length, 'total,', wonProjects.length, 'WON')
  
  // Match against the backup table (seems most complete)
  const allIds = projects.map(p => `'${p.id}'`).join(',')
  const wonIds = wonProjects.map(p => `'${p.id}'`).join(',')
  
  console.log('\n=== Match vs project_master_backup_2026_01_12 ===')
  const matchAll = await runQuery(bqToken, `
    SELECT COUNT(DISTINCT project_id) as matched
    FROM \`master-roofing-intelligence.mr_staging.project_master_backup_2026_01_12\`
    WHERE project_id IN (${allIds})
  `)
  const matchWon = await runQuery(bqToken, `
    SELECT COUNT(DISTINCT project_id) as matched
    FROM \`master-roofing-intelligence.mr_staging.project_master_backup_2026_01_12\`
    WHERE project_id IN (${wonIds})
  `)
  
  const allMatched = matchAll.rows?.[0]?.f?.[0]?.v || 0
  const wonMatched = matchWon.rows?.[0]?.f?.[0]?.v || 0
  console.log(`All ${projects.length}: ${allMatched} matched (${Math.round(allMatched/projects.length*100)}%), ${projects.length - allMatched} missing`)
  console.log(`WON ${wonProjects.length}: ${wonMatched} matched (${Math.round(wonMatched/wonProjects.length*100)}%), ${wonProjects.length - wonMatched} missing`)
}

main().catch(console.error)
