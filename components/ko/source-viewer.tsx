"use client"

import { X } from "lucide-react"
import type { HistoryItem } from "@/types/history"

interface SourceViewerProps {
  item: HistoryItem
  onClose: () => void
}

export function SourceViewer({ item, onClose }: SourceViewerProps) {
  return (
    <div className="w-full h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-medium text-foreground truncate">{item.label}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {item.source} • {item.timestamp.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <button
          onClick={onClose}
          className="ml-4 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close viewer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {item.type === "pdf" && (
          <div className="prose prose-invert max-w-none">
            <div className="bg-background/50 rounded-lg p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-4">PDF Content Preview</p>
              <div className="text-foreground whitespace-pre-wrap">{item.content}</div>
            </div>
          </div>
        )}

        {item.type === "chart" && (
          <div className="bg-background/50 rounded-lg p-6 border border-border">
            <p className="text-sm text-muted-foreground mb-4">Chart Data</p>
            <div className="text-foreground">{item.content}</div>
          </div>
        )}

        {item.type === "hubspot" && (
          <div className="bg-background/50 rounded-lg p-6 border border-border">
            <p className="text-sm text-muted-foreground mb-4">HubSpot Record</p>
            <div className="text-foreground">{item.content}</div>
          </div>
        )}

        {["powerbi", "email", "document"].includes(item.type) && (
          <div className="bg-background/50 rounded-lg p-6 border border-border">
            <div className="text-foreground whitespace-pre-wrap">{item.content}</div>
          </div>
        )}
      </div>
    </div>
  )
}
