/**
 * Compare Import API
 *
 * Get details of a specific import for comparison view.
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

/**
 * GET /api/ko/takeoff/[projectId]/compare/[importId]
 * Get import details for before/after comparison
 */
export async function GET(request, { params }) {
  try {
    const { projectId, importId } = await params

    const imports = await runQuery(
      `SELECT import_id, project_id, spreadsheet_id, target_sheet,
              import_type, csv_file_id, csv_filename,
              imported_at, imported_by,
              items_matched, items_unmatched, cells_populated,
              accumulation_mode, status, error_details, notes
       FROM \`master-roofing-intelligence.mr_main.import_history\`
       WHERE project_id = @projectId AND import_id = @importId`,
      { projectId, importId },
      { location: 'US' }
    )

    if (imports.length === 0) {
      return NextResponse.json(
        { error: 'Import not found' },
        { status: 404 }
      )
    }

    const imp = imports[0]
    return NextResponse.json({
      import: {
        ...imp,
        imported_at: imp.imported_at?.value || imp.imported_at,
        error_details: imp.error_details ? JSON.parse(imp.error_details) : null
      }
    })

  } catch (err) {
    console.error('Compare error:', err)
    return NextResponse.json(
      { error: 'Failed to get import details: ' + err.message },
      { status: 500 }
    )
  }
}
