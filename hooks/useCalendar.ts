"use client"

import { useState, useEffect, useCallback } from 'react'
import { calendarAPI, CalendarEvent, MeetRecording } from '@/lib/api/endpoints'

interface UseCalendarOptions {
  autoFetch?: boolean
  daysAhead?: number
}

// Fetch from our internal Google Calendar API route
async function fetchFromGoogleCalendarAPI(daysAhead: number): Promise<CalendarEvent[]> {
  const now = new Date()
  const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: future.toISOString(),
    maxResults: '50'
  })

  const res = await fetch(`/api/google/calendar?${params}`)
  const data = await res.json()

  if (data.needsAuth) {
    throw new Error('NOT_CONNECTED')
  }

  if (data.error) {
    throw new Error(data.error)
  }

  // Map API response to CalendarEvent format
  return (data.events || []).map((event: any) => ({
    id: event.id,
    summary: event.summary || '(No Title)',
    description: event.description,
    location: event.location,
    start: { dateTime: event.start },
    end: { dateTime: event.end },
    hangoutLink: event.meetLink,
    meetingLink: event.meetLink,
    attendees: event.attendees || [],
    organizer: event.organizer,
    status: event.status,
    htmlLink: event.htmlLink,
    location: event.location,
    attendees: event.attendees,
    hangoutLink: event.meetLink,
    meetingLink: event.meetLink,
    status: event.status,
    organizer: event.organizer
  }))
}

interface UseCalendarReturn {
  events: CalendarEvent[]
  upcomingMeetings: CalendarEvent[]
  recordings: MeetRecording[]
  loading: boolean
  recordingsLoading: boolean
  error: string | null
  fetchEvents: () => Promise<void>
  fetchRecordings: () => Promise<void>
  refresh: () => Promise<void>
  getEventsForDate: (date: Date) => CalendarEvent[]
}

// Mock data for development/demo when backend is unavailable
const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "evt1",
    summary: "Project Kickoff - 145 Beach 67th St",
    description: "Initial meeting with Blue Sky Builders to discuss scope and timeline",
    start: { dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
    end: { dateTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString() },
    attendees: [
      { email: "john.mitchell@blueskybuilders.com", displayName: "John Mitchell", responseStatus: "accepted" },
      { email: "iwagschal@masterroofingus.com", displayName: "Isaac Wagschal", responseStatus: "accepted" },
    ],
    hangoutLink: "https://meet.google.com/abc-defg-hij",
    meetingLink: "https://meet.google.com/abc-defg-hij",
    status: "confirmed",
    organizer: { email: "john.mitchell@blueskybuilders.com", displayName: "John Mitchell" }
  },
  {
    id: "evt2",
    summary: "Weekly Estimating Team Sync",
    description: "Review current proposals and pipeline status",
    start: { dateTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString() },
    end: { dateTime: new Date(Date.now() + 27 * 60 * 60 * 1000).toISOString() },
    attendees: [
      { email: "team@masterroofingus.com", displayName: "Estimating Team", responseStatus: "accepted" },
    ],
    hangoutLink: "https://meet.google.com/xyz-uvwx-yz",
    meetingLink: "https://meet.google.com/xyz-uvwx-yz",
    status: "confirmed",
    organizer: { email: "iwagschal@masterroofingus.com", displayName: "Isaac Wagschal" }
  },
  {
    id: "evt3",
    summary: "Client Demo - Turner Construction",
    description: "Present proposal for hospital roofing project",
    start: { dateTime: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString() },
    end: { dateTime: new Date(Date.now() + 51 * 60 * 60 * 1000).toISOString() },
    attendees: [
      { email: "sarah@turnerconst.com", displayName: "Sarah Chen", responseStatus: "accepted" },
      { email: "mike@turnerconst.com", displayName: "Mike Johnson", responseStatus: "tentative" },
    ],
    hangoutLink: "https://meet.google.com/tur-ner-001",
    meetingLink: "https://meet.google.com/tur-ner-001",
    status: "confirmed",
    organizer: { email: "iwagschal@masterroofingus.com", displayName: "Isaac Wagschal" }
  },
  {
    id: "evt4",
    summary: "Site Visit - Manhattan Plaza Tower",
    description: "Pre-bid site inspection",
    start: { dateTime: new Date(Date.now() + 74 * 60 * 60 * 1000).toISOString() },
    end: { dateTime: new Date(Date.now() + 76 * 60 * 60 * 1000).toISOString() },
    location: "350 W 42nd Street, Manhattan",
    attendees: [
      { email: "dpark@tishmanconst.com", displayName: "David Park", responseStatus: "accepted" },
    ],
    status: "confirmed",
    organizer: { email: "dpark@tishmanconst.com", displayName: "David Park" }
  },
  {
    id: "evt5",
    summary: "1:1 with Foreman - Queens Crew",
    description: "Weekly check-in on active projects",
    start: { dateTime: new Date(Date.now() + 98 * 60 * 60 * 1000).toISOString() },
    end: { dateTime: new Date(Date.now() + 99 * 60 * 60 * 1000).toISOString() },
    hangoutLink: "https://meet.google.com/crew-sync",
    meetingLink: "https://meet.google.com/crew-sync",
    status: "confirmed",
    organizer: { email: "iwagschal@masterroofingus.com", displayName: "Isaac Wagschal" }
  }
]

