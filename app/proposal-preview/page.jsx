"use client"

import { useState, useEffect, Suspense, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { ProposalTemplate } from "@/components/ko/proposal-template"

// Sample data for demo (used when no sheetId provided)
const SAMPLE_PROPOSAL = {
  gc_name: "YBBY Construction",
  project_address: "912-916 Home St Brooklyn, NY 11238",
  created_at: "2025-10-27",
  date_of_drawings: "02/10/2025",
  addendum: "03",
  version: "V2",
  supersedes: "v2 Dated Oct 27 2025",
  project_summary: "This project involves the installation of new roofing, waterproofing, and EIFS systems at the existing two-story building with cellar and balconies. The scope includes a Firestone APP 160/180 built-up roofing system at main and bulkhead roofs, aluminum coping and counter-flashing at parapets, EIFS with air-vapor barrier across the rear and side elevations, and balcony waterproofing using the Alsan RS 289 textured finish.",
  base_bid_items: [
    {
      name: "Built-Up Roofing – Firestone APP 160/180 System",
      specs: "R-33    6.5\"",
      amount: 42203,
      description: "Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads."
    },
    {
      name: "ArchitecturalCopingSystem – AluminumCoping",
      specs: "R-20    4\"",
      amount: 7934,
      description: "Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates."
    },
    {
      name: "Aluminum Flashing",
      specs: "",
      amount: 5794,
      description: "Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4\"."
    },
    {
      name: "Tie-In",
      specs: "",
      amount: 3817,
      description: "Apply PMMA waterproofing membrane where the 1st floor meets the foundation."
    },
    {
      name: "Recessed Floor Waterproofing",
      specs: "",
      amount: 15115,
      description: "Prepare the recessed concrete slab by scarifying to achieve a clean, smooth surface, then apply a uniform coat of Soprema RS 276 primer."
    },
  ],
  alternates: [
    {
      name: "Balcony Waterproofing",
      specs: "",
      amount: 1965,
      description: "Balcony waterproofing includes application of Alsan RS 276 Primer, Alsan RS 230 flashing 12\" up walls."
    },
    {
      name: "Tie-In",
      specs: "",
      amount: 3817,
      description: "Apply PMMA waterproofing membrane where the 1st floor meets the foundation."
    },
  ],
}

function ProposalPreviewContent() {
  const searchParams = useSearchParams()
  const sheetId = searchParams.get("sheetId")
  const projectId = searchParams.get("projectId")
  const gcName = searchParams.get("gcName")
  const projectName = searchParams.get("projectName")

  const [proposal, setProposal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const docRef = useRef(null)

  useEffect(() => {
    if (sheetId) {
      fetchProposalFromSheet(sheetId)
    } else if (projectId || (gcName && projectName)) {
      fetchProposalFromProject(projectId, gcName, projectName)
    } else {
      setProposal(SAMPLE_PROPOSAL)
    }
  }, [sheetId, projectId, gcName, projectName])

  async function fetchProposalFromProject(id, gc, project) {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (id) params.append("projectId", id)
      if (gc) params.append("gcName", gc)
      if (project) params.append("projectName", project)

      const res = await fetch(`/api/ko/proposal/generate?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate proposal")
      }

      setProposal(data.proposal)
    } catch (err) {
      console.error("Error generating proposal:", err)
      setError(err.message)
      // Use sample with overrides
      setProposal({
        ...SAMPLE_PROPOSAL,
        gc_name: gc || SAMPLE_PROPOSAL.gc_name,
        project_address: project || SAMPLE_PROPOSAL.project_address,
      })
    } finally {
      setLoading(false)
    }
  }

  async function fetchProposalFromSheet(id) {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ko/proposal/${id}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch proposal")
      }

      setProposal(data.proposal)
    } catch (err) {
      console.error("Error fetching proposal:", err)
      setError(err.message)
      setProposal(SAMPLE_PROPOSAL)
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadPDF() {
    setDownloading(true)
    try {
      // Dynamic import of html2pdf
      const html2pdf = (await import("html2pdf.js")).default
      const element = docRef.current
      if (!element) throw new Error("Document not found")

      const filename = `Proposal_${proposal?.gc_name || "Master_Roofing"}_${new Date().toISOString().split("T")[0]}.pdf`

      const opt = {
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: "px", format: [816, 1056], orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], before: ".pv-page" }
      }

      await html2pdf().set(opt).from(element).save()
    } catch (err) {
      console.error("PDF download error:", err)
      // Fallback to print dialog
      window.print()
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center", paddingTop: "100px" }}>
        <div style={{ fontSize: "18px", color: "#666" }}>Loading proposal from Google Sheet...</div>
      </div>
    )
  }

  if (!proposal) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center", paddingTop: "100px" }}>
        <div style={{ fontSize: "18px", color: "#666" }}>No proposal data available</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        background: "#fff",
        padding: "16px 24px",
        marginBottom: "20px",
        borderRadius: "8px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "12px"
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px" }}>Proposal Preview</h1>
          <p style={{ margin: "4px 0 0", color: "#666", fontSize: "14px" }}>
            {sheetId ? `Sheet: ${sheetId.substring(0, 20)}...` : "Sample Data (Demo)"}
          </p>
          {error && (
            <p style={{ margin: "4px 0 0", color: "#e53935", fontSize: "12px" }}>
              Error: {error} (showing sample data)
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {!sheetId && (
            <div style={{ fontSize: "12px", color: "#888", marginRight: "10px" }}>
              Add ?sheetId=YOUR_SHEET_ID to URL
            </div>
          )}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading}
            style={{
              padding: "8px 16px",
              background: "#e53935",
              color: "#fff",
              borderRadius: "4px",
              border: "none",
              fontSize: "14px",
              fontWeight: "600",
              cursor: downloading ? "wait" : "pointer",
              opacity: downloading ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {downloading ? (
              <>
                <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                Generating...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download PDF
              </>
            )}
          </button>
          <a
            href="/"
            style={{
              padding: "8px 16px",
              background: "#1a1a1a",
              color: "#fff",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "14px"
            }}
          >
            Back to App
          </a>
        </div>
      </div>

      {/* Proposal Template */}
      <div ref={docRef}>
        <ProposalTemplate
          project={{ gc_name: proposal.gc_name, address: proposal.project_address }}
          proposal={proposal}
        />
      </div>
    </div>
  )
}

export default function ProposalPreviewPage() {
  return (
    <div style={{ background: "#e5e5e5", minHeight: "100vh", padding: "20px 0" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <Suspense fallback={
        <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center", paddingTop: "100px" }}>
          <div style={{ fontSize: "18px", color: "#666" }}>Loading...</div>
        </div>
      }>
        <ProposalPreviewContent />
      </Suspense>
    </div>
  )
}
