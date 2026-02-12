/**
 * Network Map API - Get all agents with status for network visualization
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://136.111.252.120'

// Map provider to model key for icon display
function getModelKey(provider, model) {
  const p = (provider || '').toLowerCase()
  const m = (model || '').toLowerCase()

  if (p.includes('google') || p.includes('vertex') || m.includes('gemini')) return 'gemini'
  if (p.includes('anthropic') || m.includes('claude')) return 'claude'
  if (p.includes('openai') || m.includes('gpt') || m.includes('o1') || m.includes('o3')) return 'openai'
  if (p.includes('xai') || m.includes('grok')) return 'xai'
  if (p.includes('deepseek')) return 'deepseek'
  if (p.includes('mistral')) return 'mistral'
  if (m.includes('llama')) return 'meta'
  return 'custom'
}

// Determine agent role from communication preset and ID
function getAgentRole(agent) {
  const commId = agent.communication?.id
  if (commId === 'orchestrator') return 'orchestrator'
  if (agent.id === 'CAO-PRIME-001') return 'super_agent'
  if (agent.id === 'CAO-AUD-001') return 'auditor'
  if (agent.id === 'CAO-CEO-001') return 'responder'
  return 'tool'
}

// Build connections from agent data
function buildConnections(agent, allAgents) {
  const connections = []
  const commId = agent.communication?.id

  // Orchestrators connect to all workers
  if (commId === 'orchestrator' || agent.id === 'CAO-PRIME-001') {
    allAgents.forEach(other => {
      if (other.id !== agent.id && other.communication?.can_be_called_by?.includes(agent.id)) {
        connections.push({
          targetId: other.id,
          type: 'control',
          label: `Routes to ${other.name}`
        })
      }
    })
  }

  // Workers connect back to orchestrators
  if (agent.communication?.can_be_called_by?.length > 0) {
    agent.communication.can_be_called_by.forEach(orchestratorId => {
      if (orchestratorId !== '*') {
        connections.push({
          targetId: orchestratorId,
          type: 'data',
          label: 'Returns results'
        })
      }
    })
  }

  // Auditor connects to everyone
  if (agent.id === 'CAO-AUD-001') {
    allAgents.forEach(other => {
      if (other.id !== agent.id) {
        connections.push({
          targetId: other.id,
          type: 'audit',
          label: `Monitors ${other.name}`
        })
      }
    })
  }

  return connections
}

export async function GET() {
  try {
    // Fetch agents from factory
    const agentsRes = await fetch(`${BACKEND_URL}/v1/factory/agents`, {
      cache: 'no-store',
    })

    if (!agentsRes.ok) {
      throw new Error(`Failed to fetch agents: ${agentsRes.status}`)
    }

    const agentsData = await agentsRes.json()
    const backendAgents = agentsData.agents || []

    // Fetch health/status
    let serviceStatus = {}
    try {
      const healthRes = await fetch(`${BACKEND_URL}/health`, { cache: 'no-store' })
      if (healthRes.ok) {
        const health = await healthRes.json()
        serviceStatus = health.stub_mode || {}
      }
    } catch (e) {
      console.error('Failed to fetch health:', e)
    }

    // Map backend agents to network format
    const networkAgents = backendAgents.map(agent => {
      const modelKey = getModelKey(agent.provider, agent.model)
      const role = getAgentRole(agent)

      // Determine status
      let status = 'idle'
      if (!agent.enabled) {
        status = 'offline'
      } else {
        // Check if the provider service is in stub mode (indicates issues)
        const providerKey = modelKey === 'gemini' ? 'gemini' :
                          modelKey === 'claude' ? 'anthropic' :
                          modelKey === 'openai' ? 'openai' : null
        if (providerKey && serviceStatus[providerKey]) {
          status = 'error'
        } else {
          status = 'live'
        }
      }

      return {
        id: agent.id,
        name: agent.name,
        description: agent.description,
        modelKey,
        model: agent.model,
        provider: agent.provider,
        status,
        role,
        enabled: agent.enabled,

        // Communication
        communication: agent.communication,
        connections: buildConnections(agent, backendAgents),

        // Tools
        tools: agent.tools || [],

        // Stats (placeholder - could be fetched from metrics endpoint)
        stats: {
          totalRequests: 0,
          successRate: 95 + Math.random() * 5,
          avgLatency: 200 + Math.random() * 800,
          errorsToday: 0,
          requestsPerMinute: 0,
        },

        queueDepth: 0,
        lastActivity: agent.updated_at || new Date().toISOString(),
        currentAction: status === 'live' ? 'Ready' : status === 'offline' ? 'Disabled' : 'Unknown',

        // Scoring (placeholder)
        scoring: {
          overallScore: 85 + Math.random() * 15,
          accuracyScore: 90 + Math.random() * 10,
          latencyScore: 80 + Math.random() * 20,
          reliabilityScore: 90 + Math.random() * 10,
        },

        // Audit relationship
        auditedBy: agent.id !== 'CAO-AUD-001' ? ['CAO-AUD-001'] : [],
      }
    })

    // Build all connections for the network
    const allConnections = []
    networkAgents.forEach(agent => {
      agent.connections.forEach(conn => {
        allConnections.push({
          sourceId: agent.id,
          targetId: conn.targetId,
          type: conn.type,
          label: conn.label,
        })
      })
    })

    return NextResponse.json({
      agents: networkAgents,
      connections: allConnections,
      total: networkAgents.length,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Failed to fetch network agents:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend', details: error.message },
      { status: 503 }
    )
  }
}
