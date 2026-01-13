#!/usr/bin/env node
import { createSign } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
const IMPERSONATE_USER = 'rfp@masterroofingus.com'

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: email, sub: IMPERSONATE_USER, scope: SCOPES.join(' '), aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
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
  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function main() {
  const sheetId = '1D5OYMQ-ab6GUdPYq4Py5xSS6VRhfr75dN3vS0LDW9Fc'
  const accessToken = await getAccessToken()

  const range = encodeURIComponent('Sheet1!A1:J500')
  const dataResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  const data = await dataResp.json()

  if (!data.values) {
    console.log('No data found')
    return
  }

  const rows = data.values.slice(1) // skip header
  console.log('Total rows:', rows.length)

  // Check for duplicates
  const projectIds = rows.map(r => r[0])
  const seen = new Map()
  const duplicates = []
  
  projectIds.forEach((id, idx) => {
    if (seen.has(id)) {
      duplicates.push({ id, firstRow: seen.get(id) + 2, duplicateRow: idx + 2 })
    } else {
      seen.set(id, idx)
    }
  })

  console.log('\n=== DUPLICATE CHECK ===')
  console.log('Unique project_ids:', seen.size)
  console.log('Duplicates found:', duplicates.length)
  if (duplicates.length > 0) {
    console.log('\nDuplicate details:')
    duplicates.forEach(d => console.log(`  ${d.id} - rows ${d.firstRow} and ${d.duplicateRow}`))
  }

  // Count by status
  const statusCounts = {}
  rows.forEach(r => {
    const status = r[5] || 'UNKNOWN'
    statusCounts[status] = (statusCounts[status] || 0) + 1
  })
  
  console.log('\n=== STATUS BREAKDOWN ===')
  Object.entries(statusCounts).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`)
  })

  // Output all project_ids for BigQuery check
  console.log('\n=== PROJECT IDS (for BigQuery) ===')
  const uniqueIds = [...seen.keys()]
  console.log(JSON.stringify(uniqueIds))
}

main().catch(console.error)
