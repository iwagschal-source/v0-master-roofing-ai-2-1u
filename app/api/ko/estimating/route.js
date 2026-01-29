/**
 * Estimating Center API
 *
 * Returns project data from project_folders table (the source of truth).
 * Projects are created in Project Folders, viewed/worked in Estimating Center.
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

/**
 * GET /api/ko/estimating
 * Returns list of projects for estimating center from project_folders
 *
 * Query params:
 * - search: Filter by project name or company name
 * - status: Filter by status
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase()
  const status = searchParams.get('status')

  try {
    let query = `
      SELECT
        pf.id as project_id,
        pf.project_name,
        c.company_name as gc_name,
        pf.address,
        pf.city,
        pf.state,
        pf.zip,
        pf.status as estimate_status,
        pf.notes,
        pf.takeoff_spreadsheet_id,
        pf.drive_folder_id,
        pf.created_at,
        pf.updated_at
      FROM \`master-roofing-intelligence.mr_main.project_folders\` pf
      LEFT JOIN \`master-roofing-intelligence.mr_main.contacts_companies\` c
        ON pf.company_id = c.id
      WHERE 1=1
    `
    const params = {}

    if (search) {
      query += ` AND (LOWER(pf.project_name) LIKE @search OR LOWER(c.company_name) LIKE @search)`
      params.search = `%${search}%`
    }

    if (status && status !== 'all') {
      query += ` AND pf.status = @status`
      params.status = status
    }

    query += ` ORDER BY pf.updated_at DESC LIMIT 100`

    const rows = await runQuery(query, params, { location: 'US' })

    const projects = (rows || []).map(row => ({
      project_id: row.project_id,
      project_name: row.project_name,
      gc_name: row.gc_name || 'Unknown',
      address: [row.address, row.city, row.state, row.zip].filter(Boolean).join(', ') || null,
      due_date: null, // Not in project_folders yet
      priority: 'normal', // Default
      assigned_to: null, // Not in project_folders yet
      estimate_status: row.estimate_status || 'draft',
      proposal_total: null, // Calculated from takeoff
      takeoff_total: null,
      has_takeoff: !!row.takeoff_spreadsheet_id,
      has_proposal: false,
      created_at: row.created_at?.value || row.created_at,
      updated_at: row.updated_at?.value || row.updated_at
    }))

    return NextResponse.json({
      projects,
      total: projects.length,
      source: 'project_folders'
    })

  } catch (err) {
    console.error('Error fetching projects:', err)
    return NextResponse.json(
      { error: 'Failed to fetch projects: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/ko/estimating
 * Update project status in project_folders
 */
export async function PUT(request) {
  try {
    const body = await request.json()
    const { project_id, estimate_status } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    const setClauses = ['updated_at = CURRENT_TIMESTAMP()']
    const params = { project_id }

    if (estimate_status !== undefined) {
      setClauses.push('status = @estimate_status')
      params.estimate_status = estimate_status
    }

    const updateQuery = `
      UPDATE \`master-roofing-intelligence.mr_main.project_folders\`
      SET ${setClauses.join(', ')}
      WHERE id = @project_id
    `

    await runQuery(updateQuery, params, { location: 'US' })

    return NextResponse.json({
      success: true,
      project_id,
      estimate_status
    })

  } catch (err) {
    console.error('Error updating project:', err)
    return NextResponse.json(
      { error: 'Failed to update project: ' + err.message },
      { status: 500 }
    )
  }
}
