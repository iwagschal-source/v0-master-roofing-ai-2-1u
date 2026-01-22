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

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://34.95.128.208'

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

    // Try local generation as fallback
    try {
      const { projectId } = await params
      const body = await request.clone().json()
      return await generateLocally(projectId, body)
    } catch (fallbackErr) {
      return NextResponse.json(
        { error: 'Failed to generate takeoff: ' + err.message },
        { status: 500 }
      )
    }
  }
}

/**
 * Generate takeoff locally (fallback if backend doesn't support)
 */
async function generateLocally(projectId, config) {
  const { columns, selectedItems, rateOverrides, gcName } = config

  // Fetch library items to get details
  const libraryUrl = gcName
    ? `/api/ko/takeoff/library?gcName=${encodeURIComponent(gcName)}`
    : '/api/ko/takeoff/library'

  let libraryItems = []
  try {
    // Need to make internal API call differently since we're in the API route
    const { runQuery } = await import('@/lib/bigquery')

    const libraryQuery = `
      SELECT
        item_id AS scope_code,
        section,
        scope_name,
        default_unit_cost,
        uom,
        sort_order
      FROM \`master-roofing-intelligence.mr_agent.lib_takeoff_template\`
      ORDER BY sort_order
    `
    libraryItems = await runQuery(libraryQuery)
  } catch (err) {
    console.warn('Failed to fetch library from BigQuery:', err.message)
    // Use basic item info from selectedItems
  }

  // Build item lookup map
  const itemMap = {}
  for (const item of libraryItems) {
    itemMap[item.scope_code] = item
  }

  // Generate rows
  const rows = []
  let rowNum = 4 // Start after header rows (1=title, 2=blank, 3=column headers)

  for (const selected of selectedItems) {
    const libraryItem = itemMap[selected.scope_code]
    const baseName = libraryItem?.scope_name || selected.scope_code
    const baseRate = libraryItem?.default_unit_cost || 0
    const uom = libraryItem?.uom || 'EA'

    const hasVariants = selected.variants && selected.variants.length > 0

    if (hasVariants) {
      // Generate a row for each variant
      for (const variant of selected.variants) {
        const variantKey = getVariantKey(selected.scope_code, variant)
        const displayName = getVariantDisplayName(baseName, variant)
        const rate = rateOverrides[variantKey] ?? baseRate

        rows.push({
          row: rowNum++,
          scope_code: selected.scope_code,
          scope_name: displayName,
          rate,
          uom,
          variant
        })
      }
    } else {
      // Simple item without variants
      const rate = rateOverrides[selected.scope_code] ?? baseRate

      rows.push({
        row: rowNum++,
        scope_code: selected.scope_code,
        scope_name: baseName,
        rate,
        uom,
        variant: null
      })
    }
  }

  // Generate cell data in Luckysheet format
  const celldata = []

  // Header row (row 3)
  celldata.push({ r: 2, c: 0, v: { v: 'Rate', m: 'Rate', ct: { fa: 'General', t: 's' } } })
  celldata.push({ r: 2, c: 1, v: { v: 'Scope', m: 'Scope', ct: { fa: 'General', t: 's' } } })

  columns.forEach((col, idx) => {
    celldata.push({
      r: 2,
      c: idx + 2,
      v: { v: col.name, m: col.name, ct: { fa: 'General', t: 's' } }
    })
  })

  // Data rows
  for (const row of rows) {
    // Rate column (A)
    celldata.push({
      r: row.row - 1, // 0-indexed
      c: 0,
      v: { v: row.rate, m: `$${row.rate.toFixed(2)}`, ct: { fa: '$#,##0.00', t: 'n' } }
    })

    // Scope column (B)
    celldata.push({
      r: row.row - 1,
      c: 1,
      v: { v: row.scope_name, m: row.scope_name, ct: { fa: 'General', t: 's' } }
    })

    // Location columns (C+) - empty for now, to be filled by Bluebeam import
    columns.forEach((col, idx) => {
      celldata.push({
        r: row.row - 1,
        c: idx + 2,
        v: { v: 0, m: '0', ct: { fa: '#,##0', t: 'n' } }
      })
    })
  }

  // Save to backend
  try {
    const saveRes = await fetchWithSSL(
      `${BACKEND_URL}/v1/takeoff/${projectId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_data: { celldata },
          config: {
            columns,
            selectedItems,
            rateOverrides,
            gcName
          }
        }),
        signal: AbortSignal.timeout(15000)
      }
    )

    if (!saveRes.ok) {
      console.warn('Failed to save to backend, returning local result')
    }
  } catch (err) {
    console.warn('Failed to save to backend:', err.message)
  }

  return NextResponse.json({
    success: true,
    message: 'Takeoff generated locally',
    rows: rows.length,
    columns: columns.length,
    generated_rows: rows
  })
}

/**
 * Generate a unique key for a variant combination
 */
function getVariantKey(scopeCode, variant) {
  const parts = [scopeCode]
  if (variant?.r_value) parts.push(variant.r_value)
  if (variant?.size) parts.push(variant.size)
  if (variant?.type) parts.push(variant.type)
  return parts.join('|')
}

/**
 * Generate a display name for a variant combination
 */
function getVariantDisplayName(baseName, variant) {
  const parts = [baseName]
  if (variant?.r_value) parts.push(variant.r_value)
  if (variant?.size) parts.push(variant.size)
  if (variant?.type) parts.push(variant.type)
  return parts.join(' ')
}
