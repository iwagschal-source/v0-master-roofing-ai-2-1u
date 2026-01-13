"use client"

import { useState } from "react"
import { Video, Play, Users, Calendar, Search, Clock, ChevronLeft, ChevronRight, RefreshCw, Loader2, ExternalLink, FileText, MapPin, LogOut } from "lucide-react"
import { useCalendar, formatEventTime, formatEventDate, formatDuration, formatRecordingDuration } from "@/hooks/useCalendar"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"

export function ZoomScreen() {
  const {
    isConnected,
    user,
    loading: authLoading,
    authUrl,
    disconnect
  } = useGoogleAuth()

  const [activeTab, setActiveTab] = useState("calendar")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState("")

  const {
    events,
    upcomingMeetings,
    recordings,
    loading,
    recordingsLoading,
    refresh,
    getEventsForDate
  } = useCalendar({ autoFetch: isConnected, daysAhead: 60 })

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const formatMonthYear = (date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const getMeetingsForDay = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    return getEventsForDate(date)
  }

  const isToday = (day) => {
    const today = new Date()
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  const filteredRecordings = recordings.filter(recording => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      recording.name.toLowerCase().includes(q) ||
      recording.participants.some(p => p.toLowerCase().includes(q))
    )
  })

  const handleJoinMeeting = (event) => {
    const link = event.hangoutLink || event.meetingLink
    if (link) {
      window.open(link, '_blank')
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <img src="/images/google-calendar.svg" alt="Google Calendar" className="w-6 h-6" />
          <div>
            <h1 className="text-xl font-medium text-foreground">Meetings</h1>
            <p className="text-sm text-foreground-secondary mt-0.5">Google Meet calendar and recordings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && user && (
            <div className="flex items-center gap-2 mr-2">
              <span className="text-xs text-foreground-secondary hidden sm:inline">{user.email}</span>
              <button
                onClick={disconnect}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-foreground-secondary hover:text-red-400"
                title="Disconnect Google"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button
            onClick={refresh}
            disabled={loading || !isConnected}
            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-foreground-secondary ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            disabled={!isConnected}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Video className="w-4 h-4" />
            New Meeting
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-border bg-background">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "calendar"
            ? "bg-card text-foreground border border-border"
            : "text-foreground-secondary hover:text-foreground hover:bg-card/50"
            }`}
        >
          Calendar
        </button>
        <button
          onClick={() => setActiveTab("live")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "live"
            ? "bg-card text-foreground border border-border"
            : "text-foreground-secondary hover:text-foreground hover:bg-card/50"
            }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setActiveTab("recordings")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "recordings"
            ? "bg-card text-foreground border border-border"
            : "text-foreground-secondary hover:text-foreground hover:bg-card/50"
            }`}
        >
          Recordings
        </button>
      </div>

      {authLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : !isConnected ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
              <img src="/images/google-calendar.svg" alt="Google Calendar" className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-medium text-foreground mb-3">Connect Your Google Calendar</h3>
            <p className="text-sm text-foreground-secondary mb-6">
              Connect your Google account to view your calendar events and Google Meet meetings.
            </p>
            <a
              href={authUrl}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <img src="/images/google.svg" alt="" className="w-5 h-5" />
              Connect to Google
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      ) : activeTab === "calendar" ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-lg border border-border p-5">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-medium text-foreground">{formatMonthYear(currentDate)}</h2>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={previousMonth}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="w-4 h-4 text-foreground-secondary" />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="px-3 py-1 text-xs font-medium text-foreground-secondary hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-2 hover:bg-muted rounded-lg transition-colors"
                      aria-label="Next month"
                    >
                      <ChevronRight className="w-4 h-4 text-foreground-secondary" />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Day Headers */}
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-foreground-secondary py-2">
                      {day}
                    </div>
                  ))}

                  {/* Empty cells for days before month starts */}
                  {Array.from({ length: getFirstDayOfMonth(currentDate) }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square" />
                  ))}

                  {/* Calendar days */}
                  {Array.from({ length: getDaysInMonth(currentDate) }).map((_, i) => {
                    const day = i + 1
                    const meetingsOnDay = getMeetingsForDay(day)
                    const dayIsToday = isToday(day)

                    return (
                      <div
                        key={day}
                        className={`aspect-square p-2 rounded-lg border transition-colors ${dayIsToday
                          ? "bg-primary/10 border-primary text-foreground"
                          : "border-border hover:border-border-strong hover:bg-muted"
                          }`}
                      >
                        <div className="text-sm font-medium mb-1">{day}</div>
                        {meetingsOnDay.length > 0 && (
                          <div className="flex flex-col gap-0.5">
                            {meetingsOnDay.slice(0, 2).map((meeting) => (
                              <div
                                key={meeting.id}
                                className={`text-[10px] px-1 py-0.5 rounded truncate ${
                                  meeting.hangoutLink || meeting.meetingLink
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted text-foreground-secondary'
                                }`}
                                title={meeting.summary}
                              >
                                {formatEventTime(meeting).split(' ')[0]}
                              </div>
                            ))}
                            {meetingsOnDay.length > 2 && (
                              <div className="text-[10px] text-foreground-secondary">+{meetingsOnDay.length - 2}</div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Upcoming Meetings List */}
            <div className="lg:col-span-1">
              <div className="bg-card rounded-lg border border-border p-5">
                <h3 className="text-base font-medium text-foreground mb-4">Upcoming Meetings</h3>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </div>
                ) : upcomingMeetings.length === 0 ? (
                  <div className="text-center py-8 text-foreground-secondary text-sm">
                    No upcoming meetings with video links
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingMeetings.slice(0, 5).map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-3 bg-background rounded-lg border border-border hover:border-border-strong transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-medium text-foreground line-clamp-2">{meeting.summary}</h4>
                          <Video className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatEventDate(meeting)}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                            <Clock className="w-3.5 h-3.5" />
                            {formatEventTime(meeting)} ({formatDuration(meeting)})
                          </div>
                          {meeting.attendees && meeting.attendees.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                              <Users className="w-3.5 h-3.5" />
                              {meeting.attendees.length} participant{meeting.attendees.length > 1 ? 's' : ''}
                            </div>
                          )}
                          {meeting.location && (
                            <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                              <MapPin className="w-3.5 h-3.5" />
                              <span className="truncate">{meeting.location}</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleJoinMeeting(meeting)}
                          className="w-full mt-3 px-3 py-1.5 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-1"
                        >
                          <Video className="w-3 h-3" />
                          Join Meeting
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "live" ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : upcomingMeetings.length === 0 ? (
              <div className="text-center max-w-md mx-auto py-16">
                <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                  <Video className="w-8 h-8 text-foreground-secondary" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No upcoming video meetings</h3>
                <p className="text-sm text-foreground-secondary mb-6">
                  Meetings with Google Meet links will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="bg-card rounded-lg border border-border p-5 hover:border-border-strong transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-foreground mb-1">{meeting.summary}</h3>
                        {meeting.description && (
                          <p className="text-sm text-foreground-secondary line-clamp-2">{meeting.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleJoinMeeting(meeting)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 flex-shrink-0"
                      >
                        <Video className="w-4 h-4" />
                        Join
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-foreground-secondary">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {formatEventDate(meeting)}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatEventTime(meeting)} - {formatDuration(meeting)}
                      </div>
                      {meeting.attendees && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {meeting.attendees.length} attendee{meeting.attendees.length > 1 ? 's' : ''}
                        </div>
                      )}
                      {meeting.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          {meeting.location}
                        </div>
                      )}
                    </div>
                    {meeting.attendees && meeting.attendees.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex flex-wrap gap-2">
                          {meeting.attendees.slice(0, 5).map((attendee, i) => (
                            <span
                              key={i}
                              className={`text-xs px-2 py-1 rounded-full ${
                                attendee.responseStatus === 'accepted'
                                  ? 'bg-green-500/10 text-green-500'
                                  : attendee.responseStatus === 'tentative'
                                    ? 'bg-yellow-500/10 text-yellow-500'
                                    : 'bg-muted text-foreground-secondary'
                              }`}
                            >
                              {attendee.displayName || attendee.email}
                            </span>
                          ))}
                          {meeting.attendees.length > 5 && (
                            <span className="text-xs px-2 py-1 text-foreground-secondary">
                              +{meeting.attendees.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-border bg-background">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search recordings..."
                className="w-full pl-10 pr-4 py-2 bg-card border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary focus:border-input-hover focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
              />
            </div>
          </div>

          {/* Recordings List */}
          <div className="flex-1 overflow-y-auto p-6">
            {recordingsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : filteredRecordings.length === 0 ? (
              <div className="text-center py-16 text-foreground-secondary">
                {searchQuery ? 'No recordings match your search' : 'No recordings available'}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl mx-auto">
                {filteredRecordings.map((recording) => (
                  <div
                    key={recording.id}
                    className="bg-card rounded-lg border border-border overflow-hidden hover:border-border-strong transition-colors cursor-pointer group"
                  >
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-muted flex items-center justify-center">
                      <Video className="w-12 h-12 text-foreground-secondary/50" />
                      <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                          <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-background/90 rounded text-xs text-foreground font-medium">
                        {formatRecordingDuration(recording.duration)}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4">
                      <h3 className="text-sm font-medium text-foreground mb-3 line-clamp-2">{recording.name}</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(recording.startTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                          <Users className="w-3.5 h-3.5" />
                          {recording.participants.length} participant{recording.participants.length > 1 ? 's' : ''}
                        </div>
                      </div>
                      {recording.transcriptUrl && (
                        <button className="mt-3 w-full px-3 py-1.5 bg-muted text-foreground-secondary rounded text-xs font-medium hover:bg-muted/80 transition-colors flex items-center justify-center gap-1">
                          <FileText className="w-3 h-3" />
                          View Transcript
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
