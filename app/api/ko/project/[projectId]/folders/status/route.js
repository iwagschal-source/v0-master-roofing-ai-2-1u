// GET /api/ko/project/[projectId]/folders/status — Lightweight folder status for card icons
import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/google-sheets'
import { getProjectDriveFolderId, getSubfolderStatus } from '@/lib/google-drive'

export async function GET(request, { params }) {
  try {
    const { projectId } = await params

    const driveFolderId = await getProjectDriveFolderId(projectId)
    if (!driveFolderId) {
      return NextResponse.json({
        drawings: false,
        bluebeam: false,
        takeoff: false,
        markups: false,
        proposals: false,
      })
    }

    const accessToken = await getAccessToken()
    const status = await getSubfolderStatus(accessToken, driveFolderId)

    return NextResponse.json(status)
  } catch (err) {
    console.error('[Folder Status] Error:', err)
    return NextResponse.json({
      drawings: false,
      bluebeam: false,
      takeoff: false,
      markups: false,
      proposals: false,
    })
  }
}
