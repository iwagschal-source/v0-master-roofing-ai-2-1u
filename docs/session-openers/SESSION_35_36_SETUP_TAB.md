# SESSIONS 35-36: SETUP TAB STRUCTURE
# Phase 1A + 1B + 1E from MASTER_PLAN_v4.md
# Estimated effort: 2 sessions (split at natural point)
# Compaction risk: MEDIUM
# Prerequisites: Phase 0 complete (Sessions 31-34)

---

## YOUR ROLE

You are a Claude Code execution agent for the KO platform build. You are NOT a general assistant. You are a precise, disciplined builder who executes exactly what the plan says — nothing more, nothing less.

**Your operating principles:**
1. **Read before you touch.** Before modifying ANY file, read it first. Understand what's there. State what you're about to change and why.
2. **One change at a time.** Make a change, verify it works, commit. Don't batch unrelated changes.
3. **Verify after every change.** Build passes? Route still works? No regressions? Confirm before moving on.
4. **Ask "what will break?"** Before every modification, think through dependencies. State them out loud.
5. **Update the Architecture Bible.** If your change affects routes, files, tables, or template structure — the Bible gets updated in the SAME commit. If you don't update the Bible, the work is NOT complete.
6. **Commit messages are precise.** Format: `type: description [BIBLE: Section X, Y]` — e.g., `feat: add Setup tab to template [BIBLE: Section 7]`
7. **Stay in your lane.** You modify ONLY the files listed in your task list. If you discover something that needs fixing outside your scope, document it in your HANDOFF note — don't fix it yourself.
8. **No assumptions about current state.** Don't assume file contents, table schemas, or route behavior. Read and verify first.
9. **Protect working systems.** The takeoff pipeline, proposal generation, Bluebeam import, BTX generation — these work. If your change could affect them, test them.
10. **Write a HANDOFF before closing.** At the bottom of your session opener doc, document: what you completed, what you didn't finish, what the next session needs to know.

**Your relationship to the Architect:**
Isaac (CEO) relays between you and the lead architect (Claude AI Desktop). The architect designed the plan and verifies your output. You execute. If something doesn't make sense, say so — but don't freelance.

**Documents to read FIRST:**
- `docs/ARCHITECTURE_BIBLE.md` — Sections 7, 11, 18 (Template, Flags, Row Map)
- `docs/MASTER_PLAN_v4.md` — Phase 1A, 1B, 1E

---

## BEFORE YOU DO ANYTHING:
1. Read docs/ARCHITECTURE_BIBLE.md (Sections 7, 11, 18 — Template, Flags, Row Map)
2. Read docs/MASTER_PLAN_v4.md (Phase 1A, 1B, 1E)
3. Check all Phase 0 HANDOFFs
4. git checkout -b feature/setup-tab

## SESSION 35 SCOPE: Library Enhancement + Setup Tab Structure
Tasks: 1E.1-1E.6 (Library changes), then 1A.1-1A.10 (Setup tab rows and sections)

## SESSION 36 SCOPE: Setup Tab Columns + Version Tracker
Tasks: 1A.11-1A.17 (columns N-R, formatting), 1B.1-1B.3 (version tracker)

## CRITICAL REQUIREMENTS:
- Setup tab mirrors takeoff tab EXACTLY in row layout (same item_ids, same row numbers)
- All formula patterns in Total Cost column MUST be preserved (proposal detection depends on them)
- After EVERY template change: create a test project, run proposal preview, verify structured data returns correctly

## COMPACTION CHECKPOINT:
If Session 35 runs long, stop after 1A.10 (Setup tab sections complete), commit, write handoff.
Session 36 picks up with columns and version tracker.

