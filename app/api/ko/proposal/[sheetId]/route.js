import { NextResponse } from "next/server"
import { readSheetValues } from "@/lib/google-sheets"

/**
 * Fetch proposal data from a Google Sheet
 *
 * Expected Sheet Structure:
 * - Setup tab: Project info (B2=Project Name, B3=Address, B4=GC Name, B5=Amount, B6=Due Date, etc.)
 * - Systems tab: Line items (columns: Name, Specs, Amount, Description)
 * - Proposal tab: Additional proposal settings
 */
export async function GET(request, { params }) {
  try {
    const { sheetId } = await params

    if (!sheetId) {
      return NextResponse.json({ error: "Sheet ID required" }, { status: 400 })
    }

    // Fetch Setup tab data
    const setupData = await readSheetValues(sheetId, "Setup!A1:B20")
    const setupMap = {}
    setupData.forEach(row => {
      if (row[0] && row[1]) {
        setupMap[row[0].toLowerCase().replace(/[:\s]/g, '_')] = row[1]
      }
    })

    // Fetch Systems/Line Items (Base Bid)
    let baseBidItems = []
    try {
      const systemsData = await readSheetValues(sheetId, "Systems!A2:D50")
      baseBidItems = systemsData
        .filter(row => row[0] && row[2]) // Must have name and amount
        .map(row => ({
          name: row[0] || "",
          specs: row[1] || "",
          amount: parseFloat(String(row[2]).replace(/[$,]/g, "")) || 0,
          description: row[3] || "",
        }))
    } catch (e) {
      console.warn("No Systems tab or error reading:", e.message)
    }

    // Fetch Alternates
    let alternates = []
    try {
      const altData = await readSheetValues(sheetId, "Alternates!A2:D20")
      alternates = altData
        .filter(row => row[0] && row[2])
        .map(row => ({
          name: row[0] || "",
          specs: row[1] || "",
          amount: parseFloat(String(row[2]).replace(/[$,]/g, "")) || 0,
          description: row[3] || "",
        }))
    } catch (e) {
      console.warn("No Alternates tab or error reading:", e.message)
    }

    // Fetch Clarifications
    let clarifications = []
    try {
      const clarData = await readSheetValues(sheetId, "Clarifications!A2:A20")
      clarifications = clarData
        .filter(row => row[0])
        .map(row => row[0])
    } catch (e) {
      console.warn("No Clarifications tab:", e.message)
    }

    // Fetch Proposal settings
    let proposalSettings = {}
    try {
      const propData = await readSheetValues(sheetId, "Proposal!A1:B10")
      propData.forEach(row => {
        if (row[0] && row[1]) {
          proposalSettings[row[0].toLowerCase().replace(/[:\s]/g, '_')] = row[1]
        }
      })
    } catch (e) {
      console.warn("No Proposal tab:", e.message)
    }

    // Build proposal object
    const proposal = {
      // From Setup tab
      gc_name: setupMap.gc_name || setupMap.general_contractor || setupMap.prepared_for || "General Contractor",
      project_address: setupMap.project_address || setupMap.address || setupMap.project || "Project Address",
      created_at: setupMap.date || setupMap.proposal_date || new Date().toISOString(),
      date_of_drawings: setupMap.date_of_drawings || setupMap.drawings_date || "TBD",
      addendum: setupMap.addendum || "01",
      version: setupMap.version || proposalSettings.version || "V1",
      supersedes: setupMap.supersedes || proposalSettings.supersedes || "v0",

      // From Proposal tab or Setup
      project_summary: proposalSettings.project_summary || setupMap.project_summary || setupMap.summary ||
        "This project involves the installation of new roofing and waterproofing systems as specified in the line items below.",

      // Line items
      base_bid_items: baseBidItems,
      alternates: alternates,

      // Clarifications (use defaults if none provided)
      clarifications: clarifications.length > 0 ? clarifications : [
        "Containers for garbage must be provided by GC.",
        "All penetrations must be installed prior to installation of roofing system. Any penetrations installed afterwards will be an additional charge per pitch pocket.",
        "This APP 160/180 roofing system is designed and manufactured for waterproofing purposes only- not for any sort of human traffic. If roof will be used for traffic without the installation of protection boards or pavers, the warranty will not be effective.",
        "R value and thickness of insulation must be reviewed and approved by GC. Master Roofing doesn't take any responsibility for the R value requirements.",
        "This roofing system proposed is standard white only, ultra-white will be an upcharge.",
      ],
    }

    return NextResponse.json({
      success: true,
      sheetId,
      proposal,
    })

  } catch (error) {
    console.error("Error fetching proposal from sheet:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch proposal data" },
      { status: 500 }
    )
  }
}
