/**
 * Version Management — Google Sheets operations for takeoff version tabs
 *
 * Handles creating new version tabs, copying templates, hiding rows/columns,
 * and managing the version tracker on the Setup tab.
 *
 * Uses the same service account auth as google-sheets.js.
 */

import { getAccessToken, readSheetValues, batchUpdateSheet, indexToLetter } from './google-sheets.js'

const TAKEOFF_TEMPLATE_ID = process.env.GOOGLE_TAKEOFF_TEMPLATE_ID || '1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4'

// Setup tab version tracker starts at row 73 (header) and row 74+ (data)
const VERSION_TRACKER_HEADER_ROW = 73
const VERSION_TRACKER_DATA_START = 74
const VERSION_TRACKER_MAX_ROW = 80 // 7 version slots

// Setup tab column indices (0-based)
const SETUP_COL = {
  ITEM_ID: 0,      // A
  UNIT_COST: 1,    // B
  SCOPE: 2,        // C
  R_VALUE: 3,      // D
  THICKNESS: 4,    // E
  TYPE: 5,         // F
  LOC_START: 6,    // G (first location toggle)
  LOC_END: 12,     // M (last location toggle)
  UOM: 13,         // N
  BID_TYPE: 14,    // O
  TOOL_NAME: 15,   // P (Bluebeam Tool Name)
}

// Rows that are section headers, bundle totals, or grand totals (not items)
const SECTION_HEADER_ROWS = [3, 36, 40, 49]
// Map section header row → section name (for reading location names from header rows)
const SECTION_NAME_BY_HEADER_ROW = { 3: 'ROOFING', 36: 'WATERPROOFING', 40: 'BALCONIES', 49: 'EXTERIOR' }
const BUNDLE_TOTAL_ROWS = [14, 21, 25, 28, 32, 35, 45, 53, 57, 62]
const TOTAL_ROWS = [47, 68, 70]
const NON_ITEM_ROWS = new Set([
  ...SECTION_HEADER_ROWS,
  ...BUNDLE_TOTAL_ROWS,
  ...TOTAL_ROWS,
  1, 2, // title, project name
])

/**
 * Get all sheet tabs with their properties from a spreadsheet.
 * @param {string} spreadsheetId
 * @returns {Promise<Array<{title: string, sheetId: number, index: number}>>}
 */
export async function getSpreadsheetTabs(spreadsheetId) {
  const accessToken = await getAccessToken()
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )
  if (!response.ok) {
    throw new Error(`Failed to get spreadsheet tabs: ${await response.text()}`)
  }
  const data = await response.json()
  return (data.sheets || []).map(s => ({
    title: s.properties.title,
    sheetId: s.properties.sheetId,
    index: s.properties.index,
  }))
}

/**
 * Generate a unique version tab name (YYYY-MM-DD, with -v2, -v3 for duplicates).
 * @param {string[]} existingNames - List of existing tab names
 * @param {string} [dateStr] - Optional date string; defaults to today
 * @returns {string}
 */
export function generateVersionName(existingNames, dateStr = null) {
  const today = dateStr || new Date().toISOString().split('T')[0]
  if (!existingNames.includes(today)) return today

  let suffix = 2
  while (existingNames.includes(`${today}-v${suffix}`)) {
    suffix++
  }
  return `${today}-v${suffix}`
}

/**
 * Copy the DATE tab from the template spreadsheet into the project spreadsheet.
 * Returns the sheetId of the new tab.
 *
 * @param {string} destSpreadsheetId - Project spreadsheet to copy into
 * @returns {Promise<number>} - sheetId of the new tab
 */
