# Session 19 State — Estimating Center Single Source of Truth Fix

**Started:** 2026-02-02
**Goal:** Fix Bluebeam CSV import ("6 items parsed, 0 cells updated")

---

## TASK 1 COMPLETE: Template Verification

### Live Template Read (API Verified)
**Template ID:** `1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4`
**Sheet Name:** `DATE`

### Row 3 (Roofing Header) — Columns A-L:
```
A: "item_id (NEW)"
B: "Unit Cost "
C: "Scope"
D: "R"
E: "IN"
F: "TYPE"
G: "1st Floor "
H: "2nd Floor "
I: "3rd Floor "
J: "4th Floor "
K: "Main Roof "
L: "Stair Bulkhead"
```

### Row 45 (Balconies Header) — Columns A-L:
```
A: "" (EMPTY)
B: "Unit Cost "
C: "Scope"
D-F: "" (empty)
G: "1st floor Balconies"
H-L: (more balcony floors)
```

### Row 54 (Exterior Header) — Columns A-L:
```
A: "" (EMPTY)
B: "Unit Cost "
C: "Scope"
D-F: "" (empty)
G: "Front / ----Elevation"
H-L: (more elevations)
```

### Column A Rows 4-43: **ALL EMPTY**
Every single data row has empty string in Column A.

---

## ROOT CAUSE CONFIRMED

| Component | Expected | Actual |
|-----------|----------|--------|
| Column A header | "item_id" | ✅ "item_id (NEW)" exists in Row 3 |
| Column A data | MR-001VB, MR-002PITCH, etc. | ❌ **ALL EMPTY** |
| Balconies header A45 | "item_id" | ❌ Empty |
| Exterior header A54 | "item_id" | ❌ Empty |

**The template was partially updated** — Column A header added but:
1. No item_ids populated in data rows
2. Balconies/Exterior section headers not updated

This is why `fillBluebeamDataToSpreadsheet()` reads Column A and builds an empty `codeRows` map → 0 matches → 0 cells updated.

---

## TASK 2: Diagnostic Audit

### Q1: Files with Hardcoded Codes (Line Numbers)

| File | Lines | What's Hardcoded |
|------|-------|------------------|
| `lib/google-sheets.js` | 672-775 | `SCOPE_CODE_TO_NAME` - 56 full MR-XXX codes + 47 short codes |
| `lib/google-sheets.js` | 587-611 | `locationColumns` default mapping (FL1, FL-1, 1ST FLOOR, etc.) |
| `lib/google-sheets.js` | 1230-1291 | `CODE_ROWS` - DEPRECATED legacy code→row mapping |
| `app/api/ko/takeoff/[projectId]/bluebeam/route.js` | 27-58 | `ITEM_PATTERNS` - 31 regex patterns for fuzzy code matching |
| `app/api/ko/takeoff/[projectId]/bluebeam/route.js` | 61-70 | `FLOOR_PATTERNS` - 8 floor patterns (outputs FL1, FL2, ROOF, etc.) |
| `app/api/ko/bluebeam/convert/route.js` | 79-107 | `FLOOR_MAPPINGS` - text→floor name mapping |
| `app/api/ko/bluebeam/convert/route.js` | 193-201 | Floor extraction regex patterns |
| `scripts/populate-template-column-a.js` | 16-72 | `scopeNameToItemId` - 56 mappings |
| `components/ko/takeoff-setup-screen.jsx` | 82-85 | Default columns: Main Roof, 1st Floor, 2nd Floor |

### Q2: BigQuery `mr_main.item_description_mapping` — COMPLETE

**58 rows found. Columns:**
- `item_id` (PK) — MR-001VB through MR-MISC-VAPOR
- `display_name` — Human readable name
- `scope_name` — Same as display_name
- `section` — ROOFING, BALCONIES, EXTERIOR, MISC
- `uom` — SF, LF, EA, LS
- `default_rate` — Numeric or NULL
- `has_r_value` — Boolean
- `has_material_type` — Boolean
- `row_type` — SYSTEM_ROW or COMPONENT_ROW
- `description_status` — HAS_DESCRIPTION or USE_DISPLAY_NAME
- `paragraph_description` — Full text or NULL
- `bundling_notes` — Future bundling instructions

**Sample rows:**
```
MR-001VB     | Vapor Barrier or Temp waterproofing | ROOFING   | SF | 6.95
MR-003BU2PLY | Roofing - Builtup - 2 ply Scope    | ROOFING   | SF | 16.25
MR-010DRAIN  | Drains                              | ROOFING   | EA | 550
MR-033TRAFFIC| Traffic Coating                     | BALCONIES | SF | 17
MR-043EIFS   | EIFS Scope                          | EXTERIOR  | SF | NULL
```

