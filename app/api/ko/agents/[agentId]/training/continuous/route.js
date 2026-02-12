/**
 * Continuous Training API
 * POST - Start/Stop continuous training
 * GET - Get continuous training status
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://136.111.252.120'

// Agents that support training
const TRAINING_AGENTS = ['AGT-TRAIN-001', 'CAO-CE-001']

// GET - Get continuous training status
export async function GET(request, context) {
  const { agentId } = await context.params

  if (!TRAINING_AGENTS.includes(agentId)) {
    return NextResponse.json({ error: 'Not a training agent' }, { status: 400 })
  }

  try {
    const res = await fetch(`${BACKEND_URL}/v1/faigy/training/continuous/status`, {
      cache: 'no-store',
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Failed to get continuous status:', error.message)
  }

  return NextResponse.json({
    active: false,
    status: {
      mode: 'idle',
      current_batch: 0,
      total_batches: 0,
      started_at: null,
      last_batch_at: null,
      errors: [],
    },
  })
}

// POST - Start or stop continuous training
export async function POST(request, context) {
  const { agentId } = await context.params
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action') || 'start'

  if (!TRAINING_AGENTS.includes(agentId)) {
    return NextResponse.json({ error: 'Not a training agent' }, { status: 400 })
  }

  try {
    const endpoint = action === 'stop'
      ? `${BACKEND_URL}/v1/faigy/training/continuous/stop`
      : `${BACKEND_URL}/v1/faigy/training/continuous/start`

    let body = {}
    if (action === 'start') {
      try {
        body = await request.json()
      } catch (e) {
        // Empty body uses defaults
      }
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }

    const error = await res.text()
    return NextResponse.json({ success: false, error }, { status: res.status })
  } catch (error) {
    console.error('Continuous training action failed:', error.message)
    return NextResponse.json({
      success: false,
      error: 'Backend unavailable',
    }, { status: 503 })
  }
}
