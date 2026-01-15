"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { downloadProposalPDF } from "@/lib/generate-proposal-pdf"

export function ProposalPDFDownload({ data, className }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    setIsGenerating(true)
    try {
      await downloadProposalPDF(data)
    } catch (error) {
      console.error("Failed to generate PDF:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:opacity-90 transition-colors disabled:opacity-50 ${className || ''}`}
      style={{ background: "#e53935" }}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">Generating...</span>
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Download PDF</span>
        </>
      )}
    </button>
  )
}
