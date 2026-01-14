/**
 * Admin API - Get agent code and configuration
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://34.95.128.208'

export async function GET(request, { params }) {
  try {
    const { agentId } = await params

    const res = await fetch(`${BACKEND_URL}/v1/admin/agent-code/${agentId}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch agent code:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
