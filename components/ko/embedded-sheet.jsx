"use client"

import { useState } from "react"
import { Loader2, ExternalLink, RefreshCw } from "lucide-react"

// Map tab names to Google Sheets GIDs (configure after sheet is created)
const DEFAULT_TAB_GIDS = {
  Setup: "0",
  Systems: "123456789",
  Pricing: "234567890",
  Descriptions: "345678901",
  Proposal: "456789012",
}

export function EmbeddedSheet({
  sheetId,
  tab = "Systems",
  tabGids = DEFAULT_TAB_GIDS,
  height = 500,
  className = ""
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  if (!sheetId) {
    return (
      <div className={`w-full bg-card border border-border rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-foreground-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10,9 9,9 8,9" />
            </svg>
          </div>
          <h3 className="text-foreground font-medium mb-1">No Sheet Connected</h3>
          <p className="text-foreground-tertiary text-sm">
            Connect a Google Sheet to view estimate data
          </p>
        </div>
      </div>
    )
  }

  // Get the GID for the selected tab
  const gid = tabGids[tab] || "0"

  // Construct the embed URL
  // Options: embedded=true, rm=minimal (removes chrome), widget=true
  const embedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit?usp=sharing&embedded=true&rm=minimal&gid=${gid}`

  // Direct link for opening in new tab
  const directUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}`

  const handleLoad = () => {
    setIsLoading(false)
    setHasError(false)
  }

  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setHasError(false)
    // Force iframe refresh by updating key
    const iframe = document.querySelector(`iframe[data-sheet-id="${sheetId}"]`)
    if (iframe) {
      iframe.src = iframe.src
    }
  }

  return (
    <div className={`w-full bg-card border border-border rounded-lg overflow-hidden relative ${className}`} style={{ height }}>
      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 bg-card flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-foreground-secondary" />
            <span className="text-foreground-tertiary text-sm">Loading spreadsheet...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 bg-card flex items-center justify-center z-10">
          <div className="text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h3 className="text-foreground font-medium mb-1">Failed to Load Sheet</h3>
            <p className="text-foreground-tertiary text-sm mb-4">
              The spreadsheet could not be loaded. Check permissions.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground-secondary hover:text-foreground transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
              <a
                href={directUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Sheets
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
        <button
          onClick={handleRefresh}
          className="p-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border/50 text-foreground-secondary hover:text-foreground transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg bg-card/80 backdrop-blur-sm border border-border/50 text-foreground-secondary hover:text-foreground transition-colors"
          title="Open in Google Sheets"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Iframe */}
      <iframe
        data-sheet-id={sheetId}
        src={embedUrl}
        className="w-full h-full border-0"
        onLoad={handleLoad}
        onError={handleError}
        allow="clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  )
}