const MOCK_RECORDINGS: MeetRecording[] = [
  {
    id: "rec1",
    name: "Q4 Estimating Strategy Session",
    meetingCode: "abc-defg-hij",
    startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 83 * 60 * 1000).toISOString(),
    duration: 83,
    participants: ["Isaac Wagschal", "Sarah Chen", "Mike Rodriguez", "John Mitchell"],
    downloadUrl: "#",
    transcriptUrl: "#"
  },
  {
    id: "rec2",
    name: "Client Onboarding - Lennar NYC",
    meetingCode: "len-nar-001",
    startTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
    duration: 45,
    participants: ["Isaac Wagschal", "Mike Rodriguez"],
    downloadUrl: "#",
    transcriptUrl: "#"
  },
  {
    id: "rec3",
    name: "Weekly Team Sync",
    meetingCode: "team-sync",
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 32 * 60 * 1000).toISOString(),
    duration: 32,
    participants: ["Estimating Team", "Field Supervisors"],
    downloadUrl: "#",
    transcriptUrl: "#"
  },
  {
    id: "rec4",
    name: "Skanska Project Review",
    meetingCode: "ska-nsa-review",
    startTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 67 * 60 * 1000).toISOString(),
    duration: 67,
    participants: ["Isaac Wagschal", "Emily Watson", "Skanska Team"],
    downloadUrl: "#",
    transcriptUrl: "#"
  }
]

export function useCalendar(options: UseCalendarOptions = {}): UseCalendarReturn {
  const { autoFetch = true, daysAhead = 30 } = options

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [recordings, setRecordings] = useState<MeetRecording[]>([])
  const [loading, setLoading] = useState(false)
  const [recordingsLoading, setRecordingsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [useMock, setUseMock] = useState(false)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // First try our internal Google Calendar API route (uses user's OAuth token)
      const googleEvents = await fetchFromGoogleCalendarAPI(daysAhead)
      setEvents(googleEvents)
      setUseMock(false)
    } catch (googleErr: any) {
      // If not connected to Google, try the backend API
      if (googleErr.message !== 'NOT_CONNECTED') {
        console.warn('Google Calendar API error:', googleErr)
      }

      try {
        const now = new Date()
        const future = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000)

        const response = await calendarAPI.listEvents({
          timeMin: now.toISOString(),
          timeMax: future.toISOString(),
          maxResults: 50
        })
        setEvents(response.events)
        setUseMock(false)
      } catch (err) {
        console.warn('Calendar API unavailable, using mock data:', err)
        setEvents(MOCK_EVENTS)
        setUseMock(true)
        setError(null)
      }
    } finally {
      setLoading(false)
    }
  }, [daysAhead])

  const fetchRecordings = useCallback(async () => {
    setRecordingsLoading(true)

    try {
      if (useMock) {
        await new Promise(resolve => setTimeout(resolve, 500))
        setRecordings(MOCK_RECORDINGS)
      } else {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        const response = await calendarAPI.getMeetRecordings({
          startDate: thirtyDaysAgo.toISOString(),
          limit: 20
        })
        setRecordings(response)
      }
    } catch (err) {
      console.warn('Recordings API unavailable, using mock:', err)
      setRecordings(MOCK_RECORDINGS)
    } finally {
      setRecordingsLoading(false)
    }
  }, [useMock])

  const refresh = useCallback(async () => {
    await Promise.all([fetchEvents(), fetchRecordings()])
  }, [fetchEvents, fetchRecordings])

  const getEventsForDate = useCallback((date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime)
      return (
        eventDate.getFullYear() === date.getFullYear() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getDate() === date.getDate()
      )
    })
  }, [events])

  // Filter events with Meet links for upcomingMeetings
  const upcomingMeetings = events.filter(event =>
    event.hangoutLink || event.meetingLink
  )

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchEvents()
      fetchRecordings()
    }
  }, [autoFetch, fetchEvents, fetchRecordings])

  return {
    events,
    upcomingMeetings,
    recordings,
    loading,
    recordingsLoading,
    error,
    fetchEvents,
    fetchRecordings,
    refresh,
    getEventsForDate
  }
}

// Helper functions
export function formatEventTime(event: CalendarEvent): string {
  const date = new Date(event.start.dateTime)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function formatEventDate(event: CalendarEvent): string {
  const date = new Date(event.start.dateTime)
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === now.toDateString()) {
    return 'Today'
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Tomorrow'
  } else {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }
}

export function formatDuration(event: CalendarEvent): string {
  const start = new Date(event.start.dateTime)
  const end = new Date(event.end.dateTime)
  const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))

  if (minutes < 60) {
    return `${minutes}m`
  } else {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }
}

export function formatRecordingDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  } else {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
  }
}
