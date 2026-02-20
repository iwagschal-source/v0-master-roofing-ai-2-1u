/**
 * Google Chat API
 * Fetches user's Chat spaces and messages
 * Resolves user IDs to display names via People API directory + member lists
 * Note: Google Chat API requires a Google Workspace account
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getValidGoogleToken } from '@/lib/google-token'

const CHAT_API = 'https://chat.googleapis.com/v1'
const PEOPLE_API = 'https://people.googleapis.com/v1'

// ─── Name Resolution Cache ──────────────────────────────────
// In-memory cache shared across requests within the same server instance
const nameCache = new Map() // key: "users/{id}" → value: { name, email, photoUrl }
let nameCacheExpiry = 0
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

/**
 * Build a name resolution cache from:
 * 1. People API directory (domain profiles) — maps source IDs to names
 * 2. Chat space members — gets user IDs for matching
 * 3. Current user's own profile
 */
async function buildNameCache(token, currentUserId) {
  if (Date.now() < nameCacheExpiry && nameCache.size > 1) return

  // Strategy 1: People API listDirectoryPeople
  // Returns all users in the Google Workspace domain with names, emails, photos
  try {
    let nextPageToken = null
    do {
      const params = new URLSearchParams({
        readMask: 'names,emailAddresses,photos,metadata',
        sources: 'DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE',
        pageSize: '200',
      })
      if (nextPageToken) params.set('pageToken', nextPageToken)

      const res = await fetch(`${PEOPLE_API}/people:listDirectoryPeople?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()

      if (data.error) {
        console.warn('[Chat nameCache] Directory API error:', data.error.message)
        break
      }

      for (const person of data.people || []) {
        const name = person.names?.[0]?.displayName || ''
        const email = person.emailAddresses?.[0]?.value || ''
        const photoUrl = person.photos?.[0]?.url || ''

        if (!name) continue

        // Index by all available source IDs (may include Google account ID)
        for (const source of person.metadata?.sources || []) {
          if (source.id) {
            nameCache.set(`users/${source.id}`, { name, email, photoUrl })
          }
        }
        // Also index by email for cross-referencing
        if (email) {
          nameCache.set(`email:${email.toLowerCase()}`, { name, email, photoUrl })
        }
      }

      nextPageToken = data.nextPageToken
    } while (nextPageToken)
  } catch (e) {
    console.warn('[Chat nameCache] Directory fetch failed:', e.message)
  }

  // Strategy 2: Current user's profile via People API /people/me
  try {
    const meRes = await fetch(`${PEOPLE_API}/people/me?personFields=names,emailAddresses,photos`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const meData = await meRes.json()
    if (!meData.error) {
      const myName = meData.names?.[0]?.displayName || ''
      const myEmail = meData.emailAddresses?.[0]?.value || ''
      const myPhoto = meData.photos?.[0]?.url || ''
      if (myName) {
        nameCache.set(`users/${currentUserId}`, { name: myName, email: myEmail, photoUrl: myPhoto })
        if (myEmail) {
          nameCache.set(`email:${myEmail.toLowerCase()}`, { name: myName, email: myEmail, photoUrl: myPhoto })
        }
      }
    }
  } catch (e) {
    // Non-fatal
  }

  nameCacheExpiry = Date.now() + CACHE_TTL
  console.log(`[Chat nameCache] Cached ${nameCache.size} entries`)
}

/**
 * Resolve a Chat user ID (users/xxxxx) to a display name
 */
function resolveUser(userIdStr) {
  const cached = nameCache.get(userIdStr)
  if (cached) return cached

  // Fallback: clean identifier, never show raw "users/xxxxxxxxxxxx"
  const id = (userIdStr || '').replace('users/', '')
  return { name: `User #${id.slice(-4)}`, email: '', photoUrl: '' }
}

/**
 * Resolve members of a space and return the "other" person's names for DMs.
 * Also populates nameCache with Chat user ID → displayName from member listings.
 */
async function resolveSpaceMembers(spaceName, token, currentUserId) {
  try {
    const res = await fetch(`${CHAT_API}/${spaceName}/members?pageSize=100`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()

    if (data.error) {
      console.warn('[Chat members]', spaceName, data.error.message)
      return { otherNames: [], memberCount: 0, memberIds: [] }
    }

    const memberships = data.memberships || []
    const humanMembers = memberships.filter(m => m.member?.type === 'HUMAN')
    const memberCount = humanMembers.length
    const memberIds = humanMembers.map(m => m.member?.name).filter(Boolean)

    const otherNames = []
    for (const m of humanMembers) {
      const memberUserId = m.member?.name // e.g. "users/123456"
      const displayName = m.member?.displayName

      // Cache every member's displayName against their Chat user ID
      if (memberUserId && displayName) {
        if (!nameCache.has(memberUserId)) {
          nameCache.set(memberUserId, { name: displayName, email: '', photoUrl: '' })
        }
      }

      if (memberUserId === `users/${currentUserId}`) continue // skip self

      // Use displayName from member, then directory cache, then fallback
      let name = displayName
      if (!name) {
        const resolved = resolveUser(memberUserId || '')
        name = resolved.name
      }
      if (name) otherNames.push(name)
    }

    return { otherNames, memberCount, memberIds }
  } catch (e) {
    console.warn('[Chat members] fetch failed:', e.message)
    return { otherNames: [], memberCount: 0, memberIds: [] }
  }
}

// GET - Fetch spaces or messages
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const spaceId = searchParams.get('space')

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

    // Build name cache (cached, only refreshes after TTL)
    await buildNameCache(token, userId)

    // ─── Fetch messages from a specific space ───
    if (spaceId) {
      const normalizedSpaceId = spaceId.startsWith('spaces/') ? spaceId.replace('spaces/', '') : spaceId

      // Resolve members first so nameCache has Chat user ID → displayName
      await resolveSpaceMembers(`spaces/${normalizedSpaceId}`, token, userId)

      const messagesRes = await fetch(
        `${CHAT_API}/spaces/${normalizedSpaceId}/messages?pageSize=50&orderBy=createTime%20desc`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const messagesData = await messagesRes.json()

      if (messagesData.error) {
        if (messagesData.error.code === 403) {
          return NextResponse.json({
            error: 'Google Chat requires a Google Workspace account',
            needsWorkspace: true
          }, { status: 403 })
        }
        return NextResponse.json({ error: messagesData.error.message }, { status: 400 })
      }

      // Resolve sender names for all messages
      const messages = (messagesData.messages || []).map(msg => {
        const senderInfo = resolveUser(msg.sender?.name || '')
        // Prefer API-provided displayName if available (future-proof)
        const displayName = msg.sender?.displayName || senderInfo.name
        const email = msg.sender?.email || senderInfo.email
        const avatarUrl = msg.sender?.avatarUrl || senderInfo.photoUrl

        return {
          id: msg.name,
          text: msg.text || '',
          formattedText: msg.formattedText || '',
          sender: {
            name: msg.sender?.name || '',
            displayName,
            email,
            avatarUrl,
            type: msg.sender?.type || 'HUMAN',
          },
          createTime: msg.createTime,
          space: msg.space,
          quotedMessageMetadata: msg.quotedMessageMetadata || null,
          emojiReactionSummaries: msg.emojiReactionSummaries || [],
          annotations: msg.annotations || [],
        }
      })

      return NextResponse.json({ messages })
    }

    // ─── Fetch ALL spaces (paginate through every page) ───
    let allRawSpaces = []
    let spacesPageToken = null
    do {
      const sparams = new URLSearchParams({ pageSize: '200' })
      if (spacesPageToken) sparams.set('pageToken', spacesPageToken)

      const spacesRes = await fetch(
        `${CHAT_API}/spaces?${sparams}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const spacesData = await spacesRes.json()

      if (spacesData.error) {
        if (spacesData.error.code === 403) {
          return NextResponse.json({
            error: 'Google Chat requires a Google Workspace account',
            needsWorkspace: true
          }, { status: 403 })
        }
        // If we already have some spaces, stop paginating; otherwise return error
        if (allRawSpaces.length === 0) {
          return NextResponse.json({ error: spacesData.error.message }, { status: 400 })
        }
        break
      }

      allRawSpaces.push(...(spacesData.spaces || []))
      spacesPageToken = spacesData.nextPageToken
    } while (spacesPageToken)

    // Sort ALL spaces by lastActiveTime descending — most recent first
    allRawSpaces.sort((a, b) => {
      const aTime = a.lastActiveTime || ''
      const bTime = b.lastActiveTime || ''
      return bTime.localeCompare(aTime)
    })

    // Only process the top 50 most recently active spaces for previews
    const topSpaces = allRawSpaces.slice(0, 50)

    // Map spaces: resolve DM names + fetch last message preview
    const spaces = await Promise.all(
      topSpaces.map(async (space) => {
        let displayName = space.displayName
        const spaceType = space.spaceType || space.type
        const isDm = spaceType === 'DIRECT_MESSAGE' || spaceType === 'GROUP_CHAT'
        let lastMessage = null
        let memberCount = 0

        // For DMs and group chats: resolve member names
        if (isDm || !displayName) {
          const { otherNames, memberCount: mc } = await resolveSpaceMembers(
            space.name, token, userId
          )
          memberCount = mc
          if (otherNames.length > 0) {
            displayName = otherNames.join(', ')
          }
        }

        // Fetch recent messages for preview + name resolution
        let otherSenderName = null
        try {
          const msgRes = await fetch(
            `${CHAT_API}/${space.name}/messages?pageSize=5&orderBy=createTime%20desc`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          )
          const msgData = await msgRes.json()
          const msgs = msgData.messages || []

          if (msgs[0]) {
            const msg = msgs[0]
            const senderInfo = resolveUser(msg.sender?.name || '')
            const senderName = msg.sender?.displayName || senderInfo.name

            lastMessage = {
              text: (msg.text || '').substring(0, 120),
              senderName,
              senderEmail: msg.sender?.email || senderInfo.email || '',
              createTime: msg.createTime,
            }
          }

          // For DMs: scan messages to find the OTHER person's name
          // (skip current user and bots)
          if (isDm && (!displayName || displayName.startsWith('spaces/'))) {
            for (const msg of msgs) {
              if (msg.sender?.name === `users/${userId}`) continue
              if (msg.sender?.type === 'BOT') continue
              const info = resolveUser(msg.sender?.name || '')
              const name = msg.sender?.displayName || info.name
              if (name && !name.startsWith('User #') && name !== 'Unknown') {
                otherSenderName = name
                break
              }
            }
          }
        } catch (e) {
          // Silently fail
        }

        // Final fallback for displayName — never show raw space IDs
        if (!displayName || displayName === space.name || displayName.startsWith('spaces/')) {
          if (isDm) {
            // Use other person's name found from messages, excluding self
            if (otherSenderName) {
              displayName = otherSenderName
            } else if (lastMessage?.senderName &&
              lastMessage.senderName !== 'Unknown' &&
              !lastMessage.senderName.startsWith('User #') &&
              lastMessage.senderEmail !== nameCache.get(`users/${userId}`)?.email) {
              displayName = lastMessage.senderName
            } else {
              displayName = 'Direct Message'
            }
          } else {
            displayName = 'Chat Space'
          }
        }

        return {
          id: space.name,
          name: space.name,
          displayName,
          type: spaceType === 'DIRECT_MESSAGE' ? 'DM'
            : spaceType === 'GROUP_CHAT' ? 'GROUP_DM'
            : 'ROOM',
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

/**
 * Upload a file attachment to a Google Chat space.
 * Uses Google's multipart/related upload protocol.
 */
async function uploadAttachment(token, spaceName, file) {
  const boundary = 'chat_upload_' + Date.now()
  const normalizedSpace = spaceName.startsWith('spaces/') ? spaceName : `spaces/${spaceName}`

  const metadata = JSON.stringify({ filename: file.name })
  const fileBuffer = Buffer.from(await file.arrayBuffer())
  const fileType = file.type || 'application/octet-stream'

  // Build multipart/related body
  const parts = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: ${fileType}\r\n\r\n`,
  ]

  const prefix = Buffer.from(parts[0] + parts[1], 'utf-8')
  const suffix = Buffer.from(`\r\n--${boundary}--`, 'utf-8')
  const body = Buffer.concat([prefix, fileBuffer, suffix])

  const res = await fetch(
    `https://chat.googleapis.com/upload/v1/media/${normalizedSpace}/attachments:upload?uploadType=multipart`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  const data = await res.json()
  if (data.error) {
    console.error('[Chat upload] Error:', data.error.message)
    return null
  }
  return data.attachmentDataRef || null
}

// POST - Send a message to a space (supports JSON or FormData with attachments)
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

    // Detect content type — FormData (with files) or JSON (text only)
    const contentType = request.headers.get('content-type') || ''
    let spaceId, text, files = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      spaceId = formData.get('spaceId')
      text = formData.get('text') || ''
      files = formData.getAll('files').filter(f => f && f.size > 0)
    } else {
      const body = await request.json()
      spaceId = body.spaceId
      text = body.text
    }

    if (!spaceId || (!text && files.length === 0)) {
      return NextResponse.json(
        { error: 'Missing required fields: spaceId and (text or files)' },
        { status: 400 }
      )
    }

    const normalizedSpaceId = spaceId.startsWith('spaces/') ? spaceId.replace('spaces/', '') : spaceId

    // Upload attachments if any
    const attachmentRefs = []
    for (const file of files) {
      const ref = await uploadAttachment(token, `spaces/${normalizedSpaceId}`, file)
      if (ref) {
        attachmentRefs.push({ attachmentDataRef: ref })
      }
    }

    // Build message payload
    const messagePayload = {}
    if (text) messagePayload.text = text
    if (attachmentRefs.length > 0) messagePayload.attachment = attachmentRefs

    const sendRes = await fetch(
      `${CHAT_API}/spaces/${normalizedSpaceId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
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
