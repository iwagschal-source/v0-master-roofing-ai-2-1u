// POST /api/ko/proposal/[projectId]/export-pdf — Convert Drive DOCX to PDF
import { NextResponse } from 'next/server'
import { getAccessToken } from '@/lib/google-sheets'
import {
  getProjectDriveFolderId,
  getOrCreateSubfolder,
  setFilePublicRead,
} from '@/lib/google-drive'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3'

export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const { driveFileId, filename } = await request.json()

    if (!driveFileId) {
      return NextResponse.json({ error: 'driveFileId is required' }, { status: 400 })
    }

    const accessToken = await getAccessToken()

    // Step 1: Copy the DOCX as a Google Doc (Drive auto-converts)
    const copyRes = await fetch(`${DRIVE_API}/files/${driveFileId}/copy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mimeType: 'application/vnd.google-apps.document',
        name: 'temp-pdf-conversion',
      }),
    })

    if (!copyRes.ok) {
      const err = await copyRes.text()
      console.error('[Proposal PDF] Copy+convert failed:', err)
      return NextResponse.json({ error: 'Failed to convert document' }, { status: 500 })
    }

    const copyResult = await copyRes.json()
    const tempDocId = copyResult.id

    try {
      // Step 2: Export the Google Doc as PDF
      const exportRes = await fetch(
        `${DRIVE_API}/files/${tempDocId}/export?mimeType=application/pdf`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )

      if (!exportRes.ok) {
        const err = await exportRes.text()
        console.error('[Proposal PDF] Export failed:', err)
        return NextResponse.json({ error: 'Failed to export PDF' }, { status: 500 })
      }

      const pdfBuffer = Buffer.from(await exportRes.arrayBuffer())

      // Step 3: Save PDF to Proposals/ subfolder
      const driveFolderId = await getProjectDriveFolderId(projectId)
      if (!driveFolderId) {
        return NextResponse.json({ error: 'No Drive folder for project' }, { status: 404 })
      }

      const proposalsFolderId = await getOrCreateSubfolder(accessToken, driveFolderId, 'Proposals')
      if (!proposalsFolderId) {
        return NextResponse.json({ error: 'Could not access Proposals folder' }, { status: 500 })
      }

      const pdfFilename = filename
        ? filename.replace(/\.docx$/i, '.pdf')
        : `Proposal-${new Date().toISOString().split('T')[0]}.pdf`

      // Multipart upload
      const boundary = '-------pdf-upload-boundary'
      const metadata = {
        name: pdfFilename,
        parents: [proposalsFolderId],
        mimeType: 'application/pdf',
      }

      const multipartBody =
        `--${boundary}\r\n` +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) + '\r\n' +
        `--${boundary}\r\n` +
        'Content-Type: application/pdf\r\n\r\n'

      const multipartEnd = `\r\n--${boundary}--`

      const bodyBuffer = Buffer.concat([
        Buffer.from(multipartBody, 'utf-8'),
        pdfBuffer,
        Buffer.from(multipartEnd, 'utf-8'),
      ])

      const uploadRes = await fetch(
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

      if (!uploadRes.ok) {
        const err = await uploadRes.text()
        console.error('[Proposal PDF] Upload failed:', err)
        return NextResponse.json({ error: 'Failed to save PDF' }, { status: 500 })
      }

      const uploadResult = await uploadRes.json()

      // Set public read permission
      if (uploadResult?.id) {
        await setFilePublicRead(accessToken, uploadResult.id)
      }

      console.log(`[Proposal PDF] Saved: ${pdfFilename} (${uploadResult.id})`)

      return NextResponse.json({
        success: true,
        file: {
          id: uploadResult.id,
          name: uploadResult.name,
          webViewLink: uploadResult.webViewLink,
        },
      })
    } finally {
      // Step 4: Delete the temporary Google Doc conversion
      try {
        await fetch(`${DRIVE_API}/files/${tempDocId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` },
        })
      } catch (cleanupErr) {
        console.warn('[Proposal PDF] Cleanup failed (non-fatal):', cleanupErr.message)
      }
    }
  } catch (err) {
    console.error('[Proposal PDF] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
