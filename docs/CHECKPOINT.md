# KO ESTIMATING CENTER — SESSION CHECKPOINT
# ============================================
# PURPOSE: Operational state for session continuity.
# RULE: Update after EVERY action, decision, or task completion.
# WHO UPDATES: Both Claude.ai and Claude Code sessions.
# READ THIS FIRST in any new session before doing anything.
# This is NOT the architectural doc (SESSION_STATE.md handles that).
# This is WHERE WE ARE RIGHT NOW.
# ============================================

## LAST UPDATE
- **When:** 2026-02-05
- **Updated by:** Claude Code
- **Session type:** Session 23 - Proposal section titles fix

---

## CURRENT BRANCH
- **Branch:** `main`
- **Pushed to remote:** ✅ YES
- **Latest commit:** `c1d6075` — "fix: use main item's scope_name for section titles in proposals"
- **Backup tag:** `working-100-percent-2026-02-03`

---

## SESSION 23 — 2026-02-05 — Proposal Section Titles Fix

### COMPLETED ✅
1. ✅ Verified actual `item_description_mapping` schema via BigQuery
2. ✅ Fixed `fetchDescriptions()` - removed non-existent `bullet_points`, added `scope_name`, `display_name`, `section`, `row_type`
3. ✅ Added `findMainItem()` to identify item with `paragraph_description` in each bundle
4. ✅ Section titles now use main item's `scope_name` instead of "WORK DETAILS FOR 1"
5. ✅ Section descriptions now use main item's `paragraph_description`
6. ✅ Generate endpoint uses `mainItemId` to get specs from correct item

### Key Commits
| Commit | Description |
|--------|-------------|
| `c1d6075` | fix: use main item's scope_name for section titles in proposals |

### Actual item_description_mapping Schema (Verified)
```
item_id, display_name, scope_name, section, uom, default_rate,
has_r_value, has_material_type, row_type, description_status,
paragraph_description, bundling_notes
```
**Note:** `bullet_points` does NOT exist (was in old code)

### Before/After
| Field | Before | After |
|-------|--------|-------|
| title | "WORK DETAILS FOR 1" | "Roofing - Builtup - 2 ply Scope" |
| sectionDescription | null | Full paragraph from BigQuery |
| mainItemId | (none) | "MR-003BU2PLY" |

### Stats
- 58 total items in mapping table
- 23 items have `paragraph_description` (main items)
- 35 items without descriptions (components)

---

## ARCHITECTURAL DECISION (FINAL)
- **Going sheet-first.** Wizard will be eliminated.
- **Do NOT delete wizard code yet** — build new stuff first, prove it works, then remove.
- ~~Column A population unblocks everything — it's the critical path.~~ **DONE**
- ~~CSV import fixes~~ **DONE** — All item types work (length, area, count)

---

## SESSION 22 — 2026-02-03 — Proposal Row Type Auto-Detection

### COMPLETED ✅
1. ✅ CSV Import 100% working (all item types: length, area, count)
2. ✅ Added `detectRowTypeFromFormula()` for auto-detecting row types from Column O formulas
3. ✅ Detection rules: `=B{n}*N{n}`→ITEM, `=SUM()`→BUNDLE_TOTAL, "BUNDLE TOTAL" in scope→backup
4. ✅ Updated `parseRowTypes()` to handle BUNDLE_TOTAL and create sections
5. ✅ Fixed header row detection (row 3, not row 1)
6. ✅ Preview endpoint returns 13 sections correctly
7. ✅ Generate endpoint works (POST required)
8. ✅ Production deployed - version 2026-02-03-v2

### Key Commits
| Commit | Description |
|--------|-------------|
| `50d1b12` | feat: complete proposal row type auto-detection from Column O formulas |
| `c39e159` | debug version (cleaned up) |
| `8adbc46` | fix: detect header row dynamically |
| `572b282` | feat: auto-detect row types from Column O formulas |

### Detection Rules Implemented
| Formula Pattern | Row Type | Confidence |
|-----------------|----------|------------|
| `=B{n}*N{n}` | ITEM | High |
| `=SUM(O{x}:O{y})` | BUNDLE_TOTAL | High |
| Scope contains "BUNDLE TOTAL" | BUNDLE_TOTAL | Backup |
| 5+ O cell references | SECTION_TOTAL | High |
| Has item_id, no formula match | ITEM | Default |

### Test Project
- **Tuesday 2:** `proj_4222d7446fbc40c5`
- **Spreadsheet:** `17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE`
- **Result:** 13 sections detected correctly

### Files Modified
- `app/api/ko/proposal/[projectId]/preview/route.js` — added detectRowTypeFromFormula(), header detection
- `lib/google-sheets.js` — added readSheetFormulas()
- `docs/PROPOSAL_ROW_DETECTION.md` — design doc

