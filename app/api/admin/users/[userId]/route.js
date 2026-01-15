/**
 * User Admin API - Individual User Operations
 * GET, PATCH, DELETE for specific user
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

const TABLE = 'master-roofing-intelligence.ko_audit.user_agents'

// GET - Get user by ID
export async function GET(request, { params }) {
  try {
    const { userId } = await params

    const query = `
      SELECT *
      FROM \`${TABLE}\`
      WHERE user_agent_id = @userId
    `

    const users = await runQuery(query, { userId })

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(users[0])
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    )
  }
}

// PATCH - Update user
export async function PATCH(request, { params }) {
  try {
    const { userId } = await params
    const body = await request.json()

    // Build dynamic UPDATE query
    const updates = []
    const updateParams = { userId }

    if (body.display_name !== undefined) {
      updates.push('display_name = @display_name')
      updateParams.display_name = body.display_name
    }

    if (body.role !== undefined) {
      updates.push('role = @role')
      updateParams.role = body.role
    }

    if (body.department !== undefined) {
      updates.push('department = @department')
      updateParams.department = body.department
    }

    if (body.agent_status !== undefined) {
      updates.push('agent_status = @agent_status')
      updateParams.agent_status = body.agent_status
    }

    if (body.priority_level !== undefined) {
      updates.push('priority_level = @priority_level')
      updateParams.priority_level = body.priority_level
    }

    if (body.can_receive_nudges !== undefined) {
      updates.push('can_receive_nudges = @can_receive_nudges')
      updateParams.can_receive_nudges = body.can_receive_nudges
    }

    if (body.can_receive_drafts !== undefined) {
      updates.push('can_receive_drafts = @can_receive_drafts')
      updateParams.can_receive_drafts = body.can_receive_drafts
    }

    if (body.asana_user_id !== undefined) {
      updates.push('asana_user_id = @asana_user_id')
      updateParams.asana_user_id = body.asana_user_id
    }

    if (body.hubspot_contact_id !== undefined) {
      updates.push('hubspot_contact_id = @hubspot_contact_id')
      updateParams.hubspot_contact_id = body.hubspot_contact_id
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    // Always update updated_at
    updates.push('updated_at = CURRENT_TIMESTAMP()')

    const updateQuery = `
      UPDATE \`${TABLE}\`
      SET ${updates.join(', ')}
      WHERE user_agent_id = @userId
    `

    await runQuery(updateQuery, updateParams)

    // Fetch and return updated user
    const selectQuery = `SELECT * FROM \`${TABLE}\` WHERE user_agent_id = @userId`
    const users = await runQuery(selectQuery, { userId })

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(users[0])
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Deactivate user (soft delete)
export async function DELETE(request, { params }) {
  try {
    const { userId } = await params

    // Soft delete - set status to inactive
    const updateQuery = `
      UPDATE \`${TABLE}\`
      SET agent_status = 'inactive', updated_at = CURRENT_TIMESTAMP()
      WHERE user_agent_id = @userId
    `

    await runQuery(updateQuery, { userId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to deactivate user:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate user', details: error.message },
      { status: 500 }
    )
  }
}
