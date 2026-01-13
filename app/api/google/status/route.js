/**
 * Google Connection Status
 * Check if user is connected to Google and get their info
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readJSON } from '@/lib/gcs-storage'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('google_user_id')?.value

    if (!userId) {
      return NextResponse.json({
        connected: false,
        authUrl: '/api/auth/google'
      })
    }

    const tokenData = await readJSON(`auth/google/${userId}.json`)

    if (!tokenData) {
      return NextResponse.json({
        connected: false,
        authUrl: '/api/auth/google'
      })
    }

    return NextResponse.json({
      connected: true,
      user: tokenData.user
    })
  } catch (err) {
    console.error('Google status error:', err)
    return NextResponse.json({
      connected: false,
      authUrl: '/api/auth/google'
    })
  }
}

// POST - Disconnect from Google
export async function POST() {
  try {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('google_user_id')
    return response
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
