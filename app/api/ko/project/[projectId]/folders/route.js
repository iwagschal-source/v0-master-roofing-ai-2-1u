// GET /api/ko/project/[projectId]/folders — Full folder structure with file lists
// POST /api/ko/project/[projectId]/folders — Create Drive folder structure for project
import { NextResponse } from 'next/server'
import { getAccessToken, getOrCreateProjectFolder } from '@/lib/google-sheets'
import {
  getProjectDriveFolderId,
  ensureAllSubfolders,
  listFilesInFolder,
  FOLDER_KEYS,
} from '@/lib/google-drive'
import { runQuery } from '@/lib/bigquery'

export async function GET(request, { params }) {
  try {
    const { projectId } = await params

    const driveFolderId = await getProjectDriveFolderId(projectId)
    if (!driveFolderId) {
      return NextResponse.json(
        { error: 'No Drive folder found for this project', needsSetup: true },
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

/**
 * POST — Create Drive folder structure for a project that doesn't have one yet
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params

    // Get project name from BigQuery
    const rows = await runQuery(
      `SELECT project_name FROM \`master-roofing-intelligence.mr_main.project_folders\`
       WHERE id = @projectId`,
      { projectId },
      { location: 'US' }
    )

    if (!rows?.length) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const projectName = rows[0].project_name || projectId

    // Create Drive folder with all 5 subfolders
    const result = await getOrCreateProjectFolder(projectId, projectName)

    return NextResponse.json({
      success: true,
      folderId: result.folderId,
    })
  } catch (err) {
    console.error('[Folders API] Create error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
