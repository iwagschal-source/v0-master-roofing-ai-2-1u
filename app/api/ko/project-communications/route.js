/**
 * Project Communications API (BigQuery-backed)
 * POST: Log an email/communication to a project
 * GET: Fetch communications for a project
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

/**
 * GET /api/ko/project-communications
 * Query params:
 *   - projectId: Get communications for a specific project
 *   - sourceId: Check if a specific email is already logged
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const sourceId = searchParams.get('sourceId')

    let query = `
      SELECT
        id,
        project_id,
        comm_type,
        source_id,
        subject,
        content,
        from_address,
        to_address,
        comm_date,
        notes,
        created_at,
        updated_at
      FROM \`master-roofing-intelligence.mr_main.project_communications\`
    `

    const params = {}
    const conditions = []

    if (projectId) {
      conditions.push('project_id = @projectId')
      params.projectId = projectId
    }

    if (sourceId) {
      conditions.push('source_id = @sourceId')
      params.sourceId = sourceId
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY comm_date DESC, created_at DESC LIMIT 100'

    const rows = await runQuery(query, params, { location: 'US' })

    const communications = rows.map(row => ({
      id: row.id,
      projectId: row.project_id,
      type: row.comm_type,
      sourceId: row.source_id,
      subject: row.subject,
      content: row.content,
      fromAddress: row.from_address,
      toAddress: row.to_address,
      commDate: row.comm_date,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ communications, count: communications.length })
  } catch (error) {
    console.error('[API] GET /api/ko/project-communications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communications', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ko/project-communications
 * Log an email/communication to a project
 * Body: { projectId, type, sourceId, threadId, from, to, subject, snippet, loggedBy }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, type, sourceId, threadId, from, to, subject, snippet, loggedBy } = body

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
    }

    if (!type) {
      return NextResponse.json({ error: 'Communication type is required' }, { status: 400 })
    }

    // Generate unique ID
    const id = 'comm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)

    // Build notes field with metadata
    const notesData = []
    if (threadId) notesData.push(`threadId: ${threadId}`)
    if (loggedBy) notesData.push(`loggedBy: ${loggedBy}`)
    const notes = notesData.length > 0 ? notesData.join('; ') : null

    await runQuery(`
      INSERT INTO \`master-roofing-intelligence.mr_main.project_communications\`
        (id, project_id, comm_type, source_id, subject, content, from_address, to_address, comm_date, notes, created_at, updated_at)
      VALUES
        (@id, @projectId, @type, @sourceId, @subject, @content, @fromAddress, @toAddress, CURRENT_TIMESTAMP(), @notes, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
    `, {
      id,
      projectId,
      type: type || 'email',
      sourceId: sourceId || null,
      subject: subject || null,
      content: snippet || null,
      fromAddress: from || null,
      toAddress: to || null,
      notes,
    }, { location: 'US' })

    return NextResponse.json({ success: true, id })
  } catch (error) {
    console.error('[API] POST /api/ko/project-communications error:', error)
    return NextResponse.json(
      { error: 'Failed to log communication', details: error.message },
      { status: 500 }
    )
  }
}
