/**
 * Google OAuth - Initiate Authorization
 * Handles Gmail, Calendar/Meet, and Chat access
 *
 * Setup required:
 * 1. Create OAuth credentials at https://console.cloud.google.com/apis/credentials
 * 2. Enable Gmail API, Calendar API, and Chat API
 * 3. Set redirect URI to: https://your-domain.com/api/auth/google/callback
 * 4. Add to .env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

import { NextResponse } from 'next/server'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  : 'http://localhost:3000/api/auth/google/callback'

// Scopes for Gmail, Calendar, and Chat
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

export async function GET(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID

  if (!clientId) {
    return NextResponse.json(
      { error: 'Google OAuth not configured. Add GOOGLE_CLIENT_ID to environment.' },
      { status: 500 }
    )
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID()

  // Store state in cookie for verification
  const response = NextResponse.redirect(
    `${GOOGLE_AUTH_URL}?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: SCOPES,
      state: state,
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Force consent to get refresh token
    })
  )

  response.cookies.set('google_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })

  return response
}
