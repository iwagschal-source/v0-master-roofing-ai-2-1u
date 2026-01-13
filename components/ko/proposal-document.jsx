"use client"

import { useState, useRef, useEffect, useMemo } from "react"

// ============ CONSTANTS ============
const PAGE_WIDTH = 816    // US Letter at 96dpi
const PAGE_HEIGHT = 1056  // 11 inches at 96dpi
const HEADER_HEIGHT = 100
const CONTENT_PADDING_TOP = 30
const CONTENT_PADDING_BOTTOM = 110
const CONTENT_PADDING_X = 40
const USABLE_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - CONTENT_PADDING_TOP - CONTENT_PADDING_BOTTOM

const BRAND = {
  red: "#e43c2e",
  ink: "#0e0f10",
  gray100: "#f3f4f6",
  gray300: "#d1d5db",
  gray500: "#6b7280",
}

// ============ UTILITY FUNCTIONS ============
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return "$0"
  const prefix = amount < 0 ? "(" : ""
  const suffix = amount < 0 ? ")" : ""
  return `${prefix}$${Math.abs(amount).toLocaleString()}${suffix}`
}

function formatDate(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

function formatShortDate(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
}

// ============ PAGE COMPONENTS ============

// Page Header (black bar with logo)
function PageHeader({ project, proposal }) {
  return (
    <div className="proposal-header">
      <div className="logo-container">
        <img src="/logo-masterroofing.png" alt="Master Roofing" className="header-logo" />
      </div>
      <div className="header-meta">
        <div className="meta-row">
          <span className="meta-label">PROJECT</span>
          <span className="meta-value">{project?.name || project?.address || "Project"}</span>
        </div>
        <div className="meta-row">
          <span className="meta-label">DATE</span>
          <span className="meta-value">{formatShortDate(proposal.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

// Page Footer
function PageFooter({ pageNum, totalPages }) {
  return (
    <div className="proposal-footer">
      <span className="footer-site">www.masterroofing.us</span>
      <span className="footer-page">Page {pageNum} of {totalPages}</span>
    </div>
  )
}

// Single Page Container
function Page({ children, project, proposal, pageNum, totalPages, showHeader = true, className = "" }) {
  return (
    <div className={`proposal-page ${className}`}>
      {showHeader && <PageHeader project={project} proposal={proposal} />}
      <div className="proposal-content">
        {children}
      </div>
      <PageFooter pageNum={pageNum} totalPages={totalPages} />
    </div>
  )
}

// ============ COVER PAGE ============
function CoverPage({ project, proposal, pageNum, totalPages }) {
  return (
    <div className="proposal-page cover-page">
      {/* Banner */}
      <div className="cover-banner">
        <svg viewBox="0 0 816 235" preserveAspectRatio="none">
          <path d="M0,0 L816,0 L816,180 L0,235 Z" fill={BRAND.ink} />
        </svg>
      </div>

      {/* Logo */}
      <div className="cover-logo">
        <img src="/logo-masterroofing.png" alt="Master Roofing" />
      </div>

      {/* Date */}
      <div className="cover-date">{formatDate(proposal.created_at)}</div>

      {/* Title */}
      <div className="cover-title">Proposal</div>

      {/* Info Grid */}
      <table className="cover-grid">
        <tbody>
          <tr>
            <td className="grid-label">Prepared For:</td>
            <td className="grid-value">{project?.gc_name || "General Contractor"}</td>
            <td className="grid-label">Project:</td>
            <td className="grid-value">{project?.address || project?.name || "Project Address"}</td>
          </tr>
          <tr>
            <td className="grid-label">Date of Drawings:</td>
            <td className="grid-value">{proposal.date_of_drawings || "TBD"}</td>
            <td className="grid-label">Addendum:</td>
            <td className="grid-value">{proposal.addendum || "N/A"}</td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="cover-footer">
        Proposal Version {proposal.version} | {formatDate(proposal.created_at)}
      </div>
      <div className="cover-site">www.masterroofing.us</div>
      <div className="cover-corner" />
    </div>
  )
}

// ============ LINE ITEM ROW GROUP ============
function LineItemGroup({ item, showCheckbox = false }) {
  return (
    <div className="item-group" data-item-group>
      <div className="item-head">
        <span className="item-name">{item.name}</span>
        <span className="item-price">
          {showCheckbox && (
            <span className="checkbox">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="12" height="12" rx="2" stroke={BRAND.gray500} strokeWidth="1.5" />
              </svg>
            </span>
          )}
          {formatCurrency(item.amount)}
        </span>
      </div>
      <div className="item-body">
        {item.description}
      </div>
    </div>
  )
}

// Total Row
function TotalRow({ label, amount }) {
  return (
    <div className="total-row">
      <span className="total-label">{label}</span>
      <span className="total-amount">{formatCurrency(amount)}</span>
    </div>
  )
}

// Section Title
function SectionTitle({ icon, children }) {
  return (
    <div className="section-title">
      {icon}
      <span>{children}</span>
    </div>
  )
}

// ============ AUTO-PAGINATING LINE ITEMS ============
function useAutoPagination(items, sectionTitle, isAlternates = false) {
  const measureRef = useRef(null)
  const [pages, setPages] = useState([])

  useEffect(() => {
    if (!measureRef.current || items.length === 0) return

    // Create a hidden measurement container
    const measureContainer = document.createElement('div')
    measureContainer.style.cssText = `
      position: absolute;
      visibility: hidden;
      width: ${PAGE_WIDTH - (CONTENT_PADDING_X * 2)}px;
      font-family: Inter, system-ui, sans-serif;
    `
    document.body.appendChild(measureContainer)

    // Measure section title
    const titleEl = document.createElement('div')
    titleEl.className = 'section-title'
    titleEl.innerHTML = `<span>${sectionTitle}</span>`
    measureContainer.appendChild(titleEl)
    const titleHeight = titleEl.offsetHeight + 24 // + margin

    // Measure each item group
    const itemHeights = items.map(item => {
      const groupEl = document.createElement('div')
      groupEl.className = 'item-group'
      groupEl.innerHTML = `
        <div class="item-head">
          <span class="item-name">${item.name}</span>
          <span class="item-price">${formatCurrency(item.amount)}</span>
        </div>
        <div class="item-body">${item.description}</div>
      `
      measureContainer.appendChild(groupEl)
      const height = groupEl.offsetHeight
      measureContainer.removeChild(groupEl)
      return height
    })

    // Measure total row
    const totalEl = document.createElement('div')
    totalEl.className = 'total-row'
    totalEl.innerHTML = `<span>TOTAL</span><span>$0</span>`
    measureContainer.appendChild(totalEl)
    const totalHeight = totalEl.offsetHeight + 16 // + margin

    document.body.removeChild(measureContainer)

    // Paginate items
    const paginatedPages = []
    let currentPageItems = []
    let currentHeight = titleHeight // Start with title height on first page

    items.forEach((item, idx) => {
      const itemHeight = itemHeights[idx]
      const isLastItem = idx === items.length - 1
      const neededHeight = itemHeight + (isLastItem ? totalHeight : 0)

      if (currentHeight + neededHeight > USABLE_HEIGHT && currentPageItems.length > 0) {
        // Start new page
        paginatedPages.push({ items: currentPageItems, showTitle: paginatedPages.length === 0 })
        currentPageItems = []
        currentHeight = 0 // No title on continuation pages
      }

      currentPageItems.push(item)
      currentHeight += itemHeight
    })

    // Add remaining items
    if (currentPageItems.length > 0) {
      paginatedPages.push({ items: currentPageItems, showTitle: paginatedPages.length === 0 })
    }

    setPages(paginatedPages)
  }, [items, sectionTitle])

  return { pages, measureRef }
}

// ============ PROJECT PAGES (Auto-paginating) ============
function ProjectPages({ project, proposal, startPageNum, onPageCount }) {
  const [renderedPages, setRenderedPages] = useState([])
  const containerRef = useRef(null)

  const baseBidTotal = proposal.base_bid_items.reduce((sum, item) => sum + item.amount, 0)
  const alternatesTotal = proposal.alternates.reduce((sum, item) => sum + item.amount, 0)

  useEffect(() => {
    // Calculate pagination based on content
    const pages = []
    let currentContent = []
    let currentHeight = 0

    // Helper to add content block
    const addBlock = (block, height, forceNewPage = false) => {
      if (forceNewPage || (currentHeight + height > USABLE_HEIGHT && currentContent.length > 0)) {
        pages.push([...currentContent])
        currentContent = []
        currentHeight = 0
      }
      currentContent.push(block)
      currentHeight += height
    }

    // Project Summary (~80px)
    addBlock({ type: 'summary', content: proposal.project_summary }, 80)

    // Base Bid Section Title (~50px)
    addBlock({ type: 'section-title', title: 'Base Bid' }, 50)

    // Base Bid Items (~120px each average)
    proposal.base_bid_items.forEach((item, idx) => {
      const estimatedHeight = 60 + (item.description.length / 4) // Rough estimate based on description length
      addBlock({ type: 'item', item, isAlternate: false }, Math.min(estimatedHeight, 150))
    })

    // Base Bid Total (~50px)
    addBlock({ type: 'total', label: 'BASE BID TOTAL', amount: baseBidTotal }, 50)

    // Alternates (if any)
    if (proposal.alternates.length > 0) {
      // Section Title (~50px)
      addBlock({ type: 'section-title', title: 'Alternates' }, 50)

      // Alternate Items
      proposal.alternates.forEach((item, idx) => {
        const estimatedHeight = 60 + (item.description.length / 4)
        addBlock({ type: 'item', item, isAlternate: true }, Math.min(estimatedHeight, 150))
      })

      // Alternates Total
      addBlock({ type: 'total', label: 'ALTERNATES TOTAL (if all selected)', amount: alternatesTotal }, 50)
    }

    // Grand Total (~80px)
    addBlock({ type: 'grand-total', amount: baseBidTotal }, 80)

    // Add final page
    if (currentContent.length > 0) {
      pages.push(currentContent)
    }

    setRenderedPages(pages)
    onPageCount && onPageCount(pages.length)
  }, [proposal, baseBidTotal, alternatesTotal, onPageCount])

  return (
    <>
      {renderedPages.map((pageContent, pageIdx) => (
        <Page
          key={`project-${pageIdx}`}
          project={project}
          proposal={proposal}
          pageNum={startPageNum + pageIdx}
          totalPages={0} // Will be calculated later
          className="project-page"
        >
          {pageContent.map((block, blockIdx) => {
            switch (block.type) {
              case 'summary':
                return (
                  <div key={blockIdx}>
                    <h2 className="content-h2">Project Summary</h2>
                    <p className="content-summary">{block.content}</p>
                  </div>
                )
              case 'section-title':
                return (
                  <SectionTitle key={blockIdx} icon={
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BRAND.red} strokeWidth="2">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                    </svg>
                  }>
                    {block.title}
                  </SectionTitle>
                )
              case 'item':
                return <LineItemGroup key={blockIdx} item={block.item} showCheckbox={block.isAlternate} />
              case 'total':
                return <TotalRow key={blockIdx} label={block.label} amount={block.amount} />
              case 'grand-total':
                return (
                  <div key={blockIdx} className="grand-total">
                    <span className="gt-label">GRAND TOTAL (Base Bid)</span>
                    <span className="gt-amount">{formatCurrency(block.amount)}</span>
                    <span className="gt-note">Alternates priced separately if selected</span>
                  </div>
                )
              default:
                return null
            }
          })}
        </Page>
      ))}
    </>
  )
}

// ============ CLARIFICATIONS PAGE ============
function ClarificationsPage({ project, proposal, pageNum, totalPages }) {
  return (
    <Page project={project} proposal={proposal} pageNum={pageNum} totalPages={totalPages} className="clarifications-page">
      <h1 className="page-title">Clarification Notes &amp; Exclusions</h1>
      <ul className="clar-list">
        {proposal.clarifications.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
      {proposal.exclusions && proposal.exclusions.length > 0 && (
        <>
          <h2 className="content-h2">Exclusions</h2>
          <ul className="clar-list">
            {proposal.exclusions.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </>
      )}
    </Page>
  )
}

// ============ TERMS PAGE ============
function TermsPage({ project, proposal, pageNum, totalPages }) {
  const paymentTerms = [
    { percent: 35, desc: "upon contract execution" },
    { percent: 35, desc: "upon reaching approximately 50% completion" },
    { percent: 25, desc: "upon reaching approximately 85% completion" },
    { percent: 5, desc: "upon project completion and acceptance" },
  ]

  return (
    <Page project={project} proposal={proposal} pageNum={pageNum} totalPages={totalPages} className="terms-page">
      <h1 className="page-title">Terms &amp; Conditions</h1>

      <div className="term-section">
        <h3 className="term-title">Cleanup &amp; Site Maintenance</h3>
        <p className="term-copy">
          Tools and equipment shall be organized and cleaned up on a daily basis.
          All debris will be removed from the roof and ground into dumpsters provided by others.
        </p>
      </div>

      <div className="term-section">
        <h3 className="term-title">Insurance &amp; Coverage Requirements</h3>
        <p className="term-copy">
          Master Roofing &amp; Siding, Inc. will provide general liability and workers' compensation
          insurance certificates naming the owner and/or general contractor as additionally insured.
          If additional or project-specific insurance is required, related costs are excluded from
          this proposal and will be billed as an extra.
        </p>
      </div>

      <div className="term-section">
        <h3 className="term-title">Terms of Contract</h3>
        <p className="term-copy">
          This proposal includes all labor, materials, and supervision required to complete the work
          as described herein, in accordance with standard industry practices.
        </p>
      </div>

      <div className="term-section">
        <h3 className="term-title">Payment Terms</h3>
        <p className="term-copy">Payments shall be made as follows:</p>
        <ul className="term-list">
          {paymentTerms.map((term, idx) => (
            <li key={idx}>{term.percent}% {term.desc}</li>
          ))}
        </ul>
        <p className="term-note">
          Alternate payment terms may be considered upon request.<br/>
          This proposal becomes valid only upon receipt of the initial 35% deposit.
        </p>
      </div>

      <div className="terms-corner" />
    </Page>
  )
}

// ============ ACCEPTANCE PAGE ============
function AcceptancePage({ project, proposal, pageNum, totalPages }) {
  return (
    <Page project={project} proposal={proposal} pageNum={pageNum} totalPages={totalPages} className="acceptance-page">
      <h1 className="page-title">Acceptance of Proposal</h1>

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

      <div className="signature-row">
        <div className="signature-block">
          <div className="sig-title">Master Roofing &amp; Siding, Inc.</div>
          <div className="sig-line" />
          <div className="sig-name">Aron Hirsch — CEO</div>
          <div className="sig-date">{formatShortDate(proposal.created_at)}</div>
        </div>
        <div className="signature-block">
          <div className="sig-title">{project?.gc_name || "Client"}</div>
          <div className="sig-line dashed" />
          <div className="sig-prompt">Sign here</div>
        </div>
      </div>
    </Page>
  )
}

// ============ THANK YOU PAGE ============
function ThankYouPage({ project, proposal, pageNum, totalPages }) {
  return (
    <div className="proposal-page thank-page">
      <div className="thank-content">
        <div className="thank-title">Thank<br/>You</div>
        <p className="thank-sub">
          We appreciate the opportunity to provide this proposal and look forward to contributing
          to the success of your project.
        </p>
      </div>
      <div className="thank-logo">
        <img src="/logo-masterroofing.png" alt="Master Roofing" />
      </div>
      <PageFooter pageNum={pageNum} totalPages={totalPages} />
    </div>
  )
}

// ============ MAIN DOCUMENT COMPONENT ============
export function ProposalDocument({ project, proposal }) {
  const [projectPageCount, setProjectPageCount] = useState(1)

  // Calculate total pages: Cover + Project pages + Clarifications + Terms + Acceptance + Thank You
  const totalPages = 1 + projectPageCount + 4

  return (
    <div className="proposal-document">
      <style dangerouslySetInnerHTML={{ __html: proposalStyles }} />

      <CoverPage project={project} proposal={proposal} pageNum={1} totalPages={totalPages} />

      <ProjectPages
        project={project}
        proposal={proposal}
        startPageNum={2}
        onPageCount={setProjectPageCount}
      />

      <ClarificationsPage
        project={project}
        proposal={proposal}
        pageNum={2 + projectPageCount}
        totalPages={totalPages}
      />

      <TermsPage
        project={project}
        proposal={proposal}
        pageNum={3 + projectPageCount}
        totalPages={totalPages}
      />

      <AcceptancePage
        project={project}
        proposal={proposal}
        pageNum={4 + projectPageCount}
        totalPages={totalPages}
      />

      <ThankYouPage
        project={project}
        proposal={proposal}
        pageNum={5 + projectPageCount}
        totalPages={totalPages}
      />
    </div>
  )
}

// ============ STYLES ============
const proposalStyles = `
  .proposal-document {
    font-family: "Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    color: #111;
    --brand-red: ${BRAND.red};
    --ink: ${BRAND.ink};
    --gray-100: ${BRAND.gray100};
    --gray-300: ${BRAND.gray300};
    --gray-500: ${BRAND.gray500};
  }

  /* ===== PAGE BASE ===== */
  .proposal-page {
    width: ${PAGE_WIDTH}px;
    min-height: ${PAGE_HEIGHT}px;
    height: ${PAGE_HEIGHT}px;
    background: #fff;
    position: relative;
    overflow: hidden;
    margin: 0 auto 24px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.15);
    page-break-after: always;
    box-sizing: border-box;
  }

  /* ===== HEADER ===== */
  .proposal-header {
    height: ${HEADER_HEIGHT}px;
    background: var(--ink);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 25px;
  }

  .header-logo {
    height: 30px;
    width: auto;
    filter: brightness(0) invert(1);
  }

  .header-meta {
    color: #fff;
    font-size: 11px;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    gap: 30px;
    padding: 5px 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  .meta-row:last-child { border-bottom: none; }

  .meta-label {
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  .meta-value {
    color: #b8bcc2;
  }

  /* ===== CONTENT AREA ===== */
  .proposal-content {
    padding: ${CONTENT_PADDING_TOP}px ${CONTENT_PADDING_X}px ${CONTENT_PADDING_BOTTOM}px;
    height: calc(100% - ${HEADER_HEIGHT}px);
    box-sizing: border-box;
    overflow: hidden;
  }

  /* ===== FOOTER ===== */
  .proposal-footer {
    position: absolute;
    bottom: 20px;
    left: ${CONTENT_PADDING_X}px;
    right: ${CONTENT_PADDING_X}px;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--gray-500);
  }

  /* ===== TYPOGRAPHY ===== */
  .page-title {
    font-size: 28px;
    font-weight: 700;
    text-align: center;
    margin: 0 0 30px;
  }

  .content-h2 {
    font-size: 15px;
    font-weight: 800;
    margin: 0 0 8px;
  }

  .content-summary {
    font-size: 13px;
    line-height: 1.55;
    color: #222;
    margin: 0 0 20px;
  }

  /* ===== SECTION TITLE ===== */
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 800;
    font-size: 16px;
    margin: 20px 0 10px;
  }

  /* ===== LINE ITEMS ===== */
  .item-group {
    border: 1px solid var(--gray-300);
    margin-bottom: 0;
    break-inside: avoid;
  }

  .item-group + .item-group {
    border-top: none;
  }

  .item-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: var(--gray-100);
    font-weight: 700;
    font-size: 13px;
  }

  .item-price {
    display: flex;
    align-items: center;
    gap: 8px;
    white-space: nowrap;
  }

  .checkbox svg {
    display: block;
  }

  .item-body {
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.5;
    color: #333;
  }

  /* ===== TOTAL ROW ===== */
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    background: #000;
    color: #fff;
    font-weight: 800;
    font-size: 13px;
    margin-bottom: 16px;
  }

  /* ===== GRAND TOTAL ===== */
  .grand-total {
    background: var(--ink);
    color: #fff;
    padding: 16px 20px;
    margin-top: 24px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px;
  }

  .gt-label {
    font-weight: 900;
    font-size: 14px;
    letter-spacing: 0.03em;
  }

  .gt-amount {
    font-weight: 900;
    font-size: 18px;
  }

  .gt-note {
    grid-column: 1 / -1;
    font-size: 11px;
    color: #aaa;
    font-style: italic;
  }

  /* ===== COVER PAGE ===== */
  .cover-page .proposal-content { padding: 0; }

  .cover-banner {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 235px;
  }

  .cover-banner svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  .cover-logo {
    position: absolute;
    top: 60px;
    left: 36px;
    z-index: 2;
  }

  .cover-logo img {
    height: 40px;
    filter: brightness(0) invert(1);
  }

  .cover-date {
    position: absolute;
    top: 255px;
    right: 58px;
    font-size: 14px;
    font-weight: 600;
  }

  .cover-title {
    position: absolute;
    top: 320px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 88px;
    font-weight: 700;
  }

  .cover-grid {
    position: absolute;
    top: 500px;
    left: 60px;
    right: 60px;
    border-collapse: collapse;
    border: 1px solid var(--gray-300);
    background: #fff;
    font-size: 13px;
  }

  .cover-grid td {
    border: 1px solid var(--gray-300);
    padding: 12px 14px;
    vertical-align: top;
  }

  .grid-label {
    font-weight: 700;
    width: 130px;
  }

  .grid-value {
    width: 200px;
  }

  .cover-footer {
    position: absolute;
    bottom: 40px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 11px;
    color: #888;
  }

  .cover-site {
    position: absolute;
    bottom: 22px;
    left: 0;
    right: 0;
    text-align: center;
    font-size: 10px;
    color: #aaa;
    letter-spacing: 0.04em;
  }

  .cover-corner {
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

  /* ===== CLARIFICATIONS ===== */
  .clar-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .clar-list li {
    position: relative;
    padding-left: 20px;
    margin-bottom: 12px;
    font-size: 13px;
    line-height: 1.6;
  }

  .clar-list li::before {
    content: '';
    position: absolute;
    left: 0;
    top: 7px;
    width: 8px;
    height: 8px;
    background: var(--brand-red);
    border-radius: 50%;
  }

  /* ===== TERMS ===== */
  .term-section {
    margin-bottom: 20px;
  }

  .term-title {
    font-size: 14px;
    font-weight: 700;
    margin: 0 0 6px;
  }

  .term-copy {
    font-size: 13px;
    line-height: 1.6;
    margin: 0 0 8px;
  }

  .term-list {
    margin: 8px 0;
    padding-left: 20px;
    font-size: 13px;
    line-height: 1.6;
  }

  .term-note {
    font-size: 12px;
    color: var(--gray-500);
    margin-top: 8px;
  }

  .terms-corner {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 50px;
    height: 170px;
    background: var(--brand-red);
    clip-path: polygon(0% 0%, 100% 13%, 100% 100%, 0 100%);
  }

  /* ===== ACCEPTANCE ===== */
  .acceptance-body {
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 30px;
  }

  .acceptance-body p {
    margin: 0 0 16px;
  }

  .signature-row {
    display: flex;
    gap: 40px;
    margin-top: 40px;
  }

  .signature-block {
    flex: 1;
  }

  .sig-title {
    font-weight: 700;
    margin-bottom: 10px;
  }

  .sig-line {
    height: 50px;
    border-bottom: 2px solid #111;
    margin-bottom: 8px;
  }

  .sig-line.dashed {
    border-bottom-style: dashed;
    border-color: var(--gray-500);
  }

  .sig-name {
    font-size: 13px;
    font-weight: 600;
  }

  .sig-date {
    font-size: 12px;
    color: var(--gray-500);
    margin-top: 4px;
  }

  .sig-prompt {
    font-size: 12px;
    color: var(--gray-500);
    font-style: italic;
  }

  /* ===== THANK YOU ===== */
  .thank-page {
    background: linear-gradient(135deg, #fafbfc 0%, #f0f1f3 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .thank-content {
    text-align: center;
  }

  .thank-title {
    font-size: 72px;
    font-weight: 700;
    color: var(--brand-red);
    line-height: 0.9;
    margin-bottom: 20px;
  }

  .thank-sub {
    font-size: 15px;
    color: #333;
    max-width: 400px;
    line-height: 1.6;
    margin: 0;
  }

  .thank-logo {
    position: absolute;
    bottom: 50px;
    right: 50px;
  }

  .thank-logo img {
    height: 45px;
  }

  /* ===== PRINT ===== */
  @media print {
    .proposal-page {
      margin: 0 !important;
      box-shadow: none !important;
      page-break-after: always;
    }
  }
`

export default ProposalDocument
