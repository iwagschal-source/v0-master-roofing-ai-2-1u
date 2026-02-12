/**
 * Rollback Tuning API
 * POST - Rollback last experiment
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://136.111.252.120'
const TRAINING_AGENTS = ['AGT-TRAIN-001', 'CAO-CE-001']

export async function POST(request, context) {
  const { agentId } = await context.params

  if (!TRAINING_AGENTS.includes(agentId)) {
    return NextResponse.json({ error: 'Not a training agent' }, { status: 400 })
  }

  try {
    // Try to call backend with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${BACKEND_URL}/v1/faigy/tuning/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  // Fallback - backend unavailable
  return NextResponse.json({
    success: false,
    error: 'Backend unavailable - cannot rollback',
    rolledBackExperiment: null,
    changes: [],
  })
}
