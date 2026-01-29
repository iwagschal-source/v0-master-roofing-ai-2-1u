/**
 * Estimating Projects API
 *
 * Projects should be created in Project Folders, not here.
 * This endpoint returns an error directing users to the correct workflow.
 */

import { NextResponse } from 'next/server'

/**
 * POST /api/ko/estimating/projects
 * Disabled - projects should be created in Project Folders
 */
export async function POST(request) {
  return NextResponse.json(
    {
      error: 'Projects should be created in Project Folders, not Estimating Center.',
      redirect: '/ko/projects'
    },
    { status: 400 }
  )
}

/**
 * GET /api/ko/estimating/projects
 * Redirect to main estimating endpoint
 */
export async function GET(request) {
  // Forward to main estimating endpoint
  const url = new URL('/api/ko/estimating', request.url)
  url.search = new URL(request.url).search

  const response = await fetch(url, {
    headers: request.headers
  })

  return response
}
