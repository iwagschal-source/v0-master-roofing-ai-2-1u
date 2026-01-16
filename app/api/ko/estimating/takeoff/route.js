/**
 * Takeoff API
 *
 * Save and load takeoff data for projects.
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

// In-memory storage for mock mode
const takeoffStorage = new Map()

/**
 * POST /api/ko/estimating/takeoff
 * Save takeoff data
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { projectId, projectName, gcName, data, totals } = body

    if (!projectId && !projectName) {
      return NextResponse.json(
        { error: 'projectId or projectName is required' },
        { status: 400 }
      )
    }

    const key = projectId || projectName

    // Try to save to backend
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/estimating/takeoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
      })

      if (backendRes.ok) {
        const result = await backendRes.json()
        return NextResponse.json({
          success: true,
          ...result,
          source: 'backend'
        })
      }
    } catch (err) {
      console.log('Backend not available for takeoff save, using local storage')
    }

    // Save to local storage
    takeoffStorage.set(key, {
      ...body,
      savedAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      projectId: key,
      totals,
      savedAt: new Date().toISOString(),
      source: 'local'
    })

  } catch (err) {
    console.error('Error saving takeoff:', err)
    return NextResponse.json(
      { error: 'Failed to save takeoff: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ko/estimating/takeoff
 * Load takeoff data for a project
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const projectName = searchParams.get('projectName')

  if (!projectId && !projectName) {
    return NextResponse.json(
      { error: 'projectId or projectName is required' },
      { status: 400 }
    )
  }

  const key = projectId || projectName

  // Try backend first
  try {
    const params = new URLSearchParams()
    if (projectId) params.append('projectId', projectId)
    if (projectName) params.append('projectName', projectName)

    const backendRes = await fetch(`${BACKEND_URL}/api/estimating/takeoff?${params}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    })

    if (backendRes.ok) {
      const data = await backendRes.json()
      return NextResponse.json({
        success: true,
        ...data,
        source: 'backend'
      })
    }
  } catch (err) {
    console.log('Backend not available for takeoff load')
  }

  // Check local storage
  const stored = takeoffStorage.get(key)
  if (stored) {
    return NextResponse.json({
      success: true,
      ...stored,
      source: 'local'
    })
  }

  return NextResponse.json({
    success: false,
    error: 'Takeoff not found'
  }, { status: 404 })
}
