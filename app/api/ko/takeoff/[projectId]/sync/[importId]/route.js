/**
 * Sync Import API
 *
 * Sync approved changes from an import to the master takeoff.
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

/**
 * POST /api/ko/takeoff/[projectId]/sync/[importId]
 * Sync approved changes to master
 *
 * Body:
 * - approved_changes: Array of approved change keys (e.g., ["D5", "E10"])
 */
export async function POST(request, { params }) {
  try {
    const { projectId, importId } = await params
    const body = await request.json()
    const { approved_changes } = body

    if (!approved_changes || !Array.isArray(approved_changes)) {
      return NextResponse.json(
        { error: 'approved_changes array is required' },
        { status: 400 }
      )
    }

    const backendRes = await fetch(
      `${BACKEND_URL}/v1/takeoff/${projectId}/sync/${importId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_changes }),
        signal: AbortSignal.timeout(30000)
      }
    )

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
    console.error('Sync error:', err)
    return NextResponse.json(
      { error: 'Failed to sync: ' + err.message },
      { status: 500 }
    )
  }
}
