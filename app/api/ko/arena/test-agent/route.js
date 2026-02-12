/**
 * Arena Test Agent API - Test an agent config against multiple models
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://136.111.252.120'

export async function POST(request) {
  try {
    const body = await request.json()

    const res = await fetch(`${BACKEND_URL}/arena/test-agent-config`, {
      method: 'POST',
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
    console.error('Arena test failed:', error)
    return NextResponse.json(
      { error: 'Failed to run arena test: ' + error.message },
      { status: 503 }
    )
  }
}
