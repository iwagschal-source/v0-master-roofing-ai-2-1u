// POST /api/ko/project/[projectId]/folders/[folderType]/upload — Upload file to subfolder
import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/google-sheets'
import {
  getProjectDriveFolderId,
  getOrCreateSubfolder,
  uploadFileToDrive,
  FOLDER_KEYS,
  FOLDER_CATEGORIES,
} from '@/lib/google-drive'

export async function POST(request, { params }) {
  try {
    const { projectId, folderType } = await params

    // Validate folder type
    if (!FOLDER_KEYS.includes(folderType)) {
      return NextResponse.json(
        { error: `Invalid folder type: ${folderType}. Must be one of: ${FOLDER_KEYS.join(', ')}` },
        { status: 400 }
      )
    }

    const driveFolderId = await getProjectDriveFolderId(projectId)
    if (!driveFolderId) {
      return NextResponse.json(
        { error: 'No Drive folder found for this project' },
        { status: 404 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const accessToken = await getAccessToken()

    // Get or create the target subfolder
    const canonicalName = FOLDER_CATEGORIES[FOLDER_KEYS.indexOf(folderType)]
    const subfolderId = await getOrCreateSubfolder(accessToken, driveFolderId, canonicalName)
    if (!subfolderId) {
      return NextResponse.json(
        { error: `Could not access ${canonicalName} folder` },
        { status: 500 }
      )
    }

    // Upload file
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadFileToDrive(
      accessToken,
      subfolderId,
      file.name,
      fileBuffer,
      file.type || 'application/octet-stream'
    )

    if (!result) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      file: { id: result.id, name: result.name, webViewLink: result.webViewLink },
    })
  } catch (err) {
    console.error('[Folder Upload] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
