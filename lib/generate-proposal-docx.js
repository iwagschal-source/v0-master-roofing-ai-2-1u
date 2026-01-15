import Docxtemplater from "docxtemplater"
import PizZip from "pizzip"

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Generates a filled DOCX proposal from the Master Roofing template
 * @param {ArrayBuffer} templateBuffer - The template DOCX file as ArrayBuffer
 * @param {Object} data - The proposal data
 * @returns {Blob} - The filled DOCX as a Blob
 */
export function generateProposalDocx(templateBuffer, data) {
  const zip = new PizZip(templateBuffer)

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  // Calculate grand total
  const grandTotal = (data.lineItems || []).reduce((sum, item) => sum + (item.amount || 0), 0)

  // Prepare line items array for loop
  const line_items = (data.lineItems || []).map(item => ({
    title: item.title || "",
    description: item.description || "",
    price: formatCurrency(item.amount || 0),
  }))

  // Set template data
  doc.setData({
    // Header fields
    prepared_for: data.clientCompany || data.clientName || "",
    project_name: data.projectName || "",
    drawings_date: data.drawingsDate || "",
    proposal_date: data.date || new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    }),

    // Project summary
    project_summary: data.summary || "",

    // Line items array - works with {#line_items}...{/line_items} loop
    line_items,

    // Grand total
    grand_total: formatCurrency(grandTotal),

    // Signature
    signer_name: data.ceoName || "Aron Hirsch",
    signer_title: data.ceoTitle || "CEO",
    signature_date: data.date || new Date().toLocaleDateString(),
  })

  // Render the document
  doc.render()

  // Generate output
  const out = doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  })

  return out
}

/**
 * Downloads the filled proposal as a DOCX file
 * @param {Object} data - The proposal data
 */
export async function downloadProposalDocx(data) {
  // Fetch the template
  const templateResponse = await fetch("/templates/proposal-template.docx")
  if (!templateResponse.ok) {
    throw new Error("Failed to load proposal template")
  }

  const templateBuffer = await templateResponse.arrayBuffer()
  const blob = generateProposalDocx(templateBuffer, data)

  // Download
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `Proposal_${(data.projectName || "Project").replace(/\s+/g, "-")}.docx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
