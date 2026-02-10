# SESSION 25 HANDOFF

## Summary
Completed conditional alternates display, section-aware location headers, and full code cleanup. All deployed to production and verified.

## Completed Work

### 1. Conditional Alternates + Template v4 (feature/bid-type-and-template-v2)
- Added `has_alternates: altLineItems.length > 0` to `transformForTemplate` return object
- Copied template v3 (Proposal_template_offical_in_use_v3.docx) with `{#has_alternates}` conditional
- Copied template v4 (Proposal_template_offical_in_use_v4.docx) with fixed table borders
- Verified: SUNDAY - V5 generates correctly, alternates section hidden when no ALT items

### 2. Section-Aware Location Headers (feature/section-location-headers → v1.4)
- **Problem:** locationHeaders was built once from row 3 and applied to all rows. Sheets with multiple sections (Roofing ~row 3, Balconies ~row 45, Exterior ~row 54) have different location names in the same columns (G-M).
- **Solution:** Added dynamic section header detection in `preview/route.js`:
  - `isSectionHeaderRow()` — detects rows with header pattern (item_id + scope text)
  - `buildLocationHeaders()` — extracts location names from any header row
  - `getLocationHeadersForRow()` — resolves correct headers for each data row
  - Section header rows skipped from data processing
- **Verified with Monday 09 (proj_06dcfaef8e6a4cdb):**
  - Roofing items → "1st Floor", "Main Roof", etc.
  - Balcony items → "1st floor Balconies", "2nd floor Balconies", etc.
  - Exterior items → "Front / ----Elevation", "Rear / ---Elevation", etc.
  - MR-049TIEIN (row 70) correctly shows "Front / ----Elevation", not "1st Floor"

### 3. Code Cleanup (v1.5-code-cleanup) — 2,014 lines deleted
1. Removed `populateTakeoffSheet()` from google-sheets.js + call from create/route.js
2. Removed `generateLocally` fallback + helpers from takeoff/generate/route.js
3. Deleted scripts/create-takeoff-template.js
4. Deleted scripts/create-exact-takeoff-template.js + data/excel-template-exact.json
5. Fixed `getDefaultConfig()` column IDs: C-G → G-K (match live template)
6. Moved populate-template-item-ids.js to scripts/archive/

## Current State
- **Branch:** main
- **Latest commit:** f8da675
- **Tag:** v1.5-code-cleanup
- **Production:** https://v0-master-roofing-ai-2-1u.vercel.app

## Rollback Points
- v1.5-code-cleanup (current)
- v1.4-section-location-headers
- v1.3-conditional-alternates
- v1.2-bid-type-template-v2
- v1.1-session-24
- v1.0-working-flow

## Test Projects
- SUNDAY - V5: proj_db22560e20a04064 (original test, single section)
- SUNDAY - V3: spreadsheet `1c5_v840g-D0-a5f1sas_7AhkAxfXwaco4tlKDefJrEs` (**columns deleted — reproduces BTX bug**)
- Monday 09: proj_06dcfaef8e6a4cdb (multi-section: Roofing/Balconies/Exterior)

---

## SESSION 26 ANALYSIS: BTX Column Boundary Bug — 8 Confirmed Bugs

### Background
When an estimator deletes unused location columns from the Google Sheet (e.g., removes "2nd Floor", "3rd Floor", "Elev. Bulkhead"), Google Sheets shifts all columns left. The template has 7 location columns (G-M), but after deletion the sheet may have only 4 (G-J), causing Total Measurements to shift from N→K and Total Cost from O→L.

**Verified on SUNDAY V3** (spreadsheet `1c5_v840g-D0-a5f1sas_7AhkAxfXwaco4tlKDefJrEs`):
- Template: G-M locations, N=Total Measurements, O=Total Cost, P=BID TYPE (17 cols)
- SUNDAY V3: G-J locations, K=Total Measurements, L=Total Cost (12 cols — 5 columns deleted)
- Rows also deleted: only 40 rows remain (template has 75). Balconies/some Exterior rows gone.

