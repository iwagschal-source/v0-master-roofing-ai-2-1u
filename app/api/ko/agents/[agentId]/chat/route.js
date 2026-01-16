/**
 * Agent Direct Chat API
 *
 * Allows direct communication with a specific agent,
 * bypassing the orchestrator.
 */

// Allow self-signed SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.111.252.120'

export async function POST(request, { params }) {
  const { agentId } = await params

  try {
    const body = await request.json()
    const { message, project_ids } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const res = await fetch(`${BACKEND_URL}/v1/agents/${agentId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        project_ids: project_ids || null
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Failed to chat with agent ${agentId}:`, error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
