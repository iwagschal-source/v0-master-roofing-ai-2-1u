// Google Drive API utilities — Phase 12 Project Folder System
// Shared functions for subfolder management, file listing, and uploads
import { getAccessToken } from './google-sheets.js'
import { runQuery } from './bigquery.js'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

// Canonical subfolder names (workflow order)
export const FOLDER_CATEGORIES = ['Drawings', 'Bluebeam', 'Takeoff', 'Markups', 'Proposals']
export const FOLDER_KEYS = ['drawings', 'bluebeam', 'takeoff', 'markups', 'proposals']

/**
 * Get the Drive folder ID for a project from BigQuery
 */
export async function getProjectDriveFolderId(projectId) {
  const rows = await runQuery(
    `SELECT drive_folder_id FROM \`master-roofing-intelligence.mr_main.project_folders\`
     WHERE id = @projectId`,
    { projectId },
    { location: 'US' }
  )
  return rows?.[0]?.drive_folder_id || null
}

/**
 * Find or create a subfolder within a parent Drive folder
 */
export async function getOrCreateSubfolder(accessToken, parentFolderId, subfolderName) {
  try {
    const q = `name='${subfolderName}' and '${parentFolderId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`
    const res = await fetch(
      `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    if (res.ok) {
      const data = await res.json()
      if (data.files?.length > 0) return data.files[0].id
    }

    // Create if not found
    const createRes = await fetch(`${DRIVE_API}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: subfolderName,
        mimeType: FOLDER_MIME,
        parents: [parentFolderId],
      }),
    })
    if (createRes.ok) {
      const folder = await createRes.json()
      console.log(`[Drive] Created subfolder: ${subfolderName} (${folder.id})`)
      return folder.id
    }
    return null
  } catch (err) {
    console.error(`[Drive] Failed to get/create subfolder ${subfolderName}:`, err)
    return null
  }
}

/**
 * Ensure all 5 standard subfolders exist for a project
 * Returns map: { drawings: id, bluebeam: id, takeoff: id, markups: id, proposals: id }
 */
export async function ensureAllSubfolders(accessToken, parentFolderId) {
  const result = {}
  for (const name of FOLDER_CATEGORIES) {
    const id = await getOrCreateSubfolder(accessToken, parentFolderId, name)
    result[name.toLowerCase()] = id
  }
  return result
}

/**
 * List files in a Drive folder
 * Returns array of { id, name, mimeType, size, modifiedTime, webViewLink, webContentLink }
 */
export async function listFilesInFolder(accessToken, folderId) {
  const q = `'${folderId}' in parents and trashed=false and mimeType!='${FOLDER_MIME}'`
  const fields = 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink)'
  const res = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=${fields}&orderBy=modifiedTime desc&pageSize=100`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.files || []
}

/**
 * Lightweight check: which subfolders have at least 1 file
 * Returns { drawings: boolean, bluebeam: boolean, ... }
 */
export async function getSubfolderStatus(accessToken, parentFolderId) {
  const status = {}
  // First, list all subfolders
  const q = `'${parentFolderId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`
  const res = await fetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )

  if (!res.ok) {
    for (const key of FOLDER_KEYS) status[key] = false
    return status
  }

  const data = await res.json()
  const subfolders = data.files || []

  // Check each category
  for (const key of FOLDER_KEYS) {
    const canonicalName = FOLDER_CATEGORIES[FOLDER_KEYS.indexOf(key)]
    const folder = subfolders.find(f => f.name === canonicalName)
    if (!folder) {
      status[key] = false
      continue
    }
    // Check if folder has at least 1 non-folder file
    const fileQ = `'${folder.id}' in parents and trashed=false and mimeType!='${FOLDER_MIME}'`
    const fileRes = await fetch(
      `${DRIVE_API}/files?q=${encodeURIComponent(fileQ)}&fields=files(id)&pageSize=1`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )
    if (fileRes.ok) {
      const fileData = await fileRes.json()
      status[key] = (fileData.files?.length || 0) > 0
    } else {
      status[key] = false
    }
  }

  return status
}

/**
 * Upload a file to a Drive folder via multipart upload
 * Returns { id, name, webViewLink } or null on failure
 */
export async function uploadFileToDrive(accessToken, folderId, fileName, fileBuffer, mimeType) {
  const boundary = '-------folder-upload-boundary'
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: mimeType || 'application/octet-stream',
  }

  const multipartBody =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) + '\r\n' +
    `--${boundary}\r\n` +
    `Content-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`

  const multipartEnd = `\r\n--${boundary}--`

  const bodyBuffer = Buffer.concat([
    Buffer.from(multipartBody, 'utf-8'),
    fileBuffer,
    Buffer.from(multipartEnd, 'utf-8'),
  ])

  const res = await fetch(
    `${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length.toString(),
      },
      body: bodyBuffer,
    }
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('[Drive] Upload failed:', err)
    return null
  }

  return res.json()
}
