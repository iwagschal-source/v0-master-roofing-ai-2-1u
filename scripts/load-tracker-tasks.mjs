#!/usr/bin/env node
/**
 * Phase 9.2: Parse MASTER_PLAN_v4.md and load all tasks into implementation_tracker
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

const planPath = new URL('../docs/MASTER_PLAN_v4.md', import.meta.url).pathname;
const content = readFileSync(planPath, 'utf-8');

const tasks = [];

// Parse Phase 0A
const phase0ATasks = [
  { phase: '0A', task_id: '0A.1', description: 'Git tag current state: git tag v2.0-pre-rebuild', file_affected: 'Git', task_type: 'backup' },
  { phase: '0A', task_id: '0A.2', description: 'Copy template spreadsheet to backup', file_affected: 'Google Drive', task_type: 'backup' },
  { phase: '0A', task_id: '0A.3', description: 'Export item_description_mapping to CSV', file_affected: 'BigQuery', task_type: 'backup' },
  { phase: '0A', task_id: '0A.4', description: 'Export lib_takeoff_template to CSV', file_affected: 'BigQuery', task_type: 'backup' },
  { phase: '0A', task_id: '0A.5', description: 'Export v_library_complete to CSV', file_affected: 'BigQuery', task_type: 'backup' },
  { phase: '0A', task_id: '0A.6', description: 'Save backups to Backups folder in Drive', file_affected: 'Google Drive', task_type: 'backup' },
  { phase: '0A', task_id: '0A.7', description: 'Record current commit hash in Architecture Bible', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase0ATasks);

// Parse Phase 0B
const phase0BTasks = [
  { phase: '0B', task_id: '0B.1', description: 'Delete lib/proposal-systems.js', file_affected: 'lib/proposal-systems.js', task_type: 'dead_code_removal' },
  { phase: '0B', task_id: '0B.2', description: 'Delete lib/takeoff-to-proposal.js', file_affected: 'lib/takeoff-to-proposal.js', task_type: 'dead_code_removal' },
  { phase: '0B', task_id: '0B.3', description: 'Delete data/scope-items.js', file_affected: 'data/scope-items.js', task_type: 'dead_code_removal' },
  { phase: '0B', task_id: '0B.4', description: 'Delete lib/generate-proposal-docx.js', file_affected: 'lib/generate-proposal-docx.js', task_type: 'dead_code_removal' },
  { phase: '0B', task_id: '0B.5', description: 'Delete components/ko/proposal-docx-download.jsx', file_affected: 'components/ko/proposal-docx-download.jsx', task_type: 'dead_code_removal' },
  { phase: '0B', task_id: '0B.6', description: 'Delete app/proposal-generator/ page', file_affected: 'app/proposal-generator/', task_type: 'dead_code_removal' },
  { phase: '0B', task_id: '0B.7', description: 'Remove TEMPLATE_SECTIONS constant from google-sheets.js', file_affected: 'lib/google-sheets.js', task_type: 'dead_code_removal' },
  { phase: '0B', task_id: '0B.8', description: 'Remove ITEM_ID_TO_ROW constant from google-sheets.js', file_affected: 'lib/google-sheets.js', task_type: 'dead_code_removal' },
  { phase: '0B', task_id: '0B.9', description: 'Remove legacy flat BTX mode from btx/route.js', file_affected: 'app/api/ko/takeoff/[projectId]/btx/route.js', task_type: 'dead_code_removal' },
  { phase: '0B', task_id: '0B.10', description: 'Full build test after all deletions', file_affected: 'Terminal', task_type: 'verification' },
  { phase: '0B', task_id: '0B.11', description: 'Update Bible Section 4 and Section 8', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase0BTasks);

// Parse Phase 0C
const phase0CTasks = [
  { phase: '0C', task_id: '0C.1', description: 'Extract detectSectionFromItemId() to shared export', file_affected: 'lib/google-sheets.js', task_type: 'refactor' },
  { phase: '0C', task_id: '0C.2', description: 'Update sheet-config/route.js to import shared function', file_affected: 'app/api/ko/takeoff/[projectId]/sheet-config/route.js', task_type: 'refactor' },
  { phase: '0C', task_id: '0C.3', description: 'Test Bluebeam import still detects all 4 sections', file_affected: 'Test CSV', task_type: 'verification' },
];
tasks.push(...phase0CTasks);

// Parse Phase 0D
const phase0DTasks = [
  { phase: '0D', task_id: '0D.1', description: 'Add helper getActiveSheetName(spreadsheetId)', file_affected: 'lib/google-sheets.js', task_type: 'feature' },
  { phase: '0D', task_id: '0D.2', description: 'Use dynamic sheet name for project name write (A2)', file_affected: 'lib/google-sheets.js', task_type: 'fix' },
  { phase: '0D', task_id: '0D.3', description: 'fillBluebeamDataToSpreadsheet() accept sheetName param', file_affected: 'lib/google-sheets.js', task_type: 'feature' },
  { phase: '0D', task_id: '0D.4', description: 'sheet-config/route.js accept ?sheet= query param', file_affected: 'app/api/ko/takeoff/[projectId]/sheet-config/route.js', task_type: 'feature' },
  { phase: '0D', task_id: '0D.5', description: 'bluebeam/route.js pass sheet name to fill function', file_affected: 'app/api/ko/takeoff/[projectId]/bluebeam/route.js', task_type: 'feature' },
  { phase: '0D', task_id: '0D.6', description: 'preview/route.js accept ?sheet= query param', file_affected: 'app/api/ko/proposal/[projectId]/preview/route.js', task_type: 'feature' },
  { phase: '0D', task_id: '0D.7', description: 'generate/route.js pass sheet name through', file_affected: 'app/api/ko/proposal/[projectId]/generate/route.js', task_type: 'feature' },
  { phase: '0D', task_id: '0D.8', description: 'estimating-center-screen track currentSheetName in state', file_affected: 'components/ko/estimating-center-screen.jsx', task_type: 'feature' },
  { phase: '0D', task_id: '0D.9', description: 'Verify all routes work with no ?sheet= param (backward compat)', file_affected: 'All routes', task_type: 'verification' },
  { phase: '0D', task_id: '0D.10', description: 'Grep codebase: zero DATE references in production source', file_affected: 'All files', task_type: 'verification' },
  { phase: '0D', task_id: '0D.11', description: 'Update Bible Section 5 and Section 8', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase0DTasks);

// Parse Phase 0E
const phase0ETasks = [
  { phase: '0E', task_id: '0E.1', description: 'Fix upload success: open embedded sheet not legacy TakeoffSpreadsheet', file_affected: 'components/ko/estimating-center-screen.jsx', task_type: 'fix' },
  { phase: '0E', task_id: '0E.2', description: 'Expand import summary: matched/unmatched/errors breakdown', file_affected: 'components/ko/estimating-center-screen.jsx', task_type: 'feature' },
  { phase: '0E', task_id: '0E.3', description: 'Fix embedded sheet close: preserve embeddedSheetId in state', file_affected: 'components/ko/estimating-center-screen.jsx', task_type: 'fix' },
  { phase: '0E', task_id: '0E.4', description: 'Add PYTHON_BACKEND_URL env var, replace hardcoded IP', file_affected: '.env.local + all files', task_type: 'fix' },
  { phase: '0E', task_id: '0E.5', description: 'Update Bible Section 8 (bugs marked fixed)', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase0ETasks);

// Phase 1A
const phase1ATasks = [
  { phase: '1A', task_id: '1A.1', description: 'Add Setup sheet tab to template (position: first, index 0)', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.2', description: 'Row 1: Title with formatting', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.3', description: 'Row 2: Project name + city + state formula', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.4', description: 'Mirror all 4 sections from takeoff tab', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.5', description: 'Column A: item_id (INDEX+MATCH from Library)', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.6', description: 'Column B: unit_cost (INDEX+MATCH from Library)', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.7', description: 'Column C: display_name dropdown (3-type validation per section)', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.8', description: 'Columns D-F: R value, IN, TYPE (editable)', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.9', description: 'Columns G-M: Location toggle area', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.10', description: 'Conditional formatting: toggle cells blue fill + white text', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.11', description: 'Column N: UOM (INDEX+MATCH from Library)', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.12', description: 'Column O: Bid Type dropdown (BASE/ALTERNATE)', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.13', description: 'Column O: Conditional formatting for ALTERNATE', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.14', description: 'Column P: Bluebeam Tool Name (INDEX+MATCH)', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.15', description: 'Column Q: Bluebeam Tool Status formula', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.16', description: 'Column R: Selected Location Count (COUNTA)', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1A', task_id: '1A.17', description: 'CRITICAL VERIFY: All Total Cost formula patterns remain intact', file_affected: 'Test project', task_type: 'verification' },
];
tasks.push(...phase1ATasks);

// Phase 1B
const phase1BTasks = [
  { phase: '1B', task_id: '1B.1', description: 'Version tracker section below grand total (row 72+)', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1B', task_id: '1B.2', description: 'Version tracker columns: Active, Sheet Name, Created Date, Items, Locations, Status', file_affected: 'Template spreadsheet', task_type: 'template' },
  { phase: '1B', task_id: '1B.3', description: 'Status dropdown: In Progress, Ready for Proposal, Sent to GC, Revised, Archived', file_affected: 'Template spreadsheet', task_type: 'template' },
];
tasks.push(...phase1BTasks);

// Phase 1C
const phase1CTasks = [
  { phase: '1C', task_id: '1C.1', description: 'Create Apps Script project attached to template', file_affected: 'Apps Script', task_type: 'feature' },
  { phase: '1C', task_id: '1C.2', description: 'onEdit trigger: detect Column C changes on Setup + non-Library tabs', file_affected: 'Apps Script', task_type: 'feature' },
  { phase: '1C', task_id: '1C.3', description: 'On Column C selection: auto-populate A (item_id), B (unit_cost), N (UOM)', file_affected: 'Apps Script', task_type: 'feature' },
  { phase: '1C', task_id: '1C.4', description: 'Skip non-item rows (headers, totals)', file_affected: 'Apps Script', task_type: 'feature' },
  { phase: '1C', task_id: '1C.5', description: 'Handle clearing Column C: reset row', file_affected: 'Apps Script', task_type: 'feature' },
  { phase: '1C', task_id: '1C.6', description: 'Store Apps Script in repo: scripts/apps-script/Code.gs', file_affected: 'scripts/apps-script/Code.gs', task_type: 'feature' },
  { phase: '1C', task_id: '1C.7', description: 'CRITICAL VERIFY: formulas intact after auto-populate', file_affected: 'Test project', task_type: 'verification' },
  { phase: '1C', task_id: '1C.8', description: 'Test Apps Script fires on both Setup and takeoff tabs', file_affected: 'Test project', task_type: 'verification' },
];
tasks.push(...phase1CTasks);

// Phase 1D
const phase1DTasks = [
  { phase: '1D', task_id: '1D.1', description: 'Update createProjectTakeoffSheet(): Setup + version + Library tabs', file_affected: 'lib/google-sheets.js', task_type: 'feature' },
  { phase: '1D', task_id: '1D.2', description: 'First version tab named with creation date, not DATE', file_affected: 'lib/google-sheets.js', task_type: 'feature' },
  { phase: '1D', task_id: '1D.3', description: 'Write project info to row 2 of Setup AND version tab', file_affected: 'lib/google-sheets.js', task_type: 'feature' },
  { phase: '1D', task_id: '1D.4', description: 'getActiveSheetName() skips Setup and Library', file_affected: 'lib/google-sheets.js', task_type: 'feature' },
  { phase: '1D', task_id: '1D.5', description: 'Library tab refresh works with 3-tab workbook', file_affected: 'lib/google-sheets.js', task_type: 'verification' },
  { phase: '1D', task_id: '1D.6', description: 'Backward compat: existing DATE tab projects still work', file_affected: 'lib/google-sheets.js', task_type: 'verification' },
];
tasks.push(...phase1DTasks);

// Phase 1E
const phase1ETasks = [
  { phase: '1E', task_id: '1E.1', description: 'Add bluebeam_tool_name column to item_description_mapping', file_affected: 'BigQuery', task_type: 'schema' },
  { phase: '1E', task_id: '1E.2', description: 'Populate bluebeam_tool_name from Python backend', file_affected: 'Migration script', task_type: 'migration' },
  { phase: '1E', task_id: '1E.3', description: 'Update v_library_complete view to include bluebeam_tool_name', file_affected: 'BigQuery', task_type: 'schema' },
  { phase: '1E', task_id: '1E.4', description: 'Add tool_name column to Library tab header', file_affected: 'scripts/populate-library-tab.mjs', task_type: 'feature' },
  { phase: '1E', task_id: '1E.5', description: 'Fix populate script: data FIRST, then FILTER formulas', file_affected: 'scripts/populate-library-tab.mjs', task_type: 'fix' },
  { phase: '1E', task_id: '1E.6', description: 'Update Bible Sections 6 and 7', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase1ETasks);

// Phase 2A
const phase2ATasks = [
  { phase: '2A', task_id: '2A.1', description: 'New API: POST /api/ko/takeoff/[projectId]/create-version', file_affected: 'New route', task_type: 'feature' },
  { phase: '2A', task_id: '2A.2', description: 'Read Setup tab toggle states and configuration', file_affected: 'Route', task_type: 'feature' },
  { phase: '2A', task_id: '2A.3', description: 'Create new sheet tab named YYYY-MM-DD', file_affected: 'Route', task_type: 'feature' },
  { phase: '2A', task_id: '2A.4', description: 'Copy full structure from template with formulas + formatting', file_affected: 'Route', task_type: 'feature' },
  { phase: '2A', task_id: '2A.5', description: 'CRITICAL: Verify all formulas copied correctly', file_affected: 'Route', task_type: 'verification' },
  { phase: '2A', task_id: '2A.6', description: 'Transfer D-F values from Setup to new sheet', file_affected: 'Route', task_type: 'feature' },
  { phase: '2A', task_id: '2A.7', description: 'Transfer bid type from Setup to new sheet', file_affected: 'Route', task_type: 'feature' },
  { phase: '2A', task_id: '2A.8', description: 'Write project name + city + state to new sheet row 2', file_affected: 'Route', task_type: 'feature' },
  { phase: '2A', task_id: '2A.9', description: 'Hide rows where item has NO toggles in Setup', file_affected: 'Route', task_type: 'feature' },
  { phase: '2A', task_id: '2A.10', description: 'Hide columns where NO toggles exist for that column', file_affected: 'Route', task_type: 'feature' },
  { phase: '2A', task_id: '2A.11', description: 'Add entry to version tracker on Setup tab', file_affected: 'Route', task_type: 'feature' },
  { phase: '2A', task_id: '2A.12', description: 'Set as active version (clear other active flags)', file_affected: 'Route', task_type: 'feature' },
  { phase: '2A', task_id: '2A.13', description: 'Return {sheetName, spreadsheetId} to UI', file_affected: 'Route', task_type: 'feature' },
];
tasks.push(...phase2ATasks);

// Phase 2B
const phase2BTasks = [
  { phase: '2B', task_id: '2B.1', description: 'API to read version tracker from Setup tab', file_affected: 'Route', task_type: 'feature' },
  { phase: '2B', task_id: '2B.2', description: 'Set active version (only one at a time)', file_affected: 'API + sheet', task_type: 'feature' },
  { phase: '2B', task_id: '2B.3', description: 'Update version status', file_affected: 'API + sheet', task_type: 'feature' },
  { phase: '2B', task_id: '2B.4', description: 'Copy existing version to new dated sheet', file_affected: 'API + Sheets', task_type: 'feature' },
  { phase: '2B', task_id: '2B.5', description: 'Safe delete: only if sheet has no data', file_affected: 'API', task_type: 'feature' },
];
tasks.push(...phase2BTasks);

// Phase 2C
const phase2CTasks = [
  { phase: '2C', task_id: '2C.1', description: 'Version selector dropdown in estimating center', file_affected: 'components/ko/estimating-center-screen.jsx', task_type: 'feature' },
  { phase: '2C', task_id: '2C.2', description: 'Embedded sheet loads selected version tab', file_affected: 'components/ko/estimating-center-screen.jsx', task_type: 'feature' },
  { phase: '2C', task_id: '2C.3', description: 'All action buttons pass currentSheetName', file_affected: 'components/ko/estimating-center-screen.jsx', task_type: 'feature' },
  { phase: '2C', task_id: '2C.4', description: 'Setup tab context: show Create Takeoff + Download BTX', file_affected: 'components/ko/estimating-center-screen.jsx', task_type: 'feature' },
  { phase: '2C', task_id: '2C.5', description: 'Version tab context: show Import CSV + Proposal', file_affected: 'components/ko/estimating-center-screen.jsx', task_type: 'feature' },
  { phase: '2C', task_id: '2C.6', description: 'Update Bible Section 5 and Section 9', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase2CTasks);

// Phase 3
const phase3Tasks = [
  { phase: '3', task_id: '3.1', description: 'BTX reads Setup tab toggles instead of sheet-config', file_affected: 'BTX logic', task_type: 'feature' },
  { phase: '3', task_id: '3.2', description: 'Include tool name from Setup column P', file_affected: 'BTX logic', task_type: 'feature' },
  { phase: '3', task_id: '3.3', description: 'UI: show summary before download', file_affected: 'components/ko/estimating-center-screen.jsx', task_type: 'feature' },
  { phase: '3', task_id: '3.4', description: 'Save BTX zip to Drive Markups subfolder', file_affected: 'BTX route + Drive', task_type: 'feature' },
  { phase: '3', task_id: '3.5', description: 'BTX naming: {project_name}-tools-{date}.btx', file_affected: 'Code', task_type: 'feature' },
  { phase: '3', task_id: '3.6', description: 'Python backend: add WATERPROOFING location codes', file_affected: 'Python backend', task_type: 'feature' },
  { phase: '3', task_id: '3.7', description: 'Update Bible Section 5 (BTX route changes)', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase3Tasks);

// Phase 4A
const phase4ATasks = [
  { phase: '4A', task_id: '4A.1', description: 'Import targets selected version sheet', file_affected: 'app/api/ko/takeoff/[projectId]/bluebeam/route.js', task_type: 'feature' },
  { phase: '4A', task_id: '4A.2', description: 'Read existing cell values before writing', file_affected: 'lib/google-sheets.js', task_type: 'feature' },
  { phase: '4A', task_id: '4A.3', description: 'Accumulate: new_value = existing + imported', file_affected: 'lib/google-sheets.js', task_type: 'feature' },
  { phase: '4A', task_id: '4A.4', description: 'Return detailed import report', file_affected: 'app/api/ko/takeoff/[projectId]/bluebeam/route.js', task_type: 'feature' },
  { phase: '4A', task_id: '4A.5', description: 'Save uploaded CSV to Drive Markups subfolder', file_affected: 'bluebeam/route.js + Drive', task_type: 'feature' },
  { phase: '4A', task_id: '4A.6', description: 'CSV naming: {project_name}-bluebeam-{date}.csv', file_affected: 'Code', task_type: 'feature' },
];
tasks.push(...phase4ATasks);

// Phase 4B
const phase4BTasks = [
  { phase: '4B', task_id: '4B.1', description: 'Enhanced import summary dialog with breakdown', file_affected: 'New/updated component', task_type: 'feature' },
  { phase: '4B', task_id: '4B.2', description: 'Show unmatched items with name, quantity, location, reason', file_affected: 'Component', task_type: 'feature' },
  { phase: '4B', task_id: '4B.3', description: 'Location assignment dropdown for unmatched items', file_affected: 'Component', task_type: 'feature' },
  { phase: '4B', task_id: '4B.4', description: 'Accept Selected: import approved items + update Setup toggles', file_affected: 'Component + API', task_type: 'feature' },
  { phase: '4B', task_id: '4B.5', description: 'Rejected items logged but not imported', file_affected: 'API', task_type: 'feature' },
];
tasks.push(...phase4BTasks);

// Phase 4C
const phase4CTasks = [
  { phase: '4C', task_id: '4C.1', description: 'Wire /imports route to UI: import history list', file_affected: 'New component', task_type: 'feature' },
  { phase: '4C', task_id: '4C.2', description: 'Wire /compare route to UI: before/after cell comparison', file_affected: 'New component', task_type: 'feature' },
  { phase: '4C', task_id: '4C.3', description: 'Wire /sync route to UI: selective approval', file_affected: 'New component', task_type: 'feature' },
  { phase: '4C', task_id: '4C.4', description: 'Link import history to CSV files in Drive', file_affected: 'Component + Drive', task_type: 'feature' },
  { phase: '4C', task_id: '4C.5', description: 'Update Bible Section 5 and Section 8', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase4CTasks);

// Phase 5
const phase5Tasks = [
  { phase: '5', task_id: '5.1', description: 'Verify preview reads from version-specific sheet', file_affected: 'preview/route.js', task_type: 'verification' },
  { phase: '5', task_id: '5.2', description: 'Verify BASE/ALT split works', file_affected: 'Test', task_type: 'verification' },
  { phase: '5', task_id: '5.3', description: 'Drag-to-sort sections in proposal preview', file_affected: 'TakeoffProposalPreview', task_type: 'feature' },
  { phase: '5', task_id: '5.4', description: 'Drag-to-sort line items within sections', file_affected: 'TakeoffProposalPreview', task_type: 'feature' },
  { phase: '5', task_id: '5.5', description: 'Pass custom sort order to generate route', file_affected: 'generate/route.js', task_type: 'feature' },
  { phase: '5', task_id: '5.6', description: 'Include version date in proposal header/metadata', file_affected: 'generate/route.js', task_type: 'feature' },
  { phase: '5', task_id: '5.7', description: 'Proposal naming: {project}-proposal-{version_date}-{ts}.docx', file_affected: 'generate/route.js', task_type: 'feature' },
  { phase: '5', task_id: '5.8', description: 'Verify Drive upload with version-aware flow', file_affected: 'generate/route.js', task_type: 'verification' },
  { phase: '5', task_id: '5.9', description: 'Link proposal to version in Setup tab tracker', file_affected: 'generate/route.js + Sheets', task_type: 'feature' },
  { phase: '5', task_id: '5.10', description: 'Update Bible Sections 5, 9, 10', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase5Tasks);

// Phase 6A
const phase6ATasks = [
  { phase: '6A', task_id: '6A.1', description: 'Audit all Library tab columns (A through AI)', file_affected: 'Documentation', task_type: 'documentation' },
  { phase: '6A', task_id: '6A.2', description: 'New page/modal: Add Item to Library', file_affected: 'New component', task_type: 'feature' },
  { phase: '6A', task_id: '6A.3', description: 'Section dropdown: ROOFING, WATERPROOFING, BALCONIES, EXTERIOR', file_affected: 'Form', task_type: 'feature' },
  { phase: '6A', task_id: '6A.4', description: 'Item ID: auto-generated MR-XXX with duplicate check', file_affected: 'Form + API', task_type: 'feature' },
  { phase: '6A', task_id: '6A.5', description: 'Core fields: display_name, scope_name, uom, unit_cost, default_rate', file_affected: 'Form', task_type: 'feature' },
  { phase: '6A', task_id: '6A.6', description: 'Type selector: System, Standalone, Component', file_affected: 'Form', task_type: 'feature' },
  { phase: '6A', task_id: '6A.7', description: 'System fields (conditional): system_heading, paragraph_description', file_affected: 'Form', task_type: 'feature' },
  { phase: '6A', task_id: '6A.8', description: 'Standalone field (conditional): standalone_description', file_affected: 'Form', task_type: 'feature' },
  { phase: '6A', task_id: '6A.9', description: 'Component fields: bundle_fragment, fragment_sort_order, parent dropdown', file_affected: 'Form', task_type: 'feature' },
  { phase: '6A', task_id: '6A.10', description: 'Flag toggles: can_standalone, can_bundle, has_r_value, etc.', file_affected: 'Form', task_type: 'feature' },
  { phase: '6A', task_id: '6A.11', description: 'Bluebeam tool: dropdown of existing or Create New', file_affected: 'Form', task_type: 'feature' },
  { phase: '6A', task_id: '6A.12', description: 'ALL remaining Library columns covered', file_affected: 'Form', task_type: 'feature' },
  { phase: '6A', task_id: '6A.13', description: 'Preview: show how item will appear in Library tab', file_affected: 'Form', task_type: 'feature' },
];
tasks.push(...phase6ATasks);

// Phase 6B
const phase6BTasks = [
  { phase: '6B', task_id: '6B.1', description: 'New API: POST /api/ko/admin/add-item', file_affected: 'New route', task_type: 'feature' },
  { phase: '6B', task_id: '6B.2', description: 'Insert into item_description_mapping (all columns)', file_affected: 'Route', task_type: 'feature' },
  { phase: '6B', task_id: '6B.3', description: 'Insert into lib_takeoff_template', file_affected: 'Route', task_type: 'feature' },
  { phase: '6B', task_id: '6B.4', description: 'Verify v_library_complete auto-updates', file_affected: 'Verify', task_type: 'verification' },
  { phase: '6B', task_id: '6B.5', description: 'Refresh Library tab on template spreadsheet', file_affected: 'Route', task_type: 'feature' },
  { phase: '6B', task_id: '6B.6', description: 'Update has_bluebeam_tool if tool attached', file_affected: 'Route', task_type: 'feature' },
  { phase: '6B', task_id: '6B.7', description: 'Return success with readiness score', file_affected: 'Route', task_type: 'feature' },
  { phase: '6B', task_id: '6B.8', description: 'UI: show checklist of what auto-propagated vs manual', file_affected: 'Form', task_type: 'feature' },
  { phase: '6B', task_id: '6B.9', description: 'Update Bible Sections 4, 5, 6', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase6BTasks);

// Phase 7
const phase7Tasks = [
  { phase: '7', task_id: '7.1', description: 'New page/panel: Bluebeam Tool Manager', file_affected: 'New component', task_type: 'feature' },
  { phase: '7', task_id: '7.2', description: 'List all tools from Python backend /bluebeam/tools', file_affected: 'Component', task_type: 'feature' },
  { phase: '7', task_id: '7.3', description: 'Show tool details: name, item_id, section, locations, status', file_affected: 'Component', task_type: 'feature' },
  { phase: '7', task_id: '7.4', description: 'Filter by section, search by name/item_id', file_affected: 'Component', task_type: 'feature' },
  { phase: '7', task_id: '7.5', description: 'Show items WITHOUT tools (gaps)', file_affected: 'Component', task_type: 'feature' },
  { phase: '7', task_id: '7.6', description: 'Clone tool: source → new name → new item', file_affected: 'Component + Python API', task_type: 'feature' },
  { phase: '7', task_id: '7.7', description: 'Create new tool: name, section, locations, visual props', file_affected: 'Component + Python API', task_type: 'feature' },
  { phase: '7', task_id: '7.8', description: 'FIRST TOOLS: MR-FIRE-LIQ, MR-THORO, MR-009UOPMMA, MR-015PAD, MR-020DAVIT, MR-029FLASHPAV, MR-048SILL', file_affected: 'Tool Manager', task_type: 'data' },
  { phase: '7', task_id: '7.9', description: 'Auto-update has_bluebeam_tool + bluebeam_tool_name in BigQuery', file_affected: 'API + BigQuery', task_type: 'feature' },
  { phase: '7', task_id: '7.10', description: 'Update Bible Sections 4, 5, 6', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase7Tasks);

// Phase 8
const phase8Tasks = [
  { phase: '8', task_id: '8.1', description: 'Audit current ProjectFoldersScreen capabilities', file_affected: 'Component', task_type: 'documentation' },
  { phase: '8', task_id: '8.2', description: 'List all files in Drive project folder recursively', file_affected: 'Component + Drive API', task_type: 'feature' },
  { phase: '8', task_id: '8.3', description: 'File type icons for each type', file_affected: 'Component', task_type: 'feature' },
  { phase: '8', task_id: '8.4', description: 'View PDFs inline', file_affected: 'Component', task_type: 'feature' },
  { phase: '8', task_id: '8.5', description: 'Link to Google Sheets (new tab)', file_affected: 'Component', task_type: 'feature' },
  { phase: '8', task_id: '8.6', description: 'Download any file', file_affected: 'Component', task_type: 'feature' },
  { phase: '8', task_id: '8.7', description: 'Upload files to project folder', file_affected: 'Component + Drive API', task_type: 'feature' },
  { phase: '8', task_id: '8.8', description: 'Sort by date, type, name', file_affected: 'Component', task_type: 'feature' },
  { phase: '8', task_id: '8.9', description: 'Update Bible Section 4', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase8Tasks);

// Phase 9
const phase9Tasks = [
  { phase: '9', task_id: '9.1', description: 'Create implementation_tracker table in mr_main', file_affected: 'BigQuery', task_type: 'schema' },
  { phase: '9', task_id: '9.2', description: 'Load all ~150 plan tasks into tracker', file_affected: 'BigQuery', task_type: 'data' },
  { phase: '9', task_id: '9.3', description: 'Create Google Sheet view of tracker for Isaac', file_affected: 'Google Sheets', task_type: 'feature' },
  { phase: '9', task_id: '9.4', description: 'Add item_id column to estimator_rate_card', file_affected: 'BigQuery', task_type: 'schema' },
  { phase: '9', task_id: '9.5', description: 'Backfill item_ids in rate card', file_affected: 'BigQuery', task_type: 'migration' },
  { phase: '9', task_id: '9.6', description: 'Add bluebeam_tool_name column to item_description_mapping', file_affected: 'BigQuery', task_type: 'schema' },
  { phase: '9', task_id: '9.7', description: 'Create project_versions table', file_affected: 'BigQuery', task_type: 'schema' },
  { phase: '9', task_id: '9.8', description: 'Create import_history table', file_affected: 'BigQuery', task_type: 'schema' },
  { phase: '9', task_id: '9.9', description: 'Add active_version_sheet column to project_folders', file_affected: 'BigQuery', task_type: 'schema' },
  { phase: '9', task_id: '9.10', description: 'Update Bible Section 6', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
];
tasks.push(...phase9Tasks);

// Phase 10
const phase10Tasks = [
  { phase: '10', task_id: '10.1', description: 'Delete TakeoffSetupScreen wizard (920 lines)', file_affected: 'components/ko/', task_type: 'dead_code_removal' },
  { phase: '10', task_id: '10.2', description: 'Replace Setup button with Open Setup Tab', file_affected: 'components/ko/estimating-center-screen.jsx', task_type: 'feature' },
  { phase: '10', task_id: '10.3', description: 'Remove /config route dependency from create flow', file_affected: 'takeoff/create/route.js', task_type: 'refactor' },
  { phase: '10', task_id: '10.4', description: 'Delete legacy TakeoffSpreadsheet component', file_affected: 'components/ko/', task_type: 'dead_code_removal' },
  { phase: '10', task_id: '10.5', description: 'Delete standalone pages (/proposal-preview, /test-proposal)', file_affected: 'app/', task_type: 'dead_code_removal' },
  { phase: '10', task_id: '10.6', description: 'Migration: add Setup tab to existing test project spreadsheets', file_affected: 'Migration script', task_type: 'migration' },
  { phase: '10', task_id: '10.7', description: 'Migration: rename DATE tabs to creation date', file_affected: 'Migration script', task_type: 'migration' },
  { phase: '10', task_id: '10.8', description: 'Test migration on 3 projects before running on all', file_affected: 'Testing', task_type: 'verification' },
  { phase: '10', task_id: '10.9', description: 'Run migration on all projects', file_affected: 'Script', task_type: 'migration' },
  { phase: '10', task_id: '10.10', description: 'Final Bible update: all sections current', file_affected: 'docs/ARCHITECTURE_BIBLE.md', task_type: 'documentation' },
  { phase: '10', task_id: '10.11', description: 'Archive obsolete handoff docs to docs/archive/', file_affected: 'docs/', task_type: 'cleanup' },
  { phase: '10', task_id: '10.12', description: 'Final npm build + full smoke test', file_affected: 'Terminal', task_type: 'verification' },
];
tasks.push(...phase10Tasks);

console.log(`Total tasks parsed: ${tasks.length}`);

// Build INSERT SQL in batches of 20 (BigQuery has limits on query size)
const batchSize = 20;
for (let i = 0; i < tasks.length; i += batchSize) {
  const batch = tasks.slice(i, i + batchSize);
  const values = batch.map(t => {
    const esc = s => (s || '').replace(/'/g, "\\'");
    return `('${esc(t.phase)}', '${esc(t.task_id)}', '${esc(t.description)}', '${esc(t.file_affected)}', '${esc(t.task_type)}', 'NOT_STARTED', FALSE, NULL, NULL, NULL, NULL, 'main')`;
  }).join(',\n  ');

  const sql = `INSERT INTO mr_main.implementation_tracker (phase, task_id, description, file_affected, task_type, status, verified, verified_by, verified_at, session_completed, notes, branch)
VALUES
  ${values}`;

  const batchNum = Math.floor(i / batchSize) + 1;
  const totalBatches = Math.ceil(tasks.length / batchSize);
  console.log(`\nInserting batch ${batchNum}/${totalBatches} (${batch.length} tasks)...`);

  try {
    execSync(`bq query --use_legacy_sql=false "${sql.replace(/"/g, '\\"')}"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
    });
    console.log(`Batch ${batchNum} inserted successfully.`);
  } catch (err) {
    console.error(`Batch ${batchNum} failed: ${err.message}`);
    if (err.stderr) console.error(err.stderr.toString().slice(0, 500));
  }
}

// Verify count
try {
  const result = execSync('bq query --use_legacy_sql=false "SELECT COUNT(*) as total FROM mr_main.implementation_tracker"', {
    encoding: 'utf-8',
  });
  console.log('\nVerification:');
  console.log(result);
} catch (err) {
  console.error('Verification failed:', err.message);
}
