"use client"

import { useState, useEffect } from "react"
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Building2,
  Trophy,
  DollarSign,
  CreditCard,
  AlertCircle,
  MessageCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Send,
  Bot,
  X
} from "lucide-react"

function formatCurrency(amount) {
  if (!amount) return "$0"
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

// Generate AI summary based on GC data
function generateSummary(gcData) {
  if (!gcData || !gcData.name) return null

  const winRateDesc = gcData.win_rate >= 50
    ? "strong performer"
    : gcData.win_rate >= 30
      ? "moderate performer"
      : "challenging relationship"

  const paymentDesc = gcData.payment_status === "Good standing"
    ? "reliable payment history"
    : gcData.payment_status === "Warning"
      ? "occasional payment delays"
      : "payment concerns to monitor"

  const projectScale = gcData.avg_project_size >= 500000
    ? "large-scale commercial projects"
    : gcData.avg_project_size >= 100000
      ? "mid-market commercial work"
      : "smaller commercial projects"

  const systems = gcData.preferred_systems?.slice(0, 3).join(", ") || "various systems"

  return {
    overview: `${gcData.name} is a ${winRateDesc} with ${gcData.total_projects} projects in our history. They typically award ${projectScale} and prefer ${systems}.`,
    keyInsights: [
      `Win rate of ${gcData.win_rate}% across ${gcData.total_projects} opportunities`,
      `Average project value of ${formatCurrency(gcData.avg_project_size)}`,
      `${gcData.won_projects} projects successfully won`,
      paymentDesc.charAt(0).toUpperCase() + paymentDesc.slice(1),
    ],
    recommendation: gcData.win_rate >= 50
      ? "High priority GC - Continue building relationship and prioritize their RFPs."
      : gcData.win_rate >= 30
        ? "Solid relationship - Focus on competitive pricing and quick turnaround."
        : "Review approach - Consider relationship building or strategic pricing adjustments."
  }
}

export function GCIntelligence({ gcId, gcName, onAskKO }) {
  const [gcData, setGcData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showFullSummary, setShowFullSummary] = useState(false)
  const [showAskKO, setShowAskKO] = useState(false)
  const [question, setQuestion] = useState("")
  const [askingKO, setAskingKO] = useState(false)
  const [koResponse, setKoResponse] = useState(null)

  useEffect(() => {
    if (!gcId && !gcName) {
      setLoading(false)
      return
    }

    const fetchGCData = async () => {
      try {
        setLoading(true)
        setError(null)

        const params = new URLSearchParams()
        if (gcId) params.set("gcId", gcId)
        if (gcName) params.set("gcName", gcName)

        const response = await fetch(`/api/ko/gc-intelligence?${params}`)

        if (!response.ok) {
          throw new Error("Failed to fetch GC data")
        }

        const data = await response.json()
        setGcData(data)
      } catch (err) {
        console.error("GC Intelligence error:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchGCData()
  }, [gcId, gcName])

  const handleAskKO = async () => {
    if (!question.trim()) return

    setAskingKO(true)
    setKoResponse(null)

    try {
      // If parent provides onAskKO callback, use it
      if (onAskKO) {
        onAskKO(`About ${gcData?.name || gcName}: ${question}`)
        setShowAskKO(false)
        setQuestion("")
        return
      }

      // Otherwise, simulate a response (in production this would call the chat API)
      await new Promise(resolve => setTimeout(resolve, 1500))

      setKoResponse({
        text: `Based on our historical data with ${gcData?.name || gcName}, ${question.toLowerCase().includes("price")
          ? "they typically expect competitive pricing within 5-10% of market rates. Consider emphasizing our quality track record over lowest price."
          : question.toLowerCase().includes("system") || question.toLowerCase().includes("material")
            ? `their preferred systems include ${gcData?.preferred_systems?.join(", ") || "TPO and APP"}. Consider highlighting our experience with these systems.`
            : "I'd recommend reviewing our past proposals to them and noting what differentiated our winning bids."}`,
        confidence: "Based on ${gcData?.total_projects || 0} historical projects"
      })
    } catch (err) {
      console.error("Ask KO error:", err)
    } finally {
      setAskingKO(false)
    }
  }

  if (!gcId && !gcName) {
    return null
  }

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-foreground-secondary" />
          <span className="text-foreground-secondary">Loading GC intelligence...</span>
        </div>
      </div>
    )
  }

  if (error || !gcData) {
    return (
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 text-foreground-tertiary">
          <AlertCircle className="w-5 h-5" />
          <span>Unable to load GC data</span>
        </div>
      </div>
    )
  }

  const winRate = gcData.win_rate || 0
  const winRateColor = winRate >= 50 ? "text-green-500" : winRate >= 30 ? "text-yellow-500" : "text-red-500"
  const summary = generateSummary(gcData)

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">GC Intelligence</h3>
              <p className="text-sm text-foreground-secondary">{gcData.name || gcName || "Unknown GC"}</p>
            </div>
          </div>
          <button
            onClick={() => setShowAskKO(!showAskKO)}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-medium transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Ask KO
          </button>
        </div>
      </div>

      {/* AI Summary Section */}
      {summary && (
        <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-primary font-medium uppercase tracking-wider">KO Intelligence Summary</span>
                <button
                  onClick={() => setShowFullSummary(!showFullSummary)}
                  className="text-xs text-foreground-tertiary hover:text-foreground flex items-center gap-1"
                >
                  {showFullSummary ? "Less" : "More"}
                  {showFullSummary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{summary.overview}</p>

              {showFullSummary && (
                <div className="mt-4 space-y-3">
                  <div>
                    <span className="text-xs text-foreground-tertiary font-medium uppercase tracking-wider">Key Insights</span>
                    <ul className="mt-2 space-y-1">
                      {summary.keyInsights.map((insight, idx) => (
                        <li key={idx} className="text-sm text-foreground-secondary flex items-start gap-2">
                          <span className="text-primary mt-1.5">•</span>
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    winRate >= 50 ? "bg-green-500/10 border border-green-500/20" :
                    winRate >= 30 ? "bg-yellow-500/10 border border-yellow-500/20" :
                    "bg-red-500/10 border border-red-500/20"
                  }`}>
                    <span className="text-xs font-medium uppercase tracking-wider text-foreground-tertiary">Recommendation</span>
                    <p className="text-sm text-foreground mt-1">{summary.recommendation}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ask KO Panel */}
      {showAskKO && (
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Ask KO about {gcData.name || gcName}</span>
              <button onClick={() => setShowAskKO(false)} className="ml-auto p-1 hover:bg-muted rounded">
                <X className="w-4 h-4 text-foreground-tertiary" />
              </button>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAskKO()}
                placeholder="e.g., What pricing strategy works best with this GC?"
                className="flex-1 px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                onClick={handleAskKO}
                disabled={!question.trim() || askingKO}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {askingKO ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Questions */}
            <div className="flex flex-wrap gap-2">
              {["Best pricing approach?", "Preferred systems?", "Key contacts?", "Recent project history?"].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuestion(q)}
                  className="px-2 py-1 bg-background border border-border rounded text-xs text-foreground-secondary hover:text-foreground hover:border-foreground-tertiary transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* KO Response */}
            {koResponse && (
              <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground">{koResponse.text}</p>
                    <p className="text-xs text-foreground-tertiary mt-1">{koResponse.confidence}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Projects */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-foreground-tertiary" />
              <span className="text-xs text-foreground-tertiary uppercase tracking-wider">Projects</span>
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">
              {gcData.total_projects || 0}
              <span className="text-sm font-normal text-foreground-secondary ml-1">total</span>
            </div>
            <div className="text-sm text-foreground-secondary">
              {gcData.won_projects || 0} won
            </div>
          </div>

          {/* Win Rate */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              {winRate >= 50 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className="text-xs text-foreground-tertiary uppercase tracking-wider">Win Rate</span>
            </div>
            <div className={`text-xl font-bold tabular-nums ${winRateColor}`}>
              {winRate.toFixed(0)}%
            </div>
            <div className="text-sm text-foreground-secondary">
              vs 25% avg
            </div>
          </div>

          {/* Avg Project Size */}
          <div className="bg-secondary/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-foreground-tertiary" />
              <span className="text-xs text-foreground-tertiary uppercase tracking-wider">Avg Size</span>
            </div>
            <div className="text-xl font-bold text-foreground tabular-nums">
              {formatCurrency(gcData.avg_project_size)}
            </div>
            <div className="text-sm text-foreground-secondary">
              per project
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t border-border space-y-3">
          {/* Preferred Systems */}
          {gcData.preferred_systems && gcData.preferred_systems.length > 0 && (
            <div>
              <span className="text-xs text-foreground-tertiary uppercase tracking-wider">Preferred Systems</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {gcData.preferred_systems.map((system, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-secondary rounded text-sm text-foreground"
                  >
                    {system}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Payment History */}
          {gcData.payment_status && (
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-foreground-tertiary" />
              <span className="text-sm text-foreground-secondary">Payment History:</span>
              <span className={`text-sm font-medium ${
                gcData.payment_status === "Good standing" ? "text-green-500" :
                gcData.payment_status === "Warning" ? "text-yellow-500" : "text-red-500"
              }`}>
                {gcData.payment_status === "Good standing" && "Good standing"}
                {gcData.payment_status === "Warning" && "Some delays"}
                {gcData.payment_status === "Bad" && "Payment issues"}
                {!["Good standing", "Warning", "Bad"].includes(gcData.payment_status) && gcData.payment_status}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
