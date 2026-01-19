/**
 * Faigy Knowledge Trainer API
 * GET - Get training data/status
 * POST - Run training batch
 */

// Allow self-signed SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.111.252.120'

// GET - Get training data and status
export async function GET(request, context) {
  const { agentId } = await context.params

  // Only handle Faigy Trainer agent
  if (agentId !== 'AGT-TRAIN-001') {
    return NextResponse.json({ error: 'Not a training agent' }, { status: 400 })
  }

  try {
    // Try to fetch from backend
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${BACKEND_URL}/v1/faigy/training/status`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Backend not available, returning cached/mock data:', error.message)
  }

  // Fallback - backend unavailable, return zeros
  return NextResponse.json({
    success: false,
    error: 'Backend unavailable',
    results: {
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        passRate: 0,
        lastRun: null,
      },
      categoryStats: {},
    },
    insights: {
      data_quality: {},
      priority_actions: [],
    },
  })
}

// POST - Run training batch
export async function POST(request, context) {
  const { agentId } = await context.params

  if (agentId !== 'AGT-TRAIN-001') {
    return NextResponse.json({ error: 'Not a training agent' }, { status: 400 })
  }

  let body = {}
  try {
    body = await request.json()
  } catch (e) {
    // Empty body is ok
  }
  const { batchSize = 50, autoTune = false, autoTuneApply = false } = body

  try {
    // Try to call backend with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(`${BACKEND_URL}/v1/faigy/training/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize, autoTune, autoTuneApply }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json({ success: true, ...data })
    }
  } catch (error) {
    console.error('Backend not available:', error.message)
  }

  // Fallback - backend unavailable, cannot run training
  return NextResponse.json({
    success: false,
    error: 'Backend unavailable - cannot run training',
  })
}
