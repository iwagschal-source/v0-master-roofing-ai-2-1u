/**
 * Google Calendar API
 * Fetches user's calendar events and Meet links
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readJSON } from '@/lib/gcs-storage'

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

async function getGoogleToken(userId) {
  if (!userId) return null
  const tokenData = await readJSON(`auth/google/${userId}.json`)
  return tokenData?.access_token
}

// GET - Fetch calendar events
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const maxResults = searchParams.get('maxResults') || '20'
    const timeMin = searchParams.get('timeMin') || new Date().toISOString()
    const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

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

    // Fetch calendar events
    const eventsRes = await fetch(
      `${CALENDAR_API}/calendars/primary/events?` + new URLSearchParams({
        maxResults,
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
      }),
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const eventsData = await eventsRes.json()

    if (eventsData.error) {
      return NextResponse.json({ error: eventsData.error.message }, { status: 400 })
    }

    // Map events to our format
    const events = (eventsData.items || []).map(event => ({
      id: event.id,
      summary: event.summary || '(No Title)',
      description: event.description,
      location: event.location,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      allDay: !event.start?.dateTime,
      meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.find(e => e.entryPointType === 'video')?.uri,
      attendees: event.attendees?.map(a => ({
        email: a.email,
        displayName: a.displayName,
        responseStatus: a.responseStatus,
        organizer: a.organizer,
      })) || [],
      organizer: event.organizer,
      status: event.status,
      htmlLink: event.htmlLink,
    }))

    // Separate events with Meet links
    const meetings = events.filter(e => e.meetLink)
    const allEvents = events

    return NextResponse.json({
      events: allEvents,
      meetings,
      totalEvents: events.length,
      totalMeetings: meetings.length,
    })
  } catch (err) {
    console.error('Calendar API error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch calendar' },
      { status: 500 }
    )
  }
}
