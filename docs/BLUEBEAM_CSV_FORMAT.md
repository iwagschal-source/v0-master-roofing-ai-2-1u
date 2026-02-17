# BLUEBEAM CSV EXPORT FORMAT — PERMANENT REFERENCE

> **Created:** Session 49 (2026-02-17)
> **Purpose:** Definitive documentation of Bluebeam CSV structure for the KO import pipeline.
> **This document is the single source of truth.** If there's a question about CSV parsing, the answer is here.

---

## 1. CSV Structure

### Columns (44 total)

Bluebeam Studio exports CSVs with these columns in fixed order:

| Index | Column Name | Data Type | Used By Parser? |
|-------|-------------|-----------|----------------|
| 0 | ID | String (16-char alphanumeric) | **YES** — empty = group row (skip), populated = detail row (process) |
| 1 | Parent | String | No |
| 2 | Subject | String | **YES** — contains `MR-xxx \| LOCATION` for detail rows |
| 3 | Page Label | Integer | No |
| 4 | Comments | String | No — contains human-readable measurement summary |
| 5 | Page Index | Integer | No |
| 6 | Lock | String ("Unlocked"/"Locked") | No |
| 7 | Checkmark | String ("Unchecked"/"Checked") | No |
| 8 | Author | String | No |
| 9 | Date | Timestamp | No |
| 10 | Creation Date | Timestamp | No |
| 11-14 | X, Y, Document Width, Document Height | Decimal (inches) | No |
| 15 | Length | Decimal | No — use Measurement instead |
| 16 | Length Unit | String | No |
| 17 | Area | Decimal | No — use Measurement instead |
| 18 | Area Unit | String | No |
| 19-22 | Wall Area, Wall Area Unit, Volume, Volume Unit | Various | No |
| 23 | Count | Integer | No — use Measurement instead |
| 24 | **Measurement** | String (number + unit) | **YES** — unified quantity column |
| 25 | **Measurement Unit** | String (sf/ft/Count) | Informational |
| 26 | Label | String | No |
| 27 | Sequence | String | No |
| 28 | Capture | String ("Yes"/"No") | No |
| 29 | Depth | Decimal | No |
| 30 | Depth Unit | String | No |
| 31 | Status | String | No |
| 32 | Color | String (hex) | No |
| 33 | Layer | String | No |
| 34 | Legend | String | No |
| 35 | Height | Decimal | No |
| 36 | Height Unit | String | No |
| 37 | Width | Decimal | No |
| 38 | Width Unit | String | No |
| 39 | Rise/Drop | Decimal | No |
| 40 | Rise/Drop Unit | String | No |
| 41 | Slope | String | No |
| 42 | Space | String | No |
| 43 | Unit | String | No |
| 44 | 3D View | String | No |

### Key Fields Summary

The parser uses exactly **3 fields**:
1. **ID** (index 0) — distinguishes detail rows from group/summary rows
2. **Subject** (index 2) — contains item code and location separated by ` | `
3. **Measurement** (index 24) — unified quantity value (always correct regardless of measurement type)

---

## 2. Row Types

### Type 1: Header Row
- **Position:** Always row 1 (index 0)
- **Identification:** First row of the CSV
- **Action:** Parse to discover column indices, then skip

### Type 2: Group/Summary Row — Grand Total
- **Identification:** ID column is **EMPTY**, Subject = `AuthorName (N)` where N = count of child rows
- **Contains:** Rolled-up totals across ALL detail rows (Length, Area, Count sums)
- **Action:** **SKIP** — data duplicates child detail rows
- **Example:** `,,IWagschal (10),,,,,,,,,,,,,869.9476,"ft' in""",4288.66,sf,,,,,20,0.00,sf,...`
- **Appears in:** NEW_OLD.csv row 2

### Type 3: Group/Summary Row — Per-Item
- **Identification:** ID column is **EMPTY**, Subject = `timestamp (N)` (e.g., `2/12/2026 7:49:49 PM (1)`)
- **Contains:** Same measurement as its single child detail row (1:1 duplication)
- **Action:** **SKIP** — data duplicates the following detail row exactly
- **Example:** `,,2/12/2026 7:49:49 PM (1),,,,,,,,,,,,,125.9899,"ft' in""",904.80,sf,,,,,,904.80,sf,...`
- **Appears in:** TEST0212.csv rows 2, 4, 6, 8, 10, 12

### Type 4: Detail Row
- **Identification:** ID column is **POPULATED** (16-character alphanumeric string)
- **Contains:** Actual measurement data for one markup at one location
- **Subject format:** `MR-XXXYYY | LOCATION_NAME`
- **Action:** **PROCESS** — this is the real data
- **Example:** `ZMJVPFZLMXOXJTOR,,MR-003BU2PLY | 1ST FLOOR,1,"1,096.66 sf",1,...`
- **Appears in:** Both files

### Universal Rule

```
IF row.ID is empty → SKIP (group/summary row)
IF row.ID is populated → PROCESS (detail row)
```

