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

    // 4. Build per-item location details for BTX
    // Each item includes only its toggled locations with proper names from its OWN section
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

    // 5. Build global locations as the UNION of all per-item location names
    // Different sections use different names for the same column (e.g., col 1 = "2nd Floor" for ROOFING, "Rear / Elevation" for EXTERIOR)
    // We need ALL unique location names so the BTX route generates a file for each
    const locationMap = new Map() // key = "colIndex:name" to deduplicate
    for (const item of selectedItems) {
      for (const loc of item.locations) {
        const key = `${loc.colIndex}:${loc.name}`
        if (!locationMap.has(key)) {
          locationMap.set(key, { colIndex: loc.colIndex, name: loc.name })
        }
      }
    }
    const activeLocations = Array.from(locationMap.values())

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
      locations_count: activeLocations.length,
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
