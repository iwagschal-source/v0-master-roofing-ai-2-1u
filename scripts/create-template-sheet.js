/**
 * Script to create the KO Proposal Template Google Sheet
 * Run with: node scripts/create-template-sheet.js
 */

const crypto = require('crypto')

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
]

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !privateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY')
  }

  console.log('Service account:', email)

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: email,
    sub: 'rfp@masterroofingus.com', // Impersonate RFP user via domain-wide delegation
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  const sign = crypto.createSign('RSA-SHA256')
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

async function createTemplateSheet() {
  console.log('Getting access token...')
  const accessToken = await getAccessToken()
  console.log('Access token obtained!')

  // First, try to list files to test permissions
  console.log('\nTesting Drive API access...')
  const testResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files?pageSize=1',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!testResponse.ok) {
    const testError = await testResponse.text()
    console.log('Drive API test failed:', testError)
  } else {
    console.log('Drive API access OK!')
  }

  // Create spreadsheet using Drive API (as a Google Sheets file)
  console.log('\nCreating spreadsheet via Drive API...')
  const driveCreateResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'KO Proposal Template',
        mimeType: 'application/vnd.google-apps.spreadsheet',
      }),
    }
  )

  if (!driveCreateResponse.ok) {
    const driveError = await driveCreateResponse.text()
    throw new Error(`Failed to create via Drive API: ${driveError}`)
  }

  const driveFile = await driveCreateResponse.json()
  const sheetId = driveFile.id
  console.log(`Spreadsheet created with ID: ${sheetId}`)

  // Now add the sheets/tabs using Sheets API
  console.log('\nAdding tabs to spreadsheet...')

  const batchUpdateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          // Rename Sheet1 to Setup
          {
            updateSheetProperties: {
              properties: { sheetId: 0, title: 'Setup' },
              fields: 'title',
            },
          },
          // Add Systems tab
          { addSheet: { properties: { title: 'Systems' } } },
          // Add Pricing tab
          { addSheet: { properties: { title: 'Pricing' } } },
          // Add Descriptions tab
          { addSheet: { properties: { title: 'Descriptions' } } },
          // Add Proposal tab
          { addSheet: { properties: { title: 'Proposal' } } },
        ],
      }),
    }
  )

  if (!batchUpdateResponse.ok) {
    const batchError = await batchUpdateResponse.text()
    console.log('Warning: Could not add tabs:', batchError)
  } else {
    console.log('Tabs added successfully!')
  }

  // Add headers to Setup tab
  console.log('Adding headers to Setup tab...')
  const setupHeaders = [
    ['Field', 'Value'],
    ['Project Name', ''],
    ['Project Address', ''],
    ['GC Name', ''],
    ['Project Amount', ''],
    ['Due Date', ''],
    ['Status', ''],
    ['Created Date', ''],
  ]

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Setup!A1:B8?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: setupHeaders }),
    }
  )

  // Add headers to Systems tab
  console.log('Adding headers to Systems tab...')
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Systems!A1:H1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [['System', 'Thickness', 'R-Value', 'Quantity', 'Unit', 'Unit Price', 'Total', 'Notes']]
      }),
    }
  )

  // Add headers to Pricing tab
  console.log('Adding headers to Pricing tab...')
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Pricing!A1:H1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [['Item', 'Description', 'Quantity', 'Unit', 'Unit Cost', 'Total Cost', 'Markup %', 'Sell Price']]
      }),
    }
  )

  // Add headers to Descriptions tab
  console.log('Adding headers to Descriptions tab...')
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Descriptions!A1:C1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [['System Name', 'Generated Description', 'Status']]
      }),
    }
  )

  // Add headers to Proposal tab
  console.log('Adding headers to Proposal tab...')
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Proposal!A1:C10?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [
          ['PROPOSAL'],
          [''],
          ['Prepared For:', ''],
          ['Project:', ''],
          ['Date:', ''],
          [''],
          ['SCOPE OF WORK'],
          [''],
          ['BASE BID'],
          ['Item', 'Description', 'Amount'],
        ]
      }),
    }
  )

  // Make the sheet publicly viewable
  console.log('\nMaking sheet viewable by anyone with link...')
  const shareResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${sheetId}/permissions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'anyone',
        role: 'reader',
      }),
    }
  )

  if (shareResponse.ok) {
    console.log('Sheet is now viewable by anyone with the link!')
  }

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`

  console.log('\n========================================')
  console.log('TEMPLATE CREATED SUCCESSFULLY!')
  console.log('========================================')
  console.log(`\nSheet ID: ${sheetId}`)
  console.log(`\nAdd this to your .env.local:`)
  console.log(`GOOGLE_SHEET_TEMPLATE_ID=${sheetId}`)
  console.log(`\nSheet URL: ${sheetUrl}`)
  console.log('========================================\n')

  return { sheetId, sheetUrl }
}

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

createTemplateSheet()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
