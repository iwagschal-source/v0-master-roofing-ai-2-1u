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

  const metaResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  const meta = await metaResp.json()
  console.log('Tabs:', meta.sheets.map(s => s.properties.title).join(', '))

  const firstTab = meta.sheets[0].properties.title
  const range = encodeURIComponent(firstTab + '!A1:Z200')
  const dataResp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  const data = await dataResp.json()

  if (data.values) {
    console.log('\nHEADERS:', data.values[0].join(' | '))
    console.log('\nDATA (' + (data.values.length - 1) + ' rows):')
    data.values.slice(1, 20).forEach((row, i) => {
      console.log(`${(i+1).toString().padStart(3)}: ${row.join(' | ')}`)
    })
    if (data.values.length > 20) {
      console.log(`... and ${data.values.length - 20} more rows`)
    }
  }
}

main().catch(console.error)
