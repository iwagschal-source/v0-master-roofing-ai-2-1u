"use client"

import { useState, useEffect } from "react"
import { Loader2, AlertCircle, CheckCircle2, XCircle, AlertTriangle, Lightbulb } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Format currency for display
 */
function formatCurrency(amount) {
  if (!amount) return "$0"
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

/**
 * GC Brief Component - Clean, readable brief for estimators
 */
export function GCBrief({ gcName, projectName, className }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!gcName) {
      setLoading(false)
      return
    }

    const fetchBrief = async () => {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams({ gcName })
        const response = await fetch(`/api/ko/gc-brief?${params}`)
        if (!response.ok) throw new Error("Failed to fetch GC brief")
        const result = await response.json()
        setData(result)
      } catch (err) {
        console.error("GC Brief error:", err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchBrief()
  }, [gcName])

  if (!gcName) return null

  if (loading) {
    return (
      <div className={cn("bg-card rounded-xl border border-border p-6", className)}>
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-foreground-secondary">Loading GC brief...</span>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={cn("bg-card rounded-xl border border-border p-6", className)}>
        <div className="flex items-center gap-3 text-foreground-tertiary">
          <AlertCircle className="w-5 h-5" />
          <span>Unable to load brief for {gcName}</span>
        </div>
      </div>
    )
  }

  const winRate = data.win_rate_pct || 0

  return (
    <div className={cn("bg-card rounded-xl border border-border overflow-hidden font-mono text-sm", className)}>
      {/* Header */}
      <div className="px-5 py-4 bg-primary/5 border-b border-border">
        <div className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">GC Brief</div>
        <div className="text-lg font-bold text-foreground">{data.gc_name || gcName}</div>
        {projectName && <div className="text-foreground-secondary">for {projectName}</div>}
      </div>

      {/* Quick Stats */}
      <Section title="QUICK STATS">
        <Line label="Projects with this GC" value={data.total_projects || 0} />
        <Line label="Win rate" value={`${winRate.toFixed(0)}%`} highlight={winRate >= 50 ? "green" : winRate >= 30 ? "yellow" : "red"} />
        <Line label="Avg project size" value={formatCurrency(data.avg_project_size)} />
        <Line label="Won / Lost / Pending" value={`${data.won_projects || 0} / ${data.lost_projects || 0} / ${data.pending_projects || 0}`} />
        {data.recent_projects?.[0] && (
          <Line label="Last project" value={`${data.recent_projects[0].project_name} (${data.recent_projects[0].award_status})`} />
        )}
      </Section>

      {/* Pricing Benchmarks */}
      <Section title="PRICING BENCHMARKS">
        {data.system_rates && data.system_rates.length > 0 && (
          <>
            <div className="text-foreground-tertiary text-xs uppercase tracking-wider mb-2">Systems:</div>
            {data.system_rates.slice(0, 4).map((rate, idx) => (
              <Line
                key={idx}
                label={rate.system_name}
                value={`$${rate.rate?.toFixed(2) || '0'}/SF`}
                note={`${rate.confidence_level}, ${rate.project_count} projects`}
              />
            ))}
          </>
        )}
        {data.accessory_rates && data.accessory_rates.length > 0 && (
          <>
            <div className="text-foreground-tertiary text-xs uppercase tracking-wider mt-4 mb-2">Accessories:</div>
            {data.accessory_rates.slice(0, 5).map((rate, idx) => (
              <Line
                key={idx}
                label={rate.accessory_name}
                value={`$${rate.rate?.toFixed(0) || '0'}/${rate.accessory_name?.toLowerCase().includes('drain') ? 'EA' : 'LF'}`}
                note={rate.confidence_level}
              />
            ))}
          </>
        )}
        {(!data.system_rates || data.system_rates.length === 0) && (!data.accessory_rates || data.accessory_rates.length === 0) && (
          <div className="text-foreground-tertiary italic">No pricing data available</div>
        )}
      </Section>

      {/* Bundling Preferences */}
      <Section title="BUNDLING PREFERENCES">
        {data.bundle_patterns && data.bundle_patterns.length > 0 ? (
          <>
            {/* Always bundles */}
            {data.bundle_patterns.filter(b => b.bundle_pct >= 80).length > 0 && (
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-foreground">
                  <span className="text-green-600">Always bundles:</span>{" "}
                  {data.bundle_patterns.filter(b => b.bundle_pct >= 80).map(b => b.bundle_item_type).join(", ")}
                </span>
              </div>
            )}
            {/* Sometimes */}
            {data.bundle_patterns.filter(b => b.bundle_pct >= 30 && b.bundle_pct < 80).length > 0 && (
              <div className="flex items-start gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-foreground">
                  <span className="text-yellow-600">Sometimes:</span>{" "}
                  {data.bundle_patterns.filter(b => b.bundle_pct >= 30 && b.bundle_pct < 80).map(b => `${b.bundle_item_type} (${b.bundle_pct}%)`).join(", ")}
                </span>
              </div>
            )}
            {/* Breaks out */}
            {data.bundle_patterns.filter(b => b.bundle_pct < 30).length > 0 && (
              <div className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-foreground">
                  <span className="text-red-600">Breaks out:</span>{" "}
                  {data.bundle_patterns.filter(b => b.bundle_pct < 30).map(b => b.bundle_item_type).join(", ")}
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="text-foreground-tertiary italic">No bundling data available</div>
        )}
      </Section>

      {/* Negotiation Patterns */}
      <Section title="NEGOTIATION PATTERNS">
        <Line label="Avg revisions per project" value={data.avg_revisions?.toFixed(1) || "—"} />
        <Line label="Typical change" value={data.avg_revision_pct_change ? `${data.avg_revision_pct_change.toFixed(0)}%` : "—"} />
        {data.change_patterns && data.change_patterns.length > 0 && (
          <Line label="Common patterns" value={data.change_patterns.slice(0, 3).map(p => p.replace(/_/g, " ")).join(", ")} />
        )}
      </Section>

      {/* Tribal Knowledge */}
      <Section title="TRIBAL KNOWLEDGE">
        {(data.gc_preferences?.filter(Boolean).length > 0 ||
          data.tribal_knowledge?.filter(Boolean).length > 0 ||
          data.negotiation_notes?.filter(Boolean).length > 0) ? (
          <>
            {data.gc_preferences?.filter(Boolean).slice(0, 3).map((pref, idx) => (
              <div key={idx} className="flex items-start gap-2 mb-1">
                <span className="text-primary">•</span>
                <span className="text-foreground">{pref}</span>
              </div>
            ))}
            {data.tribal_knowledge?.filter(Boolean).slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 mb-1">
                <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
            {data.negotiation_notes?.filter(Boolean).slice(0, 2).map((note, idx) => (
              <div key={idx} className="flex items-start gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span className="text-foreground">{note}</span>
              </div>
            ))}
          </>
        ) : (
          <div className="text-foreground-tertiary italic">No tribal knowledge recorded yet</div>
        )}
      </Section>

      {/* Recent Communications */}
      <Section title="RECENT COMMUNICATIONS" noBorder>
        <Line label="Total emails" value={data.total_emails || 0} />
        <Line label="Last email" value={data.last_email_date ? new Date(data.last_email_date).toLocaleDateString() : "—"} />
        {data.primary_contacts && data.primary_contacts.length > 0 && (
          <Line label="Key contacts" value={data.primary_contacts.slice(0, 3).join(", ")} />
        )}
        {data.avg_response_time_hours && (
          <Line label="Avg response time" value={`${data.avg_response_time_hours.toFixed(0)} hours`} />
        )}
      </Section>

      {/* Footer */}
      <div className="px-5 py-3 bg-secondary/30 text-xs text-foreground-tertiary">
        Based on {data.total_projects || 0} historical projects • Data from Master Roofing Intelligence
      </div>
    </div>
  )
}

/**
 * Section component - simple bordered section
 */
function Section({ title, children, noBorder = false }) {
  return (
    <div className={cn("px-5 py-4", !noBorder && "border-b border-border")}>
      <div className="text-xs text-foreground-tertiary font-semibold uppercase tracking-wider mb-3">{title}</div>
      {children}
    </div>
  )
}

/**
 * Line component - label: value format
 */
function Line({ label, value, note, highlight }) {
  const highlightColors = {
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600"
  }

  return (
    <div className="flex items-baseline justify-between gap-4 mb-1.5 last:mb-0">
      <span className="text-foreground-secondary">{label}:</span>
      <span className={cn("text-foreground font-medium text-right", highlight && highlightColors[highlight])}>
        {value}
        {note && <span className="text-foreground-tertiary font-normal ml-2">({note})</span>}
      </span>
    </div>
  )
}