**Key finding:** BigQuery has 58 items, hardcoded lists have ~56. Close but may have gaps.

---

## STEP 3: Comparison Table — Template vs BigQuery

### Template Line Items (excluding BUNDLE TOTAL rows)

| Row | Template Scope Name | Best Match item_id | BigQuery scope_name | Status |
|-----|--------------------|--------------------|---------------------|--------|
| 4 | Vapor Barrier or Temp waterproofing | MR-001VB | Vapor Barrier or Temp waterproofing | ✅ EXACT |
| 5 | Upcharge for 1/4" Pitch | MR-002PITCH | Upcharge for 1/4" Pitch | ✅ EXACT |
| 6 | Roofing - Builtup - 2 ply Scope (R?) | MR-003BU2PLY | Roofing - Builtup - 2 ply Scope | ⚠️ CLOSE |
| 7 | up and over | MR-004UO | Up and over | ✅ CLOSE (case) |
| 8 | Scupper /gutter and leader | MR-005SCUPPER | Scupper/gutter and leader | ✅ CLOSE (spacing) |
| 10 | Roofing - IRMA - (Scope - Liquid or 2ply) | MR-006IRMA | Roofing - IRMA | ⚠️ CLOSE |
| 11 | PMMA (Liquid) or 2ply Torch@Building Wall | MR-007PMMA | PMMA (Liquid) or 2ply Torch@Building Wall | ✅ EXACT |
| 12 | PMMA (Liquid) or 2ply Torch@Parapet Wall | MR-008PMMA | PMMA (Liquid) or 2ply Torch@Parapet Wall | ✅ EXACT |
| 13 | up and over - PMMA (Liquid) or 2ply... | MR-009UOPMMA | Up and over - PMMA | ⚠️ CLOSE |
| 15 | Drains | MR-010DRAIN | Drains | ✅ EXACT |
| 16 | Doorpans - Standard 3-6' | MR-011DOORSTD | Doorpans - Standard 3-6 ft | ✅ CLOSE |
| 17 | Doorpans - Large | MR-012DOORLG | Doorpans - Large | ✅ EXACT |
| 19 | Roof hatch / Skylights (Area) | MR-013HATCHSF | Roof hatch/Skylights (Area) | ✅ CLOSE |
| 20 | Roof hatch / Skylights (Perimeter) | MR-014HATCHLF | Roof hatch/Skylights (Perimeter) | ✅ CLOSE |
| 21 | Concrete Mechanical Pads/Walkway pads (sf) | MR-015PAD | Concrete Mechanical Pads/Walkway pads | ✅ CLOSE |
| 22 | Fence posts | MR-016FENCE | Fence posts | ✅ EXACT |
| 23 | Railing Posts | MR-017RAIL | Railing Posts | ✅ EXACT |
| 24 | Plumbing Penetrations | MR-018PLUMB | Plumbing Penetrations | ✅ EXACT |
| 25 | Mechanical Penetrations | MR-019MECH | Mechanical Penetrations | ✅ EXACT |
| 26 | Davits (EA) | MR-020DAVIT | Davits | ✅ CLOSE |
| 27 | AC Units -EA (dunnage?) | MR-021AC | AC Units/Dunnage | ✅ CLOSE |
| 29 | (Alum.) Coping (Low Parapet) Gravel stop/Edge Flashing | MR-022COPELO | Coping (Low Parapet) Gravel stop/Edge Flashing | ✅ CLOSE |
| 30 | (Alum.) Coping (high Parapet) | MR-023COPEHI | Coping (High Parapet) | ✅ CLOSE |
| 31 | Insulation under Coping (R Value) | MR-024INSUCOPE | Insulation under Coping | ✅ CLOSE |
| 33 | (Alum.) Metal Flashing at building wall | MR-025FLASHBLDG | Metal Flashing at building wall | ✅ CLOSE |
| 34 | (Alum.) Metal Flashing at Parapet wall | MR-026FLASHPAR | Metal Flashing at Parapet wall | ✅ CLOSE |
| 36 | Overburden for Irma Roof (Drainage mat...) | MR-027OBIRMA | Overburden for IRMA Roof | ✅ CLOSE |
| 37 | Pavers (R ?) | MR-028PAVER | Pavers | ✅ CLOSE |
| 38 | Metal Edge flashing at the paver Termination | MR-029FLASHPAV | Metal Edge flashing at paver Termination | ✅ CLOSE |
| 40 | Green Roof Scope | MR-030GREEN | Green Roof Scope | ✅ EXACT |
| 41 | Metal Edge flashing at the Green Roof | MR-031FLASHGRN | Metal Edge flashing at Green Roof | ✅ CLOSE |
| 43 | Recessed floor (Location) - Liquid Waterproofing | MR-032RECESSWP | Recessed floor - Liquid Waterproofing | ✅ CLOSE |
| 46 | Traffic Coating | MR-033TRAFFIC | Traffic Coating | ✅ EXACT |
| 47 | Aluminum Drip edge | MR-034DRIP | Aluminum Drip edge | ✅ EXACT |
| 48 | Liquid L Flashing (LF) | MR-035LFLASH | Liquid L Flashing | ✅ CLOSE |
| 50 | Doorpans - Balconies | MR-036DOORBAL | Doorpans - Balconies | ✅ EXACT |
| 55 | Brick area - Waterproofing | MR-037BRICKWP | Brick area - Waterproofing | ✅ EXACT |
| 56 | Openings at brick areas (Count) < 32lf | MR-038OPNBRKEA | Openings at brick areas (Count) < 32lf | ✅ EXACT |
| 57 | Openings at brick areas (LF) > 32lf/40lf | MR-039OPNBRKLF | Openings at brick areas (LF) > 32lf | ✅ CLOSE |
| 59 | Panel Area - Waterproofing | MR-040PANELWP | Panel Area - Waterproofing | ✅ EXACT |
| 60 | Openings at panel Areas (Count) < 32lf | MR-041OPNPNLEA | Openings at panel areas (Count) < 32lf | ✅ CLOSE |
| 61 | Openings at panel Areas (LF) > 32lf/40lf | MR-042OPNPNLLF | Openings at panel areas (LF) > 32lf | ✅ CLOSE |
| 63 | Eifs - Scope (R?) | MR-043EIFS | EIFS Scope | ✅ CLOSE |
| 64 | openings at stucco areas (Count) < 32lf | MR-044OPNSTCEA | Openings at stucco areas (Count) < 32lf | ✅ CLOSE |
| 65 | openings at stucco areas (LF) > 32lf/40lf | MR-045OPNSTCLF | Openings at stucco areas (LF) > 32lf | ✅ CLOSE |
| 66 | Transistional stucco | MR-046STUCCO | Transitional stucco | ✅ CLOSE (typo) |
| 68 | Drip cap (LF) | MR-047DRIPCAP | Drip cap | ✅ CLOSE |
| 69 | Sills | MR-048SILL | Sills | ✅ EXACT |
| 70 | Tie - In (LF) | MR-049TIEIN | Tie-In | ✅ CLOSE |
| 71 | adj. building horizontal (Custom Metal Flashing only) | MR-050ADJHORZ | Adj. building horizontal (Custom Metal Flashing) | ✅ CLOSE |
| 72 | adj. building Vertical (Detail?) | MR-051ADJVERT | Adj. building vertical | ✅ CLOSE |

