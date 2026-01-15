/**
 * Estimating Projects API
 *
 * Endpoints for creating and managing estimating projects.
 * Uses canonical project_id generation (MD5 hash of project name).
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.116.243.70'

// In-memory storage for mock mode (will be replaced with BigQuery)
let mockProjects = []

/**
 * Generate canonical project_id from project name
 * project_id = MD5 hash of lowercase trimmed project name
 */
function generateProjectId(projectName) {
  return crypto
    .createHash('md5')
    .update(projectName.toLowerCase().trim())
    .digest('hex')
}

/**
 * POST /api/ko/estimating/projects
 * Create a new estimating project
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { project_name, gc_name, address, due_date, priority, assigned_to } = body

    if (!project_name || !gc_name) {
      return NextResponse.json(
        { error: 'project_name and gc_name are required' },
        { status: 400 }
      )
    }

    // Generate canonical project_id
    const project_id = generateProjectId(project_name)

    // Create project object
    const project = {
      project_id,
      project_name: project_name.trim(),
      gc_name: gc_name.trim(),
      address: address?.trim() || null,
      due_date: due_date || null,
      priority: priority || 'normal',
      assigned_to: assigned_to || 'Steve',
      estimate_status: 'draft',
      proposal_total: null,
      takeoff_total: null,
      has_takeoff: false,
      has_proposal: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Try to save to backend
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/estimating/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(project),
        signal: AbortSignal.timeout(5000)
      })

      if (backendRes.ok) {
        const data = await backendRes.json()
        return NextResponse.json({
          success: true,
          project: data.project || project,
          source: 'backend'
        })
      }
    } catch (err) {
      console.log('Backend not available for project creation, using mock storage')
    }

    // Store in mock storage
    mockProjects.push(project)

    return NextResponse.json({
      success: true,
      project,
      source: 'mock'
    })

  } catch (err) {
    console.error('Error creating project:', err)
    return NextResponse.json(
      { error: 'Failed to create project: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ko/estimating/projects
 * Get all projects (for admin/search purposes)
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase()

  try {
    // Try backend first
    const backendRes = await fetch(`${BACKEND_URL}/api/estimating/projects`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    })

    if (backendRes.ok) {
      const data = await backendRes.json()
      return NextResponse.json(data)
    }
  } catch (err) {
    console.log('Backend not available, returning mock projects')
  }

  // Return mock projects
  let projects = [...mockProjects]

  if (search) {
    projects = projects.filter(p =>
      p.project_name?.toLowerCase().includes(search) ||
      p.gc_name?.toLowerCase().includes(search)
    )
  }

  return NextResponse.json({
    projects,
    total: projects.length,
    source: 'mock'
  })
}

/**
 * PUT /api/ko/estimating/projects
 * Update a project
 */
export async function PUT(request) {
  try {
    const body = await request.json()
    const { project_id, ...updates } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    // Try backend first
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/estimating/projects/${project_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(5000)
      })

      if (backendRes.ok) {
        const data = await backendRes.json()
        return NextResponse.json(data)
      }
    } catch (err) {
      console.log('Backend not available for update')
    }

    // Update mock project
    const idx = mockProjects.findIndex(p => p.project_id === project_id)
    if (idx !== -1) {
      mockProjects[idx] = {
        ...mockProjects[idx],
        ...updates,
        updated_at: new Date().toISOString()
      }
      return NextResponse.json({
        success: true,
        project: mockProjects[idx],
        source: 'mock'
      })
    }

    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    )

  } catch (err) {
    console.error('Error updating project:', err)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}
