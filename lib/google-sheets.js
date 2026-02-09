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
export async function getAccessToken() {
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
 * Read formulas from a Google Sheet (not computed values)
 *
 * @param {string} sheetId - The sheet ID
 * @param {string} range - A1 notation range
 * @returns {Promise<any[][]>}
 */
export async function readSheetFormulas(sheetId, range) {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMULA`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to read formulas: ${error}`)
  }

  const data = await response.json()
  return data.values || []
}

/**
 * Get the name of the first sheet in a spreadsheet
 *
 * @param {string} spreadsheetId - The Google Spreadsheet ID
 * @returns {Promise<string>} - The name of the first sheet
 */
export async function getFirstSheetName(spreadsheetId) {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get sheet metadata: ${error}`)
  }

  const data = await response.json()
  const sheets = data.sheets || []

  if (sheets.length === 0) {
    throw new Error('Spreadsheet has no sheets')
  }

  return sheets[0].properties.title
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

// ============================================================================
// GOOGLE DRIVE FOLDER MANAGEMENT (Step 8.B.7)
// Project folder structure: KO Projects > [Project] > Drawings, Markups, Proposals
// ============================================================================

const KO_PROJECTS_ROOT_NAME = 'KO Projects'

/**
 * Get or create the KO Projects root folder
 * Uses env var for efficiency, falls back to search/create
 * @returns {Promise<string>} Root folder ID
 */
export async function getOrCreateKOProjectsRoot() {
  // Check env var first for efficiency
  if (process.env.KO_PROJECTS_ROOT_FOLDER_ID) {
    return process.env.KO_PROJECTS_ROOT_FOLDER_ID
  }

  const accessToken = await getAccessToken()

  // Search for existing folder
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(KO_PROJECTS_ROOT_NAME)}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  )

  if (searchResponse.ok) {
    const data = await searchResponse.json()
    if (data.files && data.files.length > 0) {
      console.log(`[Drive] Found existing KO Projects root: ${data.files[0].id}`)
      return data.files[0].id
    }
  }

  // Create if doesn't exist
  const createResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: KO_PROJECTS_ROOT_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    }
  )

  if (!createResponse.ok) {
    const error = await createResponse.text()
    throw new Error(`Failed to create KO Projects root folder: ${error}`)
  }

  const folder = await createResponse.json()
  console.log(`[Drive] Created KO Projects root: ${folder.id}`)
  console.log(`[Drive] Add to .env.local: KO_PROJECTS_ROOT_FOLDER_ID=${folder.id}`)

  return folder.id
}

/**
 * Get or create a project's Google Drive folder with standard subfolders
 * Structure: KO Projects > [Project Name] - [ID] > Drawings, Markups, Proposals
 *
 * @param {string} projectId - The project ID
 * @param {string} projectName - Human-readable project name
 * @param {string} [existingFolderId] - Existing folder ID from BigQuery (skip creation if exists)
 * @returns {Promise<{folderId: string, drawingsFolderId: string, markupsFolderId: string, proposalsFolderId: string}>}
 */
export async function getOrCreateProjectFolder(projectId, projectName, existingFolderId = null) {
  // If folder already exists, return it (we'll need to look up subfolder IDs separately if needed)
  if (existingFolderId) {
    return { folderId: existingFolderId, drawingsFolderId: null, markupsFolderId: null, proposalsFolderId: null }
  }

  const accessToken = await getAccessToken()
  const rootFolderId = await getOrCreateKOProjectsRoot()

  const folderName = `${projectName || 'Unnamed'} - ${projectId.substring(0, 8)}`

  // Create main project folder
  const projectFolderResponse = await fetch(
    'https://www.googleapis.com/drive/v3/files',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootFolderId],
      }),
    }
  )

  if (!projectFolderResponse.ok) {
    const error = await projectFolderResponse.text()
    throw new Error(`Failed to create project folder: ${error}`)
  }

  const projectFolder = await projectFolderResponse.json()
  const projectFolderId = projectFolder.id
  console.log(`[Drive] Created project folder: ${folderName} (${projectFolderId})`)

  // Create standard subfolders
  const subfolderNames = ['Drawings', 'Markups', 'Proposals']
  const subfolderIds = {}

  for (const subfolderName of subfolderNames) {
    const subfolderResponse = await fetch(
      'https://www.googleapis.com/drive/v3/files',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: subfolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [projectFolderId],
        }),
      }
    )

    if (subfolderResponse.ok) {
      const subfolder = await subfolderResponse.json()
      subfolderIds[subfolderName.toLowerCase()] = subfolder.id
      console.log(`[Drive] Created subfolder: ${subfolderName} (${subfolder.id})`)
    }
  }

  return {
    folderId: projectFolderId,
    drawingsFolderId: subfolderIds.drawings || null,
    markupsFolderId: subfolderIds.markups || null,
    proposalsFolderId: subfolderIds.proposals || null,
  }
}

// ============================================================================
// STANDALONE TAKEOFF SPREADSHEET (Step 8.B.6 + 8.B.7)
// Each project gets its own Google Sheets workbook in its project folder
// ============================================================================

const TAKEOFF_TEMPLATE_ID = process.env.GOOGLE_TAKEOFF_TEMPLATE_ID || '1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4'

/**
 * Create standalone takeoff spreadsheet for a project
 * Copies the template to the project's Google Drive folder
 *
 * @param {string} projectId - The project ID
 * @param {string} projectName - Human-readable project name
 * @param {string} [existingFolderId] - Existing folder ID (skip folder creation if provided)
 * @returns {Promise<{spreadsheetId: string, spreadsheetUrl: string, embedUrl: string, folderId: string, drawingsFolderId: string}>}
 */
export async function createProjectTakeoffSheet(projectId, projectName, existingFolderId = null) {
  const accessToken = await getAccessToken()

  // Get or create project folder structure
  const folderResult = await getOrCreateProjectFolder(projectId, projectName, existingFolderId)
  const { folderId: projectFolderId, drawingsFolderId } = folderResult

  const datestamp = new Date().toISOString().split('T')[0] // 2026-01-29
  const sheetName = `Takeoff - ${projectName || projectId} - ${datestamp}`

  // Copy template to new spreadsheet IN the project folder
  const copyResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${TAKEOFF_TEMPLATE_ID}/copy`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: sheetName,
        parents: [projectFolderId], // Place in project folder
      }),
    }
  )

  if (!copyResponse.ok) {
    const error = await copyResponse.text()
    throw new Error(`Failed to copy takeoff template: ${error}`)
  }

  const copyData = await copyResponse.json()
  const newSpreadsheetId = copyData.id
  console.log(`[Drive] Created takeoff sheet: ${sheetName} (${newSpreadsheetId}) in folder ${projectFolderId}`)

  return {
    spreadsheetId: newSpreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`,
    embedUrl: `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit?embedded=true&rm=minimal`,
    folderId: projectFolderId,
    drawingsFolderId,
  }
}

// Section definitions for the template
// Each section has different header rows and location columns
const TEMPLATE_SECTIONS = {
  ROOFING: { headerRow: 3, startRow: 4, endRow: 43 },
  BALCONIES: { headerRow: 45, startRow: 46, endRow: 53 },
  EXTERIOR: { headerRow: 54, startRow: 55, endRow: 72 }
}

// item_id → row mapping (matches template structure)
// From scripts/populate-template-item-ids.js
const ITEM_ID_TO_ROW = {
  // ROOFING SECTION (rows 4-43)
  'MR-001VB': 4, 'MR-002PITCH': 5, 'MR-003BU2PLY': 6, 'MR-004UO': 7, 'MR-005SCUPPER': 8,
  'MR-006IRMA': 10, 'MR-007PMMA': 11, 'MR-008PMMA': 12, 'MR-009UOPMMA': 13,
  'MR-010DRAIN': 15, 'MR-011DOORSTD': 16, 'MR-012DOORLG': 17,
  'MR-013HATCHSF': 19, 'MR-014HATCHLF': 20, 'MR-015PAD': 21, 'MR-016FENCE': 22,
  'MR-017RAIL': 23, 'MR-018PLUMB': 24, 'MR-019MECH': 25, 'MR-020DAVIT': 26, 'MR-021AC': 27,
  'MR-022COPELO': 29, 'MR-023COPEHI': 30, 'MR-024INSUCOPE': 31,
  'MR-025FLASHBLDG': 33, 'MR-026FLASHPAR': 34,
  'MR-027OBIRMA': 36, 'MR-028PAVER': 37, 'MR-029FLASHPAV': 38,
  'MR-030GREEN': 40, 'MR-031FLASHGRN': 41, 'MR-032RECESSWP': 43,
  // BALCONIES SECTION (rows 46-53)
  'MR-033TRAFFIC': 46, 'MR-034DRIP': 47, 'MR-035LFLASH': 48, 'MR-036DOORBAL': 50,
  // EXTERIOR SECTION (rows 55-72)
  'MR-037BRICKWP': 55, 'MR-038OPNBRKEA': 56, 'MR-039OPNBRKLF': 57,
  'MR-040PANELWP': 59, 'MR-041OPNPNLEA': 60, 'MR-042OPNPNLLF': 61,
  'MR-043EIFS': 63, 'MR-044OPNSTCEA': 64, 'MR-045OPNSTCLF': 65, 'MR-046STUCCO': 66,
  'MR-047DRIPCAP': 68, 'MR-048SILL': 69, 'MR-049TIEIN': 70, 'MR-050ADJHORZ': 71, 'MR-051ADJVERT': 72
}

/**
 * Determine which section a row belongs to
 * @param {number} row - The row number
 * @returns {string|null} - Section name or null if not in a section
 */
function getSectionForRow(row) {
  if (row >= 4 && row <= 43) return 'ROOFING'
  if (row >= 46 && row <= 53) return 'BALCONIES'
  if (row >= 55 && row <= 72) return 'EXTERIOR'
  return null
}

/**
 * Convert a 0-based column index to a column letter (0→A, 1→B, 6→G, 25→Z, 26→AA)
 */
function indexToLetter(index) {
  let letter = ''
  let i = index
  while (i >= 0) {
    letter = String.fromCharCode((i % 26) + 65) + letter
    i = Math.floor(i / 26) - 1
  }
  return letter
}

/**
 * Discover sheet layout from a header row.
 * Dynamically finds location columns, total measurements, total cost, and bid type
 * by scanning headers — no hardcoded column letters or indices.
 *
 * Same detection logic as findColumnIndices() in preview/route.js, but returns
 * column letters (A, B, G...) in addition to indices since the Bluebeam import
 * code uses letters for Sheets API ranges.
 *
 * @param {Array} headerRow - Array of cell values from the header row
 * @returns {Object} Layout with locationColumns, totalMeasurementsCol, totalCostCol, bidTypeCol, metadataEnd
 */
function discoverSheetLayout(headerRow) {
  const layout = {
    locationColumns: [],
    totalMeasurementsCol: null,
    totalCostCol: null,
    bidTypeCol: null,
    metadataEnd: -1
  }

  let materialTypeIdx = -1
  let thicknessIdx = -1
  let rValueIdx = -1
  let scopeIdx = -1
  let totalMeasIdx = -1
  let totalCostIdx = -1
  let bidTypeIdx = -1

  headerRow.forEach((cell, idx) => {
    const h = (cell || '').toString().trim().toLowerCase()
    if (h === 'type' || h === 'material' || h === 'material_type') {
      materialTypeIdx = idx
    } else if (h === 'in' || h === 'thickness' || h === 'inches') {
      thicknessIdx = idx
    } else if (h === 'r' || h === 'r-value' || h === 'r_value' || h === 'rvalue') {
      rValueIdx = idx
    } else if (h.includes('scope') || h === 'description' || h === 'item') {
      scopeIdx = idx
    } else if (h.includes('total') && h.includes('meas')) {
      totalMeasIdx = idx
    } else if (h.includes('total') && h.includes('cost')) {
      totalCostIdx = idx
    } else if (h.includes('bid') && h.includes('type')) {
      bidTypeIdx = idx
    }
  })

  // metadataEnd = last of the metadata columns (scope, R, IN, TYPE)
  layout.metadataEnd = Math.max(materialTypeIdx, thicknessIdx, rValueIdx, scopeIdx)

  if (totalMeasIdx >= 0) {
    layout.totalMeasurementsCol = { index: totalMeasIdx, letter: indexToLetter(totalMeasIdx) }
  }

  if (totalCostIdx >= 0) {
    layout.totalCostCol = { index: totalCostIdx, letter: indexToLetter(totalCostIdx) }
  }

  if (bidTypeIdx >= 0) {
    layout.bidTypeCol = { index: bidTypeIdx, letter: indexToLetter(bidTypeIdx) }
  }

  // Location columns = everything between metadataEnd and totalMeasurements
  if (layout.metadataEnd >= 0 && totalMeasIdx > layout.metadataEnd + 1) {
    for (let i = layout.metadataEnd + 1; i < totalMeasIdx; i++) {
      const name = (headerRow[i] || '').toString().trim()
      if (name) {
        layout.locationColumns.push({
          index: i,
          letter: indexToLetter(i),
          name
        })
      }
    }
  }

  return layout
}

/**
 * Build location → column mapping from a header row
 * Locations are in columns G-L (indices 6-11)
 * @param {Array} headerRow - Array of header values
 * @returns {Object} - Mapping of location name (uppercase) to column letter
 */
function buildLocationMapFromHeader(headerRow) {
  const locationMap = {}
  const locationCols = ['G', 'H', 'I', 'J', 'K', 'L']

  for (let i = 0; i < locationCols.length; i++) {
    const headerIdx = 6 + i // G=6, H=7, etc. (0-indexed)
    const headerValue = headerRow[headerIdx]?.toString().trim().toUpperCase() || ''

    if (headerValue) {
      locationMap[headerValue] = locationCols[i]
      // Add common variations
      const normalized = headerValue.replace(/[^A-Z0-9]/g, '')
      if (normalized !== headerValue) {
        locationMap[normalized] = locationCols[i]
      }
    }
  }

  return locationMap
}

/**
 * Fill Bluebeam data into a standalone takeoff spreadsheet
 * Maps item codes to rows and locations to columns based on section-specific headers
 *
 * @param {string} spreadsheetId - The standalone spreadsheet ID
 * @param {Array} bluebeamItems - Parsed items [{code, floor, quantity}]
 * @param {Object} config - Takeoff config (currently unused, kept for compatibility)
 * @returns {Promise<{updated: number, details: Array}>}
 */
export async function fillBluebeamDataToSpreadsheet(spreadsheetId, bluebeamItems, config = null) {
  const accessToken = await getAccessToken()
  const sheetName = 'DATE'

  // Read all three header rows in parallel
  const headerRanges = [
    `'${sheetName}'!A3:L3`,   // ROOFING header
    `'${sheetName}'!A45:L45`, // BALCONIES header
    `'${sheetName}'!A54:L54`  // EXTERIOR header
  ]

  const headerResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?ranges=${headerRanges.map(r => encodeURIComponent(r)).join('&ranges=')}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  if (!headerResponse.ok) {
    const error = await headerResponse.text()
    throw new Error(`Failed to read header rows: ${error}`)
  }

  const headerData = await headerResponse.json()
  const valueRanges = headerData.valueRanges || []

  // Build location maps for each section
  const sectionLocationMaps = {
    ROOFING: buildLocationMapFromHeader(valueRanges[0]?.values?.[0] || []),
    BALCONIES: buildLocationMapFromHeader(valueRanges[1]?.values?.[0] || []),
    EXTERIOR: buildLocationMapFromHeader(valueRanges[2]?.values?.[0] || [])
  }

  console.log('[fillBluebeamData] Section location maps:', JSON.stringify(sectionLocationMaps, null, 2))

  // Also read Column A to get item_ids for matching
  const colAResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${sheetName}'!A4:A72`)}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  )

  // Build code → row mapping from Column A (item_ids in the sheet)
  const codeRows = { ...ITEM_ID_TO_ROW } // Start with hardcoded mapping as fallback
  if (colAResponse.ok) {
    const colAData = await colAResponse.json()
    const colAValues = colAData.values || []
    for (let i = 0; i < colAValues.length; i++) {
      const itemId = colAValues[i]?.[0]?.toString().trim().toUpperCase()
      if (itemId && itemId.startsWith('MR-')) {
        codeRows[itemId] = i + 4 // Row 4 is index 0
      }
    }
  }

  console.log(`[fillBluebeamData] Code→row mappings loaded: ${Object.keys(codeRows).length} items`)

  const data = []
  const details = []

  for (const item of bluebeamItems) {
    const code = item.code?.toUpperCase()
    const floor = item.floor?.toUpperCase()

    const row = codeRows[code]
    if (!row) {
      details.push({ code, floor, quantity: item.quantity, status: 'NO_ROW_MAPPING' })
      continue
    }

    const section = getSectionForRow(row)
    if (!section) {
      details.push({ code, floor, quantity: item.quantity, row, status: 'ROW_NOT_IN_SECTION' })
      continue
    }

    const locationMap = sectionLocationMaps[section]
    const col = locationMap[floor]

    if (!col) {
      // Try some common normalizations
      const normalizedFloor = floor?.replace(/[^A-Z0-9]/g, '')
      const alternateCol = locationMap[normalizedFloor]

      if (alternateCol) {
        data.push({
          range: `'${sheetName}'!${alternateCol}${row}`,
          values: [[item.quantity]]
        })
        details.push({ code, floor, quantity: item.quantity, row, section, col: alternateCol, status: 'MATCHED_NORMALIZED' })
      } else {
        details.push({ code, floor, quantity: item.quantity, row, section, availableLocations: Object.keys(locationMap), status: 'NO_COLUMN_MAPPING' })
      }
      continue
    }

    data.push({
      range: `'${sheetName}'!${col}${row}`,
      values: [[item.quantity]]
    })
    details.push({ code, floor, quantity: item.quantity, row, section, col, status: 'MATCHED' })
  }

  console.log(`[fillBluebeamData] Prepared ${data.length} cell updates`)
  console.log('[fillBluebeamData] Details:', JSON.stringify(details, null, 2))

  if (data.length === 0) {
    return { updated: 0, details }
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data,
      }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fill Bluebeam data: ${error}`)
  }

  return { updated: data.length, details }
}

/**
 * Populate a takeoff spreadsheet with locations (columns) and line items (rows)
 *
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {Array} columns - Location columns [{id, name, mappings}]
 * @param {Array} lineItems - Selected line items [{scope_code, scope_name, ...}]
 * @returns {Promise<{updated: number}>}
 */
// ============================================================================
// TAKEOFF SHEET TAB MANAGEMENT (DEPRECATED - use standalone approach above)
// Uses tabs within the Truth Source spreadsheet to avoid storage quota issues
// ============================================================================

const TRUTH_SOURCE_ID = '19HFxoNqMeuhZAwBzwJ40B9-7LNkO6DTagHxdZ4y-HCw'
const TEMPLATE_TAB_NAME = 'BLANK_TEMPLATE_TAKEOFF_SHEET'

/**
 * @deprecated Use createProjectTakeoffSheet() instead for standalone spreadsheets
 * Create a new takeoff sheet tab for a project within the Truth Source spreadsheet
 *
 * @param {string} projectId - The project ID (MD5 hash)
 * @param {string} projectName - Human-readable project name
 * @returns {Object} - { gid, tabName, embedUrl, editUrl, existed }
 */
export async function createTakeoffTab(projectId, projectName) {
  const accessToken = await getAccessToken()

  // Get spreadsheet info to find template tab
  const getResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TRUTH_SOURCE_ID}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  )

  if (!getResponse.ok) {
    throw new Error(`Failed to get spreadsheet: ${await getResponse.text()}`)
  }

  const spreadsheet = await getResponse.json()

  // Find template tab
  const templateSheet = spreadsheet.sheets.find(
    s => s.properties.title === TEMPLATE_TAB_NAME
  )

  if (!templateSheet) {
    throw new Error(`Template tab "${TEMPLATE_TAB_NAME}" not found`)
  }

  const templateGid = templateSheet.properties.sheetId

  // Create unique tab name (limit to 100 chars)
  const tabName = `Takeoff_${projectName || projectId}`.slice(0, 100)

  // Check if tab already exists
  const existingSheet = spreadsheet.sheets.find(
    s => s.properties.title === tabName
  )

  if (existingSheet) {
    const gid = existingSheet.properties.sheetId
    return {
      spreadsheetId: TRUTH_SOURCE_ID,
      gid,
      tabName,
      embedUrl: `https://docs.google.com/spreadsheets/d/${TRUTH_SOURCE_ID}/edit?rm=minimal&gid=${gid}`,
      editUrl: `https://docs.google.com/spreadsheets/d/${TRUTH_SOURCE_ID}/edit#gid=${gid}`,
      existed: true
    }
  }

  // Duplicate the template tab
  const copyResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TRUTH_SOURCE_ID}/sheets/${templateGid}:copyTo`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destinationSpreadsheetId: TRUTH_SOURCE_ID
      })
    }
  )

  if (!copyResponse.ok) {
    throw new Error(`Failed to copy template: ${await copyResponse.text()}`)
  }

  const copyData = await copyResponse.json()
  const newGid = copyData.sheetId

  // Rename the new tab
  const renameResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TRUTH_SOURCE_ID}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [{
          updateSheetProperties: {
            properties: {
              sheetId: newGid,
              title: tabName
            },
            fields: 'title'
          }
        }]
      })
    }
  )

  if (!renameResponse.ok) {
    console.warn('Failed to rename tab:', await renameResponse.text())
  }

  // Update project name in cell A2
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TRUTH_SOURCE_ID}/values/${encodeURIComponent(`'${tabName}'!A2`)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [[projectName || projectId]]
      })
    }
  )

  return {
    spreadsheetId: TRUTH_SOURCE_ID,
    gid: newGid,
    tabName,
    embedUrl: `https://docs.google.com/spreadsheets/d/${TRUTH_SOURCE_ID}/edit?rm=minimal&gid=${newGid}`,
    editUrl: `https://docs.google.com/spreadsheets/d/${TRUTH_SOURCE_ID}/edit#gid=${newGid}`,
    existed: false
  }
}

