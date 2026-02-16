/**
 * Bluebeam Tool Manager API
 * Source of truth: BigQuery mr_main.bluebeam_tools (75 tools seeded from Teju Tool Set)
 *
 * GET  /api/ko/bluebeam/tools — List all tools + gap analysis
 * POST /api/ko/bluebeam/tools — Create, update, clone, assign, unassign tools
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

/**
 * GET /api/ko/bluebeam/tools
 * Query params: ?section=ROOFING&search=coping
 *
 * Returns:
 * - tools: All tools from bluebeam_tools table (with full visual properties)
 * - libraryItems: All items from item_description_mapping
 * - gaps: Items that have no bluebeam tool assigned
 * - stats: { totalTools, mappedCount, unmappedCount, missingLabels, gapCount }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')
    const search = searchParams.get('search')

    // Fetch all tools from BigQuery
    let toolQuery = `
      SELECT *
      FROM \`master-roofing-intelligence.mr_main.bluebeam_tools\`
      ORDER BY tool_id
    `
    const allTools = await runQuery(toolQuery)

    // Fetch all library items
    const libraryRows = await runQuery(`
      SELECT
        item_id, display_name, scope_name, section, uom,
        bluebeam_tool_name, has_bluebeam_tool, row_type, is_system
      FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
      WHERE row_type NOT IN ('header')
      ORDER BY section, item_id
    `)

    // Build gaps: library items without bluebeam tools
    const gaps = libraryRows.filter(
      (item) => !item.bluebeam_tool_name || item.bluebeam_tool_name === ''
    )

    // Apply filters to tools
    let filteredTools = allTools
    if (section) {
      const sectionItemIds = new Set(
        libraryRows.filter((i) => i.section === section).map((i) => i.item_id)
      )
      filteredTools = filteredTools.filter(
        (t) => t.item_id && sectionItemIds.has(t.item_id)
      )
    }
    if (search) {
      const q = search.toLowerCase()
      filteredTools = filteredTools.filter(
        (t) =>
          (t.subject && t.subject.toLowerCase().includes(q)) ||
          (t.item_id && t.item_id.toLowerCase().includes(q)) ||
          (t.scope_name && t.scope_name.toLowerCase().includes(q)) ||
          (t.label && t.label.toLowerCase().includes(q))
      )
    }

    return NextResponse.json({
      tools: filteredTools,
      libraryItems: libraryRows,
      gaps,
      stats: {
        totalTools: allTools.length,
        mappedCount: allTools.filter((t) => t.is_mapped).length,
        unmappedCount: allTools.filter((t) => !t.is_mapped).length,
        missingLabels: allTools.filter((t) => !t.label || t.label === '').length,
        gapCount: gaps.length,
      },
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
 * Body: { action, ... }
 *
 * Actions:
 * - "update": Update tool properties (label, colors, opacity, etc.)
 * - "create": Create a new tool and assign to item
 * - "clone": Clone existing tool with new name/item
 * - "assign": Assign existing tool to library item (updates item_description_mapping)
 * - "unassign": Remove tool assignment from library item
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { action } = body

    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    }

    switch (action) {
      case 'update':
        return handleUpdate(body)
      case 'create':
        return handleCreate(body)
      case 'clone':
        return handleClone(body)
      case 'assign':
        return handleAssign(body)
      case 'unassign':
        return handleUnassign(body)
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (error) {
    console.error('Tool Manager POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * Update an existing tool's properties
 */
