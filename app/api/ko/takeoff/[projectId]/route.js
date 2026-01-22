/**
 * Takeoff API - Get/Update takeoff for a project
 *
 * Uses Google Sheets for takeoff storage (embedded in Truth Source spreadsheet).
 */

import { NextResponse } from 'next/server'
import { getTakeoffTab } from '@/lib/google-sheets'

/**
 * GET /api/ko/takeoff/[projectId]
 * Get takeoff sheet info for a project
 *
 * Query params:
 * - format: 'sheet' (returns Google Sheet embed info)
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'sheet'

    // Get Google Sheet tab info
    const sheetInfo = await getTakeoffTab(projectId)

    if (sheetInfo) {
      return NextResponse.json({
        ...sheetInfo,
        exists: true,
        storage: 'google_sheets'
      })
    }

    // No takeoff exists
    return NextResponse.json(
      { error: 'Takeoff not found', exists: false },
      { status: 404 }
    )

  } catch (err) {
    console.error('Takeoff GET error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch takeoff: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * Load takeoff data from BigQuery
 */
async function loadTakeoffFromBigQuery(projectId) {
  try {
    const query = `
      SELECT sheet_data_json
      FROM \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_sheets\`
      WHERE project_id = @projectId
      ORDER BY updated_at DESC
      LIMIT 1
    `
    const rows = await runQuery(query, { projectId })
    if (rows && rows.length > 0 && rows[0].sheet_data_json) {
      return JSON.parse(rows[0].sheet_data_json)
    }
    return null
  } catch (err) {
    console.warn('BigQuery takeoff load error:', err.message)
    return null
  }
}

/**
 * PUT /api/ko/takeoff/[projectId]
 * Update cells in the master takeoff
 *
 * Body:
 * - updates: Array of { row, col, value }
 */
export async function PUT(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()

    // Try backend first
    try {
      const backendRes = await fetchWithSSL(`${BACKEND_URL}/v1/takeoff/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000)
      })

      if (backendRes.ok) {
        const data = await backendRes.json()
        return NextResponse.json(data)
      }

      if (backendRes.status !== 404) {
        console.warn('Backend PUT error:', await backendRes.text())
      }
    } catch (backendErr) {
      console.warn('Backend unreachable, using BigQuery:', backendErr.message)
    }

    // Fallback: Save to BigQuery
    const saved = await saveTakeoffToBigQuery(projectId, body)
    if (saved) {
      return NextResponse.json({
        success: true,
        message: 'Takeoff saved (local)',
        storage: 'bigquery'
      })
    }

    return NextResponse.json(
      { error: 'Failed to save takeoff' },
      { status: 500 }
    )

  } catch (err) {
    console.error('Takeoff PUT error:', err)
    return NextResponse.json(
      { error: 'Failed to update takeoff: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * Save takeoff data to BigQuery
 */
async function saveTakeoffToBigQuery(projectId, data) {
  try {
    // Upsert: delete then insert
    try {
      const deleteQuery = `
        DELETE FROM \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_sheets\`
        WHERE project_id = @projectId
      `
      await runQuery(deleteQuery, { projectId })
    } catch (e) {
      // Table might not exist
    }

    const insertQuery = `
      INSERT INTO \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_sheets\`
      (project_id, sheet_data_json, updated_at)
      VALUES (@projectId, @sheetDataJson, CURRENT_TIMESTAMP())
    `
    await runQuery(insertQuery, {
      projectId,
      sheetDataJson: JSON.stringify(data.sheet_data || data)
    })
    return true
  } catch (err) {
    console.error('BigQuery save error:', err)
    // Try to create table
    try {
      const createQuery = `
        CREATE TABLE IF NOT EXISTS \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_sheets\` (
          project_id STRING NOT NULL,
          sheet_data_json STRING,
          updated_at TIMESTAMP
        )
      `
      await runQuery(createQuery)
      // Retry insert
      const insertQuery = `
        INSERT INTO \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_sheets\`
        (project_id, sheet_data_json, updated_at)
        VALUES (@projectId, @sheetDataJson, CURRENT_TIMESTAMP())
      `
      await runQuery(insertQuery, {
        projectId,
        sheetDataJson: JSON.stringify(data.sheet_data || data)
      })
      return true
    } catch (createErr) {
      console.error('Failed to create table:', createErr)
      return false
    }
  }
}

/**
 * DELETE /api/ko/takeoff/[projectId]
 * Delete takeoff (if needed)
 */
export async function DELETE(request, { params }) {
  try {
    const { projectId } = await params

    const backendRes = await fetchWithSSL(`${BACKEND_URL}/v1/takeoff/${projectId}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000)
    })

    if (!backendRes.ok) {
      const errText = await backendRes.text()
      return NextResponse.json(
        { error: errText },
        { status: backendRes.status }
      )
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Takeoff DELETE error:', err)
    return NextResponse.json(
      { error: 'Failed to delete takeoff: ' + err.message },
      { status: 500 }
    )
  }
}
