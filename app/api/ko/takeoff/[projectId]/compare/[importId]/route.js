/**
 * Compare Import API
 *
 * Compare a Bluebeam import against the master takeoff.
 */

import { NextResponse } from 'next/server'
import https from 'https'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

const fetchWithSSL = async (url, options = {}) => {
  const agent = new https.Agent({ rejectUnauthorized: false })
  return fetch(url, { ...options, agent })
}

/**
 * GET /api/ko/takeoff/[projectId]/compare/[importId]
 * Get comparison between import and master
 *
 * Returns changes, keeps, and conflicts for approval UI
 */
export async function GET(request, { params }) {
  try {
    const { projectId, importId } = await params

    const backendRes = await fetchWithSSL(
      `${BACKEND_URL}/v1/takeoff/${projectId}/compare/${importId}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(30000)
      }
    )

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
    console.error('Compare error:', err)
    return NextResponse.json(
      { error: 'Failed to compare: ' + err.message },
      { status: 500 }
    )
  }
}
