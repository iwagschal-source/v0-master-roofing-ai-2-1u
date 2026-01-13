"use client"

import { useState, useEffect, useCallback } from 'react'
import { chatSpacesAPI, ChatSpace, ChatMessage } from '@/lib/api/endpoints'

interface UseChatSpacesOptions {
  autoFetch?: boolean
}

// Fetch from our internal Google Chat API route
async function fetchFromGoogleChatAPI(): Promise<{ spaces: ChatSpace[], needsWorkspace?: boolean }> {
  const res = await fetch('/api/google/chat')
  const data = await res.json()

  if (data.needsAuth) {
    throw new Error('NOT_CONNECTED')
  }

  if (data.needsWorkspace) {
    throw new Error('NEEDS_WORKSPACE')
  }

  if (data.error) {
    throw new Error(data.error)
  }

  // Map API response to ChatSpace format
  const spaces = (data.spaces || []).map((space: any) => ({
    id: space.id || space.name,
    name: space.id || space.name,
    type: space.type || 'ROOM',
    displayName: space.name || space.displayName || space.id,
    memberCount: 0
  }))

  return { spaces }
}

async function fetchGoogleChatMessages(spaceId: string): Promise<ChatMessage[]> {
  const res = await fetch(`/api/google/chat?space=${encodeURIComponent(spaceId)}`)
  const data = await res.json()

  if (data.error || data.needsAuth) {
    throw new Error(data.error || 'NOT_CONNECTED')
  }

  return (data.messages || []).map((msg: any) => ({
    id: msg.id,
    spaceId: spaceId,
    sender: {
      name: msg.sender?.displayName || msg.sender?.name || 'Unknown',
      email: msg.sender?.email || ''
    },
    text: msg.text || '',
    createTime: msg.createTime || new Date().toISOString()
  }))
}

interface UseChatSpacesReturn {
  spaces: ChatSpace[]
  loading: boolean
  error: string | null
  selectedSpace: ChatSpace | null
  messages: ChatMessage[]
  messagesLoading: boolean
  selectSpace: (space: ChatSpace | null) => void
  sendMessage: (text: string) => Promise<boolean>
  refresh: () => Promise<void>
  fetchMessages: (spaceId: string) => Promise<void>
}

// Mock data for development/demo
const MOCK_SPACES: ChatSpace[] = [
  {
    id: "space1",
    name: "spaces/estimating-team",
    type: "ROOM",
    displayName: "Estimating Team",
    memberCount: 8,
    lastMessageTime: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: "space2",
    name: "spaces/project-managers",
    type: "ROOM",
    displayName: "Project Managers",
    memberCount: 12,
    lastMessageTime: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: "space3",
    name: "spaces/field-supervisors",
    type: "ROOM",
    displayName: "Field Supervisors",
    memberCount: 15,
    lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "dm1",
    name: "dm/john-mitchell",
    type: "DM",
    displayName: "John Mitchell",
    lastMessageTime: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: "dm2",
    name: "dm/sarah-chen",
    type: "DM",
    displayName: "Sarah Chen",
    lastMessageTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "dm3",
    name: "dm/mike-rodriguez",
    type: "DM",
    displayName: "Mike Rodriguez",
    lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }
]

const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  "space1": [
    {
      id: "msg1",
      spaceId: "space1",
      sender: { name: "John Mitchell", email: "john.mitchell@blueskybuilders.com" },
      text: "Hey team, just got the updated specs for Beach 67th. Can someone take a look at the flat roof section?",
      createTime: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    },
    {
      id: "msg2",
      spaceId: "space1",
      sender: { name: "Sarah Chen", email: "sarah@turnerconst.com" },
      text: "I'll review it. What's the deadline?",
      createTime: new Date(Date.now() - 40 * 60 * 1000).toISOString()
    },
    {
      id: "msg3",
      spaceId: "space1",
      sender: { name: "John Mitchell", email: "john.mitchell@blueskybuilders.com" },
      text: "Thursday EOD. The owner wants to move fast.",
      createTime: new Date(Date.now() - 35 * 60 * 1000).toISOString()
    },
    {
      id: "msg4",
      spaceId: "space1",
      sender: { name: "Isaac Wagschal", email: "iwagschal@masterroofingus.com" },
      text: "I saw the proposal come through. Looks good overall. Sarah, let me know if you need any historical data on similar projects.",
      createTime: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    }
  ],
  "space2": [
    {
      id: "msg5",
      spaceId: "space2",
      sender: { name: "Mike Rodriguez", email: "mike.r@lennarnyc.com" },
      text: "Queens crew is ahead of schedule on the Lennar project. Should finish main installation by Wednesday.",
      createTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "msg6",
      spaceId: "space2",
      sender: { name: "Emily Watson", email: "emily.watson@skanska.com" },
      text: "Great news! The inspection passed on the hospital project. Client is very happy.",
      createTime: new Date(Date.now() - 60 * 60 * 1000).toISOString()
    },
    {
      id: "msg7",
      spaceId: "space2",
      sender: { name: "Isaac Wagschal", email: "iwagschal@masterroofingus.com" },
      text: "Excellent work everyone. Let's keep this momentum going into Q1.",
      createTime: new Date(Date.now() - 45 * 60 * 1000).toISOString()
    }
  ],
  "dm1": [
    {
      id: "msg8",
      spaceId: "dm1",
      sender: { name: "John Mitchell", email: "john.mitchell@blueskybuilders.com" },
      text: "Isaac, quick question about the material options in the Beach 67th proposal. Which TPO would you recommend for the flat section?",
      createTime: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    {
      id: "msg9",
      spaceId: "dm1",
      sender: { name: "Isaac Wagschal", email: "iwagschal@masterroofingus.com" },
      text: "For that building's exposure, I'd go with GAF EverGuard. Better UV resistance and we've had great results with it on similar buildings.",
      createTime: new Date(Date.now() - 25 * 60 * 1000).toISOString()
    }
  ]
}

