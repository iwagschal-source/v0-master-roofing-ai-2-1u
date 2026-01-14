/**
 * Factory Agents API - List and create agents
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://34.95.128.208'

// GET - List all agents from factory
export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/factory/agents`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()

    // Transform backend agents to frontend format
    const agents = (data.agents || []).map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      model: agent.model,
      modelKey: getModelKey(agent.provider),
      status: agent.enabled ? 'idle' : 'offline',
      provider: agent.provider,
      tools: agent.tools || [],
      stats: {
        totalRequests: 0,
        successRate: 0,
        avgLatency: 0,
        errorsToday: 0,
        requestsPerMinute: 0,
      },
      lastActivity: agent.updated_at || agent.created_at || new Date().toISOString(),
      currentAction: agent.enabled ? 'Ready' : 'Disabled',
      queueDepth: 0,
      connections: [],
      auditedBy: [],
      schedule: 'Always On',
      permissions: {
        readAccess: [],
        writeAccess: [],
      },
      scoring: {
        overallScore: 0,
        accuracyScore: 0,
        latencyScore: 0,
        reliabilityScore: 0,
      },
      configFiles: agent.prompts ? [
        { name: 'system.md', content: agent.prompts.system || '', type: 'markdown' }
      ] : [],
    }))

    return NextResponse.json({ agents, total: agents.length })
  } catch (error) {
    console.error('Failed to fetch agents:', error)
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

    const res = await fetch(`${BACKEND_URL}/v1/factory/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
    })

    if (!res.ok) {
      const errorText = await res.text()
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

// Helper to map provider to modelKey for UI icons
function getModelKey(provider) {
  if (!provider) return 'unknown'
  const p = provider.toLowerCase()
  if (p.includes('anthropic') || p.includes('claude')) return 'claude'
  if (p.includes('openai') || p.includes('gpt')) return 'gpt'
  if (p.includes('google') || p.includes('gemini') || p.includes('vertex')) return 'gemini'
  if (p.includes('deepseek')) return 'deepseek'
  if (p.includes('mistral')) return 'mistral'
  if (p.includes('meta') || p.includes('llama')) return 'llama'
  return 'unknown'
}
