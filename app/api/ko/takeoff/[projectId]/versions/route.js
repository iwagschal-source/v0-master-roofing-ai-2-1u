import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'
import {
  getSpreadsheetTabs,
  readVersionTracker,
  setActiveVersion,
  updateVersionStatus,
  copyExistingVersion,
  versionHasData,
  deleteVersion,
  addVersionTrackerEntry,
} from '@/lib/version-management'

/**
 * Helper: get spreadsheetId from BigQuery for a project
 */
async function getSpreadsheetId(projectId) {
  const rows = await runQuery(`
    SELECT takeoff_spreadsheet_id
    FROM \`master-roofing-intelligence.mr_main.project_folders\`
    WHERE id = @projectId
    LIMIT 1
  `, { projectId })

  if (!rows || rows.length === 0) return null
  return rows[0].takeoff_spreadsheet_id
}

/**
 * GET /api/ko/takeoff/[projectId]/versions
 *
 * Lists all versions from the Setup tab tracker, cross-referenced with actual tabs.
 */
export async function GET(request, { params }) {
  try {
    const { projectId } = await params
    const spreadsheetId = await getSpreadsheetId(projectId)

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Project not found or has no spreadsheet' }, { status: 404 })
    }

    // Get actual tabs to cross-reference
    const actualTabs = await getSpreadsheetTabs(spreadsheetId)

    // Check if Setup tab exists (old projects may not have one)
    const hasSetup = actualTabs.some(t => t.title === 'Setup')
    if (!hasSetup) {
      return NextResponse.json({
        success: true,
        versions: [],
        totalTabs: actualTabs.length,
        noSetupTab: true,
      })
    }

    // Read tracker entries from Setup tab
    const trackerEntries = await readVersionTracker(spreadsheetId)
    const actualTabNames = new Set(actualTabs.map(t => t.title))

    // Enrich tracker entries with existence check
    const versions = trackerEntries.map(entry => ({
      ...entry,
      existsAsTab: actualTabNames.has(entry.sheetName),
    }))

    return NextResponse.json({
      success: true,
      versions,
      totalTabs: actualTabs.length,
    })
  } catch (error) {
    console.error('Error listing versions:', error)
    return NextResponse.json(
      { error: 'Failed to list versions', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/ko/takeoff/[projectId]/versions
 *
 * Set active version and/or update status.
 * Body: { sheetName: string, setActive?: boolean, status?: string }
 */
export async function PUT(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { sheetName, setActive, status } = body

    if (!sheetName) {
      return NextResponse.json({ error: 'Missing sheetName' }, { status: 400 })
    }

    const spreadsheetId = await getSpreadsheetId(projectId)
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const results = {}

    // Set active version (clears others)
    if (setActive) {
      await setActiveVersion(spreadsheetId, sheetName)
      results.activeSet = true

      // Sync to BigQuery (non-fatal)
      try {
        await runQuery(`
          UPDATE \`master-roofing-intelligence.mr_main.project_versions\`
          SET is_active = (sheet_name = @sheetName)
          WHERE project_id = @projectId
        `, { projectId, sheetName })
      } catch (e) {
        console.warn('Non-fatal: BQ active sync failed:', e.message)
      }
    }

    // Update status
    if (status) {
      await updateVersionStatus(spreadsheetId, sheetName, status)
      results.statusUpdated = status

      // Sync to BigQuery (non-fatal)
      try {
        await runQuery(`
          UPDATE \`master-roofing-intelligence.mr_main.project_versions\`
          SET status = @status
          WHERE project_id = @projectId AND sheet_name = @sheetName
        `, { projectId, sheetName, status })
      } catch (e) {
        console.warn('Non-fatal: BQ status sync failed:', e.message)
      }
    }

    return NextResponse.json({ success: true, sheetName, ...results })
  } catch (error) {
    console.error('Error updating version:', error)
    return NextResponse.json(
      { error: 'Failed to update version', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ko/takeoff/[projectId]/versions
 *
 * Copy an existing version tab.
 * Body: { sourceSheetName: string }
 */
export async function POST(request, { params }) {
  try {
    const { projectId } = await params
    const body = await request.json()
    const { sourceSheetName } = body

    if (!sourceSheetName) {
      return NextResponse.json({ error: 'Missing sourceSheetName' }, { status: 400 })
    }

    const spreadsheetId = await getSpreadsheetId(projectId)
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const result = await copyExistingVersion(spreadsheetId, sourceSheetName)

    // Add to Setup tab version tracker
    await addVersionTrackerEntry(spreadsheetId, result.newSheetName, 0, 0)

    // Log to BigQuery (non-fatal)
    try {
      await runQuery(`
        INSERT INTO \`master-roofing-intelligence.mr_main.project_versions\`
        (project_id, sheet_name, created_at, items_count, locations_count, status, is_active, copied_from)
        VALUES (@projectId, @sheetName, CURRENT_TIMESTAMP(), 0, 0, 'Draft', false, @source)
      `, {
        projectId,
        sheetName: result.newSheetName,
        source: sourceSheetName,
      })
    } catch (e) {
      console.warn('Non-fatal: BQ copy log failed:', e.message)
    }

    return NextResponse.json({
      success: true,
      newSheetName: result.newSheetName,
      newTabSheetId: result.newTabSheetId,
      copiedFrom: sourceSheetName,
    })
  } catch (error) {
    console.error('Error copying version:', error)
    return NextResponse.json(
      { error: 'Failed to copy version', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/ko/takeoff/[projectId]/versions
 *
 * Safe delete a version tab.
 * Query params: ?sheet=name&force=true|false
 */
export async function DELETE(request, { params }) {
  try {
    const { projectId } = await params
    const { searchParams } = new URL(request.url)
    const sheetName = searchParams.get('sheet')
    const force = searchParams.get('force') === 'true'

    if (!sheetName) {
      return NextResponse.json({ error: 'Missing sheet query parameter' }, { status: 400 })
    }

    // Prevent deleting Setup or Library
    if (sheetName === 'Setup' || sheetName === 'Library') {
      return NextResponse.json({ error: 'Cannot delete protected tab' }, { status: 403 })
    }

    const spreadsheetId = await getSpreadsheetId(projectId)
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if version has data (unless force)
    if (!force) {
      const hasData = await versionHasData(spreadsheetId, sheetName)
      if (hasData) {
        return NextResponse.json({
          error: 'Version has data. Use force=true to delete anyway.',
          hasData: true,
        }, { status: 409 })
      }
    }

    await deleteVersion(spreadsheetId, sheetName, force)

    // Remove from BigQuery (non-fatal)
    try {
      await runQuery(`
        DELETE FROM \`master-roofing-intelligence.mr_main.project_versions\`
        WHERE project_id = @projectId AND sheet_name = @sheetName
      `, { projectId, sheetName })
    } catch (e) {
      console.warn('Non-fatal: BQ delete sync failed:', e.message)
    }

    return NextResponse.json({
      success: true,
      deleted: sheetName,
      forced: force,
    })
  } catch (error) {
    console.error('Error deleting version:', error)
    return NextResponse.json(
      { error: 'Failed to delete version', details: error.message },
      { status: 500 }
    )
  }
}
