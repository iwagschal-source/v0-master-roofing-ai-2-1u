"use client"

import { useState, useEffect } from "react"
import {
  TrendingUp, TrendingDown, DollarSign, FileText,
  CheckCircle, XCircle, Clock, AlertTriangle,
  RefreshCw, Loader2, Mail, Building2, Calendar
} from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://34.95.128.208"

// Stat card component
function StatCard({ title, value, icon: Icon, trend, trendValue, color = "primary" }) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-500/10 text-green-500",
    red: "bg-red-500/10 text-red-500",
    yellow: "bg-yellow-500/10 text-yellow-500",
    blue: "bg-blue-500/10 text-blue-500",
  }

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-foreground-secondary mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              trend === "up" ? "text-green-500" : "text-red-500"
            }`}>
              {trend === "up" ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

// Event row component
function EventRow({ event }) {
  const typeColors = {
    RFP_RECEIVED: "bg-blue-500",
    PROPOSAL_SENT: "bg-purple-500",
    WON: "bg-green-500",
    LOST: "bg-red-500",
    FOLLOW_UP: "bg-yellow-500",
    GC_RESPONSE: "bg-cyan-500",
  }

  const typeLabels = {
    RFP_RECEIVED: "RFP",
    PROPOSAL_SENT: "Proposal",
    WON: "Won",
    LOST: "Lost",
    FOLLOW_UP: "Follow-up",
    GC_RESPONSE: "GC Response",
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border last:border-0 hover:bg-secondary/30 px-2 rounded-lg transition-colors">
      <div className={`w-2 h-2 rounded-full ${typeColors[event.event_type] || "bg-gray-500"}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{event.summary}</p>
        <div className="flex items-center gap-2 text-xs text-foreground-tertiary mt-0.5">
          {event.project_name && (
            <>
              <Building2 className="w-3 h-3" />
              <span className="truncate">{event.project_name}</span>
            </>
          )}
          {event.assignee && (
            <span className="text-foreground-secondary">• {event.assignee}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full text-white ${typeColors[event.event_type] || "bg-gray-500"}`}>
          {typeLabels[event.event_type] || event.event_type}
        </span>
        <p className="text-xs text-foreground-tertiary mt-1">{formatDate(event.scanned_at)}</p>
      </div>
    </div>
  )
}

export function SalesDashboard() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [stats, setStats] = useState({
    rfps: 0,
    proposals: 0,
    wins: 0,
    losses: 0,
    gcResponses: 0,
  })

  const loadEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      // Try backend first
      const res = await fetch(`${BACKEND_URL}/api/sales/events/all`, {
        headers: { "Accept": "application/json" }
      })

      if (res.ok) {
        const data = await res.json()
        setEvents(data.events || [])

        // Calculate stats
        const newStats = { rfps: 0, proposals: 0, wins: 0, losses: 0, gcResponses: 0 }
        for (const e of data.events || []) {
          if (e.event_type === "RFP_RECEIVED") newStats.rfps++
          if (e.event_type === "PROPOSAL_SENT") newStats.proposals++
          if (e.event_type === "WON") newStats.wins++
          if (e.event_type === "LOST") newStats.losses++
          if (e.event_type === "GC_RESPONSE") newStats.gcResponses++
        }
        setStats(newStats)
      } else {
        throw new Error("Failed to load events")
      }
    } catch (err) {
      console.error("Error loading events:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const runScan = async () => {
    setScanning(true)
    try {
      await fetch(`${BACKEND_URL}/api/sales/scan?hours_back=168`, {
        method: "POST"
      })
      // Wait a bit then refresh
      setTimeout(() => {
        loadEvents()
        setScanning(false)
      }, 5000)
    } catch (err) {
      console.error("Scan error:", err)
      setScanning(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-foreground-secondary">Loading sales data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sales Intelligence</h1>
            <p className="text-foreground-secondary text-sm">CEO Dashboard - Cut the noise, show me the money</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runScan}
              disabled={scanning}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Scan Now
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <StatCard
            title="RFPs Received"
            value={stats.rfps}
            icon={Mail}
            color="blue"
          />
          <StatCard
            title="Proposals Sent"
            value={stats.proposals}
            icon={FileText}
            color="primary"
          />
          <StatCard
            title="Won"
            value={stats.wins}
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="Lost"
            value={stats.losses}
            icon={XCircle}
            color="red"
          />
          <StatCard
            title="GC Responses"
            value={stats.gcResponses}
            icon={Building2}
            color="yellow"
          />
        </div>

        {/* Win Rate */}
        {(stats.wins + stats.losses) > 0 && (
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Win Rate</h2>
              <span className="text-2xl font-bold text-green-500">
                {Math.round((stats.wins / (stats.wins + stats.losses)) * 100)}%
              </span>
            </div>
            <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(stats.wins / (stats.wins + stats.losses)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-foreground-secondary mt-2">
              <span>{stats.wins} Wins</span>
              <span>{stats.losses} Losses</span>
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="bg-card rounded-xl border border-border">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Sales Events</h2>
              <span className="text-sm text-foreground-tertiary">{events.length} events</span>
            </div>
          </div>
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {events.length === 0 ? (
              <div className="text-center py-8 text-foreground-secondary">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No sales events yet</p>
                <p className="text-sm mt-1">Run a scan to detect events from emails</p>
              </div>
            ) : (
              events.slice(0, 50).map((event) => (
                <EventRow key={event.event_id} event={event} />
              ))
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
