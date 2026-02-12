/**
 * BTX Generation API - Proxy to Python backend
 * Generates Bluebeam Tool Chest files using the real Bluebeam BTX format
 */

import { NextResponse } from 'next/server'

// FastAPI backend on port 8000 (HTTP, not HTTPS)
const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'https://136.111.252.120'

/**
 * POST /api/ko/takeoff/[projectId]/btx
 * Generate and download BTX file via Python backend
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()

    // Get config
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

    const projectName = body.projectName || projectId

    // Extract item IDs from selectedItems
    const selectedItemIds = config.selectedItems.map(item => item.scope_code)

    // Per-floor mode (default): separate BTX per location, returned as zip
    const locationsWithNames = config.columns.map(col => ({
      code: col.mappings?.[0] || col.name.toUpperCase().replace(/[^A-Z0-9]/g, ''),
      name: col.name
    }))

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
    const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_tools.zip`

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
 * Check if BTX can be generated
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = await params
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
      locations: config.columns.length
    })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
