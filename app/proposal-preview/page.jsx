"use client"

import { useState, useEffect, Suspense } from "react"
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

  const [proposal, setProposal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (sheetId) {
      fetchProposalFromSheet(sheetId)
    } else {
      setProposal(SAMPLE_PROPOSAL)
    }
  }, [sheetId])

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
      <ProposalTemplate
        project={{ gc_name: proposal.gc_name, address: proposal.project_address }}
        proposal={proposal}
      />
    </div>
  )
}

export default function ProposalPreviewPage() {
  return (
    <div style={{ background: "#e5e5e5", minHeight: "100vh", padding: "20px 0" }}>
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
