"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { ArrowLeft, Download, Mail, ExternalLink, Loader2, ZoomIn, ZoomOut } from "lucide-react"
import { ProposalTemplate } from "./proposal-template"
import { createProposalFromTakeoff } from "@/lib/proposal-utils"
import { downloadProposalPDF } from "@/lib/generate-proposal-pdf"

// Brand colors matching HubSpot template
const BRAND = {
  red: "#e43c2e",
  ink: "#0e0f10",
  gray50: "#fafbfc",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray500: "#6b7280",
}

// Payment terms
const PAYMENT_TERMS = [
  { percent: 35, description: "upon contract execution" },
  { percent: 35, description: "upon reaching approximately 50% completion" },
  { percent: 25, description: "upon reaching approximately 85% completion" },
  { percent: 5, description: "upon project completion and acceptance" },
]

// Default clarifications
const DEFAULT_CLARIFICATIONS = [
  "Containers for garbage must be provided by GC.",
  "All penetrations must be installed prior to installation of roofing system. Any penetrations installed afterwards will be an additional charge per pitch pocket.",
  "This APP 160/180 roofing system is designed and manufactured for waterproofing purposes only – not for any sort of human traffic. If roof will be used for traffic without the installation of protection boards or pavers, the warranty will not be effective.",
  "R value and thickness of insulation must be reviewed and approved by GC. Master Roofing doesn't take any responsibility for the R value requirements.",
  "This roofing system proposed is standard white only; ultra-white will be an upcharge.",
]

// Mock data for MVP (will be replaced with Google Sheets data)
const MOCK_PROPOSAL = {
  version: "V1",
  created_at: new Date().toISOString(),
  date_of_drawings: "02/10/2025",
  addendum: "1",
  project_summary: "This project involves the installation of new roofing and exterior cladding systems for the building located at the specified address. Our scope includes complete removal of existing roofing materials, installation of new waterproofing membranes, and application of specified insulation systems.",
  base_bid_items: [
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
  ],
  alternates: [
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
  ],
  clarifications: DEFAULT_CLARIFICATIONS,
  exclusions: [],
}

function formatCurrency(amount) {
  if (amount === undefined || amount === null) return "$0"
  const prefix = amount < 0 ? "(" : ""
  const suffix = amount < 0 ? ")" : ""
  return `${prefix}$${Math.abs(amount).toLocaleString()}${suffix}`
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

function formatShortDate(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  })
}

// ============ PAGE COMPONENTS ============

// Cover Page
function CoverPage({ project, proposal }) {
  return (
    <div className="page cover-page">
      {/* Top banner shape */}
      <div className="cover-banner">
        <svg viewBox="0 0 816 235" preserveAspectRatio="none">
          <path d="M0,0 L816,0 L816,180 L0,235 Z" fill={BRAND.ink} />
        </svg>
      </div>

      {/* Logo */}
      <div className="cover-logo-wrap">
        <img src="/logo-masterroofing.png" alt="Master Roofing" className="cover-logo-img" />
      </div>

      {/* Date */}
      <div className="cover-date">{formatDate(proposal.created_at)}</div>

      {/* Title */}
      <div className="cover-title">Proposal</div>

      {/* Info Grid */}
      <table className="cover-grid">
        <tbody>
          <tr>
            <td className="label">Prepared For:</td>
            <td className="value">{project?.gc_name || "General Contractor"}</td>
            <td className="label">Project:</td>
            <td className="value">{project?.address || project?.name || "Project Address"}</td>
          </tr>
          <tr>
            <td className="label">Date of<br/>Drawings:</td>
            <td className="value">{proposal.date_of_drawings}</td>
            <td className="label">Addendum:</td>
            <td className="value">{proposal.addendum}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="cover-footer">Proposal Version {proposal.version} | {formatDate(proposal.created_at)}</div>
      <div className="cover-site">www.masterroofing.us</div>

      {/* Corner decoration */}
      <div className="cover-corner" />
    </div>
  )
}

