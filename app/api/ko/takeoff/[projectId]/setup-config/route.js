/**
 * Setup Config API — Read BTX configuration from the Setup tab
 *
 * GET /api/ko/takeoff/[projectId]/setup-config
 *
 * Returns items with toggles, location names, and tool names from the Setup tab.
 * Used by BTX generation (Phase 3) instead of sheet-config (which reads takeoff tab).
 *
 * Response shape:
 * - selected_items: items with at least one location toggle active
 * - locations: active location names (from section headers, only columns with toggles)
 * - items_count / locations_count: summary counts for BTX preview
 * - tool_count: total tools to generate (items × locations per item)
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'
import { readSetupConfig } from '@/lib/version-management'

export async function GET(request, { params }) {
  try {
    const { projectId } = await params

    // 1. Get spreadsheet ID and project name from BigQuery
    const bqResult = await runQuery(
      `SELECT takeoff_spreadsheet_id, project_name
       FROM \`master-roofing-intelligence.mr_main.project_folders\`
       WHERE id = @projectId`,
      { projectId },
      { location: 'US' }
    )

    if (!bqResult || bqResult.length === 0) {
      return NextResponse.json(
        { error: 'Project not found', exists: false },
        { status: 404 }
      )
    }

    const { takeoff_spreadsheet_id: spreadsheetId, project_name: projectName } = bqResult[0]

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'No takeoff spreadsheet found for this project', exists: false },
        { status: 404 }
      )
    }

    // 2. Read Setup tab configuration
    const setupConfig = await readSetupConfig(spreadsheetId)
    const { rows, locationToggles, activeLocationCols, itemsCount, locationsCount, sectionLocationNames } = setupConfig

    // 3. Filter to only items with at least one toggle active
    const activeItems = rows.filter(r => r.hasAnyToggle)

    // 4. Build active location list from section headers
    // Only include location columns that have at least one toggle across all items
    const activeLocations = []
    for (let i = 0; i < locationToggles.length; i++) {
      if (!locationToggles[i]) continue
      // Get location name from the first section that has a name for this column
      // (all sections share the same column indices G-M)
      let locName = ''
      for (const sectionName of Object.keys(sectionLocationNames)) {
        const name = sectionLocationNames[sectionName][i]
        if (name) {
          locName = name
          break
        }
      }
      activeLocations.push({
        colIndex: i, // 0-based index within G-M range
        name: locName || `Location ${i + 1}`,
      })
    }

    // 5. Build per-item location details for BTX
    // Each item includes only its toggled locations with proper names from its section
    const selectedItems = activeItems.map(item => {
      const itemLocations = []
      for (let i = 0; i < item.toggles.length; i++) {
        if (!item.toggles[i]) continue
        const sectionLocs = sectionLocationNames[item.section] || []
        itemLocations.push({
          colIndex: i,
          name: sectionLocs[i] || `Location ${i + 1}`,
        })
      }
      return {
        item_id: item.itemId,
        scope: item.scope,
        section: item.section,
        tool_name: item.toolName,
        row: item.rowNum,
        locations: itemLocations,
      }
    })

    // 6. Count total tools (sum of locations per item)
    const toolCount = selectedItems.reduce((sum, item) => sum + item.locations.length, 0)

    return NextResponse.json({
      exists: true,
      project_id: projectId,
      project_name: projectName,
      spreadsheet_id: spreadsheetId,
      selected_items: selectedItems,
      locations: activeLocations,
      section_locations: sectionLocationNames,
      items_count: itemsCount,
      locations_count: locationsCount,
      tool_count: toolCount,
    })
  } catch (err) {
    console.error('[setup-config] Error:', err)
    return NextResponse.json(
      { error: 'Failed to read setup config: ' + err.message },
      { status: 500 }
    )
  }
}
