# Library Tab Column Audit — Task 6A.1
# Session 43 | 2026-02-13
# Purpose: Document every column, its data source, and Add Item form requirements

---

## Summary

- **Data columns:** A-AE (31 columns) — from BigQuery `v_library_complete` view
- **FILTER formula columns:** AF-AQ (12 columns) — computed in-sheet for dropdown validation
- **Total:** 43 columns (A through AQ)
- **Data sources:** `item_description_mapping` (27 cols) + `lib_takeoff_template` (10 cols) joined into `v_library_complete` view (32 cols)

---

## DATA COLUMNS (A-AE)

| Col | Header | BQ Source | Table | Add Item Form | Form Field Type |
|-----|--------|-----------|-------|---------------|-----------------|
| A | item_id | idm.item_id | item_description_mapping | Auto-generate (MR-XXX format) | Auto + editable |
| B | section | idm.section | item_description_mapping | Required dropdown | Select: ROOFING/BALCONIES/EXTERIOR/WATERPROOFING |
| C | display_name | idm.display_name | item_description_mapping | Required text | Text input |
| D | scope_name | idm.scope_name | item_description_mapping | Required text | Text input |
| E | unit_cost | lt.default_unit_cost | lib_takeoff_template | Optional number | Number input ($/unit) |
| F | default_rate | idm.default_rate | item_description_mapping | Optional number | Number input |
| G | uom | idm.uom | item_description_mapping | Required dropdown | Select: SF/LF/EA/SY/etc. |
| H | row_type | idm.row_type | item_description_mapping | Auto-set from type selector | Hidden (derived) |
| I | is_system | idm.is_system | item_description_mapping | Derived from type selector | Hidden (derived) |
| J | can_standalone | idm.can_standalone | item_description_mapping | Toggle | Checkbox |
| K | can_bundle | idm.can_bundle | item_description_mapping | Toggle (auto-FALSE for systems) | Checkbox |
| L | parent_item_id | idm.parent_item_id | item_description_mapping | Conditional: shown for components | Select (existing items) |
| M | system_heading | idm.system_heading | item_description_mapping | Conditional: shown for systems | Text input |
| N | paragraph_description | idm.paragraph_description | item_description_mapping | Conditional: systems/standalone | Textarea |
| O | bundle_fragment | idm.bundle_fragment | item_description_mapping | Conditional: shown for components | Textarea |
| P | standalone_description | idm.standalone_description | item_description_mapping | Conditional: shown for standalone | Textarea |
| Q | fragment_sort_order | idm.fragment_sort_order | item_description_mapping | Conditional: components only | Number input |
| R | bundling_notes | idm.bundling_notes | item_description_mapping | Optional | Textarea |
| S | description_status | idm.description_status | item_description_mapping | Auto-computed | Hidden (derived) |
| T | has_bluebeam_tool | idm.has_bluebeam_tool | item_description_mapping | Auto-set if tool selected | Hidden (derived) |
| U | has_template_row | idm.has_template_row | item_description_mapping | Default FALSE (new item) | Hidden (default) |
| V | has_scope_mapping | idm.has_scope_mapping | item_description_mapping | Auto-set if scope_name filled | Hidden (derived) |
| W | has_historical_data | idm.has_historical_data | item_description_mapping | Default FALSE | Hidden (default) |
| X | has_rate | idm.has_rate | item_description_mapping | Default FALSE | Hidden (default) |
| Y | has_r_value | idm.has_r_value | item_description_mapping | Toggle | Checkbox |
| Z | has_material_type | idm.has_material_type | item_description_mapping | Toggle | Checkbox |
| AA | has_thickness | lt.has_thickness | lib_takeoff_template | Toggle | Checkbox |
| AB | historical_project_count | idm.historical_project_count | item_description_mapping | Default 0 | Hidden (default) |
| AC | readiness_score | COMPUTED | v_library_complete (view) | Auto-computed, not stored | Display only |
| AD | notes | lt.notes | lib_takeoff_template | Optional | Textarea |
| AE | bluebeam_tool_name | idm.bluebeam_tool_name | item_description_mapping | Optional dropdown | Select (existing tools) or text |

---

## FILTER FORMULA COLUMNS (AF-AQ)

These are NOT data — they are FILTER formulas that auto-update when new data rows are added.
The Add Item form does NOT need to touch these directly; they recalculate automatically.

