# KO PLATFORM — MASTER IMPLEMENTATION PLAN v4
# Created: 2026-02-12 (Session 30)
# Based on: 10-batch comprehensive audit of entire platform + Isaac's review feedback
# Prerequisite: Read docs/ARCHITECTURE_BIBLE.md first
#
# RULES:
# 1. Nothing gets built without being in this plan
# 2. Nothing gets checked off without verification
# 3. Every task asks: "What will break if I do this?"
# 4. Every completion asks: "Did I break anything?"
# 5. Architecture Bible MUST be updated on every commit that changes:
#    - Any API route signature or behavior
#    - Any new file or deleted file
#    - Any BigQuery table schema change
#    - Any template structure change
#    - Any new environment variable
#    The specific Bible sections to update must be listed in the commit message.
#    Example: "feat: add version-aware preview route [BIBLE: Section 5, 9]"

---

## BIBLE UPDATE ENFORCEMENT
Every PR/commit that modifies the system MUST include Bible updates. Checklist:
- [ ] New/changed routes? → Update Section 5 (API Route Details)
- [ ] New/changed files? → Update Section 4 (File Map)
- [ ] BigQuery changes? → Update Section 6 (Data Layer)
- [ ] Template changes? → Update Section 7 (Template Architecture)
- [ ] Bug fixed? → Update Section 8 (Known Issues)
- [ ] Feature completed? → Update Section 9 (Current State)
If a Claude session does not update the Bible, the work is NOT considered complete.

---

## CORE PRINCIPLES
1. **No data loss.** A row can ONLY be hidden if ALL location cells are empty/zero AND total cost is zero.
2. **Sheet-first.** The Google Sheet IS the takeoff. Configuration lives in the sheet, not in wizard configs.
3. **Dynamic detection.** Section headers, row types, locations detected by scanning the live sheet.
4. **Context-aware UI.** Buttons operate on whatever sheet version is currently displayed.
5. **Everything saves to the project folder.** Takeoff workbooks, BTX files, CSVs, proposals — all in Drive.
6. **Systems cannot bundle.** is_system=TRUE → can_bundle=FALSE (only exception: MR-033TRAFFIC).
7. **Verify before acting.** Check current state before every change. No assumptions.
8. **Minimal Apps Script.** Only for onEdit Column C auto-populate. Everything else is Node.js + Sheets API.
9. **Formulas are sacred.** Every sheet operation must preserve formula structure. Proposal detection depends on readable formulas in Total Cost column.
10. **Backup before breaking.** Tag, copy, export before any destructive operation.

---

## ARCHITECTURAL DECISIONS

### Decision 1: Wizard Status
- **Delete (after Setup Tab proven):** TakeoffSetupScreen wizard (920 lines) — Steps 1-3 dead, Step 5 replaced by Setup Tab
- **Keep and enhance:** Import summary dialog (shows items imported, cells populated) — expand with error details
- **Keep and enhance:** TakeoffProposalPreview (proposal review/edit) — add drag-to-sort for sections and line items
- **Delete:** /config route dependency for sheet creation

### Decision 2: Apps Script — Minimal Footprint
Only for: onEdit trigger on Column C → auto-populate row (item_id, unit_cost, UOM from Library).
Applies to: Setup tab AND all Takeoff version sheets.
Everything else stays Node.js + Sheets API.

### Decision 3: Version Management
- Workbook tabs: Setup (permanent), Library (permanent), date-named takeoff versions (YYYY-MM-DD)
- No more "DATE" hardcoded tab name
- All API routes accept optional ?sheet= parameter, default to active version
- Version tracker lives on Setup tab

### Decision 4: Project Folder = Artifact Hub
Every file saves to Drive project folder: workbook, BTX, CSV imports, proposals.
Project Folders UI browses all files with type-appropriate viewing (PDF inline, Sheets linked, files downloadable).

### Decision 5: Tool Creation via Tool Manager
Skip manual Python backend tool creation for specific items. Create ALL new tools through the Tool Manager UI (Phase 7). First items to create: MR-FIRE-LIQ, MR-THORO, 5 missing Cat 1 items.

---

## PHASE 0: FOUNDATION
**Goal:** Backup, clean, de-hardcode, fix bugs. Everything else depends on this.

