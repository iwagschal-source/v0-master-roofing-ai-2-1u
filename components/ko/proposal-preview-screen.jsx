"use client"

import { useState } from "react"
import { ArrowLeft, Download, Mail, ExternalLink, ChevronLeft, ChevronRight, Loader2 } from "lucide-react"

// Mock proposal data for MVP
const MOCK_PROPOSAL = {
  version: "V1",
  created_at: new Date().toISOString(),
  sections: [
    {
      title: "PROJECT SUMMARY",
      content: "This project involves the installation of new roofing and exterior cladding systems for the building located at the specified address. Our scope includes complete removal of existing roofing materials, installation of new waterproofing membranes, and application of specified insulation systems."
    },
    {
      title: "BASE BID",
      items: [
        {
          name: 'Firestone APP160/180 6" R-33',
          amount: 66403,
          description: "Built-up modified-bitumen roof system including: removal of existing roofing to deck, installation of vapor barrier, 6-inch polyiso insulation in two layers with staggered joints, Firestone APP 160/180 base and cap sheet membrane system, and all associated flashings and terminations."
        },
        {
          name: 'EIFS System 2" R-7.5',
          amount: 169720,
          description: "Multi-layer Exterior Insulation and Finish System (EIFS) including: preparation of existing substrate, installation of 2-inch EPS insulation boards, reinforcing mesh embedded in base coat, and textured finish coat in owner-selected color."
        },
        {
          name: "Metal Coping & Flashings",
          amount: 45186,
          description: "Pre-finished aluminum coping and flashings at all roof edges, penetrations, and transitions. Includes snap-on coping system with concealed fasteners and sealed joints."
        },
        {
          name: "Sheet Metal Parapet Walls",
          amount: 19000,
          description: "Sheet metal parapet wall covering with pre-finished aluminum panels, including backing material and all necessary supports and fasteners."
        }
      ]
    },
    {
      title: "ALTERNATES",
      items: [
        {
          name: "Alt #1: TPO in lieu of APP",
          amount: -8500,
          description: "Deduct alternate for 60-mil TPO single-ply membrane in lieu of APP modified bitumen system."
        },
        {
          name: "Alt #2: Additional Insulation",
          amount: 12400,
          description: "Add alternate for additional 2-inch layer of polyiso insulation to achieve R-46 total assembly."
        }
      ]
    }
  ],
  total_base_bid: 300309,
  terms: [
    "Payment terms: Net 30 from invoice date",
    "Proposal valid for 30 days",
    "Pricing based on normal working hours (7am-4pm, Mon-Fri)",
    "Excludes permits unless specifically noted",
    "Subject to verification of existing conditions"
  ]
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return "$0"
  const prefix = amount < 0 ? "-" : ""
  return `${prefix}$${Math.abs(amount).toLocaleString()}`
}

function formatDate(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function ProposalPreviewScreen({ project, onBack }) {
  const [currentPage, setCurrentPage] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const totalPages = 3 // Mock for now

  const handleDownloadPDF = async () => {
    setIsExporting(true)
    try {
      // In production, call API to generate PDF
      await new Promise(resolve => setTimeout(resolve, 1500))
      alert("PDF download would start here")
    } catch (error) {
      alert("Error exporting PDF: " + error.message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleEmailGC = async () => {
    setIsSendingEmail(true)
    try {
      // In production, open email composer or send via API
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert("Email composer would open here")
    } catch (error) {
      alert("Error: " + error.message)
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleHubSpotQuote = () => {
    // In production, create HubSpot quote
    alert("This would create a quote in HubSpot")
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-foreground-secondary">No project selected</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-foreground-secondary hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Proposal Preview</h1>
              <p className="text-foreground-secondary text-sm">
                {project.name} | {MOCK_PROPOSAL.version}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="text-sm font-medium hidden sm:inline">Download PDF</span>
            </button>

            <button
              onClick={handleEmailGC}
              disabled={isSendingEmail}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              {isSendingEmail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mail className="w-4 h-4" />
              )}
              <span className="text-sm font-medium hidden sm:inline">Email GC</span>
            </button>

            <button
              onClick={handleHubSpotQuote}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">HubSpot Quote</span>
            </button>
          </div>
        </div>
      </div>

      {/* Proposal Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          {/* Proposal Document */}
          <div className="bg-white rounded-lg shadow-lg border border-border overflow-hidden">
            {/* Proposal Header */}
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-start justify-between mb-6">
                {/* Logo Placeholder */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">MR</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">MASTER ROOFING & SIDING</h2>
                    <p className="text-gray-600 text-sm">Professional Roofing Contractors</p>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>{formatDate(MOCK_PROPOSAL.created_at)}</p>
                </div>
              </div>

              <div className="text-center py-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Proposal</h1>
                <div className="w-24 h-1 bg-primary mx-auto" />
              </div>

              <div className="grid grid-cols-2 gap-8 mt-6">
                <div>
                  <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">Prepared For</p>
                  <p className="text-gray-900 font-medium">{project.gc_name}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm uppercase tracking-wider mb-1">Project</p>
                  <p className="text-gray-900 font-medium">{project.name || project.address}</p>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="p-8 space-y-8">
              {MOCK_PROPOSAL.sections.map((section, idx) => (
                <div key={idx}>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    {section.title}
                  </h3>

                  {section.content && (
                    <p className="text-gray-700 leading-relaxed">{section.content}</p>
                  )}

                  {section.items && (
                    <div className="space-y-4">
                      {section.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">{item.name}</span>
                              <span className={`font-bold tabular-nums ${item.amount < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                {formatCurrency(item.amount)}
                              </span>
                            </div>
                            <p className="text-gray-600 text-sm">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Total */}
              <div className="pt-6 border-t-2 border-gray-900">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-gray-900">TOTAL BASE BID:</span>
                  <span className="text-2xl font-bold text-primary tabular-nums">
                    {formatCurrency(MOCK_PROPOSAL.total_base_bid)}
                  </span>
                </div>
              </div>

              {/* Terms */}
              <div className="pt-6 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                  Terms & Conditions
                </h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {MOCK_PROPOSAL.terms.map((term, idx) => (
                    <li key={idx}>• {term}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Pagination */}
      <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-center gap-4">
        <button
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5 text-foreground-secondary" />
        </button>

        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                currentPage === page
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-secondary text-foreground-secondary"
              }`}
            >
              {page}
            </button>
          ))}
        </div>

        <button
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5 text-foreground-secondary" />
        </button>

        <span className="text-sm text-foreground-tertiary ml-4">
          Page {currentPage} of {totalPages}
        </span>
      </div>
    </div>
  )
}
