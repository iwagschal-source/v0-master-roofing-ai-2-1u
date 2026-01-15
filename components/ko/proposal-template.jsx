"use client"

/**
 * Proposal Template - 120 Ellery Street Format
 * Clean, professional layout matching the reference PDF exactly
 */

const fmt = {
  currency: (n) => n == null ? "$0" : `$${Math.abs(n).toLocaleString()}`,
  currencyFull: (n) => n == null ? "$0.00" : `$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  date: (d) => {
    if (!d) return ""
    const date = new Date(d)
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  },
  shortDate: (d) => {
    if (!d) return ""
    const date = new Date(d)
    return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
  }
}

function Logo() {
  return (
    <div className="mr-logo">
      <div className="mr-logo-stripe"></div>
      <span className="mr-logo-text">M A S T E R R O O F I N G</span>
    </div>
  )
}

function LineItem({ name, specs, amount, description }) {
  return (
    <div className="mr-item">
      <div className="mr-item-header">
        <span className="mr-item-title">
          {name}{specs ? ` – ${specs}` : ""}
        </span>
        <span className="mr-item-price">{fmt.currency(amount)}</span>
      </div>
      {description && <p className="mr-item-desc">{description}</p>}
    </div>
  )
}

export function ProposalTemplate({ project, proposal }) {
  const data = {
    gcName: project?.gc_name || proposal?.gc_name || proposal?.preparedFor || "",
    projectAddress: project?.address || proposal?.project_address || proposal?.project || "Project Address",
    date: proposal?.created_at || proposal?.date || new Date().toISOString(),
    drawingsDate: proposal?.date_of_drawings || proposal?.drawingsDate || "",
    summary: proposal?.project_summary || proposal?.summary || "",
    baseBid: proposal?.base_bid_items || proposal?.lineItems || [],
    alternates: proposal?.alternates || [],
    clarifications: proposal?.clarifications || proposal?.notes || defaultNotes,
    ceoName: proposal?.ceoName || "Aron Hirsch",
    signDate: proposal?.signDate || "",
  }

  const normalizedBaseBid = data.baseBid.map(item => ({
    name: item.name || item.title,
    specs: item.specs || "",
    amount: item.amount,
    description: item.description
  }))

  const baseTotal = normalizedBaseBid.reduce((s, i) => s + (i.amount || 0), 0)
  const altTotal = data.alternates?.reduce((s, i) => s + (i.amount || 0), 0) || 0
  const grandTotal = proposal?.grandTotal || (baseTotal + altTotal)
  const formattedSignDate = data.signDate || fmt.shortDate(data.date)

  return (
    <div className="mr-doc" id="proposal-content">
      <style dangerouslySetInnerHTML={{ __html: styles }} />

      {/* PAGE 1: Header + Summary + Base Bid */}
      <div className="mr-page">
        <Logo />
        <h1 className="mr-title">Proposal</h1>

        <div className="mr-header-info">
          <div className="mr-header-row">
            <div className="mr-header-left"><strong>Prepared For:</strong> {data.gcName}</div>
            <div className="mr-header-right"><strong>From:</strong> Master Roofing & Siding Inc</div>
          </div>
          <div className="mr-header-row">
            <div className="mr-header-left"><strong>Project:</strong> {data.projectAddress}</div>
            <div className="mr-header-right"><strong>Date:</strong> {fmt.date(data.date)}</div>
          </div>
          <div className="mr-header-row">
            <div className="mr-header-left"><strong>Date of Drawings:</strong> {data.drawingsDate}</div>
          </div>
        </div>

        <hr className="mr-divider" />

        <div className="mr-summary">
          <h2>Project Summary</h2>
          <p>{data.summary}</p>
        </div>

        <h3 className="mr-section-title">Base Bid:</h3>
        {normalizedBaseBid.map((item, i) => (
          <LineItem key={i} {...item} />
        ))}
      </div>

      {/* PAGE 2: Alternates + Grand Total */}
      <div className="mr-page">
        <Logo />

        {data.alternates?.length > 0 && (
          <>
            <h3 className="mr-section-title" style={{ marginTop: 30 }}>Alternates:</h3>
            {data.alternates.map((item, i) => (
              <LineItem key={i} name={item.name || item.title} specs={item.specs} amount={item.amount} description={item.description} />
            ))}
          </>
        )}

        <div className="mr-grand-total">
          <span>PROPOSAL GRAND TOTAL</span>
          <span>{fmt.currencyFull(grandTotal)}</span>
        </div>
      </div>

      {/* PAGE 3: Notes & Exclusions */}
      <div className="mr-page">
        <Logo />
        <h2 className="mr-page-title">NOTES & EXCLUSIONS:</h2>
        <ul className="mr-notes-list">
          {data.clarifications.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>

      {/* PAGE 4: Terms & Conditions */}
      <div className="mr-page">
        <Logo />
        <h2 className="mr-page-title">Terms & Conditions</h2>

        <div className="mr-terms">
          <h4>Clean Up</h4>
          <p>Tools and equipment shall be organized and cleaned up on a daily basis. All debris will be removed from the roof and the ground into dumpsters.</p>

          <h4>Insurance</h4>
          <p>Master Roofing will provide general liability and workers comp. insurances certificates for the owners as additionally insured. Current policy to be reviewed by GC or Owner. The pricing in this proposal only includes what Master carries. If Additional insurance coverage is necessary, it is not included in the cost of this proposal. Additional costs to be added under owners and GC expense.</p>

          <h4>Terms of Contract</h4>
          <p>This proposal includes manpower, material necessary to complete all above details.</p>

          <h4>Terms of Contract Payment</h4>
          <p>If you accept this proposal and would like to proceed forward, this is our payment procedure prior to commencement of work: 35% to initiate contract; 35% (at 50% completion of work); 25% (at 85% completion); 5% upon completion of job; other payment terms may be considered. Please sign and date below if you accept this proposal. Keep in mind that only a 35% deposit makes this proposal/contract valid.</p>
        </div>

        <p className="mr-acceptance-statement">I UNDERSTAND TERMS, CONDITIONS & DETAILS OF THIS PROPOSAL AND ACCEPT THIS AS A PRE-BINDING CONTRACT</p>

        <div className="mr-signature-box">
          <div className="mr-sig-header">Acceptance of proposal</div>
          <div className="mr-sig-subheader">The above prices, specifications and conditions are satisfactory and are hereby accepted. You are authorized to do the work as specified. Payment will be made as outlined above.</div>
          <div className="mr-sig-content">
            <div className="mr-sig-left">
              <p>All material is guaranteed to be as specified. All work to be completed in a workmanlike manner according to standard practices. Any alterations or deviations from the above specifications involving extra costs will be executed only upon written orders and will become an extra charge over and above the estimate. All agreements contingent upon strikes, accidents or delays beyond our control. Owner's property is fully covered by public liability insurance. Owner to carry fire, wind damage and other necessary insurance. Our workers are fully covered by Workman's Compensation Insurance.</p>
            </div>
            <div className="mr-sig-right">
              <div className="mr-auth-section">
                <span className="mr-sig-label">Authorized Signature</span>
                <div className="mr-signature-script">{data.ceoName}</div>
                <div className="mr-sig-name">{data.ceoName} – CEO {formattedSignDate}</div>
              </div>
              <div className="mr-client-section">
                <span className="mr-sig-label">Signature</span>
                <div className="mr-sig-line"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const defaultNotes = [
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
]

const styles = `
.mr-doc {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  color: #1a1a1a;
  line-height: 1.5;
}

.mr-page {
  width: 816px;
  min-height: 1056px;
  background: #fff;
  padding: 40px 50px;
  margin: 0 auto 20px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  box-sizing: border-box;
  page-break-after: always;
}

/* Logo */
.mr-logo {
  display: flex;
  align-items: center;
  margin-bottom: 25px;
}
.mr-logo-stripe {
  width: 28px;
  height: 42px;
  background: #c41e3a;
  transform: skewX(-15deg);
  margin-right: 10px;
}
.mr-logo-text {
  font-size: 14px;
  font-weight: bold;
  letter-spacing: 2.5px;
}

/* Title */
.mr-title {
  text-align: center;
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 25px;
}

/* Header Info */
.mr-header-info {
  margin-bottom: 10px;
}
.mr-header-row {
  display: flex;
  margin-bottom: 4px;
}
.mr-header-left {
  flex: 1;
}
.mr-header-right {
  flex: 1;
  padding-left: 20px;
}
.mr-divider {
  border: none;
  border-top: 1px solid #999;
  margin: 15px 0 25px;
}

/* Summary */
.mr-summary h2 {
  font-size: 13px;
  font-weight: bold;
  margin: 0 0 10px;
}
.mr-summary p {
  text-align: justify;
  line-height: 1.6;
  margin: 0 0 20px;
}

/* Section Title */
.mr-section-title {
  font-size: 12px;
  font-weight: bold;
  margin: 20px 0 12px;
}

/* Line Items */
.mr-item {
  margin-bottom: 18px;
}
.mr-item-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
}
.mr-item-title {
  font-weight: bold;
}
.mr-item-price {
  font-weight: bold;
}
.mr-item-desc {
  text-align: justify;
  line-height: 1.55;
  margin: 0;
}

