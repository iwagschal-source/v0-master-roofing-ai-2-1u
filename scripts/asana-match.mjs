#!/usr/bin/env node
import { createSign } from 'crypto'
import { readFileSync } from 'fs'

const PAT = '2/1210265196196335/1212775865924391:725275789145e9e8e1946d3737a9e8b9'
const PROJECTS_GID = '916647532526133'

// Load Google creds from production env
const prodEnv = readFileSync('.env.production.local', 'utf-8')
const EMAIL = prodEnv.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL="([^"]+)"/)?.[1]?.replace(/\\n/g, '')
const KEY = prodEnv.match(/GOOGLE_PRIVATE_KEY="([\s\S]+?)"\n/)?.[1]?.replace(/\\n/g, '\n')

async function getGoogleToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: EMAIL, sub: 'rfp@masterroofingus.com', scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
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

async function getAllAsanaTasks() {
  let allTasks = [], offset = null
  do {
    const url = `https://app.asana.com/api/1.0/projects/${PROJECTS_GID}/tasks?opt_fields=name&limit=100${offset ? '&offset=' + offset : ''}`
    const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${PAT}` } })
    const data = await resp.json()
    allTasks = allTasks.concat(data.data)
    offset = data.next_page?.offset
  } while (offset)
  return allTasks
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function main() {
  // Get Asana tasks
  console.log('Fetching Asana Projects pipeline...')
  const asanaTasks = await getAllAsanaTasks()
  console.log('Asana Projects tasks:', asanaTasks.length)
  
  // Get sheet data
  console.log('\nFetching sheet...')
  const token = await getGoogleToken()
  const sheetId = '1D5OYMQ-ab6GUdPYq4Py5xSS6VRhfr75dN3vS0LDW9Fc'
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Sheet1!A:B')}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await resp.json()
  const sheetRows = data.values?.slice(1).filter(r => r[0]) || []
  console.log('Sheet rows:', sheetRows.length)
  
  // Normalize Asana task names
  const asanaNames = new Set(asanaTasks.map(t => normalize(t.name)))
  
  // Match sheet observed_key to Asana
  let matched = 0, unmatched = []
  for (const row of sheetRows) {
    const observedKey = normalize(row[1])
    // Try exact match or partial match
    let found = asanaNames.has(observedKey)
    if (!found) {
      // Try if any Asana name contains the key or vice versa
      for (const an of asanaNames) {
        if (an.includes(observedKey) || observedKey.includes(an)) {
          found = true
          break
        }
      }
    }
    if (found) matched++
    else unmatched.push(row[1])
  }
  
  console.log('\n=== MATCH RESULTS ===')
  console.log('Sheet rows:', sheetRows.length)
  console.log('Matched in Asana Projects:', matched)
  console.log('Not matched:', unmatched.length)
  console.log('Match rate:', Math.round(matched/sheetRows.length*100) + '%')
  
  if (unmatched.length > 0 && unmatched.length < 20) {
    console.log('\nUnmatched addresses:')
    unmatched.forEach(a => console.log('  -', a))
  }
}

main().catch(console.error)
