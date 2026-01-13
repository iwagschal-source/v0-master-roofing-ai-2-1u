#!/usr/bin/env node
import { createSign } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SCOPES = ['https://www.googleapis.com/auth/bigquery']

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !privateKey) throw new Error('Credentials not configured')
  
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: email, scope: SCOPES.join(' '), aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
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
  if (!tokenData.access_token) throw new Error('Failed to get token: ' + JSON.stringify(tokenData))
  return tokenData.access_token
}

async function runQuery(accessToken, sql) {
  const projectId = 'master-roofing-intelligence'
  const resp = await fetch(`https://bigquery.googleapis.com/bigquery/v2/projects/${projectId}/queries`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: sql,
      useLegacySql: false,
      timeoutMs: 30000
    })
  })
  return resp.json()
}

async function main() {
  const accessToken = await getAccessToken()
  
  // First check what tables exist
  const checkTable = await runQuery(accessToken, `
    SELECT table_name 
    FROM \`master-roofing-intelligence.raw_data.INFORMATION_SCHEMA.TABLES\`
    WHERE table_name LIKE '%project%' OR table_name LIKE '%master%'
  `)
  console.log('Tables with project/master in name:')
  if (checkTable.rows) {
    checkTable.rows.forEach(r => console.log('  -', r.f[0].v))
  }
  
  // Check project_master count
  const countResult = await runQuery(accessToken, `
    SELECT COUNT(*) as total FROM \`master-roofing-intelligence.raw_data.project_master\`
  `)
  console.log('\nproject_master total rows:', countResult.rows?.[0]?.f?.[0]?.v)
}

main().catch(console.error)
