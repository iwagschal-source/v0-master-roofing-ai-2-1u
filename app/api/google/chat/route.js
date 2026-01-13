/**
 * Google Chat API
 * Fetches user's Chat spaces and messages
 * Note: Google Chat API requires a Google Workspace account
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getValidGoogleToken } from '@/lib/google-token'

const CHAT_API = 'https://chat.googleapis.com/v1'

// GET - Fetch spaces or messages
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const spaceId = searchParams.get('space') // If provided, fetch messages from this space

    const cookieStore = await cookies()
    const userId = cookieStore.get('google_user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Not connected to Google', needsAuth: true },
        { status: 401 }
      )
    }

    const token = await getValidGoogleToken(userId)
    if (!token) {
      return NextResponse.json(
        { error: 'Not connected to Google or token refresh failed', needsAuth: true },
        { status: 401 }
      )
    }

    // If spaceId provided, fetch messages from that space
    if (spaceId) {
      const messagesRes = await fetch(
        `${CHAT_API}/spaces/${spaceId}/messages?pageSize=50`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const messagesData = await messagesRes.json()

      if (messagesData.error) {
        // Google Chat API may not be available for personal accounts
        if (messagesData.error.code === 403) {
          return NextResponse.json({
            error: 'Google Chat requires a Google Workspace account',
            needsWorkspace: true
          }, { status: 403 })
        }
        return NextResponse.json({ error: messagesData.error.message }, { status: 400 })
      }

      const messages = (messagesData.messages || []).map(msg => ({
        id: msg.name,
        text: msg.text,
        sender: msg.sender,
        createTime: msg.createTime,
        space: msg.space,
      }))

      return NextResponse.json({ messages })
    }

    // Fetch list of spaces
    const spacesRes = await fetch(
      `${CHAT_API}/spaces?pageSize=50`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const spacesData = await spacesRes.json()

    if (spacesData.error) {
      // Google Chat API may not be available for personal accounts
      if (spacesData.error.code === 403) {
        return NextResponse.json({
          error: 'Google Chat requires a Google Workspace account',
          needsWorkspace: true
        }, { status: 403 })
      }
      return NextResponse.json({ error: spacesData.error.message }, { status: 400 })
    }

    const spaces = (spacesData.spaces || []).map(space => ({
      id: space.name, // space.name is already in "spaces/XXXXX" format
      name: space.name, // Full resource name
      displayName: space.displayName || space.name.replace('spaces/', ''),
      type: space.type, // ROOM, DM, etc
      singleUserBotDm: space.singleUserBotDm,
      spaceThreadingState: space.spaceThreadingState,
    }))

    return NextResponse.json({ spaces })
  } catch (err) {
    console.error('Chat API error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch chat data' },
      { status: 500 }
    )
  }
}

// POST - Send a message to a space
export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const userId = cookieStore.get('google_user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Not connected to Google', needsAuth: true },
        { status: 401 }
      )
    }

    const token = await getValidGoogleToken(userId)
    if (!token) {
      return NextResponse.json(
        { error: 'Not connected to Google or token refresh failed', needsAuth: true },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { spaceId, text } = body

    if (!spaceId || !text) {
      return NextResponse.json(
        { error: 'Missing required fields: spaceId, text' },
        { status: 400 }
      )
    }

    // Send message via Google Chat API
    const sendRes = await fetch(
      `${CHAT_API}/spaces/${spaceId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
        }),
      }
    )

    const sendData = await sendRes.json()

    if (sendData.error) {
      console.error('Chat send error:', sendData.error)
      return NextResponse.json(
        { error: sendData.error.message || 'Failed to send message' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: sendData,
    })
  } catch (err) {
    console.error('Chat send error:', err)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
