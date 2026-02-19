/**
 * Custom Subfolder Management — Delete custom subfolders
 * DELETE /api/ko/project/[projectId]/folders/custom/[folderId]
 */

import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/google-sheets'

export async function DELETE(request, { params }) {
  const { projectId, folderId } = await params

  if (!folderId) {
    return NextResponse.json(
      { error: 'folderId is required' },
      { status: 400 }
    )
  }

  try {
    const accessToken = await getAccessToken()

    // Move folder and all contents to trash
    const trashRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}`,
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
      console.error('[CustomFolder] Delete error:', trashRes.status, errText)
      return NextResponse.json(
        { error: 'Failed to delete folder from Drive' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, folderId })
  } catch (err) {
    console.error('[CustomFolder] Delete error:', err)
    return NextResponse.json(
      { error: 'Failed to delete folder: ' + err.message },
      { status: 500 }
    )
  }
}
