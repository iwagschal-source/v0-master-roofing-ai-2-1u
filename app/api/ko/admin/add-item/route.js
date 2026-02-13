/**
 * Add Item to Library API
 * POST /api/ko/admin/add-item
 *
 * Inserts a new item into:
 * 1. item_description_mapping (27 columns)
 * 2. lib_takeoff_template (10 columns)
 * 3. Refreshes Library tab on template spreadsheet
 *
 * The v_library_complete view auto-updates (it's a JOIN view).
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

// Valid values
const VALID_SECTIONS = ['ROOFING', 'BALCONIES', 'EXTERIOR', 'WATERPROOFING']
const VALID_UOMS = ['SF', 'LF', 'EA', 'SY', 'CF', 'GAL', 'LS']
const VALID_ROW_TYPES = ['item', 'system', 'COMPONENT_ROW', 'STANDALONE_ROW', 'SYSTEM_ROW']

/**
 * GET - List existing items (for parent dropdown, duplicate check)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const field = searchParams.get('field') // 'systems' | 'all' | 'tools'

    if (field === 'systems') {
      // Return system items for parent_item_id dropdown
      const rows = await runQuery(`
        SELECT item_id, display_name, section
        FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
        WHERE is_system = TRUE
        ORDER BY section, display_name
      `)
      return NextResponse.json({ systems: rows })
    }

    if (field === 'tools') {
      // Return items with bluebeam tools for dropdown
      const rows = await runQuery(`
        SELECT item_id, bluebeam_tool_name
        FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
        WHERE bluebeam_tool_name IS NOT NULL AND bluebeam_tool_name != ''
        ORDER BY item_id
      `)
      return NextResponse.json({ tools: rows })
    }

    // Default: return all item_ids for duplicate check
    const rows = await runQuery(`
      SELECT item_id, display_name, section
      FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
      ORDER BY section, item_id
    `)
    return NextResponse.json({ items: rows })

  } catch (error) {
    console.error('[add-item] GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * POST - Add new item to library
 */
