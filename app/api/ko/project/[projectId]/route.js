/**
 * Project API — DELETE handler
 * DELETE /api/ko/project/[projectId]
 * Soft-deletes a project by setting status='deleted' in BigQuery
 * and optionally trashes the Drive folder
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'
import { getAccessToken } from '@/lib/google-sheets'
import { google } from 'googleapis'

export async function DELETE(request, { params }) {
  try {
    const { projectId } = await params

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    // Verify project exists and get drive_folder_id
    const [rows] = await runQuery(
      `SELECT id, project_name, drive_folder_id
       FROM \`master-roofing-intelligence.mr_main.project_folders\`
       WHERE id = @projectId`,
      { projectId }
    )

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = rows[0]

    // Soft-delete: set status to 'deleted'
    await runQuery(
      `UPDATE \`master-roofing-intelligence.mr_main.project_folders\`
       SET status = 'deleted', updated_at = CURRENT_TIMESTAMP()
       WHERE id = @projectId`,
      { projectId }
    )

    // Optionally trash the Drive folder (not permanent delete)
    if (project.drive_folder_id) {
      try {
        const accessToken = await getAccessToken()
        if (accessToken) {
          const auth = new google.auth.OAuth2()
          auth.setCredentials({ access_token: accessToken })
          const drive = google.drive({ version: 'v3', auth })
          await drive.files.update({
            fileId: project.drive_folder_id,
            requestBody: { trashed: true },
            supportsAllDrives: true,
          })
        }
      } catch (driveErr) {
        // Log but don't fail — BigQuery delete succeeded
        console.error('Failed to trash Drive folder:', driveErr.message)
      }
    }

    return NextResponse.json({
      success: true,
      projectId,
      projectName: project.project_name,
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project', details: error.message },
      { status: 500 }
    )
  }
}
