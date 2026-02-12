/**
 * Agent Live Status API
 * Fetches real-time status from Python backend
 * Supports both hardcoded agents and factory-created agents
 */

// Allow self-signed SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://136.111.252.120'

// Map provider to service key for status checking
function providerToServiceKey(provider) {
  if (!provider) return null
  const p = provider.toLowerCase()
  if (p.includes('anthropic') || p.includes('claude')) return 'anthropic'
  if (p.includes('openai') || p.includes('gpt')) return 'openai'
  if (p.includes('google') || p.includes('gemini') || p.includes('vertex')) return 'gemini'
  if (p.includes('deepseek')) return 'deepseek'
  if (p.includes('mistral')) return 'mistral'
  if (p.includes('cohere')) return 'cohere'
  if (p.includes('groq')) return 'groq'
  return 'gemini' // Default fallback
}

// Map backend service status to agent status
function mapServiceToAgentStatus(services, stubMode, factoryAgents = []) {
  const now = new Date().toISOString()

  // Start with hardcoded core agents
  const agentStatus = {
    'CAO-GEM-001': {
      status: services.gemini && !stubMode.gemini ? 'live' : 'offline',
      lastChecked: now,
    },
    'CAO-CEO-001': {
      status: services.openai && !stubMode.openai ? 'live' : 'offline',
      lastChecked: now,
    },
    'CAO-SQL-001': {
      status: services.anthropic && !stubMode.anthropic ? 'live' : 'offline',
      lastChecked: now,
    },
    'CAO-VTX-001': {
      status: services.gcp && !stubMode.gcp ? 'live' : 'offline',
      lastChecked: now,
    },
    'CAO-HUB-001': {
      status: services.hubspot && !stubMode.hubspot ? 'live' : 'offline',
      lastChecked: now,
    },
    'CAO-AUD-001': {
      status: 'live', // Auditor is always on if backend is healthy
      lastChecked: now,
    },
  }

  // Add factory-created agents with status based on their provider
  for (const agent of factoryAgents) {
    // Skip if already in hardcoded list
    if (agentStatus[agent.id]) continue

    const serviceKey = providerToServiceKey(agent.provider)
    const isServiceUp = serviceKey ? (services[serviceKey] || services.gemini) : true
    const isStubbed = serviceKey ? stubMode[serviceKey] : false

    // Agent is "live" if enabled and its provider service is up
    const isEnabled = agent.enabled !== false
    agentStatus[agent.id] = {
      status: isEnabled && isServiceUp && !isStubbed ? 'live' : (isEnabled ? 'idle' : 'offline'),
      lastChecked: now,
    }
  }

  return agentStatus
}

export async function GET() {
  try {
    // Fetch health, config, and factory agents from backend in parallel
    const [healthRes, configRes, agentsRes] = await Promise.all([
      fetch(`${BACKEND_URL}/health`, { cache: 'no-store' }),
      fetch(`${BACKEND_URL}/v1/config`, { cache: 'no-store' }),
      fetch(`${BACKEND_URL}/v1/factory/agents`, { cache: 'no-store' }),
    ])

    if (!healthRes.ok) {
      return NextResponse.json({
        healthy: false,
        error: 'Backend unreachable',
        agents: {},
        timestamp: new Date().toISOString(),
      })
    }

    const health = await healthRes.json()
    const config = configRes.ok ? await configRes.json() : {}
    const agentsData = agentsRes.ok ? await agentsRes.json() : { agents: [] }

    // Build agent status from backend response, including factory agents
    const agentStatus = mapServiceToAgentStatus(
      config.services_configured || {},
      health.stub_mode || config.stub_mode || {},
      agentsData.agents || []
    )

    return NextResponse.json({
      healthy: health.status === 'healthy',
      version: health.version,
      architecture: config.architecture || {},
      models: config.models || {},
      agents: agentStatus,
      stubMode: health.stub_mode || {},
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch agent status:', error)

    // Return offline status for all agents
    return NextResponse.json({
      healthy: false,
      error: error.message,
      agents: {
        'CAO-GEM-001': { status: 'error', lastChecked: new Date().toISOString() },
        'CAO-CEO-001': { status: 'error', lastChecked: new Date().toISOString() },
        'CAO-SQL-001': { status: 'error', lastChecked: new Date().toISOString() },
        'CAO-VTX-001': { status: 'error', lastChecked: new Date().toISOString() },
        'CAO-HUB-001': { status: 'error', lastChecked: new Date().toISOString() },
        'CAO-PBI-001': { status: 'error', lastChecked: new Date().toISOString() },
        'CAO-AUD-001': { status: 'error', lastChecked: new Date().toISOString() },
      },
      timestamp: new Date().toISOString(),
    })
  }
}