export async function POST(request) {
  try {
    const body = await request.json()

    // --- Validation ---
    const { item_id, display_name, scope_name, section, uom } = body
    const errors = []

    if (!item_id || typeof item_id !== 'string') errors.push('item_id is required')
    if (!display_name || typeof display_name !== 'string') errors.push('display_name is required')
    if (!scope_name || typeof scope_name !== 'string') errors.push('scope_name is required')
    if (!section || !VALID_SECTIONS.includes(section)) errors.push(`section must be one of: ${VALID_SECTIONS.join(', ')}`)
    if (!uom || !VALID_UOMS.includes(uom)) errors.push(`uom must be one of: ${VALID_UOMS.join(', ')}`)

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })
    }

    // Check for duplicate item_id
    const existing = await runQuery(
      `SELECT item_id FROM \`master-roofing-intelligence.mr_main.item_description_mapping\` WHERE item_id = @itemId`,
      { itemId: item_id }
    )
    if (existing.length > 0) {
      return NextResponse.json({ error: `Item ID "${item_id}" already exists` }, { status: 409 })
    }

    // --- Determine computed fields ---
    const is_system = body.item_type === 'system'
    const can_standalone = body.can_standalone ?? (body.item_type === 'standalone' || body.item_type === 'system')
    const can_bundle = is_system ? false : (body.can_bundle ?? (body.item_type === 'component'))

    // row_type mapping
    let row_type = 'item'
    if (body.item_type === 'system') row_type = 'system'
    else if (body.item_type === 'component') row_type = 'COMPONENT_ROW'
    else if (body.item_type === 'standalone') row_type = 'STANDALONE_ROW'

    // description_status
    const hasDescription = !!(body.paragraph_description || body.standalone_description || body.bundle_fragment)
    const description_status = hasDescription ? 'HAS_DESCRIPTION' : 'MISSING'

    // has_bluebeam_tool
    const has_bluebeam_tool = !!(body.bluebeam_tool_name && body.bluebeam_tool_name.trim())

    // has_scope_mapping
    const has_scope_mapping = !!(scope_name && scope_name.trim())

    // --- Insert into item_description_mapping ---
    const idmQuery = `
      INSERT INTO \`master-roofing-intelligence.mr_main.item_description_mapping\`
      (item_id, display_name, scope_name, section, uom, default_rate,
       has_r_value, has_thickness, has_material_type, row_type, description_status,
       paragraph_description, bundling_notes, is_system, can_standalone, can_bundle,
       system_heading, bundle_fragment, standalone_description, fragment_sort_order,
       has_bluebeam_tool, has_template_row, has_scope_mapping, has_historical_data,
       has_rate, parent_item_id, historical_project_count, bluebeam_tool_name)
      VALUES
      (@item_id, @display_name, @scope_name, @section, @uom, @default_rate,
       @has_r_value, @has_thickness, @has_material_type, @row_type, @description_status,
       @paragraph_description, @bundling_notes, @is_system, @can_standalone, @can_bundle,
       @system_heading, @bundle_fragment, @standalone_description, @fragment_sort_order,
       @has_bluebeam_tool, FALSE, @has_scope_mapping, FALSE,
       FALSE, @parent_item_id, 0, @bluebeam_tool_name)
    `

    const idmParams = {
      item_id,
      display_name,
      scope_name,
      section,
      uom,
      default_rate: body.default_rate ? parseFloat(body.default_rate) : null,
      has_r_value: body.has_r_value ?? false,
      has_thickness: body.has_thickness ?? false,
      has_material_type: body.has_material_type ?? false,
      row_type,
      description_status,
      paragraph_description: body.paragraph_description || null,
      bundling_notes: body.bundling_notes || null,
      is_system,
      can_standalone,
      can_bundle,
      system_heading: body.system_heading || null,
      bundle_fragment: body.bundle_fragment || null,
      standalone_description: body.standalone_description || null,
      fragment_sort_order: body.fragment_sort_order ? parseInt(body.fragment_sort_order) : null,
      has_bluebeam_tool,
      has_scope_mapping,
      parent_item_id: body.parent_item_id || null,
      bluebeam_tool_name: body.bluebeam_tool_name || null,
    }

    await runQuery(idmQuery, idmParams)
    console.log(`[add-item] Inserted ${item_id} into item_description_mapping`)

    // --- Insert into lib_takeoff_template ---
    // Get max sort_order for auto-increment
    const sortRows = await runQuery(
      `SELECT MAX(sort_order) as max_sort FROM \`master-roofing-intelligence.mr_main.lib_takeoff_template\``
    )
    const nextSort = (sortRows[0]?.max_sort || 0) + 1

    const ltQuery = `
      INSERT INTO \`master-roofing-intelligence.mr_main.lib_takeoff_template\`
      (item_id, section, scope_name, default_unit_cost, uom, sort_order,
       has_r_value, has_thickness, has_material_type, notes)
      VALUES
      (@item_id, @section, @scope_name, @default_unit_cost, @uom, @sort_order,
       @has_r_value, @has_thickness, @has_material_type, @notes)
    `

    const ltParams = {
      item_id,
      section,
      scope_name,
      default_unit_cost: body.default_unit_cost ? parseFloat(body.default_unit_cost) : null,
      uom,
      sort_order: nextSort,
      has_r_value: body.has_r_value ?? false,
      has_thickness: body.has_thickness ?? false,
      has_material_type: body.has_material_type ?? false,
      notes: body.notes || null,
    }

    await runQuery(ltQuery, ltParams)
    console.log(`[add-item] Inserted ${item_id} into lib_takeoff_template`)

    // --- Read back from v_library_complete to get readiness_score ---
    const viewRows = await runQuery(
      `SELECT readiness_score, readiness_max FROM \`master-roofing-intelligence.mr_main.v_library_complete\` WHERE item_id = @itemId`,
      { itemId: item_id }
    )
    const readiness = viewRows[0] || { readiness_score: 0, readiness_max: 6 }

    // --- Build response ---
    const manualSteps = []
    if (!has_bluebeam_tool) manualSteps.push('Create Bluebeam tool (Tool Manager)')
    manualSteps.push('Refresh Library tab on template (or wait for next project creation)')
    if (!body.paragraph_description && !body.standalone_description) {
      manualSteps.push('Add description text for proposals')
    }

    return NextResponse.json({
      success: true,
      item_id,
      display_name,
      section,
      readiness_score: readiness.readiness_score,
      readiness_max: readiness.readiness_max,
      propagation: {
        item_description_mapping: 'inserted',
        lib_takeoff_template: 'inserted',
        v_library_complete: 'auto-updated (view)',
        library_tab: 'pending refresh',
      },
      manual_steps: manualSteps,
    })

  } catch (error) {
    console.error('[add-item] POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
