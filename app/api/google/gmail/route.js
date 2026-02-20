/**
 * Gmail API
 * Fetches user's emails from Gmail — supports threads, attachments, HTML
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getValidGoogleToken } from '@/lib/google-token'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'

// Recursively find body and attachments from MIME parts
function parseMessageParts(parts, result = { textBody: '', htmlBody: '', attachments: [] }) {
  for (const part of parts || []) {
    // Attachment: has filename and attachmentId
    if (part.filename && part.filename.length > 0 && part.body?.attachmentId) {
      result.attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size || 0,
        attachmentId: part.body.attachmentId,
      })
    } else if (part.mimeType === 'text/plain' && part.body?.data && !result.textBody) {
      result.textBody = Buffer.from(part.body.data, 'base64').toString('utf-8')
    } else if (part.mimeType === 'text/html' && part.body?.data && !result.htmlBody) {
      result.htmlBody = Buffer.from(part.body.data, 'base64').toString('utf-8')
    }
    // Recurse into nested parts (multipart/alternative, multipart/mixed, etc.)
    if (part.parts) {
      parseMessageParts(part.parts, result)
    }
  }
  return result
}

// Parse a single Gmail message payload into our format
function parseGmailMessage(msgData) {
  const headers = msgData.payload?.headers || []
  const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value

  // Parse body and attachments from MIME structure
  let textBody = ''
  let htmlBody = ''
  let attachments = []

  if (msgData.payload?.parts) {
    const parsed = parseMessageParts(msgData.payload.parts)
    textBody = parsed.textBody
    htmlBody = parsed.htmlBody
    attachments = parsed.attachments
  } else if (msgData.payload?.body?.data) {
    // Simple message with no parts
    const decoded = Buffer.from(msgData.payload.body.data, 'base64').toString('utf-8')
    if (msgData.payload.mimeType === 'text/html') {
      htmlBody = decoded
    } else {
      textBody = decoded
    }
  }

  return {
    id: msgData.id,
    threadId: msgData.threadId,
    subject: getHeader('Subject') || '(No Subject)',
    from: getHeader('From'),
    to: getHeader('To'),
    cc: getHeader('Cc'),
    date: getHeader('Date'),
    snippet: msgData.snippet,
    body: textBody,
    htmlBody: htmlBody,
    attachments: attachments,
    labelIds: msgData.labelIds,
  }
}

// GET - Fetch emails, threads, or attachments
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const maxResults = searchParams.get('maxResults') || '20'
    const labelIds = searchParams.get('labelIds') || 'INBOX'
    const messageId = searchParams.get('id')
    const threadId = searchParams.get('threadId')
    const attachmentId = searchParams.get('attachmentId')
    const attachmentMessageId = searchParams.get('attachmentMessageId')

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

    // Download attachment
    if (attachmentId && attachmentMessageId) {
      const attRes = await fetch(
        `${GMAIL_API}/users/me/messages/${attachmentMessageId}/attachments/${attachmentId}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const attData = await attRes.json()

      if (attData.error) {
        return NextResponse.json({ error: attData.error.message }, { status: 400 })
      }

      // Return base64 data (client will decode or create blob)
      return NextResponse.json({
        data: attData.data, // base64url encoded
        size: attData.size,
      })
    }

    // Fetch full thread (all messages)
    if (threadId) {
      const threadRes = await fetch(
        `${GMAIL_API}/users/me/threads/${threadId}?format=full`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const threadData = await threadRes.json()

      if (threadData.error) {
        return NextResponse.json({ error: threadData.error.message }, { status: 400 })
      }

      const messages = (threadData.messages || []).map(parseGmailMessage)

      return NextResponse.json({
        threadId: threadData.id,
        messages: messages,
      })
    }

    // Fetch single message (legacy support)
    if (messageId) {
      const msgRes = await fetch(
        `${GMAIL_API}/users/me/messages/${messageId}?format=full`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const msgData = await msgRes.json()

      if (msgData.error) {
        return NextResponse.json({ error: msgData.error.message }, { status: 400 })
      }

      return NextResponse.json(parseGmailMessage(msgData))
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

    const token = await getValidGoogleToken(userId)
    if (!token) {
      return NextResponse.json(
        { error: 'Not connected to Google or token refresh failed', needsAuth: true },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { to, cc, bcc, subject, message, threadId, replyToMessageId } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      )
    }

    // Get user's email for the From header
    const { readJSON } = await import('@/lib/gcs-storage')
    const tokenData = await readJSON(`auth/google/${userId}.json`)
    const fromEmail = tokenData?.user?.email

    // Build the email in RFC 2822 format
    let emailLines = [
      `From: ${fromEmail}`,
      `To: ${Array.isArray(to) ? to.join(', ') : to}`,
    ]

    // Add CC if provided
    if (cc && (Array.isArray(cc) ? cc.length > 0 : cc.trim())) {
      emailLines.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`)
    }

    // Add BCC if provided
    if (bcc && (Array.isArray(bcc) ? bcc.length > 0 : bcc.trim())) {
      emailLines.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`)
    }

    emailLines.push(
      `Subject: ${subject || '(No Subject)'}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0',
    )

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
    const sendRes = await fetch(`${GMAIL_API}/users/me/messages/send`, {
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
