"use client"

/**
 * Proposal Template V2 - Matches 120 Ellery Street PDF format EXACTLY
 * Updated: 2026-01-15
 */

// ============ UTILITIES ============
const fmt = {
  currency: (n) => n == null ? "$0" : `$${Math.abs(n).toLocaleString()}`,
  currencyFull: (n) => n == null ? "$0.00" : `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  date: (d) => {
    if (!d) return ""
    const date = new Date(d)
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  }
}

// ============ PAGE HEADER (with logo) ============
function PageHeader() {
  return (
    <div className="ep-header">
      <div className="ep-logo-container">
        <div className="ep-logo-stripe"></div>
        <span className="ep-logo-text">M A S T E R R O O F I N G</span>
      </div>
    </div>
  )
}

// ============ LINE ITEM ============
function LineItem({ name, specs, amount, description }) {
  return (
    <div className="ep-item">
      <div className="ep-item-head">
        <span className="ep-item-name">
          {name}
          {specs && <span className="ep-item-specs"> – {specs}</span>}
        </span>
        <span className="ep-item-amount">{fmt.currency(amount)}</span>
      </div>
      {description && <p className="ep-item-desc">{description}</p>}
    </div>
  )
}

// ============ MAIN COMPONENT ============
export function ProposalTemplateV2({ proposal }) {
  const data = {
    gcName: proposal?.gc_name || proposal?.preparedFor || "",
    projectAddress: proposal?.project_address || proposal?.project || "Project Address",
    date: proposal?.created_at || proposal?.date || new Date().toISOString(),
    drawingsDate: proposal?.date_of_drawings || proposal?.drawingsDate || "",
    summary: proposal?.project_summary || proposal?.summary || "",
    baseBid: proposal?.base_bid_items || proposal?.lineItems || [],
    alternates: proposal?.alternates || [],
    clarifications: proposal?.clarifications || proposal?.notes || [
      "Containers for garbage must be provided by GC.",
      "All penetrations must be installed prior to installation of roofing system. Any penetration installed afterwards will be an additional charge per pitch pocket.",
      "This APP 160/180 roofing system is designed and manufactured for waterproofing purposes only- not for any sort of human traffic. If roof will be used for traffic without the installation of protection boards or pavers, the warranty will not be effective.",
      "This roofing system proposed is standard white only, ultra-white will be an upcharge.",
      "Any scaffolding, bridging, forklift, hoisting, boom or cranes needed to complete the job must be provided by GC.",
      "R value and thickness of insulation must be reviewed and approved by GC. Master Roofing doesn't take any responsibility for the R value requirements.",
      "Sale tax will be added to the invoices pertaining to this proposal unless a signed capital improvement document is submitted.",
      "Contract sum is based as per the pricing that we received from our material vendors as on proposal date, any change in the material pricing in the future will be submitted to the GC.",
      "Fence leggings must be installed prior of installing the roofing system.",
      "All wood blocking around parapet walls must be done by GC."
    ],
    ceoName: proposal?.ceoName || "Aron Hirsch",
    signDate: proposal?.signDate || "",
  }

  // Normalize line items to have consistent property names
  const normalizedBaseBid = data.baseBid.map(item => ({
    name: item.name || item.title,
    specs: item.specs || "",
    amount: item.amount,
    description: item.description
  }))

  const baseTotal = normalizedBaseBid.reduce((s, i) => s + (i.amount || 0), 0)
  const altTotal = data.alternates?.reduce((s, i) => s + (i.amount || 0), 0) || 0
  const grandTotal = proposal?.grandTotal || (baseTotal + altTotal)

  // Format sign date
  const formattedSignDate = data.signDate || fmt.date(data.date)

  return (
    <div className="ep-doc" id="proposal-content">
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* PAGE 1 - Header + Summary + Base Bid Items */}
      <div className="ep-page">
        <PageHeader />

        <h1 className="ep-title">Proposal</h1>

        {/* Info Grid - Matching PDF layout exactly */}
        <div className="ep-info-section">
          <div className="ep-info-row">
            <div className="ep-info-left">
              <span className="ep-info-label">Prepared For:</span> {data.gcName}
            </div>
            <div className="ep-info-right">
              <span className="ep-info-label">From:</span> Master Roofing & Siding Inc
            </div>
          </div>
          <div className="ep-info-row">
            <div className="ep-info-left">
              <span className="ep-info-label">Project:</span> {data.projectAddress}
            </div>
            <div className="ep-info-right">
              <span className="ep-info-label">Date:</span> {fmt.date(data.date)}
            </div>
          </div>
          <div className="ep-info-row">
            <div className="ep-info-left">
              <span className="ep-info-label">Date of Drawings:</span> {data.drawingsDate}
            </div>
          </div>
        </div>

        <div className="ep-header-line"></div>

        {/* Project Summary */}
        <div className="ep-summary">
          <h2>Project Summary</h2>
          <p>{data.summary}</p>
        </div>

        {/* Base Bid */}
        <h3 className="ep-section-title">Base Bid:</h3>
        {normalizedBaseBid.map((item, i) => (
          <LineItem key={i} {...item} />
        ))}
      </div>

      {/* PAGE 2 - Continuation + Total */}
      <div className="ep-page">
        <PageHeader />

        {/* Alternates (if any) */}
        {data.alternates?.length > 0 && (
          <>
            <h3 className="ep-section-title" style={{ marginTop: 40 }}>Alternates:</h3>
            {data.alternates.map((item, i) => (
              <LineItem key={i} name={item.name || item.title} specs={item.specs} amount={item.amount} description={item.description} />
            ))}
          </>
        )}

        {/* Grand Total */}
        <div className="ep-grand-total">
          <span>PROPOSAL GRAND TOTAL</span>
          <span>{fmt.currencyFull(grandTotal)}</span>
        </div>
      </div>

      {/* PAGE 3 - Notes & Exclusions */}
      <div className="ep-page">
        <PageHeader />

        <h2 className="ep-page-title">NOTES & EXCLUSIONS:</h2>
        <ul className="ep-exclusions">
          {data.clarifications.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      {/* PAGE 4 - Terms & Conditions */}
      <div className="ep-page">
        <PageHeader />

        <h2 className="ep-page-title">Terms & Conditions</h2>

        <div className="ep-terms">
          <h4>Clean Up</h4>
          <p>Tools and equipment shall be organized and cleaned up on a daily basis. All debris will be removed from the roof and the ground into dumpsters.</p>

          <h4>Insurance</h4>
          <p>Master Roofing will provide general liability and workers comp. insurances certificates for the owners as additionally insured. Current policy to be reviewed by GC or Owner. The pricing in this proposal only includes what Master carries. If Additional insurance coverage is necessary, it is not included in the cost of this proposal. Additional costs to be added under owners and GC expense.</p>

          <h4>Terms of Contract</h4>
          <p>This proposal includes manpower, material necessary to complete all above details.</p>

          <h4>Terms of Contract Payment</h4>
          <p>If you accept this proposal and would like to proceed forward, this is our payment procedure prior to commencement of work: 35% to initiate contract; 35% (at 50% completion of work); 25% (at 85% completion); 5% upon completion of job; other payment terms may be considered. Please sign and date below if you accept this proposal. Keep in mind that only a 35% deposit makes this proposal/contract valid.</p>
        </div>

        <p className="ep-acceptance-note">I UNDERSTAND TERMS, CONDITIONS & DETAILS OF THIS PROPOSAL AND ACCEPT THIS AS A PRE-BINDING CONTRACT</p>

        {/* Signature Section - Table Layout Matching PDF */}
        <div className="ep-sig-box">
          <div className="ep-sig-header">Acceptance of proposal</div>
          <div className="ep-sig-subheader">The above prices, specifications and conditions are satisfactory and are hereby accepted. You are authorized to do the work as specified. Payment will be made as outlined above.</div>

          <div className="ep-sig-table">
            <div className="ep-sig-left">
              <p>All material is guaranteed to be as specified. All work to be completed in a workmanlike manner according to standard practices. Any alterations or deviations from the above specifications involving extra costs will be executed only upon written orders and will become an extra charge over and above the estimate. All agreements contingent upon strikes, accidents or delays beyond our control. Owner's property is fully covered by public liability insurance. Owner to carry fire, wind damage and other necessary insurance. Our workers are fully covered by Workman's Compensation Insurance.</p>
            </div>
            <div className="ep-sig-right">
              <div className="ep-auth-sig">
                <span className="ep-sig-label">Authorized Signature</span>
                <div className="ep-signature-cursive">{data.ceoName}</div>
                <div className="ep-sig-name">{data.ceoName} – CEO {formattedSignDate}</div>
              </div>
              <div className="ep-client-sig">
                <span className="ep-sig-label">Signature</span>
                <div className="ep-sig-line"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ STYLES - Matching 120 Ellery Street PDF EXACTLY ============
const styles = `
.ep-doc {
  font-family: "Arial", "Helvetica", sans-serif;
  color: #1a1a1a;
  font-size: 11px;
  line-height: 1.5;
}

.ep-page {
  width: 816px;
  min-height: 1056px;
  background: #fff;
  padding: 40px 50px;
  margin: 0 auto 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  page-break-after: always;
  box-sizing: border-box;
}

/* Logo - Red stripe + spaced text */
.ep-header {
  margin-bottom: 20px;
}
.ep-logo-container {
  display: flex;
  align-items: center;
}
.ep-logo-stripe {
  width: 28px;
  height: 40px;
  background: #c41e3a;
  transform: skewX(-15deg);
  margin-right: 10px;
}
.ep-logo-text {
  font-size: 13px;
  font-weight: bold;
  letter-spacing: 2.5px;
  color: #1a1a1a;
}

/* Title */
.ep-title {
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 25px;
}

/* Info Section - Two column layout */
.ep-info-section {
  margin-bottom: 10px;
}
.ep-info-row {
  display: flex;
  margin-bottom: 4px;
}
.ep-info-left {
  flex: 1;
}
.ep-info-right {
  flex: 1;
  padding-left: 20px;
}
.ep-info-label {
  font-weight: 700;
}
.ep-header-line {
  border-bottom: 1px solid #999;
  margin: 15px 0 25px;
}

/* Project Summary */
.ep-summary {
  margin-bottom: 20px;
}
.ep-summary h2 {
  font-size: 13px;
  font-weight: 700;
  margin: 0 0 10px;
}
.ep-summary p {
  font-size: 11px;
  line-height: 1.6;
  margin: 0;
  text-align: justify;
}

/* Section Titles */
.ep-section-title {
  font-size: 12px;
  font-weight: 700;
  margin: 20px 0 12px;
}

/* Line Items - Bold title with price right-aligned, description below */
.ep-item {
  margin-bottom: 18px;
}
.ep-item-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 3px;
}
.ep-item-name {
  font-weight: 700;
  font-size: 11px;
}
.ep-item-specs {
  font-weight: 400;
}
.ep-item-amount {
  font-weight: 700;
  font-size: 11px;
}
.ep-item-desc {
  font-size: 11px;
  line-height: 1.55;
  margin: 0;
  text-align: justify;
}

