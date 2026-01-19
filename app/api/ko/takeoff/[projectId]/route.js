/**
 * Takeoff API - Get/Update takeoff for a project
 *
 * Proxies to backend takeoff service for GCS-based spreadsheet storage.
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

/**
 * GET /api/ko/takeoff/[projectId]
 * Get takeoff sheet for a project
 *
 * Query params:
 * - format: 'excel' | 'json' (default: json for Luckysheet)
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'

    const backendRes = await fetch(
      `${BACKEND_URL}/v1/takeoff/${projectId}?format=${format}`,
      {
        method: 'GET',
        headers: { 'Accept': format === 'excel' ? 'application/octet-stream' : 'application/json' },
        signal: AbortSignal.timeout(30000)
      }
    )

    if (!backendRes.ok) {
      if (backendRes.status === 404) {
        return NextResponse.json(
          { error: 'Takeoff not found', exists: false },
          { status: 404 }
        )
      }
      const errText = await backendRes.text()
      return NextResponse.json(
        { error: errText },
        { status: backendRes.status }
      )
    }

    if (format === 'excel') {
      const blob = await backendRes.blob()
      return new NextResponse(blob, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${projectId}_takeoff.xlsx"`,
        },
      })
    }

    const data = await backendRes.json()
    return NextResponse.json(data)

  } catch (err) {
    console.error('Takeoff GET error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch takeoff: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/ko/takeoff/[projectId]
 * Update cells in the master takeoff
 *
 * Body:
 * - updates: Array of { row, col, value }
 */
export async function PUT(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()

    const backendRes = await fetch(`${BACKEND_URL}/v1/takeoff/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
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
    console.error('Takeoff PUT error:', err)
    return NextResponse.json(
      { error: 'Failed to update takeoff: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ko/takeoff/[projectId]
 * Delete takeoff (if needed)
 */
export async function DELETE(request, { params }) {
  try {
    const { projectId } = await params

    const backendRes = await fetch(`${BACKEND_URL}/v1/takeoff/${projectId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000)
    })

    if (!backendRes.ok) {
      const errText = await backendRes.text()
      return NextResponse.json(
        { error: errText },
        { status: backendRes.status }
      )
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Takeoff DELETE error:', err)
    return NextResponse.json(
      { error: 'Failed to delete takeoff: ' + err.message },
      { status: 500 }
    )
  }
}
