"use client"

import { useState } from "react"
import { Zap, FileText, Download, Loader2 } from "lucide-react"

export function ActionButtons({ projectId, sheetId, onPreviewProposal }) {
  const [loadingAction, setLoadingAction] = useState(null)

  const handleGenerateDescriptions = async () => {
    if (!sheetId) {
      alert("No Google Sheet connected to this project")
      return
    }

    setLoadingAction("generate")
    try {
      const response = await fetch("/api/ko/generate-descriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, sheetId }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate descriptions")
      }

      const result = await response.json()
      if (result.success) {
        alert("Descriptions generated successfully! Check the Descriptions tab.")
      } else {
        throw new Error(result.error || "Generation failed")
      }
    } catch (error) {
      console.error("Generate descriptions error:", error)
      alert("Error: " + error.message)
    } finally {
      setLoadingAction(null)
    }
  }

  const handlePreviewProposal = () => {
    if (onPreviewProposal) {
      onPreviewProposal(projectId)
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
    <div className="flex flex-wrap gap-3">
      {/* Generate Descriptions */}
      <button
        onClick={handleGenerateDescriptions}
        disabled={loadingAction === "generate" || !sheetId}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        {loadingAction === "generate" ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        {loadingAction === "generate" ? "Generating..." : "Generate Descriptions"}
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
  )
}
