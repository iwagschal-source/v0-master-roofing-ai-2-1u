"use client"

import { useState, useEffect, useCallback } from 'react'
import { gmailAPI, GmailMessage, GmailListResponse } from '@/lib/api/endpoints'

interface UseGmailOptions {
  maxResults?: number
  autoFetch?: boolean
  query?: string
  labelIds?: string[]
}

// Fetch from our internal Google API route
async function fetchFromGoogleAPI(maxResults: number, labelIds?: string[]): Promise<GmailMessage[]> {
  const params = new URLSearchParams({ maxResults: String(maxResults) })
  if (labelIds?.length) {
    params.set('labelIds', labelIds.join(','))
  }

  const res = await fetch(`/api/google/gmail?${params}`)
  const data = await res.json()

  if (data.needsAuth) {
    throw new Error('NOT_CONNECTED')
  }

  if (data.error) {
    throw new Error(data.error)
  }

  // Map API response to GmailMessage format
  return (data.messages || []).map((msg: any) => ({
    id: msg.id,
    threadId: msg.threadId,
    from: msg.from || '',
    to: [msg.to || ''],
    subject: msg.subject || '(No Subject)',
    snippet: msg.snippet || '',
    body: msg.body || msg.snippet || '',
    date: msg.date || new Date().toISOString(),
    read: !msg.isUnread,
    labels: msg.labelIds || [],
    attachments: []
  }))
}

async function fetchMessageDetails(messageId: string): Promise<GmailMessage | null> {
  const res = await fetch(`/api/google/gmail?id=${messageId}`)
  const data = await res.json()

  if (data.error || data.needsAuth) {
    return null
  }

  return {
    id: data.id,
    threadId: data.threadId,
    from: data.from || '',
    to: [data.to || ''],
    subject: data.subject || '(No Subject)',
    snippet: data.snippet || '',
    body: data.body || data.snippet || '',
    date: data.date || new Date().toISOString(),
    read: true,
    labels: data.labelIds || [],
    attachments: []
  }
}

interface UseGmailReturn {
  messages: GmailMessage[]
  loading: boolean
  error: string | null
  hasMore: boolean
  selectedMessage: GmailMessage | null
  analysis: {
    summary: string
    actionItems: string[]
    priority: 'high' | 'medium' | 'low'
    strategy: string
    sentiment: 'positive' | 'neutral' | 'negative'
  } | null
  analysisLoading: boolean
  draftReply: string | null
  draftLoading: boolean
  fetchMessages: () => Promise<void>
  fetchMore: () => Promise<void>
  selectMessage: (message: GmailMessage | null) => void
  analyzeMessage: (messageId: string) => Promise<void>
  generateDraft: (messageId: string, tone?: string, instructions?: string) => Promise<void>
  sendReply: (to: string[], subject: string, body: string, threadId?: string) => Promise<boolean>
  markAsRead: (messageId: string) => Promise<void>
  refresh: () => Promise<void>
}

