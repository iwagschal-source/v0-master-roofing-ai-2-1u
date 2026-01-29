/**
 * Folder Agent Chat API - AI chat about project folder contents
 *
 * This is a stub route - folder agent feature not yet implemented.
 * Returns a placeholder response.
 */

import { NextResponse } from 'next/server'

export async function POST(request, { params }) {
  const { projectId } = await params
  const body = await request.json()

  // Return stub response - feature not yet implemented
  return NextResponse.json({
    project_id: projectId,
    response: 'The folder agent feature is not yet implemented. This feature will allow you to ask questions about the project folder contents, emails, and documents.',
    _stub: true,
    _message: 'Folder agent feature not yet implemented'
  })
}
