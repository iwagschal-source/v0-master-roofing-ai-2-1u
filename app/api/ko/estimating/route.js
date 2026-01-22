/**
 * Estimating Center API
 *
 * Endpoints for the Estimating Center workspace.
 * Returns project data from BigQuery for estimators.
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

const BQ_DATASET = 'mr_staging'
const BQ_TABLE = 'estimating_projects'

/**
 * Ensure the estimating_projects table exists
 */
async function ensureTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS \`master-roofing-intelligence.${BQ_DATASET}.${BQ_TABLE}\` (
      project_id STRING NOT NULL,
      project_name STRING NOT NULL,
      gc_name STRING,
      address STRING,
      due_date DATE,
      priority STRING,
      assigned_to STRING,
      estimate_status STRING,
      proposal_total FLOAT64,
      takeoff_total FLOAT64,
      has_takeoff BOOL,
      has_proposal BOOL,
      created_at TIMESTAMP,
      updated_at TIMESTAMP
    )
  `
  try {
    await runQuery(createTableSQL)
  } catch (err) {
    if (!err.message?.includes('Already Exists')) {
      console.warn('Table creation warning:', err.message)
    }
  }
}

/**
 * GET /api/ko/estimating
 * Returns list of projects for estimating center from BigQuery
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
    await ensureTable()

    let query = `
      SELECT *
      FROM \`master-roofing-intelligence.${BQ_DATASET}.${BQ_TABLE}\`
      WHERE 1=1
    `
    const params = {}

    if (search) {
      query += ` AND (LOWER(project_name) LIKE @search OR LOWER(gc_name) LIKE @search)`
      params.search = `%${search}%`
    }

    if (status && status !== 'all') {
      query += ` AND estimate_status = @status`
      params.status = status
    }

    if (assignedTo) {
      query += ` AND assigned_to = @assignedTo`
      params.assignedTo = assignedTo
    }

    query += ` ORDER BY updated_at DESC LIMIT 100`

    const rows = await runQuery(query, params)

    const projects = (rows || []).map(row => ({
      project_id: row.project_id,
      project_name: row.project_name,
      gc_name: row.gc_name,
      address: row.address,
      due_date: row.due_date?.value || row.due_date,
      priority: row.priority,
      assigned_to: row.assigned_to,
      estimate_status: row.estimate_status,
      proposal_total: row.proposal_total,
      takeoff_total: row.takeoff_total,
      has_takeoff: row.has_takeoff,
      has_proposal: row.has_proposal,
      created_at: row.created_at?.value || row.created_at,
      updated_at: row.updated_at?.value || row.updated_at
    }))

    return NextResponse.json({
      projects,
      total: projects.length,
      source: 'bigquery'
    })

  } catch (err) {
    console.error('Error fetching projects from BigQuery:', err)
    return NextResponse.json(
      { error: 'Failed to fetch projects: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/ko/estimating
 * Update project status or assignment in BigQuery
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

    await ensureTable()

    const setClauses = ['updated_at = CURRENT_TIMESTAMP()']
    const params = { project_id }

    if (estimate_status !== undefined) {
      setClauses.push('estimate_status = @estimate_status')
      params.estimate_status = estimate_status
    }

    if (assigned_to !== undefined) {
      setClauses.push('assigned_to = @assigned_to')
      params.assigned_to = assigned_to
    }

    const updateQuery = `
      UPDATE \`master-roofing-intelligence.${BQ_DATASET}.${BQ_TABLE}\`
      SET ${setClauses.join(', ')}
      WHERE project_id = @project_id
    `

    await runQuery(updateQuery, params)

    return NextResponse.json({
      success: true,
      project_id,
      estimate_status,
      assigned_to,
      source: 'bigquery'
    })

  } catch (err) {
    console.error('Error updating project:', err)
    return NextResponse.json(
      { error: 'Failed to update project: ' + err.message },
      { status: 500 }
    )
  }
}
