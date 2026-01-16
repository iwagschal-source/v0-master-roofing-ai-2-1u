/**
 * Prompt Designer Chat API
 *
 * Interactive chat with the Prompt Designer agent (Opus 4).
 * Helps users create well-structured prompts through conversation,
 * then saves them to the target agent's configuration.
 */

// Allow self-signed SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.111.252.120'

export async function POST(request) {
  try {
    const body = await request.json()
    const { session_id, message, target_agent_id } = body

    if (!session_id || !message) {
      return NextResponse.json(
        { error: 'session_id and message are required' },
        { status: 400 }
      )
    }

    const res = await fetch(`${BACKEND_URL}/v1/prompt-designer/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_id,
        message,
        target_agent_id: target_agent_id || null
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to chat with Prompt Designer:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
