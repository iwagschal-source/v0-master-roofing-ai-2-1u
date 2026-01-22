/**
 * Estimating Projects API
 *
 * Endpoints for creating and managing estimating projects.
 * Uses canonical project_id generation (MD5 hash of project name).
 * Persists to BigQuery for durability.
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { runQuery } from '@/lib/bigquery'

const BQ_DATASET = 'mr_staging'
const BQ_TABLE = 'estimating_projects'

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
 * Ensure the estimating_projects table exists in BigQuery
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
    // Table may already exist
    if (!err.message?.includes('Already Exists')) {
      console.warn('Table creation warning:', err.message)
    }
  }
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

    // Ensure table exists
    await ensureTable()

    // Check if project already exists
    const existingQuery = `
      SELECT project_id FROM \`master-roofing-intelligence.${BQ_DATASET}.${BQ_TABLE}\`
      WHERE project_id = @project_id
      LIMIT 1
    `
    const existing = await runQuery(existingQuery, { project_id })

    if (existing && existing.length > 0) {
      // Project exists, return it
      return NextResponse.json({
        success: true,
        project,
        source: 'bigquery',
        existed: true
      })
    }

    // Insert new project
    const insertQuery = `
      INSERT INTO \`master-roofing-intelligence.${BQ_DATASET}.${BQ_TABLE}\`
      (project_id, project_name, gc_name, address, due_date, priority, assigned_to,
       estimate_status, proposal_total, takeoff_total, has_takeoff, has_proposal,
       created_at, updated_at)
      VALUES
      (@project_id, @project_name, @gc_name, @address,
       ${due_date ? `DATE(@due_date)` : 'NULL'},
       @priority, @assigned_to, @estimate_status,
       @proposal_total, @takeoff_total, @has_takeoff, @has_proposal,
       CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
    `

    await runQuery(insertQuery, {
      project_id,
      project_name: project.project_name,
      gc_name: project.gc_name,
      address: project.address,
      due_date: project.due_date,
      priority: project.priority,
      assigned_to: project.assigned_to,
      estimate_status: project.estimate_status,
      proposal_total: project.proposal_total,
      takeoff_total: project.takeoff_total,
      has_takeoff: project.has_takeoff,
      has_proposal: project.has_proposal
    })

    return NextResponse.json({
      success: true,
      project,
      source: 'bigquery'
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
 * Get all projects from BigQuery
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.toLowerCase()

  try {
    await ensureTable()

    let query = `
      SELECT *
      FROM \`master-roofing-intelligence.${BQ_DATASET}.${BQ_TABLE}\`
    `

    const params = {}
    if (search) {
      query += `
        WHERE LOWER(project_name) LIKE @search
           OR LOWER(gc_name) LIKE @search
      `
      params.search = `%${search}%`
    }

    query += ` ORDER BY updated_at DESC LIMIT 100`

    const rows = await runQuery(query, params)

    // Convert BigQuery rows to project objects
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
    console.error('Error fetching projects:', err)
    return NextResponse.json(
      { error: 'Failed to fetch projects: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/ko/estimating/projects
 * Update a project in BigQuery
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

    await ensureTable()

    // Build SET clause dynamically
    const setClauses = []
    const params = { project_id }

    const fieldMap = {
      project_name: 'STRING',
      gc_name: 'STRING',
      address: 'STRING',
      due_date: 'DATE',
      priority: 'STRING',
      assigned_to: 'STRING',
      estimate_status: 'STRING',
      proposal_total: 'FLOAT64',
      takeoff_total: 'FLOAT64',
      has_takeoff: 'BOOL',
      has_proposal: 'BOOL'
    }

    for (const [key, value] of Object.entries(updates)) {
      if (fieldMap[key] && value !== undefined) {
        if (key === 'due_date' && value) {
          setClauses.push(`${key} = DATE(@${key})`)
        } else {
          setClauses.push(`${key} = @${key}`)
        }
        params[key] = value
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP()')

    const updateQuery = `
      UPDATE \`master-roofing-intelligence.${BQ_DATASET}.${BQ_TABLE}\`
      SET ${setClauses.join(', ')}
      WHERE project_id = @project_id
    `

    await runQuery(updateQuery, params)

    // Fetch updated project
    const selectQuery = `
      SELECT * FROM \`master-roofing-intelligence.${BQ_DATASET}.${BQ_TABLE}\`
      WHERE project_id = @project_id
    `
    const rows = await runQuery(selectQuery, { project_id })

    if (rows && rows.length > 0) {
      return NextResponse.json({
        success: true,
        project: rows[0],
        source: 'bigquery'
      })
    }

    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 }
    )

  } catch (err) {
    console.error('Error updating project:', err)
    return NextResponse.json(
      { error: 'Failed to update project: ' + err.message },
      { status: 500 }
    )
  }
}
