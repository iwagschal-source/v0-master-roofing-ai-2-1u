"use client"

import { modelConfig } from "@/data/agent-data"

// Placeholder model icon component
// Displays a colored circle with the model's initial letter
export function AgentModelIcon({ modelKey, size = "md", className = "" }) {
  const config = modelConfig[modelKey] || modelConfig.custom

  const sizeClasses = {
    sm: "w-8 h-8 text-sm",
    md: "w-12 h-12 text-lg",
    lg: "w-16 h-16 text-2xl",
    xl: "w-20 h-20 text-3xl",
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg flex items-center justify-center font-bold text-white ${className}`}
      style={{ backgroundColor: config.color }}
      title={config.name}
    >
      {config.icon}
    </div>
  )
}

// Status indicator dot
export function StatusDot({ status, size = "md", className = "" }) {
  const statusColors = {
    live: "bg-emerald-500",
    idle: "bg-amber-500",
    error: "bg-red-500",
    paused: "bg-purple-500",
    offline: "bg-gray-500",
  }

  const statusAnimations = {
    live: "animate-pulse",
    error: "animate-pulse",
    idle: "",
    paused: "",
    offline: "",
  }

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full ${statusColors[status] || statusColors.offline} ${statusAnimations[status] || ""} ${className}`}
    />
  )
}

// Queue depth indicator (for showing backlog)
export function QueueIndicator({ depth, threshold = 5 }) {
  if (depth === 0) return null

  const isOverloaded = depth >= threshold

  return (
    <div
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        isOverloaded
          ? "bg-red-500/20 text-red-400 border border-red-500/30"
          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
      }`}
    >
      {depth} queued
    </div>
  )
}