// Mock data for development/demo when backend is unavailable
const MOCK_MESSAGES: GmailMessage[] = [
  {
    id: "1",
    threadId: "t1",
    from: "John Mitchell <john.mitchell@blueskybuilders.com>",
    to: ["iwagschal@masterroofingus.com"],
    subject: "Q4 Proposal Review Needed - 145 Beach 67th St",
    snippet: "Hi Isaac, I wanted to get your thoughts on the updated proposal for the Beach 67th project...",
    body: `Hi Isaac,

I wanted to get your thoughts on the updated proposal for the Beach 67th project. We've made significant revisions based on the client feedback from last week.

The key changes include:
- Updated timeline to accommodate their schedule (start date moved to March 15)
- Revised budget breakdown with more detail on materials
- Added 3 alternative material options for the flat roof section

Can you review and provide your approval by EOD Thursday? The owner is eager to move forward.

Best regards,
John Mitchell
Project Manager
Blue Sky Builders`,
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    labels: ["INBOX", "IMPORTANT"],
    attachments: [
      { filename: "Beach67th-Proposal-v3.pdf", mimeType: "application/pdf", size: 2450000, attachmentId: "att1" },
      { filename: "Budget-Breakdown.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", size: 156000, attachmentId: "att2" }
    ]
  },
  {
    id: "2",
    threadId: "t2",
    from: "Sarah Chen <sarah@turnerconst.com>",
    to: ["iwagschal@masterroofingus.com"],
    subject: "Weekly Performance Summary - Great Numbers!",
    snippet: "Here's the weekly summary of our team's metrics. Overall performance is up 15% from last week...",
    body: `Hi Isaac,

Here's the weekly summary of our team's metrics. Overall performance is up 15% from last week.

Key Highlights:
- Proposals sent: 12 (up from 8)
- Win rate: 41.7% (5 awarded)
- Average deal size: $185K
- Customer satisfaction: 4.9/5

The Turner Construction Hospital project is moving smoothly. Inspection passed on Friday.

Great work by the whole team! Let's keep this momentum going into Q1.

Best,
Sarah Chen
Operations Manager`,
    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    read: false,
    labels: ["INBOX"],
    attachments: []
  },
  {
    id: "3",
    threadId: "t3",
    from: "Mike Rodriguez <mike.r@lennarnyc.com>",
    to: ["iwagschal@masterroofingus.com"],
    subject: "Re: Installation Schedule Conflict - Queens Project",
    snippet: "Thanks for flagging this. I've coordinated with the warehouse team and we can shift...",
    body: `Thanks for flagging this Isaac. I've coordinated with the warehouse team and we can shift the installation to the following week.

New proposed dates:
- Site prep: March 15-16
- Main installation: March 18-20
- Final inspection: March 22

The materials will be delivered on March 14. Does this work better with your crew's schedule?

Mike Rodriguez
Senior Project Manager
Lennar NYC`,
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    labels: ["INBOX"],
    attachments: []
  },
  {
    id: "4",
    threadId: "t4",
    from: "Emily Watson <emily.watson@skanska.com>",
    to: ["iwagschal@masterroofingus.com"],
    subject: "Customer Feedback - Johnson Residence Project",
    snippet: "Just received amazing feedback from the Johnson project. They specifically mentioned...",
    body: `Hi Isaac,

Just received amazing feedback from the Johnson Residence project. They specifically mentioned the professionalism of your crew and the quality of the metalwork.

Here's what Mrs. Johnson wrote:
"The Master Roofing team was exceptional. They showed up on time every day, kept the site clean, and the finished roof looks better than we imagined. Highly recommend!"

They've already referred us to two of their neighbors who are interested in roof replacements. I'll send you their contact info.

This kind of feedback makes all the difference. Great job!

Emily Watson
Customer Success Manager
Skanska USA`,
    date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    read: true,
    labels: ["INBOX", "STARRED"],
    attachments: []
  },
  {
    id: "5",
    threadId: "t5",
    from: "David Park <dpark@tishmanconst.com>",
    to: ["iwagschal@masterroofingus.com"],
    subject: "RFP: Manhattan Plaza Tower - Roof Replacement",
    snippet: "We're inviting Master Roofing to bid on the Manhattan Plaza Tower project...",
    body: `Dear Mr. Wagschal,

Tishman Construction is inviting Master Roofing & Siding to submit a proposal for the Manhattan Plaza Tower roof replacement project.

Project Details:
- Location: 350 W 42nd Street, Manhattan
- Scope: Full roof replacement (45,000 sq ft)
- Timeline: Q2 2025
- Budget Range: $2.5M - $3.2M

Proposal deadline: February 28, 2025
Site visit: February 15, 2025 at 10:00 AM

Please confirm your interest and attendance at the site visit.

Best regards,
David Park
Procurement Director
Tishman Construction`,
    date: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    read: false,
    labels: ["INBOX", "IMPORTANT"],
    attachments: [
      { filename: "RFP-ManhattanPlaza-2025.pdf", mimeType: "application/pdf", size: 5200000, attachmentId: "att3" }
    ]
  }
]

const MOCK_ANALYSIS = {
  summary: "John is requesting urgent review of the updated Beach 67th project proposal with revised timeline (March 15 start), detailed budget breakdown, and 3 alternative material options for the flat roof section.",
  actionItems: [
    "Review the attached proposal document (Beach67th-Proposal-v3.pdf)",
    "Check the revised timeline against current crew schedule",
    "Evaluate the 3 alternative material options for flat roof",
    "Approve or provide feedback by Thursday EOD"
  ],
  priority: "high" as const,
  strategy: "This is a time-sensitive request from a key GC partner (Blue Sky Builders). The owner is eager to proceed, so a prompt response will strengthen the relationship and increase win probability. Review the material options carefully as they may affect margin.",
  sentiment: "positive" as const
}