### BigQuery Items with NO Template Row (ORPHANS)

| item_id | BigQuery scope_name | Status |
|---------|---------------------|--------|
| MR-MISC-DEMO | Removal/Demolition | 🔸 ORPHAN - No template row |
| MR-MISC-GARAGE | Garage/Parking Waterproofing | 🔸 ORPHAN - No template row |
| MR-MISC-METALPNL | Metal Panels/Window Surrounds | 🔸 ORPHAN - No template row |
| MR-MISC-OTHER | Other/Miscellaneous Scope | 🔸 ORPHAN - No template row |
| MR-MISC-SHOWER | Shower Waterproofing | 🔸 ORPHAN - No template row |
| MR-MISC-SIDING | Siding (Vinyl/Metal) | 🔸 ORPHAN - No template row |
| MR-MISC-VAPOR | Vapor Barrier | 🔸 ORPHAN - Duplicate of MR-001VB? |

### Summary
- **51 template line items** (excluding 12 BUNDLE TOTAL rows)
- **51 matched to BigQuery** (all confident matches)
- **7 BigQuery orphans** (MR-MISC-* items not in template)
- **0 unmatched template rows**

---

## STEP 4: Draft CREATE TABLE for `mr_main.item_master`

```sql
-- Single Source of Truth: Item Master Table
-- Replaces all hardcoded mappings in lib/google-sheets.js, bluebeam/route.js, etc.

CREATE TABLE IF NOT EXISTS `master-roofing-intelligence.mr_main.item_master` (
  -- Primary identifier
  item_id STRING NOT NULL,                    -- 'MR-001VB' (canonical key)

  -- Template mapping
  template_row INT64,                         -- Row number in template (4, 5, 6...)
  template_scope_name STRING,                 -- Exact scope name from template Column C

  -- Display names
  display_name STRING NOT NULL,               -- Clean display name
  scope_name STRING,                          -- Alias (usually same as display_name)

  -- Categorization
  section STRING NOT NULL,                    -- 'ROOFING', 'BALCONIES', 'EXTERIOR', 'MISC'
  uom STRING NOT NULL,                        -- 'SF', 'LF', 'EA', 'LS'

  -- Pricing
  default_rate FLOAT64,                       -- Default unit cost

  -- Variant flags
  has_r_value BOOL DEFAULT FALSE,
  has_thickness BOOL DEFAULT FALSE,
  has_material_type BOOL DEFAULT FALSE,

  -- Proposal integration
  row_type STRING,                            -- 'SYSTEM_ROW' or 'COMPONENT_ROW'
  description_status STRING,                  -- 'HAS_DESCRIPTION' or 'USE_DISPLAY_NAME'
  paragraph_description STRING,               -- Full proposal text (with placeholders)

  -- Short codes for legacy parsing
  short_code STRING,                          -- 'VB', 'DRAIN', etc.
  bluebeam_patterns ARRAY<STRING>,            -- Regex patterns for fuzzy matching

  -- Metadata
  is_active BOOL DEFAULT TRUE,
  sort_order INT64,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
OPTIONS (
  description = 'Single source of truth for all takeoff line items. Used by BTX generator, CSV parser, sheet population, and proposal generator.'
);
```

