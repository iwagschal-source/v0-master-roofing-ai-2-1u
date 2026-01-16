/**
 * KO Prime Super Agent Chat API
 *
 * Interactive chat with KO Prime - the super agent with full tool access.
 * Powered by Opus 4 with multi-step reasoning and tool chaining.
 *
 * When target_agent_id is provided, KO Prime gains context about that agent
 * and can test/improve its prompts iteratively.
 */

// Allow self-signed SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.111.252.120'

export async function POST(request) {
  try {
    const body = await request.json()
    const { message, conversation_history, target_agent_id } = body

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    const res = await fetch(`${BACKEND_URL}/v1/ko-prime/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversation_history: conversation_history || null,
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
    console.error('Failed to chat with KO Prime:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
