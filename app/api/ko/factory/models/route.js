/**
 * Factory Models API - Get all available LLM models
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.116.243.70'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const tier = searchParams.get('tier')

    let url = `${BACKEND_URL}/v1/factory/models`
    const params = new URLSearchParams()
    if (provider) params.append('provider', provider)
    if (tier) params.append('tier', tier)
    if (params.toString()) url += `?${params.toString()}`

    const res = await fetch(url, { cache: 'no-store' })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch models:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}