This single check catches ALL group row variants regardless of Subject format.

---

## 3. Parsing Rules

### Step 1: Parse CSV
- Hand-rolled parser handles quoted fields (commas inside quotes, quoted strings)
- No external library required
- Header row parsed to discover column indices by name matching

### Step 2: Column Discovery
```
subjectIdx = header matching: "subject", "layer", or "label"
measurementIdx = header matching: exact "measurement" first, then "area", "length", or "count"
```
Priority: exact `"measurement"` match preferred because it always contains the correct value.

### Step 3: Row Filtering (in order)
1. **Skip header** (row index 0)
2. **Skip group rows** — ID field is empty
3. **Skip non-pipe subjects** — Subject does not contain ` | ` (space-pipe-space)
4. **Skip zero quantities** — parsed Measurement value is 0
5. **Skip unknown items** — item code not in Setup config's `validItemCodes`

### Step 4: Extract Data
```
Subject.split(' | ') → [itemCode, location]
Measurement.replace(/[^0-9.]/g, '') → quantity (float)
location.replace(/\s*\(\d+\)$/, '') → cleanLocation (strip Bluebeam instance suffix)
```

### Step 5: Location Mapping
- `cleanLocation` is uppercased and looked up in `locationMap`
- Map is built dynamically from sheet header row
- Both raw (`"1ST FLOOR"`) and normalized (`"1STFLOOR"`) variants are tried
- If no match → `NO_COLUMN_MAPPING` status

### Step 6: Setup Config Filter
- Item must be active in Setup tab (`validTargets` map)
- Item's location toggle must be active for the specific column
- Items failing these checks get `ITEM_NOT_ACTIVE` or `LOCATION_NOT_ACTIVE` status

### Step 7: Deduplication
- After all items are mapped to cell ranges, duplicate ranges are merged
- Quantities are **summed** (not overwritten) for same item+location
- This handles Bluebeam instance suffixes: `5THFLOOR` + `5THFLOOR (1)` → same cell, quantities added

---

## 4. Quantity Extraction

### The Measurement Column is Canonical

Bluebeam populates measurement data in **multiple columns** depending on tool type:

| Tool Type | Area Column | Length Column | Count Column | Measurement Column |
|-----------|-------------|--------------|--------------|-------------------|
| Area (polygon/polyline) | 1096.66 | 159.5507 | 0 | **1096.66 sf** |
| Length (line/polyline) | 0 | 53.5170 | 0 | **53.5170 ft** |
| Count (point) | 0.00 | 0 | 4 | **4 Count** |

The **Measurement** column always contains the intended quantity regardless of tool type. The parser extracts the numeric value by stripping all non-numeric characters: `"1,096.66 sf"` → `1096.66`.

### Unit Detection
The **Measurement Unit** column (index 25) indicates the measurement type:
- `sf` = square feet (area)
- `ft` = linear feet (length)
- `Count` = count

Currently the parser does NOT use this for unit-aware processing — it just extracts the raw number.

---

## 5. Location Mapping

### From CSV to Sheet Column

```
CSV Subject: "MR-003BU2PLY | 1ST FLOOR"
                                ↓
Split on ' | '        → location = "1ST FLOOR"
                                ↓
Uppercase              → "1ST FLOOR"
                                ↓
Lookup in locationMap  → { "1ST FLOOR": "G", "1STFLOOR": "G" }
                                ↓
Result                 → Column G
```

### Location Map Construction
The map is built at runtime by `buildLocationMapFromHeader()`:
1. Read the sheet's section header row (e.g., row 3 for ROOFING)
2. Identify location columns: between last metadata column and "total measurements" column
3. For each non-empty header cell:
   - Raw uppercased value → column letter
   - Normalized (alphanumeric only) value → same column letter

### Suffix Stripping
Bluebeam appends instance numbers when markup layers are duplicated:
- `5THFLOOR (1)`, `MAIN ROOF (2)`, etc.
- The regex `\s*\(\d+\)$` strips these before lookup
- This ensures `5THFLOOR (1)` maps to the same column as `5THFLOOR`

---

## 6. Edge Cases

### Group Rows Present (TEST0212 pattern)
- Every detail row is preceded by a group row with identical measurement
- Group rows have empty ID → automatically skipped
- **No double-counting risk** as long as empty-ID filter is applied

### No Group Rows (NEW_OLD pattern)
- Only a single grand total row (row 2) with empty ID
- All other rows are details
- Works identically — empty-ID filter skips the grand total

### Same Item in Multiple Locations
```
Row 3: MR-003BU2PLY | 1ST FLOOR → 1096.66 sf → Column G
Row 9: MR-003BU2PLY | MAIN ROOF → 1603.16 sf → Column H
```
- Different locations map to different columns → no conflict

### Same Item, Same Location (True Duplicate Measurement)
- If two detail rows have the same item code AND same location
- Dedup logic sums their quantities (not overwrites)
- This is correct: represents two separate measurements for the same scope

