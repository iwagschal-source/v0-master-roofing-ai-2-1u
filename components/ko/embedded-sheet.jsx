"use client"

import { ExternalLink, FileSpreadsheet } from "lucide-react"

// Map tab names to Google Sheets GIDs (configure after sheet is created)
const DEFAULT_TAB_GIDS = {
  Setup: "0",
  Systems: "123456789",
  Pricing: "234567890",
  Descriptions: "345678901",
  Proposal: "456789012",
}

/**
 * EmbeddedSheet - Opens Google Sheet in new tab
 *
 * Note: Google Sheets blocks iframe embedding via CSP (frame-ancestors).
 * This component displays a prominent button to open the sheet in a new tab instead.
 */
export function EmbeddedSheet({
  sheetId,
  tab = "Systems",
  tabGids = DEFAULT_TAB_GIDS,
  height = 300,
  className = ""
}) {
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

  // Direct link for opening in new tab
  const directUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=${gid}`

  return (
    <div className={`w-full bg-card border border-border rounded-lg flex items-center justify-center ${className}`} style={{ height }}>
      <div className="text-center p-8">
        {/* Google Sheets Icon */}
        <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
          <FileSpreadsheet className="w-10 h-10 text-green-500" />
        </div>

        <h3 className="text-foreground font-medium mb-2">Takeoff Spreadsheet</h3>
        <p className="text-foreground-tertiary text-sm mb-6 max-w-sm">
          View and edit the takeoff data in Google Sheets. Changes sync automatically.
        </p>

        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <ExternalLink className="w-4 h-4" />
          Open in Google Sheets
        </a>

        <p className="text-foreground-tertiary text-xs mt-4">
          Opens in a new tab
        </p>
      </div>
    </div>
  )
}
