#!/usr/bin/env node
import { createSign } from 'crypto'
import { readFileSync } from 'fs'

const PAT = '2/1210265196196335/1212775865924391:725275789145e9e8e1946d3737a9e8b9'
const PROJECTS_GID = '916647532526133'

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

function extractNumbers(s) {
  return (s || '').match(/\d+/g)?.join(' ') || ''
}

function normalize(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function main() {
  console.log('Fetching Asana...')
  const asanaTasks = await getAllAsanaTasks()
  console.log('Asana Projects tasks:', asanaTasks.length)
  
  console.log('Fetching sheet...')
  const token = await getGoogleToken()
  const sheetId = '1D5OYMQ-ab6GUdPYq4Py5xSS6VRhfr75dN3vS0LDW9Fc'
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Sheet1!A:B')}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const data = await resp.json()
  const sheetRows = data.values?.slice(1).filter(r => r[0] && r[1]) || []
  console.log('Sheet rows with addresses:', sheetRows.length)
  
  // Create lookup maps
  const asanaNormalized = new Map()
  const asanaNumbers = new Map()
  for (const t of asanaTasks) {
    const norm = normalize(t.name)
    const nums = extractNumbers(t.name)
    asanaNormalized.set(norm, t.name)
    if (nums) asanaNumbers.set(nums, t.name)
  }
  
  // STRICT matching - exact normalized match only
  let exactMatch = 0
  let numberMatch = 0
  let noMatch = []
  
  for (const row of sheetRows) {
    const sheetAddr = row[1]
    const norm = normalize(sheetAddr)
    const nums = extractNumbers(sheetAddr)
    
    if (asanaNormalized.has(norm)) {
      exactMatch++
    } else if (nums && asanaNumbers.has(nums)) {
      numberMatch++
    } else {
      noMatch.push(sheetAddr)
    }
  }
  
  console.log('\n=== STRICT MATCH ===')
  console.log('Exact normalized match:', exactMatch)
  console.log('Number-only match:', numberMatch)
  console.log('No match:', noMatch.length)
  console.log('Total matched:', exactMatch + numberMatch, '/', sheetRows.length)
  console.log('Match rate:', Math.round((exactMatch + numberMatch)/sheetRows.length*100) + '%')
  
  if (noMatch.length > 0) {
    console.log('\nFirst 20 unmatched:')
    noMatch.slice(0, 20).forEach(a => console.log('  -', a))
  }
}

main().catch(console.error)
