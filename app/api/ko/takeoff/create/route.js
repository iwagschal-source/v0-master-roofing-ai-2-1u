/**
 * Create Takeoff API
 *
 * Creates a new takeoff from the MR template for a project.
 */

import { NextResponse } from 'next/server'
import https from 'https'
import { runQuery } from '@/lib/bigquery'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'
const BQ_PROJECT = 'master-roofing-intelligence'
const BQ_DATASET = 'ko_estimating'

// Custom fetch that ignores SSL cert errors (for self-signed backend cert)
const fetchWithSSL = async (url, options = {}) => {
  const agent = new https.Agent({ rejectUnauthorized: false })
  return fetch(url, { ...options, agent })
}

// Default template structure
const DEFAULT_TEMPLATE = {
  celldata: [
    // Row 1: Title
    { r: 0, c: 0, v: { v: 'Master Roofing Takeoff', m: 'Master Roofing Takeoff', ct: { fa: 'General', t: 's' } } },
    // Row 3: Headers
    { r: 2, c: 0, v: { v: 'Rate', m: 'Rate', ct: { fa: 'General', t: 's' } } },
    { r: 2, c: 1, v: { v: 'Scope', m: 'Scope', ct: { fa: 'General', t: 's' } } },
    { r: 2, c: 2, v: { v: 'Main Roof', m: 'Main Roof', ct: { fa: 'General', t: 's' } } },
    { r: 2, c: 3, v: { v: '1st Floor', m: '1st Floor', ct: { fa: 'General', t: 's' } } },
    { r: 2, c: 4, v: { v: '2nd Floor', m: '2nd Floor', ct: { fa: 'General', t: 's' } } },
    { r: 2, c: 5, v: { v: 'Total', m: 'Total', ct: { fa: 'General', t: 's' } } },
    { r: 2, c: 6, v: { v: 'Cost', m: 'Cost', ct: { fa: 'General', t: 's' } } },
  ]
}

/**
 * POST /api/ko/takeoff/create
 * Create a new takeoff for a project
 *
 * Body:
 * - project_id: The project ID (MD5 hash)
 * - project_name: Human-readable project name
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { project_id, project_name } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    // Try backend first
    try {
      const backendRes = await fetchWithSSL(`${BACKEND_URL}/v1/takeoff/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id,
          project_name: project_name || project_id
        }),
        signal: AbortSignal.timeout(10000)
      })

      if (backendRes.ok) {
        const data = await backendRes.json()
        return NextResponse.json(data)
      }

      if (backendRes.status !== 404) {
        console.warn('Backend create error:', await backendRes.text())
      }
    } catch (backendErr) {
      console.warn('Backend unreachable, creating locally:', backendErr.message)
    }

    // Fallback: Create in BigQuery
    const created = await createTakeoffInBigQuery(project_id, project_name)
    if (created) {
      return NextResponse.json({
        success: true,
        project_id,
        message: 'Takeoff created (local)',
        storage: 'bigquery'
      })
    }

    return NextResponse.json(
      { error: 'Failed to create takeoff' },
      { status: 500 }
    )

  } catch (err) {
    console.error('Takeoff create error:', err)
    return NextResponse.json(
      { error: 'Failed to create takeoff: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * Create takeoff in BigQuery
 */
async function createTakeoffInBigQuery(projectId, projectName) {
  try {
    // Create table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_sheets\` (
        project_id STRING NOT NULL,
        project_name STRING,
        sheet_data_json STRING,
        created_at TIMESTAMP,
        updated_at TIMESTAMP
      )
    `
    try {
      await runQuery(createTableQuery)
    } catch (e) {
      // Table might already exist
    }

    // Check if already exists
    const checkQuery = `
      SELECT 1 FROM \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_sheets\`
      WHERE project_id = @projectId
      LIMIT 1
    `
    const existing = await runQuery(checkQuery, { projectId })
    if (existing && existing.length > 0) {
      return true // Already exists
    }

    // Insert new takeoff with template
    const template = { ...DEFAULT_TEMPLATE }
    // Update title with project name
    if (projectName) {
      template.celldata[0] = {
        r: 0, c: 0,
        v: { v: projectName, m: projectName, ct: { fa: 'General', t: 's' } }
      }
    }

    const insertQuery = `
      INSERT INTO \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_sheets\`
      (project_id, project_name, sheet_data_json, created_at, updated_at)
      VALUES (@projectId, @projectName, @sheetDataJson, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
    `
    await runQuery(insertQuery, {
      projectId,
      projectName: projectName || projectId,
      sheetDataJson: JSON.stringify(template)
    })
    return true
  } catch (err) {
    console.error('BigQuery create error:', err)
    return false
  }
}
