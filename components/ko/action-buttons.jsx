"use client"

import { useState, useRef } from "react"
import { Upload, FileText, Download, Loader2, CheckCircle, AlertCircle } from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://136.111.252.120:8000"

export function ActionButtons({ projectId, sheetId, projectName, onPreviewProposal }) {
  const [loadingAction, setLoadingAction] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [takeoffItems, setTakeoffItems] = useState(null)
  const fileInputRef = useRef(null)

  const handleUploadBluebeam = () => {
    // Trigger hidden file input
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setUploadResult({ success: false, error: "Please select a CSV file" })
      return
    }

    setLoadingAction("upload")
    setUploadResult(null)

    try {
      // Read file content
      const csvContent = await file.text()

      // Try local API first (more reliable), then fallback to backend
      let result
      try {
        const localResponse = await fetch("/api/ko/bluebeam/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csv_content: csvContent,
            project_name: projectName || file.name.replace('.csv', ''),
          }),
        })
        if (localResponse.ok) {
          result = await localResponse.json()
        }
      } catch (e) {
        console.log("Local API unavailable, trying backend...")
      }

      // Fallback to backend if local failed
      if (!result?.success) {
        const response = await fetch(`${BACKEND_URL}/v1/bluebeam/convert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            csv_content: csvContent,
            project_name: projectName || file.name.replace('.csv', ''),
          }),
        })

        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`)
        }

        result = await response.json()
      }

      if (result.success) {
        // Store items for proposal generation
        setTakeoffItems(result.items || [])

        setUploadResult({
          success: true,
          summary: result.summary,
          templateData: result.template_data,
          items: result.items,
        })

        // If we have a sheet connected, populate it
        if (sheetId && result.template_data) {
          await populateGoogleSheet(sheetId, result.template_data)
        }
      } else {
        throw new Error(result.error || "Conversion failed")
      }
    } catch (error) {
      console.error("Bluebeam upload error:", error)
      setUploadResult({ success: false, error: error.message })
    } finally {
      setLoadingAction(null)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const populateGoogleSheet = async (sheetId, templateData) => {
    try {
      const response = await fetch("/api/ko/populate-takeoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetId, templateData }),
      })

      if (!response.ok) {
        console.warn("Failed to populate sheet, but conversion succeeded")
      }
    } catch (error) {
      console.warn("Sheet population error:", error)
    }
  }

  const handlePreviewProposal = () => {
    if (onPreviewProposal) {
      // Pass takeoff items for proposal generation
      onPreviewProposal(projectId, takeoffItems)
    }
  }

  const handleExportPDF = async () => {
    if (!sheetId) {
      alert("No Google Sheet connected to this project")
      return
    }

    setLoadingAction("export")
    try {
      const response = await fetch("/api/ko/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, sheetId }),
      })

      if (!response.ok) {
        throw new Error("Failed to export PDF")
      }

      const result = await response.json()
      if (result.pdfUrl) {
        window.open(result.pdfUrl, "_blank")
      } else {
        throw new Error(result.error || "Export failed")
      }
    } catch (error) {
      console.error("Export PDF error:", error)
      alert("Error: " + error.message)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />

        {/* Upload Bluebeam */}
        <button
          onClick={handleUploadBluebeam}
          disabled={loadingAction === "upload"}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loadingAction === "upload" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          {loadingAction === "upload" ? "Converting..." : "Upload Bluebeam"}
        </button>

        {/* Preview Proposal */}
        <button
          onClick={handlePreviewProposal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors text-sm font-medium"
        >
          <FileText className="w-4 h-4" />
          Preview Proposal
        </button>

        {/* Export PDF */}
        <button
          onClick={handleExportPDF}
          disabled={loadingAction === "export" || !sheetId}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {loadingAction === "export" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {loadingAction === "export" ? "Exporting..." : "Export PDF"}
        </button>
      </div>

      {/* Upload Result Feedback */}
      {uploadResult && (
        <div
          className={`flex items-start gap-3 p-3 rounded-lg ${
            uploadResult.success
              ? "bg-green-500/10 border border-green-500/20"
              : "bg-red-500/10 border border-red-500/20"
          }`}
        >
          {uploadResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            {uploadResult.success ? (
              <>
                <p className="text-sm font-medium text-green-600">
                  Bluebeam converted successfully!
                </p>
                {uploadResult.summary && (
                  <p className="text-xs text-foreground-secondary mt-1">
                    {uploadResult.summary.total_measurements} measurements, {uploadResult.summary.scope_items} scope items
                    {uploadResult.summary.total_cost > 0 && (
                      <> — ${uploadResult.summary.total_cost.toLocaleString()} estimated</>
                    )}
                  </p>
                )}
                {!sheetId && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Connect a Google Sheet to auto-populate the takeoff template
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-red-600">{uploadResult.error}</p>
            )}
          </div>
          <button
            onClick={() => setUploadResult(null)}
            className="text-foreground-tertiary hover:text-foreground p-1"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}
