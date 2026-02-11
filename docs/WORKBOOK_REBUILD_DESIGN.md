# Workbook Rebuild — Design Document
## Created: 2026-02-11

## Overview
Rebuild the per-project takeoff template from a single-sheet copy
into a multi-tab workbook with integrated library, Bluebeam setup,
and version-controlled takeoff sheets.

## Tab Structure

### Tab 1: Library (read-only, visible)
- Source: BigQuery view `mr_main.v_library_complete`
- Populated via Sheets API at workbook creation time
- Refreshable on demand (button or Apps Script trigger on open)
- NOT a Connected Sheet — regular grid tab written by server
- Protected: read-only for estimators
- Formatted: section grouping with collapsible rows, color coding
  by section, frozen headers, conditional formatting for gaps

**Columns from BigQuery (item_description_mapping + joins):**
- item_id, scope_name, section, display_name
- is_system, can_bundle, can_standalone, row_type
- system_heading, paragraph_description
- bundle_fragment, standalone_description, fragment_sort_order
- uom, default_rate, has_r_value, has_thickness, has_material_type
- historical: project_count, avg_rate, min_rate, max_rate

**Columns from Bluebeam mapping (merged at population time):**
- has_bluebeam_tool (BOOL)
- bluebeam_measurement_type (area/polylength/count)
NOTE: Bluebeam mapping lives in JSON files on the Python backend
(136.111.252.120), NOT in BigQuery. The server-side population
step reads both BigQuery AND the JSON mapping, merges them, and
writes the combined result to the Library tab.

Files on Python backend:
- BLUEBEAM_COMPLETE_MAPPING.json (teju_subject → item_id, 64 mapped)
- MASTER_BLUEBEAM_CONFIG.json (item_id → display, systems, rates)
- Teju Tool Set.btx (74 base tools)

### Tab 2: Bluebeam Setup (control center)
- Rows: items selected from Library via dropdown (validates against Library tab)
- Columns: locations set by estimator (Main Roof, 1st Floor, etc.)
- Every cell intersection: checkbox (TRUE/FALSE)
- Checked = generate Bluebeam tool for that item+location
- THIS TAB DRIVES THE TAKEOFF TAB:
  - Items with at least one checkbox → visible on Takeoff tab
  - Items with zero checkboxes → hidden on Takeoff tab
  - Locations with at least one checkbox → column on Takeoff tab
- Tracks export state: hidden companion row or range records which
  checkboxes have been previously downloaded
- Download modes: "All Tools" / "New Only"
- Adding a new checkbox later auto-updates Takeoff tab

### Tab 3: Takeoff — [DATE] (e.g., "2026-02-11")
- Sheet name = today's date, auto-set at creation
- If date already exists: "2026-02-11-v2", "2026-02-11-v3"
- "+" button creates new version with today's date
- Auto-populated from Bluebeam Setup tab:
  - Only items with checked boxes appear as rows
  - Only locations with checked boxes appear as columns
  - Items hidden (not deleted) when unchecked
- Contains: item_id (dropdown from Library), R, IN, TYPE,
  scope_name, location quantity columns, unit_cost,
  total_measurements, total_cost
- CSV import from Bluebeam targets this tab
- Dropdown on system rows pulls from Library tab filtered by section

## Data Flow
1. New project → API creates workbook (copies template)
2. Post-copy: API queries BigQuery + reads Bluebeam JSON →
   populates Library tab with merged data
3. API sets data validation: dropdowns on Bluebeam Setup +
   Takeoff tabs reference Library tab ranges
4. Estimator opens Bluebeam Setup → selects items, sets locations,
   checks intersection boxes
5. Takeoff tab auto-updates (show/hide rows and columns)
6. Download BTX → only checked intersections generate tools
7. Bluebeam markup → CSV export → import into Takeoff tab
8. Estimator fills rates/quantities
9. Preview route → Generate route → DOCX proposal

## Key API Changes Needed
- createProjectTakeoffSheet() → createProjectWorkbook()
- New: populateLibraryTab() — queries BQ + reads JSON, writes merged data
- New: setupDataValidation() — dropdowns reference Library tab ranges
  (uses ONE_OF_RANGE on regular grid sheet, NOT Connected Sheets)
- Modified: BTX generator reads checkbox state from Bluebeam Setup tab
- Modified: CSV import targets date-named takeoff tab
- New: createNewVersion() — copies takeoff tab with date+version name
- New: refreshLibrary() — re-queries BQ + JSON, updates Library tab

## BigQuery View Needed
```sql
CREATE VIEW mr_main.v_library_complete AS
SELECT
  idm.item_id,
  idm.scope_name,
  idm.section,
  idm.display_name,
  idm.is_system,
  idm.can_bundle,
  idm.can_standalone,
  idm.row_type,
  idm.system_heading,
  idm.paragraph_description,
  idm.bundle_fragment,
  idm.standalone_description,
  idm.fragment_sort_order,
  idm.description_status,
  lt.uom,
  lt.default_unit_cost,
  lt.has_r_value,
  lt.has_thickness,
  lt.has_material_type,
  lt.sort_order,
  erc.avg_rate,
  erc.min_rate,
  erc.max_rate,
  erc.project_count as historical_project_count
FROM `master-roofing-intelligence.mr_main.item_description_mapping` idm
LEFT JOIN `master-roofing-intelligence.mr_main.lib_takeoff_template` lt
  ON idm.item_id = lt.item_id
LEFT JOIN `master-roofing-intelligence.mr_main.estimator_rate_card` erc
  ON idm.item_id = erc.item_id
WHERE idm.item_id NOT LIKE 'MR-MISC%'
```
NOTE: Bluebeam tool info is NOT in this view. It gets merged
at sheet population time from the Python backend JSON files.

## New Item Checklist (for each promoted item)
When adding a new item (e.g., promoting Cat 2 orphans):
1. BigQuery: item_description_mapping (classifications + descriptions)
2. BigQuery: lib_takeoff_template (section, uom, rate, sort_order)
3. Python backend: BLUEBEAM_COMPLETE_MAPPING.json (add mapping)
4. Python backend: MASTER_BLUEBEAM_CONFIG.json (add config)
5. Python backend: Clone tool in Teju Tool Set.btx (new Subject)
Steps 3-5 can be batched after all BigQuery items are finalized.

## Dependencies
- Workstream 1 (Library Completion in BigQuery) must finish first
- Feature branch: feature/workbook-rebuild
- Does NOT touch preview/route.js or generate/route.js
- Does NOT change proposal pipeline logic

## Risks & Notes
- Existing projects have old single-tab format — need migration
  path or grandfather clause (old projects keep working as-is)
- Bluebeam Setup ↔ Takeoff sync reliability (sheet formulas vs API)
- Library tab refresh needs to preserve estimator's takeoff data
- Template copy must include all tabs in correct state
