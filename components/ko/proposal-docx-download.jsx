"use client"

import { useState } from "react"
import { FileText, Loader2 } from "lucide-react"
import { downloadProposalDocx } from "@/lib/generate-proposal-docx"

export function ProposalDocxDownload({ data, className }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState(null)

  const handleDownload = async () => {
    setIsGenerating(true)
    setError(null)
    try {
      await downloadProposalDocx(data)
    } catch (err) {
      console.error("Failed to generate DOCX:", err)
      setError(err.message || "Failed to generate document")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={handleDownload}
        disabled={isGenerating}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:opacity-90 transition-colors disabled:opacity-50 ${className || ''}`}
        style={{ background: "#1976d2" }}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Generating...</span>
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">Download Word</span>
          </>
        )}
      </button>
      {error && (
        <span className="text-xs text-red-500 mt-1">{error}</span>
      )}
    </div>
  )
}