### Decisions Needed Before Execution

1. **MR-MISC-* items**: Keep them in item_master with `template_row = NULL`? Or exclude?
2. **Short codes**: Should I auto-generate from item_id (MR-001VB → VB) or manually specify?
3. **Bluebeam patterns**: Should I migrate the 31 patterns from `ITEM_PATTERNS` in bluebeam/route.js?
4. **has_thickness**: BigQuery has `has_material_type` but not `has_thickness`. Add it?

---

## FINAL SQL — Ready for Review

### 1. CREATE TABLE: item_master

```sql
CREATE TABLE IF NOT EXISTS `master-roofing-intelligence.mr_main.item_master` (
  item_id STRING NOT NULL,
  template_row INT64,
  template_scope_name STRING,
  display_name STRING NOT NULL,
  section STRING NOT NULL,
  uom STRING NOT NULL,
  default_rate FLOAT64,
  has_r_value BOOL DEFAULT FALSE,
  has_thickness BOOL DEFAULT FALSE,
  has_material_type BOOL DEFAULT FALSE,
  row_type STRING,
  description_status STRING,
  paragraph_description STRING,
  short_code STRING,
  bluebeam_pattern STRING,
  is_active BOOL DEFAULT TRUE,
  sort_order INT64,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
OPTIONS (description = 'Single source of truth for takeoff line items');
```

### 2. INSERT STATEMENTS: item_master (58 rows)

