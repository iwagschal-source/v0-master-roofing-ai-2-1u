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
  const payload = { iss: email, sub: 'rfp@masterroofingus.com', scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
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
  const t = await tokenResponse.json()
  if (!t.access_token) { console.log('Token error:', t); process.exit(1) }
  return t.access_token
}

async function main() {
  const token = await getAccessToken()
  const sheetId = '1D5OYMQ-ab6GUdPYq4Py5xSS6VRhfr75dN3vS0LDW9Fc'
  
  // Get metadata
  const metaResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const meta = await metaResp.json()
  
  if (meta.error) {
    console.log('Meta error:', meta.error)
    return
  }
  
  console.log('Tabs:')
  meta.sheets?.forEach(s => {
    console.log(`  - "${s.properties.title}" (${s.properties.gridProperties?.rowCount} rows x ${s.properties.gridProperties?.columnCount} cols)`)
  })
  
  const firstTab = meta.sheets?.[0]?.properties?.title
  if (!firstTab) { console.log('No tabs'); return }
  
  // Read all data
  const range = encodeURIComponent(`${firstTab}!A:J`)
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await resp.json()
  
  if (data.error) {
    console.log('Data error:', data.error)
    return
  }
  
  const rows = data.values?.slice(1) || []
  console.log('\nTotal data rows:', rows.length)
  console.log('Headers:', data.values?.[0]?.join(' | '))
  
  // Check duplicates
  const projectIds = rows.map(r => r[0]).filter(x => x)
  const seen = new Map()
  const duplicates = []
  projectIds.forEach((id, idx) => {
    if (seen.has(id)) {
      duplicates.push({ id, row1: seen.get(id) + 2, row2: idx + 2 })
    } else {
      seen.set(id, idx)
    }
  })
  
  console.log('Valid project_ids:', projectIds.length)
  console.log('Unique project_ids:', seen.size)
  console.log('DUPLICATES:', duplicates.length)
  
  if (duplicates.length > 0) {
    console.log('\nDuplicate examples:')
    duplicates.slice(0, 5).forEach(d => {
      const r1 = rows[d.row1 - 2]
      const r2 = rows[d.row2 - 2]
      console.log(`\n  ${d.id}`)
      console.log(`    Row ${d.row1}: ${r1?.[1]} | ${r1?.[5]}`)
      console.log(`    Row ${d.row2}: ${r2?.[1]} | ${r2?.[5]}`)
    })
  }
  
  // Status breakdown
  const statusCounts = {}
  rows.forEach(r => {
    const status = r[5] || 'EMPTY'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })
  console.log('\n=== STATUS BREAKDOWN ===')
  Object.entries(statusCounts).sort((a,b) => b[1] - a[1]).forEach(([s, c]) => console.log(`  ${s}: ${c}`))
  
  // Output all unique IDs for BQ check
  console.log('\n=== UNIQUE IDS FOR BQ ===')
  console.log('Count:', seen.size)
}

main().catch(console.error)
