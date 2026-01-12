import { NextResponse } from "next/server"
import { createProjectSheet, shareSheet, batchUpdateSheet } from "@/lib/google-sheets"

// Mock projects data - In production, this would fetch from HubSpot or BigQuery
const MOCK_PROJECTS = [
  {
    id: "proj-001",
    name: "307 Beach 67th Street",
    address: "307 Beach 67th Street, Brooklyn, NY",
    gc_id: "gc-mjh",
    gc_name: "MJH Construction Corp",
    amount: 300309,
    due_date: "2025-10-27",
    status: "estimating",
    sheet_id: null,
  },
  {
    id: "proj-002",
    name: "1086 Dumont Ave",
    address: "1086 Dumont Ave, Brooklyn, NY",
    gc_id: "gc-bluesky",
    gc_name: "Blue Sky Builders",
    amount: 156000,
    due_date: "2025-11-15",
    status: "proposal_sent",
    sheet_id: null,
  },
  {
    id: "proj-003",
    name: "960 Franklin Ave",
    address: "960 Franklin Ave, Brooklyn, NY",
    gc_id: "gc-apex",
    gc_name: "Apex Construction",
    amount: 425000,
    due_date: "2025-09-30",
    status: "won",
    sheet_id: null,
  },
  {
    id: "proj-004",
    name: "245 Park Avenue",
    address: "245 Park Avenue, Manhattan, NY",
    gc_id: "gc-turner",
    gc_name: "Turner Construction",
    amount: 1250000,
    due_date: "2025-12-15",
    status: "estimating",
    sheet_id: null,
  },
  {
    id: "proj-005",
    name: "500 Fifth Avenue",
    address: "500 Fifth Avenue, Manhattan, NY",
    gc_id: "gc-skanska",
    gc_name: "Skanska USA",
    amount: 875000,
    due_date: "2025-11-30",
    status: "proposal_sent",
    sheet_id: null,
  },
]

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    let projects = [...MOCK_PROJECTS]

    // Filter by status if provided
    if (status && status !== "all") {
      projects = projects.filter(p => p.status === status)
    }

    // Filter by search query if provided
    if (search) {
      const query = search.toLowerCase()
      projects = projects.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.address?.toLowerCase().includes(query) ||
        p.gc_name?.toLowerCase().includes(query)
      )
    }

    return NextResponse.json({
      projects,
      total: projects.length,
    })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    )
  }
}

// Create a new project with auto-generated Google Sheet
export async function POST(request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name || !body.gc_name) {
      return NextResponse.json(
        { error: "Name and GC name are required" },
        { status: 400 }
      )
    }

    const projectId = `proj-${Date.now()}`
    let sheetId = null
    let sheetUrl = null
    let sheetError = null

    // Auto-create Google Sheet if configured
    const isGoogleConfigured = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SHEET_TEMPLATE_ID

    if (isGoogleConfigured && body.createSheet !== false) {
      try {
        const sheetResult = await createProjectSheet(body.name, body.gc_name)
        sheetId = sheetResult.sheetId
        sheetUrl = sheetResult.sheetUrl

        // Make the sheet publicly viewable
        try {
          await shareSheet(sheetId, 'reader')
        } catch (shareError) {
          console.warn("Failed to share sheet:", shareError)
        }

        // Populate the Setup tab with project info
        const setupData = []
        if (body.name) {
          setupData.push({ range: "Setup!B2", values: [[body.name]] })
        }
        if (body.address) {
          setupData.push({ range: "Setup!B3", values: [[body.address]] })
        }
        if (body.gc_name) {
          setupData.push({ range: "Setup!B4", values: [[body.gc_name]] })
        }
        if (body.amount) {
          setupData.push({ range: "Setup!B5", values: [[body.amount]] })
        }
        if (body.due_date) {
          setupData.push({ range: "Setup!B6", values: [[body.due_date]] })
        }

        if (setupData.length > 0) {
          try {
            await batchUpdateSheet(sheetId, setupData)
          } catch (updateError) {
            console.warn("Failed to populate Setup tab:", updateError)
          }
        }
      } catch (error) {
        console.error("Error creating Google Sheet:", error)
        sheetError = error.message
        // Don't fail project creation if sheet creation fails
      }
    }

    // Create the project record
    const newProject = {
      id: projectId,
      name: body.name,
      address: body.address || body.name,
      gc_id: body.gc_id || `gc-${Date.now()}`,
      gc_name: body.gc_name,
      amount: body.amount || 0,
      due_date: body.due_date || null,
      status: body.status || "estimating",
      sheet_id: sheetId,
      sheet_url: sheetUrl,
    }

    // In production, save to HubSpot/BigQuery here

    return NextResponse.json({
      success: true,
      project: newProject,
      ...(sheetError && { sheetError }),
    })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}
