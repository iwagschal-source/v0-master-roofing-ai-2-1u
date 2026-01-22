/**
 * Bluebeam Import API
 *
 * Import Bluebeam CSV data into a project's takeoff as a new import.
 * Uses the takeoff configuration (if available) for improved matching.
 */

import { NextResponse } from 'next/server'
import https from 'https'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://136.111.252.120'

// Custom fetch that ignores SSL cert errors (for self-signed backend cert)
const fetchWithSSL = async (url, options = {}) => {
  const agent = new https.Agent({ rejectUnauthorized: false })
  return fetch(url, { ...options, agent })
}

/**
 * POST /api/ko/takeoff/[projectId]/bluebeam
 * Import Bluebeam CSV data as a new import
 *
 * Body:
 * - csv_content: Raw CSV content from Bluebeam export
 * - use_historical_rates: Whether to apply historical rates (default: true)
 * - use_config: Whether to use takeoff config for matching (default: true)
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { csv_content, filename, use_historical_rates = true, use_config = true } = body

    if (!csv_content) {
      return NextResponse.json(
        { error: 'csv_content is required' },
        { status: 400 }
      )
    }

    // Try to load takeoff config for improved matching
    let config = null
    if (use_config) {
      try {
        const configRes = await fetchWithSSL(
          `${BACKEND_URL}/v1/takeoff/${projectId}/config`,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
          }
        )
        if (configRes.ok) {
          const configData = await configRes.json()
          config = configData.config || configData
        }
      } catch (configErr) {
        console.warn('Failed to load takeoff config:', configErr.message)
        // Continue without config
      }
    }

    // Send to backend with config (if available)
    const backendRes = await fetchWithSSL(`${BACKEND_URL}/v1/takeoff/${projectId}/bluebeam`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv_content,
        filename: filename || 'bluebeam_import.csv',
        use_historical_rates,
        // Pass config mappings for improved matching
        column_mappings: config?.columns?.map(col => ({
          column_id: col.id,
          column_name: col.name,
          layer_patterns: col.mappings || []
        })),
        selected_items: config?.selectedItems?.map(item => item.item_id)
      }),
      signal: AbortSignal.timeout(30000)
    })

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

    // Add config info to response
    return NextResponse.json({
      ...data,
      config_used: !!config,
      column_mappings_count: config?.columns?.length || 0
    })

  } catch (err) {
    console.error('Bluebeam import error:', err)
    return NextResponse.json(
      { error: 'Failed to import Bluebeam data: ' + err.message },
      { status: 500 }
    )
  }
}

/**
 * Match a layer name to a column using config mappings
 */
function matchLayerToColumn(layerName, columns) {
  if (!layerName || !columns) return null

  const normalized = layerName.toUpperCase().trim()

  for (const col of columns) {
    for (const pattern of (col.mappings || [])) {
      if (normalized.includes(pattern.toUpperCase())) {
        return col.id
      }
    }
  }

  return null // unmatched
}
