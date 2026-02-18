// GET /api/ko/project/[projectId]/folders — Full folder structure with file lists
import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/google-sheets'
import {
  getProjectDriveFolderId,
  ensureAllSubfolders,
  listFilesInFolder,
  FOLDER_KEYS,
} from '@/lib/google-drive'

export async function GET(request, { params }) {
  try {
    const { projectId } = await params

    const driveFolderId = await getProjectDriveFolderId(projectId)
    if (!driveFolderId) {
      return NextResponse.json(
        { error: 'No Drive folder found for this project' },
        { status: 404 }
      )
    }

    const accessToken = await getAccessToken()

    // Ensure all 5 subfolders exist
    const subfolderIds = await ensureAllSubfolders(accessToken, driveFolderId)

    // List files in each subfolder
    const folders = {}
    for (const key of FOLDER_KEYS) {
      const folderId = subfolderIds[key]
      if (!folderId) {
        folders[key] = { id: null, files: [] }
        continue
      }
      const files = await listFilesInFolder(accessToken, folderId)
      folders[key] = { id: folderId, files }
    }

    return NextResponse.json({ folders })
  } catch (err) {
    console.error('[Folders API] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
