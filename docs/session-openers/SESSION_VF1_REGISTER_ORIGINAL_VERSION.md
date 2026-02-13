# SESSION VF-1: REGISTER ORIGINAL VERSION
# Phase 2C-FIX from Version UI Bug Fix Plan
# Fixes Bugs 2, 5, 6 (Group B)
# Estimated effort: 1 session
# Compaction risk: LOW (2 small files)
# Prerequisites: Plan approved, infrastructure set up
# Branch: feature/version-ui-redo

---

## YOUR ROLE

You are a Claude Code execution agent for the KO platform build. You are NOT a general assistant. You are a precise, disciplined builder who executes exactly what the plan says — nothing more, nothing less.

**Your operating principles:**
1. **Read before you touch.** Before modifying ANY file, read it first. Understand what's there. State what you're about to change and why.
2. **One change at a time.** Make a change, verify it works, commit. Don't batch unrelated changes.
3. **Verify after every change.** Build passes? Route still works? No regressions? Confirm before moving on.
4. **Ask "what will break?"** Before every modification, think through dependencies. State them out loud.
5. **Update the Architecture Bible.** If your change affects routes, files, tables, or template structure — the Bible gets updated in the SAME commit. If you don't update the Bible, the work is NOT complete.
6. **Commit messages are precise.** Format: `type: description [BIBLE: Section X, Y]`
7. **Stay in your lane.** You modify ONLY the files listed in your task list.
8. **No assumptions about current state.** Read and verify first.
9. **Protect working systems.** Test pipeline after changes.
10. **Write a HANDOFF before closing.**

**Your relationship to the Architect:**
Isaac (CEO) relays between you and the lead architect (Claude AI Desktop). The architect designed the plan and verifies your output. You execute.

**Documents to read FIRST:**
- `docs/ARCHITECTURE_BIBLE.md` — Sections 5, 7, 9, 17
- `docs/session-openers/SESSION_38_39_VERSION_MGMT.md` — Session 39 handoff
- `/home/iwagschal/.claude/plans/sprightly-gliding-squirrel.md` — Full plan (Step 1)

---

## BEFORE YOU DO ANYTHING:
1. Read the full plan: `/home/iwagschal/.claude/plans/sprightly-gliding-squirrel.md`
2. Read `lib/google-sheets.js` — find `createProjectTakeoffSheet()`, understand the return object
3. Read `app/api/ko/takeoff/create/route.js` — understand where `createProjectTakeoffSheet` is called
4. Read `lib/version-management.js` — understand `addVersionTrackerEntry` signature
5. Check VF-1 HANDOFF below (if resuming mid-session)
6. `git checkout feature/version-ui-redo`

---

## SESSION SCOPE: Register Original Version (Bugs 2, 5, 6)
Tasks: VF-1.1, VF-1.2

### VF-1.1: Add versionTabName to return object
**File:** `lib/google-sheets.js` — line ~771
**What:** The `createProjectTakeoffSheet()` function creates a workbook and renames the DATE tab to `YYYY-MM-DD` (stored in local var `versionTabName` at line ~619). But the return object at line ~771 does NOT include `versionTabName`. Add it.
**Why:** The create route needs this value to register the version in the Setup tab tracker. Without it, there's a midnight timing bug — the route would have to recalculate the datestamp independently.
**Code:**
```js
return {
  spreadsheetId: newSpreadsheetId,
  versionTabName,  // ADD THIS LINE
  spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit`,
  embedUrl: `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}/edit?embedded=true&rm=minimal`,
  folderId: projectFolderId,
  drawingsFolderId,
}
```

### VF-1.2: Register initial version in Setup tab tracker
**File:** `app/api/ko/takeoff/create/route.js` — after line ~70
**What:** After `createProjectTakeoffSheet()` returns, call `addVersionTrackerEntry()` to write the initial version into Setup tab rows 74-80.
**Why:** Currently the original version tab is never registered, so `/versions` GET returns empty → "No versions yet" in the UI.
**Code:**
```js
// Register the initial version tab in Setup tracker
try {
  const { addVersionTrackerEntry } = await import('@/lib/version-management')
  await addVersionTrackerEntry(result.spreadsheetId, result.versionTabName, 0, 0)
} catch (versionErr) {
  console.warn('[takeoff/create] Non-fatal: Failed to register initial version:', versionErr.message)
}
```
**Why dynamic import:** `version-management.js` already imports from `google-sheets.js`. Static import here would create a circular dependency. Dynamic import avoids that.
**Why try/catch:** Sheet creation must NEVER fail because of tracker issues. This is non-fatal.

---

## CRITICAL REQUIREMENTS:
- Do NOT modify `createProjectTakeoffSheet()` logic — only add `versionTabName` to the return
- Do NOT add static imports of version-management in google-sheets.js (circular dependency)
- Do NOT modify any other return fields
- The `versionTabName` variable already exists at line ~619 — do NOT create a new one
- Verify: `npm run build` must pass
- Verify: Create a new project takeoff → `/versions` GET should return the original tab

## COMPACTION CHECKPOINT:
This is a small session (2 changes, 2 files). If compaction hits, the changes are simple enough to verify from git diff alone.

---

## MANDATORY END-OF-SESSION CHECKLIST:
1. Update BigQuery tracker: `bq query --use_legacy_sql=false "UPDATE master-roofing-intelligence.mr_main.implementation_tracker SET status='DONE', session_completed='VF-1', branch='feature/version-ui-redo', verified=true, verified_by='Session VF-1', verified_at=CURRENT_TIMESTAMP() WHERE task_id IN ('VF-1.1','VF-1.2')"`
2. Sync to Google Sheet: `cd ~/v0-master-roofing-ai-2-1u && node scripts/sync-tracker-to-sheet.mjs`
3. Write HANDOFF below
4. **Pass this checklist forward**

---

### HANDOFF (written by Session VF-1):
**Status:** COMPLETE - Both tasks DONE, build passes, tracker synced.

**What was done:**
- VF-1.1: Added `versionTabName` to `createProjectTakeoffSheet()` return object in `lib/google-sheets.js:772`
- VF-1.2: Added `addVersionTrackerEntry()` call via dynamic import in `app/api/ko/takeoff/create/route.js:73-78` (after line 70)

**What to verify in VF-2:**
- New project creation → Takeoff → `/versions` GET should return the original date-named tab
- The version bar should show the original version (once VF-2 stale state fixes are applied)

**No regressions:** `npm run build` passes clean. No existing imports/buttons/state removed.

**Next:** Session VF-2 — fix stale state (Bugs 1,3) + active sync (Bug 7) in estimating-center-screen.jsx
