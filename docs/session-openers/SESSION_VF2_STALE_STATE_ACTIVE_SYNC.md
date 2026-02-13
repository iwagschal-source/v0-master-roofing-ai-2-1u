# SESSION VF-2: STALE STATE + ACTIVE VERSION SYNC
# Phase 2C-FIX from Version UI Bug Fix Plan
# Fixes Bugs 1, 3, 7 (Groups A + C)
# Estimated effort: 1 session
# Compaction risk: MEDIUM (1 large file, multiple edits)
# Prerequisites: VF-1 complete (original version registered)
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
- `/home/iwagschal/.claude/plans/sprightly-gliding-squirrel.md` — Full plan (Steps 2 + 3)
- `docs/session-openers/SESSION_VF1_REGISTER_ORIGINAL_VERSION.md` — VF-1 handoff
- `docs/ARCHITECTURE_BIBLE.md` — Sections 5, 7, 9, 17

---

## BEFORE YOU DO ANYTHING:
1. Read the full plan: `/home/iwagschal/.claude/plans/sprightly-gliding-squirrel.md`
2. Read VF-1 HANDOFF in `docs/session-openers/SESSION_VF1_REGISTER_ORIGINAL_VERSION.md`
3. Read `components/ko/estimating-center-screen.jsx` completely — this is the ONLY file you modify
4. Identify these exact locations:
   - `checkExistingTakeoffSheet` function (~line 151)
   - `loadVersions` function (~line 169)
   - `handleVersionTabClick` function (~line 194)
   - TakeoffSetupScreen `onComplete` prop (~line 1240)
   - TakeoffSpreadsheet modal close `onClick` (~line 1261)
   - TakeoffSpreadsheet `onClose` prop (~line 1271)
5. `git checkout feature/version-ui-redo && git pull`

---

## SESSION SCOPE: Stale State + Active Sync (Bugs 1, 3, 7)
Tasks: VF-2.1, VF-2.2, VF-2.3, VF-2.4

**CRITICAL RULES (from Isaac — NON-NEGOTIABLE):**
- Do NOT remove TakeoffSetupScreen, TakeoffSpreadsheet, or any existing imports
- Do NOT remove or rename any existing buttons (Setup, Takeoff, Upload)
- Do NOT remove showTakeoffSheet state or any existing state variables
- Do NOT remove any existing modals or UI blocks

### VF-2.1: Add checkExistingTakeoffSheet to close handler (Bug 1)
**File:** `components/ko/estimating-center-screen.jsx` — line ~1261
**What:** The TakeoffSpreadsheet modal close button only calls `setShowTakeoffSheet(false)`. After closing, the UI is stale — no BTX button, no version bar, no refresh.
**Fix:** Add `checkExistingTakeoffSheet(selectedProject.project_id)` after setting state.
```jsx
onClick={() => {
  setShowTakeoffSheet(false)
  if (selectedProject) {
    checkExistingTakeoffSheet(selectedProject.project_id)
  }
}}
```

### VF-2.2: Add checkExistingTakeoffSheet to inner onClose (Bug 1)
**File:** `components/ko/estimating-center-screen.jsx` — line ~1271
**What:** Same issue on the inner `onClose` prop of TakeoffSpreadsheet component.
```jsx
onClose={() => {
  setShowTakeoffSheet(false)
  if (selectedProject) {
    checkExistingTakeoffSheet(selectedProject.project_id)
  }
}}
```

