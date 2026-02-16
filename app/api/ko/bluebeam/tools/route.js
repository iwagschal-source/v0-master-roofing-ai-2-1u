/**
 * Bluebeam Tool Manager API
 * GET  /api/ko/bluebeam/tools — List all tools from Python backend + gap analysis from BigQuery
 * POST /api/ko/bluebeam/tools — Update BigQuery bluebeam_tool_name for an item
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://136.111.252.120:8000'

/**
 * GET /api/ko/bluebeam/tools
 * Returns:
 * - tools: Array of tools from Python backend (with teju_subject, item_id, scope_name, is_mapped)
 * - libraryItems: Array of all items from BigQuery with bluebeam_tool_name status
 * - gaps: Array of items that have NO bluebeam tool assigned
 * - teju_tools: Full visual properties from teju_tools_full.json (cached in-memory)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section') // optional filter
    const search = searchParams.get('search') // optional search

    // Fetch tools from Python backend
    const toolsRes = await fetch(`${BACKEND_URL}/bluebeam/tools`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!toolsRes.ok) {
      throw new Error(`Python backend returned ${toolsRes.status}`)
    }
    const backendTools = await toolsRes.json()

    // Fetch all library items from BigQuery with bluebeam status
    const libraryRows = await runQuery(`
      SELECT
        item_id,
        display_name,
        scope_name,
        section,
        uom,
        bluebeam_tool_name,
        has_bluebeam_tool,
        row_type,
        is_system
      FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
      WHERE row_type NOT IN ('header')
      ORDER BY section, item_id
    `)

    // Build gaps: items without bluebeam tools
    const gaps = libraryRows.filter(
      (item) => !item.bluebeam_tool_name || item.bluebeam_tool_name === ''
    )

    // Apply filters
    let filteredTools = backendTools
    if (section) {
      // Filter backend tools by matching to library items in that section
      const sectionItemIds = new Set(
        libraryRows.filter((i) => i.section === section).map((i) => i.item_id)
      )
      filteredTools = backendTools.filter(
        (t) => t.item_id && sectionItemIds.has(t.item_id)
      )
    }
    if (search) {
      const q = search.toLowerCase()
      filteredTools = filteredTools.filter(
        (t) =>
          (t.teju_subject && t.teju_subject.toLowerCase().includes(q)) ||
          (t.item_id && t.item_id.toLowerCase().includes(q)) ||
          (t.scope_name && t.scope_name.toLowerCase().includes(q))
      )
    }

    return NextResponse.json({
      tools: filteredTools,
      totalTools: backendTools.length,
      mappedCount: backendTools.filter((t) => t.is_mapped).length,
      unmappedCount: backendTools.filter((t) => !t.is_mapped).length,
      libraryItems: libraryRows,
      gaps,
      gapCount: gaps.length,
    })
  } catch (error) {
    console.error('Tool Manager GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tools', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ko/bluebeam/tools
 * Body: { action, item_id, tool_name, ... }
 *
 * Actions:
 * - "assign": Assign a tool name to an item in BigQuery
 * - "unassign": Remove tool assignment from an item
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, item_id, tool_name } = body

    if (!action || !item_id) {
      return NextResponse.json(
        { error: 'Missing required fields: action, item_id' },
        { status: 400 }
      )
    }

    if (action === 'assign') {
      if (!tool_name) {
        return NextResponse.json(
          { error: 'Missing tool_name for assign action' },
          { status: 400 }
        )
      }

      // Update bluebeam_tool_name and has_bluebeam_tool in BigQuery
      await runQuery(`
        UPDATE \`master-roofing-intelligence.mr_main.item_description_mapping\`
        SET bluebeam_tool_name = @toolName,
            has_bluebeam_tool = TRUE
        WHERE item_id = @itemId
      `, {
        toolName: tool_name,
        itemId: item_id,
      })

      return NextResponse.json({
        success: true,
        message: `Assigned tool "${tool_name}" to ${item_id}`,
        item_id,
        tool_name,
      })
    }

    if (action === 'unassign') {
      await runQuery(`
        UPDATE \`master-roofing-intelligence.mr_main.item_description_mapping\`
        SET bluebeam_tool_name = NULL,
            has_bluebeam_tool = FALSE
        WHERE item_id = @itemId
      `, {
        itemId: item_id,
      })

      return NextResponse.json({
        success: true,
        message: `Unassigned tool from ${item_id}`,
        item_id,
      })
    }

    return NextResponse.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    )
  } catch (error) {
    console.error('Tool Manager POST error:', error)
    return NextResponse.json(
      { error: 'Failed to update tool', details: error.message },
      { status: 500 }
    )
  }
}
