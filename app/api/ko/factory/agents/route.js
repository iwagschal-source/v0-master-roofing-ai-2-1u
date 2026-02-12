/**
 * Factory Agents API - List and create agents
 * Now includes real stats from BigQuery chat history
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'
import { agents as staticAgents } from '@/data/agent-data'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://136.111.252.120'

// Static agents that should always be included (not in backend)
const STATIC_AGENT_IDS = ['AGT-TRAIN-001']

// Fetch stats for a single agent from history endpoint
async function fetchAgentStats(agentId) {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/agents/${agentId}/history?limit=100`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    const history = data.history || []

    // Calculate stats from history
    const now = new Date()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)
    const oneMinuteAgo = new Date(now - 60 * 1000)

    const todayMessages = history.filter(h => new Date(h.timestamp) > oneDayAgo)
    const recentMessages = history.filter(h => new Date(h.timestamp) > oneMinuteAgo)
    const messagesWithLatency = history.filter(h => h.latency_ms)
    const errorMessages = todayMessages.filter(h => h.sender_type === 'error' || h.message?.includes('error'))

    return {
      totalRequests: data.total || history.length,
      successRate: history.length > 0 ? Math.round((1 - errorMessages.length / Math.max(1, todayMessages.length)) * 100) : 0,
      avgLatency: messagesWithLatency.length > 0
        ? Math.round(messagesWithLatency.reduce((sum, h) => sum + (h.latency_ms || 0), 0) / messagesWithLatency.length)
        : 0,
      errorsToday: errorMessages.length,
      requestsPerMinute: recentMessages.length,
    }
  } catch (e) {
    console.error(`Failed to fetch stats for ${agentId}:`, e)
    return null
  }
}

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

    // Transform backend agents to frontend format (without stats first)
    const backendAgents = (data.agents || []).map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      model: agent.model,
      modelKey: getModelKey(agent.provider),
      status: agent.enabled ? 'idle' : 'offline',
      provider: agent.provider,
      tools: agent.tools || [],
      stats: null, // Will be populated below
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

    // Skip slow stats fetching to avoid Vercel timeout (was taking 14+ seconds for 33 agents)
    // Stats are now fetched lazily via /api/ko/agents/status endpoint
    // Set default stats for all agents
    backendAgents.forEach((agent) => {
      agent.stats = {
        totalRequests: 0,
        successRate: 0,
        avgLatency: 0,
        errorsToday: 0,
        requestsPerMinute: 0,
      }
    })

    // Get static agents that should always be included
    const staticAgentsToInclude = staticAgents.filter(a => STATIC_AGENT_IDS.includes(a.id))

    // Merge: backend agents + static agents (avoiding duplicates)
    const backendIds = new Set(backendAgents.map(a => a.id))
    const agents = [
      ...backendAgents,
      ...staticAgentsToInclude.filter(a => !backendIds.has(a.id))
    ]

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
