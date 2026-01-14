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
// Props:
// - status: 'live' | 'idle' | 'error' | 'paused' | 'offline'
// - isTransmitting: boolean - true when actively transmitting (shows green throb)
// - wasRecentlyActive: boolean - true for 5-10s after transmission ends (fading throb)
export function StatusDot({ status, size = "md", className = "", isTransmitting = false, wasRecentlyActive = false }) {
  // Determine the actual display color based on transmission state
  // If transmitting or recently active, show green. Otherwise use status color
  const showLive = isTransmitting || wasRecentlyActive

  const statusColors = {
    live: "bg-emerald-600", // Darker green, not transparent
    idle: "bg-amber-500",
    error: "bg-red-500",
    paused: "bg-purple-500",
    offline: "bg-gray-500",
  }

  // Size classes - live/transmitting is smaller
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  }

  // Smaller sizes for transmitting state
  const transmittingSizeClasses = {
    sm: "w-1.5 h-1.5",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
  }

  // Determine color and animation based on actual transmission state
  let displayColor = statusColors[status] || statusColors.offline
  let animation = ""
  let displaySize = sizeClasses[size]

  if (isTransmitting) {
    // Active transmission: bright green with fast throb
    displayColor = "bg-emerald-500"
    animation = "animate-throb"
    displaySize = transmittingSizeClasses[size]
  } else if (wasRecentlyActive) {
    // Recently active: fading green throb
    displayColor = "bg-emerald-600"
    animation = "animate-throb-fade"
    displaySize = transmittingSizeClasses[size]
  } else if (status === "error") {
    animation = "animate-pulse"
  }

  return (
    <div
      className={`${displaySize} rounded-full ${displayColor} ${animation} ${className}`}
      style={{
        // Ensure no transparency for transmitting states
        opacity: (isTransmitting || wasRecentlyActive) ? 1 : undefined
      }}
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
