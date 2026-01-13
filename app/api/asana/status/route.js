/**
 * Asana Connection Status
 * Check if user is connected to Asana and get their info
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readJSON } from '@/lib/gcs-storage'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('asana_user_id')?.value

    if (!userId) {
      return NextResponse.json({
        connected: false,
        authUrl: '/api/auth/asana'
      })
    }

    const tokenData = await readJSON(`auth/asana/${userId}.json`)

    if (!tokenData) {
      return NextResponse.json({
        connected: false,
        authUrl: '/api/auth/asana'
      })
    }

    return NextResponse.json({
      connected: true,
      user: tokenData.user,
      workspaces: tokenData.workspaces
    })
  } catch (err) {
    console.error('Asana status error:', err)
    return NextResponse.json({
      connected: false,
      authUrl: '/api/auth/asana'
    })
  }
}

// POST - Disconnect from Asana
export async function POST(request) {
  try {
    const cookieStore = await cookies()

    const response = NextResponse.json({ success: true })
    response.cookies.delete('asana_user_id')

    return response
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    )
  }
}