```sql
-- ROOFING SECTION (32 items)
INSERT INTO `master-roofing-intelligence.mr_main.item_master` (item_id, template_row, template_scope_name, display_name, section, uom, default_rate, has_r_value, has_thickness, has_material_type, row_type, short_code, bluebeam_pattern, sort_order) VALUES
('MR-001VB', 4, 'Vapor Barrier or Temp waterproofing', 'Vapor Barrier or Temp waterproofing', 'ROOFING', 'SF', 6.95, FALSE, FALSE, TRUE, 'SYSTEM_ROW', 'VB', 'vapor\\s*barrier|vb\\b', 1),
('MR-002PITCH', 5, 'Upcharge for 1/4" Pitch', 'Upcharge for 1/4" Pitch', 'ROOFING', 'SF', 1.5, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'PITCH', 'pitch\\s*pocket|pitch\\b', 2),
('MR-003BU2PLY', 6, 'Roofing - Builtup - 2 ply Scope (R?)', 'Roofing - Builtup - 2 ply Scope', 'ROOFING', 'SF', 16.25, TRUE, FALSE, TRUE, 'SYSTEM_ROW', '2PLY', '2\\s*ply|two\\s*ply|buildup', 3),
('MR-004UO', 7, 'up and over', 'Up and over', 'ROOFING', 'SF', 12, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'UO', 'up\\s*over|upover', 4),
('MR-005SCUPPER', 8, 'Scupper /gutter and leader', 'Scupper/gutter and leader', 'ROOFING', 'EA', 2500, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'SCUPPER', 'scupper|leader', 5),
('MR-006IRMA', 10, 'Roofing - IRMA - (Scope - Liquid or 2ply)', 'Roofing - IRMA', 'ROOFING', 'SF', NULL, TRUE, FALSE, TRUE, 'SYSTEM_ROW', 'IRMA', 'irma', 6),
('MR-007PMMA', 11, 'PMMA (Liquid) or 2ply Torch@Building Wall', 'PMMA (Liquid) or 2ply Torch@Building Wall', 'ROOFING', 'SF', NULL, FALSE, FALSE, TRUE, 'SYSTEM_ROW', 'PMMA', 'pmma', 7),
('MR-008PMMA', 12, 'PMMA (Liquid) or 2ply Torch@Parapet Wall', 'PMMA (Liquid) or 2ply Torch@Parapet Wall', 'ROOFING', 'SF', NULL, FALSE, FALSE, TRUE, 'SYSTEM_ROW', 'PMMA-PAR', NULL, 8),
('MR-009UOPMMA', 13, 'up and over - PMMA (Liquid) or 2ply Torch@Parapet Wall', 'Up and over - PMMA', 'ROOFING', 'SF', NULL, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'UOPMMA', NULL, 9),
('MR-010DRAIN', 15, 'Drains', 'Drains', 'ROOFING', 'EA', 550, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'DRAIN', 'drain|roof\\s*drain', 10),
('MR-011DOORSTD', 16, 'Doorpans - Standard 3-6''', 'Doorpans - Standard 3-6 ft', 'ROOFING', 'EA', 550, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'DOORSTD', 'door\\s*pan|door\\s*std|threshold', 11),
('MR-012DOORLG', 17, 'Doorpans - Large', 'Doorpans - Large', 'ROOFING', 'EA', 850, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'DOORLG', NULL, 12),
('MR-013HATCHSF', 19, 'Roof hatch / Skylights (Area)', 'Roof hatch/Skylights (Area)', 'ROOFING', 'SF', NULL, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'HATCHSF', 'hatch|skylight', 13),
('MR-014HATCHLF', 20, 'Roof hatch / Skylights (Perimeter)', 'Roof hatch/Skylights (Perimeter)', 'ROOFING', 'LF', 48, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'HATCHLF', NULL, 14),
('MR-015PAD', 21, 'Concrete Mechanical Pads/Walkway pads (sf)', 'Concrete Mechanical Pads/Walkway pads', 'ROOFING', 'SF', NULL, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'PAD', 'mech\\s*pad|equipment\\s*pad', 15),
('MR-016FENCE', 22, 'Fence posts', 'Fence posts', 'ROOFING', 'EA', 250, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'FENCE', 'fence|guard', 16),
('MR-017RAIL', 23, 'Railing Posts', 'Railing Posts', 'ROOFING', 'EA', 250, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'RAIL', 'rail|hand\\s*rail', 17),
('MR-018PLUMB', 24, 'Plumbing Penetrations', 'Plumbing Penetrations', 'ROOFING', 'EA', 250, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'PLUMB', 'plumb|pipe\\s*boot', 18),
('MR-019MECH', 25, 'Mechanical Penetrations', 'Mechanical Penetrations', 'ROOFING', 'EA', 250, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'MECH', 'mech\\s*pen|penetration', 19),
('MR-020DAVIT', 26, 'Davits (EA)', 'Davits', 'ROOFING', 'EA', 150, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'DAVIT', 'davit|anchor', 20),
('MR-021AC', 27, 'AC Units -EA (dunnage?)', 'AC Units/Dunnage', 'ROOFING', 'EA', 550, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'AC', 'ptac|ac\\s*unit|dunnage', 21),
('MR-022COPELO', 29, '(Alum.) Coping (Low Parapet) Gravel stop/ Egde Flashing', 'Coping (Low Parapet) Gravel stop/Edge Flashing', 'ROOFING', 'LF', 32, FALSE, FALSE, TRUE, 'SYSTEM_ROW', 'COPELO', 'coping|cope\\b', 22),
('MR-023COPEHI', 30, '(Alum.) Coping (high Parapet)', 'Coping (High Parapet)', 'ROOFING', 'LF', 32, FALSE, FALSE, TRUE, 'SYSTEM_ROW', 'COPEHI', NULL, 23),
('MR-024INSUCOPE', 31, 'Insulation under Coping (R Value)', 'Insulation under Coping', 'ROOFING', 'LF', 4, TRUE, FALSE, FALSE, 'COMPONENT_ROW', 'INSUCOPE', NULL, 24),
('MR-025FLASHBLDG', 33, '(Alum.) Metal Flashing at building wall', 'Metal Flashing at building wall', 'ROOFING', 'LF', 24, FALSE, FALSE, TRUE, 'SYSTEM_ROW', 'FLASHBLDG', 'flash|flashing', 25),
('MR-026FLASHPAR', 34, '(Alum.) Metal Flashing at Parapet wall', 'Metal Flashing at Parapet wall', 'ROOFING', 'LF', 24, FALSE, FALSE, TRUE, 'SYSTEM_ROW', 'FLASHPAR', NULL, 26),
('MR-027OBIRMA', 36, 'Overburden for Irma Roof (Drainage mat + R? Insulation + Filterfabric)', 'Overburden for IRMA Roof', 'ROOFING', 'SF', 14, TRUE, FALSE, FALSE, 'COMPONENT_ROW', 'OBIRMA', 'river\\s*rock|ballast', 27),
('MR-028PAVER', 37, 'Pavers (R ?)', 'Pavers', 'ROOFING', 'SF', NULL, TRUE, FALSE, TRUE, 'SYSTEM_ROW', 'PAVER', 'paver|concrete\\s*paver', 28),
('MR-029FLASHPAV', 38, 'Metal Edge flashing at the paver Termination', 'Metal Edge flashing at paver Termination', 'ROOFING', 'LF', 24, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'FLASHPAV', NULL, 29),
('MR-030GREEN', 40, 'Green Roof Scope', 'Green Roof Scope', 'ROOFING', 'SF', 48, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'GREEN', 'artificial\\s*turf|green\\s*roof|vegetat', 30),
('MR-031FLASHGRN', 41, 'Metal Edge flashing at the Green Roof', 'Metal Edge flashing at Green Roof', 'ROOFING', 'LF', 24, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'FLASHGRN', NULL, 31),
('MR-032RECESSWP', 43, 'Recessed floor (Location) - Liquid Waterproofing', 'Recessed floor - Liquid Waterproofing', 'ROOFING', 'SF', 32, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'RECESSWP', 'w\\.?p\\.?|waterproof|liquid\\s*wp', 32);

-- BALCONIES SECTION (5 items)
INSERT INTO `master-roofing-intelligence.mr_main.item_master` (item_id, template_row, template_scope_name, display_name, section, uom, default_rate, has_r_value, has_thickness, has_material_type, row_type, short_code, bluebeam_pattern, sort_order) VALUES
('MR-033TRAFFIC', 46, 'Traffic Coating', 'Traffic Coating', 'BALCONIES', 'SF', 17, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'TRAFFIC', 'traffic\\s*coat', 33),
('MR-034DRIP', 47, 'Aluminum Drip edge', 'Aluminum Drip edge', 'BALCONIES', 'LF', 22, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'DRIP', NULL, 34),
('MR-035LFLASH', 48, 'Liquid L Flashing (LF)', 'Liquid L Flashing', 'BALCONIES', 'LF', 48, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'LFLASH', NULL, 35),
('MR-036DOORBAL', 50, 'Doorpans - Balconies', 'Doorpans - Balconies', 'BALCONIES', 'EA', 550, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'DOORBAL', NULL, 36);

-- EXTERIOR SECTION (16 items)
INSERT INTO `master-roofing-intelligence.mr_main.item_master` (item_id, template_row, template_scope_name, display_name, section, uom, default_rate, has_r_value, has_thickness, has_material_type, row_type, short_code, bluebeam_pattern, sort_order) VALUES
('MR-037BRICKWP', 55, 'Brick area - Waterproofing', 'Brick area - Waterproofing', 'EXTERIOR', 'SF', 5.25, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'BRICKWP', 'brick|masonry', 37),
('MR-038OPNBRKEA', 56, 'Openings at brick areas (Count) < 32lf', 'Openings at brick areas (Count) < 32lf', 'EXTERIOR', 'EA', 250, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'OPNBRKEA', NULL, 38),
('MR-039OPNBRKLF', 57, 'Openings at brick areas (LF) > 32lf/40lf', 'Openings at brick areas (LF) > 32lf', 'EXTERIOR', 'LF', 10, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'OPNBRKLF', NULL, 39),
('MR-040PANELWP', 59, 'Panel Area - Waterproofing', 'Panel Area - Waterproofing', 'EXTERIOR', 'SF', 5.25, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'PANELWP', 'panel|metal\\s*panel', 40),
('MR-041OPNPNLEA', 60, 'Openings at panel Areas (Count) < 32lf', 'Openings at panel areas (Count) < 32lf', 'EXTERIOR', 'EA', 250, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'OPNPNLEA', NULL, 41),
('MR-042OPNPNLLF', 61, 'Openings at panel Areas (LF) > 32lf/40lf', 'Openings at panel areas (LF) > 32lf', 'EXTERIOR', 'LF', 10, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'OPNPNLLF', NULL, 42),
('MR-043EIFS', 63, 'Eifs - Scope (R?)', 'EIFS Scope', 'EXTERIOR', 'SF', NULL, TRUE, FALSE, TRUE, 'SYSTEM_ROW', 'EIFS', 'eifs|stucco', 43),
('MR-044OPNSTCEA', 64, 'openings at stucco areas (Count) < 32lf', 'Openings at stucco areas (Count) < 32lf', 'EXTERIOR', 'EA', 250, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'OPNSTCEA', NULL, 44),
('MR-045OPNSTCLF', 65, 'openings at stucco areas (LF) > 32lf/40lf', 'Openings at stucco areas (LF) > 32lf', 'EXTERIOR', 'LF', 10, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'OPNSTCLF', NULL, 45),
('MR-046STUCCO', 66, 'Transistional stucco', 'Transitional stucco', 'EXTERIOR', 'SF', 17, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'STUCCO', NULL, 46),
('MR-047DRIPCAP', 68, 'Drip cap (LF)', 'Drip cap', 'EXTERIOR', 'LF', 33, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'DRIPCAP', 'drip\\s*cap', 47),
('MR-048SILL', 69, 'Sills', 'Sills', 'EXTERIOR', 'LF', 33, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'SILL', 'sill', 48),
('MR-049TIEIN', 70, 'Tie - In (LF)', 'Tie-In', 'EXTERIOR', 'LF', 48, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'TIEIN', 'tie\\s*in|tiein', 49),
('MR-050ADJHORZ', 71, 'adj. building horizontal (Coustom Metal Flashing only)', 'Adj. building horizontal (Custom Metal Flashing)', 'EXTERIOR', 'LF', 65, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'ADJHORZ', NULL, 50),
('MR-051ADJVERT', 72, 'adj. building Vertical (Detail?)', 'Adj. building vertical', 'EXTERIOR', 'LF', NULL, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'ADJVERT', NULL, 51);

-- ORPHAN ITEMS (7 items - no template row)
INSERT INTO `master-roofing-intelligence.mr_main.item_master` (item_id, template_row, template_scope_name, display_name, section, uom, default_rate, has_r_value, has_thickness, has_material_type, row_type, short_code, bluebeam_pattern, sort_order) VALUES
('MR-MISC-DEMO', NULL, NULL, 'Removal/Demolition', 'ROOFING', 'SF', NULL, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'DEMO', NULL, 52),
('MR-MISC-GARAGE', NULL, NULL, 'Garage/Parking Waterproofing', 'ROOFING', 'SF', NULL, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'GARAGE', NULL, 53),
('MR-MISC-METALPNL', NULL, NULL, 'Metal Panels/Window Surrounds', 'EXTERIOR', 'LF', NULL, FALSE, FALSE, TRUE, 'COMPONENT_ROW', 'METALPNL', NULL, 54),
('MR-MISC-OTHER', NULL, NULL, 'Other/Miscellaneous Scope', 'MISC', 'LS', NULL, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'OTHER', NULL, 55),
('MR-MISC-SHOWER', NULL, NULL, 'Shower Waterproofing', 'BALCONIES', 'SF', NULL, FALSE, FALSE, FALSE, 'COMPONENT_ROW', 'SHOWER', NULL, 56),
('MR-MISC-SIDING', NULL, NULL, 'Siding (Vinyl/Metal)', 'EXTERIOR', 'SF', NULL, FALSE, FALSE, TRUE, 'COMPONENT_ROW', 'SIDING', NULL, 57),
('MR-MISC-VAPOR', NULL, NULL, 'Vapor Barrier', 'ROOFING', 'SF', NULL, FALSE, FALSE, TRUE, 'COMPONENT_ROW', 'VAPOR', NULL, 58);
```