export function useGmail(options: UseGmailOptions = {}): UseGmailReturn {
  const { maxResults = 20, autoFetch = true, query, labelIds } = options

  const [messages, setMessages] = useState<GmailMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>()
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null)
  const [analysis, setAnalysis] = useState<UseGmailReturn['analysis']>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [draftReply, setDraftReply] = useState<string | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [useMock, setUseMock] = useState(false)

  const fetchMessages = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // First try our internal Google API route (uses user's OAuth token)
      const googleMessages = await fetchFromGoogleAPI(maxResults, labelIds)
      setMessages(googleMessages)
      setNextPageToken(undefined)
      setUseMock(false)
    } catch (googleErr: any) {
      // If not connected to Google, try the backend API
      if (googleErr.message !== 'NOT_CONNECTED') {
        console.warn('Google API error:', googleErr)
      }

      try {
        const response = await gmailAPI.listMessages({ maxResults, q: query, labelIds })
        setMessages(response.messages)
        setNextPageToken(response.nextPageToken)
        setUseMock(false)
      } catch (err) {
        console.warn('Gmail API unavailable, using mock data:', err)
        // Use mock data when backend is unavailable
        setMessages(MOCK_MESSAGES)
        setNextPageToken(undefined)
        setUseMock(true)
        setError(null) // Clear error since we have mock data
      }
    } finally {
      setLoading(false)
    }
  }, [maxResults, query, labelIds])

  const fetchMore = useCallback(async () => {
    if (!nextPageToken || loading || useMock) return

    setLoading(true)
    try {
      const response = await gmailAPI.listMessages({ maxResults, pageToken: nextPageToken, q: query, labelIds })
      setMessages(prev => [...prev, ...response.messages])
      setNextPageToken(response.nextPageToken)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch more messages')
    } finally {
      setLoading(false)
    }
  }, [nextPageToken, loading, maxResults, query, labelIds, useMock])

  const selectMessage = useCallback((message: GmailMessage | null) => {
    setSelectedMessage(message)
    setAnalysis(null)
    setDraftReply(null)
  }, [])

  const analyzeMessage = useCallback(async (messageId: string) => {
    setAnalysisLoading(true)
    try {
      if (useMock) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        setAnalysis(MOCK_ANALYSIS)
      } else {
        const result = await gmailAPI.analyzeEmail(messageId)
        setAnalysis(result)
      }
    } catch (err) {
      console.warn('Analysis API unavailable, using mock:', err)
      setAnalysis(MOCK_ANALYSIS)
    } finally {
      setAnalysisLoading(false)
    }
  }, [useMock])

  const generateDraft = useCallback(async (messageId: string, tone?: string, instructions?: string) => {
    setDraftLoading(true)
    try {
      if (useMock) {
        await new Promise(resolve => setTimeout(resolve, 800))
        setDraftReply(`Hi John,

Thanks for the updated proposal. I've reviewed the changes and they look good. The revised timeline works well with our crew's current schedule, and the additional material options give the client good flexibility.

I noticed the flat roof alternatives - Option B (TPO) might be the best value given the building's exposure. Let me know if you'd like me to elaborate on that recommendation for the owner.

Approved to proceed. Let's schedule a quick call tomorrow to discuss next steps and material procurement timeline.

Best regards,
Isaac`)
      } else {
        const result = await gmailAPI.generateDraft({
          messageId,
          tone: tone as any,
          instructions
        })
        setDraftReply(result.draft)
      }
    } catch (err) {
      console.warn('Draft API unavailable:', err)
      setDraftReply(`Hi,

Thank you for your email. I've reviewed the information and will get back to you shortly.

Best regards,
Isaac`)
    } finally {
      setDraftLoading(false)
    }
  }, [useMock])

  const sendReply = useCallback(async (to: string[], subject: string, body: string, threadId?: string, replyToMessageId?: string) => {
    try {
      // Try our Google API route first
      const res = await fetch('/api/google/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          message: body,
          threadId,
          replyToMessageId,
        }),
      })

      const data = await res.json()

      if (data.needsAuth) {
        throw new Error('NOT_CONNECTED')
      }

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.success) {
        return true
      }

      throw new Error('Send failed')
    } catch (googleErr: any) {
      // If not connected to Google, try the backend API
      if (googleErr.message !== 'NOT_CONNECTED') {
        console.warn('Google Gmail send error:', googleErr)
      }

      try {
        if (useMock) {
          await new Promise(resolve => setTimeout(resolve, 500))
          console.log('Mock send:', { to, subject, body, threadId })
          return true
        }
        await gmailAPI.sendMessage({ to, subject, body, threadId })
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send message')
        return false
      }
    }
  }, [useMock])

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      if (useMock) {
        setMessages(prev => prev.map(m =>
          m.id === messageId ? { ...m, read: true } : m
        ))
        return
      }
      await gmailAPI.modifyMessage(messageId, { removeLabels: ['UNREAD'] })
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, read: true } : m
      ))
    } catch (err) {
      console.warn('Failed to mark as read:', err)
    }
  }, [useMock])

  const refresh = useCallback(async () => {
    setNextPageToken(undefined)
    await fetchMessages()
  }, [fetchMessages])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchMessages()
    }
  }, [autoFetch, fetchMessages])

  // Auto-analyze when message is selected
  useEffect(() => {
    if (selectedMessage && !analysis && !analysisLoading) {
      analyzeMessage(selectedMessage.id)
      generateDraft(selectedMessage.id)
      if (!selectedMessage.read) {
        markAsRead(selectedMessage.id)
      }
    }
  }, [selectedMessage, analysis, analysisLoading, analyzeMessage, generateDraft, markAsRead])

  return {
    messages,
    loading,
    error,
    hasMore: !!nextPageToken,
    selectedMessage,
    analysis,
    analysisLoading,
    draftReply,
    draftLoading,
    fetchMessages,
    fetchMore,
    selectMessage,
    analyzeMessage,
    generateDraft,
    sendReply,
    markAsRead,
    refresh
  }
}
