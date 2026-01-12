import { NextResponse } from "next/server"

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

// In production, this would create a new project
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

    // Mock creating a new project
    const newProject = {
      id: `proj-${Date.now()}`,
      name: body.name,
      address: body.address || body.name,
      gc_id: body.gc_id || `gc-${Date.now()}`,
      gc_name: body.gc_name,
      amount: body.amount || 0,
      due_date: body.due_date || null,
      status: body.status || "estimating",
      sheet_id: null,
    }

    return NextResponse.json({
      success: true,
      project: newProject,
    })
  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}
