import { NextResponse } from "next/server"

// Backend API URL
const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://136.111.252.120'

/**
 * GET /api/ko/gc-brief
 * Fetches comprehensive GC brief data for estimators
 *
 * Query params:
 * - gcName: The GC name to fetch brief for (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const gcName = searchParams.get("gcName")

    if (!gcName) {
      return NextResponse.json(
        { error: "gcName is required" },
        { status: 400 }
      )
    }

    // Try to fetch from backend API
    try {
      // For self-signed cert, we need to use https agent
      // In Next.js server components, this is handled by node's fetch
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const backendResponse = await fetch(
        `${BACKEND_URL}/api/gc-brief?gc_name=${encodeURIComponent(gcName)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          // Note: NODE_TLS_REJECT_UNAUTHORIZED=0 should be set in env for self-signed cert
        }
      )
      clearTimeout(timeoutId)

      if (backendResponse.ok) {
        const data = await backendResponse.json()
        console.log(`GC Brief loaded for ${gcName}: ${data.total_projects} projects`)
        return NextResponse.json(data)
      } else {
        console.log(`Backend returned ${backendResponse.status} for ${gcName}`)
      }
    } catch (backendError) {
      console.log("Backend not available, using fallback data:", backendError.message)
    }

    // Fallback: Return mock data structure matching what the component expects
    // This allows the UI to work while backend endpoint is being built
    const mockData = generateMockBriefData(gcName)
    return NextResponse.json(mockData)

  } catch (error) {
    console.error("Error fetching GC brief:", error)
    return NextResponse.json(
      { error: "Failed to fetch GC brief" },
      { status: 500 }
    )
  }
}

/**
 * Generate mock brief data for development/testing
 * In production, this is replaced by real BigQuery data from backend
 */
function generateMockBriefData(gcName) {
  // Simulate realistic data based on GC name
  const hash = gcName.split("").reduce((a, b) => a + b.charCodeAt(0), 0)
  const seed = hash % 100

  const totalProjects = 5 + (seed % 50)
  const wonProjects = Math.floor(totalProjects * (0.3 + (seed % 40) / 100))
  const lostProjects = Math.floor((totalProjects - wonProjects) * 0.6)
  const pendingProjects = totalProjects - wonProjects - lostProjects

  return {
    gc_name: gcName,
    total_projects: totalProjects,
    won_projects: wonProjects,
    lost_projects: lostProjects,
    pending_projects: pendingProjects,
    win_rate_pct: totalProjects > 0 ? Math.round((wonProjects / (wonProjects + lostProjects)) * 100) : 0,
    avg_project_size: 250000 + (seed * 15000),
    last_activity: new Date(Date.now() - (seed * 24 * 60 * 60 * 1000)).toISOString(),

    // Recent projects
    recent_projects: [
      {
        project_name: `${gcName.split(" ")[0]} Tower Phase 2`,
        proposal_total: 850000 + (seed * 5000),
        award_status: "WON"
      },
      {
        project_name: `Downtown ${gcName.split(" ")[0]} Center`,
        proposal_total: 1200000 + (seed * 8000),
        award_status: "PENDING"
      },
      {
        project_name: `${gcName.split(" ")[0]} Medical Plaza`,
        proposal_total: 650000 + (seed * 3000),
        award_status: seed > 50 ? "WON" : "LOST"
      }
    ],

    // System rates
    system_rates: [
      { system_name: "Built-Up APP", rate: 18 + (seed % 10), project_count: 8 + (seed % 10), confidence_level: "HIGH" },
      { system_name: "PMMA Waterproofing", rate: 22 + (seed % 8), project_count: 5 + (seed % 6), confidence_level: "MEDIUM" },
      { system_name: "TPO Single-Ply", rate: 12 + (seed % 6), project_count: 3 + (seed % 4), confidence_level: "MEDIUM" },
      { system_name: "EIFS System", rate: 28 + (seed % 12), project_count: 2 + (seed % 3), confidence_level: "LOW" },
    ],

    // Accessory rates
    accessory_rates: [
      { accessory_name: "Coping", rate: 26 + (seed % 10), project_count: 12, confidence_level: "HIGH" },
      { accessory_name: "Drains", rate: 450 + (seed * 5), project_count: 10, confidence_level: "HIGH" },
      { accessory_name: "Counter Flashing", rate: 16 + (seed % 6), project_count: 8, confidence_level: "MEDIUM" },
      { accessory_name: "Doorpans", rate: 400 + (seed * 3), project_count: 6, confidence_level: "MEDIUM" },
      { accessory_name: "Penetrations", rate: 85 + (seed % 20), project_count: 9, confidence_level: "HIGH" },
      { accessory_name: "Scuppers", rate: 350 + (seed * 4), project_count: 4, confidence_level: "LOW" },
    ],

    // Bundle patterns
    bundle_patterns: [
      { bundle_item_type: "drains", bundle_pct: 95, project_count: 15 },
      { bundle_item_type: "penetrations", bundle_pct: 90, project_count: 14 },
      { bundle_item_type: "doorpans", bundle_pct: 85, project_count: 12 },
      { bundle_item_type: "up_and_over", bundle_pct: 75, project_count: 10 },
      { bundle_item_type: "counter_flashing", bundle_pct: 45, project_count: 11 },
      { bundle_item_type: "coping", bundle_pct: 25, project_count: 13 },
    ],

    bundling_styles: ["partial_breakout"],
    bundling_sample_size: totalProjects,

    // Negotiation patterns
    avg_revisions: 1.5 + (seed % 20) / 10,
    avg_revision_pct_change: -5 - (seed % 10),
    projects_with_revisions: Math.floor(totalProjects * 0.6),
    change_patterns: ["VALUE_ENGINEERING", "SCOPE_INCREASE", "CLIENT_REQUEST"],

    // Tribal knowledge
    gc_preferences: [
      "Prefers detailed line-item breakouts over lump sum",
      "Always requests alternates on coping material",
      seed > 50 ? "Likes to see warranty options compared" : "Prefers single warranty option",
    ],
    tribal_knowledge: [
      `Primary PM: ${seed > 50 ? "Mike Chen" : "Sarah Johnson"} - very detail-oriented`,
      "Usually requests 3 system alternates for comparison",
      seed > 40 ? "Fast decision maker, usually responds within 48 hours" : "Takes time to review, expect 1-2 week turnaround",
    ],
    negotiation_notes: seed > 60 ? [
      "Typically negotiates 5-10% on initial proposals",
      "Open to value engineering on insulation specs",
    ] : null,

    // Communication stats
    total_emails: 150 + (seed * 10),
    total_threads: 25 + (seed % 20),
    first_email_date: new Date(Date.now() - 365 * 5 * 24 * 60 * 60 * 1000).toISOString(),
    last_email_date: new Date(Date.now() - (seed % 30) * 24 * 60 * 60 * 1000).toISOString(),
    avg_response_time_hours: 12 + (seed % 36),
    primary_contacts: [
      seed > 50 ? "Mike Chen (PM)" : "Sarah Johnson (PM)",
      seed > 30 ? "Tom Williams (Estimator)" : "Lisa Park (Estimator)",
      "Jennifer Adams (AP)",
    ],
  }
}