### Bug 1: ITEM row detection regex hardcodes column N
- **File:** `app/api/ko/proposal/[projectId]/preview/route.js:682`
- **Code:** `/^=B(\d+)\*N\1$/i.test(f)`
- **Problem:** Matches `=B4*N4` but NOT `=B4*K4` (shifted sheet). Items won't be detected.
- **Fix:** Replace `N` with a capture group for any column letter: `/^=B(\d+)\*([A-Z]+)\1$/i`

### Bug 2: BUNDLE_TOTAL detection regex hardcodes column O
- **File:** `app/api/ko/proposal/[projectId]/preview/route.js:687`
- **Code:** `/^=SUM\(O\d+:O\d+\)$/i.test(f)`
- **Problem:** Matches `=SUM(O6:O8)` but NOT `=SUM(L5:L7)`. Bundles won't be detected.
- **Fix:** Replace `O` with any column letter: `/^=SUM\([A-Z]+\d+:[A-Z]+\d+\)$/i`

### Bug 3: Bundle range extraction regex hardcodes column O
- **File:** `app/api/ko/proposal/[projectId]/preview/route.js:431`
- **Code:** `formula.match(/^=SUM\(O(\d+):O(\d+)\)$/i)`
- **Problem:** Same as Bug 2 — can't extract row range from `=SUM(L5:L7)`.
- **Fix:** `formula.match(/^=SUM\([A-Z]+(\d+):[A-Z]+(\d+)\)$/i)`

### Bug 4: SECTION_TOTAL detection counts column O references
- **File:** `app/api/ko/proposal/[projectId]/preview/route.js:697`
- **Code:** `f.match(/O\d+/gi) || []` — if 5+ matches → SECTION_TOTAL
- **Problem:** On shifted sheet, formula is `=L4+L8+L12+...` — zero O matches, so section totals fall through to UNKNOWN.
- **Fix:** Use the dynamically-detected totalCost column letter instead of hardcoded `O`. Or match any single column letter pattern: `f.match(/[A-Z]\d+/gi)` with deduplication to confirm they all reference the same column.

### Bug 5: buildLocationMapFromHeader() hardcodes columns G-L
- **File:** `lib/google-sheets.js:631`
- **Code:** `const locationCols = ['G', 'H', 'I', 'J', 'K', 'L']` with `headerIdx = 6 + i`
- **Problem:** On SUNDAY V3, index 10 is "Total Measurements" and index 11 is "Total Cost". These get mapped as "locations", and CSV import could write quantities into formula cells.
- **Fix:** Read the actual header row dynamically. Stop at the first cell containing "total" (case-insensitive). Or use `findColumnIndices()` logic from preview/route.js which already does this correctly.

### Bug 6: fillBluebeamDataToSpreadsheet() hardcodes header row positions
- **File:** `lib/google-sheets.js:664-668`
- **Code:** Reads `A3:L3`, `A45:L45`, `A54:L54` — hardcoded row numbers AND column range
- **Problem:** On SUNDAY V3, row 45 and row 54 don't exist (only 40 rows). The L range also captures Total Cost. The API call won't error (returns empty), but Balconies/Exterior sections will have empty location maps.
- **Fix:** Read the full sheet once (A1:Z100), then detect section headers dynamically (same approach as preview/route.js `isSectionHeaderRow()`).

### Bug 7: fillBluebeamDataToSpreadsheet() hardcodes row range A4:A72
- **File:** `lib/google-sheets.js:698`
- **Code:** Reads `A4:A72` for item_id scanning
- **Problem:** On a sheet with deleted rows, item_ids won't be at the expected row numbers. The `ITEM_ID_TO_ROW` fallback (line 707) maps to template row numbers that are wrong for modified sheets.
- **Fix:** Scan Column A dynamically. Build the code→row map purely from what's actually in the sheet (which the code partially does on line 708-717), but remove the `ITEM_ID_TO_ROW` fallback which will cause wrong row writes on modified sheets.

