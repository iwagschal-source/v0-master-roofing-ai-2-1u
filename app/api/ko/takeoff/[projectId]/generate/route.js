/**
 * Takeoff Generate API
 *
 * POST /api/ko/takeoff/[projectId]/generate
 * Generates a takeoff spreadsheet from the saved configuration
 *
 * This creates:
 * - Column A: Rate (from overrides or defaults)
 * - Column B: Scope/Item name (with variant suffix if applicable)
 * - Columns C+: Location columns from config
 * - Rows: One row per selected item OR per variant combination
 * - Formulas: SUM for totals, rate * quantity for costs
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
 * POST /api/ko/takeoff/[projectId]/generate
 * Generate takeoff spreadsheet from configuration
 *
 * Body:
 * - columns: Array of { id, name, mappings }
 * - selectedItems: Array of { scope_code, variants?: [] }
 * - rateOverrides: Object with scope_code-specific rates
 * - gcName: Optional GC name for rate lookup
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()

    // Validate required fields
    if (!body.selectedItems || body.selectedItems.length === 0) {
      return NextResponse.json(
        { error: 'At least one item must be selected' },
        { status: 400 }
      )
    }

    if (!body.columns || body.columns.length === 0) {
      return NextResponse.json(
        { error: 'At least one column must be configured' },
        { status: 400 }
      )
    }

    // Call backend to generate takeoff
    const backendRes = await fetchWithSSL(
      `${BACKEND_URL}/v1/takeoff/${projectId}/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns: body.columns,
          selected_items: body.selectedItems,
          rate_overrides: body.rateOverrides || {},
          gc_name: body.gcName
        }),
        signal: AbortSignal.timeout(30000)
      }
    )

    if (!backendRes.ok) {
      // If backend doesn't support this endpoint yet, generate locally
      if (backendRes.status === 404) {
        console.log('Backend generate endpoint not found, generating locally')
        return await generateLocally(projectId, body)
      }

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
      message: 'Takeoff generated successfully',
      ...data
    })

  } catch (err) {
    console.error('Takeoff generate error:', err)
    return NextResponse.json(
      { error: 'Failed to generate takeoff: ' + err.message },
      { status: 500 }
    )
  }
}

