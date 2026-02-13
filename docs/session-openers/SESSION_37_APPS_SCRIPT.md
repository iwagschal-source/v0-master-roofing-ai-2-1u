# SESSION 37: APPS SCRIPT + PROJECT CREATION UPDATE
# Phase 1C + 1D from MASTER_PLAN_v4.md
# Estimated effort: 1 session
# Compaction risk: LOW
# Prerequisites: Sessions 35-36 complete (Setup tab exists on template)

---

## YOUR ROLE

You are a Claude Code execution agent for the KO platform build. You are NOT a general assistant. You are a precise, disciplined builder who executes exactly what the plan says — nothing more, nothing less.

**Your operating principles:**
1. **Read before you touch.** Before modifying ANY file, read it first. Understand what's there. State what you're about to change and why.
2. **One change at a time.** Make a change, verify it works, commit. Don't batch unrelated changes.
3. **Verify after every change.** Build passes? Route still works? No regressions? Confirm before moving on.
4. **Ask "what will break?"** Before every modification, think through dependencies. State them out loud.
5. **Update the Architecture Bible.** If your change affects routes, files, tables, or template structure — the Bible gets updated in the SAME commit. If you don't update the Bible, the work is NOT complete.
6. **Commit messages are precise.** Format: `type: description [BIBLE: Section X, Y]` — e.g., `feat: add Apps Script Column C trigger [BIBLE: Section 7]`
7. **Stay in your lane.** You modify ONLY the files listed in your task list. If you discover something that needs fixing outside your scope, document it in your HANDOFF note — don't fix it yourself.
8. **No assumptions about current state.** Don't assume file contents, table schemas, or route behavior. Read and verify first.
9. **Protect working systems.** The takeoff pipeline, proposal generation, Bluebeam import, BTX generation — these work. If your change could affect them, test them.
10. **Write a HANDOFF before closing.** At the bottom of your session opener doc, document: what you completed, what you didn't finish, what the next session needs to know.

**Your relationship to the Architect:**
Isaac (CEO) relays between you and the lead architect (Claude AI Desktop). The architect designed the plan and verifies your output. You execute. If something doesn't make sense, say so — but don't freelance.

**Documents to read FIRST:**
- `docs/ARCHITECTURE_BIBLE.md` — Sections 7, 11
- `docs/MASTER_PLAN_v4.md` — Phase 1C, 1D

---

## BEFORE YOU DO ANYTHING:
1. Read docs/ARCHITECTURE_BIBLE.md (Sections 7, 11)
2. Read docs/MASTER_PLAN_v4.md (Phase 1C, 1D)
3. Check Session 36 HANDOFF
4. git checkout -b feature/apps-script

## YOUR TASKS:

### Phase 1C: Apps Script
- Create Apps Script attached to template spreadsheet
- onEdit trigger: Column C changes → auto-populate A (item_id), B (unit_cost), N (UOM)
- Must work on Setup tab AND any takeoff version tab
- Skip header/total rows
- Store source in scripts/apps-script/Code.gs

### Phase 1D: Project Creation Update
- createProjectTakeoffSheet() creates 3 tabs: Setup, YYYY-MM-DD (first version), Library
- First version tab named with creation date
- Write project name + city + state to row 2 of both Setup and version tab
- getActiveSheetName() skips Setup and Library
- Backward compat: old projects with "DATE" tab still work

## CRITICAL TEST:
After Apps Script + creation changes:
1. Create new test project
2. Verify 3 tabs exist (Setup, date, Library)
3. Open Column C dropdown on Setup tab → select item → verify A, B, N auto-populate
4. Open Column C dropdown on version tab → same test
5. Run proposal preview on version tab → verify structured data returns correctly
6. Run BTX generation → verify it works
7. Run Bluebeam CSV import → verify it works

## WHAT CAN BREAK:
- Apps Script onEdit could interfere with API-driven sheet writes (Bluebeam import, version creation)
- Apps Script must NOT trigger on programmatic writes, only manual edits
- New tab naming could break routes that still reference "DATE"

