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
  const sheetToken = await getToken('https://www.googleapis.com/auth/spreadsheets', 'rfp@masterroofingus.com')
  const sheetId = '1D5OYMQ-ab6GUdPYq4Py5xSS6VRhfr75dN3vS0LDW9Fc'
  
  // Get project_ids with sage_billed_amount > 0 from BQ
  console.log('Fetching project_ids with Sage billing data...')
  const sageProjects = await runQuery(bqToken, `
    SELECT project_id 
    FROM \`master-roofing-intelligence.mr_staging.project_master_backup_2026_01_12\`
    WHERE sage_billed_amount > 0
  `)
  const sageIds = new Set(sageProjects.rows?.map(r => r.f[0].v) || [])
  console.log('Projects with Sage data:', sageIds.size)
  
  // Read sheet
  console.log('\nReading sheet...')
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Sheet1!A:F')}`, {
    headers: { 'Authorization': `Bearer ${sheetToken}` }
  })
  const data = await resp.json()
  const rows = data.values || []
  console.log('Sheet rows:', rows.length)
  
  // Find rows to update (have sage data but not already WON)
  const updates = []
  for (let i = 1; i < rows.length; i++) {
    const projectId = rows[i][0]
    const currentStatus = rows[i][5]
    
    if (projectId && sageIds.has(projectId) && currentStatus !== 'WON') {
      updates.push({
        range: `Sheet1!F${i + 1}`,
        values: [['WON']]
      })
    }
  }
  
  console.log('\nRows to update to WON:', updates.length)
  
  if (updates.length === 0) {
    console.log('Nothing to update.')
    return
  }
  
  // Batch update
  console.log('Updating sheet...')
  const updateResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${sheetToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data: updates
    })
  })
  const result = await updateResp.json()
  
  if (result.error) {
    console.log('Update error:', result.error.message)
  } else {
    console.log('Updated', result.totalUpdatedCells, 'cells')
  }
  
  // Verify
  console.log('\nVerifying...')
  const verifyResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Sheet1!F:F')}`, {
    headers: { 'Authorization': `Bearer ${sheetToken}` }
  })
  const verifyData = await verifyResp.json()
  const statusCounts = {}
  verifyData.values?.slice(1).forEach(r => {
    const s = r[0] || 'EMPTY'
    statusCounts[s] = (statusCounts[s] || 0) + 1
  })
  console.log('New status breakdown:')
  Object.entries(statusCounts).sort((a,b) => b[1] - a[1]).forEach(([s, c]) => console.log(`  ${s}: ${c}`))
}

main().catch(console.error)
