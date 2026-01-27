/**
 * BTX Generation API - Calls backend that actually works
 */

import { NextResponse } from 'next/server'
import https from 'https'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

const fetchBackend = async (url, options = {}) => {
  const agent = new https.Agent({ rejectUnauthorized: false })
  return fetch(url, { ...options, agent })
}

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

    // Build request for backend
    const items = config.selectedItems.map(item => ({
      item_id: item.scope_code,
      display_name: item.scope_name || item.scope_code
    }))

    const locations = config.columns.map(col =>
      col.mappings?.[0] || col.name.toUpperCase().replace(/[^A-Z0-9]/g, '')
    )

    // Call backend that actually generates valid BTX
    const backendRes = await fetchBackend(`${BACKEND_URL}/bluebeam/generate-btx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_name: body.projectName || projectId,
        selected_items: items.map(i => i.item_id),
        locations: locations
      })
    })

    if (!backendRes.ok) {
      const err = await backendRes.text()
      return NextResponse.json({ error: err }, { status: backendRes.status })
    }

    const btxBytes = await backendRes.arrayBuffer()
    const filename = `${(body.projectName || projectId).replace(/[^a-zA-Z0-9]/g, '_')}_Tools.btx`

    return new NextResponse(btxBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (err) {
    console.error('BTX error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

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
