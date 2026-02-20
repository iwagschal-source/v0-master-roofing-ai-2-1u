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
      // Normalize spaceId - remove "spaces/" prefix if present to avoid double path
      const normalizedSpaceId = spaceId.startsWith('spaces/') ? spaceId.replace('spaces/', '') : spaceId
      const messagesRes = await fetch(
        `${CHAT_API}/spaces/${normalizedSpaceId}/messages?pageSize=50`,
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
        text: msg.text || '',
        formattedText: msg.formattedText || '',
        sender: {
          name: msg.sender?.name || '',
          displayName: msg.sender?.displayName || '',
          email: msg.sender?.email || '',
          avatarUrl: msg.sender?.avatarUrl || '',
          type: msg.sender?.type || 'HUMAN',
        },
        createTime: msg.createTime,
        space: msg.space,
        quotedMessageMetadata: msg.quotedMessageMetadata || null,
        emojiReactionSummaries: msg.emojiReactionSummaries || [],
        annotations: msg.annotations || [],
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

    // Map spaces: resolve DM names from members + fetch last message preview
    const spaces = await Promise.all(
      (spacesData.spaces || []).map(async (space) => {
        let displayName = space.displayName
        const spaceType = space.spaceType || space.type
        const isDm = spaceType === 'DIRECT_MESSAGE' || space.type === 'DM' || space.type === 'GROUP_DM'
        let lastMessage = null
        let memberCount = 0

        // For DMs: get OTHER person's name (filter out current user)
        if (isDm) {
          try {
            const membersRes = await fetch(
              `${CHAT_API}/${space.name}/members?pageSize=10`,
              { headers: { 'Authorization': `Bearer ${token}` } }
            )
            const membersData = await membersRes.json()
            if (membersData.memberships) {
              // Filter out current user by matching users/{userId}
              const otherMembers = membersData.memberships
                .filter(m => m.member?.type === 'HUMAN' && m.member?.name !== `users/${userId}`)
                .map(m => m.member?.displayName)
                .filter(Boolean)
              memberCount = membersData.memberships.filter(m => m.member?.type === 'HUMAN').length
              if (otherMembers.length > 0) {
                displayName = otherMembers.join(', ')
              }
            }
          } catch (e) {
            // Silently fail — will use fallback
          }
        }

        // Fetch last message for preview (1 message, newest first)
        try {
          const msgRes = await fetch(
            `${CHAT_API}/${space.name}/messages?pageSize=1&orderBy=createTime%20desc`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          const msgData = await msgRes.json()
          if (msgData.messages?.[0]) {
            const msg = msgData.messages[0]
            lastMessage = {
              text: (msg.text || '').substring(0, 120),
              senderName: msg.sender?.displayName || 'Unknown',
              senderEmail: msg.sender?.email || '',
              createTime: msg.createTime,
            }
          }
        } catch (e) {
          // Silently fail
        }

        // Final fallback for displayName
        if (!displayName || displayName === space.name || displayName.startsWith('spaces/')) {
          displayName = isDm ? 'Direct Message' : 'Chat Space'
        }

        return {
          id: space.name,
          name: space.name,
          displayName,
          type: space.type,
          lastActiveTime: space.lastActiveTime || null,
          lastMessage,
          memberCount,
          singleUserBotDm: space.singleUserBotDm,
          spaceThreadingState: space.spaceThreadingState,
        }
      })
    )

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

    // Normalize spaceId - remove "spaces/" prefix if present to avoid double path
    const normalizedSpaceId = spaceId.startsWith('spaces/') ? spaceId.replace('spaces/', '') : spaceId

    // Send message via Google Chat API
    const sendRes = await fetch(
      `${CHAT_API}/spaces/${normalizedSpaceId}/messages`,
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
