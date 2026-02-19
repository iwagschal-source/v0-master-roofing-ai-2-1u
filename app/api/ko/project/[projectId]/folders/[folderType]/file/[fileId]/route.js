/**
 * File management API — Delete a file from a project subfolder
 * DELETE /api/ko/project/[projectId]/folders/[folderType]/file/[fileId]
 */

import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/google-sheets'

const VALID_FOLDER_TYPES = ['drawings', 'bluebeam', 'takeoff', 'markups', 'proposals']

export async function DELETE(request, { params }) {
  const { projectId, folderType, fileId } = await params

  if (!VALID_FOLDER_TYPES.includes(folderType)) {
    return NextResponse.json(
      { error: `Invalid folder type: ${folderType}` },
      { status: 400 }
    )
  }

  if (!fileId) {
    return NextResponse.json(
      { error: 'fileId is required' },
      { status: 400 }
    )
  }

  try {
    const accessToken = await getAccessToken()

    // Move file to trash (soft delete via Drive API)
    const trashRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ trashed: true }),
      }
    )

    if (!trashRes.ok) {
      const errText = await trashRes.text()
      console.error('[FileDelete] Drive API error:', trashRes.status, errText)
      return NextResponse.json(
        { error: 'Failed to delete file from Drive' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, fileId })
  } catch (err) {
    console.error('[FileDelete] Error:', err)
    return NextResponse.json(
      { error: 'Failed to delete file: ' + err.message },
      { status: 500 }
    )
  }
}
