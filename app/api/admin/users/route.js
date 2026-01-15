/**
 * User Admin API
 * Manages KO system users via BigQuery ko_audit.user_agents table
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

const TABLE = 'master-roofing-intelligence.ko_audit.user_agents'

// GET - List all users
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    let query = `
      SELECT
        user_agent_id,
        user_email,
        user_name,
        display_name,
        role,
        department,
        agent_status,
        priority_level,
        can_receive_nudges,
        can_receive_drafts,
        asana_user_id,
        hubspot_contact_id,
        last_active,
        created_at,
        updated_at
      FROM \`${TABLE}\`
      WHERE 1=1
    `

    const params = {}

    if (role) {
      query += ` AND LOWER(role) = @role`
      params.role = role.toLowerCase()
    }

    if (status) {
      query += ` AND agent_status = @status`
      params.status = status
    }

    query += ` ORDER BY priority_level ASC NULLS LAST, user_name ASC`

    const users = await runQuery(query, params)

    return NextResponse.json({
      users,
      total: users.length,
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Create new user
export async function POST(request) {
  try {
    const body = await request.json()
    const { user_email, user_name, display_name, role, department } = body

    // Validate required fields
    if (!user_email || !user_name) {
      return NextResponse.json(
        { error: 'user_email and user_name are required' },
        { status: 400 }
      )
    }

    // Check domain restriction
    const domain = user_email.split('@')[1]?.toLowerCase()
    if (domain !== 'masterroofingus.com') {
      return NextResponse.json(
        { error: 'Only @masterroofingus.com email addresses are allowed' },
        { status: 403 }
      )
    }

    // Generate user_agent_id from email username
    const username = user_email.split('@')[0].toUpperCase()
    const user_agent_id = `USR-${username}`

    // Check if user already exists
    const existingQuery = `SELECT user_agent_id FROM \`${TABLE}\` WHERE user_agent_id = @user_agent_id`
    const existing = await runQuery(existingQuery, { user_agent_id })

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      )
    }

    // Insert new user
    const insertQuery = `
      INSERT INTO \`${TABLE}\` (
        user_agent_id,
        user_email,
        user_name,
        display_name,
        role,
        department,
        agent_status,
        priority_level,
        can_receive_nudges,
        can_receive_drafts,
        created_at
      ) VALUES (
        @user_agent_id,
        @user_email,
        @user_name,
        @display_name,
        @role,
        @department,
        'active',
        @priority_level,
        @can_receive_nudges,
        @can_receive_drafts,
        CURRENT_TIMESTAMP()
      )
    `

    await runQuery(insertQuery, {
      user_agent_id,
      user_email: user_email.toLowerCase(),
      user_name,
      display_name: display_name || user_name.split(' ')[0],
      role: role || 'Estimator',
      department: department || 'Estimating',
      priority_level: body.priority_level ?? 2,
      can_receive_nudges: body.can_receive_nudges ?? true,
      can_receive_drafts: body.can_receive_drafts ?? true,
    })

    // Fetch the created user
    const newUserQuery = `SELECT * FROM \`${TABLE}\` WHERE user_agent_id = @user_agent_id`
    const [newUser] = await runQuery(newUserQuery, { user_agent_id })

    return NextResponse.json(newUser)
  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json(
      { error: 'Failed to create user', details: error.message },
      { status: 500 }
    )
  }
}
