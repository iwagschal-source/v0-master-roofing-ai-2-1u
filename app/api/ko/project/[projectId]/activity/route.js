/**
 * Activity Feed API
 * GET /api/ko/project/[projectId]/activity
 * Returns activity events for a project from BigQuery
 * Query params: ?limit=10&offset=0&since=2025-01-01
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

export async function GET(request, { params }) {
  try {
    const { projectId } = await params
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const since = searchParams.get('since')

    let query = `
      SELECT id, headline, body, event_type, source, source_user, priority, timestamp
      FROM \`master-roofing-intelligence.mr_main.project_activity_feed\`
      WHERE project_id = @projectId
    `
    const queryParams = { projectId }

    if (since) {
      query += ` AND timestamp >= @since`
      queryParams.since = since
    }

    query += ` ORDER BY timestamp DESC LIMIT @limit OFFSET @offset`
    queryParams.limit = limit
    queryParams.offset = offset

    const events = await runQuery(query, queryParams, { location: 'US' })

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM \`master-roofing-intelligence.mr_main.project_activity_feed\`
      WHERE project_id = @projectId
    `
    const countParams = { projectId }
    if (since) {
      countQuery += ` AND timestamp >= @since`
      countParams.since = since
    }
    const countResult = await runQuery(countQuery, countParams, { location: 'US' })
    const total = countResult?.[0]?.total || 0

    return NextResponse.json({
      events: (events || []).map(e => ({
        id: e.id,
        headline: e.headline,
        body: e.body || null,
        event_type: e.event_type,
        source: e.source,
        source_user: e.source_user,
        priority: e.priority || 'normal',
        timestamp: e.timestamp?.value || e.timestamp,
      })),
      total,
    })
  } catch (err) {
    console.error('Activity feed error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
