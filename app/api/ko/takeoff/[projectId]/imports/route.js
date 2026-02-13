/**
 * Imports List API
 *
 * Get list of Bluebeam imports for a project from BigQuery import_history.
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

/**
 * GET /api/ko/takeoff/[projectId]/imports
 * Get list of all imports for a project
 *
 * Returns imports sorted by most recent first
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = await params

    const imports = await runQuery(
      `SELECT import_id, project_id, spreadsheet_id, target_sheet,
              import_type, csv_file_id, csv_filename,
              imported_at, imported_by,
              items_matched, items_unmatched, cells_populated,
              accumulation_mode, status, error_details, notes
       FROM \`master-roofing-intelligence.mr_main.import_history\`
       WHERE project_id = @projectId
       ORDER BY imported_at DESC
       LIMIT 50`,
      { projectId },
      { location: 'US' }
    )

    return NextResponse.json({
      imports: imports.map(row => ({
        ...row,
        imported_at: row.imported_at?.value || row.imported_at
      })),
      total: imports.length
    })

  } catch (err) {
    console.error('Imports list error:', err)
    return NextResponse.json(
      { error: 'Failed to get imports: ' + err.message },
      { status: 500 }
    )
  }
}
