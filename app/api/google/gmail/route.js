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
      const status = listData.error.code === 429 ? 429 : 400
      return NextResponse.json({ error: listData.error.message }, { status })
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
    const { to, cc, bcc, subject, message, threadId, replyToMessageId, attachments } = body

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

    let rawEmail

    if (attachments && attachments.length > 0) {
      // Build multipart/mixed MIME for emails with attachments
      const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`

      let headerLines = [
        `From: ${fromEmail}`,
        `To: ${Array.isArray(to) ? to.join(', ') : to}`,
      ]

      if (cc && (Array.isArray(cc) ? cc.length > 0 : cc.trim())) {
        headerLines.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`)
      }
      if (bcc && (Array.isArray(bcc) ? bcc.length > 0 : bcc.trim())) {
        headerLines.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`)
      }

      headerLines.push(
        `Subject: ${subject || '(No Subject)'}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
      )

      if (replyToMessageId) {
        headerLines.push(`In-Reply-To: ${replyToMessageId}`)
        headerLines.push(`References: ${replyToMessageId}`)
      }

      // Build MIME body
      let mimeParts = []
      mimeParts.push(headerLines.join('\r\n'))
      mimeParts.push('')
      mimeParts.push(`--${boundary}`)
      mimeParts.push('Content-Type: text/plain; charset=utf-8')
      mimeParts.push('Content-Transfer-Encoding: 7bit')
      mimeParts.push('')
      mimeParts.push(message)

      for (const att of attachments) {
        mimeParts.push(`--${boundary}`)
        mimeParts.push(`Content-Type: ${att.mimeType}; name="${att.filename}"`)
        mimeParts.push('Content-Transfer-Encoding: base64')
        mimeParts.push(`Content-Disposition: attachment; filename="${att.filename}"`)
        mimeParts.push('')
        // Split base64 into 76-char lines per RFC 2045
        const b64 = att.data
        const lines = []
        for (let i = 0; i < b64.length; i += 76) {
          lines.push(b64.slice(i, i + 76))
        }
        mimeParts.push(lines.join('\r\n'))
      }

      mimeParts.push(`--${boundary}--`)
      rawEmail = mimeParts.join('\r\n')
    } else {
      // Simple text email (no attachments)
      let emailLines = [
        `From: ${fromEmail}`,
        `To: ${Array.isArray(to) ? to.join(', ') : to}`,
      ]

      if (cc && (Array.isArray(cc) ? cc.length > 0 : cc.trim())) {
        emailLines.push(`Cc: ${Array.isArray(cc) ? cc.join(', ') : cc}`)
      }
      if (bcc && (Array.isArray(bcc) ? bcc.length > 0 : bcc.trim())) {
        emailLines.push(`Bcc: ${Array.isArray(bcc) ? bcc.join(', ') : bcc}`)
      }

      emailLines.push(
        `Subject: ${subject || '(No Subject)'}`,
        'Content-Type: text/plain; charset=utf-8',
        'MIME-Version: 1.0',
      )

      if (replyToMessageId) {
        emailLines.push(`In-Reply-To: ${replyToMessageId}`)
        emailLines.push(`References: ${replyToMessageId}`)
      }

      emailLines.push('')
      emailLines.push(message)
      rawEmail = emailLines.join('\r\n')
    }

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
