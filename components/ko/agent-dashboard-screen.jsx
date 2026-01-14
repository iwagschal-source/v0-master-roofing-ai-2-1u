"use client"

import { useState, useMemo } from "react"
import {
  Search,
  Plus,
  RefreshCw,
  LayoutGrid,
  Network,
  AlertTriangle,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react"
import { agents as staticAgents, statusConfig, getBottlenecks, getProblemAgents } from "@/data/agent-data"
import { AgentGrid } from "./agent-grid"
import { StatusDot } from "./agent-model-icon"
import { useAgentStatus } from "@/hooks/use-agent-status"

export function AgentDashboardScreen({
  agents: passedAgents,
  onSelectAgent,
  onViewNetwork,
  onAddAgent,
}) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Use passed agents or fallback to static
  const baseAgents = passedAgents && passedAgents.length > 0 ? passedAgents : staticAgents

  // Live status polling from backend
  const {
    isBackendHealthy,
    agentStatuses,
    loading: isRefreshing,
    lastUpdated,
    refetch,
    error: statusError,
  } = useAgentStatus(true)

  // Merge agent data with live status
  const agents = useMemo(() => {
    return baseAgents.map((agent) => {
      const liveStatus = agentStatuses[agent.id]
      if (liveStatus) {
        return {
          ...agent,
          status: liveStatus.status,
          lastActivity: liveStatus.lastChecked,
        }
      }
      return agent
    })
  }, [baseAgents, agentStatuses])

  // Count agents by status
  const statusCounts = useMemo(() => ({
    all: agents.length,
    live: agents.filter((a) => a.status === "live").length,
    idle: agents.filter((a) => a.status === "idle").length,
    error: agents.filter((a) => a.status === "error").length,
    paused: agents.filter((a) => a.status === "paused").length,
    offline: agents.filter((a) => a.status === "offline").length,
  }), [agents])

  // Get problem indicators
  const bottlenecks = useMemo(() => getBottlenecks(5), [])
  const problemAgents = useMemo(() => getProblemAgents(), [])

  const handleRefresh = () => {
    refetch()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Left: Title and status counts */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agent Command Center</h1>
            <div className="flex items-center flex-wrap gap-4 mt-2">
              {/* Status filter buttons */}
              <button
                onClick={() => setStatusFilter("all")}
                className={`text-xs transition-opacity ${
                  statusFilter === "all" ? "opacity-100" : "opacity-50 hover:opacity-75"
                }`}
              >
                <span className="text-muted-foreground">All:</span>{" "}
                <span className="text-foreground font-medium">{statusCounts.all}</span>
              </button>

              {Object.entries(statusCounts).map(([status, count]) => {
                if (status === "all") return null
                const config = statusConfig[status]
                if (!config) return null
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex items-center gap-1.5 text-xs transition-opacity ${
                      statusFilter === status || statusFilter === "all"
                        ? "opacity-100"
                        : "opacity-50 hover:opacity-75"
                    }`}
                  >
                    <StatusDot status={status} size="sm" />
                    <span className="text-muted-foreground capitalize">{status}:</span>
                    <span className={config.textColor}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Backend health indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
                isBackendHealthy
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
              title={lastUpdated ? `Last updated: ${lastUpdated.toLocaleTimeString()}` : "Connecting..."}
            >
              {isBackendHealthy ? (
                <Wifi size={14} className="text-emerald-400" />
              ) : (
                <WifiOff size={14} className="text-red-400" />
              )}
              <span className={`text-xs ${isBackendHealthy ? "text-emerald-400" : "text-red-400"}`}>
                {isBackendHealthy ? "Backend Online" : statusError || "Backend Offline"}
              </span>
            </div>

            {/* Alerts summary */}
            {(bottlenecks.length > 0 || problemAgents.length > 0) && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertTriangle size={14} className="text-amber-400" />
                <span className="text-xs text-amber-400">
                  {bottlenecks.length > 0 && `${bottlenecks.length} backlogged`}
                  {bottlenecks.length > 0 && problemAgents.length > 0 && " | "}
                  {problemAgents.length > 0 && `${problemAgents.length} issues`}
                </span>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm w-48 lg:w-64 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Filter dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status ({statusCounts.all})</option>
              <option value="live">Live ({statusCounts.live})</option>
              <option value="idle">Idle ({statusCounts.idle})</option>
              <option value="error">Error ({statusCounts.error})</option>
              <option value="paused">Paused ({statusCounts.paused})</option>
              <option value="offline">Offline ({statusCounts.offline})</option>
            </select>

            {/* Refresh */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 bg-secondary border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />
            </button>

            {/* Network Map */}
            <button
              onClick={onViewNetwork}
              className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-accent transition-colors"
              title="View Network Map"
            >
              <Network size={18} />
              <span className="hidden sm:inline text-sm">Network</span>
            </button>

            {/* Add Agent */}
            <button
              onClick={onAddAgent}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Agent</span>
            </button>
          </div>
        </div>
      </header>

      {/* Live activity banner (when agents are active) */}
      {statusCounts.live > 0 && (
        <div className="px-6 py-2 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2">
          <Activity size={14} className="text-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400">
            {statusCounts.live} agent{statusCounts.live > 1 ? "s" : ""} actively processing
          </span>
          <span className="text-xs text-muted-foreground ml-auto">
            Total requests/min:{" "}
            {agents.reduce((sum, a) => sum + (a.stats.requestsPerMinute || 0), 0)}
          </span>
        </div>
      )}

      {/* Main content - agent grid */}
      <main className="flex-1 overflow-auto p-6">
        <AgentGrid
          agents={agents}
          filter={statusFilter}
          searchTerm={searchTerm}
          onSelectAgent={onSelectAgent}
        />
      </main>
    </div>
  )
}
