/**
 * Folder Agent Brief API - Returns project brief and suggested next steps
 *
 * This is a stub route - folder agent feature not yet implemented.
 * Returns empty/placeholder data so the UI doesn't error.
 */

import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { projectId } = await params

  // Return stub data - feature not yet implemented
  return NextResponse.json({
    project_id: projectId,
    summary: null,
    next_steps: [],
    stats: {
      emails: 0,
      calls: 0,
      meetings: 0
    },
    last_activity: null,
    _stub: true,
    _message: 'Folder agent feature not yet implemented'
  })
}
