"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

/**
 * @typedef {"green"|"yellow"|"red"} HealthStatus
 * @typedef {{
 *   id: string,
 *   name: string,
 *   summary: string,
 *   status: HealthStatus,
 *   isActive?: boolean,
 *   isIngesting?: boolean,
 *   tickerMessages?: string[],
 *   gcLogo?: string,
 *   partnerLogo?: string,
 *   thirdLogo?: string,
 *   onClick?: () => void
 * }} ProjectFolderProps
 */

/**
 * Project folder card component (dark theme variant)
 * @param {ProjectFolderProps} props
 */
export function ProjectFolder({
  name,
  summary,
  status,
  isActive = false,
  isIngesting = false,
  tickerMessages = [],
  onClick,
}) {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    if (tickerMessages.length > 0) {
      const interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % tickerMessages.length)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [tickerMessages.length])

  // Status indicator colors using Tailwind
  const statusDot = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  }

  const statusLabel = {
    green: "On Track",
    yellow: "At Risk",
    red: "Critical",
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full text-left transition-all duration-300 ease-out",
        isActive && "scale-[1.01] z-10"
      )}
    >
      {/* Folder Shape Container - extra top margin for raised tab */}
      <div className="relative mt-4">
        {/* Raised Left Tab - Project Name Label */}
        <div className="absolute -top-4 left-0 z-10">
          <div className="bg-folder-bg border border-folder-border border-b-0 rounded-t-md px-3 py-1.5 min-w-[140px]">
            <span className="text-[10px] font-mono text-foreground uppercase tracking-wider truncate block">
              {name}
            </span>
          </div>
        </div>

        {/* Main Folder Body */}
        <div
          className={cn(
            "relative overflow-hidden rounded-lg rounded-tl-none transition-all duration-300",
            "bg-folder-bg border border-folder-border",
            isActive && "border-border"
          )}
        >
          {/* Two-Column Layout */}
          <div className="flex min-h-[140px]">
            {/* Left Side - Summary/Status */}
            <div className="flex-1 p-4 flex flex-col">
              {/* Status Dot */}
              <div className="flex items-center gap-2 mb-3">
                <div className={cn("w-1.5 h-1.5 rounded-full", statusDot[status])} />
                <span className="text-[9px] font-mono text-muted-foreground uppercase">
                  {statusLabel[status]}
                </span>
              </div>

              {/* Written Summary */}
              <p className="text-[11px] text-muted-foreground leading-relaxed flex-1">
                {summary}
              </p>

              {/* Small Logos Row */}
              <div className="flex items-center gap-1.5 mt-3">
                <div className="w-4 h-4 rounded bg-surface-elevated flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-sm bg-border" />
                </div>
                <div className="w-4 h-4 rounded bg-surface-elevated flex items-center justify-center overflow-hidden">
                  <img
                    src="/images/favicon.png"
                    alt="Logo"
                    className="w-3 h-3 object-contain opacity-60"
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="w-px bg-folder-border" />

            {/* Right Side - Live Screen Panel (always dark) */}
            <div className="w-[140px] p-2 flex flex-col">
              <div className="flex-1 bg-surface-glass border border-folder-border rounded-md p-2 flex flex-col overflow-hidden">
                {/* Activity Indicator */}
                {isIngesting && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-1 h-1 rounded-full bg-green-500 animate-pulse" />
                    <div className="flex gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-0.5 bg-green-500/60 rounded animate-pulse"
                          style={{
                            height: `${4 + Math.random() * 4}px`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages Display */}
                <div className="flex-1 overflow-hidden">
                  {tickerMessages.length > 0 ? (
                    <p className="text-[9px] font-mono text-muted-foreground leading-relaxed animate-fade-in">
                      {tickerMessages[messageIndex]}
                    </p>
                  ) : (
                    <p className="text-[9px] font-mono text-muted-foreground/50">
                      No recent activity
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <div className="mt-auto pt-2">
                  <span className="text-[8px] font-mono text-muted-foreground/50">
                    {isIngesting ? "Just now" : "2h ago"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
