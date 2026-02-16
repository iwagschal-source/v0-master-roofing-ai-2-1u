# SESSION 27 HANDOFF — Description Library Content Push + Pipeline Wiring

## Context
Session 26 designed the three-way item classification system and added 7 new columns to BigQuery `item_description_mapping`. Session 27 pushed all approved content to BigQuery (Phase 2) and wired the pipeline code to use it (Phase 3).

## What Was Accomplished

### Phase 2: Content Push to BigQuery (3 Chunks)

**Chunk 1 — 13 system_heading + paragraph_description**
All 13 system items updated with proper headings and paragraph descriptions.
Placeholders: {R_VALUE}, {THICKNESS}, {TYPE} in MR-003BU2PLY, MR-028PAVER, MR-043EIFS, MR-006IRMA (IRMA uses no placeholders — all literal).

**Chunk 2 — 35 bundle_fragment + fragment_sort_order**
All 35 component items updated with fragment sentences and sort ordering (1–85 range).
Fragments compose naturally when appended to system paragraphs in sort order.

**Chunk 3 — 30 standalone_description**
All 30 standalone-capable items updated. Includes 3 standalone-only items (MR-049TIEIN, MR-050ADJHORZ, MR-051ADJVERT) and 2 system items that can also appear standalone (MR-025FLASHBLDG, MR-026FLASHPAR).

SQL files preserved at:
- `/home/iwagschal/proposal-library-extraction/chunk1_update.sql`
- `/home/iwagschal/proposal-library-extraction/chunk2_update.sql`
- `/home/iwagschal/proposal-library-extraction/chunk3_update.sql`

### Phase 3: Code Changes to preview/route.js

**4 edits to `app/api/ko/proposal/[projectId]/preview/route.js`:**

1. **fetchDescriptions()** (lines 587–636) — SELECT expanded with 7 new fields: `is_system`, `can_bundle`, `can_standalone`, `system_heading`, `bundle_fragment`, `standalone_description`, `fragment_sort_order`. Mapping adds corresponding JS properties.

2. **findMainItem()** (lines 643–658) — Primary selection: `isSystem === true`. Fallback: `hasDescription`, then `items[0]`.

3. **buildDescription()** (lines 671–719) — New signature: `(item, descriptions, mode, bundleItems)`.
   - `mode='system'`: Starts with system paragraph, walks bundle siblings, appends fragments sorted by `fragmentSortOrder`.
   - `mode='standalone'`: Uses `standaloneDescription` → `paragraph` → `name`.
   - Placeholder replacement is case-insensitive (`/gi`), handles `{MATERIAL_TYPE}` alias.

4. **Call sites updated:**
   - Line 212: Section title uses `systemHeading` as first priority
   - Line 217: `buildDescription(mainItem, descriptions, 'system', section.items)` — passes all bundle items for fragment composition
   - Line 235: Standalone item `name` overridden with `systemHeading` when available
   - Line 236: `buildDescription(item, descriptions, 'standalone')`

### Post-Merge Fix: Standalone Titles
Standalone items with `systemHeading` (e.g., MR-032RECESSWP appearing outside a bundle) now display the heading instead of raw sheet scope text.

### Post-Merge Fix: MR-003BU2PLY Placeholder Position
Moved `{TYPE}` from "APP180 {TYPE} granulated" to end of paragraph: "{TYPE} insulation minimum {THICKNESS} at lowest point ({R_VALUE})."

## Git History
```
8969d61 fix: standalone item titles use systemHeading when available
b14a12f Phase 3: Description composition - system paragraphs + bundle fragments + standalone descriptions
```
- Branch: `feature/description-composition` (merged to main)
- Tag: `v2.0-description-composition`
- Both commits on main, deployed to production.

## Verified on Production (SUNDAY V5 — proj_db22560e20a04064)

### Bundle Section
- **Title**: "WORK DETAIL FOR THE INSTALLATION OF FIRESTONE APP160 & 180 ROOFING (Built Up)" ← from `system_heading`
- **sectionDescription**: System paragraph (MR-003BU2PLY) + fragment from MR-004UO (sort 15) + fragment from MR-005SCUPPER (sort 80) — composed in correct order
- **mainItemId**: MR-003BU2PLY (selected via `isSystem === true`)

### Standalone Items
| item_id | Title Source | Description Source |
|---------|-------------|-------------------|
| MR-001VB | Sheet scope (no systemHeading) | standalone_description |
| MR-032RECESSWP | systemHeading | paragraph_description (is_system=true, no standalone_description) |
| MR-036DOORBAL | Sheet scope (no systemHeading) | standalone_description |
| MR-051ADJVERT | Sheet scope (no systemHeading) | standalone_description |

## generate/route.js — No Changes Needed
The generate route consumes preview output. `transformForTemplate()` uses `section.sectionDescription` for bundles and `item.description` for standalones — both now populated correctly by preview.

## What NOT to Touch
- Formula detection logic (stable since Session 24)
- Column discovery / header parsing (stable since Session 25)
- Bundle range detection via SUM formulas (stable)
- BTX generation pipeline (v1.9)
- lib_takeoff_template (no changes)
- Existing legacy columns (paragraph_description, row_type, description_status) — kept for rollback

## Known Issues / Future Work

### Content Gaps
- MR-005SCUPPER has `bundle_fragment` but no `paragraph_description` — shows empty string when it's the only item. Not a problem in practice (scuppers always bundle under a system), but could add a fallback.
- MR-006IRMA `system_heading` says "SOPREMA RS 230 ROOFING SYSTEM (Irma)" — this is the IRMA overburden system, not a Soprema roofing system. May need heading revision.
- Items with `{TYPE}`, `{THICKNESS}`, `{R_VALUE}` show `[TBD]` when sheet columns R/IN/TYPE are empty. Expected behavior, but proposals look better with values filled in.

### Pipeline Enhancements (Future)
- Validation: flag bundles with no `is_system=true` item as warnings
- Google Sheets dropdown validation: system slots only accept SYSTEM items, component slots only COMPONENT items
- Dead code cleanup: `lib/proposal-systems.js` and `lib/takeoff-to-proposal.js` (unused parallel pipeline)
- BigQuery region consolidation: mr_agent (us-east4) vs mr_main (US multi-region)
- Category 2 items: EPDM, TPO, Siplast, Soprema Flam 180, Anti Rock, Colphene, rubber/porcelain/ballast pavers, metal panels, hardcoat stucco, Lava WP, Blueskin temp, etc.

## File Locations
- Repo: `/home/iwagschal/v0-master-roofing-ai-2-1u`
- Extraction working dir: `/home/iwagschal/proposal-library-extraction/`
- SQL update files: `chunk1_update.sql`, `chunk2_update.sql`, `chunk3_update.sql`, `fix_bu2ply.sql`
- Session 26 handoff: `SESSION_26_HANDOFF.md`
