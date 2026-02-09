# SESSION 24 HANDOFF

## Completed
- PR #1 merged: 7 bug fixes for proposal preview + generate
- Tag: v1.1-session-24 (commit 13c8bd0)
- Production deployed and verified via frontend + API
- Test project: SUNDAY - V5 (proj_db22560e20a04064)

## Fixes Shipped
1. locationStart skips R/IN/TYPE columns
2. Bundle membership by SUM formula range, not row proximity
3. $0 bundles excluded
4. Header row artifacts (item_id = "item_id") skipped
5. Standalone items detected and displayed
6. Standalone areas show location names
7. Project summary includes all scopes

## Open Items (Priority Order)
1. **BTX column boundary bug** — When estimator deletes location columns, Total Measurements and Total Cost columns become Bluebeam tools. Fix needed in BTX generation code. SENSITIVE FILE — study before editing.
2. **Sheet formula brittleness** — TOTAL COST FOR ALL rows break to #REF! when rows are deleted. Takeoff sheet setup creates hardcoded row references instead of dynamic ranges.
3. **Template changes** — Isaac's modified proposal template. Foundation is now clean for this work.
4. **Section Total $0.00** — Displays in frontend because sheet formula is broken (#REF!). Related to item 2.

## Rollback Points
- v1.1-session-24 — current (post-fixes)
- v1.0-working-flow — previous (pre-fixes)

## Test Data
- SUNDAY - V5: proj_db22560e20a04064 (controlled test, clean data)
- SUNDAY - V3: proj_f12f1f5231244fe8 (BTX column bug reproduction)
- Thursday: proj_4222d7446fbc40c5 (original test data, has old bugs)

## Key Files
- app/api/ko/proposal/[projectId]/preview/route.js — proposal data logic
- app/api/ko/proposal/[projectId]/generate/route.js — Word doc generation
- BTX generation file — location TBD, must study before editing

## Code Cleanup Required

These are dead code and outdated references discovered during the takeoff sheet creation audit. None of these are blocking current work, but they must be cleaned up to prevent confusion.

### 1. populateTakeoffSheet() — DEAD CODE
- **File:** lib/google-sheets.js (line 805-853)
- **Problem:** Writes to "Sheet1" tab with locations starting at Col C. Live template uses tab named DATE with locations at Col G+. This function is called in takeoff/create/route.js:92 but effectively does nothing after the template copy.
- **Action:** Remove the call from takeoff/create/route.js and deprecate or delete the function.

### 2. generate/route.js local fallback — WRONG LAYOUT
- **File:** app/api/ko/takeoff/[projectId]/generate/route.js (lines 197-236)
- **Problem:** Local fallback generates Rate=A, Scope=B, Locations=C+ which doesn't match the live 16-column template (item_id=A, Unit Cost=B, Scope=C, R=D, IN=E, TYPE=F, Locations=G+). If Python backend is down, generated data would be laid out incorrectly.
- **Action:** Either fix to match live layout or remove the fallback entirely.

### 3. create-takeoff-template.js — OUTDATED SCRIPT
- **File:** scripts/create-takeoff-template.js
- **Problem:** Defines 13 columns (A-M) with Unit Cost at A. Live template has 15-16 columns with item_id at A. Script does not create R, IN, TYPE columns.
- **Action:** Either update to match reality or delete. The live Google Sheet template (1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4) is the source of truth.

### 4. create-exact-takeoff-template.js + excel-template-exact.json — OUTDATED
- **File:** scripts/create-exact-takeoff-template.js, data/excel-template-exact.json
- **Problem:** JSON defines 12 columns (A-L) with Unit Cost at A. Does not include item_id, R, IN, TYPE columns.
- **Action:** Same as #3 — update or delete.

### 5. getDefaultConfig() — WRONG COLUMN IDs
- **File:** app/api/ko/takeoff/[projectId]/config/route.js (lines 297-310)
- **Problem:** Default columns start at C (Main Roof=C, 1st Floor=D). Live template has locations starting at G. If this default is ever used, BTX tools would map to wrong columns.
- **Action:** Update default column IDs to match live template layout (locations at G+).

### 6. populate-template-item-ids.js — ONE-TIME SCRIPT
- **File:** scripts/populate-template-item-ids.js
- **Problem:** Not broken, but this was a one-time migration script that wrote item_ids to the template. Should be archived, not in active scripts.
- **Action:** Move to scripts/archive/ or add a header comment marking it as one-time use.

## Next: Bid Type + Template V2

### Google Sheet Template Updated ✅
BID TYPE column added to template `1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4` (column P, after Total Cost).

**Current template layout (row 3):**
A=item_id, B=Unit Cost, C=Scope, D=R, E=IN, F=TYPE, G-M=Locations, N=Total Measurements, O=Total Cost, **P=BID TYPE**, Q=Comments

**BID TYPE dropdown rules (BASE / ALT):**
- **Bundle total rows** (11 rows: 9, 14, 18, 28, 32, 35, 39, 42, 58, 62, 67) — have dropdown, default "BASE"
- **Standalone item rows** (14 rows: 4, 5, 15, 36, 43, 46, 47, 48, 50, 68, 69, 70, 71, 72) — have dropdown, default "BASE"
- **Bundled item rows** (37 rows) — no dropdown, inherit bid type from their bundle total row

Script used: `scripts/fix-bid-type-column.js`

### Next Step: Code Changes
Apply code changes on `feature/bid-type-and-template-v2` branch.

**Files to change:**
- `app/api/ko/proposal/[projectId]/preview/route.js` — read BID TYPE from column P, include in structured data
- `app/api/ko/proposal/[projectId]/generate/route.js` — use bid type to split base bid vs alternates in Word doc
- `public/templates/Proposal_Template_v1_FIXED.docx` — add alternates section to Word template
