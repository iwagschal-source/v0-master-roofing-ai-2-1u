/**
 * Email Drafts API (BigQuery-backed)
 * GET: Fetch drafts by original_email_id or user_email
 * PUT: Update draft status (selected, edited, sent, discarded)
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

/**
 * GET /api/ko/email-drafts
 * Query params:
 *   - email_id: Original email ID to fetch drafts for
 *   - user_email: User email to fetch all drafts for
 *   - thread_id: Thread ID to fetch drafts for
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('email_id')
    const userEmail = searchParams.get('user_email')
    const threadId = searchParams.get('thread_id')

    let query = `
      SELECT
        id,
        user_email,
        thread_id,
        original_email_id,
        from_address,
        to_address,
        subject,
        draft_number,
        draft_text,
        status,
        agent_id,
        generated_at,
        selected_at,
        sent_at,
        project_id,
        created_at,
        updated_at
      FROM \`master-roofing-intelligence.mr_main.email_drafts\`
    `

    const params = {}
    const conditions = []

    if (emailId) {
      conditions.push('original_email_id = @emailId')
      params.emailId = emailId
    }

    if (userEmail) {
      conditions.push('user_email = @userEmail')
      params.userEmail = userEmail
    }

    if (threadId) {
      conditions.push('thread_id = @threadId')
      params.threadId = threadId
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY draft_number ASC, created_at DESC LIMIT 50'

    const rows = await runQuery(query, params, { location: 'US' })

    const drafts = rows.map(row => ({
      id: row.id,
      userEmail: row.user_email,
      threadId: row.thread_id,
      originalEmailId: row.original_email_id,
      fromAddress: row.from_address,
      toAddress: row.to_address,
      subject: row.subject,
      draftNumber: row.draft_number,
      draftText: row.draft_text,
      status: row.status,
      agentId: row.agent_id,
      generatedAt: row.generated_at,
      selectedAt: row.selected_at,
      sentAt: row.sent_at,
      projectId: row.project_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ drafts, count: drafts.length })
  } catch (error) {
    console.error('[API] GET /api/ko/email-drafts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email drafts', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/ko/email-drafts
 * Update draft status
 * Body: { id: string, status: 'pending' | 'selected' | 'edited' | 'sent' | 'discarded' }
 */
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, status, draftText } = body

    if (!id) {
      return NextResponse.json({ error: 'Draft ID is required' }, { status: 400 })
    }

    const validStatuses = ['pending', 'selected', 'edited', 'sent', 'discarded']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Build dynamic update query
    const updates = ['updated_at = CURRENT_TIMESTAMP()']
    const params = { id }

    if (status) {
      updates.push('status = @status')
      params.status = status

      // Set timestamp fields based on status
      if (status === 'selected') {
        updates.push('selected_at = CURRENT_TIMESTAMP()')
      } else if (status === 'sent') {
        updates.push('sent_at = CURRENT_TIMESTAMP()')
      }
    }

    if (draftText !== undefined) {
      updates.push('draft_text = @draftText')
      params.draftText = draftText
    }

    const query = `
      UPDATE \`master-roofing-intelligence.mr_main.email_drafts\`
      SET ${updates.join(', ')}
      WHERE id = @id
    `

    await runQuery(query, params, { location: 'US' })

    return NextResponse.json({ success: true, id, status })
  } catch (error) {
    console.error('[API] PUT /api/ko/email-drafts error:', error)
    return NextResponse.json(
      { error: 'Failed to update email draft', details: error.message },
      { status: 500 }
    )
  }
}
