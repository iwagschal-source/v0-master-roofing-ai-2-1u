"use client"

import { ProposalTemplate } from "@/components/ko/proposal-template"

// Sample data matching your PDF
const SAMPLE_PROJECT = {
  gc_name: "YBBY Construction",
  address: "912-916 Home St Brooklyn, NY 11238",
}

const SAMPLE_PROPOSAL = {
  created_at: "2025-10-27",
  date_of_drawings: "02/10/2025",
  addendum: "03",
  version: "V2",
  supersedes: "v2 Dated Oct 27 2025",
  project_summary: "This project involves the installation of new roofing, waterproofing, and EIFS systems at the existing two-story building with cellar and balconies. The scope includes a Firestone APP 160/180 built-up roofing system at main and bulkhead roofs, aluminum coping and counter-flashing at parapets, EIFS with air-vapor barrier across the rear and side elevations, and balcony waterproofing using the Alsan RS 289 textured finish. Recessed floor waterproofing at the cellar level is provided with the Soprema RS 230 PMMA system, and air-vapor barrier waterproofing is included beneath brick façade areas. All work is performed in accordance with manufacturer requirements and standard installation practices.",
  base_bid_items: [
    {
      name: "Built-Up Roofing – Firestone APP 160/180 System",
      specs: "R-33    6.5\"",
      amount: 42203,
      description: "Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads. Lead sheets installed and sealed at all drains. Assembly includes torch-applied Firestone APP160 smooth base ply and APP180 white granulated cap sheet with 3\" laps, with walls and curbs primed and flashed 12\" up using APP160/180 binder flashing. Door pans furnished and installed at openings."
    },
    {
      name: "ArchitecturalCopingSystem – AluminumCoping",
      specs: "R-20    4\"",
      amount: 7934,
      description: "Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications."
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
      description: "Prepare the recessed concrete slab by scarifying to achieve a clean, smooth surface, then apply a uniform coat of Soprema RS 276 primer. Install new flashings using Soprema RS 230 Flash grade PMMA resin with Alsan RS fleece reinforcement around all terminations and penetrations, followed by application of the field membrane consisting of Soprema RS 230 Flash grade PMMA with fleece. All work is performed in accordance with Soprema's installation guidelines to produce a seamless, cold liquid-applied waterproofing system."
    },
    {
      name: "Aluminum Flashing",
      specs: "",
      amount: 5794,
      description: "Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4\"."
    },
  ],
  alternates: [
    {
      name: "Balcony Waterproofing",
      specs: "",
      amount: 1965,
      description: "Balcony waterproofing includes application of Alsan RS 276 Primer, Alsan RS 230 flashing 12\" up walls, and Alsan RS 289 Textured Finish with color pack. Aluminum drip edge installed at perimeter terminations as required."
    },
    {
      name: "Tie-In",
      specs: "",
      amount: 3817,
      description: "Apply PMMA waterproofing membrane where the 1st floor meets the foundation."
    },
  ],
  clarifications: [
    "Containers for garbage must be provided by GC.",
    "All penetrations must be installed prior to installation of roofing system. Any penetrations installed afterwards will be an additional charge per pitch pocket.",
    "This APP 160/180 roofing system is designed and manufactured for waterproofing purposes only- not for any sort of human traffic. If roof will be used for traffic without the installation of protection boards or pavers, the warranty will not be effective.",
    "R value and thickness of insulation must be reviewed and approved by GC. Master Roofing doesn't take any responsibility for the R value requirements.",
    "This roofing system proposed is standard white only, ultra-white will be an upcharge.",
  ],
}

export default function ProposalPreviewPage() {
  return (
    <div style={{ background: "#e5e5e5", minHeight: "100vh", padding: "20px 0" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{
          background: "#fff",
          padding: "16px 24px",
          marginBottom: "20px",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "20px" }}>Proposal Template Preview</h1>
            <p style={{ margin: "4px 0 0", color: "#666", fontSize: "14px" }}>Sample data from your PDF</p>
          </div>
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

        <ProposalTemplate project={SAMPLE_PROJECT} proposal={SAMPLE_PROPOSAL} />
      </div>
    </div>
  )
}