### 3. CREATE TABLE: location_master

```sql
CREATE TABLE IF NOT EXISTS `master-roofing-intelligence.mr_main.location_master` (
  location_code STRING NOT NULL,
  location_name STRING NOT NULL,
  section STRING NOT NULL,
  template_column STRING NOT NULL,
  aliases ARRAY<STRING>,
  sort_order INT64,
  is_active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
OPTIONS (description = 'Single source of truth for takeoff location columns');
```

### 4. INSERT STATEMENTS: location_master

```sql
-- ROOFING locations (columns G-M in Row 3)
INSERT INTO `master-roofing-intelligence.mr_main.location_master` (location_code, location_name, section, template_column, aliases, sort_order) VALUES
('FL1', '1st Floor', 'ROOFING', 'G', ['FL-1', 'FLOOR1', '1ST FLOOR', 'FIRST FLOOR', 'GROUND', 'CELLAR', 'BASEMENT'], 1),
('FL2', '2nd Floor', 'ROOFING', 'H', ['FL-2', 'FLOOR2', '2ND FLOOR', 'SECOND FLOOR'], 2),
('FL3', '3rd Floor', 'ROOFING', 'I', ['FL-3', 'FLOOR3', '3RD FLOOR', 'THIRD FLOOR'], 3),
('FL4', '4th Floor', 'ROOFING', 'J', ['FL-4', 'FLOOR4', '4TH FLOOR', 'FOURTH FLOOR'], 4),
('MR', 'Main Roof', 'ROOFING', 'K', ['ROOF', 'MAIN', 'MAIN ROOF'], 5),
('SBH', 'Stair Bulkhead', 'ROOFING', 'L', ['STAIR', 'STAIR BH', 'BULKHEAD'], 6),
('EBH', 'Elev. Bulkhead', 'ROOFING', 'M', ['ELEV', 'ELEVATOR', 'ELEV BH', 'ELEVATOR BULKHEAD'], 7);

-- BALCONIES locations (columns G-M in Row 45)
INSERT INTO `master-roofing-intelligence.mr_main.location_master` (location_code, location_name, section, template_column, aliases, sort_order) VALUES
('BAL1', '1st floor Balconies', 'BALCONIES', 'G', ['BAL-1', 'BALCONY1'], 8),
('BAL2', '2nd floor Balconies', 'BALCONIES', 'H', ['BAL-2', 'BALCONY2'], 9),
('BAL3', '3rd floor Balconies', 'BALCONIES', 'I', ['BAL-3', 'BALCONY3'], 10),
('BAL4', '4th floor Balconies', 'BALCONIES', 'J', ['BAL-4', 'BALCONY4'], 11),
('BAL5', '5th floor Balconies', 'BALCONIES', 'K', ['BAL-5', 'BALCONY5'], 12),
('BAL6', '6th floor Balconies', 'BALCONIES', 'L', ['BAL-6', 'BALCONY6'], 13),
('BAL7', '7th floor Balconies', 'BALCONIES', 'M', ['BAL-7', 'BALCONY7'], 14);

-- EXTERIOR locations (columns G-M in Row 54)
INSERT INTO `master-roofing-intelligence.mr_main.location_master` (location_code, location_name, section, template_column, aliases, sort_order) VALUES
('FRONT', 'Front Elevation', 'EXTERIOR', 'G', ['FRONT ELEV', 'NORTH'], 15),
('REAR', 'Rear Elevation', 'EXTERIOR', 'H', ['REAR ELEV', 'SOUTH', 'BACK'], 16),
('RIGHT', 'Right Elevation', 'EXTERIOR', 'I', ['RIGHT ELEV', 'EAST'], 17),
('LEFT', 'Left Elevation', 'EXTERIOR', 'J', ['LEFT ELEV', 'WEST'], 18),
('BH', 'Bulkhead', 'EXTERIOR', 'K', ['BULKHEAD'], 19),
('OVER', 'Overhang', 'EXTERIOR', 'L', ['OVERHANG'], 20),
('INSIDE', 'Inside Parapet', 'EXTERIOR', 'M', ['INSIDE PARAPET', 'INTERIOR'], 21);
```

