"use client"

import { useState } from "react"
import { Video, Play, Users, Calendar, Search, Clock, ChevronLeft, ChevronRight } from "lucide-react"

export function ZoomScreen() {
  const [activeTab, setActiveTab] = useState("calendar")
  const [currentDate, setCurrentDate] = useState(new Date(2025, 11, 12)) // Dec 12, 2025

  const recordings = [
    {
      id: 1,
      title: "Q4 Sales Strategy Session",
      date: "Dec 10, 2025",
      duration: "1h 23m",
      participants: 12,
      host: "Sarah Chen",
      thumbnail: "/video-meeting-thumbnail.jpg",
    },
    {
      id: 2,
      title: "Client Onboarding - Vertex Solutions",
      date: "Dec 9, 2025",
      duration: "45m",
      participants: 5,
      host: "Marcus Reid",
      thumbnail: "/business-meeting-thumbnail.png",
    },
    {
      id: 3,
      title: "Weekly Team Sync",
      date: "Dec 8, 2025",
      duration: "32m",
      participants: 8,
      host: "Jessica Park",
      thumbnail: "/team-meeting-thumbnail.jpg",
    },
  ]

  const upcomingMeetings = [
    {
      id: 1,
      title: "Product Roadmap Review",
      date: "Dec 12, 2025",
      time: "10:00 AM",
      duration: "1h",
      participants: 8,
      host: "Sarah Chen",
      status: "upcoming",
    },
    {
      id: 2,
      title: "Client Demo - Acme Corp",
      date: "Dec 12, 2025",
      time: "2:30 PM",
      duration: "45m",
      participants: 4,
      host: "Marcus Reid",
      status: "upcoming",
    },
    {
      id: 3,
      title: "Engineering Sprint Planning",
      date: "Dec 13, 2025",
      time: "9:00 AM",
      duration: "2h",
      participants: 15,
      host: "Jessica Park",
      status: "upcoming",
    },
    {
      id: 4,
      title: "1:1 with Manager",
      date: "Dec 13, 2025",
      time: "3:00 PM",
      duration: "30m",
      participants: 2,
      host: "Alex Johnson",
      status: "upcoming",
    },
    {
      id: 5,
      title: "Weekly All-Hands",
      date: "Dec 15, 2025",
      time: "11:00 AM",
      duration: "1h",
      participants: 45,
      host: "CEO Office",
      status: "upcoming",
    },
  ]
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

  const getMeetingsForDate = (day) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    return upcomingMeetings.filter((m) => m.date === dateStr)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div>
          <h1 className="text-xl font-medium text-foreground">Zoom Integration</h1>
          <p className="text-sm text-foreground-secondary mt-0.5">Join meetings and access recordings</p>
        </div>
        <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Video className="w-4 h-4" />
          Start Meeting
        </button>
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
          Live Meetings
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

      {activeTab === "calendar" ? (
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
                    const meetingsOnDay = getMeetingsForDate(day)
                    const isToday = day === 12 && currentDate.getMonth() === 11 // Dec 12, 2025

                    return (
                      <div
                        key={day}
                        className={`aspect-square p-2 rounded-lg border transition-colors ${isToday
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
                                className="text-[10px] bg-primary/20 text-primary px-1 py-0.5 rounded truncate"
                                title={meeting.title}
                              >
                                {meeting.time.split(" ")[0]}
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
                <div className="space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      className="p-3 bg-background rounded-lg border border-border hover:border-border-strong transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-sm font-medium text-foreground line-clamp-2">{meeting.title}</h4>
                        <Video className="w-4 h-4 text-foreground-secondary flex-shrink-0 mt-0.5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                          <Calendar className="w-3.5 h-3.5" />
                          {meeting.date}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                          <Clock className="w-3.5 h-3.5" />
                          {meeting.time} ({meeting.duration})
                        </div>
                        <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                          <Users className="w-3.5 h-3.5" />
                          {meeting.participants} participants
                        </div>
                      </div>
                      <button className="w-full mt-3 px-3 py-1.5 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20 transition-colors">
                        Join Meeting
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "live" ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
              <Video className="w-8 h-8 text-foreground-secondary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No active meetings</h3>
            <p className="text-sm text-foreground-secondary mb-6">
              Start a new meeting or join an existing one using a meeting ID
            </p>
            <div className="flex flex-col gap-3">
              <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
                Start New Meeting
              </button>
              <button className="px-6 py-3 bg-card text-foreground rounded-lg font-medium border border-border hover:bg-muted transition-colors">
                Join Meeting
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-border bg-background">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
              <input
                type="text"
                placeholder="Search recordings..."
                className="w-full pl-10 pr-4 py-2 bg-card border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary focus:border-input-hover focus:outline-none focus:ring-2 focus:ring-ring/20 transition-colors"
              />
            </div>
          </div>

          {/* Recordings List */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="bg-card rounded-lg border border-border overflow-hidden hover:border-border-strong transition-colors cursor-pointer group"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted">
                    <img
                      src={recording.thumbnail || "/placeholder.svg"}
                      alt={recording.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                        <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-background/90 rounded text-xs text-foreground font-medium">
                      {recording.duration}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <h3 className="text-sm font-medium text-foreground mb-3 line-clamp-2">{recording.title}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <Calendar className="w-3.5 h-3.5" />
                        {recording.date}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <Users className="w-3.5 h-3.5" />
                        {recording.participants} participants
                      </div>
                      <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                        <span className="font-medium">Host:</span>
                        {recording.host}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}