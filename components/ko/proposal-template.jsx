"use client"

import { useState, useEffect, useRef } from "react"

// ============ CONSTANTS ============
const PAGE = {
  width: 816,
  height: 1056,
  headerHeight: 65,
  padding: { top: 35, right: 55, bottom: 80, left: 55 },
}
PAGE.usableHeight = PAGE.height - PAGE.headerHeight - PAGE.padding.top - PAGE.padding.bottom

// ============ UTILITIES ============
const fmt = {
  currency: (n) => n == null ? "$0.00" : `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  date: (d, short) => {
    if (!d) return ""
    const date = new Date(d)
    return short
      ? date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
      : date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }
}

// ============ HEADER (Interior Pages) ============
function Header({ projectName, date, version }) {
  return (
    <header className="pv-header">
      <img src="/logo-masterroofing.png" alt="Master Roofing" className="pv-logo" />
      <div className="pv-meta">
        <div className="pv-meta-cell">
          <span className="pv-meta-label">PROJECT NAME:</span>
          <span className="pv-meta-value">{projectName}</span>
        </div>
        <div className="pv-meta-cell">
          <span className="pv-meta-label">PROPOSAL DATE:</span>
          <span className="pv-meta-value">{fmt.date(date, true)}</span>
        </div>
        <div className="pv-meta-cell">
          <span className="pv-meta-label">PROPOSAL VERSION:</span>
          <span className="pv-meta-value">{version}</span>
        </div>
      </div>
    </header>
  )
}

// ============ COVER PAGE ============
function CoverPage({ data }) {
  return (
    <div className="pv-page pv-cover">
      {/* Black angled header with logo */}
      <div className="pv-cover-header">
        <img src="/logo-masterroofing.png" alt="Master Roofing" className="pv-cover-logo-img" />
      </div>
      <div className="pv-cover-date">{fmt.date(data.date)}</div>
      <h1 className="pv-cover-title">Proposal</h1>
      <table className="pv-cover-grid">
        <tbody>
          <tr>
            <td className="pv-grid-label">Prepared For:</td>
            <td className="pv-grid-value">{data.gcName}</td>
            <td className="pv-grid-label">Project:</td>
            <td className="pv-grid-value">{data.projectAddress}</td>
          </tr>
          <tr>
            <td className="pv-grid-label">Date of<br/>Drawings:</td>
            <td className="pv-grid-value">{data.drawingsDate}</td>
            <td className="pv-grid-label">Addendum:</td>
            <td className="pv-grid-value">{data.addendum}</td>
          </tr>
        </tbody>
      </table>
      <div className="pv-cover-corner" />
      <div className="pv-cover-footer">Proposal Version {data.version} | Revised {fmt.date(data.date)} | Supersedes {data.supersedes}</div>
      <div className="pv-cover-site">www.masterroofing.us</div>
    </div>
  )
}

// ============ LINE ITEM ============
function LineItem({ name, specs, amount, description }) {
  return (
    <div className="pv-item">
      <div className="pv-item-head">
        <div className="pv-item-name">
          {name}
          {specs && <span className="pv-item-specs">{specs}</span>}
        </div>
        <div className="pv-item-amount">{fmt.currency(amount)}</div>
      </div>
      {description && <div className="pv-item-desc">{description}</div>}
    </div>
  )
}

// ============ SECTION TITLE ============
function SectionTitle({ children, icon = "basebid" }) {
  const iconSrc = icon === "basebid" ? "/favicon-basebid.png" : "/favicon-alt.png"
  return (
    <div className="pv-section-title">
      <img src={iconSrc} alt="" className="pv-section-icon" />
      <span>{children}</span>
    </div>
  )
}

// ============ TOTAL ROW ============
function TotalRow({ label, amount }) {
  return (
    <div className="pv-total">
      <span>{label}</span>
      <span>{fmt.currency(amount)}</span>
    </div>
  )
}

// ============ ITEMS PAGE ============
function ItemsPage({ data, blocks }) {
  return (
    <div className="pv-page">
      <Header projectName={data.gcName} date={data.date} version={data.version} />
      <div className="pv-content">
        {blocks.map((b, i) => {
          if (b.type === "summary") return <div key={i} className="pv-summary"><h2>Project Summary</h2><p>{b.text}</p></div>
          if (b.type === "section") return <SectionTitle key={i} icon={b.icon}>{b.title}</SectionTitle>
          if (b.type === "item") return <LineItem key={i} {...b.item} />
          if (b.type === "total") return <TotalRow key={i} label={b.label} amount={b.amount} />
          return null
        })}
      </div>
    </div>
  )
}

// ============ CLARIFICATIONS PAGE ============
function ClarificationsPage({ data }) {
  return (
    <div className="pv-page">
      <Header projectName={data.gcName} date={data.date} version={data.version} />
      <div className="pv-content pv-centered">
        <h1 className="pv-page-title">Clarification Notes &<br/>Exclusions</h1>
        <ul className="pv-clar-list">
          {data.clarifications.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>
    </div>
  )
}

// ============ TERMS PAGE ============
function TermsPage({ data }) {
  return (
    <div className="pv-page">
      <Header projectName={data.gcName} date={data.date} version={data.version} />
      <div className="pv-content">
        <h1 className="pv-page-title">Terms & Conditions</h1>
        <div className="pv-term">
          <h3>Cleanup & Site Maintenance</h3>
          <p>Tools and equipment shall be organized and cleaned up on a daily basis. All debris will be removed from the roof and ground into dumpsters provided by others.</p>
        </div>
        <div className="pv-term">
          <h3>Insurance & Coverage Requirements</h3>
          <p>Master Roofing & Siding, Inc. will provide general liability and workers' compensation insurance certificates naming the owner and/or general contractor as additionally insured. If additional or project-specific insurance is required, related costs are excluded from this proposal and will be billed as an extra.</p>
        </div>
        <div className="pv-term">
          <h3>Terms of Contract</h3>
          <p>This proposal includes all labor, materials, and supervision required to complete the work as described herein, in accordance with standard industry practices.</p>
        </div>
        <div className="pv-term">
          <h3>Payment Terms</h3>
          <p>Payments shall be made as follows:</p>
          <ul>
            <li>35% upon contract execution</li>
            <li>35% upon reaching approximately 50% completion</li>
            <li>25% upon reaching approximately 85% completion</li>
            <li>5% upon project completion and acceptance</li>
          </ul>
          <p className="pv-term-note">Alternate payment terms may be considered upon request.<br/>This proposal becomes valid only upon receipt of the initial 35% deposit.</p>
        </div>
      </div>
    </div>
  )
}

// ============ ACCEPTANCE PAGE ============
function AcceptancePage({ data }) {
  return (
    <div className="pv-page">
      <Header projectName={data.gcName} date={data.date} version={data.version} />
      <div className="pv-content">
        <h1 className="pv-page-title">Acceptance of Proposal</h1>
        <div className="pv-acceptance-body">
          <p>The undersigned acknowledges full understanding of and agreement to the terms, conditions, and details contained in this proposal.</p>
          <p>The prices, specifications, and conditions stated herein are satisfactory and are hereby accepted.</p>
          <p>Master Roofing & Siding, Inc. is authorized to proceed with the work as described, and payment will be made according to the terms outlined above.</p>
        </div>
        <div className="pv-sig-row">
          <div className="pv-sig-block">
            <h4>Master Roofing & Siding, Inc.</h4>
            <div className="pv-sig-line" />
            <p className="pv-sig-name">Aron Hirsch — CEO</p>
            <p className="pv-sig-date">{fmt.date(data.date, true)}</p>
          </div>
          <div className="pv-sig-block">
            <h4>Client / General Contractor</h4>
            <div className="pv-sig-line" />
            <button className="pv-sign-btn">Review & Sign Proposal</button>
          </div>
        </div>
      </div>
      <div className="pv-acceptance-footer">www.masterroofing.us</div>
    </div>
  )
}

// ============ THANK YOU PAGE ============
function ThankYouPage() {
  return (
    <div className="pv-page pv-thanks">
      <div className="pv-thanks-left" />
      <div className="pv-thanks-right">
        <div className="pv-thanks-badge">
          <div>SELECT TOP</div>
          <div className="pv-badge-main">SUBCONTRACTOR</div>
          <div className="pv-badge-year">2025</div>
        </div>
        <p>Recognized by<br/><strong>COMPASS</strong><br/>as a Select Top<br/>Subcontractor – 2025</p>
      </div>
      <div className="pv-thanks-footer">
        <img src="/logo-masterroofing.png" alt="Master Roofing" />
        <span>www.masterroofing.us</span>
      </div>
    </div>
  )
}

// ============ PAGINATION LOGIC ============
function paginate(data) {
  const H = { summary: 100, section: 45, itemBase: 50, total: 50 }
  const estItemH = (item) => H.itemBase + Math.min((item.description?.length || 0) * 0.35, 100)

  const pages = []
  let blocks = []
  let height = 0

  const flush = () => {
    if (blocks.length) {
      pages.push([...blocks])
      blocks = []
      height = 0
    }
  }

  const add = (block, h) => {
    // If adding this block would overflow, start a new page first
    if (height + h > PAGE.usableHeight && blocks.length > 0) {
      flush()
    }
    blocks.push(block)
    height += h
  }

  // Summary
  add({ type: "summary", text: data.summary }, H.summary)

  // Base Bid
  add({ type: "section", title: "Base Bid:", icon: "basebid" }, H.section)
  data.baseBid.forEach(item => add({ type: "item", item }, estItemH(item)))
  const baseTotal = data.baseBid.reduce((s, i) => s + (i.amount || 0), 0)
  add({ type: "total", label: "Total Base Bid:", amount: baseTotal }, H.total)

  // Alternates
  if (data.alternates?.length) {
    add({ type: "section", title: "Alternates & Options:", icon: "alt" }, H.section)
    data.alternates.forEach(item => add({ type: "item", item }, estItemH(item)))
    const altTotal = data.alternates.reduce((s, i) => s + (i.amount || 0), 0)
    add({ type: "total", label: "Total Alternates & Options:", amount: altTotal }, H.total)
  }

  flush()
  return pages
}

// ============ MAIN COMPONENT ============
export function ProposalTemplate({ project, proposal }) {
  const data = {
    gcName: project?.gc_name || proposal?.gc_name || "GC Name",
    projectAddress: project?.address || proposal?.project_address || "Project Address",
    date: proposal?.created_at || proposal?.date || new Date().toISOString(),
    drawingsDate: proposal?.date_of_drawings || "TBD",
    addendum: proposal?.addendum || "01",
    version: proposal?.version || "V1",
    supersedes: proposal?.supersedes || "v0",
    summary: proposal?.project_summary || "Project summary here.",
    baseBid: proposal?.base_bid_items || [],
    alternates: proposal?.alternates || [],
    clarifications: proposal?.clarifications || [
      "Containers for garbage must be provided by GC.",
      "All penetrations must be installed prior to installation of roofing system. Any penetrations installed afterwards will be an additional charge per pitch pocket.",
      "This APP 160/180 roofing system is designed and manufactured for waterproofing purposes only- not for any sort of human traffic. If roof will be used for traffic without the installation of protection boards or pavers, the warranty will not be effective.",
      "R value and thickness of insulation must be reviewed and approved by GC. Master Roofing doesn't take any responsibility for the R value requirements.",
      "This roofing system proposed is standard white only, ultra-white will be an upcharge.",
    ],
  }

  const itemPages = paginate(data)

  return (
    <div className="pv-doc">
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <CoverPage data={data} />
      {itemPages.map((blocks, i) => <ItemsPage key={i} data={data} blocks={blocks} />)}
      <ClarificationsPage data={data} />
      <TermsPage data={data} />
      <AcceptancePage data={data} />
      <ThankYouPage />
    </div>
  )
}

// ============ STYLES ============
const styles = `
.pv-doc { font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1a1a; }

/* Page */
.pv-page { width: ${PAGE.width}px; height: ${PAGE.height}px; background: #fff; position: relative; margin: 0 auto 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.12); overflow: hidden; page-break-after: always; }

/* Header - clean, no borders or backgrounds */
.pv-header { height: ${PAGE.headerHeight}px; padding: 0 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; }
.pv-logo { height: 26px; }
.pv-meta { display: flex; gap: 20px; font-size: 9px; }
.pv-meta-cell { display: flex; gap: 6px; }
.pv-meta-label { font-weight: 600; color: #888; }
.pv-meta-value { color: #333; }

/* Content */
.pv-content { padding: 35px 55px 80px 55px; }
.pv-content.pv-centered { text-align: center; }

/* Cover */
.pv-cover .pv-cover-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: #1a1a1a;
  clip-path: polygon(0 0, 100% 0, 100% 70%, 0 100%);
  padding: 45px 50px;
}
.pv-cover-logo-img {
  height: 38px;
  width: auto;
  filter: brightness(0) invert(1);
}
.pv-cover-date { position: absolute; top: 240px; right: 50px; font-size: 14px; font-weight: 600; }
.pv-cover-title { position: absolute; top: 300px; left: 50px; font-size: 80px; font-weight: 700; margin: 0; }
.pv-cover-grid { position: absolute; top: 480px; left: 50px; right: 50px; border-collapse: collapse; font-size: 13px; }
.pv-cover-grid td { border: 1px solid #ddd; padding: 12px 14px; }
.pv-grid-label { font-weight: 700; width: 110px; }
.pv-cover-corner { position: absolute; bottom: 0; left: 0; border-style: solid; border-width: 280px 0 0 180px; border-color: transparent transparent transparent #e53935; }
.pv-cover-footer { position: absolute; bottom: 40px; left: 0; right: 0; text-align: center; font-size: 10px; color: #888; }
.pv-cover-site { position: absolute; bottom: 22px; left: 0; right: 0; text-align: center; font-size: 9px; color: #aaa; }

/* Summary */
.pv-summary { max-width: 680px; margin: 0 auto 10px; text-align: center; }
.pv-summary h2 { font-size: 13px; font-weight: 700; margin: 0 0 8px; }
.pv-summary p { font-size: 11px; line-height: 1.65; margin: 0 0 16px; text-align: justify; }

/* Section Title with favicon icon */
.pv-section-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; margin: 18px 0 10px; }
.pv-section-icon { width: 22px; height: 22px; object-fit: contain; }

/* Line Item */
.pv-item { border: 1px solid #ddd; margin-bottom: -1px; }
.pv-item-head { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #f5f5f5; }
.pv-item-name { font-weight: 700; font-size: 12px; }
.pv-item-specs { font-weight: 400; font-size: 11px; color: #666; margin-left: 8px; }
.pv-item-amount { font-weight: 700; font-size: 12px; }
.pv-item-desc { padding: 10px 12px; font-size: 11px; line-height: 1.55; }

/* Total */
.pv-total { display: flex; justify-content: space-between; padding: 10px 12px; background: #1a1a1a; color: #fff; font-weight: 700; font-size: 12px; margin-bottom: 16px; }

/* Page Title */
.pv-page-title { font-size: 28px; font-weight: 700; margin: 50px 0 30px; text-align: center; }

/* Clarifications */
.pv-clar-list { list-style: none; padding: 0; margin: 0 auto; max-width: 620px; text-align: left; }
.pv-clar-list li { position: relative; padding-left: 18px; margin-bottom: 14px; font-size: 12px; line-height: 1.6; }
.pv-clar-list li::before { content: ''; position: absolute; left: 0; top: 6px; width: 6px; height: 6px; background: #e53935; border-radius: 0; }

/* Terms */
.pv-term { margin-bottom: 18px; }
.pv-term h3 { font-size: 13px; font-weight: 700; margin: 0 0 4px; }
.pv-term p { font-size: 11px; line-height: 1.6; margin: 0 0 6px; }
.pv-term ul { margin: 6px 0; padding-left: 18px; font-size: 11px; }
.pv-term li { margin-bottom: 3px; }
.pv-term-note { color: #666; font-size: 10px !important; }

/* Acceptance */
.pv-acceptance-body { max-width: 560px; margin: 0 auto 30px; }
.pv-acceptance-body p { font-size: 12px; line-height: 1.65; margin: 0 0 14px; text-align: justify; }
.pv-sig-row { display: flex; gap: 50px; margin-top: 30px; }
.pv-sig-block { flex: 1; }
.pv-sig-block h4 { font-size: 12px; font-weight: 700; margin: 0 0 12px; }
.pv-sig-line { border-bottom: 1px solid #333; height: 50px; margin-bottom: 6px; }
.pv-sig-name { font-size: 11px; margin: 0; }
.pv-sig-date { font-size: 10px; color: #666; margin: 3px 0 0; }
.pv-sign-btn { margin-top: 15px; padding: 10px 20px; background: #fff; color: #e53935; border: 2px solid #e53935; border-radius: 3px; font-size: 12px; font-weight: 600; cursor: pointer; }
.pv-acceptance-footer { position: absolute; bottom: 0; left: 0; right: 0; height: 45px; background: #1a1a1a; display: flex; align-items: center; justify-content: flex-end; padding: 0 25px; color: #fff; font-size: 10px; }

/* Thank You */
.pv-thanks { display: flex; }
.pv-thanks-left { flex: 1; position: relative; }
.pv-thanks-left::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 220px; background: linear-gradient(135deg, transparent 55%, #e53935 55%); }
.pv-thanks-right { width: 260px; background: #1a1a1a; color: #fff; padding: 50px 25px; text-align: center; }
.pv-thanks-badge { border: 2px solid #555; border-radius: 6px; padding: 15px; margin-bottom: 20px; font-size: 11px; }
.pv-badge-main { font-size: 14px; font-weight: 700; color: #e53935; margin: 4px 0; }
.pv-badge-year { font-size: 18px; font-weight: 700; }
.pv-thanks-right p { font-size: 12px; line-height: 1.5; margin: 0; }
.pv-thanks-footer { position: absolute; bottom: 0; left: 0; right: 0; height: 90px; background: #1a1a1a; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; }
.pv-thanks-footer img { height: 28px; filter: brightness(0) invert(1); }
.pv-thanks-footer span { color: #888; font-size: 10px; }

@media print { .pv-page { margin: 0; box-shadow: none; } }
`

export default ProposalTemplate