/**
 * Get takeoff sheet tab info for a project
 *
 * @param {string} projectId - The project ID
 * @param {string} projectName - Optional project name to search by
 * @returns {Object|null} - Tab info or null if not found
 */
export async function getTakeoffTab(projectId, projectName) {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TRUTH_SOURCE_ID}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get spreadsheet: ${await response.text()}`)
  }

  const spreadsheet = await response.json()

  // Look for tab matching project
  const searchName = `Takeoff_${projectName || projectId}`
  const sheet = spreadsheet.sheets.find(
    s => s.properties.title.startsWith('Takeoff_') &&
         (s.properties.title === searchName || s.properties.title.includes(projectId))
  )

  if (!sheet) {
    return null
  }

  const gid = sheet.properties.sheetId
  return {
    spreadsheetId: TRUTH_SOURCE_ID,
    gid,
    tabName: sheet.properties.title,
    embedUrl: `https://docs.google.com/spreadsheets/d/${TRUTH_SOURCE_ID}/edit?rm=minimal&gid=${gid}`,
    editUrl: `https://docs.google.com/spreadsheets/d/${TRUTH_SOURCE_ID}/edit#gid=${gid}`
  }
}

/**
 * List all takeoff tabs in the Truth Source
 *
 * @returns {Array} - List of takeoff tab info
 */