async function handleUpdate(body) {
  const { tool_id, updates } = body
  if (!tool_id || !updates) {
    return NextResponse.json({ error: 'Missing tool_id or updates' }, { status: 400 })
  }

  // Build SET clause from allowed fields
  const ALLOWED_FIELDS = [
    'subject', 'label', 'label_status', 'layer', 'type', 'type_internal', 'unit',
    'visual_template', 'border_color_hex', 'border_color_rgb',
    'fill_color_hex', 'fill_color_rgb', 'fill_opacity',
    'line_width', 'line_style', 'line_opacity', 'column_data',
    'item_id', 'scope_name', 'is_mapped', 'is_specialty',
  ]

  const setClauses = []
  const params = { toolId: tool_id }

  for (const [key, value] of Object.entries(updates)) {
    if (!ALLOWED_FIELDS.includes(key)) continue
    const paramName = `p_${key}`
    setClauses.push(`${key} = @${paramName}`)
    params[paramName] = value
  }

  if (setClauses.length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  setClauses.push('updated_at = CURRENT_TIMESTAMP()')

  await runQuery(`
    UPDATE \`master-roofing-intelligence.mr_main.bluebeam_tools\`
    SET ${setClauses.join(', ')}
    WHERE tool_id = @toolId
  `, params)

  // If label was updated, recalculate label_status
  if (updates.label !== undefined) {
    const newLabel = updates.label || ''
    const [tool] = await runQuery(
      'SELECT subject FROM `master-roofing-intelligence.mr_main.bluebeam_tools` WHERE tool_id = @toolId',
      { toolId: tool_id }
    )
    if (tool) {
      let labelStatus = 'empty'
      if (newLabel && newLabel.toLowerCase() === tool.subject?.toLowerCase()) {
        labelStatus = 'matches_subject'
      } else if (newLabel) {
        labelStatus = 'custom'
      }
      await runQuery(`
        UPDATE \`master-roofing-intelligence.mr_main.bluebeam_tools\`
        SET label_status = @labelStatus
        WHERE tool_id = @toolId
      `, { labelStatus, toolId: tool_id })
    }
  }

  return NextResponse.json({
    success: true,
    message: `Updated tool ${tool_id}`,
    tool_id,
  })
}

/**
 * Create a new tool
 */
async function handleCreate(body) {
  const { tool } = body
  if (!tool || !tool.subject) {
    return NextResponse.json({ error: 'Missing tool data or subject' }, { status: 400 })
  }

  // Get next tool_id
  const [maxRow] = await runQuery(
    'SELECT MAX(tool_id) as max_id FROM `master-roofing-intelligence.mr_main.bluebeam_tools`'
  )
  const nextId = (maxRow?.max_id || 75) + 1

  // Calculate label_status
  let labelStatus = 'empty'
  if (tool.label && tool.label.toLowerCase() === tool.subject.toLowerCase()) {
    labelStatus = 'matches_subject'
  } else if (tool.label) {
    labelStatus = 'custom'
  }

  await runQuery(`
    INSERT INTO \`master-roofing-intelligence.mr_main.bluebeam_tools\`
    (tool_id, subject, label, label_status, layer, type, type_internal, unit,
     visual_template, border_color_hex, border_color_rgb, fill_color_hex, fill_color_rgb,
     fill_opacity, line_width, line_style, line_opacity,
     item_id, scope_name, is_mapped, is_specialty, created_at, updated_at, created_by)
    VALUES
    (@toolId, @subject, @label, @labelStatus, @layer, @type, @typeInternal, @unit,
     @visualTemplate, @borderColorHex, @borderColorRgb, @fillColorHex, @fillColorRgb,
     @fillOpacity, @lineWidth, @lineStyle, @lineOpacity,
     @itemId, @scopeName, @isMapped, @isSpecialty, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP(), @createdBy)
  `, {
    toolId: nextId,
    subject: tool.subject,
    label: tool.label || null,
    labelStatus,
    layer: tool.layer || null,
    type: tool.type || 'Area',
    typeInternal: tool.type_internal || `AnnotationMeasure${tool.type || 'Area'}`,
    unit: tool.unit || 'SF',
    visualTemplate: tool.visual_template || null,
    borderColorHex: tool.border_color_hex || '#ff0000',
    borderColorRgb: tool.border_color_rgb || null,
    fillColorHex: tool.fill_color_hex || null,
    fillColorRgb: tool.fill_color_rgb || null,
    fillOpacity: tool.fill_opacity ?? null,
    lineWidth: tool.line_width ?? null,
    lineStyle: tool.line_style || 'S',
    lineOpacity: tool.line_opacity ?? null,
    itemId: tool.item_id || null,
    scopeName: tool.scope_name || null,
    isMapped: !!tool.item_id,
    isSpecialty: tool.is_specialty || false,
    createdBy: tool.created_by || 'tool-manager',
  })

  // Also update item_description_mapping if item_id provided
  if (tool.item_id) {
    await runQuery(`
      UPDATE \`master-roofing-intelligence.mr_main.item_description_mapping\`
      SET bluebeam_tool_name = @toolName, has_bluebeam_tool = TRUE
      WHERE item_id = @itemId
    `, { toolName: tool.subject, itemId: tool.item_id })
  }

  return NextResponse.json({
    success: true,
    message: `Created tool "${tool.subject}" (ID: ${nextId})`,
    tool_id: nextId,
  })
}

/**
 * Clone an existing tool
 */
async function handleClone(body) {
  const { source_tool_id, new_subject, new_label, new_item_id, new_scope_name } = body
  if (!source_tool_id || !new_subject) {
    return NextResponse.json({ error: 'Missing source_tool_id or new_subject' }, { status: 400 })
  }

  // Get source tool
  const [source] = await runQuery(
    'SELECT * FROM `master-roofing-intelligence.mr_main.bluebeam_tools` WHERE tool_id = @toolId',
    { toolId: source_tool_id }
  )
  if (!source) {
    return NextResponse.json({ error: 'Source tool not found' }, { status: 404 })
  }

  // Create as new tool with source properties
  return handleCreate({
    tool: {
      ...source,
      subject: new_subject,
      label: new_label || new_subject,
      layer: new_label || new_subject,
      item_id: new_item_id || null,
      scope_name: new_scope_name || null,
      created_by: 'tool-manager-clone',
    },
  })
}

/**
 * Assign an existing tool to a library item
 */
async function handleAssign(body) {
  const { item_id, tool_name } = body
  if (!item_id || !tool_name) {
    return NextResponse.json({ error: 'Missing item_id or tool_name' }, { status: 400 })
  }

  await runQuery(`
    UPDATE \`master-roofing-intelligence.mr_main.item_description_mapping\`
    SET bluebeam_tool_name = @toolName, has_bluebeam_tool = TRUE
    WHERE item_id = @itemId
  `, { toolName: tool_name, itemId: item_id })

  return NextResponse.json({
    success: true,
    message: `Assigned tool "${tool_name}" to ${item_id}`,
  })
}

/**
 * Remove tool assignment from a library item
 */
async function handleUnassign(body) {
  const { item_id } = body
  if (!item_id) {
    return NextResponse.json({ error: 'Missing item_id' }, { status: 400 })
  }

  await runQuery(`
    UPDATE \`master-roofing-intelligence.mr_main.item_description_mapping\`
    SET bluebeam_tool_name = NULL, has_bluebeam_tool = FALSE
    WHERE item_id = @itemId
  `, { itemId: item_id })

  return NextResponse.json({
    success: true,
    message: `Unassigned tool from ${item_id}`,
  })
}