export async function copyTemplateTabToProject(destSpreadsheetId) {
  const accessToken = await getAccessToken()

  // 1. Find the DATE tab in the template spreadsheet
  const templateTabs = await getSpreadsheetTabs(TAKEOFF_TEMPLATE_ID)
  const dateTab = templateTabs.find(t => t.title === 'DATE')
  if (!dateTab) {
    throw new Error(`Template spreadsheet has no "DATE" tab. Available: ${templateTabs.map(t => t.title).join(', ')}`)
  }

  // 2. Copy the tab to the destination spreadsheet
  const copyResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TAKEOFF_TEMPLATE_ID}/sheets/${dateTab.sheetId}:copyTo`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ destinationSpreadsheetId: destSpreadsheetId }),
    }
  )

  if (!copyResponse.ok) {
    throw new Error(`Failed to copy template tab: ${await copyResponse.text()}`)
  }

  const copyData = await copyResponse.json()
  console.log(`[version-mgmt] Copied template DATE tab → sheetId ${copyData.sheetId}`)
  return copyData.sheetId
}

/**
 * Rename a sheet tab.
 * @param {string} spreadsheetId
 * @param {number} tabSheetId - The tab's sheetId (not index)
 * @param {string} newName
 */
export async function renameTab(spreadsheetId, tabSheetId, newName) {
  const accessToken = await getAccessToken()
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          updateSheetProperties: {
            properties: { sheetId: tabSheetId, title: newName },
            fields: 'title',
          },
        }],
      }),
    }
  )
  if (!response.ok) {
    throw new Error(`Failed to rename tab: ${await response.text()}`)
  }
  console.log(`[version-mgmt] Renamed tab ${tabSheetId} → "${newName}"`)
}

/**
 * Read the Setup tab configuration: toggles (G-M), config (D-F), bid type (O),
 * item_id (A), unit_cost (B), scope (C) for all item rows.
 *
 * Returns resolved values (formulas computed), not raw formulas.
 *
 * @param {string} spreadsheetId
 * @returns {Promise<{rows: Object[], locationToggles: boolean[], activeLocationCols: number[]}>}
 */
export async function readSetupConfig(spreadsheetId) {
  // Read values (formulas resolved) for rows 1-70
  const values = await readSheetValues(spreadsheetId, "'Setup'!A1:R70")

  // Extract location names from section header rows (G-M columns)
  const sectionLocationNames = {}
  for (const headerRow of SECTION_HEADER_ROWS) {
    const headerRowData = values[headerRow - 1] || []
    const sectionName = SECTION_NAME_BY_HEADER_ROW[headerRow]
    const names = []
    for (let c = SETUP_COL.LOC_START; c <= SETUP_COL.LOC_END; c++) {
      names.push((headerRowData[c] || '').toString().trim())
    }
    sectionLocationNames[sectionName] = names
  }

  // Build section membership lookup from header row boundaries
  function getSectionForRow(rowNum) {
    for (let i = SECTION_HEADER_ROWS.length - 1; i >= 0; i--) {
      if (rowNum > SECTION_HEADER_ROWS[i]) return SECTION_NAME_BY_HEADER_ROW[SECTION_HEADER_ROWS[i]]
    }
    return null
  }

  const rows = []
  // Track which location columns (G-M, indices 6-12) have any toggles
  const locationColHasToggle = new Array(7).fill(false) // G through M

  for (let rowIdx = 0; rowIdx < values.length; rowIdx++) {
    const rowNum = rowIdx + 1 // 1-based
    if (NON_ITEM_ROWS.has(rowNum)) continue

    const row = values[rowIdx] || []
    const itemId = (row[SETUP_COL.ITEM_ID] || '').toString().trim()
    if (!itemId || !itemId.startsWith('MR-')) continue

    // Check location toggles (G-M)
    const toggles = []
    let hasAnyToggle = false
    for (let c = SETUP_COL.LOC_START; c <= SETUP_COL.LOC_END; c++) {
      const val = (row[c] || '').toString().trim()
      const isToggled = val !== '' && val !== '0' && val.toUpperCase() !== 'FALSE'
      toggles.push(isToggled)
      if (isToggled) {
        hasAnyToggle = true
        locationColHasToggle[c - SETUP_COL.LOC_START] = true
      }
    }

    // Read tool name from column P
    const toolName = (row[SETUP_COL.TOOL_NAME] || '').toString().trim()

    rows.push({
      rowNum,
      itemId,
      section: getSectionForRow(rowNum),
      unitCost: (row[SETUP_COL.UNIT_COST] || '').toString().trim(),
      scope: (row[SETUP_COL.SCOPE] || '').toString().trim(),
      rValue: (row[SETUP_COL.R_VALUE] || '').toString().trim(),
      thickness: (row[SETUP_COL.THICKNESS] || '').toString().trim(),
      materialType: (row[SETUP_COL.TYPE] || '').toString().trim(),
      bidType: (row[SETUP_COL.BID_TYPE] || '').toString().trim(),
      toolName,
      toggles,
      hasAnyToggle,
    })
  }

  // Which column indices (0-based within G-M range) have at least one toggle
  const activeLocationCols = locationColHasToggle
    .map((has, i) => has ? SETUP_COL.LOC_START + i : -1)
    .filter(i => i >= 0)

  const itemsCount = rows.filter(r => r.hasAnyToggle).length
  const locationsCount = activeLocationCols.length

  return { rows, locationToggles: locationColHasToggle, activeLocationCols, itemsCount, locationsCount, sectionLocationNames }
}

/**
 * Transfer Setup tab configuration to a new version tab.
 * Writes scope, R/IN/TYPE, bid type to the correct rows.
 *
 * @param {string} spreadsheetId
 * @param {string} versionTabName - Name of the new version tab
 * @param {Object[]} setupRows - From readSetupConfig()
 * @param {string} projectName - Project display name for A2
 */
export async function transferSetupToVersion(spreadsheetId, versionTabName, setupRows, projectName) {
  const batchData = []

  // Write project name to row 2
  batchData.push({
    range: `'${versionTabName}'!A2`,
    values: [[projectName]],
  })

  for (const item of setupRows) {
    const r = item.rowNum

    // On takeoff tab: C=scope, D=R, E=IN, F=TYPE, P=bid type
    if (item.scope) {
      batchData.push({ range: `'${versionTabName}'!C${r}`, values: [[item.scope]] })
    }
    if (item.rValue) {
      batchData.push({ range: `'${versionTabName}'!D${r}`, values: [[item.rValue]] })
    }
    if (item.thickness) {
      batchData.push({ range: `'${versionTabName}'!E${r}`, values: [[item.thickness]] })
    }
    if (item.materialType) {
      batchData.push({ range: `'${versionTabName}'!F${r}`, values: [[item.materialType]] })
    }
    if (item.bidType) {
      batchData.push({ range: `'${versionTabName}'!P${r}`, values: [[item.bidType]] })
    }
  }

  if (batchData.length > 0) {
    await batchUpdateSheet(spreadsheetId, batchData)
    console.log(`[version-mgmt] Transferred ${batchData.length} config values to "${versionTabName}"`)
  }
}

/**
 * Hide rows on a version tab where the item has no location toggles on the Setup tab.
 * Rule #1: Only hide if ALL location cells (G-M) are empty for that row.
 *
 * @param {string} spreadsheetId
 * @param {number} tabSheetId - The version tab's sheetId
 * @param {Object[]} setupRows - From readSetupConfig()
 */
export async function hideEmptyRows(spreadsheetId, tabSheetId, setupRows) {
  const accessToken = await getAccessToken()
  const requests = []

  for (const item of setupRows) {
    if (!item.hasAnyToggle) {
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId: tabSheetId,
            dimension: 'ROWS',
            startIndex: item.rowNum - 1, // 0-based
            endIndex: item.rowNum,        // exclusive
          },
          properties: { hiddenByUser: true },
          fields: 'hiddenByUser',
        },
      })
    }
  }

  if (requests.length === 0) {
    console.log('[version-mgmt] No rows to hide')
    return []
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to hide rows: ${await response.text()}`)
  }

  const hiddenRowNums = setupRows.filter(r => !r.hasAnyToggle).map(r => r.rowNum)
  console.log(`[version-mgmt] Hidden ${hiddenRowNums.length} rows (no toggles)`)
  return hiddenRowNums
}