### 0A: Backup Current State (BEFORE ANY CHANGES)
| # | Task | Target | Verify |
|---|------|--------|--------|
| 0A.1 | Git tag current state: `git tag v2.0-pre-rebuild` | Git | Tag exists |
| 0A.2 | Copy template spreadsheet (1n0p_...) to backup | Google Drive | Backup copy exists |
| 0A.3 | Export item_description_mapping to CSV | BigQuery → CSV | File saved |
| 0A.4 | Export lib_takeoff_template to CSV | BigQuery → CSV | File saved |
| 0A.5 | Export v_library_complete to CSV | BigQuery → CSV | File saved |
| 0A.6 | Save backups to a "Backups" folder in Drive | Google Drive | Files in folder |
| 0A.7 | Record current commit hash in Architecture Bible | docs/ | Hash documented |

### 0B: Dead Code Removal
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 0B.1 | Delete lib/proposal-systems.js | lib/ | No import errors, npm build passes |
| 0B.2 | Delete lib/takeoff-to-proposal.js | lib/ | No import errors |
| 0B.3 | Delete data/scope-items.js | data/ | No import errors |
| 0B.4 | Delete lib/generate-proposal-docx.js | lib/ | No import errors |
| 0B.5 | Delete components/ko/proposal-docx-download.jsx | components/ | No import errors |
| 0B.6 | Delete app/proposal-generator/ page | app/ | No routing errors |
| 0B.7 | Remove TEMPLATE_SECTIONS constant from google-sheets.js | lib/google-sheets.js | Build passes |
| 0B.8 | Remove ITEM_ID_TO_ROW constant from google-sheets.js | lib/google-sheets.js | Dynamic scanning works |
| 0B.9 | Remove commented-out legacy flat BTX mode from btx/route.js | btx/route.js | BTX generation works |
| 0B.10 | Full build test after all deletions | Terminal | npm run build passes |
| 0B.11 | Update Bible Section 4 (File Map) and Section 8 (Dead Code) | docs/ | Bible current |

### 0C: Consolidate Duplicated Code
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 0C.1 | Extract detectSectionFromItemId() to shared export in lib/google-sheets.js | google-sheets.js | Function exported |
| 0C.2 | Update sheet-config/route.js to import shared function | sheet-config/route.js | Route returns same results |
| 0C.3 | Test Bluebeam import still detects all 4 sections | Test CSV | All sections detected |

### 0D: Remove Hardcoded "DATE" — Make Routes Version-Aware
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 0D.1 | Add helper: getActiveSheetName(spreadsheetId) — returns first tab that isn't "Setup" or "Library" | lib/google-sheets.js | Helper works |
| 0D.2 | google-sheets.js:575 — use dynamic sheet name for project name write (A2) | lib/google-sheets.js | Name written to correct tab |
| 0D.3 | google-sheets.js:901 — fillBluebeamDataToSpreadsheet() accept sheetName param, default to getActiveSheetName() | lib/google-sheets.js | Import works |
| 0D.4 | sheet-config/route.js:66 — accept ?sheet= query param, default to getActiveSheetName() | sheet-config/route.js | Returns correct config |
| 0D.5 | bluebeam/route.js — pass sheet name to fillBluebeamDataToSpreadsheet() | bluebeam/route.js | Import targets correct sheet |
| 0D.6 | preview/route.js — accept ?sheet= query param | preview/route.js | Reads correct sheet |
| 0D.7 | generate/route.js — pass sheet name through from request/preview | generate/route.js | Generates from correct sheet |
| 0D.8 | estimating-center-screen.jsx — track currentSheetName in state, pass to ALL API calls (sheet-config, bluebeam, btx, preview, generate) | estimating-center-screen.jsx | All calls include sheet name |
| 0D.9 | Verify ALL routes work with no ?sheet= param (backward compat for existing projects) | All routes | Existing projects still work |
| 0D.10 | grep codebase: zero "DATE" references in production source | All files | Clean grep |
| 0D.11 | Update Bible Section 5 (Routes) and Section 8 (Technical Debt) | docs/ | Bible current |

