"use client"

import { KOGlyph } from "./ko-glyph"
import { SourceViewer } from "./source-viewer"
import type { HistoryItem } from "@/types/history"

interface KOStageProps {
  activeMode: string
  selectedHistoryItem?: HistoryItem
  onCloseViewer?: () => void
}

export function KOStage({ activeMode, selectedHistoryItem, onCloseViewer }: KOStageProps) {
  if (selectedHistoryItem && onCloseViewer) {
    return <SourceViewer item={selectedHistoryItem} onClose={onCloseViewer} />
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-4 border-b border-border bg-card">
      {activeMode === "home" && (
        <div className="flex flex-col items-center gap-8">
          <KOGlyph size="large" state="idle" />
          <div className="text-center">
            <h1 className="text-3xl font-light tracking-tight text-foreground">KO – Chief Agent Officer</h1>
            <p className="text-sm text-muted-foreground mt-2">Your conversational AI assistant</p>
          </div>
        </div>
      )}

      {activeMode === "history" && !selectedHistoryItem && (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Select a history item to view its content</p>
        </div>
      )}

      {activeMode === "powerbi" && (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-muted-foreground">Power BI Dashboard</p>
        </div>
      )}

      {activeMode === "hubspot" && (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-muted-foreground">HubSpot CRM</p>
        </div>
      )}

      {activeMode === "messages" && (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-muted-foreground">Messages (Design Only)</p>
        </div>
      )}

      {activeMode === "email" && (
        <div className="w-full h-full flex items-center justify-center">
          <p className="text-muted-foreground">Email view</p>
        </div>
      )}
    </div>
  )
}