/* Grand Total - Line above, bold text */
.ep-grand-total {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 700;
  margin-top: 35px;
  padding-top: 12px;
  border-top: 1px solid #1a1a1a;
}

/* Page Titles */
.ep-page-title {
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  margin: 35px 0 25px;
}

/* Exclusions List - Square bullets */
.ep-exclusions {
  list-style: none;
  padding: 0;
  margin: 0;
}
.ep-exclusions li {
  position: relative;
  padding-left: 20px;
  margin-bottom: 16px;
  font-size: 11px;
  line-height: 1.55;
}
.ep-exclusions li::before {
  content: '■';
  position: absolute;
  left: 0;
  top: 0;
  font-size: 8px;
}

/* Terms */
.ep-terms h4 {
  font-size: 11px;
  font-weight: 700;
  margin: 18px 0 4px;
}
.ep-terms p {
  font-size: 11px;
  line-height: 1.55;
  margin: 0 0 8px;
  text-align: justify;
}

/* Acceptance Note */
.ep-acceptance-note {
  font-size: 9px;
  font-weight: 700;
  margin: 20px 0 15px;
}

/* Signature Box - Table layout matching PDF */
.ep-sig-box {
  border: 1px solid #333;
}
.ep-sig-header {
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  padding: 8px;
  border-bottom: 1px solid #333;
}
.ep-sig-subheader {
  font-size: 10px;
  text-align: center;
  padding: 8px;
  font-weight: 700;
  border-bottom: 1px solid #333;
}
.ep-sig-table {
  display: flex;
}
.ep-sig-left {
  flex: 1;
  padding: 12px;
  border-right: 1px solid #333;
  font-size: 9px;
  line-height: 1.4;
}
.ep-sig-left p {
  margin: 0;
}
.ep-sig-right {
  flex: 1;
  padding: 12px;
}
.ep-auth-sig {
  margin-bottom: 15px;
}
.ep-sig-label {
  font-size: 10px;
  font-weight: 700;
  display: block;
  margin-bottom: 3px;
}
.ep-signature-cursive {
  font-family: "Brush Script MT", "Segoe Script", cursive;
  font-size: 22px;
  margin: 15px 0 5px;
}
.ep-sig-name {
  font-size: 10px;
  text-align: center;
  margin-bottom: 10px;
}
.ep-client-sig {
  margin-top: 20px;
}
.ep-sig-line {
  border-bottom: 1px solid #333;
  height: 30px;
}

@media print {
  .ep-page {
    margin: 0;
    box-shadow: none;
    page-break-after: always;
  }
}
`

export default ProposalTemplateV2