### Short Code Ambiguity Check

| item_id | Generated short_code | Status |
|---------|---------------------|--------|
| MR-007PMMA | PMMA | ⚠️ Shared with MR-008PMMA |
| MR-008PMMA | PMMA-PAR | ✅ Manually disambiguated |

All other short codes are unique.

---

## Key Files Reference
- `lib/google-sheets.js` — populateTakeoffSheet(), fillBluebeamDataToSpreadsheet()
- `app/api/ko/takeoff/create/route.js` — sheet creation
- `app/api/ko/takeoff/[projectId]/bluebeam/route.js` — CSV import
- Template: `1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4`

---

## SESSION 20 — Sheet-First Branch

**Date:** 2026-02-02
**Branch:** `sheet-first`
**Decision:** Eliminating wizard, going sheet-first

---

### TASK 1: Populate Template Column A ✅ COMPLETE

**Script:** `scripts/populate-template-item-ids.js`

**Executed:** 53 cells updated successfully

| Section | Rows | Cells Updated |
|---------|------|---------------|
| ROOFING | 4-43 | 32 item_ids |
| BALCONIES | 45-50 | 4 item_ids + 1 header |
| EXTERIOR | 54-72 | 15 item_ids + 1 header |
| **TOTAL** | | **53 cells** |

**Headers Added:**
- A45: `item_id` (Balconies section header)
- A54: `item_id` (Exterior section header)

**Verification:** All 53 target cells confirmed populated, 0 empty, 0 mismatched.

**Template URL:** https://docs.google.com/spreadsheets/d/1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4/edit

---

### Next Steps (Sheet-First Implementation)

1. ✅ Populate template Column A with item_ids
2. ⏳ Create "Generate BTX" button in Estimating Center UI
3. ⏳ Create sheet-reading endpoint to extract config from sheet
4. ⏳ Test CSV import flow (should now work with populated item_ids)
5. ⏳ Remove wizard code after sheet-first approach is proven
