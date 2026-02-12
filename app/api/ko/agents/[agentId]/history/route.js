/**
 * Agent Chat History API
 *
 * Proxies to backend /v1/agents/{agentId}/history which queries BigQuery
 * GET /api/ko/agents/[agentId]/history
 *
 * Query params:
 *   - limit: number of records (default 50, max 500)
 */

// Allow self-signed SSL certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://136.111.252.120'

export async function GET(request, { params }) {
  const { agentId } = await params
  const { searchParams } = new URL(request.url)

  // Parse query parameters
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500)

  try {
    const res = await fetch(`${BACKEND_URL}/v1/agents/${agentId}/history?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()

    // Transform backend response to frontend format expected by HistoryTab
    const history = data.history || []

    // Format for frontend HistoryTab
    const recentEvents = history.map(item => ({
      id: item.message_id,
      conversationId: item.conversation_id,
      type: item.sender_type === 'user' ? 'info' : 'success',
      timestamp: item.timestamp,
      title: `${item.sender_name || item.sender_type} → ${agentId}`,
      description: item.message?.substring(0, 200) + (item.message?.length > 200 ? '...' : ''),
      latencyMs: item.latency_ms,
      model: item.model,
      raw: item,
    }))

    // Calculate stats
    const stats = {
      totalExecutions: data.total || history.length,
      firstActive: history.length > 0 ? history[history.length - 1].timestamp : null,
      lastActive: history.length > 0 ? history[0].timestamp : null,
      avgLatencyMs: history.length > 0
        ? Math.round(history.filter(r => r.latency_ms).reduce((sum, r) => sum + (r.latency_ms || 0), 0) / Math.max(1, history.filter(r => r.latency_ms).length))
        : 0,
    }

    return NextResponse.json({
      success: true,
      agentId,
      history: {
        recentEvents,
        stats,
        pagination: {
          total: data.total || history.length,
          limit,
          offset: 0,
          hasMore: false,
        }
      }
    })

  } catch (error) {
    console.error(`Failed to fetch history for agent ${agentId}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch agent history',
        details: error.message
      },
      { status: 500 }
    )
  }
}
