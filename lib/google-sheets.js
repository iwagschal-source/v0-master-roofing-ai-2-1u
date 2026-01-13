/**
 * Google Sheets API client for KO project management
 *
 * Required environment variables:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: Service account email
 * - GOOGLE_PRIVATE_KEY: Service account private key (with \n for newlines)
 * - GOOGLE_SHEET_TEMPLATE_ID: Template sheet ID to copy from
 *
 * Setup instructions:
 * 1. Create a Google Cloud project
 * 2. Enable Google Sheets API and Google Drive API
 * 3. Create a service account and download JSON key
 * 4. Share the template sheet with the service account email (Editor access)
 * 5. Set environment variables in Vercel
 */

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
]

// User to impersonate via domain-wide delegation
const IMPERSONATE_USER = 'rfp@masterroofingus.com'

/**
 * Get access token using service account credentials
 */
async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !privateKey) {
    throw new Error('Google service account credentials not configured')
  }

  // Create JWT for service account auth
  const now = Math.floor(Date.now() / 1000)
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }
  const payload = {
    iss: email,
    sub: IMPERSONATE_USER, // Domain-wide delegation - impersonate workspace user
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  // Sign JWT with private key
  const { createSign } = await import('crypto')

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  const sign = createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(privateKey, 'base64url')

  const jwt = `${signatureInput}.${signature}`

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
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

/**
 * Copy a Google Sheet template and rename it
 *
 * @param {string} templateId - The ID of the template sheet to copy
 * @param {string} newName - Name for the new sheet
 * @param {string} [folderId] - Optional folder ID to place the new sheet in
 * @returns {Promise<{sheetId: string, sheetUrl: string}>}
 */
export async function copyTemplateSheet(templateId, newName, folderId = null) {
  const accessToken = await getAccessToken()

  // Copy the file using Drive API
  const copyResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${templateId}/copy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: newName,
        ...(folderId && { parents: [folderId] }),
      }),
    }
  )

  if (!copyResponse.ok) {
    const error = await copyResponse.text()
    throw new Error(`Failed to copy template: ${error}`)
  }

  const copyData = await copyResponse.json()
  const newSheetId = copyData.id

  return {
    sheetId: newSheetId,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${newSheetId}/edit`,
  }
}

/**
 * Create a new project sheet from the KO template
 *
 * @param {string} projectName - Name of the project (used in sheet title)
 * @param {string} [gcName] - Optional GC name to include in title
 * @returns {Promise<{sheetId: string, sheetUrl: string}>}
 */
export async function createProjectSheet(projectName, gcName = null) {
  const templateId = process.env.GOOGLE_SHEET_TEMPLATE_ID

  if (!templateId) {
    throw new Error('GOOGLE_SHEET_TEMPLATE_ID environment variable not set')
  }

  // Create sheet name: "KO - [Project Name]" or "KO - [Project Name] - [GC]"
  let sheetName = `KO - ${projectName}`
  if (gcName) {
    sheetName += ` - ${gcName}`
  }

  // Add date to ensure uniqueness
  const date = new Date().toISOString().split('T')[0]
  sheetName += ` (${date})`

  return copyTemplateSheet(templateId, sheetName)
}

/**
 * Update a cell value in a Google Sheet
 *
 * @param {string} sheetId - The sheet ID
 * @param {string} range - A1 notation range (e.g., "Setup!A1")
 * @param {any} value - Value to set
 */
export async function updateSheetCell(sheetId, range, value) {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[value]],
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to update cell: ${error}`)
  }

  return response.json()
}

/**
 * Update multiple cells in a Google Sheet
 *
 * @param {string} sheetId - The sheet ID
 * @param {Array<{range: string, values: any[][]}>} data - Array of ranges and values
 */
export async function batchUpdateSheet(sheetId, data) {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: data,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to batch update: ${error}`)
  }

  return response.json()
}

/**
 * Read values from a Google Sheet
 *
 * @param {string} sheetId - The sheet ID
 * @param {string} range - A1 notation range
 * @returns {Promise<any[][]>}
 */
export async function readSheetValues(sheetId, range) {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to read values: ${error}`)
  }

  const data = await response.json()
  return data.values || []
}

/**
 * Search for Google Sheets by name
 *
 * @param {string} query - Search query (partial name match)
 * @param {number} maxResults - Maximum results to return (default 10)
 * @returns {Promise<Array<{id: string, name: string, url: string, createdTime: string, modifiedTime: string}>>}
 */
export async function searchSheets(query, maxResults = 10) {
  const accessToken = await getAccessToken()

  // Build query for Google Drive API - search for spreadsheets containing the query string
  const searchQuery = `mimeType='application/vnd.google-apps.spreadsheet' and name contains '${query.replace(/'/g, "\\'")}'`

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQuery)}&pageSize=${maxResults}&fields=files(id,name,createdTime,modifiedTime,webViewLink)&orderBy=modifiedTime desc`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to search sheets: ${error}`)
  }

  const data = await response.json()
  return (data.files || []).map(file => ({
    id: file.id,
    name: file.name,
    url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
  }))
}

/**
 * Set sharing permissions on a sheet (make it viewable by anyone with link)
 *
 * @param {string} sheetId - The sheet ID
 * @param {string} role - 'reader', 'writer', or 'commenter'
 */
export async function shareSheet(sheetId, role = 'reader') {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${sheetId}/permissions`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'anyone',
        role: role,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to share sheet: ${error}`)
  }

  return response.json()
}
