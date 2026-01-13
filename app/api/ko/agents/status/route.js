/**
 * Agent Live Status API
 * Fetches real-time status from backend at 34.95.128.208
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://34.95.128.208'

// Map backend service status to agent status
function mapServiceToAgentStatus(services, stubMode) {
  const agentStatus = {
    'CAO-GEM-001': {
      status: services.gemini && !stubMode.gemini ? 'live' : 'offline',
      lastChecked: new Date().toISOString(),
    },
    'CAO-CEO-001': {
      status: services.openai && !stubMode.openai ? 'live' : 'offline',
      lastChecked: new Date().toISOString(),
    },
    'CAO-SQL-001': {
      status: services.anthropic && !stubMode.anthropic ? 'live' : 'offline',
      lastChecked: new Date().toISOString(),
    },
    'CAO-VTX-001': {
      status: services.gcp && !stubMode.gcp ? 'live' : 'offline',
      lastChecked: new Date().toISOString(),
    },
    'CAO-HUB-001': {
      status: services.hubspot && !stubMode.hubspot ? 'live' : 'offline',
      lastChecked: new Date().toISOString(),
    },
    'CAO-PBI-001': {
      status: services.powerbi && !stubMode.powerbi ? 'live' : 'offline',
      lastChecked: new Date().toISOString(),
    },
    'CAO-AUD-001': {
      status: 'live', // Auditor is always on if backend is healthy
      lastChecked: new Date().toISOString(),
    },
  }

  return agentStatus
}

export async function GET() {
  try {
    // Fetch health and config from backend in parallel
    const [healthRes, configRes] = await Promise.all([
      fetch(`${BACKEND_URL}/health`, {
        cache: 'no-store',
        // Skip SSL verification for self-signed cert
        ...(process.env.NODE_ENV === 'development' && {
          agent: new (require('https').Agent)({ rejectUnauthorized: false })
        })
      }),
      fetch(`${BACKEND_URL}/v1/config`, {
        cache: 'no-store',
      })
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

    // Build agent status from backend response
    const agentStatus = mapServiceToAgentStatus(
      config.services_configured || {},
      health.stub_mode || config.stub_mode || {}
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
