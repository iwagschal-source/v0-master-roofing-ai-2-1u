/**
 * Admin API - Get system-wide configuration
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.116.243.70'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/admin/system-config`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch system config:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
