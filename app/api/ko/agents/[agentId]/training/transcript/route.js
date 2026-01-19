/**
 * Training Transcript API
 * GET - Get question/result transcript from training runs
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.111.252.120'

export async function GET(request, context) {
  const { agentId } = await context.params
  const { searchParams } = new URL(request.url)
  const limit = searchParams.get('limit') || 50
  const offset = searchParams.get('offset') || 0

  if (agentId !== 'AGT-TRAIN-001') {
    return NextResponse.json({ error: 'Not a training agent' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/v1/faigy/training/transcript?limit=${limit}&offset=${offset}`,
      { cache: 'no-store' }
    )

    if (res.ok) {
      const data = await res.json()
      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Failed to get transcript:', error.message)
  }

  return NextResponse.json({
    success: false,
    error: 'Backend unavailable',
    transcript: [],
  })
}
