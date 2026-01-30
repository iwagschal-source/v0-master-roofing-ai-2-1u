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
 * Get the first sheet name from a spreadsheet
 *
 * @param {string} spreadsheetId - The spreadsheet ID
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
    // Fallback to 'Sheet1' if we can't get metadata
    return 'Sheet1'
  }

  const data = await response.json()
  if (data.sheets && data.sheets.length > 0) {
    return data.sheets[0].properties.title
  }

  return 'Sheet1'
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

/**
 * Fill Bluebeam data into a standalone takeoff spreadsheet
 * Maps item codes to rows and locations to columns based on config
 *
 * TEMPLATE STRUCTURE (as of Jan 2026):
 * - Row 3: Headers
 * - Row 4+: Line items
 * - Column C: Scope names
 * - Columns G-M: Location columns (7 max)
 *
 * @param {string} spreadsheetId - The standalone spreadsheet ID
 * @param {Array} bluebeamItems - Parsed items [{code, floor, quantity}]
 * @param {Object} config - Takeoff config with columns and selectedItems
 * @returns {Promise<{updated: number}>}
 */
export async function fillBluebeamDataToSpreadsheet(spreadsheetId, bluebeamItems, config = null) {
  const accessToken = await getAccessToken()

  // Get the actual first sheet name
  const sheetName = await getFirstSheetName(spreadsheetId)

  // Build location → column mapping from config or use defaults
  // Location columns are G-M (columns 7-13, ASCII 71-77)
  const locationColumns = {}
  if (config?.columns) {
    config.columns.forEach((col, idx) => {
      if (idx >= 7) return // Max 7 location columns (G-M)
      const colLetter = String.fromCharCode(71 + idx) // G, H, I, J, K, L, M
      locationColumns[col.name.toUpperCase()] = colLetter
      for (const mapping of col.mappings || []) {
        locationColumns[mapping.toUpperCase()] = colLetter
      }
    })
  } else {
    // Default mapping - locations start at column G
    Object.assign(locationColumns, {
      '1ST FLOOR': 'G', 'FIRST FLOOR': 'G', 'FL1': 'G', 'MAIN ROOF': 'G', 'MR': 'G',
      '2ND FLOOR': 'H', 'SECOND FLOOR': 'H', 'FL2': 'H', 'BULKHEAD': 'H', 'BH': 'H',
      '3RD FLOOR': 'I', 'THIRD FLOOR': 'I', 'FL3': 'I',
      '4TH FLOOR': 'J', 'FOURTH FLOOR': 'J', 'FL4': 'J',
      'PENTHOUSE': 'K', 'PH': 'K', 'ELEV': 'K', 'ELEVATOR': 'K',
      'MECHANICAL': 'L', 'MECH': 'L',
      'ELEV. BULKHEAD': 'M', 'ELEVATOR BULKHEAD': 'M', 'EB': 'M'
    })
  }

  // Read BOTH Column A (item_id/scope_code) AND Column C (scope_name) to find row numbers
  // This handles the mismatch between CSV short codes (e.g., "VB") and sheet full names (e.g., "Vapor Barrier")
  // Template structure: Col A = item_id (scope_code), Col C = scope_name (full name)
  const scopesResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${sheetName}'!A4:C80`)}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )

  const codeRows = {}
  if (scopesResponse.ok) {
    const scopesData = await scopesResponse.json()
    const existingRows = scopesData.values || []
    console.log(`[fillBluebeamData] Read ${existingRows.length} rows from sheet`)
    console.log(`[fillBluebeamData] First 5 rows (raw):`, JSON.stringify(existingRows.slice(0, 5)))

    existingRows.forEach((row, idx) => {
      const rowNum = idx + 4 // Row 4 is index 0
      // Column A = item_id (scope_code like "MR-001VB")
      const itemId = row[0]?.toString().toUpperCase().trim()
      // Column C = scope_name (full name like "Vapor Barrier")
      const scopeName = row[2]?.toString().toUpperCase().trim()

      if (itemId) {
        codeRows[itemId] = rowNum

        // Also extract short code from item_id for legacy CSV compatibility
        // Pattern: "MR-001VB" → "VB", "MR-010DRAIN" → "DRAIN", "MR-INS-BATT" → "BATT"
        const shortCodeMatch = itemId.match(/^MR-\d*([A-Z-]+)$/i) || itemId.match(/^MR-[A-Z]+-([A-Z]+)$/i)
        if (shortCodeMatch && shortCodeMatch[1]) {
          const shortCode = shortCodeMatch[1].toUpperCase()
          if (!codeRows[shortCode]) {
            codeRows[shortCode] = rowNum
          }
        }
      }
      if (scopeName) {
        codeRows[scopeName] = rowNum
      }
    })
  } else {
    console.log(`[fillBluebeamData] ERROR reading sheet: ${scopesResponse.status} ${scopesResponse.statusText}`)
  }

  // Also build mappings from config's selectedItems which has both scope_code and scope_name
  // This allows CSV codes to match even if they use a different format
  if (config?.selectedItems) {
    for (const item of config.selectedItems) {
      const scopeCode = item.scope_code?.toUpperCase()?.trim()
      const scopeName = item.scope_name?.toUpperCase()?.trim()

      // If we have a scope_name and it's in codeRows, also map the scope_code to the same row
      if (scopeCode && scopeName && codeRows[scopeName] && !codeRows[scopeCode]) {
        codeRows[scopeCode] = codeRows[scopeName]
      }
      // Vice versa: if we have scope_code in codeRows, map scope_name too
      if (scopeCode && scopeName && codeRows[scopeCode] && !codeRows[scopeName]) {
        codeRows[scopeName] = codeRows[scopeCode]
      }
    }
  }

  // FALLBACK: Hardcoded mapping from scope_code to scope_name
  // This ensures CSV codes like "MR-006IRMA" can find their row even if Column A is empty
  // The mapping is from lib_takeoff_template
  const SCOPE_CODE_TO_NAME = {
    'MR-001VB': 'VAPOR BARRIER',
    'MR-002PITCH': 'PITCH UPCHARGE',
    'MR-003BU2PLY': 'ROOFING - 2 PLY',
    'MR-004UO': 'UP AND OVER',
    'MR-005SCUPPER': 'SCUPPER/LEADER',
    'MR-006IRMA': 'ROOFING - IRMA',
    'MR-007PMMA': 'PMMA @ BUILDING',
    'MR-008PMMA': 'PMMA @ PARAPET',
    'MR-010DRAIN': 'DRAINS',
    'MR-011DOORSTD': 'DOORPANS - STD',
    'MR-012DOORLG': 'DOORPANS - LARGE',
    'MR-013HATCHSF': 'HATCH/SKYLIGHT (SF)',
    'MR-014HATCHLF': 'HATCH/SKYLIGHT (LF)',
    'MR-015PAD': 'MECH PADS',
    'MR-016FENCE': 'FENCE POSTS',
    'MR-017RAIL': 'RAILING POSTS',
    'MR-018PLUMB': 'PLUMBING PEN.',
    'MR-019MECH': 'MECHANICAL PEN.',
    'MR-020DAVIT': 'DAVITS',
    'MR-021AC': 'AC UNITS/DUNNAGE',
    'MR-022COPELO': 'COPING (LOW)',
    'MR-023COPEHI': 'COPING (HIGH)',
    'MR-024INSUCOPE': 'INSUL. COPING',
    'MR-025FLASHBLDG': 'FLASH @ BUILDING',
    'MR-026FLASHPAR': 'FLASH @ PARAPET',
    'MR-027OBIRMA': 'OVERBURDEN IRMA',
    'MR-028PAVER': 'PAVERS',
    'MR-029FLASHPAV': 'EDGE @ PAVERS',
    'MR-030GREEN': 'GREEN ROOF',
    'MR-031FLASHGRN': 'EDGE @ GREEN',
    'MR-032RECESSWP': 'RECESSED FLOOR WP',
    'MR-INS-BATT': 'BATT INSULATION',
    'MR-INS-RIGID': 'RIGID INSULATION',
    'MR-INS-COVER': 'COVER BOARD',
    'MR-033TRAFFIC': 'TRAFFIC COATING',
    'MR-034DRIP': 'ALUM. DRIP EDGE',
    'MR-035LFLASH': 'LIQUID L FLASH',
    'MR-036DOORBAL': 'DOORPANS - BALC.',
    'MR-037BRICKWP': 'BRICK WP',
    'MR-038OPNBRKEA': 'OPEN BRICK (EA)',
    'MR-039OPNBRKLF': 'OPEN BRICK (LF)',
    'MR-040PANELWP': 'PANEL WP',
    'MR-041OPNPNLEA': 'OPEN PANEL (EA)',
    'MR-042OPNPNLLF': 'OPEN PANEL (LF)',
    'MR-043EIFS': 'EIFS',
    'MR-044OPNSTCEA': 'OPEN STUCCO (EA)',
    'MR-045OPNSTCLF': 'OPEN STUCCO (LF)',
    'MR-046STUCCO': 'TRANS. STUCCO',
    'MR-047DRIPCAP': 'DRIP CAP',
    'MR-048SILL': 'SILLS',
    'MR-049TIEIN': 'TIE-IN',
    'MR-050ADJHORZ': 'ADJ. BLDG HORIZ',
    'MR-051ADJVERT': 'ADJ. BLDG VERT',
    'MR-MISC-OTHER': 'OTHER/CUSTOM',
    'MR-MISC-DEMO': 'DEMO',
    'MR-MISC-GARAGE': 'GARAGE'
  }

  // Use fallback mapping: if scope_code not in codeRows but its scope_name IS, add the mapping
  for (const [scopeCode, scopeName] of Object.entries(SCOPE_CODE_TO_NAME)) {
    if (!codeRows[scopeCode] && codeRows[scopeName]) {
      codeRows[scopeCode] = codeRows[scopeName]
      console.log(`[fillBluebeamData] Fallback mapping: ${scopeCode} → ${scopeName} → row ${codeRows[scopeName]}`)
    }
  }

  console.log('[fillBluebeamData] Location columns:', JSON.stringify(locationColumns))
  console.log('[fillBluebeamData] Found scope rows:', Object.keys(codeRows).length)
  console.log('[fillBluebeamData] All codeRows keys:', JSON.stringify(Object.keys(codeRows)))

  // Log incoming items for debugging
  console.log('[fillBluebeamData] Incoming bluebeamItems:', JSON.stringify(bluebeamItems))

  const data = []
  for (const item of bluebeamItems) {
    const code = item.code?.toUpperCase()?.trim()
    const floor = item.floor?.toUpperCase()?.trim()

    const row = codeRows[code]
    const col = locationColumns[floor]

    console.log(`[fillBluebeamData] Looking up: code="${code}" floor="${floor}" → row=${row} col=${col}`)

    if (row && col) {
      data.push({
        range: `'${sheetName}'!${col}${row}`,
        values: [[item.quantity]]
      })
      console.log(`[fillBluebeamData] SUCCESS: ${code} @ ${floor} -> ${col}${row} = ${item.quantity}`)
    } else {
      console.log(`[fillBluebeamData] FAILED: ${code} @ ${floor} (row=${row}, col=${col})`)
      // Additional debug: check if similar keys exist
      const similarKeys = Object.keys(codeRows).filter(k => k.includes(code.substring(0, 6)) || code.includes(k.substring(0, 6)))
      if (similarKeys.length > 0) {
        console.log(`[fillBluebeamData] Similar keys in codeRows: ${similarKeys.join(', ')}`)
      }
    }
  }

  if (data.length === 0) {
    return { updated: 0, reason: 'no_matching_items' }
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

  return { updated: data.length }
}

/**
 * Populate a takeoff spreadsheet with project name and location columns
 *
 * TEMPLATE STRUCTURE (as of Jan 2026):
 * - Row 1: Empty/Logo
 * - Row 2: Project Name in B2, Comments header in P2
 * - Row 3: Column headers:
 *   - A: item_id (NEW)
 *   - B: Unit Cost
 *   - C: Scope
 *   - D: R (R-value)
 *   - E: IN (thickness)
 *   - F: TYPE (material type)
 *   - G-M: Location columns (7 columns: 1st Floor through Elev. Bulkhead)
 *   - N: Total Measurements (formula)
 *   - O: Total Cost (formula)
 *   - P: Comments
 * - Row 4+: Pre-populated line items with formulas
 *
 * This function updates:
 * 1. Project name in B2
 * 2. Location column headers in G3:M3 (if user configured different locations)
 * 3. Rate overrides in column B (optional)
 *
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {Array} columns - Location columns [{id, name, mappings}]
 * @param {Array} lineItems - Selected line items [{scope_code, scope_name, unit_cost, ...}] (optional, for rate overrides)
 * @param {string} projectName - Project name to set in B2 (optional)
 * @returns {Promise<{updated: number}>}
 */
export async function populateTakeoffSheet(spreadsheetId, columns, lineItems, projectName = null) {
  console.log('[populateTakeoffSheet] Called with:', {
    spreadsheetId,
    columnsCount: columns?.length || 0,
    lineItemsCount: lineItems?.length || 0,
    projectName
  })

  const accessToken = await getAccessToken()

  // Get the actual first sheet name
  const sheetName = await getFirstSheetName(spreadsheetId)
  console.log('[populateTakeoffSheet] Sheet name:', sheetName)

  // Build batch update data
  const data = []

  // 1. Update project name in B2 (if provided)
  if (projectName) {
    data.push({
      range: `'${sheetName}'!B2`,
      values: [[projectName]]
    })
    console.log('[populateTakeoffSheet] Setting project name:', projectName)
  }

  // 2. Update location column headers in row 3 (columns G-M)
  // Template has 7 location columns starting at G (columns G, H, I, J, K, L, M)
  if (columns && columns.length > 0) {
    // Pad or truncate to 7 columns max (G through M)
    const locationNames = []
    for (let i = 0; i < 7; i++) {
      if (columns[i]) {
        locationNames.push(columns[i].name || `Location ${i + 1}`)
      } else {
        // Keep original header if user didn't configure this column
        locationNames.push('')
      }
    }

    // Only update cells where user provided a name
    // G3 = column 7, M3 = column 13
    const filledLocations = columns.slice(0, 7).map(col => col.name || '')
    if (filledLocations.some(name => name)) {
      data.push({
        range: `'${sheetName}'!G3:M3`,
        values: [filledLocations.concat(Array(7 - filledLocations.length).fill('')).slice(0, 7)]
      })
      console.log('[populateTakeoffSheet] Setting location headers:', filledLocations)
    }
  }

  // 3. Apply rate overrides if lineItems have unit_cost values
  // The template has line items in rows 4-75 with scope names in column C
  // We need to match scope_code/scope_name and update column B
  if (lineItems && lineItems.length > 0) {
    // Read existing scope names to find row numbers
    const existingScopesResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${sheetName}'!C4:C80`)}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )

    if (existingScopesResponse.ok) {
      const existingData = await existingScopesResponse.json()
      const existingScopes = existingData.values || []

      // Build a map of scope name -> row number
      const scopeRowMap = {}
      existingScopes.forEach((row, idx) => {
        const scopeName = row[0]?.toString().toLowerCase().trim()
        if (scopeName) {
          scopeRowMap[scopeName] = idx + 4 // Row 4 is index 0
        }
      })

      console.log('[populateTakeoffSheet] Found existing scopes:', Object.keys(scopeRowMap).length)

      // Update unit costs for matching items
      for (const item of lineItems) {
        const unitCost = item.unit_cost || item.unitCost
        if (unitCost === undefined || unitCost === null || unitCost === '') continue

        // Try to match by scope_name
        const scopeName = (item.scope_name || item.scope_code || '').toLowerCase().trim()
        const rowNum = scopeRowMap[scopeName]

        if (rowNum) {
          data.push({
            range: `'${sheetName}'!B${rowNum}`,
            values: [[unitCost]]
          })
          console.log(`[populateTakeoffSheet] Setting rate for "${scopeName}" at B${rowNum}: ${unitCost}`)
        }
      }
    }
  }

  if (data.length === 0) {
    console.log('[populateTakeoffSheet] No updates to make')
    return { updated: 0, reason: 'no_updates_needed' }
  }

  console.log('[populateTakeoffSheet] Batch update data:', JSON.stringify(data, null, 2))

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
    console.error('[populateTakeoffSheet] API error:', error)
    throw new Error(`Failed to populate takeoff sheet: ${error}`)
  }

  return { updated: data.length }
}

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
