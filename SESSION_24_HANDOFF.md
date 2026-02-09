# SESSION 24 HANDOFF

## Session 24 — Completed Work

### PR #1 — 7 Bug Fixes (v1.1-session-24)
- locationStart skips R/IN/TYPE columns
- Bundle membership by SUM formula range
- $0 bundles excluded
- Header row artifacts skipped
- Standalone items detected separately
- Standalone areas show location names
- Project summary includes all scopes

### PR #2 — BID TYPE + Template V2 (v1.2-bid-type-template-v2)
- BID TYPE column (P) added to Google Sheet template
- Dropdowns on bundle total rows and standalone rows only
- Preview route reads bidType, defaults to BASE when column missing
- Generate route splits into line_items (BASE) and alt_line_items (ALT)
- Separate totals: base_bid_total, add_alt_total, grand_total_bid
- Template swapped to 2-column layout (scope + price)

### PR #3 — Conditional Alternates + Table Layout (v1.3-conditional-alternates)
- {#has_alternates} conditional hides alternates section when no ALT items
- Individual tables per line item (loop tags outside tables)
- Template v4 with proper table borders

### PR #4 — Section-Aware Location Headers (v1.4-section-location-headers)
- Detects multiple section header rows dynamically
- Each section has its own location column names
- Roofing, Balconies, Exterior all render correct location names
- Works regardless of row additions/deletions

### Test Projects
- SUNDAY - V5: proj_db22560e20a04064 (original test)
- Monday 09: proj_06dcfaef8e6a4cdb (multi-section test with ALT items)

### Rollback Points
- v1.4-section-location-headers (current)
- v1.3-conditional-alternates
- v1.2-bid-type-template-v2
- v1.1-session-24
- v1.0-working-flow

## Template History

- v1: Proposal_Template_v1_mr.docx (original 5-column layout)
- v2: Proposal_template_final.docx (2-column layout, first draft)
- v3: Proposal_template_offical_in_use.docx (first official template)
- v4: Proposal_template_offical_in_use_v2.docx (loop tags moved outside tables)
- v5: Proposal_template_offical_in_use_v3.docx (added {#has_alternates} conditional)
- v6 (current): Proposal_template_offical_in_use_v4.docx (fixed table borders)

All deployed as: public/templates/Proposal_Template_v1_FIXED.docx

## Open Items (Priority Order)
1. **BTX column boundary bug** — When estimator deletes location columns, Total Measurements and Total Cost columns become Bluebeam tools. Fix needed in BTX generation code. SENSITIVE FILE — study before editing.
2. **Sheet formula brittleness** — TOTAL COST FOR ALL rows break to #REF! when rows are deleted. Takeoff sheet setup creates hardcoded row references instead of dynamic ranges.
3. **Section Total $0.00** — Displays in frontend because sheet formula is broken (#REF!). Related to item 2.

## Test Data
- SUNDAY - V5: proj_db22560e20a04064 (controlled test, clean data)
- Monday 09: proj_06dcfaef8e6a4cdb (multi-section with Roofing/Balconies/Exterior)
- SUNDAY - V3: proj_f12f1f5231244fe8 (BTX column bug reproduction)
- Thursday: proj_4222d7446fbc40c5 (original test data, has old bugs)

## Key Files
- app/api/ko/proposal/[projectId]/preview/route.js — proposal data logic
- app/api/ko/proposal/[projectId]/generate/route.js — Word doc generation
- public/templates/Proposal_Template_v1_FIXED.docx — Word template (v6)
- BTX generation file — location TBD, must study before editing

## Google Sheet Template
Template ID: `1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4`

**Current layout (row 3):**
A=item_id, B=Unit Cost, C=Scope, D=R, E=IN, F=TYPE, G-M=Locations, N=Total Measurements, O=Total Cost, **P=BID TYPE**, Q=Comments

**BID TYPE dropdown rules (BASE / ALT):**
- **Bundle total rows** — have dropdown, default "BASE"
- **Standalone item rows** — have dropdown, default "BASE"
- **Bundled item rows** — no dropdown, inherit bid type from their bundle total row

Script used: `scripts/fix-bid-type-column.js`

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
