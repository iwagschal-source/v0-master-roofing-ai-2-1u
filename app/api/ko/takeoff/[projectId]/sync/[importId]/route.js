/**
 * Sync Import API
 *
 * Update import status. With accumulation mode, imports write directly to the sheet,
 * so this route primarily handles status updates and notes.
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

/**
 * POST /api/ko/takeoff/[projectId]/sync/[importId]
 * Update import status or add notes
 *
 * Body:
 * - status: New status (e.g., "approved", "rejected", "reverted")
 * - notes: Optional notes about the sync decision
 */
export async function POST(request, { params }) {
  try {
    const { projectId, importId } = await params
    const body = await request.json()
    const { status, notes } = body

    if (!status) {
      return NextResponse.json(
        { error: 'status is required' },
        { status: 400 }
      )
    }

    await runQuery(
      `UPDATE \`master-roofing-intelligence.mr_main.import_history\`
       SET status = @status, notes = @notes
       WHERE project_id = @projectId AND import_id = @importId`,
      { projectId, importId, status, notes: notes || '' },
      { location: 'US' }
    )

    return NextResponse.json({ success: true, import_id: importId, status })

  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json(
      { error: 'Failed to update import: ' + err.message },
      { status: 500 }
    )
  }
}
