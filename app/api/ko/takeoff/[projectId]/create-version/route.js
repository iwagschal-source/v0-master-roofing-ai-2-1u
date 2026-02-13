import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'
import { readSheetFormulas } from '@/lib/google-sheets'
import {
  getSpreadsheetTabs,
  generateVersionName,
  copyTemplateTabToProject,
  renameTab,
  readSetupConfig,
  transferSetupToVersion,
  hideEmptyRows,
  hideEmptyColumns,
  addVersionTrackerEntry,
  readVersionTracker,
} from '@/lib/version-management'

/**
 * POST /api/ko/takeoff/[projectId]/create-version
 *
 * Creates a new takeoff version tab in the project spreadsheet.
 * Flow: Copy DATE template → rename → transfer Setup config → hide empty rows/cols → update tracker
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    // 1. Get spreadsheetId + projectName from BigQuery
    const rows = await runQuery(`
      SELECT takeoff_spreadsheet_id, project_name
      FROM \`master-roofing-intelligence.mr_main.project_folders\`
      WHERE id = @projectId
      LIMIT 1
    `, { projectId })

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { takeoff_spreadsheet_id: spreadsheetId, project_name: projectName } = rows[0]

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Project has no spreadsheet' }, { status: 400 })
    }

    // 2. Get existing tabs + tracker history and generate version name (never reuse deleted names)
    const existingTabs = await getSpreadsheetTabs(spreadsheetId)
    const existingNames = existingTabs.map(t => t.title)
    const trackerVersions = await readVersionTracker(spreadsheetId)
    const trackerNames = trackerVersions.map(v => v.sheetName).filter(Boolean)
    const versionName = generateVersionName(existingNames, trackerNames)

    // 3. Read Setup tab configuration (toggles, config, bid types)
    const setupConfig = await readSetupConfig(spreadsheetId)
    const { rows: setupRows, locationToggles, itemsCount, locationsCount, sectionLocationNames } = setupConfig

    // 4. Copy DATE tab from template spreadsheet to this project
    const copiedTabId = await copyTemplateTabToProject(spreadsheetId)

    // 5. Rename the copied tab to the version name
    await renameTab(spreadsheetId, copiedTabId, versionName)

    // 6. Transfer Setup config to the new version tab
    await transferSetupToVersion(spreadsheetId, versionName, setupRows, projectName, sectionLocationNames)

    // 7. Verify Total Cost formulas copied correctly
    let formulaVerification = { checked: false }
    try {
      const formulas = await readSheetFormulas(
        spreadsheetId,
        `'${versionName}'!O4:O10`
      )
      const hasFormulas = formulas && formulas.some(row =>
        row && row[0] && typeof row[0] === 'string' && row[0].startsWith('=')
      )
      formulaVerification = {
        checked: true,
        hasFormulas,
        sampleFormula: formulas?.[0]?.[0] || null,
      }
    } catch (err) {
      formulaVerification = { checked: false, error: err.message }
    }

    // 8. Hide rows with no active items (Rule #1)
    const hiddenRows = await hideEmptyRows(spreadsheetId, copiedTabId, setupRows)

    // 9. Hide unused location columns
    const hiddenColumns = await hideEmptyColumns(spreadsheetId, copiedTabId, locationToggles)

    // 10. Add to version tracker on Setup tab
    await addVersionTrackerEntry(spreadsheetId, versionName, itemsCount, locationsCount)

    // 11. Log to BigQuery project_versions (non-fatal)
    try {
      await runQuery(`
        INSERT INTO \`master-roofing-intelligence.mr_main.project_versions\`
        (project_id, sheet_name, created_at, items_count, locations_count, status, is_active)
        VALUES (@projectId, @sheetName, CURRENT_TIMESTAMP(), @items, @locations, 'Draft', true)
      `, {
        projectId,
        sheetName: versionName,
        items: itemsCount,
        locations: locationsCount,
      })
    } catch (bqErr) {
      console.warn('Non-fatal: Failed to log version to BigQuery:', bqErr.message)
    }

    // 12. Return result
    return NextResponse.json({
      success: true,
      sheetName: versionName,
      spreadsheetId,
      tabSheetId: copiedTabId,
      itemsCount,
      locationsCount,
      formulaVerification,
      hiddenRows: hiddenRows.length,
      hiddenColumns: hiddenColumns.length,
    })
  } catch (error) {
    console.error('Error creating version:', error)
    return NextResponse.json(
      { error: 'Failed to create version', details: error.message },
      { status: 500 }
    )
  }
}
