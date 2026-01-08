"use client"

import { useState, useEffect } from "react"
import { X, ExternalLink, FileText, BarChart2, Users, Mail, File, FileSpreadsheet, Loader2 } from "lucide-react"
import { api } from "@/lib/api/client"

const TYPE_ICONS = {
  pdf: FileText,
  excel: FileSpreadsheet,
  chart: BarChart2,
  hubspot: Users,
  powerbi: BarChart2,
  email: Mail,
  document: File,
}

const TYPE_LABELS = {
  pdf: "PDF Document",
  excel: "Excel Spreadsheet",
  chart: "Chart",
  hubspot: "HubSpot Record",
  powerbi: "Power BI Report",
  email: "Email",
  document: "Document",
}

// Check if URL is an Excel file
const isExcelFile = (url) => {
  if (!url) return false
  const lowerUrl = url.toLowerCase()
  return lowerUrl.endsWith('.xlsx') || lowerUrl.endsWith('.xls') || lowerUrl.endsWith('.xlsm')
}

// Check if URL is a GCS URI that needs a signed URL
const isGcsUri = (url) => {
  if (!url) return false
  return url.startsWith('gs://') || url.includes('storage.googleapis.com') || url.includes('storage.cloud.google.com')
}

/**
 * SourceViewer - Side panel for viewing documents, PDFs, and other sources
 * Supports:
 * - PDF files via iframe (from GCS or other URLs)
 * - Excel files via Google Docs Viewer (with signed URLs)
 * - Text content preview
 * - Various document types
 */
export function SourceViewer({ item, onClose }) {
  const [signedUrl, setSignedUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Determine actual type - check if it's an Excel file
  const actualType = isExcelFile(item.url) ? 'excel' : item.type
  const Icon = TYPE_ICONS[actualType] || File
  const typeLabel = TYPE_LABELS[actualType] || "Document"

  // Check if we have a URL that can be embedded
  const hasEmbeddableUrl = item.url && (
    item.url.endsWith('.pdf') ||
    item.url.includes('storage.googleapis.com') ||
    item.url.includes('storage.cloud.google.com')
  )

  // Fetch signed URL for GCS files (Excel, etc.)
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!item.url) return

      // For Excel files from GCS, we need a signed URL
      if (isExcelFile(item.url) && isGcsUri(item.url)) {
        setLoading(true)
        setError(null)
        try {
          const response = await api.post('/documents/signed-url', {
            gcs_uri: item.url,
            expiration_minutes: 60
          })
          setSignedUrl(response.signed_url)
        } catch (err) {
          console.error('Failed to get signed URL:', err)
          setError('Failed to load document')
        } finally {
          setLoading(false)
        }
      }
    }

    fetchSignedUrl()
  }, [item.url])

  // Format timestamp safely
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
      return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })
    } catch {
      return ''
    }
  }

  return (
    <div className="w-full h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-medium text-foreground truncate">{item.label}</h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="px-1.5 py-0.5 rounded bg-muted">{typeLabel}</span>
              {item.source && <span>• {item.source}</span>}
              {item.timestamp && <span>• {formatTimestamp(item.timestamp)}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {/* Open in new tab button */}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            aria-label="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* PDF with embeddable URL - show in iframe */}
        {item.type === "pdf" && hasEmbeddableUrl && (
          <iframe
            src={item.url}
            className="w-full h-full border-0"
            title={item.label}
          />
        )}

        {/* PDF without URL or non-embeddable - show text content */}
        {item.type === "pdf" && !hasEmbeddableUrl && (
          <div className="h-full overflow-y-auto p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="bg-background/50 rounded-lg p-6 border border-border">
                <p className="text-sm text-muted-foreground mb-4">PDF Content Preview</p>
                <div className="text-foreground whitespace-pre-wrap">{item.content}</div>
              </div>
            </div>
          </div>
        )}

        {/* Excel files - use Google Docs Viewer with signed URL */}
        {actualType === "excel" && (
          <div className="h-full flex flex-col">
            {loading && (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Loading spreadsheet...</span>
              </div>
            )}

            {error && (
              <div className="flex-1 flex flex-col items-center justify-center p-6">
                <p className="text-destructive mb-4">{error}</p>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Open in new tab
                  </a>
                )}
              </div>
            )}

            {signedUrl && !loading && !error && (
              <div className="h-full flex flex-col">
                {/* Try Microsoft Office Online viewer */}
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`}
                  className="w-full flex-1 border-0"
                  title={item.label}
                />
                {/* Fallback download link */}
                <div className="p-3 border-t border-border bg-muted/50 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">If the viewer doesn't load:</span>
                  <a
                    href={signedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded transition-colors"
                  >
                    Download File
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chart data */}
        {item.type === "chart" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="bg-background/50 rounded-lg p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-4">Chart Data</p>
              <div className="text-foreground whitespace-pre-wrap">{item.content}</div>
            </div>
          </div>
        )}

        {/* HubSpot record */}
        {item.type === "hubspot" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="bg-background/50 rounded-lg p-6 border border-border">
              <p className="text-sm text-muted-foreground mb-4">HubSpot Record</p>
              <div className="text-foreground whitespace-pre-wrap">{item.content}</div>
            </div>
          </div>
        )}

        {/* Other document types (excluding Excel which is handled above) */}
        {["powerbi", "email", "document"].includes(actualType) && (
          <div className="h-full overflow-y-auto p-6">
            {/* If we have a URL that might be viewable */}
            {item.url && !hasEmbeddableUrl && (
              <div className="mb-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-sm text-muted-foreground mb-2">Document URL:</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {item.url}
                </a>
              </div>
            )}

            {/* Content preview */}
            {item.content && (
              <div className="bg-background/50 rounded-lg p-6 border border-border">
                <div className="text-foreground whitespace-pre-wrap">{item.content}</div>
              </div>
            )}

            {/* No content message */}
            {!item.content && !item.url && (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No preview available</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
