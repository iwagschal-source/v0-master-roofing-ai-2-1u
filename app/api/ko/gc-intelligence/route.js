import { NextResponse } from "next/server"

// Mock GC data - In production, this would fetch from BigQuery
const MOCK_GC_DATA = {
  "gc-mjh": {
    name: "MJH Construction Corp",
    total_projects: 12,
    won_projects: 8,
    win_rate: 67,
    avg_project_size: 285000,
    preferred_systems: ["APP 160/180", "TPO", "EIFS"],
    payment_status: "Good standing",
  },
  "gc-bluesky": {
    name: "Blue Sky Builders",
    total_projects: 8,
    won_projects: 3,
    win_rate: 38,
    avg_project_size: 165000,
    preferred_systems: ["TPO", "Metal Roofing"],
    payment_status: "Good standing",
  },
  "gc-apex": {
    name: "Apex Construction",
    total_projects: 15,
    won_projects: 9,
    win_rate: 60,
    avg_project_size: 420000,
    preferred_systems: ["APP 160/180", "EIFS", "Metal Panels"],
    payment_status: "Good standing",
  },
  "gc-turner": {
    name: "Turner Construction",
    total_projects: 25,
    won_projects: 10,
    win_rate: 40,
    avg_project_size: 1500000,
    preferred_systems: ["TPO", "Green Roof", "Metal Roofing"],
    payment_status: "Good standing",
  },
  "gc-skanska": {
    name: "Skanska USA",
    total_projects: 18,
    won_projects: 7,
    win_rate: 39,
    avg_project_size: 950000,
    preferred_systems: ["TPO", "EPDM", "Metal Panels"],
    payment_status: "Good standing",
  },
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const gcId = searchParams.get("gcId")
    const gcName = searchParams.get("gcName")

    if (!gcId && !gcName) {
      return NextResponse.json(
        { error: "gcId or gcName is required" },
        { status: 400 }
      )
    }

    // Try to find by ID first
    let gcData = gcId ? MOCK_GC_DATA[gcId] : null

    // If not found by ID, try to find by name
    if (!gcData && gcName) {
      const normalizedName = gcName.toLowerCase()
      gcData = Object.values(MOCK_GC_DATA).find(
        gc => gc.name.toLowerCase() === normalizedName ||
              gc.name.toLowerCase().includes(normalizedName)
      )
    }

    if (!gcData) {
      // Return default data for unknown GCs
      return NextResponse.json({
        name: gcName || "Unknown GC",
        total_projects: 0,
        won_projects: 0,
        win_rate: 0,
        avg_project_size: 0,
        preferred_systems: [],
        payment_status: "Unknown",
      })
    }

    return NextResponse.json(gcData)
  } catch (error) {
    console.error("Error fetching GC intelligence:", error)
    return NextResponse.json(
      { error: "Failed to fetch GC intelligence" },
      { status: 500 }
    )
  }
}
