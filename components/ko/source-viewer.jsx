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
      if (!item.url) {
        console.log('[SourceViewer] No URL provided')
        return
      }

      console.log('[SourceViewer] Item URL:', item.url)
      console.log('[SourceViewer] Is Excel:', isExcelFile(item.url))
      console.log('[SourceViewer] Is GCS:', isGcsUri(item.url))
      console.log('[SourceViewer] Actual type:', actualType)

      // For Excel files, try to get a signed URL if it's a GCS URI
      if (actualType === 'excel') {
        setLoading(true)
        setError(null)
        try {
          // If it's already a signed URL or HTTP URL, use it directly
          if (item.url.startsWith('https://') && !isGcsUri(item.url)) {
            console.log('[SourceViewer] Using direct URL')
            setSignedUrl(item.url)
          } else {
            // Otherwise, get a signed URL from the backend
            console.log('[SourceViewer] Fetching signed URL from backend...')
            const response = await api.post('/documents/signed-url', {
              gcs_uri: item.url,
              expiration_minutes: 60
            })
            console.log('[SourceViewer] Got signed URL:', response.signed_url?.substring(0, 50) + '...')
            setSignedUrl(response.signed_url)
          }
        } catch (err) {
          console.error('[SourceViewer] Failed to get signed URL:', err)
          setError('Failed to load document: ' + (err.message || 'Unknown error'))
        } finally {
          setLoading(false)
        }
      }
    }

    fetchSignedUrl()
  }, [item.url, actualType])

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

        {/* Excel files - show download option */}
        {actualType === "excel" && (
          <div className="h-full flex flex-col items-center justify-center p-8">
            {loading && (
              <div className="flex items-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Preparing download...</span>
              </div>
            )}

            {error && (
              <div className="text-center">
                <p className="text-destructive mb-4">{error}</p>
              </div>
            )}

            {signedUrl && !loading && !error && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-green-500/10 rounded-2xl flex items-center justify-center">
                  <FileSpreadsheet className="w-10 h-10 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-2">{item.label}</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Excel files open best in Microsoft Excel or Google Sheets
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <a
                    href={signedUrl}
                    download
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    Download Excel File
                  </a>
                  <a
                    href={`https://docs.google.com/spreadsheets/d/create?usp=sharing`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    Or open Google Sheets to import
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
