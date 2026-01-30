/**
 * Takeoff Config API
 *
 * GET /api/ko/takeoff/[projectId]/config - Get current takeoff configuration
 * POST /api/ko/takeoff/[projectId]/config - Save takeoff configuration
 *
 * Config structure:
 * {
 *   columns: [{ id, name, mappings: ['FL-1', 'ROOF', ...] }],
 *   selectedItems: [
 *     { scope_code: 'MR-VB' },  // Simple item
 *     {
 *       scope_code: 'MR-INS-BATT',
 *       variants: [
 *         { r_value: 'R-19', size: '3.5"', type: 'Fiberglass' },
 *         { r_value: 'R-30', size: '6"', type: 'Fiberglass' }
 *       ]
 *     }
 *   ],
 *   rateOverrides: { 'MR-VB': 7.50, 'MR-INS-BATT|R-19|3.5"|Fiberglass': 2.75 },
 *   gcName: 'MJH Construction'
 * }
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

// FastAPI backend on port 8000 (HTTP)
const BACKEND_URL = process.env.BACKEND_URL || 'http://136.111.252.120:8000'
const BQ_PROJECT = 'master-roofing-intelligence'
const BQ_DATASET = 'ko_estimating'

/**
 * GET /api/ko/takeoff/[projectId]/config
 * Get the current takeoff configuration for a project
 */
export async function GET(request, { params }) {
  const { projectId } = await params

  try {
    const backendRes = await fetch(
      `${BACKEND_URL}/v1/takeoff/${projectId}/config`,
      {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      }
    )

    if (backendRes.status === 404) {
      // No config exists yet - return default config
      return NextResponse.json({
        exists: false,
        config: getDefaultConfig()
      })
    }

    if (!backendRes.ok) {
      const errText = await backendRes.text()
      return NextResponse.json(
        { error: errText },
        { status: backendRes.status }
      )
    }

    const data = await backendRes.json()
    return NextResponse.json({
      exists: true,
      config: data.config || data
    })

  } catch (err) {
    console.error('Takeoff config GET error:', err)

    // Try BigQuery fallback
    try {
      const bqConfig = await loadConfigFromBigQuery(projectId)
      if (bqConfig) {
        return NextResponse.json({
          exists: true,
          config: bqConfig,
          storage: 'bigquery'
        })
      }
    } catch (bqErr) {
      console.warn('BigQuery fallback failed:', bqErr.message)
    }

    // Return default config on error
    return NextResponse.json({
      exists: false,
      config: getDefaultConfig(),
      error: err.message
    })
  }
}

/**
 * Load config from BigQuery fallback
 */
async function loadConfigFromBigQuery(projectId) {
  try {
    const query = `
      SELECT config_json
      FROM \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_configs\`
      WHERE project_id = @projectId
      ORDER BY updated_at DESC
      LIMIT 1
    `
    const rows = await runQuery(query, { projectId })
    if (rows && rows.length > 0 && rows[0].config_json) {
      return JSON.parse(rows[0].config_json)
    }
    return null
  } catch (err) {
    console.warn('BigQuery config load error:', err.message)
    return null
  }
}

/**
 * POST /api/ko/takeoff/[projectId]/config
 * Save takeoff configuration
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()

    // Validate config structure
    const validationError = validateConfig(body)
    if (validationError) {
      return NextResponse.json(
        { error: validationError },
        { status: 400 }
      )
    }

    // Try backend first
    try {
      const backendRes = await fetch(
        `${BACKEND_URL}/v1/takeoff/${projectId}/config`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000)
        }
      )

      if (backendRes.ok) {
        const data = await backendRes.json()
        return NextResponse.json({
          success: true,
          config: data.config || body,
          message: 'Configuration saved'
        })
      }

      // If backend returns 404, fall through to BigQuery storage
      if (backendRes.status !== 404) {
        const errText = await backendRes.text()
        console.warn('Backend config save failed:', errText)
      }
    } catch (backendErr) {
      console.warn('Backend unreachable, using BigQuery fallback:', backendErr.message)
    }

    // Fallback: Save to BigQuery
    const saved = await saveConfigToBigQuery(projectId, body)
    if (saved) {
      return NextResponse.json({
        success: true,
        config: body,
        message: 'Configuration saved (local)',
        storage: 'bigquery'
      })
    }

    return NextResponse.json(
      { error: 'Failed to save configuration' },
      { status: 500 }
    )

  } catch (err) {
    console.error('Takeoff config POST error:', err)
    return NextResponse.json(
      { error: 'Failed to save configuration: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * Save config to BigQuery as fallback
 */
