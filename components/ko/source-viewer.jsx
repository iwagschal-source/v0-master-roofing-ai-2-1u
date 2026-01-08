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

// Check if URL is a PDF file
const isPdfFile = (url) => {
  if (!url) return false
  return url.toLowerCase().endsWith('.pdf')
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

  // Determine actual type based on URL extension (overrides item.type if detectable)
  const getActualType = () => {
    if (isExcelFile(item.url)) return 'excel'
    if (isPdfFile(item.url)) return 'pdf'
    return item.type || 'document'
  }
  const actualType = getActualType()
  const Icon = TYPE_ICONS[actualType] || File
  const typeLabel = TYPE_LABELS[actualType] || "Document"

  // Check if PDF can be embedded (GCS URLs work in iframes)
  const canEmbedPdf = actualType === 'pdf' && item.url && (
    item.url.includes('storage.googleapis.com') ||
    item.url.includes('storage.cloud.google.com') ||
    item.url.startsWith('https://')
  )

  // Fetch signed URL for GCS files (Excel, etc.)
  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!item.url) {
        console.log('[SourceViewer] No URL provided')
        return
      }

      // Use gcs_uri if available (original gs:// format), otherwise fall back to url
      const gcsUri = item.gcs_uri || item.url

      console.log('[SourceViewer] Item URL:', item.url)
      console.log('[SourceViewer] Item gcs_uri:', item.gcs_uri)
      console.log('[SourceViewer] Using GCS URI:', gcsUri)
      console.log('[SourceViewer] Actual type:', actualType)

      // For Excel files, get a signed URL
      if (actualType === 'excel' && gcsUri) {
        setLoading(true)
        setError(null)
        try {
          console.log('[SourceViewer] Fetching signed URL for Excel...')
          const response = await api.post('/documents/signed-url', {
            gcs_uri: gcsUri,
            expiration_minutes: 60
          })
          console.log('[SourceViewer] Got signed URL:', response.signed_url?.substring(0, 80) + '...')
          setSignedUrl(response.signed_url)
        } catch (err) {
          console.error('[SourceViewer] Failed to get signed URL:', err)
          setError('Failed to load document: ' + (err.message || 'Unknown error'))
          // Fall back to original URL
          setSignedUrl(item.url)
        } finally {
          setLoading(false)
        }
      }
    }

    fetchSignedUrl()
  }, [item.url, item.gcs_uri, actualType])

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
        {actualType === "pdf" && canEmbedPdf && (
          <iframe
            src={item.url}
            className="w-full h-full border-0"
            title={item.label}
          />
        )}

        {/* PDF without embeddable URL - show text content or link */}
        {actualType === "pdf" && !canEmbedPdf && (
          <div className="h-full overflow-y-auto p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="bg-background/50 rounded-lg p-6 border border-border">
                <p className="text-sm text-muted-foreground mb-4">PDF Content Preview</p>
                {item.content ? (
                  <div className="text-foreground whitespace-pre-wrap">{item.content}</div>
                ) : item.url ? (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Open PDF in new tab
                  </a>
                ) : (
                  <p className="text-muted-foreground">No preview available</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Excel files - show download option */}
        {actualType === "excel" && (
          <div className="h-full flex flex-col items-center justify-center p-8">
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
                {/* Use signed URL if available, otherwise use original URL */}
                <a
                  href={signedUrl || item.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  Download Excel File
                </a>
                {loading && (
                  <p className="text-xs text-muted-foreground">Preparing download link...</p>
                )}
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Other document types (excluding PDF and Excel which are handled above) */}
        {["powerbi", "email", "document", "chart", "hubspot"].includes(actualType) && actualType !== "pdf" && actualType !== "excel" && (
          <div className="h-full overflow-y-auto p-6">
            {/* If we have a URL */}
            {item.url && (
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
