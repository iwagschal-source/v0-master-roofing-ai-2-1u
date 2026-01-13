/**
 * Asana OAuth - Initiate Authorization
 * Redirects user to Asana to authorize the app
 *
 * Setup required:
 * 1. Create app at https://app.asana.com/0/developer-console
 * 2. Set redirect URI to: https://your-domain.com/api/auth/asana/callback
 * 3. Add to .env: ASANA_CLIENT_ID, ASANA_CLIENT_SECRET
 */

import { NextResponse } from 'next/server'

const ASANA_AUTH_URL = 'https://app.asana.com/-/oauth_authorize'

function getRedirectUri(request) {
  const url = new URL(request.url)
  return `${url.origin}/api/auth/asana/callback`
}

export async function GET(request) {
  const clientId = process.env.ASANA_CLIENT_ID

  if (!clientId) {
    return NextResponse.json(
      { error: 'Asana OAuth not configured. Add ASANA_CLIENT_ID to environment.' },
      { status: 500 }
    )
  }

  // Generate state for CSRF protection
  const state = crypto.randomUUID()

  // Store state in cookie for verification
  const redirectUri = getRedirectUri(request)
  const response = NextResponse.redirect(
    `${ASANA_AUTH_URL}?` + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state: state,
      // Request access to user's tasks, projects, and workspaces
      scope: 'default'
    })
  )

  response.cookies.set('asana_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600 // 10 minutes
  })

  return response
}
