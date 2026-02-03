# Canonical Dependencies Map

**Purpose:** Track every component that uses item or location mappings and unify them to the new `item_master` and `location_master` tables.

**Created:** 2026-02-03
**Tables:** `mr_main.item_master` (58 rows), `mr_main.location_master` (21 rows)

---

## Component Inventory

### 1. Template Population (`populateTakeoffSheet`)

| Attribute | Value |
|-----------|-------|
| **File** | `lib/google-sheets.js` |
| **Function** | `populateTakeoffSheet()` |
| **Current Source** | Receives `columns` and `lineItems` as parameters from caller |
| **Should Read From** | `item_master` (for row mapping), `location_master` (for column mapping) |
| **Status** | **NEEDS REFACTOR** |

**Notes:** Currently relies on caller to provide structure. Should query `item_master` for template_row and `location_master` for template_column.

---

### 2. BTX Generation (Python Backend)

| Attribute | Value |
|-----------|-------|
| **File** | `/home/iwagschal/aeyecorp/app/bluebeam/mapping.py` |
| **Class** | `TemplateLoader.get_template_with_systems()` |
| **Current Source** | `mr_agent.v_takeoff_template_with_systems` (BigQuery view) |
| **Should Read From** | `item_master` (already similar structure) |
| **Status** | **ACCEPTABLE** - uses BigQuery, may need view update |

**Notes:** The Python backend reads from `mr_agent.v_takeoff_template_with_systems`. Consider creating a view over `item_master` or updating the existing view to source from `item_master`.

---

### 3. CSV Import (`fillBluebeamDataToSpreadsheet`)

| Attribute | Value |
|-----------|-------|
| **File** | `lib/google-sheets.js` |
| **Function** | `fillBluebeamDataToSpreadsheet()` |
| **Current Source** | **HARDCODED** `ITEM_ID_TO_ROW` constant (lines 563-587) + reads Column A dynamically |
| **Should Read From** | `item_master.template_row` for item→row, `location_master` for section-specific location→column |
| **Status** | **NEEDS REFACTOR** |

**Current Implementation:**
```javascript
const ITEM_ID_TO_ROW = {
  'MR-001VB': 4, 'MR-002PITCH': 5, ...  // 51 items hardcoded
}
const TEMPLATE_SECTIONS = {
  ROOFING: { headerRow: 3, startRow: 4, endRow: 43 },
  BALCONIES: { headerRow: 45, startRow: 46, endRow: 53 },
  EXTERIOR: { headerRow: 54, startRow: 55, endRow: 72 }
}
```

**Refactor Plan:**
1. Query `item_master` for `item_id` → `template_row` mapping
2. Query `location_master` for `location_code` → `template_column` by section
3. Cache results (items rarely change)

---

### 4. Sheet-Config Endpoint

| Attribute | Value |
|-----------|-------|
| **File** | `app/api/ko/takeoff/[projectId]/sheet-config/route.js` |
| **Current Source** | Reads directly from Google Sheet (Column A for item_ids, header rows for locations) |
| **Should Read From** | Sheet for project-specific data, `item_master` for validation/enrichment |
| **Status** | **CORRECT** - reads sheet dynamically |

**Notes:** This endpoint correctly reads the actual sheet state. Could optionally cross-reference `item_master` to validate item_ids.

---

### 5. Proposal Generation

| Attribute | Value |
|-----------|-------|
| **File** | `app/api/ko/proposal/[projectId]/preview/route.js` |
| **Current Source** | Reads takeoff sheet directly via `readSheetValues()` |
| **Should Read From** | Sheet for quantities, `item_master` for descriptions/metadata |
| **Status** | **NEEDS ENRICHMENT** |

**Notes:** Currently reads sheet data. Should join with `item_master` for `paragraph_description`, `row_type`, and display formatting.

---

### 6. Takeoff Library Endpoint

| Attribute | Value |
|-----------|-------|
| **File** | `app/api/ko/takeoff/library/route.js` |
| **Current Source** | `mr_agent.lib_takeoff_template` (BigQuery) |
| **Should Read From** | `item_master` |
| **Status** | **NEEDS REFACTOR** |

**Notes:** This endpoint returns the item library for the UI. Should query `item_master` instead of `lib_takeoff_template`.

---

### 7. Bluebeam Route (CSV Parsing)

