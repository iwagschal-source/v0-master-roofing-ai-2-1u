/**
 * Create Takeoff API
 *
 * Creates a new takeoff as a Google Sheet tab for a project.
 * The tab is created within the Truth Source spreadsheet using the MR template.
 */

import { NextResponse } from 'next/server'
import { createTakeoffTab, getTakeoffTab } from '@/lib/google-sheets'

/**
 * POST /api/ko/takeoff/create
 * Create a new takeoff Google Sheet tab for a project
 *
 * Body:
 * - project_id: The project ID (MD5 hash)
 * - project_name: Human-readable project name
 *
 * Returns:
 * - gid: The sheet tab GID
 * - tabName: The tab name
 * - embedUrl: URL for embedding (view mode)
 * - editUrl: URL for editing
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { project_id, project_name } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    // Create Google Sheet tab for this project
    const result = await createTakeoffTab(project_id, project_name)

    return NextResponse.json({
      success: true,
      project_id,
      ...result,
      message: result.existed ? 'Takeoff sheet already exists' : 'Takeoff sheet created'
    })

  } catch (err) {
    console.error('Takeoff create error:', err)
    return NextResponse.json(
      { error: 'Failed to create takeoff: ' + err.message },
      { status: 500 }
    )
  }
}
