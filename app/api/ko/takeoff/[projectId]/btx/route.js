/**
 * BTX Generation API - Local implementation
 * Generates Bluebeam Tool Chest files without external backend
 */

import { NextResponse } from 'next/server'
import JSZip from 'jszip'

/**
 * Generate BTX XML content for tools
 */
function generateBtxXml(tools, projectName) {
  const toolsXml = tools.map((tool, idx) => `
    <Tool id="${idx + 1}">
      <Name>${escapeXml(tool.name)}</Name>
      <Subject>${escapeXml(tool.itemCode)}</Subject>
      <Label>${escapeXml(tool.location)}</Label>
      <Type>PolyLength</Type>
      <Color>#FF0000</Color>
      <Opacity>0.5</Opacity>
      <LineWidth>2</LineWidth>
      <LineStyle>Solid</LineStyle>
      <FillColor>#FFFF00</FillColor>
      <FillOpacity>0.3</FillOpacity>
      <MeasurementType>Area</MeasurementType>
      <Locked>false</Locked>
    </Tool>`).join('\n')

  return `<?xml version="1.0" encoding="utf-8"?>
<ToolChest version="1.0" name="${escapeXml(projectName)} Tools">
  <Description>Generated takeoff tools for ${escapeXml(projectName)}</Description>
  <Tools>${toolsXml}
  </Tools>
</ToolChest>`
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * POST /api/ko/takeoff/[projectId]/btx
 * Generate and download BTX file
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

    // Generate tools: one for each item + location combination
    const tools = []
    for (const item of config.selectedItems) {
      for (const col of config.columns) {
        const locationCode = col.mappings?.[0] || col.name.toUpperCase().replace(/[^A-Z0-9]/g, '')
        tools.push({
          name: `${item.scope_code} | ${locationCode}`,
          itemCode: item.scope_code,
          location: locationCode,
          displayName: item.scope_name || item.scope_code
        })
      }
    }

    // Generate BTX XML
    const btxXml = generateBtxXml(tools, projectName)

    // Create ZIP archive (BTX is a ZIP file)
    const zip = new JSZip()
    zip.file('ToolChest.xml', btxXml)

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    })

    const filename = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Tools.btx`

    return new NextResponse(zipBuffer, {
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