export function useChatSpaces(options: UseChatSpacesOptions = {}): UseChatSpacesReturn {
  const { autoFetch = true } = options

  const [spaces, setSpaces] = useState<ChatSpace[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSpace, setSelectedSpace] = useState<ChatSpace | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [useMock, setUseMock] = useState(false)

  const fetchSpaces = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // First try our internal Google Chat API route (uses user's OAuth token)
      const result = await fetchFromGoogleChatAPI()
      setSpaces(result.spaces)
      setUseMock(false)
    } catch (googleErr: any) {
      // If not connected to Google or needs Workspace, try backend API
      if (googleErr.message !== 'NOT_CONNECTED' && googleErr.message !== 'NEEDS_WORKSPACE') {
        console.warn('Google Chat API error:', googleErr)
      }

      try {
        const response = await chatSpacesAPI.listSpaces()
        setSpaces(response)
        setUseMock(false)
      } catch (err) {
        console.warn('Chat API unavailable, using mock data:', err)
        setSpaces(MOCK_SPACES)
        setUseMock(true)
        setError(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchMessages = useCallback(async (spaceId: string) => {
    setMessagesLoading(true)

    try {
      if (useMock) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setMessages(MOCK_MESSAGES[spaceId] || [])
      } else {
        // Try Google Chat API first
        try {
          const googleMessages = await fetchGoogleChatMessages(spaceId)
          setMessages(googleMessages)
        } catch (googleErr) {
          // Fall back to backend API
          const response = await chatSpacesAPI.getMessages(spaceId, { pageSize: 50 })
          setMessages(response.messages)
        }
      }
    } catch (err) {
      console.warn('Messages API unavailable, using mock:', err)
      setMessages(MOCK_MESSAGES[spaceId] || [])
    } finally {
      setMessagesLoading(false)
    }
  }, [useMock])

  const selectSpace = useCallback((space: ChatSpace | null) => {
    setSelectedSpace(space)
    if (space) {
      fetchMessages(space.id)
    } else {
      setMessages([])
    }
  }, [fetchMessages])

  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    if (!selectedSpace || !text.trim()) return false

    try {
      if (useMock) {
        // Add message locally for mock
        const newMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          spaceId: selectedSpace.id,
          sender: { name: "Isaac Wagschal", email: "iwagschal@masterroofingus.com" },
          text,
          createTime: new Date().toISOString()
        }
        setMessages(prev => [...prev, newMessage])
        return true
      } else {
        // Try Google Chat API first
        try {
          const res = await fetch('/api/google/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              spaceId: selectedSpace.id,
              text: text.trim()
            })
          })
          
          const data = await res.json()
          
          if (data.error || data.needsAuth) {
            throw new Error(data.error || 'Failed to send')
          }
          
          // Refresh messages after sending
          await fetchMessages(selectedSpace.id)
          return true
        } catch (googleErr) {
          // Fall back to backend API
          await chatSpacesAPI.sendMessage(selectedSpace.id, { text })
          await fetchMessages(selectedSpace.id)
          return true
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      return false
    }
  }, [selectedSpace, useMock, fetchMessages])

  const refresh = useCallback(async () => {
    await fetchSpaces()
    if (selectedSpace) {
      await fetchMessages(selectedSpace.id)
    }
  }, [fetchSpaces, fetchMessages, selectedSpace])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchSpaces()
    }
  }, [autoFetch, fetchSpaces])

  return {
    spaces,
    loading,
    error,
    selectedSpace,
    messages,
    messagesLoading,
    selectSpace,
    sendMessage,
    refresh,
    fetchMessages
  }
}

export function formatMessageTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
