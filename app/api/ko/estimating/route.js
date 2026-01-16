/**
 * Estimating Center API
 *
 * Endpoints for the Estimating Center workspace.
 * Returns project data for estimators to manage their work queue.
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

// Mock data for when backend is unavailable
const MOCK_PROJECTS = [
  {
    project_id: "b01c9f28d8acb8f17c8fdcf2003c1ce5",
    project_name: "1086 Dumont Ave",
    gc_name: "B Management",
    proposal_total: 383071,
    takeoff_total: 380000,
    estimate_status: "in_progress",
    assigned_to: "Steve",
    due_date: "2026-01-20",
    priority: "high",
    has_takeoff: true,
    has_proposal: true
  },
  {
    project_id: "6267cd7a1cc37be59b278b7d23892520",
    project_name: "253 Empire Blvd",
    gc_name: "MJH Construction",
    proposal_total: 156000,
    takeoff_total: 152000,
    estimate_status: "draft",
    assigned_to: "Steve",
    due_date: "2026-01-18",
    priority: "urgent",
    has_takeoff: true,
    has_proposal: false
  },
  {
    project_id: "abc123def456789",
    project_name: "960 Franklin Ave",
    gc_name: "Mega Contracting",
    proposal_total: 892500,
    takeoff_total: 890000,
    estimate_status: "submitted",
    assigned_to: "Mike",
    due_date: "2026-01-15",
    priority: "normal",
    has_takeoff: true,
    has_proposal: true
  },
  {
    project_id: "def456ghi789012",
    project_name: "445 Park Place",
    gc_name: "B Management",
    proposal_total: 245000,
    takeoff_total: 240000,
    estimate_status: "won",
    assigned_to: "Steve",
    due_date: "2026-01-10",
    priority: "normal",
    has_takeoff: true,
    has_proposal: true
  },
  {
    project_id: "ghi789jkl012345",
    project_name: "889 Bushwick Ave",
    gc_name: "Bushwick Partners",
    proposal_total: 178500,
    takeoff_total: null,
    estimate_status: "draft",
    assigned_to: "Mike",
    due_date: "2026-01-22",
    priority: "normal",
    has_takeoff: false,
    has_proposal: false
  },
  {
    project_id: "jkl012mno345678",
    project_name: "625 Fulton St",
    gc_name: "Prestige Builders",
    proposal_total: 520000,
    takeoff_total: 515000,
    estimate_status: "review",
    assigned_to: "Steve",
    due_date: "2026-01-19",
    priority: "high",
    has_takeoff: true,
    has_proposal: true
  }
]

/**
 * GET /api/ko/estimating
 * Returns list of projects for estimating center
 *
 * Query params:
 * - search: Filter by project name or GC name
 * - status: Filter by estimate status
 * - assigned_to: Filter by estimator
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase()
  const status = searchParams.get('status')
  const assignedTo = searchParams.get('assigned_to')

  try {
    // Try to fetch from backend
    const backendRes = await fetch(`${BACKEND_URL}/api/estimating/projects`, {
      headers: {
        'Accept': 'application/json',
      },
      // Short timeout for backend
      signal: AbortSignal.timeout(5000)
    })

    if (backendRes.ok) {
      const data = await backendRes.json()
      return NextResponse.json(data)
    }
  } catch (err) {
    console.log('Backend not available for estimating, using mock data')
  }

  // Filter mock data
  let projects = [...MOCK_PROJECTS]

  if (search) {
    projects = projects.filter(p =>
      p.project_name?.toLowerCase().includes(search) ||
      p.gc_name?.toLowerCase().includes(search)
    )
  }

  if (status && status !== 'all') {
    projects = projects.filter(p => p.estimate_status === status)
  }

  if (assignedTo) {
    projects = projects.filter(p => p.assigned_to === assignedTo)
  }

  return NextResponse.json({
    projects,
    total: projects.length,
    source: 'mock'
  })
}

/**
 * PUT /api/ko/estimating
 * Update project status or assignment
 */
export async function PUT(request) {
  try {
    const body = await request.json()
    const { project_id, estimate_status, assigned_to } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    // Try to update on backend
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/estimating/projects/${project_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ estimate_status, assigned_to }),
        signal: AbortSignal.timeout(5000)
      })

      if (backendRes.ok) {
        const data = await backendRes.json()
        return NextResponse.json(data)
      }
    } catch (err) {
      console.log('Backend not available for update')
    }

    // Return success for mock mode
    return NextResponse.json({
      success: true,
      project_id,
      estimate_status,
      assigned_to,
      source: 'mock'
    })

  } catch (err) {
    console.error('Error updating project:', err)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}
