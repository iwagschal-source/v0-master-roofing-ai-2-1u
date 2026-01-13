/**
 * Individual Agent Config API
 * GET - Get single agent config
 * PUT - Update agent config (prompts, settings)
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://34.95.128.208'

// GET - Get single agent config
export async function GET(request, { params }) {
  const { agentId } = await params

  try {
    const res = await fetch(`${BACKEND_URL}/v1/agent-config/${agentId}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Failed to fetch agent ${agentId}:`, error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}

// PUT - Update agent config
export async function PUT(request, { params }) {
  const { agentId } = await params

  try {
    const body = await request.json()

    const res = await fetch(`${BACKEND_URL}/v1/agent-config/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error(`Failed to update agent ${agentId}:`, error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
