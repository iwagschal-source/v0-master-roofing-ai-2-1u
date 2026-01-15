/**
 * Agent Config API - Proxies to backend agent configuration endpoints
 */

// Allow self-signed SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.116.243.70'

// GET - Get all agent configurations
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/agent-config`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch agent configs:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}

// POST - Create a new agent
export async function POST(request) {
  try {
    const body = await request.json()

    // Map frontend form data to backend schema
    const backendPayload = {
      name: body.name,
      model: body.model || body.modelKey,
      tools: body.tools || [],
      system_prompt: body.system_prompt || body.readme || '',
      description: body.description || '',
      access_preset: body.access_preset || null,
      communication_preset: body.communication_preset || 'worker',
      settings: {
        schedule: body.schedule || 'always-on',
        cron_expression: body.cronExpression || null,
        read_access: body.readAccess || [],
        write_access: body.writeAccess || [],
        agent_connections: body.agentSynteraction || [],
        scoring_metrics: body.scoringMetrics || [],
      },
      template: body.template || null,
    }

    console.log('Creating agent with payload:', JSON.stringify(backendPayload, null, 2))

    const res = await fetch(`${BACKEND_URL}/v1/factory/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendPayload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Backend error:', errorText)
      return NextResponse.json(
        { error: errorText || 'Failed to create agent' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Failed to create agent:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend: ' + error.message },
      { status: 503 }
    )
  }
}
