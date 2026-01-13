/**
 * Restart Agent API
 */

// Allow self-signed SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://34.95.128.208'

export async function POST(request, { params }) {
  const { agentId } = await params

  try {
    const res = await fetch(`${BACKEND_URL}/v1/agents/${agentId}/restart`, {
      method: 'POST',
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Failed to restart agent ${agentId}:`, error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