### NEXT SESSION TODO
1. **Test generated Word document content** — verify template merge works
2. **Consolidate tables** — Merge `item_description_mapping` into `item_master`
3. **Delete wizard code** — after full validation (~2,079 lines)

### TEST COMMAND FOR NEXT SESSION
```bash
# Test proposal generation:
curl -X POST "https://v0-master-roofing-ai-2-1u.vercel.app/api/ko/proposal/proj_4222d7446fbc40c5/generate" \
  -H "Content-Type: application/json" -d '{}' -o proposal.docx
```

---

## SESSION 22b — 2026-02-03 — Proposal Data Flow Analysis

### COMPLETED ✅
1. ✅ Fixed currency parsing ($519.79 → 519.79) in preview endpoint
2. ✅ Traced full data flow: Sheet → API → BigQuery → Template
3. ✅ Analyzed item_description_mapping table (23/58 have descriptions)
4. ✅ Identified Word template placeholders
5. ✅ Created debug scripts for proposal analysis

### Key Commits
| Commit | Description |
|--------|-------------|
| `1185b51` | chore: add debug scripts for proposal data flow analysis |
| `e4624ce` | fix: parse currency values in proposal preview |

### item_description_mapping Table
| Column | Purpose |
|--------|---------|
| item_id | Links to takeoff (MR-001VB) |
| paragraph_description | Full proposal text (23 items have this) |
| bundling_notes | "When bundled..." instructions |
| description_status | HAS_DESCRIPTION or empty |

### Word Template Placeholders
```
{#line_items}
  {section_title}, {r_value}, {size}, {type}, {areas}, {price}, {description}
{/line_items}
{#alt_line_items} ... {/alt_line_items}  ← Currently always empty
{project_name}, {prepared_for}, {date}, {grand_total_bid}, {project_summary}
```

### Issues Found (NOT YET FIXED)
| Issue | Current Behavior | Fix Needed |
|-------|------------------|------------|
| sectionType = "1" | Strips "BUNDLE TOTAL - " → "1" | Better naming |
| subtotal = $0.00 | Uses sheet formula (sums $0 cells) | Calculate from items |
| descriptions | Falls back to scope name | 35 items need BigQuery entries |
| alt_line_items | Always empty | No ALT column in template |

### Test Data Note
Tuesday 2 project is sparse - only 1 item has measurements ($519.79).
Most rows have $0.00 because no Bluebeam data imported.

### Debug Scripts Added
- `scripts/show-template-data.js` - Shows exact data passed to docxtemplater
- `scripts/trace-bundle-total.js` - Traces bundle total calculation
- `scripts/query-descriptions2.js` - Query item_description_mapping

---

## PREVIOUS ACTIVE TASK (COMPLETE)
- **Task:** CSV import with section-aware location mapping
- **Status:** ✅ COMPLETE
- **Test project:** proj_04ba74eb9f2d409a
- **Test sheet:** 1NO0I-cfshuhz1yUzSsWga5sJZpcwSEINbPeqYdy4O7A

### Test Results (Session 20e) — ALL PASS
| Item | Section | Row | Col | Status |
|------|---------|-----|-----|--------|
| MR-001VB | ROOFING | 4 | G | ✅ |
| MR-010DRAIN | ROOFING | 15 | K | ✅ |
| MR-022COPELO | ROOFING | 29 | H | ✅ |
| MR-033TRAFFIC | **BALCONIES** | 46 | G | ✅ **FIXED** |
| MR-037BRICKWP | **EXTERIOR** | 55 | G | ✅ **FIXED** |

### Fix Applied (Session 20e)
**Problem:** Single location→column mapping for all sections.

**Solution:** Function now reads each section's header row dynamically:
- ROOFING: row 3 → `{1ST FLOOR: G, 2ND FLOOR: H, ..., MAIN ROOF: K, STAIR BULKHEAD: L}`
- BALCONIES: row 45 → `{1ST FLOOR BALCONIES: G, 2ND FLOOR BALCONIES: H, ...}`
- EXTERIOR: row 54 → `{FRONT / ----ELEVATION: G, REAR / ---ELEVATION: H, ...}`

**Commit:** `bdcd567` — "fix: section-aware location mapping in fillBluebeamDataToSpreadsheet"

---

## COMPLETED THIS SESSION
1. ✅ Branch `sheet-first` created off `dev` and pushed to remote
2. ✅ Session 20 Task A complete — deployment verified live and healthy
3. ✅ Session 20 Task B complete — wizard elimination feasibility confirmed (kill ~2,079 lines, replace with ~150)
4. ✅ Architectural decision made — sheet-first, no wizard
5. ✅ Session continuity protocol established (this file)
6. ✅ **Template Column A populated with 53 item_ids:**
   - Script created: `scripts/populate-template-item-ids.js`
   - 32 ROOFING items (rows 4-43): MR-001VB through MR-032RECESSWP
   - 5 BALCONIES items + header (rows 45-50): MR-033TRAFFIC through MR-036DOORBAL
   - 16 EXTERIOR items + header (rows 54-72): MR-037BRICKWP through MR-051ADJVERT
   - All 53 cells verified populated
   - Committed and pushed to `sheet-first` branch
