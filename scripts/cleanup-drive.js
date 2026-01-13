/**
 * List and optionally delete files from service account's Drive
 */

const crypto = require('crypto')

const SCOPES = ['https://www.googleapis.com/auth/drive']

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: email,
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

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function listAndCleanup() {
  console.log('Getting access token...')
  const accessToken = await getAccessToken()

  // Get storage quota
  console.log('\nChecking storage quota...')
  const aboutResponse = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=storageQuota',
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )
  const aboutData = await aboutResponse.json()
  console.log('Storage quota:', aboutData.storageQuota)

  // List all files
  console.log('\nListing all files...')
  const listResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files?pageSize=100&fields=files(id,name,mimeType,size,createdTime)',
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )
  const listData = await listResponse.json()

  if (!listData.files || listData.files.length === 0) {
    console.log('No files found.')
    return
  }

  console.log(`\nFound ${listData.files.length} files:`)
  for (const file of listData.files) {
    console.log(`- ${file.name} (${file.mimeType}) - ${file.size || 'N/A'} bytes - ${file.createdTime}`)
  }

  // Delete all files to free up space
  console.log('\nDeleting all files to free up space...')
  for (const file of listData.files) {
    console.log(`Deleting: ${file.name}...`)
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${file.id}`,
      {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    )
  }

  // Also empty trash
  console.log('\nEmptying trash...')
  await fetch(
    'https://www.googleapis.com/drive/v3/files/trash',
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  )

  console.log('\nDone! Storage should be freed up now.')
}

require('dotenv').config({ path: '.env.local' })
listAndCleanup().catch(console.error)
