/**
 * Google OAuth Callback
 * Exchanges authorization code for access token
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { writeJSON } from '@/lib/gcs-storage'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

function getBaseUrl(request) {
  const url = new URL(request.url)
  return url.origin
}

function getRedirectUri(request) {
  return `${getBaseUrl(request)}/api/auth/google/callback`
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = getBaseUrl(request)

  // Handle error from Google
  if (error) {
    return NextResponse.redirect(`${baseUrl}/?google_error=${error}`)
  }

  // Verify state to prevent CSRF
  const cookieStore = await cookies()
  const storedState = cookieStore.get('google_oauth_state')?.value

  if (!state || state !== storedState) {
    return NextResponse.redirect(`${baseUrl}/?google_error=invalid_state`)
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}/?google_error=no_code`)
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: getRedirectUri(request),
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Google token exchange failed:', errorData)
      // Return detailed error for debugging
      const errorEncoded = encodeURIComponent(errorData.substring(0, 200))
      return NextResponse.redirect(`${baseUrl}/?google_error=token_exchange_failed&details=${errorEncoded}`)
    }

    const tokenData = await tokenResponse.json()

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    })

    const userData = await userResponse.json()

    // Store token in GCS (keyed by user email)
    const userId = userData.id
    const tokenPath = `auth/google/${userId}.json`

    await writeJSON(tokenPath, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
      created_at: Date.now(),
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
      },
    })

    // Set cookie to identify connected user
    const response = NextResponse.redirect(`${baseUrl}/?google_connected=true`)

    response.cookies.set('google_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 // 30 days
    })

    // Clear OAuth state cookie
    response.cookies.delete('google_oauth_state')

    return response
  } catch (err) {
    console.error('Google OAuth error:', err)
    return NextResponse.redirect(`${baseUrl}/?google_error=unknown`)
  }
}
