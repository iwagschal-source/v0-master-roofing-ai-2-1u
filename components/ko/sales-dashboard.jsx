"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  TrendingUp, TrendingDown, DollarSign, FileText,
  CheckCircle, XCircle, Clock, AlertTriangle,
  RefreshCw, Loader2, Mail, Building2, Calendar,
  GripVertical, Send, Sparkles, Bot, BarChart3,
  Target, Timer, Users, ChevronRight, Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://136.116.243.70"

// Stat card component
function StatCard({ title, value, icon: Icon, trend, trendValue, color = "primary", subtitle }) {
  const colorClasses = {
    primary: "bg-primary/10 text-primary",
    green: "bg-green-500/10 text-green-500",
    red: "bg-red-500/10 text-red-500",
    yellow: "bg-yellow-500/10 text-yellow-500",
    blue: "bg-blue-500/10 text-blue-500",
    purple: "bg-purple-500/10 text-purple-500",
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-foreground-secondary mb-1">{title}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && <p className="text-xs text-foreground-tertiary mt-0.5">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-1 text-xs ${
              trend === "up" ? "text-green-500" : "text-red-500"
            }`}>
              {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}

// Event row component for the list
function EventRow({ event, isSelected, onClick }) {
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
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 py-3 px-3 border-b border-border last:border-0 hover:bg-secondary/50 transition-colors text-left rounded-lg",
        isSelected && "bg-primary/10 border-primary/20"
      )}
    >
      <div className={`w-2 h-2 rounded-full ${typeColors[event.event_type] || "bg-gray-500"} shrink-0`} />
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
      <ChevronRight className="w-4 h-4 text-foreground-tertiary shrink-0" />
    </button>
  )
}

// Bid Brief Summary Panel
function BidBriefPanel({ event, events, gcMetrics }) {
  if (!event) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground-tertiary p-6">
        <div className="text-center">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Select an event</p>
          <p className="text-sm mt-1">View bid journey and intelligence</p>
        </div>
      </div>
    )
  }

  // Find related events for this project
  const projectEvents = events.filter(e =>
    e.project_name && event.project_name &&
    e.project_name.toLowerCase() === event.project_name.toLowerCase()
  ).sort((a, b) => new Date(a.scanned_at) - new Date(b.scanned_at))

  // Get GC-specific metrics
  const gcName = event.gc_name || event.assignee
  const gcStats = gcMetrics[gcName] || {}

  // Calculate timeline
  const rfpDate = projectEvents.find(e => e.event_type === "RFP_RECEIVED")?.scanned_at
  const proposalDate = projectEvents.find(e => e.event_type === "PROPOSAL_SENT")?.scanned_at
  const turnaround = rfpDate && proposalDate
    ? Math.round((new Date(proposalDate) - new Date(rfpDate)) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Project Header */}
      <div className="mb-4">
        <h3 className="font-semibold text-foreground">{event.project_name || event.summary}</h3>
        {event.assignee && (
          <p className="text-sm text-foreground-secondary flex items-center gap-1 mt-1">
            <Users className="w-3.5 h-3.5" />
            {event.assignee}
          </p>
        )}
      </div>

      {/* Journey Timeline */}
      <div className="mb-4">
        <h4 className="text-xs font-medium text-foreground-tertiary uppercase mb-2">Bid Journey</h4>
        <div className="space-y-2">
          {projectEvents.length > 0 ? projectEvents.slice(0, 5).map((e, i) => (
            <div key={e.event_id} className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                e.event_type === "WON" ? "bg-green-500" :
                e.event_type === "LOST" ? "bg-red-500" :
                e.event_type === "PROPOSAL_SENT" ? "bg-purple-500" :
                e.event_type === "RFP_RECEIVED" ? "bg-blue-500" :
                "bg-gray-400"
              }`} />
              <div className="flex-1 text-sm">
                <span className="text-foreground">{e.event_type.replace(/_/g, " ")}</span>
                <span className="text-foreground-tertiary ml-2">
                  {new Date(e.scanned_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          )) : (
            <p className="text-sm text-foreground-tertiary">No timeline data</p>
          )}
        </div>
      </div>

      {/* Turnaround */}
      {turnaround !== null && (
        <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">RFP to Proposal: {turnaround} days</span>
          </div>
        </div>
      )}

      {/* GC Intelligence */}
      {gcName && (
        <div className="mb-4">
          <h4 className="text-xs font-medium text-foreground-tertiary uppercase mb-2">GC Intelligence: {gcName}</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-secondary/30 rounded-lg">
              <p className="text-xs text-foreground-tertiary">Win Rate</p>
              <p className="text-lg font-semibold text-foreground">
                {gcStats.winRate ? `${gcStats.winRate}%` : "N/A"}
              </p>
            </div>
            <div className="p-2 bg-secondary/30 rounded-lg">
              <p className="text-xs text-foreground-tertiary">Avg Turnaround</p>
              <p className="text-lg font-semibold text-foreground">
                {gcStats.avgTurnaround ? `${gcStats.avgTurnaround}d` : "N/A"}
              </p>
            </div>
            <div className="p-2 bg-secondary/30 rounded-lg">
              <p className="text-xs text-foreground-tertiary">Total Bids</p>
              <p className="text-lg font-semibold text-foreground">
                {gcStats.totalBids || 0}
              </p>
            </div>
            <div className="p-2 bg-secondary/30 rounded-lg">
              <p className="text-xs text-foreground-tertiary">Avg Deal Size</p>
              <p className="text-lg font-semibold text-foreground">
                {gcStats.avgDealSize ? `$${(gcStats.avgDealSize / 1000).toFixed(0)}K` : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dollar Amount */}
      {event.dollar_amount && (
        <div className="p-3 bg-green-500/10 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              ${event.dollar_amount.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// Sales Agent Chat Panel
function SalesAgentChat({ selectedEvent, events, gcMetrics, onShowChart }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const suggestions = [
    "How much did we bid this month?",
    "Who's our top performer?",
    "Which GCs should we focus on?",
    "Who's been slow on turnaround?",
  ]

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      // For now, generate local intelligence responses
      // Later this will call the Sales Agent API
      const response = generateSalesResponse(userMessage, events, gcMetrics, selectedEvent)

      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: response.text, chart: response.chart }])
        if (response.chart) {
          onShowChart?.(response.chart)
        }
        setLoading(false)
      }, 500)
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I can help you analyze sales data, win rates, turnaround times, and more. What would you like to know?"
      }])
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full border-t border-border">
      {/* Chat Header */}
      <div className="px-4 py-2 border-b border-border bg-primary/5 flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-medium">Sales Agent</span>
        <span className="text-xs text-foreground-tertiary">• Ask about sales intelligence</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-4">
            <Bot className="w-8 h-8 mx-auto mb-2 text-foreground-tertiary opacity-50" />
            <p className="text-sm text-foreground-secondary mb-3">
              Ask me about win rates, turnaround times, GC performance
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setInput(s)}
                  className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 text-foreground rounded-full transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  msg.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] px-3 py-2 rounded-lg text-sm",
                    msg.role === 'user'
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  )}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 items-center">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Loader2 className="w-3 h-3 text-primary animate-spin" />
                </div>
                <div className="bg-secondary px-3 py-2 rounded-lg">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-foreground-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-foreground-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-foreground-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-border bg-card/50 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about sales performance..."
            className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Generate sales intelligence response locally
