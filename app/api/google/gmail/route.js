/**
 * Gmail API
 * Fetches user's emails from Gmail
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readJSON } from '@/lib/gcs-storage'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'

async function getGoogleToken(userId) {
  if (!userId) return null
  const tokenData = await readJSON(`auth/google/${userId}.json`)
  return tokenData?.access_token
}

// GET - Fetch emails
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const maxResults = searchParams.get('maxResults') || '20'
    const labelIds = searchParams.get('labelIds') || 'INBOX'
    const messageId = searchParams.get('id') // For fetching single message

    const cookieStore = await cookies()
    const userId = cookieStore.get('google_user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Not connected to Google', needsAuth: true },
        { status: 401 }
      )
    }

    const token = await getGoogleToken(userId)
    if (!token) {
      return NextResponse.json(
        { error: 'Google token expired', needsAuth: true },
        { status: 401 }
      )
    }

    // If messageId provided, fetch single message
    if (messageId) {
      const msgRes = await fetch(
        `${GMAIL_API}/users/me/messages/${messageId}?format=full`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const msgData = await msgRes.json()

      if (msgData.error) {
        return NextResponse.json({ error: msgData.error.message }, { status: 400 })
      }

      // Parse message
      const headers = msgData.payload?.headers || []
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value

      // Get body
      let body = ''
      if (msgData.payload?.body?.data) {
        body = Buffer.from(msgData.payload.body.data, 'base64').toString('utf-8')
      } else if (msgData.payload?.parts) {
        const textPart = msgData.payload.parts.find(p => p.mimeType === 'text/plain')
        if (textPart?.body?.data) {
          body = Buffer.from(textPart.body.data, 'base64').toString('utf-8')
        }
      }

      return NextResponse.json({
        id: msgData.id,
        threadId: msgData.threadId,
        subject: getHeader('Subject') || '(No Subject)',
        from: getHeader('From'),
        to: getHeader('To'),
        date: getHeader('Date'),
        snippet: msgData.snippet,
        body: body,
        labelIds: msgData.labelIds,
      })
    }

    // Fetch message list
    const listRes = await fetch(
      `${GMAIL_API}/users/me/messages?maxResults=${maxResults}&labelIds=${labelIds}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const listData = await listRes.json()

    if (listData.error) {
      return NextResponse.json({ error: listData.error.message }, { status: 400 })
    }

    // Fetch details for each message (basic info only)
    const messages = await Promise.all(
      (listData.messages || []).slice(0, 20).map(async (msg) => {
        const msgRes = await fetch(
          `${GMAIL_API}/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const msgData = await msgRes.json()

        const headers = msgData.payload?.headers || []
        const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value

        return {
          id: msgData.id,
          threadId: msgData.threadId,
          subject: getHeader('Subject') || '(No Subject)',
          from: getHeader('From'),
          date: getHeader('Date'),
          snippet: msgData.snippet,
          labelIds: msgData.labelIds,
          isUnread: msgData.labelIds?.includes('UNREAD'),
        }
      })
    )

    return NextResponse.json({ messages })
  } catch (err) {
    console.error('Gmail API error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch emails' },
      { status: 500 }
    )
  }
}

// POST - Send email
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

    const token = await getGoogleToken(userId)
    if (!token) {
      return NextResponse.json(
        { error: 'Google token expired', needsAuth: true },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { to, subject, message, threadId, replyToMessageId } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      )
    }

    // Get user's email for the From header
    const tokenData = await readJSON(`auth/google/${userId}.json`)
    const fromEmail = tokenData?.user?.email

    // Build the email in RFC 2822 format
    let emailLines = [
      `From: ${fromEmail}`,
      `To: ${Array.isArray(to) ? to.join(', ') : to}`,
      `Subject: ${subject || '(No Subject)'}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
    ]

    // Add threading headers if replying
    if (replyToMessageId) {
      emailLines.push(`In-Reply-To: ${replyToMessageId}`)
      emailLines.push(`References: ${replyToMessageId}`)
    }

    // Add blank line then body
    emailLines.push('')
    emailLines.push(message)

    const rawEmail = emailLines.join('\r\n')

    // Encode to base64url
    const encodedEmail = Buffer.from(rawEmail)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    // Send via Gmail API
    const sendUrl = threadId
      ? `${GMAIL_API}/users/me/messages/send`
      : `${GMAIL_API}/users/me/messages/send`

    const sendRes = await fetch(sendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedEmail,
        threadId: threadId || undefined,
      }),
    })

    const sendData = await sendRes.json()

    if (sendData.error) {
      console.error('Gmail send error:', sendData.error)
      return NextResponse.json(
        { error: sendData.error.message || 'Failed to send email' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      messageId: sendData.id,
      threadId: sendData.threadId,
    })
  } catch (err) {
    console.error('Gmail send error:', err)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    )
  }
}