| Col | Header | Formula Pattern | Purpose |
|-----|--------|-----------------|---------|
| AF | roofing_systems | =FILTER(C:C, B:B="ROOFING", I:I="TRUE") | Dropdown source: ROOFING system items |
| AG | balconies_systems | =FILTER(C:C, B:B="BALCONIES", I:I="TRUE") | Dropdown source: BALCONIES system items |
| AH | exterior_systems | =FILTER(C:C, B:B="EXTERIOR", I:I="TRUE") | Dropdown source: EXTERIOR system items |
| AI | waterproofing_systems | =FILTER(C:C, B:B="WATERPROOFING", I:I="TRUE") | Dropdown source: WATERPROOFING system items |
| AJ | roofing_bundle | =FILTER(C:C, B:B="ROOFING", K:K="TRUE") | Dropdown source: ROOFING bundleable items |
| AK | balconies_bundle | =FILTER(C:C, B:B="BALCONIES", K:K="TRUE") | Dropdown source: BALCONIES bundleable items |
| AL | exterior_bundle | =FILTER(C:C, B:B="EXTERIOR", K:K="TRUE") | Dropdown source: EXTERIOR bundleable items |
| AM | waterproofing_bundle | =FILTER(C:C, B:B="WATERPROOFING", K:K="TRUE") | Dropdown source: WATERPROOFING bundleable items |
| AN | roofing_standalone | =FILTER(C:C, B:B="ROOFING", J:J="TRUE") | Dropdown source: ROOFING standalone items |
| AO | balconies_standalone | =FILTER(C:C, B:B="BALCONIES", J:J="TRUE") | Dropdown source: BALCONIES standalone items |
| AP | exterior_standalone | =FILTER(C:C, B:B="EXTERIOR", J:J="TRUE") | Dropdown source: EXTERIOR standalone items |
| AQ | waterproofing_standalone | =FILTER(C:C, B:B="WATERPROOFING", J:J="TRUE") | Dropdown source: WATERPROOFING standalone items |

---

## BigQuery INSERT Requirements

### Table 1: item_description_mapping (27 columns)
All columns nullable except item_id (effectively — it's the key).

**Required for new item:**
- item_id (STRING) — unique, MR-XXX format
- display_name (STRING)
- scope_name (STRING)
- section (STRING) — ROOFING | BALCONIES | EXTERIOR | WATERPROOFING
- uom (STRING) — SF | LF | EA | SY
- row_type (STRING) — item | system | header | COMPONENT_ROW | STANDALONE_ROW
- is_system (BOOL)
- can_standalone (BOOL)
- can_bundle (BOOL)

**Optional/conditional:**
- default_rate (FLOAT64)
- has_r_value (BOOL) — default false
- has_material_type (BOOL) — default false
- paragraph_description (STRING) — for systems
- system_heading (STRING) — for systems
- bundle_fragment (STRING) — for components
- standalone_description (STRING) — for standalones
- fragment_sort_order (INT64) — for components
- bundling_notes (STRING)
- parent_item_id (STRING) — for components
- bluebeam_tool_name (STRING)

**Auto-computed on insert:**
- description_status — "HAS_DESCRIPTION" if any description field filled, else "MISSING"
- has_bluebeam_tool — true if bluebeam_tool_name provided
- has_template_row — false (no template row yet)
- has_scope_mapping — true if scope_name provided
- has_historical_data — false
- has_rate — false
- historical_project_count — 0

### Table 2: lib_takeoff_template (10 columns)
item_id NOT NULL (primary key).

**Required:**
- item_id (STRING) — must match item_description_mapping
- section (STRING)
- scope_name (STRING)
- uom (STRING)

**Optional:**
- default_unit_cost (FLOAT64)
- sort_order (INT64) — auto-calculate as MAX(sort_order) + 1
- has_r_value (BOOL)
- has_thickness (BOOL)
- has_material_type (BOOL)
- notes (STRING)

---

## Add Item Form Field Summary

### Always Visible (14 fields)
1. **item_id** — Auto-generated, editable (with duplicate check)
2. **section** — Dropdown: ROOFING, BALCONIES, EXTERIOR, WATERPROOFING
3. **display_name** — Text input (required)
4. **scope_name** — Text input (required)
5. **uom** — Dropdown: SF, LF, EA, SY, etc. (required)
6. **default_unit_cost** — Number input (optional, goes to lib_takeoff_template)
7. **default_rate** — Number input (optional)
8. **item_type** — Radio: System, Component, Standalone (controls conditional fields + auto-sets row_type, is_system)
9. **can_standalone** — Checkbox
10. **can_bundle** — Checkbox (auto-FALSE for systems)
11. **has_r_value** — Checkbox
12. **has_thickness** — Checkbox
13. **has_material_type** — Checkbox
14. **bluebeam_tool_name** — Dropdown of existing tools or "None"

### Conditional: System Type (3 fields)
15. **system_heading** — Text input
16. **paragraph_description** — Textarea (with placeholder help: {R_VALUE}, {THICKNESS}, {TYPE})

### Conditional: Component Type (4 fields)
17. **parent_item_id** — Dropdown of existing system items
18. **bundle_fragment** — Textarea
19. **fragment_sort_order** — Number input

### Conditional: Standalone Type (1 field)
20. **standalone_description** — Textarea

### Optional (always visible, 2 fields)
21. **bundling_notes** — Textarea
22. **notes** — Textarea (goes to lib_takeoff_template)

### Hidden/Auto-computed (displayed in preview only)
- description_status, has_bluebeam_tool, has_template_row, has_scope_mapping, has_historical_data, has_rate, historical_project_count, readiness_score

---

## Propagation Checklist (what happens on submit)

1. INSERT INTO `item_description_mapping` — 27 columns
2. INSERT INTO `lib_takeoff_template` — 10 columns
3. `v_library_complete` view auto-updates (it's a view, no action needed)
4. Refresh Library tab on template spreadsheet (call populate-library-tab logic)
5. FILTER formulas in AF-AQ auto-update (they reference data range)
6. Return readiness_score + manual steps remaining