export async function listTakeoffTabs() {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TRUTH_SOURCE_ID}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get spreadsheet: ${await response.text()}`)
  }

  const spreadsheet = await response.json()

  return spreadsheet.sheets
    .filter(s => s.properties.title.startsWith('Takeoff_'))
    .map(s => ({
      gid: s.properties.sheetId,
      tabName: s.properties.title,
      projectName: s.properties.title.replace('Takeoff_', ''),
      embedUrl: `https://docs.google.com/spreadsheets/d/${TRUTH_SOURCE_ID}/edit?rm=minimal&gid=${s.properties.sheetId}`,
      editUrl: `https://docs.google.com/spreadsheets/d/${TRUTH_SOURCE_ID}/edit#gid=${s.properties.sheetId}`
    }))
}

/**
 * Fill Bluebeam data into a takeoff tab
 *
 * @param {string} tabName - The tab name
 * @param {Array} bluebeamItems - Parsed Bluebeam items with code, floor, quantity
 * @returns {Object} - { updated: number }
 */
export async function fillBluebeamDataToTab(tabName, bluebeamItems) {
  const accessToken = await getAccessToken()

  // Column mapping for floors (matching template)
  const FLOOR_COLUMNS = {
    '1st Floor': 'C', 'FL1': 'C', 'FLOOR1': 'C', '1': 'C',
    '2nd Floor': 'D', 'FL2': 'D', 'FLOOR2': 'D', '2': 'D',
    '3rd Floor': 'E', 'FL3': 'E', 'FLOOR3': 'E', '3': 'E',
    '4th Floor': 'F', 'FL4': 'F', 'FLOOR4': 'F', '4': 'F',
    'Main Roof': 'G', 'ROOF': 'G', 'MAIN': 'G',
    'Stair Bulkhead': 'H', 'STAIR': 'H', 'STR': 'H',
    'Elev. Bulkhead': 'I', 'ELEV': 'I', 'ELV': 'I'
  }

  // Row mapping for item codes (matches template rows)
  const CODE_ROWS = {
    'VB': 4, 'VAPOR': 4,
    'PITCH': 5,
    'ROOF-2PLY': 6, '2PLY': 6, 'BUILDUP': 6,
    'UP-OVER': 7, 'UPOVER': 7,
    'SCUPPER': 8, 'LEADER': 8,
    'IRMA': 10,
    'PMMA-BLDG': 11, 'PMMA': 11,
    'PMMA-PAR': 12,
    'DRAIN': 15,
    'DOOR-STD': 16, 'DOORPAN': 16,
    'DOOR-LG': 17,
    'HATCH': 19, 'SKYLIGHT': 19,
    'HATCH-LF': 20,
    'MECH-PAD': 21, 'PAD': 21,
    'FENCE': 22,
    'RAIL': 23,
    'PLUMB': 24,
    'MECH-PEN': 25,
    'DAVIT': 26,
    'AC': 27, 'PTAC': 27, 'DUNNAGE': 27,
    'COPE-LO': 29, 'COPE': 29, 'COPING': 29,
    'COPE-HI': 30,
    'INSUL-COPE': 31,
    'FLASH-BLDG': 33, 'FLASH': 33,
    'FLASH-PAR': 34,
    'OVERBURDEN': 36, 'BALLAST': 36,
    'PAVER': 37,
    'FLASH-PAV': 38,
    'GREEN': 40, 'TURF': 40,
    'FLASH-GRN': 41,
    'RECESS-WP': 43, 'LIQUID-WP': 43,
    'TRAFFIC': 46,
    'DRIP': 47,
    'LFLASH': 48,
    'DOOR-BAL': 50,
    'BRICK': 55,
    'PANEL': 59,
    'EIFS': 63, 'STUCCO': 63,
    'DRIPCAP': 68,
    'SILL': 69,
    'TIEIN': 70
  }

  // Build batch update data
  const data = []

  for (const item of bluebeamItems) {
    const code = item.code?.toUpperCase()
    const floor = item.floor?.toUpperCase() || item.floor

    const row = CODE_ROWS[code]
    const col = FLOOR_COLUMNS[floor] || FLOOR_COLUMNS[floor?.toUpperCase()]

    if (row && col) {
      data.push({
        range: `'${tabName}'!${col}${row}`,
        values: [[item.quantity]]
      })
    }
  }

  if (data.length === 0) {
    return { updated: 0 }
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TRUTH_SOURCE_ID}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fill data: ${await response.text()}`)
  }

  return { updated: data.length }
}

export { TRUTH_SOURCE_ID, TEMPLATE_TAB_NAME, TAKEOFF_TEMPLATE_ID }
