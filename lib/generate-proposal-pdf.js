import { jsPDF } from "jspdf"

// Default exclusions based on Master Roofing template
export const DEFAULT_EXCLUSIONS = [
  "Containers for garbage must be provided by GC.",
  "All penetrations must be installed prior to installation of roofing system. Any penetration installed afterwards will be an additional charge per pitch pocket.",
  "This APP 160/180 roofing system is designed and manufactured for waterproofing purposes only- not for any sort of human traffic. If roof will be used for traffic without the installation of protection boards or pavers, the warranty will not be effective.",
  "This roofing system proposed is standard white only, ultra-white will be an upcharge.",
  "Any scaffolding, bridging, forklift, hoisting, boom or cranes needed to complete the job must be provided by GC.",
  "R value and thickness of insulation must be reviewed and approved by GC. Master Roofing doesn't take any responsibility for the R value requirements.",
  "Sale tax will be added to the invoices pertaining to this proposal unless a signed capital improvement document is submitted.",
  "Contract sum is based as per the pricing that we received from our material vendors as on proposal date, any change in the material pricing in the future will be submitted to the GC.",
  "Fence leggings must be installed prior of installing the roofing system.",
  "All wood blocking around parapet walls must be done by GC.",
]

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Helper to wrap text and return lines
function wrapText(doc, text, maxWidth) {
  return doc.splitTextToSize(text, maxWidth)
}

