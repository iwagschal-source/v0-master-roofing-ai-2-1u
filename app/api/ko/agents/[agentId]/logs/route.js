/**
 * Agent Logs API
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://34.95.128.208'

export async function GET(request, { params }) {
  const { agentId } = await params
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get('limit') || 50

  try {
    const res = await fetch(`${BACKEND_URL}/v1/agents/${agentId}/logs?limit=${limit}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Failed to fetch logs for agent ${agentId}:`, error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