### VF-2.3: Add loadVersions to TakeoffSetupScreen onComplete (Bug 3)
**File:** `components/ko/estimating-center-screen.jsx` — line ~1240
**What:** `onComplete` sets `embeddedSheetId` but never calls `loadVersions()`. Version bar doesn't appear until full page refresh.
**Fix:** Add `loadVersions(selectedProject.project_id)` after setting sheet state.
```jsx
onComplete={(config) => {
  setShowTakeoffSetup(false)
  if (config.spreadsheetId) {
    setEmbeddedSheetId(config.spreadsheetId)
    setEmbeddedSheetUrl(config.embedUrl || `https://docs.google.com/spreadsheets/d/${config.spreadsheetId}/edit?embedded=true&rm=minimal`)
    setShowEmbeddedSheet(true)
    // Load versions so version bar appears immediately
    if (selectedProject) {
      loadVersions(selectedProject.project_id)
    }
  } else {
    setShowTakeoffSheet(true)
  }
}}
```

### VF-2.4: Add optimistic active sync to handleVersionTabClick (Bug 7)
**File:** `components/ko/estimating-center-screen.jsx` — lines ~194-208
**What:** `handleVersionTabClick` updates local state only. Green dot doesn't move. Checkmark on Setup tab doesn't update. Three independent active states never sync.
**Fix:** Add optimistic local update + async PUT to persist + rollback on error.
**Risk:** MEDIUM — optimistic update pattern. If PUT fails, `loadVersions()` rollback restores real state.
```jsx
const handleVersionTabClick = (tabName, tabSheetId) => {
  setSelectedVersionTab(tabName)
  if (tabName === 'Setup') {
    setCurrentSheetName(null)
  } else {
    setCurrentSheetName(tabName)
    // Optimistic update: move green dot locally
    setVersions(prev => prev.map(v => ({
      ...v,
      active: v.sheetName === tabName,
    })))
    // Persist active version to Setup tab (async, non-blocking)
    if (selectedProject) {
      fetch(`/api/ko/takeoff/${selectedProject.project_id}/versions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetName: tabName, setActive: true }),
      }).catch(err => {
        console.warn('Failed to persist active version:', err)
        loadVersions(selectedProject.project_id) // Rollback on error
      })
    }
  }
  // Navigate embedded sheet to selected tab
  if (embeddedSheetId && tabSheetId != null) {
    setEmbeddedSheetUrl(
      `https://docs.google.com/spreadsheets/d/${embeddedSheetId}/edit?embedded=true&rm=minimal&gid=${tabSheetId}`
    )
    setShowEmbeddedSheet(true)
  }
}
```

---

## CRITICAL REQUIREMENTS:
- All 4 changes are in ONE file: `components/ko/estimating-center-screen.jsx`
- `checkExistingTakeoffSheet` and `loadVersions` are EXISTING functions — do NOT create new ones
- The PUT endpoint `/api/ko/takeoff/{projectId}/versions` already exists and accepts `{ sheetName, setActive: true }`
- Verify: `npm run build` must pass
- Verify: Close embedded sheet → version bar + BTX should appear without page refresh
- Verify: Click version tabs → green dot moves live

## COMPACTION CHECKPOINT:
If compaction hits mid-session, commit what you have. VF-2.1+2.2 can ship independently of VF-2.3+2.4.

---

## MANDATORY END-OF-SESSION CHECKLIST:
1. Update BigQuery tracker: `bq query --use_legacy_sql=false "UPDATE master-roofing-intelligence.mr_main.implementation_tracker SET status='DONE', session_completed='VF-2', branch='feature/version-ui-redo', verified=true, verified_by='Session VF-2', verified_at=CURRENT_TIMESTAMP() WHERE task_id IN ('VF-2.1','VF-2.2','VF-2.3','VF-2.4')"`
2. Sync to Google Sheet: `cd ~/v0-master-roofing-ai-2-1u && node scripts/sync-tracker-to-sheet.mjs`
3. Write HANDOFF below
4. **Pass this checklist forward**

---

### HANDOFF (written by Session VF-2):
**Status:** COMPLETE — All 4 tasks DONE, build passes, tracker synced.

**What was done (1 file, 1 commit: `19bede2`):**
- VF-2.1: Added `checkExistingTakeoffSheet(selectedProject.project_id)` to TakeoffSpreadsheet modal close button (line ~1281)
- VF-2.2: Added `checkExistingTakeoffSheet(selectedProject.project_id)` to TakeoffSpreadsheet inner `onClose` prop (line ~1296)
- VF-2.3: Added `loadVersions(selectedProject.project_id)` to TakeoffSetupScreen `onComplete` after setting sheet state (line ~1263)
- VF-2.4: Added optimistic `setVersions()` update + async PUT `/versions` + `.catch()` rollback to `handleVersionTabClick` (lines ~200-215)

**What to verify in VF-3:**
- Close embedded sheet → version bar + BTX button should appear without page refresh (Bugs 1, 3)
- Click version tabs → green dot moves live, no refresh needed (Bug 7)
- Page refresh → checkmark in Setup tracker matches green dot in version bar

**No regressions:** `npm run build` passes clean. No existing imports/buttons/state/modals removed. Only additive changes.

**Next:** Session VF-3 — New Version Dialog (Bug 4) in estimating-center-screen.jsx

**MANDATORY END-OF-SESSION CHECKLIST (pass forward):**
1. Update BigQuery tracker: `UPDATE ... SET status='DONE', session_completed='VF-3' ... WHERE task_id IN ('VF-3.1','VF-3.2','VF-3.3','VF-3.4')`
2. Sync to Google Sheet: `cd ~/v0-master-roofing-ai-2-1u && node scripts/sync-tracker-to-sheet.mjs`
3. Write HANDOFF in session opener doc
4. Pass this checklist forward
