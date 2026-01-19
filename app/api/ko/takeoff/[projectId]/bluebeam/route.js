/**
 * Bluebeam Import API
 *
 * Import Bluebeam CSV data into a project's takeoff as a new import.
 */

import { NextResponse } from 'next/server'
import https from 'https'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

// Custom fetch that ignores SSL cert errors (for self-signed backend cert)
const fetchWithSSL = async (url, options = {}) => {
  const agent = new https.Agent({ rejectUnauthorized: false })
  return fetch(url, { ...options, agent })
}

/**
 * POST /api/ko/takeoff/[projectId]/bluebeam
 * Import Bluebeam CSV data as a new import
 *
 * Body:
 * - csv_content: Raw CSV content from Bluebeam export
 * - use_historical_rates: Whether to apply historical rates (default: true)
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { csv_content, filename, use_historical_rates = true } = body

    if (!csv_content) {
      return NextResponse.json(
        { error: 'csv_content is required' },
        { status: 400 }
      )
    }

    const backendRes = await fetchWithSSL(`${BACKEND_URL}/v1/takeoff/${projectId}/bluebeam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv_content,
        filename: filename || 'bluebeam_import.csv',
        use_historical_rates
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
    console.error('Bluebeam import error:', err)
    return NextResponse.json(
      { error: 'Failed to import Bluebeam data: ' + err.message },
      { status: 500 }
    )
  }
}
