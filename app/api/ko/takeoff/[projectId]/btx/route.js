/**
 * BTX Generation API - Proxy to Python backend
 * Generates Bluebeam Tool Chest files using the real Bluebeam BTX format
 *
 * Phase 3 (BTX v2): Reads item/location toggles from Setup tab via setup-config,
 * instead of sheet-config from the takeoff tab.
 */

import { NextResponse } from 'next/server'

// FastAPI backend on port 8000 (HTTP, not HTTPS)
const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://136.111.252.120:8000'

/**
 * POST /api/ko/takeoff/[projectId]/btx
 * Generate and download BTX file via Python backend
 *
 * Accepts body:
 * - config: { selectedItems: [{scope_code}], columns: [{name, mappings}] } (legacy sheet-config format)
 * - OR setupConfig: { items: [{item_id, locations: [{name}]}], locations: [{name}] } (new setup-config format)
 * - projectName: string
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()

    const projectName = body.projectName || projectId
    let selectedItemIds = []
    let locationsWithNames = []

    if (body.setupConfig) {
      // New Setup tab format (Phase 3)
      const { items, locations } = body.setupConfig

      if (!items?.length || !locations?.length) {
        return NextResponse.json({ error: 'No items or locations toggled on Setup tab.' }, { status: 400 })
      }

      selectedItemIds = items.map(item => item.item_id)
      locationsWithNames = locations.map(loc => ({
        code: loc.name.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        name: loc.name
      }))
    } else {
      // Legacy config format (backward compatibility)
      let config = body.config
      if (!config) {
        const configRes = await fetch(`${request.nextUrl.origin}/api/ko/takeoff/${projectId}/config`)
        if (configRes.ok) {
          const data = await configRes.json()
          config = data.config
        }
      }

      if (!config?.selectedItems?.length || !config?.columns?.length) {
        return NextResponse.json({ error: 'No config. Set up takeoff first.' }, { status: 400 })
      }

      selectedItemIds = config.selectedItems.map(item => item.scope_code)
      locationsWithNames = config.columns.map(col => ({
        code: col.mappings?.[0] || col.name.toUpperCase().replace(/[^A-Z0-9]/g, ''),
        name: col.name
      }))
    }

    console.log('[BTX] Per-floor mode:', {
      project_name: projectName,
      selected_items: selectedItemIds,
      locations: locationsWithNames
    })

    const perFloorRes = await fetch(`${BACKEND_URL}/bluebeam/generate-btx-per-floor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_name: projectName,
        selected_items: selectedItemIds,
        locations: locationsWithNames
      }),
      signal: AbortSignal.timeout(30000)
    })

    if (!perFloorRes.ok) {
      const errText = await perFloorRes.text()
      console.error('BTX per-floor backend error:', errText)
      return NextResponse.json({ error: 'Per-floor BTX generation failed: ' + errText }, { status: 500 })
    }

    const zipBuffer = await perFloorRes.arrayBuffer()
    console.log('[BTX] Per-floor zip size:', zipBuffer.byteLength, 'bytes')
    const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_')
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `${safeName}-tools-${dateStr}.zip`

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (err) {
    console.error('BTX error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * GET /api/ko/takeoff/[projectId]/btx
 * Check if BTX can be generated — reads Setup tab toggles
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = await params

    // Try setup-config first (Phase 3), fall back to legacy config
    const setupRes = await fetch(`${request.nextUrl.origin}/api/ko/takeoff/${projectId}/setup-config`)

    if (setupRes.ok) {
      const data = await setupRes.json()
      if (!data.selected_items?.length) {
        return NextResponse.json({ ready: false, message: 'No items toggled on Setup tab' })
      }
      return NextResponse.json({
        ready: true,
        toolCount: data.tool_count,
        items: data.items_count,
        locations: data.locations_count,
        source: 'setup-tab'
      })
    }

    // Fallback: legacy config
    const configRes = await fetch(`${request.nextUrl.origin}/api/ko/takeoff/${projectId}/config`)
    if (!configRes.ok) {
      return NextResponse.json({ ready: false, message: 'No config' })
    }

    const { config } = await configRes.json()
    if (!config?.selectedItems?.length || !config?.columns?.length) {
      return NextResponse.json({ ready: false, message: 'Config incomplete' })
    }

    const toolCount = config.selectedItems.length * config.columns.length
    return NextResponse.json({
      ready: true,
      toolCount,
      items: config.selectedItems.length,
      locations: config.columns.length,
      source: 'legacy-config'
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