### No Pipe in Subject
- Row skipped by deterministic parser
- Falls through to legacy parser (pattern matching)
- Group rows never have pipes, so this also filters them

### Quantity is Zero
- Row skipped: `if (quantity === 0) continue`
- Prevents empty measurement rows from creating zero-value entries

### Bluebeam Instance Suffixes
- `MR-003BU2PLY | 5THFLOOR (1)` → location cleaned to `5THFLOOR`
- Maps to same column as `5THFLOOR`
- Dedup logic sums quantities if both appear

---

## 7. Annotated Examples

### Example 1: NEW_OLD.csv (2 locations, 10 detail rows)

```
Row 1: HEADER
Row 2: [SKIP - Group] ID=empty, Subject="IWagschal (10)" → grand total, 10 children
Row 3: [PROCESS] ID=ZMJVP..., MR-003BU2PLY | 1ST FLOOR, Qty=1096.66 sf
Row 4: [PROCESS] ID=DYDSN..., MR-021AC | 1ST FLOOR, Qty=4 Count
Row 5: [PROCESS] ID=OSNOR..., MR-004UO | 1ST FLOOR, Qty=53.5170 ft
Row 6: [PROCESS] ID=SDRWD..., MR-002PITCH | 1ST FLOOR, Qty=1588.83 sf
Row 7: [PROCESS] ID=ITIQL..., MR-010DRAIN | 1ST FLOOR, Qty=2 Count
Row 8: [PROCESS] ID=VCLNQ..., MR-049TIEIN | 1ST FLOOR, Qty=88.8747 ft
Row 9: [PROCESS] ID=WEMNA..., MR-003BU2PLY | MAIN ROOF, Qty=1603.16 sf
Row 10: [PROCESS] ID=HBTWC..., MR-018PLUMB | MAIN ROOF, Qty=9 Count
Row 11: [PROCESS] ID=OXAUG..., MR-010DRAIN | MAIN ROOF, Qty=5 Count
Row 12: [PROCESS] ID=XZOUN..., MR-047DRIPCAP | MAIN ROOF, Qty=163.1052 ft
```

Result: 10 items processed, 0 groups leaked through.

### Example 2: TEST0212.csv (3 locations, 6 detail rows, 6 group rows)

```
Row 1:  HEADER
Row 2:  [SKIP - Group] ID=empty, Subject="2/12/2026 7:49:49 PM (1)", Qty=904.80 sf
Row 3:  [PROCESS] ID=MYNKP..., MR-027OBIRMA | OVERHANG, Qty=904.80 sf
Row 4:  [SKIP - Group] ID=empty, Subject="2/12/2026 7:49:56 PM (1)", Qty=422.67 sf
Row 5:  [PROCESS] ID=SIYKH..., MR-008PMMA | BULKHEAD, Qty=422.67 sf
Row 6:  [SKIP - Group] ID=empty, Subject="2/12/2026 7:49:59 PM (1)", Qty=510.30 sf
Row 7:  [PROCESS] ID=SQJII..., MR-037BRICKWP | MAIN, Qty=510.30 sf
Row 8:  [SKIP - Group] ID=empty, Subject="2/12/2026 7:50:04 PM (1)", Qty=591.74 sf
Row 9:  [PROCESS] ID=UGYEA..., MR-043EIFS | OVERHANG, Qty=591.74 sf
Row 10: [SKIP - Group] ID=empty, Subject="2/12/2026 7:50:07 PM (1)", Qty=1 Count
Row 11: [PROCESS] ID=ZUCFM..., MR-018PLUMB | MAIN, Qty=1 Count
Row 12: [SKIP - Group] ID=empty, Subject="2/12/2026 7:50:14 PM (1)", Qty=1799.44 sf
Row 13: [PROCESS] ID=TXDUE..., MR-046STUCCO | MAIN, Qty=1799.44 sf
```

Result: 6 items processed, 6 groups skipped. No double-counting.

---

## 8. Parser File Locations

| File | Function | Purpose |
|------|----------|---------|
| `app/api/ko/takeoff/[projectId]/bluebeam/route.js` | `parseDeterministicCSV()` | Primary parser — pipe-delimited Subject |
| `app/api/ko/takeoff/[projectId]/bluebeam/route.js` | `parseBluebeamCSV()` | Legacy parser — pattern matching fallback |
| `app/api/ko/takeoff/[projectId]/bluebeam/route.js` | `parseCSVLine()` | CSV line parser (handles quotes) |
| `lib/google-sheets.js` | `fillBluebeamDataToSpreadsheet()` | Maps parsed items → sheet cells, dedup, write |
| `lib/google-sheets.js` | `buildLocationMapFromHeader()` | Dynamic location → column letter mapping |
| `lib/google-sheets.js` | `discoverSheetLayout()` | Discovers sheet column structure |
| `lib/google-sheets.js` | `detectSectionFromItemId()` | Maps item ID → section (ROOFING/BALCONIES/etc.) |
| `lib/version-management.js` | `readSetupConfig()` | Reads Setup tab toggles for filtering |
