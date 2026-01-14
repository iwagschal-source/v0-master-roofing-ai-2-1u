"use client"

import { useState, useEffect } from "react"
import { Activity, Zap, AlertCircle, CheckCircle, Users } from "lucide-react"
import { statusConfig } from "@/data/agent-data"
import { AgentModelIcon, StatusDot, QueueIndicator } from "./agent-model-icon"

export function AgentCard({ agent, onClick }) {
  const [scrollPosition, setScrollPosition] = useState(0)

  // Map backend status to display status:
  // - "busy" from backend = "live" display (actively transmitting)
  // - "live" from backend = "idle" display (available but not active)
  // - Other statuses remain the same
  const displayStatus = agent.status === "busy" ? "live" :
                        agent.status === "live" ? "idle" :
                        agent.status
  const status = statusConfig[displayStatus]

  // Scroll the activity text continuously
  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPosition((prev) => prev + 1)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const textLength = agent.currentAction?.length || 20
  const scrollReset = textLength * 8 + 300 // Reset point based on text length

  return (
    <div
      onClick={() => onClick?.(agent)}
      className={`bg-card border border-border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 ${
        status.opacity || ""
      }`}
    >
      {/* Main content */}
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Logo with status indicator */}
          <div className="relative flex-shrink-0">
            <AgentModelIcon modelKey={agent.modelKey} size="md" />
            {/* Status dot on logo corner */}
            <div
              className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${status.color} ${status.animation}`}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${status.color} text-white flex-shrink-0`}
              >
                {status.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">{agent.id}</p>
            <p className="text-xs text-muted-foreground mt-1">{agent.model}</p>
          </div>
        </div>

        {/* Mini stats row */}
        <div className="flex items-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1" title="Success Rate">
            <Activity size={12} className={status.textColor} />
            <span className="text-muted-foreground">{agent.stats.successRate}%</span>
          </div>
          <div className="flex items-center gap-1" title="Avg Latency">
            <Zap size={12} className="text-amber-400" />
            <span className="text-muted-foreground">{agent.stats.avgLatency}ms</span>
          </div>
          <div className="flex items-center gap-1" title="Errors Today">
            {agent.stats.errorsToday > 0 ? (
              <AlertCircle size={12} className="text-red-400" />
            ) : (
              <CheckCircle size={12} className="text-emerald-400" />
            )}
            <span className="text-muted-foreground">{agent.stats.errorsToday} err</span>
          </div>
          <div className="flex items-center gap-1" title="Connections">
            <Users size={12} className="text-blue-400" />
            <span className="text-muted-foreground">{agent.connections?.length || 0}</span>
          </div>
        </div>

        {/* Queue depth warning */}
        {agent.queueDepth > 0 && (
          <div className="mt-3">
            <QueueIndicator depth={agent.queueDepth} threshold={5} />
          </div>
        )}
      </div>

      {/* Scrolling activity bar */}
      <div className="bg-secondary/50 border-t border-border px-3 py-2 overflow-hidden">
        <div className="relative h-5 overflow-hidden">
          <div
            className="absolute whitespace-nowrap text-xs text-muted-foreground font-mono flex items-center"
            style={{
              transform: `translateX(-${scrollPosition % scrollReset}px)`,
            }}
          >
            <StatusDot status={displayStatus} size="sm" isTransmitting={agent.status === "busy"} className="mr-2 flex-shrink-0" />
            <span>{agent.currentAction}</span>
            <span className="mx-8 text-muted-foreground/50">|</span>
            <StatusDot status={displayStatus} size="sm" isTransmitting={agent.status === "busy"} className="mr-2 flex-shrink-0" />
            <span>{agent.currentAction}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact card variant for network map side panel
export function AgentCardCompact({ agent, onClick, isSelected }) {
  // Map backend status to display status
  const displayStatus = agent.status === "busy" ? "live" :
                        agent.status === "live" ? "idle" :
                        agent.status
  const status = statusConfig[displayStatus]

  return (
    <div
      onClick={() => onClick?.(agent)}
      className={`p-3 rounded-lg cursor-pointer transition-all ${
        isSelected
          ? "bg-primary/20 border border-primary/50"
          : "bg-secondary/50 border border-transparent hover:bg-secondary"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <AgentModelIcon modelKey={agent.modelKey} size="sm" />
          <StatusDot
            status={displayStatus}
            size="sm"
            isTransmitting={agent.status === "busy"}
            className="absolute -bottom-0.5 -right-0.5 border border-card"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{agent.name}</p>
          <p className="text-xs text-muted-foreground font-mono">{agent.id}</p>
        </div>
        {agent.queueDepth > 0 && (
          <span className="text-xs text-amber-400 font-medium">{agent.queueDepth}q</span>
        )}
      </div>
    </div>
  )
}
