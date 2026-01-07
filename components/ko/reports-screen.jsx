"use client"

import { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  Grid3X3,
  List,
  SlidersHorizontal,
  RefreshCw,
  X,
  TrendingUp,
  TrendingDown,
  Download,
  MessageSquare,
  Save,
  Lightbulb,
  Loader2,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"
import { apiClient } from "@/lib/api"


// Power BI Logo SVG component
function PowerBILogo({ className }) {

  return (
    <svg className={className} viewBox="0 0 630 630" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="pbi-grad-1" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#EBBB14" />
          <stop offset="100%" stopColor="#B25400" />
        </linearGradient>
        <linearGradient id="pbi-grad-2" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#F9E583" />
          <stop offset="100%" stopColor="#DE9800" />
        </linearGradient>
        <linearGradient id="pbi-grad-3" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#F9E68B" />
          <stop offset="100%" stopColor="#F3CD32" />
        </linearGradient>
      </defs>
      <g transform="translate(77.5, 0)">
        <rect fill="url(#pbi-grad-1)" x="256" y="0" width="219" height="630" rx="26" />
        <path
          d="M346,604 L346,630 L320,630 L153,630 C138.64,630 127,618.36 127,604 L127,183 C127,168.64 138.64,157 153,157 L320,157 C334.36,157 346,168.64 346,183 L346,604 Z"
          fill="url(#pbi-grad-2)"
        />
        <path
          d="M219,604 L219,630 L193,630 L26,630 C11.64,630 0,618.36 0,604 L0,341 C0,326.64 11.64,315 26,315 L193,315 C207.36,315 219,326.64 219,341 L219,604 Z"
          fill="url(#pbi-grad-3)"
        />
      </g>
    </svg>
  )
}

export function ReportsScreen({
  initialViewMode,
  initialCustomView,
  initialOriginalQuestion,
  onExitReports,
  onAskFollowUp
}) {
  const [viewMode, setViewMode] = useState("gallery")
  const [dashboards, setDashboards] = useState([])
  const [selectedDashboard, setSelectedDashboard] = useState(null)
  const [embedInfo, setEmbedInfo] = useState(null)
  const [showFilters, setShowFilters] = useState(false)
  const [gridView, setGridView] = useState(true)
  const [customView, setCustomView] = useState(null)
  const [originalQuestion, setOriginalQuestion] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ceoKpis, setCeoKpis] = useState(null)
  const [kpisLoading, setKpisLoading] = useState(true)

  // Filter states
  const [dateRange, setDateRange] = useState("last-30")
  const [projectType, setProjectType] = useState("all")
  const [gc, setGc] = useState("all")
  const [borough, setBorough] = useState("all")

  const containerRef = useRef(null)

  // Uncomment for using powerbi-embed
  useEffect(() => {
    if (!embedInfo || !containerRef.current) return
    if (typeof window === "undefined") return

    let powerbi
    let isMounted = true

      ; (async () => {
        // Dynamic import so it only runs in the browser
        const pbi = await import("powerbi-client")
        if (!isMounted || !containerRef.current) return

        powerbi = new pbi.service.Service(
          pbi.factories.hpmFactory,
          pbi.factories.wpmpFactory,
          pbi.factories.routerFactory
        )

        powerbi.reset(containerRef.current)

        const config = {
          type: "report",
          tokenType: pbi.models.TokenType.Embed,
          accessToken: embedInfo.embedToken,
          embedUrl: embedInfo.embedUrl,
          id: embedInfo.dashboard_id,
          permissions: pbi.models.Permissions.Read,
          settings: {
            layoutType: pbi.models.LayoutType.Custom,
            customLayout: {
              displayOption: pbi.models.DisplayOption.FitToWidth
              // Or FitToPage if you prefer full page scaling:
              // displayOption: pbi.models.DisplayOption.FitToPage
            },
            panes: {
              filters: { visible: false },
              pageNavigation: { visible: false }
            },
            background: pbi.models.BackgroundType.Transparent
          }
        }

        powerbi.embed(containerRef.current, config)
      })()

    return () => {
      isMounted = false
      if (powerbi && containerRef.current) {
        powerbi.reset(containerRef.current)
      }
    }
  }, [embedInfo])




  // Load dashboards and CEO KPIs on mount
  useEffect(() => {
    loadDashboards()
    loadCeoKpis()
  }, [])

  const loadCeoKpis = async () => {
    try {
      setKpisLoading(true)
      const response = await apiClient.powerbi.getCeoKpis()
      setCeoKpis(response)
    } catch (err) {
      console.error("Failed to load CEO KPIs:", err)
      // Don't set error - KPIs are optional, dashboards still work
    } finally {
      setKpisLoading(false)
    }
  }

  const formatCurrency = (value) => {
    if (!value) return "$0"
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  useEffect(() => {
    if (initialViewMode === "custom" && initialCustomView) {
      setViewMode("custom")
      setCustomView(initialCustomView)
      setOriginalQuestion(initialOriginalQuestion || "")
      setLoading(false)
      setError(null)
    }
  }, [initialViewMode, initialCustomView, initialOriginalQuestion])

  const loadDashboards = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.powerbi.listDashboards()
      setDashboards(response.dashboards)
    } catch (err) {
      console.error("Failed to load dashboards:", err)
      setError(err.message || "Failed to load dashboards")
    } finally {
      setLoading(false)
    }
  }

  const handleDashboardClick = async (dashboard) => {
    try {
      setLoading(true)
      setSelectedDashboard(dashboard)

      // Build filters object from current filter state
      const filters = {}
      if (dateRange !== "last-30") filters.dateRange = dateRange
      if (projectType !== "all") filters.projectType = projectType
      if (gc !== "all") filters.gc = gc
      if (borough !== "all") filters.borough = borough

      // Get embed info from backend
      const result = await apiClient.powerbi.openDashboard(dashboard.id, filters)
      setEmbedInfo(result)
      setViewMode("dashboard")
    } catch (err) {
      console.error("Failed to open dashboard:", err)
      setError(err.message || "Failed to open dashboard")
    } finally {
      setLoading(false)
    }
  }


  const handleBack = () => {
    setViewMode("gallery")
    setSelectedDashboard(null)
    setEmbedInfo(null)
    setCustomView(null)
  }

  const resetFilters = () => {
    setDateRange("last-30")
    setProjectType("all")
    setGc("all")
    setBorough("all")
  }

  const handleRefreshDashboard = async () => {
    if (selectedDashboard) {
      await handleDashboardClick(selectedDashboard)
    }
  }


  // Map backend dashboard data to display format
  const mapDashboardForDisplay = (dash) => ({
    id: dash.id,
    title: dash.name,
    icon: dash.icon || "📊",
    kpi1: {
      value: dash.kpi1?.value || "N/A",
      label: dash.kpi1?.label || "Metric 1",
      trend: dash.kpi1?.trend,
    },
    kpi2: {
      value: dash.kpi2?.value || "N/A",
      label: dash.kpi2?.label || "Metric 2",
      trend: dash.kpi2?.trend,
    },
    updatedAt: dash.lastUpdated || "Recently",
  })

  const handleAskFollowUp = () => {
    if (!customView || !onAskFollowUp) return

    // Prepare context to pass back to chat
    const context = {
      type: "powerbi_custom_view",
      originalQuestion: originalQuestion,
      chartData: {
        title: customView.title,
        chart_type: customView.chart_type,
        data: customView.data,
        narrative: customView.narrative,
        source: customView.source,
      },
      // Suggested follow-up prompts based on chart type
    }


    // Call parent callback to switch to chat with context
    onAskFollowUp(context)
  }


  const renderCustomChart = () => {
    if (!customView) return null

    switch (customView.chart_type) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={customView.data}
              margin={{ top: 8, right: 10, left: 6, bottom: 26 }} // prevents edge clipping
              barCategoryGap={18} // space between categories
              barGap={6} // space between bars (if multiple series later)
            >
              <CartesianGrid
                strokeDasharray="4 2"
              />

              <XAxis
                dataKey="category"

                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />

              <YAxis
                width={44} // slimmer but enough for 1.8M
                tickMargin={8}
                tickCount={4}
                tickFormatter={(v) => compact.format(v)}
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={<CleanTooltip />}
                cursor={{ fill: "var(--muted)", opacity: 0.25 }}
              />

              <Bar
                dataKey="value"
                fill="var(--primary)"
                radius={[6, 6, 0, 0]}
                maxBarSize={50} // keeps bars slim/material-like
              />
            </BarChart>
          </ResponsiveContainer>
        )

      case "line":
        return (
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={customView.data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" />
            </LineChart>
          </ResponsiveContainer>
        )

      case "pie":
        return (
          <ResponsiveContainer width="100%" height={360}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie data={customView.data} dataKey="value" nameKey="category" />
            </PieChart>
          </ResponsiveContainer>
        )

      case "table":
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Value</th>
                  <th className="py-2">Label</th>
                </tr>
              </thead>
              <tbody>
                {customView.data?.map((row, idx) => (
                  <tr key={idx} className="border-b border-border/50">
                    <td className="py-2 pr-4">{row.category}</td>
                    <td className="py-2 pr-4">{row.value}</td>
                    <td className="py-2">{row.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      default:
        return <div className="text-foreground-tertiary">Unsupported chart type: {customView.chart_type}</div>
    }
  }

  const compact = new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  })

  const chartData = [
    { category: "Brooklyn", value: 1800000, label: "$1.8M" },
    { category: "Manhattan", value: 1500000, label: "$1.5M" },
    { category: "Queens", value: 1200000, label: "$1.2M" },
    { category: "Bronx", value: 800000, label: "$0.8M" },
    { category: "Staten Island", value: 500000, label: "$0.5M" },
  ]

  function CleanTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    const row = payload[0]?.payload
    return (
      <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-sm">
        <div className="text-[11px] leading-4 text-muted-foreground">{label}</div>
        <div className="text-[12px] leading-4 font-medium">
          {row?.label ?? compact.format(row?.value ?? 0)}
        </div>
      </div>
    )
  }

  // Test View
  if (viewMode === "test") {
    return (
      <div className="rounded-xl border border-border bg-card text-card-foreground p-4 shadow-sm">
        <div className="h-[330px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 10, left: 6, bottom: 26 }} // prevents edge clipping
              barCategoryGap={18} // space between categories
              barGap={6} // space between bars (if multiple series later)
            >
              <CartesianGrid
                strokeDasharray="4 2"
              />

              <XAxis
                dataKey="category"

                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />

              <YAxis
                width={44} // slimmer but enough for 1.8M
                // axisLine={false}
                // tickLine={false}
                tickMargin={8}
                tickCount={4}
                tickFormatter={(v) => compact.format(v)}
                tick={{
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />

              <Tooltip
                content={<CleanTooltip />}
                cursor={{ fill: "var(--muted)", opacity: 0.25 }}
              />

              <Bar
                dataKey="value"
                fill="var(--primary)"
                radius={[6, 6, 0, 0]}
                maxBarSize={50} // keeps bars slim/material-like
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )
  }
  // Gallery View
  if (viewMode === "gallery") {
    return (
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-foreground tracking-wide">Reports</h1>
            <div className="flex items-center gap-2">
              {/* View Toggle */}
              <div className="flex items-center bg-secondary rounded-lg p-1">
                <button
                  onClick={() => setGridView(true)}
                  className={`p-2 rounded-md transition-all duration-200 ${gridView ? "bg-card shadow-sm text-foreground" : "text-foreground-secondary hover:text-foreground"
                    }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setGridView(false)}
                  className={`p-2 rounded-md transition-all duration-200 ${!gridView ? "bg-card shadow-sm text-foreground" : "text-foreground-secondary hover:text-foreground"
                    }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              {/* Refresh Button */}
              <button
                onClick={loadDashboards}
                disabled={loading}
                className="p-2 rounded-lg bg-secondary text-foreground-secondary hover:text-foreground hover:bg-secondary/80 transition-all duration-200 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground-secondary hover:text-foreground hover:bg-secondary/80 transition-all duration-200"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-sm font-medium">Filter</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* CEO KPIs Section */}
        {ceoKpis && (
          <div className="px-6 pt-4">
            <h2 className="text-sm font-medium text-foreground-secondary uppercase tracking-wider mb-3">Executive KPIs</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Velocity */}
              <div className="bg-card rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⚡</span>
                  <span className="text-xs text-foreground-tertiary uppercase">Velocity</span>
                </div>
                <div className="text-xl font-bold text-foreground tabular-nums">
                  {ceoKpis.velocity?.avg_days_rfp_to_proposal?.toFixed(0) || 0}
                  <span className="text-sm font-normal text-foreground-secondary ml-1">days</span>
                </div>
                <div className="text-[10px] text-foreground-tertiary">RFP → Proposal</div>
              </div>

              {/* Win Rate */}
              <div className="bg-card rounded-lg p-3 border border-border/50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🏆</span>
                  <span className="text-xs text-foreground-tertiary uppercase">Win Rate</span>
                </div>
                <div className="text-xl font-bold text-green-500 tabular-nums">
                  {((ceoKpis.velocity?.win_rate || 0) * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-foreground-tertiary">{ceoKpis.velocity?.total_awarded || 0} won / {ceoKpis.velocity?.total_decided || 0} decided</div>
              </div>

              {/* Stuck Jobs */}
              <div className="bg-card rounded-lg p-3 border border-red-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🔴</span>
                  <span className="text-xs text-foreground-tertiary uppercase">Stuck 180+</span>
                </div>
                <div className="text-xl font-bold text-red-500 tabular-nums">
                  {ceoKpis.stuck_jobs?.count_180_plus || 0}
                </div>
                <div className="text-[10px] text-foreground-tertiary">{formatCurrency(ceoKpis.stuck_jobs?.total_stuck_value)} at risk</div>
              </div>

              {/* Aging Jobs */}
              <div className="bg-card rounded-lg p-3 border border-orange-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🟠</span>
                  <span className="text-xs text-foreground-tertiary uppercase">Aging 90+</span>
                </div>
                <div className="text-xl font-bold text-orange-500 tabular-nums">
                  {(ceoKpis.stuck_jobs?.count_90_180 || 0) + (ceoKpis.stuck_jobs?.count_180_plus || 0)}
                </div>
                <div className="text-[10px] text-foreground-tertiary">{ceoKpis.stuck_jobs?.count_30_90 || 0} aging 30-90</div>
              </div>

              {/* Critical Risk */}
              <div className="bg-card rounded-lg p-3 border border-red-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">⚠️</span>
                  <span className="text-xs text-foreground-tertiary uppercase">Critical Risk</span>
                </div>
                <div className="text-xl font-bold text-red-500 tabular-nums">
                  {ceoKpis.at_risk?.critical || 0}
                </div>
                <div className="text-[10px] text-foreground-tertiary">{ceoKpis.at_risk?.high || 0} high risk</div>
              </div>

              {/* At Risk Value */}
              <div className="bg-card rounded-lg p-3 border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">💰</span>
                  <span className="text-xs text-foreground-tertiary uppercase">At Risk $</span>
                </div>
                <div className="text-xl font-bold text-yellow-500 tabular-nums">
                  {formatCurrency(ceoKpis.at_risk?.high_value_at_risk)}
                </div>
                <div className="text-[10px] text-foreground-tertiary">{ceoKpis.at_risk?.total_alerts || 0} alerts</div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-foreground-secondary" />
            </div>
          ) : dashboards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <PowerBILogo className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-foreground-secondary">No dashboards available</p>
              <button
                onClick={loadDashboards}
                className="mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
              >
                Retry
              </button>
            </div>
          ) : (
            <div
              className={`grid gap-5 ${gridView ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1 max-w-2xl"}`}
            >
              {dashboards.map((dashboard, index) => {
                const displayDash = mapDashboardForDisplay(dashboard)
                return (
                  <button
                    key={dashboard.id}
                    onClick={() => handleDashboardClick(dashboard)}
                    className="group relative bg-card rounded-xl p-6 text-left transition-all duration-200 hover:scale-[1.02] border border-border/50 hover:border-primary/20 dark:hover:shadow-[0_0_20px_rgba(230,50,38,0.1)] hover:shadow-lg"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animation: "fadeInUp 0.4s ease-out forwards",
                      opacity: 0,
                    }}
                  >
                    {/* Active indicator line on hover */}
                    <div className="absolute left-0 top-4 bottom-4 w-[3px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{displayDash.icon}</span>
                      <h3 className="font-semibold text-foreground tracking-tight">{displayDash.title}</h3>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-secondary/50 dark:bg-[#1a1a1d] rounded-lg p-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xl font-bold text-foreground tabular-nums">{displayDash.kpi1.value}</span>
                          {displayDash.kpi1.trend === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {displayDash.kpi1.trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
                        </div>
                        <span className="text-[11px] text-foreground-tertiary uppercase tracking-wider">
                          {displayDash.kpi1.label}
                        </span>
                      </div>
                      <div className="bg-secondary/50 dark:bg-[#1a1a1d] rounded-lg p-3">
                        <div className="flex items-center gap-1">
                          <span className="text-xl font-bold text-foreground tabular-nums">{displayDash.kpi2.value}</span>
                          {displayDash.kpi2.trend === "up" && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {displayDash.kpi2.trend === "down" && <TrendingDown className="w-4 h-4 text-red-500" />}
                        </div>
                        <span className="text-[11px] text-foreground-tertiary uppercase tracking-wider">
                          {displayDash.kpi2.label}
                        </span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground-tertiary">Updated {displayDash.updatedAt}</span>
                      <span className="text-foreground-tertiary group-hover:text-primary transition-colors duration-200">
                        →
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Filter Panel Slide-Over */}
        {showFilters && (
          <>
            <div
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
              onClick={() => setShowFilters(false)}
            />
            <div className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l border-border z-50 shadow-2xl animate-in slide-in-from-right duration-250">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Filters</h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-foreground-secondary" />
                </button>
              </div>

              <div className="p-4 space-y-6">
                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-input-background border border-input rounded-lg text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="last-7">Last 7 Days</option>
                    <option value="last-30">Last 30 Days</option>
                    <option value="last-90">Last 90 Days</option>
                    <option value="ytd">Year to Date</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Project Type */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Project Type</label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value)}
                    className="w-full px-3 py-2.5 bg-input-background border border-input rounded-lg text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="all">All Types</option>
                    <option value="commercial">Commercial</option>
                    <option value="residential">Residential</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>

                {/* General Contractor */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">General Contractor</label>
                  <select
                    value={gc}
                    onChange={(e) => setGc(e.target.value)}
                    className="w-full px-3 py-2.5 bg-input-background border border-input rounded-lg text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="all">All GCs</option>
                    <option value="turner">Turner Construction</option>
                    <option value="skanska">Skanska USA</option>
                    <option value="suffolk">Suffolk Construction</option>
                    <option value="gilbane">Gilbane Building</option>
                  </select>
                </div>

                {/* Borough */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Borough</label>
                  <select
                    value={borough}
                    onChange={(e) => setBorough(e.target.value)}
                    className="w-full px-3 py-2.5 bg-input-background border border-input rounded-lg text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
                  >
                    <option value="all">All Boroughs</option>
                    <option value="manhattan">Manhattan</option>
                    <option value="brooklyn">Brooklyn</option>
                    <option value="queens">Queens</option>
                    <option value="bronx">Bronx</option>
                    <option value="staten-island">Staten Island</option>
                  </select>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
                <div className="flex gap-3">
                  <button
                    onClick={resetFilters}
                    className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground-secondary hover:bg-secondary transition-colors text-sm font-medium"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => {
                      setShowFilters(false)
                      // If a dashboard is selected, refresh it with new filters
                      if (selectedDashboard) {
                        handleDashboardClick(selectedDashboard)
                      }
                    }}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Animation Keyframes */}
        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    )
  }

  // Dashboard View (Full)
  if (viewMode === "dashboard" && selectedDashboard) {
    return (
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-foreground-secondary hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-foreground">{selectedDashboard.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground-secondary hover:text-foreground transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Filter</span>
              </button>
              <button
                onClick={handleRefreshDashboard}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground-secondary hover:text-foreground transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span className="text-sm font-medium hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="w-full h-full min-h-[400px] bg-card rounded-xl border border-border flex items-center justify-center relative overflow-hidden">
            {/* Subtle Grid Pattern */}
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            />

            {/* Placeholder or Loading */}
            {loading ? (
              <div className="flex flex-col items-center gap-4 z-10">
                <Loader2 className="w-12 h-12 animate-spin text-foreground-secondary" />
                <p className="text-foreground-tertiary text-sm">Loading dashboard...</p>
              </div>
            ) : embedInfo ? (
              <div className="w-full h-full z-10">
                {/* <div className="mb-3 text-sm text-foreground-tertiary">
                  {embedInfo.narrative}
                </div> */}
                <div ref={containerRef} className="w-full h-[75vh] rounded-lg overflow-hidden" />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 z-10">
                <div className="w-20 h-20 rounded-2xl bg-secondary/50 flex items-center justify-center">
                  <PowerBILogo className="w-12 h-12" />
                </div>
                <div className="text-center">
                  <h3 className="text-foreground font-medium mb-1">Dashboard will appear here</h3>
                  <p className="text-foreground-tertiary text-sm">Power BI embed loading...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div >
    )
  }

  // Custom View Mode (Agent-Generated)
  if (viewMode === "custom" && customView) {
    return (
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-foreground-secondary hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-lg font-semibold text-foreground">Custom View</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground-secondary hover:text-foreground transition-colors">
                <Save className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Save</span>
              </button>
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground-secondary hover:text-foreground transition-colors">
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Context Banner */}
        {originalQuestion && (
          <div className="mx-6 mt-4 px-4 py-3 bg-primary/5 border border-primary/10 rounded-lg">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-foreground text-sm font-medium">Generated from: "{originalQuestion}"</p>
                <p className="text-foreground-tertiary text-xs mt-0.5">{customView.title} • Just now</p>
              </div>
            </div>
          </div>
        )}

        {/* Visualization Container */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="w-full h-full min-h-[450px] bg-card rounded-xl border border-border p-6">
            <h2 className="text-xl font-bold text-foreground mb-2">{customView.title}</h2>
            <p className="text-foreground-secondary text-sm mb-6">{customView.narrative}</p>

            {/* Chart placeholder - integrate with recharts/d3 */}
            <div className="bg-secondary/20 rounded-lg w-full">
              {renderCustomChart()}
            </div>

            <p className="text-xs text-foreground-tertiary mt-4">Source: {customView.source}</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-4 border-t border-border bg-card">
          <div className="flex items-center justify-center gap-4">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground-secondary hover:bg-secondary transition-colors">
              <Save className="w-4 h-4" />
              <span className="text-sm font-medium">Save to Gallery</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground-secondary hover:bg-secondary transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export PDF</span>
            </button>
            <button
              onClick={handleAskFollowUp}
              disabled={!onAskFollowUp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-medium">Ask Follow-up</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}