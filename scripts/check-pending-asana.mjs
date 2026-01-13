#!/usr/bin/env node
import { createSign } from 'crypto'
import { readFileSync } from 'fs'

const PAT = '2/1210265196196335/1212775865924391:725275789145e9e8e1946d3737a9e8b9'
const PROJECTS_GID = '916647532526133'

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

function extractNumbers(s) {
  return (s || '').match(/\d+/g)?.join(' ') || ''
}

async function main() {
  // Get Asana tasks
  console.log('Fetching Asana Projects pipeline...')
  const asanaTasks = await getAllAsanaTasks()
  console.log('Asana tasks:', asanaTasks.length)
  
  const asanaNormalized = new Set(asanaTasks.map(t => normalize(t.name)))
  const asanaNumbers = new Set(asanaTasks.map(t => extractNumbers(t.name)).filter(x => x))
  
  // Get sheet - PENDING only
  const sheetToken = await getToken('https://www.googleapis.com/auth/spreadsheets', 'rfp@masterroofingus.com')
  const sheetId = '1D5OYMQ-ab6GUdPYq4Py5xSS6VRhfr75dN3vS0LDW9Fc'
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Sheet1!A:F')}`, {
    headers: { 'Authorization': `Bearer ${sheetToken}` }
  })
  const data = await resp.json()
  const rows = data.values?.slice(1) || []
  
  const pending = rows.filter(r => r[5] === 'PENDING')
  console.log('\nPENDING rows in sheet:', pending.length)
  
  // Match pending to Asana
  let matched = 0, unmatched = []
  for (const row of pending) {
    const addr = row[1]
    const norm = normalize(addr)
    const nums = extractNumbers(addr)
    
    if (asanaNormalized.has(norm) || (nums && asanaNumbers.has(nums))) {
      matched++
    } else {
      unmatched.push(addr)
    }
  }
  
  console.log('\n=== PENDING vs Asana Projects ===')
  console.log('Matched in Asana:', matched)
  console.log('Not in Asana:', unmatched.length)
  
  if (unmatched.length > 0) {
    console.log('\nFirst 15 PENDING not in Asana Projects:')
    unmatched.slice(0, 15).forEach(a => console.log('  -', a))
  }
}

main().catch(console.error)
