/**
 * Google API Test Endpoints
 * Verifies OAuth tokens work by hitting real Google APIs
 *
 * GET /api/google/test?type=gmail    — fetch 5 recent email IDs
 * GET /api/google/test?type=profile  — fetch user profile
 * GET /api/google/test?type=tokens   — check BigQuery token record
 *
 * Phase 13A — Session 59
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getValidGoogleToken } from '@/lib/google-token'
import { getGoogleTokensFromBQ } from '@/lib/google-auth'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'profile'

  // Get user ID from cookie
  const cookieStore = await cookies()
  const userId = cookieStore.get('google_user_id')?.value

  if (!userId) {
    return NextResponse.json({ error: 'Not connected to Google. Visit /api/auth/google to connect.' }, { status: 401 })
  }

  try {
    if (type === 'tokens') {
      // Check BigQuery token record — doesn't need a valid access token
      const bqRecord = await getGoogleTokensFromBQ(userId)
      if (!bqRecord) {
        return NextResponse.json({ error: 'No BigQuery token record found for this user', userId }, { status: 404 })
      }
      return NextResponse.json({
        status: 'ok',
        userId,
        email: bqRecord.email,
        is_active: bqRecord.is_active,
        connected_at: bqRecord.connected_at,
        last_used_at: bqRecord.last_used_at,
        scopes: bqRecord.scopes,
        token_expiry: bqRecord.token_expiry,
        has_refresh_token: !!bqRecord.refresh_token,
        // Never expose actual tokens
      })
    }

    // For profile and gmail tests, we need a valid access token
    const token = await getValidGoogleToken(userId)
    if (!token) {
      return NextResponse.json({ error: 'Failed to get valid Google token. Try reconnecting.' }, { status: 401 })
    }

    if (type === 'profile') {
      const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!profileRes.ok) {
        return NextResponse.json({ error: 'Profile fetch failed', status: profileRes.status }, { status: profileRes.status })
      }
      const profile = await profileRes.json()
      return NextResponse.json({ status: 'ok', profile })
    }

    if (type === 'gmail') {
      const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!gmailRes.ok) {
        const errText = await gmailRes.text()
        return NextResponse.json({ error: 'Gmail fetch failed', status: gmailRes.status, details: errText }, { status: gmailRes.status })
      }
      const gmailData = await gmailRes.json()
      return NextResponse.json({
        status: 'ok',
        messageCount: gmailData.messages?.length || 0,
        messages: gmailData.messages || [],
        resultSizeEstimate: gmailData.resultSizeEstimate,
      })
    }

    return NextResponse.json({ error: `Unknown test type: ${type}. Use: profile, gmail, or tokens` }, { status: 400 })
  } catch (err) {
    console.error('[Google Test] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
