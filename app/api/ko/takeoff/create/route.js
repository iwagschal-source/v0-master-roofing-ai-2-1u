/**
 * Create Takeoff API (Step 8.B.6)
 *
 * Creates a new standalone Google Sheets takeoff workbook for a project.
 * Each project gets its own spreadsheet (not tabs in a master sheet).
 */

import { NextResponse } from 'next/server'
import { createProjectTakeoffSheet, populateTakeoffSheet } from '@/lib/google-sheets'
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

    // Check if project already has a takeoff spreadsheet
    const existingCheck = await runQuery(
      `SELECT takeoff_spreadsheet_id FROM \`master-roofing-intelligence.mr_main.project_folders\`
       WHERE id = @projectId AND takeoff_spreadsheet_id IS NOT NULL`,
      { projectId: project_id },
      { location: 'US' }
    )

    if (existingCheck.length > 0 && existingCheck[0].takeoff_spreadsheet_id) {
      const existingId = existingCheck[0].takeoff_spreadsheet_id
      return NextResponse.json({
        success: true,
        existed: true,
        project_id,
        spreadsheetId: existingId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${existingId}/edit`,
        embedUrl: `https://docs.google.com/spreadsheets/d/${existingId}/edit?embedded=true&rm=minimal`,
        message: 'Takeoff spreadsheet already exists'
      })
    }

    // Create new standalone Google Sheet for this project
    const result = await createProjectTakeoffSheet(project_id, project_name)

    // Populate sheet with locations and line items if provided
    if ((columns && columns.length > 0) || (lineItems && lineItems.length > 0)) {
      try {
        await populateTakeoffSheet(
          result.spreadsheetId,
          columns || [],
          lineItems || []
        )
      } catch (popErr) {
        console.warn('Failed to populate sheet (continuing):', popErr.message)
      }
    }

    // Save spreadsheet_id to BigQuery project_folders
    try {
      await runQuery(
        `UPDATE \`master-roofing-intelligence.mr_main.project_folders\`
         SET takeoff_spreadsheet_id = @spreadsheetId,
             updated_at = CURRENT_TIMESTAMP()
         WHERE id = @projectId`,
        {
          spreadsheetId: result.spreadsheetId,
          projectId: project_id
        },
        { location: 'US' }
      )
    } catch (bqErr) {
      console.warn('Failed to save spreadsheet_id to BigQuery:', bqErr.message)
      // Don't fail the request - sheet was created successfully
    }

    return NextResponse.json({
      success: true,
      existed: false,
      project_id,
      ...result,
      message: 'Takeoff spreadsheet created'
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
 * Check if a takeoff spreadsheet exists for a project
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
      `SELECT takeoff_spreadsheet_id FROM \`master-roofing-intelligence.mr_main.project_folders\`
       WHERE id = @projectId`,
      { projectId },
      { location: 'US' }
    )

    if (result.length > 0 && result[0].takeoff_spreadsheet_id) {
      const spreadsheetId = result[0].takeoff_spreadsheet_id
      return NextResponse.json({
        exists: true,
        spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        embedUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit?embedded=true&rm=minimal`,
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