// Page Header (for interior pages)
function PageHeader({ project, proposal }) {
  return (
    <div className="header">
      {/* Logo */}
      <div className="logo-container">
        <img src="/logo-masterroofing.png" alt="Master Roofing" className="header-logo-img" />
      </div>

      {/* Meta info */}
      <div className="h-meta">
        <div className="row">
          <span className="label">Project</span>
          <span className="value">{project?.name || project?.address || "Project"}</span>
        </div>
        <div className="row">
          <span className="label">Date</span>
          <span className="value">{formatShortDate(proposal.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

// Project/Line Items Page
function ProjectPage({ project, proposal }) {
  const baseBidTotal = proposal.base_bid_items.reduce((sum, item) => sum + item.amount, 0)
  const alternatesTotal = proposal.alternates.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="page project-page">
      <PageHeader project={project} proposal={proposal} />

      <div className="content">
        {/* Project Summary */}
        <div className="h2">Project Summary</div>
        <div className="summary">{proposal.project_summary}</div>

        {/* Base Bid Section */}
        <div className="section-title">
          <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke={BRAND.red} strokeWidth="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 14l2 2 4-4" />
          </svg>
          <span>Base Bid</span>
        </div>

        <table className="table">
          <tbody>
            {proposal.base_bid_items.map((item, idx) => (
              <tr key={idx} className="item-group">
                <tr className="item-head">
                  <td>{item.name}</td>
                  <td className="price">{formatCurrency(item.amount)}</td>
                </tr>
                <tr className="item-body">
                  <td colSpan="2">{item.description}</td>
                </tr>
              </tr>
            ))}
            <tr className="total-row">
              <td>BASE BID TOTAL</td>
              <td className="price">{formatCurrency(baseBidTotal)}</td>
            </tr>
          </tbody>
        </table>

        {/* Alternates Section */}
        {proposal.alternates.length > 0 && (
          <>
            <div className="section-title">
              <svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke={BRAND.red} strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Alternates</span>
            </div>

            <table className="table">
              <tbody>
                {proposal.alternates.map((item, idx) => (
                  <tr key={idx} className="item-group">
                    <tr className="item-head">
                      <td>{item.name}</td>
                      <td className="price">
                        <span className="opt-check">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <rect x="1" y="1" width="14" height="14" rx="2" stroke={BRAND.gray500} strokeWidth="1.5" />
                          </svg>
                        </span>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                    <tr className="item-body">
                      <td colSpan="2">{item.description}</td>
                    </tr>
                  </tr>
                ))}
                <tr className="total-row">
                  <td>ALTERNATES TOTAL (if all selected)</td>
                  <td className="price">{formatCurrency(alternatesTotal)}</td>
                </tr>
              </tbody>
            </table>
          </>
        )}

        {/* Grand Total */}
        <div className="grand-total">
          <div className="label">GRAND TOTAL (Base Bid)</div>
          <div className="amount">{formatCurrency(baseBidTotal)}</div>
          <div className="note">Alternates priced separately if selected</div>
        </div>
      </div>

      {/* Footer elements */}
      <div className="corner" />
      <div className="corner-red" />
      <div className="site">www.masterroofing.us</div>
    </div>
  )
}

// Clarification Page
function ClarificationPage({ project, proposal }) {
  return (
    <div className="page clarification-page">
      <PageHeader project={project} proposal={proposal} />

      <div className="content">
        <div className="clar-title">Clarification Notes &amp; Exclusions</div>

        <ul className="clar-list">
          {proposal.clarifications.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>

        {proposal.exclusions && proposal.exclusions.length > 0 && (
          <>
            <div className="clar-subtitle">Exclusions</div>
            <ul className="clar-list">
              {proposal.exclusions.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

// Terms & Conditions Page
function TermsPage({ project, proposal }) {
  return (
    <div className="page terms-page">
      <PageHeader project={project} proposal={proposal} />

      <div className="content">
        <div className="clar-title">Terms &amp; Conditions</div>

        <div className="terms-content">
          <div className="term-section">
            <div className="term-title">Cleanup &amp; Site Maintenance</div>
            <div className="term-copy">
              Tools and equipment shall be organized and cleaned up on a daily basis.
              All debris will be removed from the roof and ground into dumpsters provided by others.
            </div>
          </div>

          <div className="term-section">
            <div className="term-title">Insurance &amp; Coverage Requirements</div>
            <div className="term-copy">
              Master Roofing &amp; Siding, Inc. will provide general liability and workers' compensation
              insurance certificates naming the owner and/or general contractor as additionally insured.
              If additional or project-specific insurance is required, related costs are excluded from
              this proposal and will be billed as an extra.
            </div>
          </div>

          <div className="term-section">
            <div className="term-title">Terms of Contract</div>
            <div className="term-copy">
              This proposal includes all labor, materials, and supervision required to complete the work
              as described herein, in accordance with standard industry practices.
            </div>
          </div>

          <div className="term-section">
            <div className="term-title">Payment Terms</div>
            <div className="term-copy">Payments shall be made as follows:</div>
            <ul>
              {PAYMENT_TERMS.map((term, idx) => (
                <li key={idx}>{term.percent}% {term.description}</li>
              ))}
            </ul>
            <div className="note">
              Alternate payment terms may be considered upon request.<br/>
              This proposal becomes valid only upon receipt of the initial 35% deposit.
            </div>
          </div>
        </div>
      </div>

      <div className="terms-corner" />
    </div>
  )
}

// Acceptance Page
function AcceptancePage({ project, proposal }) {
  return (
    <div className="page acceptance-page">
      <PageHeader project={project} proposal={proposal} />

      <div className="content">
        <div className="acceptance-title">Acceptance of Proposal</div>

        <div className="acceptance-body">
          <p>
            The undersigned acknowledges full understanding of and agreement to the terms,
            conditions, and details contained in this proposal.
          </p>
          <p>
            The prices, specifications, and conditions stated herein are satisfactory and are hereby
            accepted.
          </p>
          <p>
            Master Roofing &amp; Siding, Inc. is authorized to proceed with the work as described, and
            payment will be made according to the terms outlined above.
          </p>
        </div>

        <div className="acceptance-sign-row">
          <div className="sign-block">
            <div className="sig-title">Master Roofing &amp; Siding, Inc.</div>
            <div className="signature-line" />
            <div className="sig-name">Aron Hirsch — CEO</div>
            <div className="sig-date">{formatShortDate(proposal.created_at)}</div>
          </div>

          <div className="sign-block">
            <div className="sig-title">{project?.gc_name || "Client"}</div>
            <div className="signature-line dashed" />
            <div className="sig-prompt">Sign here</div>
          </div>
        </div>
      </div>

      <div className="site">www.masterroofing.us</div>
    </div>
  )
}

// Thank You Page
function ThankYouPage({ project, proposal }) {
  return (
    <div className="page thank-page">
      <div className="content">
        <div className="thank-main">
          <div className="thank-title">Thank<br/>You</div>
          <div className="thank-sub">
            We appreciate the opportunity to provide this proposal and look forward to contributing
            to the success of your project.
          </div>
        </div>
      </div>

      {/* Bottom logo */}
      <div className="bottom-logo">
        <img src="/logo-masterroofing.png" alt="Master Roofing" className="thank-logo-img" />
      </div>
    </div>
  )
}

// ============ STYLES ============
const proposalStyles = `
  /* CSS Variables */
  .proposal-document {
    --brand-red: ${BRAND.red};
    --ink: ${BRAND.ink};
    --gray-50: ${BRAND.gray50};
    --gray-100: ${BRAND.gray100};
    --gray-200: ${BRAND.gray200};
    --gray-300: ${BRAND.gray300};
    --gray-500: ${BRAND.gray500};

    font-family: "Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    color: #111;
  }

  /* Page Base */
  .proposal-document .page {
    width: 816px;
    min-height: 1056px;
    background: #fff;
    position: relative;
    overflow: hidden;
    margin: 0 auto 24px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.15);
  }

  /* ===== COVER PAGE ===== */
  .proposal-document .cover-page {
    height: 1056px;
  }

  .proposal-document .cover-banner {
    position: absolute;
    inset: 0 0 auto 0;
    height: 235px;
    width: 100%;
  }

  .proposal-document .cover-banner svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .proposal-document .cover-logo-wrap {
    position: absolute;
    left: 36px;
    top: 60px;
    display: flex;
    align-items: center;
    gap: 14px;
    z-index: 3;
  }

  .proposal-document .cover-logo-img {
    height: 40px;
    width: auto;
    filter: brightness(0) invert(1); /* Make logo white on dark background */
  }

  .proposal-document .cover-date {
    position: absolute;
    top: 255px;
    right: 58px;
    font-size: 14px;
    font-weight: 600;
    color: #111;
  }

  .proposal-document .cover-title {
    position: absolute;
    top: 335px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 92px;
    font-weight: 700;
    letter-spacing: 0.01em;
  }

  .proposal-document .cover-grid {
    position: absolute;
    top: 515px;
    left: 60px;
    right: 60px;
    border: 1px solid var(--gray-300);
    border-collapse: collapse;
    background: #fff;
    table-layout: fixed;
  }

  .proposal-document .cover-grid td {
    border: 1px solid var(--gray-300);
    padding: 14px 16px;
    vertical-align: top;
    font-size: 14px;
  }

  .proposal-document .cover-grid .label {
    width: 140px;
    font-weight: 700;
  }

  .proposal-document .cover-grid .value {
    width: 220px;
    font-weight: 400;
  }

  .proposal-document .cover-footer {
    position: absolute;
    bottom: 34px;
    left: 100px;
    right: 0;
    text-align: center;
    font-size: 12px;
    color: #8a8d91;
  }

  .proposal-document .cover-site {
    position: absolute;
    bottom: 18px;
    left: 50px;
    right: 0;
    text-align: center;
    font-size: 10px;
    color: #b3b6ba;
    letter-spacing: 0.04em;
  }

  .proposal-document .cover-corner {
    position: absolute;
    bottom: -120px;
    left: -20px;
    width: 420px;
    height: 420px;
    transform: rotate(51deg);
    background: var(--brand-red);
    clip-path: polygon(0 100%, 100% 40%, 100% 100%);
    opacity: 0.95;
  }

  /* ===== PAGE HEADER ===== */
  .proposal-document .header {
    height: 100px;
    background: #0f1112;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 25px;
  }

  .proposal-document .logo-container {
    display: flex;
    align-items: center;
  }

  .proposal-document .header-logo-img {
    height: 30px;
    width: auto;
    filter: brightness(0) invert(1); /* Make logo white on dark background */
  }

  .proposal-document .h-meta {
    color: #fff;
    font-size: 11.5px;
  }

  .proposal-document .h-meta .row {
    display: flex;
    justify-content: space-between;
    gap: 30px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }

  .proposal-document .h-meta .row:last-child {
    border-bottom: none;
  }

  .proposal-document .h-meta .label {
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 600;
  }

  .proposal-document .h-meta .value {
    text-align: right;
    color: #b8bcc2;
  }

  /* ===== CONTENT AREA ===== */
  .proposal-document .content {
    position: relative;
    padding: 30px 40px 110px 40px;
    box-sizing: border-box;
  }

  .proposal-document .h2 {
    font-weight: 800;
    font-size: 16px;
    margin: 6px 0 10px 0;
  }

  .proposal-document .summary {
    line-height: 1.55;
    color: #222;
    font-size: 13.5px;
    margin-bottom: 22px;
  }

  .proposal-document .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    font-size: 18px;
    margin: 24px 0 10px;
  }

  /* ===== TABLES ===== */
  .proposal-document .table {
    width: 100%;
    border-collapse: collapse;
    border: 1px solid var(--gray-300);
    font-size: 13.5px;
    margin-bottom: 16px;
  }

  .proposal-document .table th,
  .proposal-document .table td {
    border: 1px solid var(--gray-300);
  }

  .proposal-document .item-head td {
    background: var(--gray-100);
    padding: 10px 12px;
    font-weight: 800;
    vertical-align: middle;
  }

  .proposal-document .item-head .price {
    text-align: right;
    white-space: nowrap;
    font-weight: 800;
    width: 120px;
  }

  .proposal-document .item-body td {
    background: #fff;
    padding: 12px 14px;
    font-weight: 400;
    line-height: 1.5;
  }

  .proposal-document .total-row td {
    background: #000;
    padding: 10px 12px;
    font-weight: 800;
    color: #fff;
  }

  .proposal-document .total-row .price {
    text-align: right;
    white-space: nowrap;
  }

  .proposal-document .opt-check {
    display: inline-flex;
    vertical-align: middle;
    margin-right: 8px;
  }

  /* ===== GRAND TOTAL ===== */
  .proposal-document .grand-total {
    background: #0f1112;
    color: #fff;
    padding: 18px 22px;
    margin-top: 28px;
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    border-radius: 2px;
  }

  .proposal-document .grand-total .label {
    font-weight: 900;
    letter-spacing: 0.04em;
  }

  .proposal-document .grand-total .amount {
    font-weight: 900;
    font-size: 18px;
    white-space: nowrap;
  }

  .proposal-document .grand-total .note {
    grid-column: 1 / -1;
    margin-top: 4px;
    font-size: 11px;
    color: #c7c9cc;
    font-style: italic;
  }

  /* ===== FOOTER ELEMENTS ===== */
  .proposal-document .corner {
    position: absolute;
    right: -140px;
    bottom: -256px;
    width: 435px;
    height: 417px;
    transform: rotate(359deg);
    background: #000;
    clip-path: polygon(0 40%, 100% 0, 100% 100%, 0 100%);
    z-index: 1;
  }

  .proposal-document .corner-red {
    position: absolute;
    right: 70px;
    bottom: 15px;
    width: 224px;
    height: 33px;
    background: var(--brand-red);
    transform: skew(4deg, 337deg);
  }

  .proposal-document .site {
    position: absolute;
    right: 40px;
    bottom: 22px;
    font-size: 11px;
    color: #9aa0a6;
  }

  /* ===== CLARIFICATION PAGE ===== */
  .proposal-document .clarification-page {
    height: 1056px;
  }

  .proposal-document .clarification-page .content {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding: 48px 80px;
    text-align: left;
  }

  .proposal-document .clar-title {
    font-size: 32px;
    font-weight: 700;
    text-align: center;
    margin: 0 auto 40px;
  }

  .proposal-document .clar-subtitle {
    font-size: 20px;
    font-weight: 700;
    margin: 30px 0 15px;
  }

  .proposal-document .clar-list {
    max-width: 760px;
    list-style: none;
    padding-left: 0;
    color: #222;
    line-height: 1.6;
    font-size: 14px;
    margin: 0;
  }

  .proposal-document .clar-list li {
    position: relative;
    padding-left: 22px;
    margin-bottom: 12px;
  }

  .proposal-document .clar-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 8px;
    width: 8px;
    height: 8px;
    background: var(--brand-red);
    border-radius: 50%;
  }

  /* ===== TERMS PAGE ===== */
  .proposal-document .terms-page {
    height: 1056px;
  }

  .proposal-document .terms-page .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 48px 80px;
    text-align: left;
    margin-top: 0;
  }

  .proposal-document .terms-content {
    width: 100%;
  }

  .proposal-document .term-section {
    margin-bottom: 24px;
  }

  .proposal-document .term-title {
    font-weight: 700;
    margin-bottom: 6px;
  }

  .proposal-document .term-copy {
    margin-bottom: 12px;
    line-height: 1.6;
    font-size: 14px;
  }

  .proposal-document .term-section ul {
    margin-top: 4px;
    margin-bottom: 12px;
    color: #222;
    line-height: 1.6;
    padding-left: 20px;
    font-size: 14px;
  }

  .proposal-document .term-section .note {
    color: #9aa0a6;
    font-size: 13px;
    margin-top: 8px;
  }

  .proposal-document .terms-corner {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 50px;
    height: 170px;
    background: var(--brand-red);
    clip-path: polygon(0% 0%, 100% 13%, 100% 100%, 0 100%);
  }

  /* ===== ACCEPTANCE PAGE ===== */
  .proposal-document .acceptance-page {
    height: 1056px;
  }

  .proposal-document .acceptance-page .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 48px 80px;
    text-align: left;
  }

  .proposal-document .acceptance-title {
    font-size: 32px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 24px;
  }

  .proposal-document .acceptance-body {
    max-width: 760px;
    color: #222;
    line-height: 1.6;
    font-size: 14px;
    text-align: left;
  }

  .proposal-document .acceptance-body p {
    margin-bottom: 16px;
  }

  .proposal-document .acceptance-sign-row {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: 34px;
    gap: 20px;
  }

  .proposal-document .sign-block {
    width: 48%;
    min-height: 140px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .proposal-document .sig-title {
    font-weight: 700;
    margin-bottom: 12px;
  }

  .proposal-document .signature-line {
    width: 100%;
    height: 60px;
    border-bottom: 2px solid #111;
    margin-bottom: 8px;
  }

  .proposal-document .signature-line.dashed {
    border-bottom-style: dashed;
    border-color: var(--gray-500);
  }

  .proposal-document .sig-name {
    font-weight: 600;
    font-size: 13px;
    color: #222;
  }

  .proposal-document .sig-date {
    font-size: 12px;
    color: var(--gray-500);
    margin-top: 4px;
  }

  .proposal-document .sig-prompt {
    font-size: 12px;
    color: var(--gray-500);
    font-style: italic;
  }

  /* ===== THANK YOU PAGE ===== */
  .proposal-document .thank-page {
    height: 1056px;
    background: linear-gradient(135deg, #fafbfc 0%, #f3f4f6 100%);
  }

  .proposal-document .thank-page .content {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0;
  }

  .proposal-document .thank-main {
    text-align: center;
  }

  .proposal-document .thank-title {
    font-size: 70px;
    font-weight: 700;
    color: var(--brand-red);
    line-height: 0.92;
  }

  .proposal-document .thank-sub {
    max-width: 520px;
    color: #222;
    margin-top: 20px;
    font-size: 15px;
    line-height: 1.6;
  }

  .proposal-document .bottom-logo {
    position: absolute;
    bottom: 50px;
    right: 50px;
    display: flex;
    align-items: center;
  }

  .proposal-document .thank-logo-img {
    height: 50px;
    width: auto;
  }

  /* ===== PRINT STYLES ===== */
  @media print {
    .proposal-document .page {
      margin: 0 !important;
      box-shadow: none !important;
      page-break-after: always;
    }
  }
`

// ============ MAIN COMPONENT ============
export function ProposalPreviewScreen({ project, takeoffData, onBack }) {
  const [zoom, setZoom] = useState(0.65)
  const [isExporting, setIsExporting] = useState(false)
  const containerRef = useRef(null)

  // Convert takeoff data to proposal format using v0 template utilities
  const proposalData = useMemo(() => {
    const projectName = project?.name || project?.address || "Project"
    const projectAddress = project?.address || ""
    const clientName = project?.gc_name || "General Contractor"
    const clientCompany = project?.gc_name
    const drawingsDate = project?.date_of_drawings || ""

    if (takeoffData && takeoffData.length > 0) {
      // Use v0 template conversion
      return createProposalFromTakeoff(
        projectName,
        projectAddress,
        clientName,
        clientCompany,
        takeoffData,
        drawingsDate
      )
    }

    // Fallback to mock data format for v0 template
    return {
      projectName,
      projectAddress,
      clientName,
      clientCompany,
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      drawingsDate: "02/10/2025",
      summary: "This project involves the installation of new roofing and exterior cladding systems for the building located at the specified address. Our scope includes complete removal of existing roofing materials, installation of new waterproofing membranes, and application of specified insulation systems.",
      lineItems: MOCK_PROPOSAL.base_bid_items.map(item => ({
        title: item.name,
        amount: item.amount,
        description: item.description
      })),
      exclusions: MOCK_PROPOSAL.clarifications,
    }
  }, [takeoffData, project])

  // Also create the old format for the visual preview template
  const proposal = useMemo(() => ({
    gc_name: proposalData.clientCompany || proposalData.clientName || "General Contractor",
    project_address: proposalData.projectAddress || "Project Address",
    created_at: new Date().toISOString(),
    date_of_drawings: proposalData.drawingsDate || "TBD",
    addendum: "01",
    version: "V1",
    supersedes: "v0",
    project_summary: proposalData.summary,
    base_bid_items: proposalData.lineItems.map(item => ({
      name: item.title,
      amount: item.amount,
      description: item.description
    })),
    alternates: [],
    clarifications: proposalData.exclusions,
  }), [proposalData])

  const handleDownloadPDF = async () => {
    setIsExporting(true)
    try {
      // Use v0 template jsPDF generation
      await downloadProposalPDF(proposalData)
    } catch (error) {
      console.error("PDF error:", error)
      // Fallback to print
      window.print()
    } finally {
      setIsExporting(false)
    }
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
                {project.name || project.address} | {proposal.version}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 mr-4 border-r border-border pr-4">
              <button
                onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-foreground-secondary" />
              </button>
              <span className="text-sm text-foreground-secondary w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(Math.min(1.2, zoom + 0.1))}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-foreground-secondary" />
              </button>
            </div>

            <button
              onClick={handleDownloadPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white hover:opacity-90 transition-colors disabled:opacity-50"
              style={{ background: "#e53935" }}
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">Download PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview - scrollable with all pages */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-8"
        style={{ background: "#e5e5e5" }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease'
          }}
        >
          <ProposalTemplate
            project={{ gc_name: proposal.gc_name, address: proposal.project_address }}
            proposal={proposal}
          />
        </div>
      </div>
    </div>
  )
}
// force deploy 1768278557
