/**
 * Admin Invite API
 * Manages user invitations with domain restriction
 * Storage: GCS bucket for persistence, in-memory fallback
 */

import { readJSON, writeJSON, deleteObject } from '@/lib/gcs-storage'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const INVITES_PATH = 'admin/invites.json'
const ALLOWED_DOMAIN = 'masterroofingus.com'

// Validate email domain
function isValidDomain(email) {
  if (!email) return false
  const domain = email.split('@')[1]?.toLowerCase()
  return domain === ALLOWED_DOMAIN
}

// Generate invite token
function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

// GET - List all invites
export async function GET() {
  try {
    const invites = await readJSON(INVITES_PATH) || { pending: [], accepted: [] }
    return NextResponse.json(invites)
  } catch (error) {
    console.error('Failed to get invites:', error)
    return NextResponse.json({ pending: [], accepted: [] })
  }
}

// POST - Create new invite
export async function POST(request) {
  try {
    const body = await request.json()
    const { email, role = 'viewer', invitedBy } = body

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      )
    }

    // Check domain restriction
    if (!isValidDomain(email)) {
      return NextResponse.json(
        { error: `Only @${ALLOWED_DOMAIN} email addresses are allowed` },
        { status: 403 }
      )
    }

    // Get existing invites
    const invites = await readJSON(INVITES_PATH) || { pending: [], accepted: [] }

    // Check if already invited or accepted
    const existingPending = invites.pending.find(i => i.email.toLowerCase() === email.toLowerCase())
    if (existingPending) {
      return NextResponse.json(
        { error: 'User already has a pending invite' },
        { status: 409 }
      )
    }

    const existingAccepted = invites.accepted.find(i => i.email.toLowerCase() === email.toLowerCase())
    if (existingAccepted) {
      return NextResponse.json(
        { error: 'User is already a member' },
        { status: 409 }
      )
    }

    // Create new invite
    const invite = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      role,
      token: generateToken(),
      invitedBy: invitedBy || 'admin',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    }

    invites.pending.push(invite)
    await writeJSON(INVITES_PATH, invites)

    // In production, send email here
    // For now, return the invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://v0-master-roofing-ai-2-1u.vercel.app'}/accept-invite?token=${invite.token}`

    return NextResponse.json({
      success: true,
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expiresAt,
      },
      inviteUrl, // Would be sent via email in production
    })
  } catch (error) {
    console.error('Failed to create invite:', error)
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}

// DELETE - Revoke invite
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const inviteId = searchParams.get('id')

    if (!inviteId) {
      return NextResponse.json(
        { error: 'Invite ID is required' },
        { status: 400 }
      )
    }

    const invites = await readJSON(INVITES_PATH) || { pending: [], accepted: [] }

    const index = invites.pending.findIndex(i => i.id === inviteId)
    if (index === -1) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    invites.pending.splice(index, 1)
    await writeJSON(INVITES_PATH, invites)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to revoke invite:', error)
    return NextResponse.json(
      { error: 'Failed to revoke invite' },
      { status: 500 }
    )
  }
}
