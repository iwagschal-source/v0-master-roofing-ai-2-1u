"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Brain } from "lucide-react"

interface ReasoningIndicatorProps {
  reasoning?: string[]
  isActive: boolean
}

export function ReasoningIndicator({ reasoning = [], isActive }: ReasoningIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!reasoning.length && !isActive) return null

  const defaultReasoning = [
    "Analyzing Q3 report data...",
    "Calculating win rate metrics...",
    "Cross-referencing with historical data...",
  ]

  const displayReasoning = reasoning.length > 0 ? reasoning : defaultReasoning

  return (
    <div className="mt-2 rounded-lg border border-border bg-card/50">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-foreground">Reasoning</span>
          {isActive && <span className="text-xs text-muted-foreground animate-pulse">Processing...</span>}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        )}
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-1.5 border-t border-border pt-2 mt-1">
          {displayReasoning.map((step, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