/**
 * Hide location columns (G-M) on a version tab where NO item has a toggle.
 *
 * @param {string} spreadsheetId
 * @param {number} tabSheetId - The version tab's sheetId
 * @param {boolean[]} locationToggles - 7-element array, true = at least one toggle in that column
 */
export async function hideEmptyColumns(spreadsheetId, tabSheetId, locationToggles) {
  const accessToken = await getAccessToken()
  const requests = []

  for (let i = 0; i < locationToggles.length; i++) {
    if (!locationToggles[i]) {
      const colIndex = SETUP_COL.LOC_START + i
      requests.push({
        updateDimensionProperties: {
          range: {
            sheetId: tabSheetId,
            dimension: 'COLUMNS',
            startIndex: colIndex,
            endIndex: colIndex + 1,
          },
          properties: { hiddenByUser: true },
          fields: 'hiddenByUser',
        },
      })
    }
  }

  if (requests.length === 0) {
    console.log('[version-mgmt] No columns to hide')
    return []
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to hide columns: ${await response.text()}`)
  }

  const hiddenColIndices = locationToggles
    .map((has, i) => !has ? SETUP_COL.LOC_START + i : -1)
    .filter(i => i >= 0)
  console.log(`[version-mgmt] Hidden ${hiddenColIndices.length} location columns (no toggles)`)
  return hiddenColIndices
}

/**
 * Read the version tracker from the Setup tab (rows 74-80).
 *
 * @param {string} spreadsheetId
 * @returns {Promise<Array<{row: number, active: boolean, sheetName: string, created: string, itemsCount: number, locationsCount: number, status: string}>>}
 */
export async function readVersionTracker(spreadsheetId) {
  const values = await readSheetValues(
    spreadsheetId,
    `'Setup'!A${VERSION_TRACKER_DATA_START}:F${VERSION_TRACKER_MAX_ROW}`
  )

  const versions = []
  for (let i = 0; i < values.length; i++) {
    const row = values[i] || []
    const sheetName = (row[1] || '').toString().trim()
    if (!sheetName) continue

    versions.push({
      row: VERSION_TRACKER_DATA_START + i,
      active: row[0] === true || row[0] === 'TRUE',
      sheetName,
      created: (row[2] || '').toString().trim(),
      itemsCount: parseInt(row[3]) || 0,
      locationsCount: parseInt(row[4]) || 0,
      status: (row[5] || '').toString().trim(),
    })
  }

  return versions
}

/**
 * Add a new entry to the version tracker on the Setup tab.
 * Also sets this version as active (clears other active flags).
 *
 * @param {string} spreadsheetId
 * @param {string} sheetName - The new version tab name
 * @param {number} itemsCount - Number of items with toggles
 * @param {number} locationsCount - Number of active location columns
 */
export async function addVersionTrackerEntry(spreadsheetId, sheetName, itemsCount, locationsCount) {
  const versions = await readVersionTracker(spreadsheetId)
  const batchData = []

  // Clear active flag on all existing versions
  for (const v of versions) {
    if (v.active) {
      batchData.push({ range: `'Setup'!A${v.row}`, values: [[false]] })
    }
  }

  // Find first empty row for new entry
  const usedRows = new Set(versions.map(v => v.row))
  let newRow = VERSION_TRACKER_DATA_START
  while (usedRows.has(newRow) && newRow <= VERSION_TRACKER_MAX_ROW) {
    newRow++
  }

  if (newRow > VERSION_TRACKER_MAX_ROW) {
    console.warn('[version-mgmt] Version tracker full (max 7 versions). Overwriting last row.')
    newRow = VERSION_TRACKER_MAX_ROW
  }

  const now = new Date().toISOString().split('T')[0]
  batchData.push({
    range: `'Setup'!A${newRow}:F${newRow}`,
    values: [[true, sheetName, now, itemsCount, locationsCount, 'In Progress']],
  })

  await batchUpdateSheet(spreadsheetId, batchData)
  console.log(`[version-mgmt] Added version "${sheetName}" to tracker row ${newRow}`)
}

/**
 * Set a specific version as active (only one active at a time).
 *
 * @param {string} spreadsheetId
 * @param {string} targetSheetName - The version to make active
 */
export async function setActiveVersion(spreadsheetId, targetSheetName) {
  const versions = await readVersionTracker(spreadsheetId)
  const batchData = []

  for (const v of versions) {
    const shouldBeActive = v.sheetName === targetSheetName
    if (v.active !== shouldBeActive) {
      batchData.push({ range: `'Setup'!A${v.row}`, values: [[shouldBeActive]] })
    }
  }

  if (batchData.length > 0) {
    await batchUpdateSheet(spreadsheetId, batchData)
  }
  console.log(`[version-mgmt] Set active version: "${targetSheetName}"`)
}

/**
 * Update a version's status in the tracker.
 *
 * @param {string} spreadsheetId
 * @param {string} sheetName - The version to update
 * @param {string} status - New status value
 */
export async function updateVersionStatus(spreadsheetId, sheetName, status) {
  const versions = await readVersionTracker(spreadsheetId)
  const version = versions.find(v => v.sheetName === sheetName)
  if (!version) {
    throw new Error(`Version "${sheetName}" not found in tracker`)
  }

  await batchUpdateSheet(spreadsheetId, [{
    range: `'Setup'!F${version.row}`,
    values: [[status]],
  }])
  console.log(`[version-mgmt] Updated "${sheetName}" status to "${status}"`)
}

/**
 * Copy an existing version tab to a new dated sheet, preserving ALL data, formulas,
 * hidden rows/columns, and formatting.
 *
 * @param {string} spreadsheetId
 * @param {string} sourceSheetName - Name of the version tab to copy
 * @returns {Promise<{newSheetName: string, newSheetId: number}>}
 */
export async function copyExistingVersion(spreadsheetId, sourceSheetName) {
  const accessToken = await getAccessToken()

  const tabs = await getSpreadsheetTabs(spreadsheetId)
  const sourceTab = tabs.find(t => t.title === sourceSheetName)
  if (!sourceTab) {
    throw new Error(`Source version tab "${sourceSheetName}" not found`)
  }

  const copyResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/sheets/${sourceTab.sheetId}:copyTo`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ destinationSpreadsheetId: spreadsheetId }),
    }
  )

  if (!copyResponse.ok) {
    throw new Error(`Failed to copy version: ${await copyResponse.text()}`)
  }

  const copyData = await copyResponse.json()
  const newSheetId = copyData.sheetId

  const existingNames = tabs.map(t => t.title)
  const newName = generateVersionName(existingNames)
  await renameTab(spreadsheetId, newSheetId, newName)

  console.log(`[version-mgmt] Copied "${sourceSheetName}" → "${newName}"`)
  return { newSheetName: newName, newSheetId }
}