export async function generateProposalPDF(data) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 60
  const marginRight = 60
  const contentWidth = pageWidth - marginLeft - marginRight
  let yPos = 50

  const grandTotal = data.lineItems.reduce((sum, item) => sum + item.amount, 0)

  // Helper to check if we need a new page
  const checkNewPage = (neededHeight) => {
    if (yPos + neededHeight > pageHeight - 70) {
      doc.addPage()
      yPos = 50
      return true
    }
    return false
  }

  // ===== PAGE 1: Cover / Summary =====

  yPos = 60

  // "Proposal" title - centered with underline
  doc.setFontSize(22)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  const proposalTitle = "Proposal"
  const titleWidth = doc.getTextWidth(proposalTitle)
  const titleX = (pageWidth - titleWidth) / 2
  doc.text(proposalTitle, titleX, yPos)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(1)
  doc.line(titleX, yPos + 3, titleX + titleWidth, yPos + 3)
  yPos += 40

  // Header info grid - two columns
  const leftColX = marginLeft
  const rightColX = pageWidth / 2 + 20
  const labelStyle = () => {
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "bold")
  }
  const valueStyle = () => {
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "normal")
  }

  // Row 1: Prepared For / From
  labelStyle()
  doc.text("Prepared For:", leftColX, yPos)
  const prepForWidth = doc.getTextWidth("Prepared For:")
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(leftColX, yPos + 2, leftColX + prepForWidth, yPos + 2)

  doc.text("From:", rightColX, yPos)
  const fromWidth = doc.getTextWidth("From:")
  doc.line(rightColX, yPos + 2, rightColX + fromWidth, yPos + 2)

  valueStyle()
  doc.text(data.clientCompany || data.clientName || "Client", leftColX + prepForWidth + 10, yPos)
  doc.text("Master Roofing & Siding Inc", rightColX + fromWidth + 10, yPos)
  yPos += 22

  // Row 2: Project / Date
  labelStyle()
  doc.text("Project:", leftColX, yPos)
  valueStyle()
  doc.text(data.projectName || "Project", leftColX + 80, yPos)

  labelStyle()
  doc.text("Date:", rightColX, yPos)
  valueStyle()
  doc.text(data.date || new Date().toLocaleDateString(), rightColX + fromWidth + 10, yPos)
  yPos += 18

  // Row 3: Date of Drawings
  if (data.drawingsDate) {
    labelStyle()
    doc.text("Date of Drawings:", leftColX, yPos)
    valueStyle()
    doc.text(data.drawingsDate, leftColX + 100, yPos)
  }
  yPos += 40

  // Project Summary
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.text("Project Summary", marginLeft, yPos)
  yPos += 18

  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "normal")
  const summaryLines = wrapText(doc, data.summary || "", contentWidth)
  summaryLines.forEach((line) => {
    checkNewPage(14)
    doc.text(line, marginLeft, yPos, { align: "justify", maxWidth: contentWidth })
    yPos += 14
  })
  yPos += 25

  // Base Bid
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.text("Base Bid:", marginLeft, yPos)
  yPos += 20

  ;(data.lineItems || []).forEach((item) => {
    const descLines = wrapText(doc, item.description || "", contentWidth)
    const itemHeight = 20 + descLines.length * 13 + 25

    checkNewPage(itemHeight)

    // Item title (bold) and amount on same line - all black
    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "bold")
    doc.text(item.title || "Item", marginLeft, yPos)
    doc.text(formatCurrency(item.amount || 0), pageWidth - marginRight, yPos, { align: "right" })
    yPos += 14

    // Description (normal, justified)
    doc.setFontSize(9)
    doc.setTextColor(60, 60, 60)
    doc.setFont("helvetica", "normal")
    descLines.forEach((line) => {
      doc.text(line, marginLeft, yPos, { align: "justify", maxWidth: contentWidth })
      yPos += 13
    })

    yPos += 22
  })

  // Grand Total line
  checkNewPage(60)
  yPos += 15
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(1)
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos)
  yPos += 25

  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.text("PROPOSAL GRAND TOTAL", marginLeft, yPos)
  doc.text(formatCurrency(grandTotal), pageWidth - marginRight, yPos, { align: "right" })

  // ===== PAGE 2: Notes & Exclusions =====
  doc.addPage()
  yPos = 50

  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.text("NOTES & EXCLUSIONS:", marginLeft, yPos)
  yPos += 22

  ;(data.exclusions || DEFAULT_EXCLUSIONS).forEach((exclusion) => {
    const lines = wrapText(doc, exclusion, contentWidth - 15)
    const itemHeight = lines.length * 13 + 8

    checkNewPage(itemHeight)

    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "normal")

    // Bullet point
    doc.text("•", marginLeft, yPos)

    lines.forEach((line, i) => {
      doc.text(line, marginLeft + 12, yPos + i * 13, { align: "justify", maxWidth: contentWidth - 15 })
    })
    yPos += lines.length * 13 + 6
  })

  // ===== PAGE 3: Terms & Conditions =====
  doc.addPage()
  yPos = 50

  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "bold")
  doc.text("Terms & Conditions", marginLeft, yPos)
  yPos += 22

  const terms = [
    {
      title: "Clean Up",
      text: "Tools and equipment shall be organized and cleaned up on a daily basis. All debris will be removed from the roof and the ground into dumpsters.",
    },
    {
      title: "Insurance",
      text: "Master Roofing will provide general liability and workers comp. insurances certificates for the owners as additionally insured. Current policy to be reviewed by GC or Owner. The pricing in this proposal only includes what Master carries. If Additional insurance coverage is necessary, it is not included in the cost of this proposal. Additional costs to be added under owners and GC expense.",
    },
    {
      title: "Terms of Contract",
      text: "This proposal includes manpower, material necessary to complete all above details.",
    },
    {
      title: "Terms of Contract Payment",
      text: "If you accept this proposal and would like to proceed forward, this is our payment procedure prior to commencement of work: 35% to initiate contract; 35% (at 50% completion of work); 25% (at 85% completion); 5% upon completion of job; other payment terms may be considered. Please sign and date below if you accept this proposal. Keep in mind that only a 35% deposit makes this proposal/contract valid.",
    },
  ]

  terms.forEach((term) => {
    const lines = wrapText(doc, term.text, contentWidth)
    const itemHeight = 18 + lines.length * 13

    checkNewPage(itemHeight)

    doc.setFontSize(10)
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "bold")
    doc.text(term.title, marginLeft, yPos)
    yPos += 14

    doc.setFontSize(9)
    doc.setTextColor(0, 0, 0)
    doc.setFont("helvetica", "normal")
    lines.forEach((line) => {
      doc.text(line, marginLeft, yPos, { align: "justify", maxWidth: contentWidth })
      yPos += 13
    })
    yPos += 10
  })

  // Signature Section
  checkNewPage(220)
  yPos += 25

  // Separator line
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.5)
  doc.line(marginLeft, yPos, pageWidth - marginRight, yPos)
  yPos += 18

  // Acceptance text (italic, centered)
  doc.setFontSize(8)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "italic")
  const acceptText =
    "I UNDERSTAND TERMS, CONDITIONS & DETAILS OF THIS PROPOSAL AND ACCEPT THIS AS A PRE-BINDING CONTRACT"
  doc.text(acceptText, pageWidth / 2, yPos, { align: "center" })
  yPos += 18

  // Acceptance header
  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.text("Acceptance of proposal", marginLeft, yPos)
  yPos += 14

  // Acceptance paragraph
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  const acceptanceText =
    "The above prices, specifications and conditions are satisfactory and are hereby accepted. You are authorized to do the work as specified. Payment will be made as outlined above. All material is guaranteed to be as specified. All work to be completed in a workmanlike manner according to standard practices. Any alterations or deviations from the above specifications involving extra costs will be executed only upon written orders and will become an extra charge over and above the estimate. All agreements contingent upon strikes, accidents or delays beyond our control. Owner's property is fully covered by public liability insurance. Owner to carry fire, wind damage and other necessary insurance. Our workers are fully covered by Workman's Compensation Insurance."
  const acceptLines = wrapText(doc, acceptanceText, contentWidth)
  acceptLines.forEach((line) => {
    doc.text(line, marginLeft, yPos, { align: "justify", maxWidth: contentWidth })
    yPos += 11
  })
  yPos += 30

  // Signature boxes - two columns
  const sigBoxWidth = (contentWidth - 50) / 2

  // Labels
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.setFont("helvetica", "normal")
  doc.text("Authorized Signature", marginLeft, yPos)
  doc.text("Client Signature", marginLeft + sigBoxWidth + 50, yPos)
  yPos += 30

  // Signature lines
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.5)
  doc.line(marginLeft, yPos, marginLeft + sigBoxWidth, yPos)
  doc.line(marginLeft + sigBoxWidth + 50, yPos, pageWidth - marginRight, yPos)
  yPos += 14

  // Names under signature lines
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.setFont("helvetica", "normal")
  doc.text(`${data.ceoName || "Aron Hirsch"} – ${data.ceoTitle || "CEO"}    ${data.date || ""}`, marginLeft, yPos)
  doc.text("Signature", marginLeft + sigBoxWidth + 50, yPos)

  // Add page numbers
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.setFont("helvetica", "normal")
    doc.text(`${i} / ${totalPages}`, pageWidth - marginRight, pageHeight - 30, { align: "right" })
  }

  return doc
}

export async function downloadProposalPDF(data) {
  const doc = await generateProposalPDF(data)
  const projectName = data.projectName || "Project"
  doc.save(`Proposal_${projectName.replace(/\s+/g, "-")}.pdf`)
}
