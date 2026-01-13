/**
 * Agent Config API - Proxies to backend agent configuration endpoints
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://34.95.128.208'

// GET - Get all agent configurations
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/agent-config`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch agent configs:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
