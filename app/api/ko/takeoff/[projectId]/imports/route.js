/**
 * Imports List API
 *
 * Get list of Bluebeam imports for a project.
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

/**
 * GET /api/ko/takeoff/[projectId]/imports
 * Get list of all imports for a project
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = await params

    const backendRes = await fetch(`${BACKEND_URL}/v1/takeoff/${projectId}/imports`, {
      method: 'GET',
      signal: AbortSignal.timeout(15000)
    })

    if (!backendRes.ok) {
      const errText = await backendRes.text()
      return NextResponse.json(
        { error: errText },
        { status: backendRes.status }
      )
    }

    const data = await backendRes.json()
    return NextResponse.json(data)

  } catch (err) {
    console.error('Imports list error:', err)
    return NextResponse.json(
      { error: 'Failed to get imports: ' + err.message },
      { status: 500 }
    )
  }
}
