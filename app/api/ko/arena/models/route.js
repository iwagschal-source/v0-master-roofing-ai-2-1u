/**
 * Arena Models API - Get available models for testing
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://136.111.252.120:8000'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/arena/dashboard`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()

    // Also fetch the model registry for full details
    const modelsRes = await fetch(`${BACKEND_URL}/v1/factory/models`, {
      cache: 'no-store',
    })

    let models = []
    if (modelsRes.ok) {
      const modelsData = await modelsRes.json()
      models = modelsData.models || []
    }

    return NextResponse.json({
      summary: {
        total_models: data.total_models,
        active_models: data.active_models,
        free_models: data.free_models,
      },
      providers: data.providers || [],
      models: models,
    })
  } catch (error) {
    console.error('Failed to fetch arena models:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
