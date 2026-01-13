#!/usr/bin/env node
/**
 * Add Asana creation dates to the sheet from exported JSON
 */

import { createSign } from 'crypto'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load both env files - production.local has the Google credentials
dotenv.config({ path: resolve(process.cwd(), '.env.production.local') })
dotenv.config({ path: resolve(process.cwd(), '.env.local'), override: false })

const SHEET_SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
const IMPERSONATE_USER = 'rfp@masterroofingus.com'
const SHEET_ID = '1MjSa5jVth8E1h4kVQ3uuRH-53-WwUquN04satOQ4ZU0'
const ASANA_EXPORT = '/home/iwagschal/asana_bids_export.json'

async function getSheetToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: email, sub: IMPERSONATE_USER, scope: SHEET_SCOPES.join(' '), aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
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

async function readSheet(accessToken) {
  const range = encodeURIComponent("'In Asana Not HubSpot'!A1:E200")
  const response = await fetch(
    'https://sheets.googleapis.com/v4/spreadsheets/' + SHEET_ID + '/values/' + range,
    { headers: { 'Authorization': 'Bearer ' + accessToken } }
  )
  const data = await response.json()
  return data.values || []
}

async function writeToSheet(accessToken, range, values) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  )
  return response.json()
}

function normalizeForMatch(str) {
  return str.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*(buzzbid|jacob|shaya|isaac|issac|roofing|waterproofing|credit update|hanging|panel|budgeting|certified payroll|mwbe|studio|phase|zev|citywide).*$/gi, '')
    .trim();
}

async function main() {
  console.log('=== Add Asana Creation Dates ===\n')

  // Step 1: Load Asana export
  console.log('1. Loading Asana export...')
  const asanaData = JSON.parse(readFileSync(ASANA_EXPORT, 'utf8'))
  console.log(`   Loaded ${asanaData.length} Asana tasks`)

  // Build lookup map by name
  const asanaByName = new Map()
  for (const task of asanaData) {
    if (task.name && task.created_at) {
      const normName = normalizeForMatch(task.name)
      if (!asanaByName.has(normName)) {
        asanaByName.set(normName, task)
      }
    }
  }
  console.log(`   Built lookup map with ${asanaByName.size} unique names`)

  // Step 2: Read current sheet
  console.log('\n2. Reading sheet...')
  const sheetToken = await getSheetToken()
  const sheetData = await readSheet(sheetToken)

  const header = sheetData[0]
  const rows = sheetData.slice(1)
  console.log(`   Found ${rows.length} projects in sheet`)

  // Add/update Asana Created Date column
  let createdColIdx = header.indexOf('Asana Created Date')
  if (createdColIdx === -1) {
    header.push('Asana Created Date')
    createdColIdx = header.length - 1
  }

  // Step 3: Match and add dates
  console.log('\n3. Matching projects to Asana...')
  let matched = 0
  let notMatched = []

  for (const row of rows) {
    const projectName = row[0]
    const normName = normalizeForMatch(projectName)

    // Ensure row has enough columns
    while (row.length <= createdColIdx) {
      row.push('')
    }

    // Try exact match first
    let asanaTask = asanaByName.get(normName)

    // If not found, try partial matching
    if (!asanaTask) {
      for (const [key, task] of asanaByName) {
        if (key.includes(normName) || normName.includes(key)) {
          asanaTask = task
          break
        }
      }
    }

    // If still not found, try matching by street number + first word
    if (!asanaTask) {
      const numMatch = normName.match(/^(\d+)/)
      if (numMatch) {
        const num = numMatch[1]
        const words = normName.split(' ').filter(w => w.length > 2 && !/^\d+$/.test(w))
        const firstWord = words[0]

        if (firstWord) {
          for (const [key, task] of asanaByName) {
            if (key.startsWith(num + ' ') && key.includes(firstWord)) {
              asanaTask = task
              break
            }
          }
        }
      }
    }

    if (asanaTask) {
      const createdDate = asanaTask.created_at.split('T')[0]
      row[createdColIdx] = createdDate
      matched++
    } else {
      row[createdColIdx] = ''
      notMatched.push(projectName)
    }
  }

  console.log(`   Matched: ${matched}`)
  console.log(`   Not matched: ${notMatched.length}`)

  if (notMatched.length > 0) {
    console.log('\n   Projects not found in Asana export:')
    notMatched.forEach(p => console.log(`   - ${p}`))
  }

  // Step 4: Write back to sheet
  console.log('\n4. Updating sheet...')
  const newData = [header, ...rows]
  const result = await writeToSheet(sheetToken, "'In Asana Not HubSpot'!A1", newData)

  console.log(`   Updated ${result.updatedRows} rows, ${result.updatedColumns} columns`)
  console.log(`\nSheet: https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`)
}

main().catch(console.error)
