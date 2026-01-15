/**
 * Proposal Generator API
 *
 * Generates a proposal from project data, GC history, and takeoff information.
 * Uses GC preferences and historical rates to create accurate proposals.
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.116.243.70'

/**
 * GET /api/ko/proposal/generate
 * Generate a proposal from project data
 *
 * Query params:
 * - projectId: The project ID
 * - gcName: The GC name
 * - projectName: The project name/address
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const gcName = searchParams.get('gcName')
  const projectName = searchParams.get('projectName')

  if (!gcName && !projectName) {
    return NextResponse.json(
      { error: 'gcName or projectName is required' },
      { status: 400 }
    )
  }

  try {
    // Try to fetch from backend first
    try {
      const params = new URLSearchParams()
      if (projectId) params.append('projectId', projectId)
      if (gcName) params.append('gcName', gcName)
      if (projectName) params.append('projectName', projectName)

      const backendRes = await fetch(`${BACKEND_URL}/api/proposal/generate?${params}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      })

      if (backendRes.ok) {
        const data = await backendRes.json()
        return NextResponse.json({
          success: true,
          proposal: data.proposal,
          source: 'backend'
        })
      }
    } catch (err) {
      console.log('Backend not available for proposal generation, using mock data')
    }

    // Generate mock proposal based on inputs
    const proposal = generateMockProposal(projectId, gcName, projectName)

    return NextResponse.json({
      success: true,
      proposal,
      source: 'mock'
    })

  } catch (err) {
    console.error('Error generating proposal:', err)
    return NextResponse.json(
      { error: 'Failed to generate proposal: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * Generate a mock proposal with realistic data
 */
function generateMockProposal(projectId, gcName, projectName) {
  const today = new Date()
  const dueDate = new Date(today)
  dueDate.setDate(dueDate.getDate() + 14)

  // Base bid items - typical roofing project
  const baseBidItems = [
    {
      name: "Built-Up Roofing – Firestone APP 160/180 System",
      specs: "R-30 6\"",
      amount: 42500,
      description: "Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads. Two-ply APP 160 base sheet with APP 180 cap sheet fully adhered."
    },
    {
      name: "Aluminum Coping System",
      specs: "18\" face",
      amount: 8200,
      description: "Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. .050 aluminum coping with continuous cleats, installed over anchored plates. All corners factory mitered."
    },
    {
      name: "Aluminum Counter Flashing",
      specs: ".040 gauge",
      amount: 5400,
      description: "Install two-piece aluminum counter flashing with surface-mount reglet. Flash overlapping roofing membrane minimum 4\". Seal all joints with compatible sealant."
    },
    {
      name: "Roof Drains",
      specs: "4\" diameter",
      amount: 1800,
      description: "Supply and install new roof drains with clamping rings, lead flashings, and strainer domes. Connect to existing drain lines. Quantity: 4 ea."
    }
  ]

  // Calculate base bid total
  const baseBidTotal = baseBidItems.reduce((sum, item) => sum + item.amount, 0)

  // Alternates
  const alternates = [
    {
      name: "Premium Insulation Upgrade",
      specs: "R-38 7.5\"",
      amount: 6500,
      description: "Upgrade from R-30 to R-38 insulation for enhanced energy efficiency. Includes additional tapered insulation for improved drainage."
    },
    {
      name: "Walkway Pads",
      specs: "30\" wide",
      amount: 3200,
      description: "Install protection walkway pads at high-traffic areas and equipment access routes. Approximately 200 LF."
    }
  ]

  // Standard clarifications
  const clarifications = [
    "Containers for garbage must be provided by GC.",
    "All penetrations must be installed prior to installation of roofing system. Any penetrations installed afterwards will be an additional charge per pitch pocket.",
    "This APP 160/180 roofing system is designed and manufactured for waterproofing purposes only - not for any sort of human traffic. If roof will be used for traffic without the installation of protection boards or pavers, the warranty will not be effective.",
    "R value and thickness of insulation must be reviewed and approved by GC. Master Roofing doesn't take any responsibility for the R value requirements.",
    "This roofing system proposed is standard white only, ultra-white will be an upcharge.",
    "Pricing is based on normal working hours. Overtime or weekend work will be billed at premium rates.",
    "Exclusions: Structural repairs, electrical work, HVAC modifications, permits and fees unless noted."
  ]

  return {
    gc_name: gcName || "General Contractor",
    project_address: projectName || "Project Address",
    created_at: today.toISOString(),
    date_of_drawings: "TBD",
    addendum: "01",
    version: "V1",
    supersedes: "N/A - Initial Proposal",
    project_summary: `This proposal covers the complete roof replacement at ${projectName || 'the subject property'}. The scope includes removal of existing roofing system to the deck, installation of new Firestone APP 160/180 modified bitumen roofing system with tapered insulation for proper drainage, aluminum coping and flashing at all parapets, and new roof drains. All work to be performed per manufacturer specifications with a 20-year NDL warranty.`,
    base_bid_items: baseBidItems,
    alternates: alternates,
    clarifications: clarifications,
    total_base_bid: baseBidTotal,
    total_alternates: alternates.reduce((sum, item) => sum + item.amount, 0)
  }
}

/**
 * POST /api/ko/proposal/generate
 * Generate a proposal with custom line items
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, gcName, projectName, takeoffItems, customItems } = body

    if (!gcName && !projectName) {
      return NextResponse.json(
        { error: 'gcName or projectName is required' },
        { status: 400 }
      )
    }

    // Try backend first
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/proposal/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000)
      })

      if (backendRes.ok) {
        const data = await backendRes.json()
        return NextResponse.json({
          success: true,
          proposal: data.proposal,
          source: 'backend'
        })
      }
    } catch (err) {
      console.log('Backend not available for custom proposal generation')
    }

    // Generate proposal from provided data
    const today = new Date()

    // Convert takeoff items to proposal line items if provided
    let baseBidItems = []
    if (takeoffItems && takeoffItems.length > 0) {
      baseBidItems = takeoffItems.map(item => ({
        name: item.item_name || item.name,
        specs: item.specs || `${item.quantity} ${item.unit}`,
        amount: item.total || (item.quantity * (item.rate || 10)),
        description: item.description || ''
      }))
    } else if (customItems && customItems.length > 0) {
      baseBidItems = customItems
    } else {
      // Use default items
      baseBidItems = generateMockProposal(projectId, gcName, projectName).base_bid_items
    }

    const proposal = {
      gc_name: gcName || "General Contractor",
      project_address: projectName || "Project Address",
      created_at: today.toISOString(),
      date_of_drawings: body.drawingsDate || "TBD",
      addendum: body.addendum || "01",
      version: body.version || "V1",
      supersedes: body.supersedes || "N/A",
      project_summary: body.projectSummary || `Roofing and waterproofing proposal for ${projectName || 'the subject property'}.`,
      base_bid_items: baseBidItems,
      alternates: body.alternates || [],
      clarifications: body.clarifications || generateMockProposal(null, null, null).clarifications,
      total_base_bid: baseBidItems.reduce((sum, item) => sum + (item.amount || 0), 0)
    }

    return NextResponse.json({
      success: true,
      proposal,
      source: 'local'
    })

  } catch (err) {
    console.error('Error generating custom proposal:', err)
    return NextResponse.json(
      { error: 'Failed to generate proposal: ' + err.message },
      { status: 500 }
    )
  }
}
