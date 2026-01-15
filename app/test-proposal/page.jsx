"use client"

import { ProposalTemplate } from "@/components/ko/proposal-template"

// 1086 Dumont Ave - Converted to new template format
const proposal = {
  gc_name: "MJH Construction & Development",
  project_address: "1086 Dumont Ave, Brooklyn, NY 11208",
  date: "2025-06-25",
  date_of_drawings: "06/25/2025",
  addendum: "01",
  version: "V1",
  supersedes: "v0",
  project_summary: "This project involves the installation of new roofing and EIFS systems at 1086 Dumont Ave. The scope includes a Firestone APP 160/180 built-up roofing system at main roof and stair bulkhead with aluminum gutters and leaders for drainage. Aluminum coping is installed at all parapets with insulation underneath, and two-piece aluminum counter flashing/stucco receiver at wall terminations. EIFS with air-vapor barrier is applied across the north, south, east, and west elevations including the bulkhead, with both 3\" and 4\" EPS insulation at various locations. Foundation tie-in waterproofing is provided where the 1st floor meets the foundation at all elevations. All work is performed in accordance with manufacturer requirements and standard installation practices.",
  base_bid_items: [
    {
      name: "Built-Up Roofing",
      specs: "Firestone APP 160/180 System",
      amount: 95298,
      description: "Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads. Lead sheets installed and sealed at all drains. Assembly includes torch-applied Firestone APP160 smooth base ply and APP180 white granulated cap sheet with 3\" laps, with walls and curbs primed and flashed 12\" up using APP160/180 binder flashing. Door pans furnished and installed at openings."
    },
    {
      name: "Doorpans",
      specs: "Standard",
      amount: 2200,
      description: "Furnish and install standard door pans at door openings, fully waterproofed and sealed."
    },
    {
      name: "Aluminum Coping System",
      specs: "",
      amount: 14760,
      description: "Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications."
    },
    {
      name: "Aluminum Counter Flashing",
      specs: "Stucco Receiver",
      amount: 10800,
      description: "Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4\"."
    },
    {
      name: "Exterior Insulation and Finish System (EIFS)",
      specs: "",
      amount: 250788,
      description: "Scope includes priming and waterproofing window heads, jambs, and sills with air and vapor barrier, sealing all joints with mesh tape. Apply continuous air and moisture barrier, followed by 3\" EIFS EPS insulation (R-11.4), base coat with mesh, and finish coat. Caulk and seal all window and door perimeters."
    },
    {
      name: "Tie-In",
      specs: "PMMA",
      amount: 9225,
      description: "Apply PMMA waterproofing membrane where the 1st floor meets the foundation."
    }
  ],
  alternates: [
    {
      name: "Temporary Waterproofing System",
      specs: "Firestone",
      amount: 36223,
      description: "Install vapor barrier or temporary waterproofing membrane as specified. Apply TRI-BUILT Quick Dry Asphalt Primer and Firestone APP160 smooth surfaced modified bitumen membrane, torch applied on top of primer."
    }
  ],
  clarifications: [
    "Containers for garbage must be provided by GC.",
    "All work permits necessary to complete this job must be provided by GC.",
    "All AC curbs must be framed out by framer prior to Roofing installation.",
    "Fence leggings must be installed prior to installing the roofing system.",
    "All wood blocking around parapet walls must be done by framer.",
    "All penetrations must be installed prior to installation of roofing system. Any penetrations installed afterwards will be an additional charge per pitch pocket.",
    "R value and thickness of insulation must be reviewed and approved by GC. Master Roofing doesn't take any responsibility for the R value requirements.",
    "This APP 160/180 roofing system is designed and manufactured for waterproofing purposes only – not for any sort of human traffic. If roof will be used for traffic without the installation of protection boards or pavers, the warranty will not be effective.",
    "This roofing system proposed is standard white only, ultra-white will be an upcharge.",
    "Any scaffolding, bridging, forklift, hoisting, boom or cranes needed to complete the job must be provided by GC.",
    "Master Roofing is not and cannot be held responsible for any incidents/accidents/injuries or any damages caused by a third party or anything or anyone that's not employed by Master Roofing.",
    "Sale tax will be added to the invoices pertaining to this proposal unless a signed capital improvement document is submitted."
  ]
}

export default function TestProposalPage() {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Print button - hidden when printing */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-lg font-bold">1086 Dumont Ave - Proposal Preview</h1>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
          >
            Print / Save PDF
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
          >
            Back
          </a>
        </div>
      </div>

      {/* Proposal Preview */}
      <div className="py-8 print:py-0">
        <ProposalTemplate proposal={proposal} />
      </div>

      <style jsx global>{`
        @media print {
          body { margin: 0; padding: 0; }
          .print\\:hidden { display: none !important; }
          .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
        }
      `}</style>
    </div>
  )
}