/**
 * Check if a version tab has any data in location cells (G-M, rows 4-67).
 *
 * @param {string} spreadsheetId
 * @param {string} sheetName
 * @returns {Promise<boolean>}
 */
export async function versionHasData(spreadsheetId, sheetName) {
  const values = await readSheetValues(spreadsheetId, `'${sheetName}'!G4:M67`)
  for (const row of values) {
    if (!row) continue
    for (const cell of row) {
      const val = (cell || '').toString().trim()
      if (val && val !== '0') return true
    }
  }
  return false
}

/**
 * Delete a version tab (safe: only if no data exists).
 *
 * @param {string} spreadsheetId
 * @param {string} sheetName - Tab name to delete
 * @param {boolean} force - If true, skip the data check
 * @returns {Promise<{deleted: boolean, reason?: string}>}
 */
export async function deleteVersion(spreadsheetId, sheetName, force = false) {
  if (sheetName.toLowerCase() === 'setup' || sheetName.toLowerCase() === 'library') {
    return { deleted: false, reason: 'Cannot delete Setup or Library tabs' }
  }

  if (!force) {
    const hasData = await versionHasData(spreadsheetId, sheetName)
    if (hasData) {
      return { deleted: false, reason: 'Version has data. Use force=true to override.' }
    }
  }

  const accessToken = await getAccessToken()
  const tabs = await getSpreadsheetTabs(spreadsheetId)
  const tab = tabs.find(t => t.title === sheetName)
  if (!tab) {
    return { deleted: false, reason: `Tab "${sheetName}" not found` }
  }

  const versionTabs = tabs.filter(t =>
    t.title.toLowerCase() !== 'setup' && t.title.toLowerCase() !== 'library'
  )
  if (versionTabs.length <= 1) {
    return { deleted: false, reason: 'Cannot delete the last version tab' }
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{ deleteSheet: { sheetId: tab.sheetId } }],
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to delete tab: ${await response.text()}`)
  }

  // Remove from version tracker
  const versions = await readVersionTracker(spreadsheetId)
  const version = versions.find(v => v.sheetName === sheetName)
  if (version) {
    await batchUpdateSheet(spreadsheetId, [{
      range: `'Setup'!A${version.row}:F${version.row}`,
      values: [['', '', '', '', '', '']],
    }])
  }

  console.log(`[version-mgmt] Deleted version tab "${sheetName}"`)
  return { deleted: true }
}
