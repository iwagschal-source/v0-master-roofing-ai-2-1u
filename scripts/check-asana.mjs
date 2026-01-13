#!/usr/bin/env node
import { createSign } from 'crypto'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Manual env loading for multiline keys
const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8')
const env = {}
let currentKey = null
let currentValue = ''
for (const line of envContent.split('\n')) {
  if (line.startsWith('#') || !line.trim()) continue
  if (line.includes('=') && !currentKey) {
    const [k, ...v] = line.split('=')
    currentKey = k
    currentValue = v.join('=')
    if (!currentValue.startsWith('"') || currentValue.endsWith('"')) {
      env[currentKey] = currentValue.replace(/^"|"$/g, '')
      currentKey = null
      currentValue = ''
    }
  } else if (currentKey) {
    currentValue += '\n' + line
    if (line.endsWith('"')) {
      env[currentKey] = currentValue.replace(/^"|"$/g, '')
      currentKey = null
      currentValue = ''
    }
  }
}

async function getAccessToken(scopes, impersonate = null) {
  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!email || !privateKey) throw new Error('Missing creds')
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
  
  // Check v_asana_bids_with_project_id
  console.log('=== v_asana_bids_with_project_id ===')
  const bidsCount = await runQuery(bqToken, `
    SELECT COUNT(*) as c, COUNT(DISTINCT project_id) as u
    FROM \`master-roofing-intelligence.mr_core.v_asana_bids_with_project_id\`
  `)
  console.log('Rows:', bidsCount.rows?.[0]?.f?.[0]?.v, 'Unique project_ids:', bidsCount.rows?.[0]?.f?.[1]?.v)
  
  // Check v_asana_awards_with_project_id
  console.log('\n=== v_asana_awards_with_project_id ===')
  const awardsCount = await runQuery(bqToken, `
    SELECT COUNT(*) as c, COUNT(DISTINCT project_id) as u
    FROM \`master-roofing-intelligence.mr_core.v_asana_awards_with_project_id\`
  `)
  console.log('Rows:', awardsCount.rows?.[0]?.f?.[0]?.v, 'Unique project_ids:', awardsCount.rows?.[0]?.f?.[1]?.v)
  
  // Get sheet IDs
  const sheetToken = await getAccessToken('https://www.googleapis.com/auth/spreadsheets', 'rfp@masterroofingus.com')
  const sheetId = '1D5OYMQ-ab6GUdPYq4Py5xSS6VRhfr75dN3vS0LDW9Fc'
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Sheet1!A:A')}`, {
    headers: { 'Authorization': `Bearer ${sheetToken}` }
  })
  const data = await resp.json()
  const sheetIds = data.values?.slice(1).map(r => r[0]).filter(x => x) || []
  console.log('\n=== Sheet IDs:', sheetIds.length, '===')
  
  const idsStr = sheetIds.map(id => `'${id}'`).join(',')
  
  // Match against bids
  const matchBids = await runQuery(bqToken, `
    SELECT COUNT(DISTINCT project_id) as matched
    FROM \`master-roofing-intelligence.mr_core.v_asana_bids_with_project_id\`
    WHERE project_id IN (${idsStr})
  `)
  console.log('Matched in v_asana_bids:', matchBids.rows?.[0]?.f?.[0]?.v)
  
  // Match against awards (this is probably the "Projects" pipeline)
  const matchAwards = await runQuery(bqToken, `
    SELECT COUNT(DISTINCT project_id) as matched
    FROM \`master-roofing-intelligence.mr_core.v_asana_awards_with_project_id\`
    WHERE project_id IN (${idsStr})
  `)
  console.log('Matched in v_asana_awards:', matchAwards.rows?.[0]?.f?.[0]?.v)
  
  // Combined unique
  const matchCombined = await runQuery(bqToken, `
    SELECT COUNT(DISTINCT project_id) as matched FROM (
      SELECT project_id FROM \`master-roofing-intelligence.mr_core.v_asana_bids_with_project_id\`
      UNION DISTINCT
      SELECT project_id FROM \`master-roofing-intelligence.mr_core.v_asana_awards_with_project_id\`
    )
    WHERE project_id IN (${idsStr})
  `)
  console.log('Matched in either (combined):', matchCombined.rows?.[0]?.f?.[0]?.v)
}

main().catch(console.error)