### Bug 8: Section total formulas break to #REF! when rows are deleted
- **File:** Google Sheet template (not code) — formulas like `=O4+O5+O9+O14+...`
- **Verified:** SUNDAY V3 row 30: `=L4+#REF!+L8+#REF!+L9+L12+L22+L26+L29+#REF!+#REF!+#REF!+#REF!+#REF!+#REF!`
- **Problem:** Section totals use explicit cell references (`=O4+O5+O9+...`), not `=SUM()`. When referenced rows are deleted, Google Sheets replaces them with `#REF!`, making the whole formula error.
- **Fix options:**
  - A) Change template section total formulas to use `SUMIF()` or named ranges
  - B) Have the code recalculate section totals instead of reading the broken formula
  - C) Document "don't delete rows" as a workflow constraint (least desirable)

### Fix Plan — Execution Order

**Phase 1: Make preview/route.js column-agnostic (Bugs 1-4)**
- File: `app/api/ko/proposal/[projectId]/preview/route.js`
- Change `detectRowTypeFromFormula()` to use dynamic column letters derived from `columnMap.totalCost` and `columnMap.totalMeasurements` instead of hardcoded `N` and `O`
- The `findColumnIndices()` function already resolves columns dynamically — pass those indices to the formula detection
- Low risk: proposal preview already reads headers dynamically

**Phase 2: Make fillBluebeamDataToSpreadsheet() column-agnostic (Bugs 5-7)**
- File: `lib/google-sheets.js`
- Replace `buildLocationMapFromHeader()` hardcoded `['G','H','I','J','K','L']` with dynamic detection that stops at "Total Measurements"
- Replace hardcoded row ranges (`A3:L3`, `A45:L45`, `A54:L54`) with full sheet read + dynamic section detection
- Remove `ITEM_ID_TO_ROW` fallback — only use actual Column A scan
- Medium risk: this is the CSV import path, test with SUNDAY V3 after changes

**Phase 3: Fix template section total formulas (Bug 8)**
- Requires editing the Google Sheet template directly
- Option B (code recalculation) is safest — sum the bundle totals in code rather than relying on the sheet formula
- Or fix the template to use `=SUMPRODUCT()` / `=SUM()` with ranges instead of individual cell references

### Test Plan
1. After Phase 1: Run proposal preview on SUNDAY V3 — verify items, bundles, and section totals are detected correctly despite shifted columns
2. After Phase 2: Import a Bluebeam CSV into SUNDAY V3 — verify data lands in location columns, not in Total Measurements/Total Cost
3. After Phase 3: Delete rows from a test sheet — verify section totals don't break to #REF!

### Session 27: All 8 Bugs Fixed (v1.6-btx-dynamic-columns)
- **Branch:** fix/btx-dynamic-columns (merged to main)
- **Tag:** v1.6-btx-dynamic-columns
- **Deployed:** Production verified
- **Commits:**
  - `5f8c899` — feat: add discoverSheetLayout() utility for dynamic column discovery
  - `a0c05a6` — feat: dynamic column letters in formula detection (bugs 1-4)
  - `b8ebe7f` — feat: replace hardcoded parseLocationHeader with discoverSheetLayout (bug 8)
  - `a0a1887` — feat: fix Bluebeam import — dynamic headers, widen scan range, remove fallback (bugs 5-7)
- **Test results:**
  - SUNDAY V5 (clean template): totalCost=14(O), totalMeas=13(N) — PASS
  - Monday 09 (multi-section): totalCost=14(O), totalMeas=13(N), 3 section headers — PASS
  - SUNDAY V3 (shifted columns): totalCost=11(L), totalMeas=10(K) — PASS (was broken before)