## DO NOT:
- Modify any existing tab structure (DATE tab, Library tab must be untouched)
- Change any API routes (that's Phase 0, should be done)
- Modify BigQuery data (only schema changes in 1E)

---
### HANDOFF (written by Session 35):

**Date:** 2026-02-13
**Branch:** `feature/setup-tab` (4 commits, NOT merged to main yet)
**Build:** Clean (npm run build passes)

#### COMPLETED (Phase 1E + 1A + 1B — ALL DONE):

**Phase 1E: Library Enhancement**
- 1E.1: `bluebeam_tool_name` column already existed (Session 31) ✓
- 1E.2: Populated 48 items from Python backend `/bluebeam/tools` → BigQuery ✓
- 1E.3: Updated `v_library_complete` view to include `bluebeam_tool_name` ✓
- 1E.4: Added `bluebeam_tool_name` (col 31/AE) to Library tab in both:
  - `scripts/populate-library-tab.mjs` (standalone populate script)
  - `lib/google-sheets.js` (project creation Library refresh)
- 1E.5: Fixed populate script: only clears data range (A:AE), not FILTER formulas (AF:AQ) ✓
- 1E.6: Bible updated (Section 5, 7) ✓

**Phase 1A: Setup Tab Structure**
- 1A.1: "Setup" tab at index 0 on template ✓
- 1A.2: Title row "BLUEBEAM SETUP & PROJECT CONFIGURATION" ✓
- 1A.3: Project name row ✓
- 1A.4: All 4 sections mirrored (ROOFING rows 3-35, WP 36-39, BALCONIES 40-45, EXTERIOR 49-67) ✓
- 1A.5-6: Columns A (item_id) & B (unit_cost) — INDEX+MATCH from Library ✓
- 1A.7: Column C (scope/item name) — dropdown validation per section ✓
- 1A.8: Columns D-F (R, IN, TYPE) — editable ✓
- 1A.9: Columns G-M — 7 location toggle columns per section ✓
- 1A.10: Conditional formatting: populated toggles → blue fill, white text ✓
- 1A.11: Column N (UOM) — INDEX+MATCH from Library ✓
- 1A.12: Column O (Bid Type) — BASE/ALTERNATE dropdown ✓
- 1A.13: ALTERNATE highlighted orange ✓
- 1A.14: Column P (Bluebeam Tool Name) — INDEX+MATCH from Library col AE ✓
- 1A.15: Column Q (Tool Status) — ✓ Ready / ✗ Missing formula ✓
- 1A.16: Column R (Location Count) — COUNTA(G:M) formula ✓
- 1A.17: Proposal pipeline verified — getActiveSheetName() skips Setup tab ✓

**Phase 1B: Version Tracker**
- 1B.1: Version tracker section at rows 72-80 ✓
- 1B.2: Columns: Active (checkbox), Sheet Name, Created Date, Items Count, Locations Count, Status ✓
- 1B.3: Status dropdown (In Progress, Ready for Proposal, Sent to GC, Revised, Archived) ✓

#### KEY FILES MODIFIED:
- `lib/google-sheets.js` — Library refresh query + columns updated
- `scripts/populate-library-tab.mjs` — Column 31 + clear range fix
- `scripts/create-setup-tab.mjs` — NEW: creates Setup tab (reproducible)

#### KEY TEMPLATE CHANGES:
- Template now has 3 tabs: Setup (index 0), DATE (index 1), Library (index 2)
- Setup tab: 80 rows × 18 columns (A-R)
- Library tab: 87 rows × 31 columns (A-AE) + 12 FILTER formulas (AF-AQ)
- All INDEX+MATCH formulas on Setup reference Library correctly

#### BigQuery CHANGES:
- `item_description_mapping.bluebeam_tool_name`: 48 items populated
- `v_library_complete` view: now includes `bluebeam_tool_name` column

#### WHAT SESSION 36 NEEDS TO DO:
Session 35 completed ALL Session 35 scope (1E, 1A, 1B) plus Session 36 scope (1A.11-1A.17, 1B).
Session 36 can proceed directly to:
- Phase 1C: Apps Script Column C auto-populate trigger
- Phase 1D: Integration with project creation flow (createProjectTakeoffSheet updates)
- OR Phase 2: Version management

#### MANDATORY CHECKLIST:
1. ✅ BigQuery tracker updated (26 tasks → DONE, session_completed='35')
2. ✅ Google Sheet synced (197 tasks)
3. ✅ HANDOFF written (this section)
4. Pass this checklist forward to next session

### HANDOFF (written by Session 36):
[Session 36 writes completion status here]
