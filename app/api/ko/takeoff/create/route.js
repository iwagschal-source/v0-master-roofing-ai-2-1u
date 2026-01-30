/**
 * Create Takeoff API (Step 8.B.6 + 8.B.7)
 *
 * Creates a new standalone Google Sheets takeoff workbook for a project.
 * Also creates project folder structure in Google Drive:
 * KO Projects > [Project] > Drawings, Markups, Proposals
 */

import { NextResponse } from 'next/server'
import { createProjectTakeoffSheet, populateTakeoffSheet, shareSheet } from '@/lib/google-sheets'
import { runQuery } from '@/lib/bigquery'

/**
 * POST /api/ko/takeoff/create
 * Create a new standalone takeoff Google Sheet for a project
 *
 * Body:
 * - project_id: The project ID (MD5 hash)
 * - project_name: Human-readable project name
 * - columns: Location columns [{id, name, mappings}] (optional)
 * - lineItems: Selected line items [{scope_code, scope_name, ...}] (optional)
 *
 * Returns:
 * - spreadsheetId: The new spreadsheet ID
 * - spreadsheetUrl: URL for editing
 * - embedUrl: URL for embedding
 * - folderId: Project folder ID in Google Drive
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { project_id, project_name, columns, lineItems } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    // Check if project already has a takeoff spreadsheet and/or folder
    const existingCheck = await runQuery(
      `SELECT takeoff_spreadsheet_id, drive_folder_id, drive_drawings_folder_id
       FROM \`master-roofing-intelligence.mr_main.project_folders\`
       WHERE id = @projectId`,
      { projectId: project_id },
      { location: 'US' }
    )

    const existing = existingCheck.length > 0 ? existingCheck[0] : null
    const existingSpreadsheetId = existing?.takeoff_spreadsheet_id
    const existingFolderId = existing?.drive_folder_id

    // If spreadsheet already exists, return it
    if (existingSpreadsheetId) {
      return NextResponse.json({
        success: true,
        existed: true,
        project_id,
        spreadsheetId: existingSpreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${existingSpreadsheetId}/edit`,
        embedUrl: `https://docs.google.com/spreadsheets/d/${existingSpreadsheetId}/edit?embedded=true&rm=minimal`,
        folderId: existingFolderId,
        message: 'Takeoff spreadsheet already exists'
      })
    }

    // Create new standalone Google Sheet in project folder
    // This also creates the folder structure if it doesn't exist
    const result = await createProjectTakeoffSheet(project_id, project_name, existingFolderId)

    // Share sheet with anyone who has the link (editor access)
    try {
      await shareSheet(result.spreadsheetId, 'writer')
      console.log(`[Sheets] Shared spreadsheet ${result.spreadsheetId} with link`)
    } catch (shareErr) {
      console.warn('Failed to share sheet (continuing):', shareErr.message)
    }

    // Populate sheet with project name, locations, and rate overrides
    console.log('[takeoff/create] Received data:', {
      project_name,
      columnsCount: columns?.length || 0,
      lineItemsCount: lineItems?.length || 0,
      columnsSample: columns?.slice(0, 2),
      lineItemsSample: lineItems?.slice(0, 2)
    })

    // Always try to populate - even if just to set project name
    try {
      console.log('[takeoff/create] Calling populateTakeoffSheet...')
      const popResult = await populateTakeoffSheet(
        result.spreadsheetId,
        columns || [],
        lineItems || [],
        project_name  // Pass project name to set in B2
      )
      console.log('[takeoff/create] populateTakeoffSheet result:', popResult)
    } catch (popErr) {
      console.error('[takeoff/create] Failed to populate sheet:', popErr.message)
    }

    // Save spreadsheet_id and folder IDs to BigQuery
    try {
      await runQuery(
        `UPDATE \`master-roofing-intelligence.mr_main.project_folders\`
         SET takeoff_spreadsheet_id = @spreadsheetId,
             drive_folder_id = @folderId,
             drive_drawings_folder_id = @drawingsFolderId,
             updated_at = CURRENT_TIMESTAMP()
         WHERE id = @projectId`,
        {
          spreadsheetId: result.spreadsheetId,
          folderId: result.folderId || null,
          drawingsFolderId: result.drawingsFolderId || null,
          projectId: project_id
        },
        { location: 'US' }
      )
    } catch (bqErr) {
      console.warn('Failed to save IDs to BigQuery:', bqErr.message)
      // Don't fail the request - sheet was created successfully
    }

    return NextResponse.json({
      success: true,
      existed: false,
      project_id,
      ...result,
      message: 'Takeoff spreadsheet and project folder created',
      debug: {
        receivedColumns: columns?.length || 0,
        receivedLineItems: lineItems?.length || 0
      }
    })

  } catch (err) {
    console.error('Takeoff create error:', err)
    return NextResponse.json(
      { error: 'Failed to create takeoff: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ko/takeoff/create?project_id=xxx
 * Check if a takeoff spreadsheet and folder exists for a project
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    const result = await runQuery(
      `SELECT takeoff_spreadsheet_id, drive_folder_id, drive_drawings_folder_id
       FROM \`master-roofing-intelligence.mr_main.project_folders\`
       WHERE id = @projectId`,
      { projectId },
      { location: 'US' }
    )

    if (result.length > 0 && result[0].takeoff_spreadsheet_id) {
      const { takeoff_spreadsheet_id: spreadsheetId, drive_folder_id, drive_drawings_folder_id } = result[0]
      return NextResponse.json({
        exists: true,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        embedUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?embedded=true&rm=minimal`,
        folderId: drive_folder_id,
        folderUrl: drive_folder_id ? `https://drive.google.com/drive/folders/${drive_folder_id}` : null,
        drawingsFolderId: drive_drawings_folder_id,
      })
    }

    return NextResponse.json({ exists: false })

  } catch (err) {
    console.error('Takeoff check error:', err)
    return NextResponse.json(
      { error: 'Failed to check takeoff: ' + err.message },
      { status: 500 }
    )
  }
}
