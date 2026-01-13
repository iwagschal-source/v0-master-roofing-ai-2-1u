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

async function runQuery(token, sql) {
  const resp = await fetch('https://bigquery.googleapis.com/bigquery/v2/projects/master-roofing-intelligence/queries', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, useLegacySql: false, timeoutMs: 300000 })
  })
  const r = await resp.json()
  if (r.error) console.log('BQ Error:', r.error.message)
  return r
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
  const bqToken = await getToken('https://www.googleapis.com/auth/bigquery')
  const sheetToken = await getToken('https://www.googleapis.com/auth/spreadsheets', 'rfp@masterroofingus.com')
  
  // Get Asana tasks
  console.log('Fetching Asana...')
  const asanaTasks = await getAllAsanaTasks()
  const asanaNormalized = new Set(asanaTasks.map(t => normalize(t.name)))
  const asanaNumbers = new Set(asanaTasks.map(t => extractNumbers(t.name)).filter(x => x))
  
  // Get sheet PENDING not in Asana
  console.log('Fetching sheet...')
  const sheetId = '1D5OYMQ-ab6GUdPYq4Py5xSS6VRhfr75dN3vS0LDW9Fc'
  const resp = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent('Sheet1!A:F')}`, {
    headers: { 'Authorization': `Bearer ${sheetToken}` }
  })
  const data = await resp.json()
  const rows = data.values?.slice(1) || []
  
  const pendingNotInAsana = []
  for (const row of rows) {
    if (row[5] !== 'PENDING') continue
    const addr = row[1]
    const norm = normalize(addr)
    const nums = extractNumbers(addr)
    if (!asanaNormalized.has(norm) && !(nums && asanaNumbers.has(nums))) {
      pendingNotInAsana.push({ id: row[0], addr: row[1] })
    }
  }
  console.log('PENDING not in Asana:', pendingNotInAsana.length)
  
  // Search emails for each address
  console.log('\nSearching emails for each address...')
  
  let foundInEmail = 0
  let notFound = []
  let foundDetails = []
  
  for (let i = 0; i < pendingNotInAsana.length; i++) {
    const proj = pendingNotInAsana[i]
    const addr = proj.addr
    
    // Extract street number for search
    const numMatch = addr.match(/\d+/)
    const streetMatch = addr.match(/[a-zA-Z]+(?:\s+[a-zA-Z]+)?/)
    
    if (!numMatch) {
      notFound.push({ addr, reason: 'no number' })
      continue
    }
    
    const num = numMatch[0]
    const searchPattern = `%${num}%`
    
    // Search in subject lines of fkohn and csufrin emails
    const searchResult = await runQuery(bqToken, `
      SELECT COUNT(*) as cnt, MIN(date) as first_date, MAX(date) as last_date
      FROM (
        SELECT date FROM \`master-roofing-intelligence.mr_brain.fkohn_emails_raw\`
        WHERE LOWER(subject) LIKE '${searchPattern}'
        UNION ALL
        SELECT date FROM \`master-roofing-intelligence.mr_brain.csufrin_emails_raw\`
        WHERE LOWER(subject) LIKE '${searchPattern}'
      )
    `)
    
    const cnt = parseInt(searchResult.rows?.[0]?.f?.[0]?.v || '0')
    if (cnt > 0) {
      foundInEmail++
      foundDetails.push({
        addr,
        emailCount: cnt,
        firstDate: new Date(parseFloat(searchResult.rows[0].f[1].v) * 1000).toISOString().split('T')[0],
        lastDate: new Date(parseFloat(searchResult.rows[0].f[2].v) * 1000).toISOString().split('T')[0]
      })
    } else {
      notFound.push({ addr, reason: 'no email match' })
    }
    
    if ((i + 1) % 20 === 0) {
      console.log(`  Processed ${i + 1}/${pendingNotInAsana.length}...`)
    }
  }
  
  console.log('\n=== RESULTS ===')
  console.log('Total PENDING not in Asana:', pendingNotInAsana.length)
  console.log('Found in emails:', foundInEmail)
  console.log('Not found:', notFound.length)
  
  console.log('\nFound in emails (first 20):')
  foundDetails.slice(0, 20).forEach(f => {
    console.log(`  ${f.addr}: ${f.emailCount} emails (${f.firstDate} - ${f.lastDate})`)
  })
  
  console.log('\nNot found (first 20):')
  notFound.slice(0, 20).forEach(n => {
    console.log(`  ${n.addr} (${n.reason})`)
  })
}

main().catch(console.error)
