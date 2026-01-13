/**
 * Accept Invite API
 * Validates invite token and activates user
 */

import { readJSON, writeJSON } from '@/lib/gcs-storage'
import { NextResponse } from 'next/server'

const INVITES_PATH = 'admin/invites.json'

// POST - Accept an invite
export async function POST(request) {
  try {
    const body = await request.json()
    const { token, name } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Invite token is required' },
        { status: 400 }
      )
    }

    const invites = await readJSON(INVITES_PATH) || { pending: [], accepted: [] }

    // Find pending invite by token
    const inviteIndex = invites.pending.findIndex(i => i.token === token)
    if (inviteIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 404 }
      )
    }

    const invite = invites.pending[inviteIndex]

    // Check if expired
    if (new Date(invite.expiresAt) < new Date()) {
      // Remove expired invite
      invites.pending.splice(inviteIndex, 1)
      await writeJSON(INVITES_PATH, invites)

      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 410 }
      )
    }

    // Move from pending to accepted
    invites.pending.splice(inviteIndex, 1)
    invites.accepted.push({
      id: invite.id,
      email: invite.email,
      name: name || invite.email.split('@')[0],
      role: invite.role,
      invitedBy: invite.invitedBy,
      acceptedAt: new Date().toISOString(),
    })

    await writeJSON(INVITES_PATH, invites)

    return NextResponse.json({
      success: true,
      user: {
        email: invite.email,
        role: invite.role,
        name: name || invite.email.split('@')[0],
      }
    })
  } catch (error) {
    console.error('Failed to accept invite:', error)
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    )
  }
}

// GET - Validate invite token (check if valid before showing accept form)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const invites = await readJSON(INVITES_PATH) || { pending: [], accepted: [] }

    const invite = invites.pending.find(i => i.token === token)
    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date(invite.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: 'This invite has expired' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      valid: true,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    })
  } catch (error) {
    console.error('Failed to validate invite:', error)
    return NextResponse.json(
      { error: 'Failed to validate invite' },
      { status: 500 }
    )
  }
}