/* Grand Total */
.mr-grand-total {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  font-weight: bold;
  margin-top: 35px;
  padding-top: 12px;
  border-top: 1px solid #1a1a1a;
}

/* Page Title */
.mr-page-title {
  text-align: center;
  font-size: 14px;
  font-weight: bold;
  margin: 35px 0 25px;
}

/* Notes List */
.mr-notes-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.mr-notes-list li {
  position: relative;
  padding-left: 20px;
  margin-bottom: 16px;
  line-height: 1.55;
}
.mr-notes-list li::before {
  content: '■';
  position: absolute;
  left: 0;
  top: 0;
  font-size: 8px;
}

/* Terms */
.mr-terms h4 {
  font-size: 11px;
  font-weight: bold;
  margin: 18px 0 4px;
}
.mr-terms p {
  text-align: justify;
  line-height: 1.55;
  margin: 0 0 8px;
}

/* Acceptance Statement */
.mr-acceptance-statement {
  font-size: 9px;
  font-weight: bold;
  margin: 20px 0 15px;
}

/* Signature Box */
.mr-signature-box {
  border: 1px solid #333;
}
.mr-sig-header {
  text-align: center;
  font-size: 13px;
  font-weight: bold;
  padding: 8px;
  border-bottom: 1px solid #333;
}
.mr-sig-subheader {
  text-align: center;
  font-size: 10px;
  font-weight: bold;
  padding: 8px;
  border-bottom: 1px solid #333;
}
.mr-sig-content {
  display: flex;
}
.mr-sig-left {
  flex: 1;
  padding: 12px;
  border-right: 1px solid #333;
  font-size: 9px;
  line-height: 1.4;
}
.mr-sig-left p {
  margin: 0;
}
.mr-sig-right {
  flex: 1;
  padding: 12px;
}
.mr-auth-section {
  margin-bottom: 15px;
}
.mr-sig-label {
  font-size: 10px;
  font-weight: bold;
  display: block;
}
.mr-signature-script {
  font-family: "Brush Script MT", "Segoe Script", cursive;
  font-size: 24px;
  margin: 15px 0 5px;
}
.mr-sig-name {
  font-size: 10px;
  text-align: center;
}
.mr-client-section {
  margin-top: 25px;
}
.mr-sig-line {
  border-bottom: 1px solid #333;
  height: 30px;
}

@media print {
  .mr-page {
    margin: 0;
    box-shadow: none;
    page-break-after: always;
  }
}
`

export default ProposalTemplate
