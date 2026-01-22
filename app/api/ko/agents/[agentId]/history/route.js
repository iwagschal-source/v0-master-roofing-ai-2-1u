/**
 * Agent Chat History API
 *
 * Retrieves chat history from BigQuery ko_audit.agent_chat_history
 * GET /api/ko/agents/[agentId]/history
 *
 * Query params:
 *   - limit: number of records (default 50, max 500)
 *   - offset: pagination offset
 *   - category: filter by category
 *   - task_type: filter by task type
 *   - project_id: filter by project
 *   - gc_name: filter by GC
 *   - start_date: filter from date (ISO string)
 *   - end_date: filter to date (ISO string)
 *   - conversation_id: get specific conversation
 */

import { NextResponse } from 'next/server'
import { BigQuery } from '@google-cloud/bigquery'

// Initialize BigQuery client
const bigquery = new BigQuery({
  projectId: 'master-roofing-intelligence',
  // Uses GOOGLE_APPLICATION_CREDENTIALS from environment
})

const TABLE_ID = 'master-roofing-intelligence.ko_audit.agent_chat_history'

export async function GET(request, { params }) {
  const { agentId } = await params
  const { searchParams } = new URL(request.url)

  // Parse query parameters
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 500)
  const offset = parseInt(searchParams.get('offset') || '0')
  const category = searchParams.get('category')
  const taskType = searchParams.get('task_type')
  const projectId = searchParams.get('project_id')
  const gcName = searchParams.get('gc_name')
  const startDate = searchParams.get('start_date')
  const endDate = searchParams.get('end_date')
  const conversationId = searchParams.get('conversation_id')

  try {
    // Build query with filters
    let query = `
      SELECT
        message_id,
        conversation_id,
        session_id,
        agent_id,
        agent_name,
        sender_type,
        sender_id,
        sender_name,
        target_agent_id,
        project_id,
        project_name,
        gc_id,
        gc_name,
        category,
        task_type,
        message_text,
        message_type,
        attachments,
        tools_called,
        tools_results,
        model_used,
        created_at,
        response_started_at,
        response_ended_at,
        latency_ms,
        source_system,
        parent_message_id,
        sequence_num,
        accuracy_score,
        relevance_score,
        helpfulness_score,
        tool_efficiency,
        overall_score,
        scored_by,
        score_notes,
        status,
        is_training_example,
        is_flagged,
        flag_reason,
        tokens_input,
        tokens_output,
        estimated_cost_usd
      FROM \`${TABLE_ID}\`
      WHERE agent_id = @agentId
    `

    const queryParams = { agentId }

    // Add filters
    if (category) {
      query += ` AND category = @category`
      queryParams.category = category
    }

    if (taskType) {
      query += ` AND task_type = @taskType`
      queryParams.taskType = taskType
    }

    if (projectId) {
      query += ` AND project_id = @projectId`
      queryParams.projectId = projectId
    }

    if (gcName) {
      query += ` AND gc_name = @gcName`
      queryParams.gcName = gcName
    }

    if (startDate) {
      query += ` AND created_at >= @startDate`
      queryParams.startDate = startDate
    }

    if (endDate) {
      query += ` AND created_at <= @endDate`
      queryParams.endDate = endDate
    }

    if (conversationId) {
      query += ` AND conversation_id = @conversationId`
      queryParams.conversationId = conversationId
    }

    // Order and pagination
    query += ` ORDER BY created_at DESC LIMIT @limit OFFSET @offset`
    queryParams.limit = limit
    queryParams.offset = offset

    // Execute query
    const [rows] = await bigquery.query({
      query,
      params: queryParams,
    })

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM \`${TABLE_ID}\`
      WHERE agent_id = @agentId
    `

    const countParams = { agentId }

    if (category) {
      countQuery += ` AND category = @category`
      countParams.category = category
    }
    if (conversationId) {
      countQuery += ` AND conversation_id = @conversationId`
      countParams.conversationId = conversationId
    }

    const [countResult] = await bigquery.query({
      query: countQuery,
      params: countParams,
    })

    const total = countResult[0]?.total || 0

    // Format for frontend HistoryTab
    const recentEvents = rows.map(row => ({
      id: row.message_id,
      conversationId: row.conversation_id,
      type: row.sender_type === 'user' ? 'info' :
            row.status === 'failed' ? 'error' : 'success',
      timestamp: row.created_at?.value || row.created_at,
      title: `${row.sender_name || row.sender_type} → ${row.agent_name || row.agent_id}`,
      description: row.message_text?.substring(0, 200) + (row.message_text?.length > 200 ? '...' : ''),
      category: row.category,
      taskType: row.task_type,
      projectName: row.project_name,
      gcName: row.gc_name,
      latencyMs: row.latency_ms,
      toolsCalled: row.tools_called,
      scores: {
        accuracy: row.accuracy_score,
        relevance: row.relevance_score,
        helpfulness: row.helpfulness_score,
        toolEfficiency: row.tool_efficiency,
        overall: row.overall_score,
      },
      model: row.model_used,
      tokens: {
        input: row.tokens_input,
        output: row.tokens_output,
      },
      cost: row.estimated_cost_usd,
      status: row.status,
      isTrainingExample: row.is_training_example,
      isFlagged: row.is_flagged,
      flagReason: row.flag_reason,
      raw: row, // Full row for detailed view
    }))

    // Calculate stats
    const stats = {
      totalExecutions: total,
      firstActive: rows.length > 0 ? rows[rows.length - 1].created_at?.value : null,
      lastActive: rows.length > 0 ? rows[0].created_at?.value : null,
      avgLatencyMs: rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / rows.length)
        : 0,
      totalErrors: rows.filter(r => r.status === 'failed').length,
      avgScore: rows.filter(r => r.overall_score).length > 0
        ? rows.filter(r => r.overall_score).reduce((sum, r) => sum + r.overall_score, 0) / rows.filter(r => r.overall_score).length
        : null,
    }

    return NextResponse.json({
      success: true,
      agentId,
      history: {
        recentEvents,
        stats,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + rows.length < total,
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