// TOP 10 CEO QUESTIONS for a roofing subcontractor:
// 1. "How much did we bid this month?" - Total proposal value
// 2. "Who's our top performer?" - Best salesperson by wins
// 3. "Which GCs should we focus on?" - Best ROI (win rate + volume)
// 4. "Are we responding fast enough?" - Turnaround benchmarks
// 5. "What's in the pipeline?" - Pending proposals
// 6. "Who's been slow?" - Slow turnaround identification
// 7. "How are we doing vs last month?" - Month comparison
// 8. "Which GCs should we stop bidding?" - Low win rate GCs
// 9. "What's our average job size?" - Deal size trends
// 10. "How many RFPs this week?" - Recent activity

function generateSalesResponse(query, events, gcMetrics, selectedEvent) {
  const q = query.toLowerCase()
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
  const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

  // Helper: get events for a specific month
  const getMonthEvents = (month, year) => events.filter(e => {
    const d = new Date(e.scanned_at)
    return d.getMonth() === month && d.getFullYear() === year
  })

  const thisMonthEvents = getMonthEvents(thisMonth, thisYear)
  const lastMonthEvents = getMonthEvents(lastMonth, lastMonthYear)

  // 1. "How much did we bid this month?" / "bid volume" / "this month"
  if (q.includes("bid this month") || q.includes("bid volume") || (q.includes("how much") && q.includes("month"))) {
    const proposals = thisMonthEvents.filter(e => e.event_type === "PROPOSAL_SENT")
    const totalValue = proposals.reduce((sum, e) => sum + (e.dollar_amount || 0), 0)
    const count = proposals.length

    let response = `**This Month's Bidding Activity:**\n\n`
    response += `Proposals Sent: ${count}\n`
    response += `Total Bid Value: $${totalValue.toLocaleString()}\n`
    response += `Avg Bid Size: ${count > 0 ? '$' + Math.round(totalValue / count).toLocaleString() : 'N/A'}\n\n`

    // Compare to last month
    const lastProposals = lastMonthEvents.filter(e => e.event_type === "PROPOSAL_SENT")
    const lastValue = lastProposals.reduce((sum, e) => sum + (e.dollar_amount || 0), 0)
    if (lastProposals.length > 0) {
      const change = count - lastProposals.length
      response += `vs Last Month: ${change >= 0 ? '+' : ''}${change} proposals`
    }

    return { text: response }
  }

  // 2. "Who's our top performer?" / "best salesperson" / "top performer"
  if (q.includes("top performer") || q.includes("best sales") || q.includes("who's winning")) {
    const byPerson = {}
    events.forEach(e => {
      const person = e.assignee || 'Unassigned'
      if (!byPerson[person]) byPerson[person] = { wins: 0, proposals: 0, rfps: 0, value: 0 }
      if (e.event_type === "WON") {
        byPerson[person].wins++
        byPerson[person].value += e.dollar_amount || 0
      }
      if (e.event_type === "PROPOSAL_SENT") byPerson[person].proposals++
      if (e.event_type === "RFP_RECEIVED") byPerson[person].rfps++
    })

    const ranked = Object.entries(byPerson)
      .filter(([_, m]) => m.wins > 0 || m.proposals > 0)
      .sort((a, b) => b[1].wins - a[1].wins || b[1].proposals - a[1].proposals)
      .slice(0, 5)

    let response = `**Sales Team Performance:**\n\n`
    if (ranked.length > 0) {
      ranked.forEach(([person, m], i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  '
        response += `${medal} ${person}: ${m.wins} wins, ${m.proposals} proposals`
        if (m.value > 0) response += `, $${(m.value/1000).toFixed(0)}K won`
        response += `\n`
      })
    } else {
      response += `No performance data yet.`
    }

    return { text: response }
  }

  // 3. "Which GCs should we focus on?" / "best GCs" / "focus"
  if (q.includes("focus") || q.includes("best gc") || q.includes("which gc")) {
    // Score GCs by: win rate * sqrt(volume) to balance both
    const scored = Object.entries(gcMetrics)
      .filter(([_, m]) => m.totalBids >= 2 && m.winRate)
      .map(([gc, m]) => ({
        gc,
        ...m,
        score: m.winRate * Math.sqrt(m.totalBids)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    let response = `**GCs to Focus On (best ROI):**\n\n`
    if (scored.length > 0) {
      scored.forEach((m, i) => {
        response += `${i + 1}. ${m.gc}\n`
        response += `   Win Rate: ${m.winRate}% | Bids: ${m.totalBids} | Wins: ${m.wins}\n`
      })
      response += `\n💡 These GCs have good win rates AND enough volume to matter.`
    } else {
      response += `Need more bid history to recommend.`
    }

    return { text: response }
  }

  // 4. "Are we responding fast enough?" / "fast enough" / "response time"
  if (q.includes("fast enough") || q.includes("response time") || q.includes("responding")) {
    const allTurnarounds = Object.entries(gcMetrics)
      .filter(([_, m]) => m.avgTurnaround)
      .map(([gc, m]) => ({ gc, days: m.avgTurnaround }))

    if (allTurnarounds.length > 0) {
      const avgAll = Math.round(allTurnarounds.reduce((s, t) => s + t.days, 0) / allTurnarounds.length)
      const fastest = allTurnarounds.sort((a, b) => a.days - b.days)[0]
      const slowest = allTurnarounds.sort((a, b) => b.days - a.days)[0]

      let response = `**Response Time Analysis:**\n\n`
      response += `Company Average: ${avgAll} days (RFP to Proposal)\n\n`
      response += `Fastest: ${fastest.gc} at ${fastest.days} days\n`
      response += `Slowest: ${slowest.gc} at ${slowest.days} days\n\n`

      if (avgAll <= 3) {
        response += `✅ Great! Under 3 days is competitive.`
      } else if (avgAll <= 5) {
        response += `⚠️ Acceptable, but sub-3 days wins more.`
      } else {
        response += `🔴 Too slow. GCs often decide within a week.`
      }

      return { text: response }
    }
    return { text: "Not enough RFP/Proposal pairs to analyze response times." }
  }

  // 5. "What's in the pipeline?" / "pending" / "waiting"
  if (q.includes("pipeline") || q.includes("pending") || q.includes("waiting")) {
    // Proposals sent but no win/loss yet
    const proposalProjects = new Set()
    const decidedProjects = new Set()

    events.forEach(e => {
      const proj = e.project_name?.toLowerCase()
      if (!proj) return
      if (e.event_type === "PROPOSAL_SENT") proposalProjects.add(proj)
      if (e.event_type === "WON" || e.event_type === "LOST") decidedProjects.add(proj)
    })

    const pending = [...proposalProjects].filter(p => !decidedProjects.has(p))
    const pendingEvents = events.filter(e =>
      e.event_type === "PROPOSAL_SENT" &&
      e.project_name &&
      pending.includes(e.project_name.toLowerCase())
    )

    const totalPendingValue = pendingEvents.reduce((s, e) => s + (e.dollar_amount || 0), 0)

    let response = `**Pipeline (Awaiting Decision):**\n\n`
    response += `Pending Proposals: ${pending.length}\n`
    response += `Total Value: $${totalPendingValue.toLocaleString()}\n\n`

    if (pending.length > 0 && pending.length <= 10) {
      response += `Projects:\n`
      pendingEvents.slice(0, 5).forEach(e => {
        response += `• ${e.project_name || e.summary}`
        if (e.dollar_amount) response += ` ($${e.dollar_amount.toLocaleString()})`
        response += `\n`
      })
      if (pending.length > 5) response += `...and ${pending.length - 5} more`
    }

    return { text: response }
  }

  // 6. "Who's been slow?" / "slow turnaround" / "bottleneck"
  if (q.includes("slow") || q.includes("bottleneck") || q.includes("behind")) {
    const withTurnaround = Object.entries(gcMetrics)
      .filter(([_, m]) => m.avgTurnaround)
      .sort((a, b) => b[1].avgTurnaround - a[1].avgTurnaround)
      .slice(0, 5)

    let response = `**Slowest Turnaround Times:**\n\n`
    if (withTurnaround.length > 0) {
      withTurnaround.forEach(([person, m]) => {
        const status = m.avgTurnaround > 5 ? '🔴' : m.avgTurnaround > 3 ? '⚠️' : '✅'
        response += `${status} ${person}: ${m.avgTurnaround} days avg\n`
      })
      response += `\n💡 Target: Under 3 days to stay competitive.`
    } else {
      response += `Not enough data to identify slow responders.`
    }

    return { text: response }
  }

  // 7. "How are we doing vs last month?" / "compared to last" / "trend"
  if (q.includes("vs last") || q.includes("compared") || q.includes("trend") || q.includes("last month")) {
    const thisRFPs = thisMonthEvents.filter(e => e.event_type === "RFP_RECEIVED").length
    const lastRFPs = lastMonthEvents.filter(e => e.event_type === "RFP_RECEIVED").length
    const thisProposals = thisMonthEvents.filter(e => e.event_type === "PROPOSAL_SENT").length
    const lastProposals = lastMonthEvents.filter(e => e.event_type === "PROPOSAL_SENT").length
    const thisWins = thisMonthEvents.filter(e => e.event_type === "WON").length
    const lastWins = lastMonthEvents.filter(e => e.event_type === "WON").length

    const arrow = (current, prev) => current > prev ? '↑' : current < prev ? '↓' : '→'

    let response = `**This Month vs Last Month:**\n\n`
    response += `RFPs Received: ${thisRFPs} ${arrow(thisRFPs, lastRFPs)} (was ${lastRFPs})\n`
    response += `Proposals Sent: ${thisProposals} ${arrow(thisProposals, lastProposals)} (was ${lastProposals})\n`
    response += `Wins: ${thisWins} ${arrow(thisWins, lastWins)} (was ${lastWins})\n`

    return { text: response }
  }

  // 8. "Which GCs should we stop bidding?" / "stop bidding" / "wasting time" / "losing"
  if (q.includes("stop bidding") || q.includes("wasting") || q.includes("losing with") || q.includes("drop")) {
    const losers = Object.entries(gcMetrics)
      .filter(([_, m]) => m.totalBids >= 3 && m.winRate !== null && m.winRate < 15)
      .sort((a, b) => a[1].winRate - b[1].winRate)
      .slice(0, 5)

    let response = `**GCs with Low Win Rates (consider dropping):**\n\n`
    if (losers.length > 0) {
      losers.forEach(([gc, m]) => {
        response += `🔴 ${gc}: ${m.winRate}% win rate (${m.wins}/${m.totalBids})\n`
      })
      response += `\n💡 If win rate < 15% after 3+ bids, consider refocusing effort.`
    } else {
      response += `No GCs with consistently low win rates found.`
    }

    return { text: response }
  }

  // 9. "What's our average job size?" / "deal size" / "average job"
  if (q.includes("job size") || q.includes("deal size") || q.includes("average job") || q.includes("avg job")) {
    const winsWithAmount = events.filter(e => e.event_type === "WON" && e.dollar_amount)
    const proposalsWithAmount = events.filter(e => e.event_type === "PROPOSAL_SENT" && e.dollar_amount)

    let response = `**Job Size Analysis:**\n\n`

    if (winsWithAmount.length > 0) {
      const avgWon = Math.round(winsWithAmount.reduce((s, e) => s + e.dollar_amount, 0) / winsWithAmount.length)
      response += `Avg Won Job: $${avgWon.toLocaleString()}\n`
    }

    if (proposalsWithAmount.length > 0) {
      const avgBid = Math.round(proposalsWithAmount.reduce((s, e) => s + e.dollar_amount, 0) / proposalsWithAmount.length)
      response += `Avg Bid Size: $${avgBid.toLocaleString()}\n`
    }

    // Find largest
    const largest = events
      .filter(e => e.dollar_amount)
      .sort((a, b) => b.dollar_amount - a.dollar_amount)[0]

    if (largest) {
      response += `\nLargest: ${largest.project_name || 'Unknown'} at $${largest.dollar_amount.toLocaleString()}`
    }

    if (!winsWithAmount.length && !proposalsWithAmount.length) {
      response = `No dollar amounts captured in events yet. Scanner needs to extract $ values from emails.`
    }

    return { text: response }
  }

  // 10. "How many RFPs this week?" / "this week" / "recent activity"
  if (q.includes("this week") || q.includes("recent") || q.includes("rfps came")) {
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const weekEvents = events.filter(e => new Date(e.scanned_at) > oneWeekAgo)

    const weekRFPs = weekEvents.filter(e => e.event_type === "RFP_RECEIVED")
    const weekProposals = weekEvents.filter(e => e.event_type === "PROPOSAL_SENT")
    const weekWins = weekEvents.filter(e => e.event_type === "WON")

    let response = `**Last 7 Days Activity:**\n\n`
    response += `New RFPs: ${weekRFPs.length}\n`
    response += `Proposals Sent: ${weekProposals.length}\n`
    response += `Wins: ${weekWins.length}\n`

    if (weekRFPs.length > 0) {
      response += `\nRecent RFPs:\n`
      weekRFPs.slice(0, 3).forEach(e => {
        response += `• ${e.summary || e.project_name || 'Unknown'}\n`
      })
    }

    return { text: response }
  }

  // Win rate (legacy support)
  if (q.includes("win rate")) {
    const topGCs = Object.entries(gcMetrics)
      .filter(([_, m]) => m.winRate && m.totalBids >= 2)
      .sort((a, b) => b[1].winRate - a[1].winRate)
      .slice(0, 5)

    if (topGCs.length > 0) {
      let response = "**Win Rate by Salesperson:**\n\n"
      topGCs.forEach(([gc, m]) => {
        response += `${gc}: ${m.winRate}% (${m.wins}/${m.totalBids} bids)\n`
      })
      return { text: response }
    }
    return { text: "Not enough data to calculate win rates yet." }
  }

  // Default response - show what questions they can ask
  return {
    text: `**I can answer:**\n
• "How much did we bid this month?"
• "Who's our top performer?"
• "Which GCs should we focus on?"
• "Are we responding fast enough?"
• "What's in the pipeline?"
• "Who's been slow on turnaround?"
• "How are we doing vs last month?"
• "Which GCs should we stop bidding?"
• "What's our average job size?"
• "How many RFPs this week?"

What would you like to know?`
  }
}

// Calculate GC-level metrics from events
function calculateGCMetrics(events) {
  const gcData = {}

  // Group events by project to track RFP->Proposal timing
  const byProject = {}
  events.forEach(e => {
    const project = e.project_name?.toLowerCase() || 'unknown'
    if (!byProject[project]) byProject[project] = []
    byProject[project].push(e)
  })

  // Calculate turnaround times per project
  const turnarounds = {}
  Object.entries(byProject).forEach(([project, projectEvents]) => {
    const rfp = projectEvents.find(e => e.event_type === "RFP_RECEIVED")
    const proposal = projectEvents.find(e => e.event_type === "PROPOSAL_SENT")
    if (rfp && proposal) {
      const days = Math.round((new Date(proposal.scanned_at) - new Date(rfp.scanned_at)) / (1000 * 60 * 60 * 24))
      if (days > 0 && days < 365) {
        const assignee = rfp.assignee || proposal.assignee || 'Unknown'
        if (!turnarounds[assignee]) turnarounds[assignee] = []
        turnarounds[assignee].push(days)
      }
    }
  })

  // Aggregate by assignee (as proxy for GC tracking)
  events.forEach(e => {
    const gc = e.assignee || 'Unknown'
    if (!gcData[gc]) {
      gcData[gc] = { rfps: 0, proposals: 0, wins: 0, losses: 0, totalAmount: 0, turnarounds: [] }
    }

    if (e.event_type === "RFP_RECEIVED") gcData[gc].rfps++
    if (e.event_type === "PROPOSAL_SENT") gcData[gc].proposals++
    if (e.event_type === "WON") {
      gcData[gc].wins++
      if (e.dollar_amount) gcData[gc].totalAmount += e.dollar_amount
    }
    if (e.event_type === "LOST") gcData[gc].losses++
  })

  // Add turnarounds to gcData
  Object.entries(turnarounds).forEach(([gc, times]) => {
    if (gcData[gc]) {
      gcData[gc].turnarounds = times
    }
  })

  // Calculate derived metrics
  const metrics = {}
  Object.entries(gcData).forEach(([gc, data]) => {
    const totalBids = data.wins + data.losses
    metrics[gc] = {
      totalBids,
      rfps: data.rfps,
      proposals: data.proposals,
      wins: data.wins,
      losses: data.losses,
      winRate: totalBids > 0 ? Math.round((data.wins / totalBids) * 100) : null,
      avgTurnaround: data.turnarounds.length > 0
        ? Math.round(data.turnarounds.reduce((a, b) => a + b, 0) / data.turnarounds.length)
        : null,
      avgDealSize: data.wins > 0 && data.totalAmount > 0
        ? Math.round(data.totalAmount / data.wins)
        : null,
    }
  })

  return metrics
}

export function SalesDashboard() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [filterType, setFilterType] = useState("all")
  const [gcMetrics, setGcMetrics] = useState({})
  const [chartData, setChartData] = useState(null)

  // Draggable panel state
  const [panelWidth, setPanelWidth] = useState(420)
  const [isDragging, setIsDragging] = useState(false)
  const [briefHeight, setBriefHeight] = useState(50) // percentage
  const [isDraggingV, setIsDraggingV] = useState(false)
  const containerRef = useRef(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const minPanelWidth = 320
  const maxPanelWidth = 600

  const [stats, setStats] = useState({
    rfps: 0,
    proposals: 0,
    wins: 0,
    losses: 0,
    gcResponses: 0,
    avgTurnaround: null,
    pipelineValue: 0,
  })

  const loadEvents = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND_URL}/api/sales/events/all`, {
        headers: { "Accept": "application/json" }
      })

      if (res.ok) {
        const data = await res.json()
        const eventList = data.events || []
        setEvents(eventList)

        // Calculate stats
        const newStats = { rfps: 0, proposals: 0, wins: 0, losses: 0, gcResponses: 0, pipelineValue: 0 }
        for (const e of eventList) {
          if (e.event_type === "RFP_RECEIVED") newStats.rfps++
          if (e.event_type === "PROPOSAL_SENT") newStats.proposals++
          if (e.event_type === "WON") {
            newStats.wins++
            if (e.dollar_amount) newStats.pipelineValue += e.dollar_amount
          }
          if (e.event_type === "LOST") newStats.losses++
          if (e.event_type === "GC_RESPONSE") newStats.gcResponses++
        }
        setStats(newStats)

        // Calculate GC metrics
        const metrics = calculateGCMetrics(eventList)
        setGcMetrics(metrics)

        // Calculate overall avg turnaround
        const allTurnarounds = Object.values(metrics).flatMap(m =>
          m.avgTurnaround ? [m.avgTurnaround] : []
        )
        if (allTurnarounds.length > 0) {
          newStats.avgTurnaround = Math.round(
            allTurnarounds.reduce((a, b) => a + b, 0) / allTurnarounds.length
          )
          setStats({ ...newStats })
        }
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
      await fetch(`${BACKEND_URL}/api/sales/scan?hours_back=720`, {
        method: "POST"
      })
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

  // Horizontal drag handlers
  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    startXRef.current = e.clientX
    startWidthRef.current = panelWidth
  }, [panelWidth])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    const delta = startXRef.current - e.clientX
    const newWidth = Math.min(maxPanelWidth, Math.max(minPanelWidth, startWidthRef.current + delta))
    setPanelWidth(newWidth)
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Filter events
  const filteredEvents = filterType === "all"
    ? events
    : events.filter(e => e.event_type === filterType)

  const winRate = (stats.wins + stats.losses) > 0
    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
    : 0

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-foreground-secondary">Loading sales intelligence...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sales Intelligence</h1>
            <p className="text-foreground-secondary text-sm">CEO Dashboard - Pipeline, performance & intelligence</p>
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

      {/* Stats Grid */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <StatCard
            title="RFPs Received"
            value={stats.rfps}
            icon={Mail}
            color="blue"
          />
          <StatCard
            title="Proposals Out"
            value={stats.proposals}
            icon={FileText}
            color="purple"
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
            title="Win Rate"
            value={`${winRate}%`}
            icon={Target}
            color="primary"
            subtitle={`${stats.wins}/${stats.wins + stats.losses} bids`}
          />
          <StatCard
            title="Avg Turnaround"
            value={stats.avgTurnaround ? `${stats.avgTurnaround}d` : "N/A"}
            icon={Timer}
            color="yellow"
            subtitle="RFP to Proposal"
          />
          <StatCard
            title="Won Value"
            value={stats.pipelineValue > 0 ? `$${(stats.pipelineValue / 1000).toFixed(0)}K` : "$0"}
            icon={DollarSign}
            color="green"
          />
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div ref={containerRef} className="flex-1 flex overflow-hidden">
        {/* Left: Events List */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Filter Bar */}
          <div className="px-4 py-2 border-b border-border flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-foreground-tertiary" />
            <div className="flex gap-1 overflow-x-auto">
              {[
                { value: "all", label: "All" },
                { value: "RFP_RECEIVED", label: "RFPs", color: "bg-blue-500" },
                { value: "PROPOSAL_SENT", label: "Proposals", color: "bg-purple-500" },
                { value: "WON", label: "Won", color: "bg-green-500" },
                { value: "LOST", label: "Lost", color: "bg-red-500" },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value)}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                    filterType === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground-secondary hover:text-foreground"
                  )}
                >
                  {opt.color && <div className={`w-2 h-2 rounded-full ${opt.color}`} />}
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-foreground-tertiary">{filteredEvents.length} events</span>
          </div>

          {/* Events List */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-8 text-foreground-secondary">
                <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No events found</p>
                <p className="text-sm mt-1">Run a scan to detect sales events</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredEvents.slice(0, 100).map((event) => (
                  <EventRow
                    key={event.event_id}
                    event={event}
                    isSelected={selectedEvent?.event_id === event.event_id}
                    onClick={() => setSelectedEvent(event)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Draggable Divider */}
        <div
          onMouseDown={handleMouseDown}
          className={cn(
            "w-1.5 flex-shrink-0 bg-border hover:bg-primary/50 cursor-col-resize transition-colors relative group flex items-center justify-center",
            isDragging && "bg-primary"
          )}
        >
          <div className="absolute -left-2 -right-2 top-0 bottom-0" />
          <GripVertical className="w-4 h-6 text-foreground-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Right Panel - Bid Brief + Sales Agent */}
        <div
          style={{ width: panelWidth }}
          className="flex-shrink-0 flex flex-col bg-card/50 overflow-hidden"
        >
          {/* Upper: Bid Brief Summary */}
          <div style={{ height: `${briefHeight}%` }} className="flex flex-col overflow-hidden border-b border-border">
            <div className="px-4 py-2 border-b border-border bg-blue-500/5 flex items-center gap-2 shrink-0">
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-sm font-medium">Bid Brief</span>
              {selectedEvent && (
                <span className="text-xs text-foreground-tertiary truncate">
                  • {selectedEvent.project_name || "Selected event"}
                </span>
              )}
            </div>
            <BidBriefPanel
              event={selectedEvent}
              events={events}
              gcMetrics={gcMetrics}
            />
          </div>

          {/* Lower: Sales Agent Chat */}
          <div style={{ height: `${100 - briefHeight}%` }} className="flex flex-col overflow-hidden">
            <SalesAgentChat
              selectedEvent={selectedEvent}
              events={events}
              gcMetrics={gcMetrics}
              onShowChart={setChartData}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20 text-red-500 text-sm shrink-0">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          {error}
        </div>
      )}
    </div>
  )
}
