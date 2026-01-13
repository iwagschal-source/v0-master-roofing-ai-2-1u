#!/usr/bin/env node
/**
 * Search Google Sheets by name
 * Usage: node scripts/search-sheets.mjs "search query"
 */

import { createSign } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
]

const IMPERSONATE_USER = 'rfp@masterroofingus.com'

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !privateKey) {
    throw new Error('Google service account credentials not configured')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: email,
    sub: IMPERSONATE_USER,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

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
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function searchSheets(query, maxResults = 20) {
  const accessToken = await getAccessToken()

  const searchQuery = `mimeType='application/vnd.google-apps.spreadsheet' and name contains '${query.replace(/'/g, "\\'")}'`

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&pageSize=${maxResults}&fields=files(id,name,createdTime,modifiedTime,webViewLink)&orderBy=modifiedTime desc`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to search sheets: ${error}`)
  }

  const data = await response.json()
  return data.files || []
}

async function readSheetValues(accessToken, sheetId, range) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to read values: ${error}`)
  }

  const data = await response.json()
  return data.values || []
}

async function listAllSheets(maxResults = 50) {
  const accessToken = await getAccessToken()

  const searchQuery = `mimeType='application/vnd.google-apps.spreadsheet'`

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&pageSize=${maxResults}&fields=files(id,name,createdTime,modifiedTime,webViewLink,owners)&orderBy=modifiedTime desc`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list sheets: ${error}`)
  }

  const data = await response.json()
  return data.files || []
}

async function main() {
  const query = process.argv[2] || 'RFP Audit'
  const readData = process.argv[3] === '--data'
  const listAll = process.argv[2] === '--list-all'

  if (listAll) {
    console.log('\nListing all accessible sheets:\n')
    try {
      const sheets = await listAllSheets(100)
      if (sheets.length === 0) {
        console.log('No sheets found.')
        return
      }
      console.log(`Found ${sheets.length} sheet(s):\n`)
      for (const sheet of sheets) {
        console.log(`📊 ${sheet.name}`)
        console.log(`   ID: ${sheet.id}`)
        console.log(`   URL: ${sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`}`)
        console.log('')
      }
    } catch (error) {
      console.error('Error:', error.message)
    }
    return
  }

  console.log(`\nSearching for sheets containing: "${query}"\n`)

  try {
    const sheets = await searchSheets(query)

    if (sheets.length === 0) {
      console.log('No sheets found matching your query.')
      return
    }

    console.log(`Found ${sheets.length} sheet(s):\n`)

    for (const sheet of sheets) {
      console.log(`📊 ${sheet.name}`)
      console.log(`   ID: ${sheet.id}`)
      console.log(`   URL: ${sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`}`)
      console.log(`   Modified: ${sheet.modifiedTime}`)
      console.log('')
    }

    // If requested, read data from first sheet
    if (readData && sheets.length > 0) {
      console.log('\n--- Reading data from first sheet ---\n')
      const accessToken = await getAccessToken()
      const data = await readSheetValues(accessToken, sheets[0].id, 'Sheet1!A1:Z100')
      console.log('Data:')
      data.forEach((row, i) => {
        console.log(`Row ${i + 1}: ${row.join(' | ')}`)
      })
    }
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()