async function saveConfigToBigQuery(projectId, config) {
  console.log('[saveConfigToBigQuery] Starting for project:', projectId)
  try {
    // First try to delete existing config
    const deleteQuery = `
      DELETE FROM \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_configs\`
      WHERE project_id = @projectId
    `
    try {
      console.log('[saveConfigToBigQuery] Attempting DELETE...')
      await runQuery(deleteQuery, { projectId })
      console.log('[saveConfigToBigQuery] DELETE succeeded')
    } catch (e) {
      console.log('[saveConfigToBigQuery] DELETE failed (OK if table new):', e.message)
    }

    // Insert new config
    const insertQuery = `
      INSERT INTO \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_configs\`
      (project_id, config_json, updated_at)
      VALUES (@projectId, @configJson, CURRENT_TIMESTAMP())
    `
    console.log('[saveConfigToBigQuery] Attempting INSERT...')
    await runQuery(insertQuery, {
      projectId,
      configJson: JSON.stringify(config)
    })
    console.log('[saveConfigToBigQuery] INSERT succeeded')
    return true
  } catch (err) {
    console.error('[saveConfigToBigQuery] BigQuery save error:', err.message, err.stack)
    // Try to create table if it doesn't exist
    try {
      console.log('[saveConfigToBigQuery] Attempting CREATE TABLE...')
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_configs\` (
          project_id STRING NOT NULL,
          config_json STRING,
          updated_at TIMESTAMP
        )
      `
      await runQuery(createTableQuery)
      console.log('[saveConfigToBigQuery] CREATE TABLE succeeded, retrying INSERT...')
      // Retry insert
      const insertQuery = `
        INSERT INTO \`${BQ_PROJECT}.${BQ_DATASET}.takeoff_configs\`
        (project_id, config_json, updated_at)
        VALUES (@projectId, @configJson, CURRENT_TIMESTAMP())
      `
      await runQuery(insertQuery, {
        projectId,
        configJson: JSON.stringify(config)
      })
      console.log('[saveConfigToBigQuery] Retry INSERT succeeded')
      return true
    } catch (createErr) {
      console.error('[saveConfigToBigQuery] Failed to create table:', createErr.message, createErr.stack)
      return false
    }
  }
}

/**
 * DELETE /api/ko/takeoff/[projectId]/config
 * Delete takeoff configuration
 */
export async function DELETE(request, { params }) {
  try {
    const { projectId } = await params

    const backendRes = await fetch(
      `${BACKEND_URL}/v1/takeoff/${projectId}/config`,
      {
        method: 'DELETE',
        signal: AbortSignal.timeout(10000)
      }
    )

    if (!backendRes.ok) {
      const errText = await backendRes.text()
      return NextResponse.json(
        { error: errText },
        { status: backendRes.status }
      )
    }

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('Takeoff config DELETE error:', err)
    return NextResponse.json(
      { error: 'Failed to delete configuration: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * Get default takeoff configuration
 */
function getDefaultConfig() {
  return {
    columns: [
      { id: 'C', name: 'Main Roof', mappings: ['ROOF', 'MR', 'MAIN'] },
      { id: 'D', name: '1st Floor', mappings: ['FL-1', '1ST', 'GROUND'] },
      { id: 'E', name: '2nd Floor', mappings: ['FL-2', '2ND'] },
      { id: 'F', name: 'Front', mappings: ['FRONT', 'NORTH'] },
      { id: 'G', name: 'Rear', mappings: ['REAR', 'SOUTH'] },
    ],
    selectedItems: [],
    rateOverrides: {},
    gcName: null
  }
}

/**
 * Validate config structure
 */
function validateConfig(config) {
  if (!config) {
    return 'Config is required'
  }

  // Columns validation
  if (config.columns) {
    if (!Array.isArray(config.columns)) {
      return 'columns must be an array'
    }
    for (const col of config.columns) {
      if (!col.id || !col.name) {
        return 'Each column must have id and name'
      }
      if (col.mappings && !Array.isArray(col.mappings)) {
        return 'Column mappings must be an array'
      }
    }
  }

  // Selected items validation
  if (config.selectedItems) {
    if (!Array.isArray(config.selectedItems)) {
      return 'selectedItems must be an array'
    }
    for (const item of config.selectedItems) {
      if (!item.scope_code) {
        return 'Each selectedItem must have scope_code'
      }
      if (item.variants && !Array.isArray(item.variants)) {
        return 'Item variants must be an array'
      }
    }
  }

  // Rate overrides validation
  if (config.rateOverrides && typeof config.rateOverrides !== 'object') {
    return 'rateOverrides must be an object'
  }

  return null
}