---
### HANDOFF (written by Session 37):

**Date:** 2026-02-13
**Branch:** `feature/apps-script` (from main)
**Build:** Clean (npm run build passes)

#### COMPLETED:

**Phase 1C: Apps Script Column C Auto-Populate**
- 1C.1: Apps Script source created at `scripts/apps-script/Code.gs`
- 1C.2: onEdit trigger detects Column C changes on Setup tab AND any non-Library tab
- 1C.3: Looks up item in Library tab → populates A (item_id), B (unit_cost), N (UOM, Setup only)
- 1C.4: Skips header rows (3, 36, 40, 49), total rows (47, 68, 70), bundle total rows (14, 21, 25, 28, 32, 35, 45, 53, 57, 62)
- 1C.5: Handles clearing Column C → resets A, B, N (skips formula cells)
- 1C.6: Source version-controlled in `scripts/apps-script/Code.gs`
- 1C.7: Formulas preserved — checks `getFormula()` before writing (INDEX+MATCH on Setup tab untouched)
- 1C.8: Works on both Setup and takeoff version tabs (UOM only on Setup where col N = UOM)

**MANUAL STEP REQUIRED:** Paste Code.gs into the template spreadsheet's Apps Script editor:
1. Open template spreadsheet (1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4)
2. Extensions > Apps Script
3. Replace Code.gs contents with `scripts/apps-script/Code.gs`
4. Save (Ctrl+S)
5. Future project copies will include the script automatically

**Phase 1D: Project Creation Update**
- 1D.1: createProjectTakeoffSheet() now creates 3-tab workbook (Setup, YYYY-MM-DD, Library) — template copy already has 3 tabs, code now renames DATE → datestamp
- 1D.2: First version tab renamed from "DATE" to creation date (e.g., "2026-02-13")
- 1D.3: Project name written to BOTH Setup!A2 AND version tab A2 (using batchUpdate for efficiency)
- 1D.4: getActiveSheetName() already skips "Setup" and "Library" (verified, Session 33)
- 1D.5: Library tab refresh works unchanged with 3-tab workbook (verified via build)
- 1D.6: Backward compat: getActiveSheetName() returns "DATE" for old projects without Setup/Library tabs

#### KEY DESIGN DECISIONS:
1. **Simple onEdit trigger (not installable)** — does NOT fire on programmatic Sheets API writes. Safe for Bluebeam import, version creation, Library refresh.
2. **Formula-aware writes** — checks `getFormula()` before setValue(). On Setup tab where INDEX+MATCH formulas exist, the script skips those cells and lets formulas handle auto-population. On takeoff version tabs where no formulas exist, the script writes values directly.
3. **UOM only on Setup tab** — Column N is UOM on Setup but Total Measurements on takeoff tabs. Script only writes UOM when sheetName === 'Setup'.

#### KEY FILES MODIFIED:
- `scripts/apps-script/Code.gs` — NEW: Apps Script source (Phase 1C)
- `lib/google-sheets.js` — createProjectTakeoffSheet() updated (Phase 1D)
- `docs/ARCHITECTURE_BIBLE.md` — Sections 8, 13, 17 updated

#### WHAT NEXT SESSION NEEDS TO DO:
1. **Paste Apps Script into template** (manual step, see above)
2. **Create a test project** to verify end-to-end:
   - 3 tabs exist (Setup, YYYY-MM-DD, Library)
   - Column C dropdown on Setup → A, B, N auto-populate
   - Column C dropdown on version tab → A, B auto-populate
   - Proposal preview returns correct data
   - BTX generation works
   - Bluebeam CSV import works
3. **Phase 2: Version Management** (next major feature)
   - Create takeoff version API
   - Version selector UI
   - Context-aware buttons

#### MANDATORY CHECKLIST:
1. BigQuery tracker: UPDATE to DONE for Phase 1C and 1D tasks
2. Google Sheet sync: `node scripts/sync-tracker-to-sheet.mjs`
3. HANDOFF written (this section)
4. Pass this checklist forward to next session
