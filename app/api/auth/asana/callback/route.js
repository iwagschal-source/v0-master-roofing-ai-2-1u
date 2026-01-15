/**
 * Asana OAuth Callback
 * Exchanges authorization code for access token
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { writeJSON, readJSON } from '@/lib/gcs-storage'

const ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token'

function getBaseUrl(request) {
  const url = new URL(request.url)
  return url.origin
}

function getRedirectUri(request) {
  return `${getBaseUrl(request)}/api/auth/asana/callback`
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = getBaseUrl(request)

  // Handle error from Asana
  if (error) {
    return NextResponse.redirect(`${baseUrl}/?asana_error=${error}`)
  }

  // Verify state to prevent CSRF
  const cookieStore = await cookies()
  const storedState = cookieStore.get('asana_oauth_state')?.value

  if (!state || state !== storedState) {
    return NextResponse.redirect(`${baseUrl}/?asana_error=invalid_state`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?asana_error=no_code`)
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(ASANA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.ASANA_CLIENT_ID?.trim(),
        client_secret: process.env.ASANA_CLIENT_SECRET?.trim(),
        redirect_uri: getRedirectUri(request),
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Asana token exchange failed:', errorData)
      return NextResponse.redirect(`${baseUrl}/?asana_error=token_exchange_failed`)
    }

    const tokenData = await tokenResponse.json()

    // Get user info from Asana
    const userResponse = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()
    const user = userData.data

    // Store token in GCS (keyed by user email or ID)
    // In production, you'd want to encrypt this
    const userId = user.gid
    const tokenPath = `auth/asana/${userId}.json`

    await writeJSON(tokenPath, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      created_at: Date.now(),
      user: {
        gid: user.gid,
        name: user.name,
        email: user.email,
        photo: user.photo?.image_128x128,
      },
      workspaces: user.workspaces,
    })

    // Set cookie to identify connected user
    const response = NextResponse.redirect(`${baseUrl}/?asana_connected=true`)

    response.cookies.set('asana_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })

    // Clear OAuth state cookie
    response.cookies.delete('asana_oauth_state')

    return response
  } catch (err) {
    console.error('Asana OAuth error:', err)
    return NextResponse.redirect(`${getBaseUrl(request)}/?asana_error=unknown`)
  }
}