### 0E: Fix Active Bugs
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 0E.1 | Fix upload success: keep import summary dialog (items imported, cells populated), after dismiss → open embedded sheet (not legacy TakeoffSpreadsheet) | estimating-center-screen.jsx:1121 | Summary shows, then embedded sheet opens |
| 0E.2 | Expand import summary to show: matched items, unmatched items with reasons, cells populated, errors | estimating-center-screen.jsx + bluebeam/route.js | Full import report visible |
| 0E.3 | Fix embedded sheet close: preserve embeddedSheetId in state so reopen is instant | estimating-center-screen.jsx:1094 | Close → reopen works without API call |
| 0E.4 | Add PYTHON_BACKEND_URL env var, replace hardcoded 136.111.252.120 in all files | .env.local + all files | Config change works, grep shows zero hardcoded IPs |
| 0E.5 | Update Bible Section 8 (Known Issues) | docs/ | Bugs marked fixed |

---

## PHASE 1: SETUP TAB — STRUCTURE & CONFIGURATION
**Goal:** Add Setup tab to workbook template. Configuration hub for items, locations, bid types.

### 1A: Setup Tab Sheet Structure
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 1A.1 | Add "Setup" sheet tab to template (position: first tab, index 0) | Template 1n0p_... | Tab exists at correct position |
| 1A.2 | Row 1: Title "BLUEBEAM SETUP & PROJECT CONFIGURATION" with formatting | Template | Visual check |
| 1A.3 | Row 2: Project name + city + state (formula linking to project data, populated on creation) | Template | Shows "Project Name — City, State" |
| 1A.4 | Mirror all 4 sections from takeoff tab: same header rows, same item rows, same bundle totals, same row numbers | Template | Layout matches takeoff exactly |
| 1A.5 | Column A: item_id (INDEX+MATCH from Library) | Template | Formulas resolve |
| 1A.6 | Column B: unit_cost (INDEX+MATCH from Library) | Template | Formulas resolve |
| 1A.7 | Column C: display_name dropdown (3-type validation: system/component/standalone per section) | Template | Dropdowns work |
| 1A.8 | Columns D-F: R value, IN (thickness), TYPE (material) — editable | Template | Cells editable |
| 1A.9 | Columns G-M: Location toggle area. Empty = not selected. Any value (TRUE, "x", etc.) = selected for BTX | Template | All empty by default |
| 1A.10 | Conditional formatting: cells G-M with any value → solid blue fill, white text | Template | Blue visible |
| 1A.11 | Column N: UOM (INDEX+MATCH from Library) | Template | Shows SF/LF/EA |
| 1A.12 | Column O: Bid Type dropdown (BASE, ALTERNATE) with default BASE | Template | Dropdown works |
| 1A.13 | Column O: Conditional formatting — ALTERNATE highlighted orange/red | Template | ALT stands out |
| 1A.14 | Column P: Bluebeam Tool Name (INDEX+MATCH from Library tool_name column) | Template | Shows tool name or blank |
| 1A.15 | Column Q: Bluebeam Tool Status — formula: IF(tool_name<>"", "✓ Ready", "✗ Missing") | Template | Status visible |
| 1A.16 | Column R: Selected Location Count — COUNTA of G-M for that row | Template | Shows 0-7 |
| 1A.17 | **CRITICAL VERIFY:** All formula patterns in Total Cost column (used by proposal detection) remain intact and detectable. Test by running proposal preview on a sheet with Setup tab | Test | Preview returns correct structured data |

### 1B: Version Tracker Area (on Setup tab)
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 1B.1 | Version tracker section below grand total (row 72+) | Template | Visible, clear |
| 1B.2 | Columns: Active (checkbox), Sheet Name, Created Date, Items Count, Locations Count, Status | Template | Headers correct |
| 1B.3 | Status dropdown: In Progress, Ready for Proposal, Sent to GC, Revised, Archived | Template | Dropdown works |

### 1C: Apps Script — Column C Auto-Populate
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 1C.1 | Create Apps Script project attached to template spreadsheet | Apps Script editor | Project exists |
| 1C.2 | onEdit trigger: detect Column C changes on Setup tab AND any non-Library tab | Apps Script | Trigger fires correctly |
| 1C.3 | On Column C selection: look up item in Library tab → populate Column A (item_id), Column B (unit_cost), Column N (UOM) | Apps Script | Row auto-populates instantly |
| 1C.4 | Skip non-item rows (headers, totals, bundle total rows) | Apps Script | No trigger on wrong rows |
| 1C.5 | Handle clearing Column C: reset A, B, N to default/blank | Apps Script | Clear works |
| 1C.6 | Store Apps Script source in repo: scripts/apps-script/Code.gs | Repo | Code version-controlled |
| 1C.7 | **CRITICAL VERIFY:** After Apps Script auto-populate, formulas in Total Measurements and Total Cost columns still work. Run proposal preview to confirm formula detection intact | Test project | Proposal preview returns correct data |
| 1C.8 | Test Apps Script fires on BOTH Setup tab and takeoff version tabs | Test project | Both tabs auto-populate |

