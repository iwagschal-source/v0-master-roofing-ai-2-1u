/**
 * Admin API - Get and update agent code and configuration
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.116.243.70'

export async function GET(request, { params }) {
  try {
    const { agentId } = await params

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
    console.error('Failed to fetch agent code:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}

export async function PUT(request, { params }) {
  try {
    const { agentId } = await params
    const body = await request.json()

    const res = await fetch(`${BACKEND_URL}/v1/agent-config/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to update agent code:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
