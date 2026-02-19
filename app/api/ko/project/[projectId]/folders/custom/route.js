/**
 * Custom Subfolder API — Create custom subfolders for a project
 * POST /api/ko/project/[projectId]/folders/custom
 */

import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/google-sheets'
import { getProjectDriveFolderId, getOrCreateSubfolder } from '@/lib/google-drive'

export async function POST(request, { params }) {
  const { projectId } = await params

  try {
    const body = await request.json()
    const { name } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      )
    }

    const folderName = name.trim()
    const accessToken = await getAccessToken()
    const parentFolderId = await getProjectDriveFolderId(projectId)

    if (!parentFolderId) {
      return NextResponse.json(
        { error: 'No Drive folder found for this project' },
        { status: 404 }
      )
    }

    const folderId = await getOrCreateSubfolder(accessToken, parentFolderId, folderName)

    if (!folderId) {
      return NextResponse.json(
        { error: 'Failed to create folder' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      folder: { id: folderId, name: folderName }
    })
  } catch (err) {
    console.error('[CustomFolder] Create error:', err)
    return NextResponse.json(
      { error: 'Failed to create folder: ' + err.message },
      { status: 500 }
    )
  }
}