### 1D: Integration with Project Creation
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 1D.1 | Update createProjectTakeoffSheet(): new workbook has Setup tab + first version tab (named YYYY-MM-DD) + Library tab | lib/google-sheets.js | 3 tabs created |
| 1D.2 | First version tab named with creation date, NOT "DATE" | lib/google-sheets.js | Tab named correctly (e.g., "2026-02-12") |
| 1D.3 | Write project name + city + state to row 2 of Setup AND version tab | lib/google-sheets.js | Info shows on both tabs |
| 1D.4 | getActiveSheetName() skips "Setup" and "Library" | lib/google-sheets.js | Returns version tab name |
| 1D.5 | Library tab refresh still works with 3-tab workbook | lib/google-sheets.js | Library populated correctly |
| 1D.6 | Backward compat: existing projects with "DATE" tab still work through getActiveSheetName() fallback | lib/google-sheets.js | Old projects functional |

### 1E: Library Tab Enhancement
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 1E.1 | Add bluebeam_tool_name column to item_description_mapping in BigQuery | BigQuery | Column exists |
| 1E.2 | Populate bluebeam_tool_name from Python backend /bluebeam/tools mapping (48 items) | Migration script | Tool names populated |
| 1E.3 | Update v_library_complete view to include bluebeam_tool_name | BigQuery | Column in view |
| 1E.4 | Add tool_name column to Library tab header (column 31) | populate-library-tab.mjs | Column exists |
| 1E.5 | Fix populate script: write data FIRST, then write FILTER formulas as LAST step (prevents formula loss) | populate-library-tab.mjs | Formulas always present after run |
| 1E.6 | Update Bible Sections 6 and 7 | docs/ | Bible current |

---

## PHASE 2: VERSION MANAGEMENT
**Goal:** Create, copy, manage multiple dated takeoff sheets from Setup tab.

