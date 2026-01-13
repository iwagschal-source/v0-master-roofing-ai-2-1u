#!/usr/bin/env node
import { createSign } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const IMPERSONATE_USER = 'rfp@masterroofingus.com'
const SHEET_ID = '1MjSa5jVth8E1h4kVQ3uuRH-53-WwUquN04satOQ4ZU0'

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: email, sub: IMPERSONATE_USER, scope: SCOPES.join(' '), aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = encodedHeader + '.' + encodedPayload
  const sign = createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(privateKey, 'base64url')
  const jwt = signatureInput + '.' + signature
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function main() {
  const accessToken = await getAccessToken()
  const range = encodeURIComponent("In Asana Not HubSpot!A1:Z200")
  const response = await fetch(
    'https://sheets.googleapis.com/v4/spreadsheets/' + SHEET_ID + '/values/' + range,
    { headers: { 'Authorization': 'Bearer ' + accessToken } }
  )
  const data = await response.json()

  if (data.values) {
    console.log('=== In Asana Not HubSpot ===')
    console.log('Total rows:', data.values.length)
    console.log('')
    data.values.forEach((row, i) => {
      console.log((i+1) + ': ' + row.join(' | '))
    })
  }
}

main().catch(console.error)