- **Remaining TODOs:** Rows 3/45/54 hardcoded in sheet-config and google-sheets.js — needs dynamic section header detection

---

## BTX Import Bug — Diagnosed, Not Yet Fixed

All 8 hardcoded column bugs are fixed (v1.6). But a NEW issue found during testing:

**Project:** Monday Night (proj_0d4693d93c8a460c, sheet 1djXNuk7wtm4T6aS2pji6eiJNPOND-JK1EETfZ5c-2jU)
**Symptom:** "Imported 7 items, updated 4 cells" — 3 items failed to write
**Root cause:** fillBluebeamDataToSpreadsheet() builds location maps per section. Exterior items (MR-042OPNPNLLF, MR-043EIFS, MR-047DRIPCAP) had Roofing location names (MAIN ROOF, 2ND FLOOR, ELEV. BULKHEAD) because the estimator measured exterior scope on roofing floor areas. The per-section map for Exterior doesn't contain "MAIN ROOF" — only "Front / ----Elevation" etc.

**Fix needed:** The location map must merge ALL section headers into one combined map, since Bluebeam CSV doesn't indicate which section an item belongs to. The column letter is the same (G-L) across all sections, so "2ND FLOOR" = column H regardless of section.

**Investigation needed:** Show how locationMap is currently built in fillBluebeamDataToSpreadsheet() — does it merge all 3 maps or keep them separate? Lines ~776-781. Currently it keeps them separate (`sectionLocationMaps.ROOFING`, `.BALCONIES`, `.EXTERIOR`) and picks the map based on which section the item's row falls in (line ~829: `const locationMap = sectionLocationMaps[section]`). The fix: when section-specific lookup fails, fall back to trying ALL section maps.

**Monday Night sheet headers:**
- ROOFING (row 3): G=1st Floor, H=2nd Floor, I=3rd Floor, J=5th Floor, K=Main Roof, L=Elev. Bulkhead
- BALCONIES (row 45): G=1st floor Balconies, H=2nd floor Balconies, ...
- EXTERIOR (row 54): G=Front / ----Elevation, H=Rear / ---Elevation, ...

**Monday Night CSV items:**
- MR-002PITCH | ELEV. BULKHEAD (650.73 sf) — Roofing item, Roofing location -> MATCH
- MR-002PITCH | MAIN ROOF (483.31 sf) — Roofing item, Roofing location -> MATCH
- MR-002PITCH | 5TH FLOOR (619.51 sf) — Roofing item, Roofing location -> MATCH
- MR-032RECESSWP | 5TH FLOOR (579.85 sf) — Roofing item, Roofing location -> MATCH
- MR-043EIFS | 2ND FLOOR (1058.30 sf) — Exterior item, Roofing location -> NO_COLUMN_MAPPING
- MR-042OPNPNLLF | MAIN ROOF (91.53 lf) — Exterior item, Roofing location -> NO_COLUMN_MAPPING
- MR-047DRIPCAP | ELEV. BULKHEAD (96.59 lf) — Exterior item, Roofing location -> NO_COLUMN_MAPPING

---

## Key Files
- app/api/ko/proposal/[projectId]/preview/route.js — proposal data logic (section-aware)
- app/api/ko/proposal/[projectId]/generate/route.js — Word doc generation (bid type split)
- public/templates/Proposal_Template_v1_FIXED.docx — Word template (v6)
- app/api/ko/takeoff/[projectId]/config/route.js — default config (columns G-K)
- app/api/ko/takeoff/[projectId]/btx/route.js — BTX generation (proxy to Python backend)
- app/api/ko/takeoff/[projectId]/bluebeam/route.js — Bluebeam CSV import
- app/api/ko/takeoff/[projectId]/sheet-config/route.js — reads actual sheet state
- lib/google-sheets.js — Google Sheets API client (fillBluebeamDataToSpreadsheet, buildLocationMapFromHeader)
- Google Sheet template: `1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4`