| Attribute | Value |
|-----------|-------|
| **File** | `app/api/ko/takeoff/[projectId]/bluebeam/route.js` |
| **Current Source** | **HARDCODED** `ITEM_PATTERNS` for fuzzy matching |
| **Should Read From** | `item_master.bluebeam_pattern` |
| **Status** | **NEEDS REFACTOR** |

**Notes:** Contains ~31 regex patterns for matching CSV subjects to items. These should come from `item_master.bluebeam_pattern`.

---

## Refactoring Priority

| Priority | Component | Impact | Effort |
|----------|-----------|--------|--------|
| 1 | CSV Import (`fillBluebeamDataToSpreadsheet`) | High - core data flow | Medium |
| 2 | Takeoff Library Endpoint | Medium - UI item selection | Low |
| 3 | Bluebeam Route (CSV Parsing) | Medium - import accuracy | Medium |
| 4 | BTX Backend (view update) | Low - already uses BQ | Low |
| 5 | Proposal Generation | Low - enrichment only | Low |
| 6 | Template Population | Low - rarely called | Medium |

---

## Migration Strategy

### Phase 1: Create Compatibility Views
```sql
-- View to maintain backward compatibility with lib_takeoff_template consumers
CREATE OR REPLACE VIEW `mr_agent.lib_takeoff_template` AS
SELECT
  item_id,
  display_name AS scope_name,
  section,
  uom,
  default_rate,
  has_r_value,
  has_thickness,
  has_material_type,
  sort_order
FROM `mr_main.item_master`
WHERE is_active = TRUE;
```

### Phase 2: Update JS Components
1. Create `lib/takeoff-config.js` with cached BigQuery queries
2. Replace hardcoded constants with async lookups
3. Add fallback to hardcoded values during transition

### Phase 3: Verify and Remove Legacy
1. Test all flows end-to-end
2. Remove hardcoded `ITEM_ID_TO_ROW`, `TEMPLATE_SECTIONS`, `ITEM_PATTERNS`
3. Archive `lib_takeoff_template` table

---

## Table Schemas (Reference)

### item_master (58 rows)
| Column | Type | Description |
|--------|------|-------------|
| item_id | STRING | Primary key (MR-001VB) |
| template_row | INT64 | Row in Google Sheet template |
| template_scope_name | STRING | Exact name from template Column C |
| display_name | STRING | Clean display name |
| section | STRING | ROOFING, BALCONIES, EXTERIOR, MISC |
| uom | STRING | SF, LF, EA, LS |
| default_rate | FLOAT64 | Default unit cost |
| short_code | STRING | Legacy code (VB, DRAIN) |
| bluebeam_pattern | STRING | Regex for CSV matching |
| sort_order | INT64 | Display order |

### location_master (21 rows)
| Column | Type | Description |
|--------|------|-------------|
| location_code | STRING | Primary key (FL1, BAL2, FRONT) |
| location_name | STRING | Display name (1st Floor) |
| section | STRING | ROOFING, BALCONIES, EXTERIOR |
| template_column | STRING | Column letter (G, H, I...) |
| aliases | ARRAY<STRING> | Alternative names for matching |
| sort_order | INT64 | Display order |

### project_folders (Project-to-Sheet Mapping)

| Column | Type | Description |
|--------|------|-------------|
| id | STRING | Project ID (proj_xxx) |
| project_name | STRING | Human-readable project name |
| takeoff_spreadsheet_id | STRING | Google Sheet ID for this project's takeoff |
| drive_folder_id | STRING | Google Drive folder for project files |
| contact_id | STRING | FK to contacts_companies |

**Used by:**
- `sheet-config` endpoint - looks up spreadsheet ID for a project
- `proposal/preview` endpoint - gets project metadata
- Estimating Center UI - determines if project has takeoff

**Note:** This is the **source of truth** for which spreadsheet belongs to which project. The `takeoff_spreadsheet_id` column links a project to its standalone Google Sheet takeoff.

---

## Quick Reference: Where Data Lives

| Data Type | Canonical Source | Dataset |
|-----------|-----------------|---------|
| Item definitions | `item_master` | mr_main |
| Location definitions | `location_master` | mr_main |
| Project-to-sheet mapping | `project_folders.takeoff_spreadsheet_id` | mr_main |
| Project takeoff data | Google Sheet | per-project |
| Project metadata | `project_folders` | mr_main |
| System options | `v_takeoff_template_with_systems` | mr_agent |
