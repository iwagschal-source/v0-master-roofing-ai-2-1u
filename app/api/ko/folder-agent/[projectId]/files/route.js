/**
 * Folder Agent Files API - Returns files associated with project folder
 *
 * This is a stub route - folder agent feature not yet implemented.
 * Returns empty array so the UI doesn't error.
 */

import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { projectId } = await params

  // Return stub data - feature not yet implemented
  return NextResponse.json({
    project_id: projectId,
    files: [],
    _stub: true,
    _message: 'Folder agent feature not yet implemented'
  })
}
