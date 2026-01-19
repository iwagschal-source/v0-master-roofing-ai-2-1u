/**
 * Create Takeoff API
 *
 * Creates a new takeoff from the MR template for a project.
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

/**
 * POST /api/ko/takeoff/create
 * Create a new takeoff for a project
 *
 * Body:
 * - project_id: The project ID (MD5 hash)
 * - project_name: Human-readable project name
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

    const backendRes = await fetch(`${BACKEND_URL}/v1/takeoff/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id,
        project_name: project_name || project_id
      }),
      signal: AbortSignal.timeout(30000)
    })

    if (!backendRes.ok) {
      const errText = await backendRes.text()
      let errDetail = errText
      try {
        const errJson = JSON.parse(errText)
        errDetail = errJson.detail || errText
      } catch {}
      return NextResponse.json(
        { error: errDetail },
        { status: backendRes.status }
      )
    }

    const data = await backendRes.json()
    return NextResponse.json(data)

  } catch (err) {
    console.error('Takeoff create error:', err)
    return NextResponse.json(
      { error: 'Failed to create takeoff: ' + err.message },
      { status: 500 }
    )
  }
}
