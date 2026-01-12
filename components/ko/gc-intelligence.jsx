"use client"

import { useState, useEffect } from "react"
import { Loader2, TrendingUp, TrendingDown, Building2, Trophy, DollarSign, CreditCard, AlertCircle } from "lucide-react"

function formatCurrency(amount) {
  if (!amount) return "$0"
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

export function GCIntelligence({ gcId, gcName }) {
  const [gcData, setGcData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">GC Intelligence</h3>
            <p className="text-sm text-foreground-secondary">{gcData.name || gcName || "Unknown GC"}</p>
          </div>
        </div>
      </div>

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