7. ✅ **Fixed section-aware location mapping (Session 20e):**
   - Root cause: `fillBluebeamDataToSpreadsheet()` used single location mapping for all sections
   - Fix: Now reads each section's header row (3, 45, 54) for section-specific location→column mapping
   - Added `TEMPLATE_SECTIONS`, `ITEM_ID_TO_ROW`, `getSectionForRow()`, `buildLocationMapFromHeader()`
   - Returns detailed match info for debugging
   - Committed: `bdcd567`
8. ✅ **Created `/api/ko/takeoff/[projectId]/sheet-config` endpoint (Session 20e):**
   - Reads takeoff config directly from Google Sheet (not wizard/backend config)
   - Returns: selected_items (51 items from Column A), locations (from section headers G-L)
   - Tested: 32 ROOFING + 4 BALCONIES + 15 EXTERIOR items correctly parsed
   - Committed: `d936577`
9. ✅ **Added "Generate BTX" button to Estimating Center UI (Session 20e):**
   - Button appears when project has takeoff sheet (embeddedSheetId exists)
   - Calls sheet-config → transforms to btx format → downloads BTX file
   - Location: `components/ko/estimating-center-screen.jsx`
   - Committed: `b403769`

---

## TASK QUEUE (ORDERED)
1. ~~**Populate Column A** in master template with item_ids~~ ✅ DONE
2. ~~**Test CSV import flow** — validate section mapping fix~~ ✅ DONE (Session 20e)
3. **Execute item_master SQL** in BigQuery (58 rows, 19 columns) — SQL already drafted
4. **Execute location_master SQL** in BigQuery (21 rows, 8 columns) — SQL already drafted
5. ~~**Create sheet-reading endpoint** (`/api/ko/takeoff/{projectId}/sheet-config`)~~ ✅ DONE (Session 20e)
6. ~~**Add "Generate BTX" button** to Estimating Center UI~~ ✅ DONE (Session 20e)
7. **Test end-to-end:** template → BTX generation → CSV import → proposal
8. **Delete wizard code** (~2,079 lines) — ONLY after e2e test passes
9. **Merge `sheet-first` → `dev` → `main`** — ONLY after Isaac approves

---

## KEY CONTEXT FOR NEW SESSIONS

### If you're Claude Code starting fresh:
1. Read this file first
2. Read `docs/SESSION_STATE.md` for full architectural context
3. You're on branch `main`
4. CSV import is working — test with Monday Again project
5. Do NOT delete wizard code until told to
6. Canonical tables: `item_master` (58 rows), `location_master` (21 rows)

### If you're Claude.ai starting fresh:
1. Read this file first
2. Isaac is the CEO, direct communicator, low tolerance for fluff
3. The KO platform is a roofing estimating system
4. We're building sheet-first approach on `sheet-first` branch
5. Check ACTIVE TASK for where we left off

### Critical references:
- Living state doc: `docs/SESSION_STATE.md`
- Canonical dependencies: `docs/CANONICAL_DEPENDENCIES.md`
- Template ID: `1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4`
- BigQuery dataset: `master-roofing-intelligence.mr_main`
- Repo: `~/v0-master-roofing-ai-2-1u`
- Git branch: `main`

---

## SESSION HISTORY (BRIEF)
| # | Date | Type | Summary |
|---|------|------|---------|
| 19 | 2026-02-02 | Claude Code | Full diagnostic audit, SQL drafting, template verification |
| 20 | 2026-02-02 | Claude Code | Deployment verification, wizard elimination analysis |
| 20b | 2026-02-02 | Claude.ai | Architectural decision (sheet-first), branch setup, checkpoint protocol |
| 20c | 2026-02-02 | Claude Code | Populated template Column A with 53 item_ids, verified, committed |
| 20d | 2026-02-02 | Claude.ai | CSV import test — 4/6 cells updated, BALCONIES/EXTERIOR mapping issue found |
| 20e | 2026-02-02 | Claude Code | Fixed section-aware location mapping in fillBluebeamDataToSpreadsheet |
| 21 | 2026-02-03 | Claude Code | CSV import fix: /config→/sheet-config, canonical tables verified, IT WORKS |
| 22 | 2026-02-03 | Claude Code | Proposal row type auto-detection from Column O formulas, 13 sections detected |
| 22b | 2026-02-03 | Claude Code | Proposal data flow analysis, currency fix, debug scripts, issues documented |