### 2A: Create Takeoff Version
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 2A.1 | New API: POST /api/ko/takeoff/[projectId]/create-version | New route | Route exists |
| 2A.2 | Read Setup tab: all toggle states (G-M), configuration (D-F), bid type (O) | Route | Data read correctly |
| 2A.3 | Create new sheet tab named YYYY-MM-DD (append -v2, -v3 if date exists) | Route | Tab created, no collision |
| 2A.4 | Copy full structure from template: rows 1-70, all columns, all formulas, all formatting | Route | Complete structure |
| 2A.5 | **CRITICAL:** Verify all formulas copied correctly — especially Total Cost (=B*N), bundle SUM ranges, section totals | Route | Formulas intact and readable |
| 2A.6 | Transfer D-F values (R, thickness, type) from Setup to new sheet | Route | Values transferred |
| 2A.7 | Transfer bid type from Setup O to new sheet P | Route | Bid type set |
| 2A.8 | Write project name + city + state to new sheet row 2 | Route | Info shows |
| 2A.9 | Hide rows where item has NO toggles in Setup G-M (Rule #1: only if all empty) | Route | Correct rows hidden |
| 2A.10 | Hide columns where NO toggles exist for that column across ALL sections | Route | Correct columns hidden |
| 2A.11 | Add entry to version tracker on Setup tab | Route | Entry added |
| 2A.12 | Set as active version (clear other active flags) | Route | Only one active |
| 2A.13 | Return {sheetName, spreadsheetId} to UI | Route | UI updated |

### 2B: Version Tracker Operations
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 2B.1 | API to read version tracker from Setup tab | Route or sheet read | All versions listed |
| 2B.2 | Set active version (only one at a time) | API + sheet write | Radio behavior |
| 2B.3 | Update version status | API + sheet write | Status persists |
| 2B.4 | Copy existing version → new dated sheet preserving ALL data, formulas, hidden rows/cols | API + Sheets | Copy identical |
| 2B.5 | Safe delete: only if sheet has no data (Rule #1) | API | Blocks delete if data exists |

### 2C: Context-Aware UI
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 2C.1 | Version selector in estimating center (dropdown showing all versions with active indicator) | estimating-center-screen.jsx | All versions listed |
| 2C.2 | Embedded sheet loads selected version tab | estimating-center-screen.jsx | Correct sheet displayed |
| 2C.3 | All action buttons (BTX, Import, Proposal) pass currentSheetName | estimating-center-screen.jsx | Verified in network tab |
| 2C.4 | When on Setup tab: show "Create Takeoff" + "Download BTX" buttons | estimating-center-screen.jsx | Context-specific |
| 2C.5 | When on version tab: show "Import CSV" + "Proposal" buttons | estimating-center-screen.jsx | Context-specific |
| 2C.6 | Update Bible Section 5 (new route) and Section 9 | docs/ | Bible current |

---

## PHASE 3: BTX GENERATION (Setup-Aware)
**Goal:** BTX uses Setup tab toggles for item/location filtering.

| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 3.1 | BTX reads Setup tab toggles (G-M) instead of sheet-config from takeoff tab | BTX logic | Only toggled items/locations included |
| 3.2 | Include tool name from Setup column P | BTX logic | Correct tool names |
| 3.3 | UI: show summary before download ("12 items × 3 locations = 36 tools") | estimating-center-screen.jsx | Summary visible |
| 3.4 | Save BTX zip to Drive project folder → Markups subfolder | BTX route + Drive API | File in Markups/ |
| 3.5 | BTX naming: {project_name}-tools-{date}.btx | Code | Correct name |
| 3.6 | Python backend: add WATERPROOFING location codes (FL1-FL7, MR, SBH, EBH) | Python backend | Codes available |
| 3.7 | Update Bible Section 5 (BTX route changes) | docs/ | Bible current |

*Note: New Bluebeam tools for specific items (MR-FIRE-LIQ, MR-THORO, 5 Cat 1 items) will be created through the Tool Manager (Phase 7), not manually.*

---

## PHASE 4: BLUEBEAM CSV IMPORT (Accumulation + Staging)
**Goal:** Smart import with accumulation, validation, version targeting, approval.

### 4A: Core Import Improvements
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 4A.1 | Import targets selected version sheet (from context-aware UI sheet name) | bluebeam/route.js | Correct sheet targeted |
| 4A.2 | Read existing cell values before writing | google-sheets.js | Current values captured |
| 4A.3 | Accumulate: new_value = existing + imported (not overwrite) | google-sheets.js | Values summed correctly |
| 4A.4 | Return detailed import report: matched items + cells populated + unmatched items + reasons + errors | bluebeam/route.js | Full report returned |
| 4A.5 | Save uploaded CSV to Drive project folder → Markups subfolder | bluebeam/route.js + Drive | CSV in Markups/ |
| 4A.6 | CSV naming: {project_name}-bluebeam-{date}.csv | Code | Correct name |

### 4B: Unmatched Item Handling
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 4B.1 | Enhanced import summary dialog: matched/unmatched/errors breakdown | New/updated component | Dialog shows full report |
| 4B.2 | Unmatched items: show name, quantity, detected location, reason for mismatch | Component | Info visible |
| 4B.3 | Location assignment dropdown for unmatched (filtered to active locations from Setup) | Component | Filtered dropdown |
| 4B.4 | "Accept Selected" → imports approved items, updates Setup tab toggles if needed | Component + API | Items imported |
| 4B.5 | Rejected items logged but not imported | API | No data written |

### 4C: Wire Existing Staging Infrastructure
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 4C.1 | Wire /imports route to UI — import history list with timestamps | New component | History visible |
| 4C.2 | Wire /compare route to UI — before/after cell comparison | New component | Diffs visible |
| 4C.3 | Wire /sync route to UI — selective approval of changes | New component | Selective sync works |
| 4C.4 | Link import history to CSV files in Drive | Component + Drive | Files clickable |
| 4C.5 | Update Bible Section 5 (unwired routes → wired) and Section 8 | docs/ | Bible current |

---

## PHASE 5: PROPOSAL ENHANCEMENTS
**Goal:** Version-aware, sortable, with proper BASE/ALT handling.

| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 5.1 | Verify preview reads from version-specific sheet (done in Phase 0D) | preview/route.js | Correct sheet read |
| 5.2 | Verify BASE/ALT split works with current detection | Test | Both sections in DOCX |
| 5.3 | **NEW:** Drag-to-sort sections in proposal preview before generating | TakeoffProposalPreview | Sections reorderable |
| 5.4 | **NEW:** Drag-to-sort line items within sections | TakeoffProposalPreview | Items reorderable |
| 5.5 | Pass custom sort order to generate route → DOCX respects order | generate/route.js | DOCX matches sorted order |
| 5.6 | Include version date in proposal header/metadata | generate/route.js | Date in proposal |
| 5.7 | Proposal naming: {project_name}-proposal-{version_date}-{timestamp}.docx | generate/route.js | Correct name |
| 5.8 | Verify Drive upload works with version-aware flow | generate/route.js | File in Proposals/ |
| 5.9 | Link proposal to version in Setup tab version tracker | generate/route.js + Sheets API | Linked |
| 5.10 | Update Bible Sections 5, 9, 10 | docs/ | Bible current |

---

## PHASE 6: ADD ITEM PIPELINE
**Goal:** Single form to add items. Propagates to all touchpoints. Covers ALL 30+ Library columns.

### 6A: Add Item Form
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 6A.1 | **FIRST:** Audit all Library tab columns (A through AI) — document every column and its data source | Documentation | Complete column inventory |
| 6A.2 | New page/modal: "Add Item to Library" | New component | Form renders |
| 6A.3 | Section dropdown: ROOFING, WATERPROOFING, BALCONIES, EXTERIOR | Form | 4 options |
| 6A.4 | Item ID: auto-generated MR-XXX format, duplicate check against BigQuery | Form + API | Unique ID |
| 6A.5 | Core fields: display_name, scope_name, uom (SF/LF/EA), unit_cost, default_rate | Form | All required fields |
| 6A.6 | Type selector: System, Standalone, Component (radio) | Form | Type selected |
| 6A.7 | System fields (conditional): system_heading, paragraph_description | Form | Shown when System selected |
| 6A.8 | Standalone field (conditional): standalone_description | Form | Shown when Standalone |
| 6A.9 | Component fields (conditional): bundle_fragment, fragment_sort_order, parent system dropdown | Form | Shown when Component |
| 6A.10 | Flag toggles: can_standalone, can_bundle (auto-FALSE for Systems), has_r_value, has_thickness, has_material_type | Form | Logic enforced |
| 6A.11 | Bluebeam tool: dropdown of existing tools OR "Create New" (→ Phase 7) | Form | Selection works |
| 6A.12 | **ALL remaining Library columns** covered: template_row, template_section, category, is_cat1, template_unit_cost, template_has_thickness, template_has_r_value, template_has_material_type, template_notes, plus any others from audit | Form | Every column has a field or default |
| 6A.13 | Preview: show how item will appear in Library tab | Form | Preview matches Library format |

### 6B: Propagation API
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 6B.1 | New API: POST /api/ko/admin/add-item | New route | Route exists |
| 6B.2 | Insert into item_description_mapping (all 26 columns) | Route | Row inserted |
| 6B.3 | Insert into lib_takeoff_template | Route | Row inserted |
| 6B.4 | v_library_complete auto-updates (it's a view) | Verify | View shows new item |
| 6B.5 | Refresh Library tab on template spreadsheet | Route | Library updated |
| 6B.6 | If Bluebeam tool attached: update has_bluebeam_tool in BigQuery | Route | Flag TRUE |
| 6B.7 | Return success with readiness score + manual steps remaining | Route | Score returned |
| 6B.8 | UI: show checklist of what auto-propagated vs what needs manual work | Form | Checklist visible |
| 6B.9 | Update Bible Sections 4, 5, 6 | docs/ | Bible current |

---

## PHASE 7: BLUEBEAM TOOL MANAGER
**Goal:** UI to view, clone, create, manage Bluebeam tools. Create missing tools here.

| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 7.1 | New page/panel: "Bluebeam Tool Manager" | New component | Page renders |
| 7.2 | List all tools from Python backend /bluebeam/tools | Component | 48+ tools listed |
| 7.3 | Show: tool name, item_id, section, location codes, status | Component | Info displayed |
| 7.4 | Filter by section, search by name/item_id | Component | Works |
| 7.5 | Show items WITHOUT tools (gaps from Library has_bluebeam_tool=FALSE) | Component | Gaps visible |
| 7.6 | Clone tool: pick source → new name → new item attachment | Component + Python API | Cloned |
| 7.7 | Create new tool: name, section, location codes, visual properties | Component + Python API | Created |
| 7.8 | **FIRST TOOLS TO CREATE:** MR-FIRE-LIQ, MR-THORO, MR-009UOPMMA, MR-015PAD, MR-020DAVIT, MR-029FLASHPAV, MR-048SILL | Tool Manager | All 7 tools created |
| 7.9 | Auto-update has_bluebeam_tool + bluebeam_tool_name in BigQuery on all operations | API + BigQuery | Flags always accurate |
| 7.10 | Update Bible Sections 4, 5, 6 | docs/ | Bible current |

---

## PHASE 8: PROJECT FOLDERS — ARTIFACT HUB
**Goal:** Project Folders UI shows all project artifacts, viewable and downloadable.

| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 8.1 | Audit current ProjectFoldersScreen capabilities | Component | Current state documented |
| 8.2 | List all files in Drive project folder (recursing subfolders) | Component + Drive API | All files shown |
| 8.3 | File type icons: Takeoff Sheet, BTX Tools, Bluebeam CSV, Proposal, Drawing, Other | Component | Types clear |
| 8.4 | View PDFs inline | Component | PDF viewer works |
| 8.5 | Link to Google Sheets (opens in new tab) | Component | Sheet opens |
| 8.6 | Download any file | Component | Download works |
| 8.7 | Upload files to project folder (drawings → Drawings subfolder) | Component + Drive API | Upload works |
| 8.8 | Sort by date, type, name | Component | Sorting works |
| 8.9 | Update Bible Section 4 | docs/ | Bible current |

---

## PHASE 9: INFRASTRUCTURE & DATA MODEL
**Goal:** BigQuery tables, columns, views needed by other phases. DO FIRST.

| # | Task | Target | Verify |
|---|------|--------|--------|
| 9.1 | Create implementation_tracker table in mr_main | BigQuery | Table exists |
| 9.2 | Load all ~150 plan tasks into tracker | BigQuery | Tasks loaded |
| 9.3 | Create Google Sheet view of tracker for Isaac to monitor | Google Sheets | Sheet accessible |
| 9.4 | Add item_id column to estimator_rate_card | BigQuery | Column exists |
| 9.5 | Backfill item_ids in rate card | Migration | IDs mapped |
| 9.6 | Add bluebeam_tool_name column to item_description_mapping | BigQuery | Column exists |
| 9.7 | Create project_versions table | BigQuery | Table exists |
| 9.8 | Create import_history table | BigQuery | Table exists |
| 9.9 | Add active_version_sheet column to project_folders | BigQuery | Column exists |
| 9.10 | Update Bible Section 6 | docs/ | Bible current |

---

## PHASE 10: WIZARD CLEANUP & MIGRATION
**Goal:** Remove wizard, migrate existing projects, final cleanup. DO LAST.

| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 10.1 | Delete TakeoffSetupScreen wizard (920 lines) | components/ko/ | No import errors |
| 10.2 | Replace "Setup" button with "Open Setup Tab" (embeds Setup sheet tab) | estimating-center-screen.jsx | Button works |
| 10.3 | Remove /config route dependency from create flow | takeoff/create/route.js | Create works |
| 10.4 | Delete legacy TakeoffSpreadsheet component | components/ko/ | No import errors |
| 10.5 | Delete standalone pages (/proposal-preview, /test-proposal) | app/ | No errors |
| 10.6 | Migration: add Setup tab to existing test project spreadsheets | Migration script | Setup tab exists |
| 10.7 | Migration: rename "DATE" tabs to creation date | Migration script | Tabs renamed |
| 10.8 | Test migration on 3 projects before running on all | Testing | All 3 work |
| 10.9 | Run migration on all projects | Script | All migrated |
| 10.10 | Final Bible update: all sections current | docs/ | Complete |
| 10.11 | Archive obsolete handoff docs to docs/archive/ | docs/ | Clean repo |
| 10.12 | Final npm build + full smoke test | Terminal | Everything works |

---

## PHASE DEPENDENCIES
```
PHASE 9: Infrastructure ──────────── DO FIRST (tables needed by others)
    │
PHASE 0: Foundation ──────────────── DO SECOND (backup, clean, de-hardcode, fix bugs)
    │
PHASE 1: Setup Tab ───────────────── DO THIRD (foundation for everything)
    │
    ├── PHASE 2: Version Management ── (needs Setup tab)
    │       │
    │       ├── PHASE 3: BTX v2 ──────── (parallel with 4, 5)
    │       ├── PHASE 4: CSV Import v2 ── (parallel with 3, 5)
    │       └── PHASE 5: Proposal v2 ──── (parallel with 3, 4)
    │
    ├── PHASE 6: Add Item Pipeline ──── (needs Phase 9, parallel with 2-5)
    ├── PHASE 7: Tool Manager ─────── (needs Phase 9, parallel with 2-6)
    └── PHASE 8: Project Folders ──── (parallel with anything after Phase 0)

PHASE 10: Cleanup & Migration ────── DO LAST (after everything proven)
```

### Execution Order
1. Phase 9 (Infrastructure)
2. Phase 0 (Foundation)
3. Phase 1 (Setup Tab)
4. Phases 2 + 6 + 7 + 8 (parallel — Version Mgmt + Add Item + Tool Mgr + Folders)
5. Phases 3 + 4 + 5 (parallel — BTX + Import + Proposal, after Phase 2)
6. Phase 10 (Cleanup, last)

---

## FUTURE ENHANCEMENTS (Not in this plan, noted for later)
- **Rate calculations:** R value / thickness-based rate adjustments (base rate + $/unit increment). Infrastructure exists (columns D-F read by proposal), calculation logic TBD by Isaac.
- **Apps Script expand:** Additional triggers beyond Column C if needed (format on edit, etc.)
- **HubSpot integration:** Sync project data to HubSpot Jobs
- **Multi-estimator:** Concurrent editing awareness
- **Historical analytics:** Rate trending from mr_staging.takeoff_lines_enriched (700k+ rows)

---

## RISK REGISTER
| # | Risk | Phase | Severity | Mitigation |
|---|------|-------|----------|------------|
| R1 | Version creation breaks formulas | 2 | HIGH | Verify formulas after every sheet creation, test proposal preview |
| R2 | Hidden rows lose data | 2 | HIGH | Rule #1 enforced in code, verify before hiding |
| R3 | CSV accumulation changes behavior | 4 | HIGH | Feature flag: overwrite vs accumulate |
| R4 | Apps Script breaks formula detection | 1 | HIGH | Test proposal preview after every Apps Script change |
| R5 | Dead code deletion breaks imports | 0 | MEDIUM | grep all references, npm build after each deletion |
| R6 | Migration breaks test projects | 10 | MEDIUM | Test on 3 first, backup everything |
| R7 | Multiple sheets confuse routes | 2 | MEDIUM | All routes default to active version |
| R8 | Library column count mismatch in Add Item | 6 | MEDIUM | Audit all columns first (task 6A.1) |
| R9 | Python backend API changes | 3,7 | MEDIUM | Version API calls |
| R10 | Bible gets stale | All | MEDIUM | Enforcement rule: no merge without Bible update |

---

## TASK SUMMARY
| Phase | Description | Tasks | Priority |
|-------|-------------|-------|----------|
| 9 | Infrastructure | 10 | P0 — FIRST |
| 0 | Foundation | 28 | P0 — SECOND |
| 1 | Setup Tab | 24 | P0 — THIRD |
| 2 | Version Management | 13 | P1 |
| 3 | BTX v2 | 7 | P1 |
| 4 | CSV Import v2 | 11 | P1 |
| 5 | Proposal v2 | 10 | P1 |
| 6 | Add Item | 22 | P2 |
| 7 | Tool Manager | 10 | P2 |
| 8 | Project Folders | 9 | P2 |
| 10 | Cleanup & Migration | 12 | P3 — LAST |
| **TOTAL** | | **~156** | |

---

## TRACKING
All tasks loaded into BigQuery `mr_main.implementation_tracker`.
Google Sheet view for Isaac to monitor.
Fields: phase, task_id, description, file_affected, task_type, status (NOT_STARTED/IN_PROGRESS/DONE/BLOCKED/SKIPPED), verified, verified_by, verified_at, session_completed, notes, branch.

---

*Built from verified 10-batch audit + Isaac's direct review feedback. Every file, route, table, and behavior confirmed against main branch 2026-02-12. No assumptions from compacted sessions.*
