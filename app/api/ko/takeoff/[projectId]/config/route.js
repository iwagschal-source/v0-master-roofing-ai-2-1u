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
import https from 'https'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://34.95.128.208'

// Bluebeam API endpoints (CLOSED-LOOP SYSTEM)
// Config and BTX generation use the new Bluebeam integration API
// Note: Bluebeam router uses /bluebeam prefix (no /v1)
const BLUEBEAM_API_PREFIX = '/bluebeam/template'

// Custom fetch that ignores SSL cert errors (for self-signed backend cert)
const fetchWithSSL = async (url, options = {}) => {
  const agent = new https.Agent({ rejectUnauthorized: false })
  return fetch(url, { ...options, agent })
}

/**
 * GET /api/ko/takeoff/[projectId]/config
 * Get the current takeoff configuration for a project
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = await params

    // Use Bluebeam API for CLOSED-LOOP template config
    const backendRes = await fetchWithSSL(
      `${BACKEND_URL}${BLUEBEAM_API_PREFIX}/${projectId}/config`,
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

    // Return default config on error
    return NextResponse.json({
      exists: false,
      config: getDefaultConfig(),
      error: err.message
    })
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

    // Transform config to Bluebeam API format
    const bluebeamConfig = {
      items: (body.selectedItems || []).map(item => ({
        item_id: item.scope_code,
        section: item.section || 'ROOFING',
        enabled: true,
        r_value: item.variants?.[0]?.r_value,
        thickness: item.variants?.[0]?.size,
        system_id: item.variants?.[0]?.type,
        display_name: item.display_name
      })),
      locations: (body.columns || []).map((col, idx) => ({
        section: 'ROOFING',
        template_name: col.name,
        bluebeam_code: col.mappings?.[0] || col.id,
        column_index: idx,
        enabled: true
      })),
      note: body.note,
      created_by: body.created_by
    }

    // Use Bluebeam API for CLOSED-LOOP template config
    const backendRes = await fetchWithSSL(
      `${BACKEND_URL}${BLUEBEAM_API_PREFIX}/${projectId}/config`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bluebeamConfig),
        signal: AbortSignal.timeout(15000)
      }
    )

    if (!backendRes.ok) {
      const errText = await backendRes.text()
      let errDetail = errText
      try {
        const errJson = JSON.parse(errText)
        errDetail = errJson.detail || errText
      } catch {}
      return NextResponse.json(
        { error: errDetail },
        { status: backendRes.status }
      )
    }

    const data = await backendRes.json()
    return NextResponse.json({
      success: true,
      config: data.config || body,
      message: 'Configuration saved'
    })

  } catch (err) {
    console.error('Takeoff config POST error:', err)
    return NextResponse.json(
      { error: 'Failed to save configuration: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ko/takeoff/[projectId]/config
 * Delete takeoff configuration
 */
export async function DELETE(request, { params }) {
  try {
    const { projectId } = await params

    // Note: Bluebeam API doesn't support DELETE - configs are versioned
    // For now, return success but log a warning
    console.warn('DELETE config not supported in CLOSED-LOOP system - configs are versioned')
    const backendRes = { ok: true }
    /* Original code for legacy takeoff API:
    const backendRes = await fetchWithSSL(
      `${BACKEND_URL}/v1/takeoff/${projectId}/config`,
      {
        method: 'DELETE',
        signal: AbortSignal.timeout(10000)
      }
    )
    */

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
