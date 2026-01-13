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
  // Get sheet data (needs impersonation)
  const sheetToken = await getAccessToken('https://www.googleapis.com/auth/spreadsheets', 'rfp@masterroofingus.com')
  const sheetId = '1D5OYMQ-ab6GUdPYq4Py5xSS6VRhfr75dN3vS0LDW9Fc'
  const range = encodeURIComponent('Sheet1!A:F')
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`, {
    headers: { 'Authorization': `Bearer ${sheetToken}` }
  })
  const data = await resp.json()
  const rows = data.values?.slice(1) || []
  
  const projects = rows.map(r => ({ id: r[0], name: r[1], status: r[5] })).filter(p => p.id)
  console.log('Sheet projects:', projects.length)
  
  const wonProjects = projects.filter(p => p.status === 'WON')
  console.log('WON projects:', wonProjects.length)
  
  // BQ (no impersonation needed)
  const bqToken = await getAccessToken('https://www.googleapis.com/auth/bigquery')
  
  // Match ALL
  const allIds = projects.map(p => `'${p.id}'`).join(',')
  const matchAll = await runQuery(bqToken, `
    SELECT COUNT(DISTINCT project_id) as matched
    FROM \`master-roofing-intelligence.mr_core.fact_project_intelligence_v2\`
    WHERE project_id IN (${allIds})
  `)
  const allMatched = matchAll.rows?.[0]?.f?.[0]?.v || 0
  console.log('\n=== ALL sheet IDs vs BigQuery ===')
  console.log(`Matched: ${allMatched} of ${projects.length} (${Math.round(allMatched/projects.length*100)}%)`)
  console.log(`Missing: ${projects.length - allMatched}`)
  
  // Match WON only
  const wonIds = wonProjects.map(p => `'${p.id}'`).join(',')
  const matchWon = await runQuery(bqToken, `
    SELECT COUNT(DISTINCT project_id) as matched
    FROM \`master-roofing-intelligence.mr_core.fact_project_intelligence_v2\`
    WHERE project_id IN (${wonIds})
  `)
  const wonMatched = matchWon.rows?.[0]?.f?.[0]?.v || 0
  console.log('\n=== WON IDs vs BigQuery ===')
  console.log(`Matched: ${wonMatched} of ${wonProjects.length} (${Math.round(wonMatched/wonProjects.length*100)}%)`)
  console.log(`Missing: ${wonProjects.length - wonMatched}`)
}

main().catch(console.error)
