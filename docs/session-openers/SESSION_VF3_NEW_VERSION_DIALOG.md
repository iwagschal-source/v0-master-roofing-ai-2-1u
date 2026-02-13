# SESSION VF-3: NEW VERSION DIALOG
# Phase 2C-FIX from Version UI Bug Fix Plan
# Fixes Bug 4 (Group D)
# Estimated effort: 1 session
# Compaction risk: MEDIUM (dialog JSX can be verbose)
# Prerequisites: VF-1 + VF-2 complete
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
- `/home/iwagschal/.claude/plans/sprightly-gliding-squirrel.md` — Full plan (Step 4)
- `docs/session-openers/SESSION_VF2_STALE_STATE_ACTIVE_SYNC.md` — VF-2 handoff
- `docs/ARCHITECTURE_BIBLE.md` — Sections 5, 7, 9, 17

---

## BEFORE YOU DO ANYTHING:
1. Read the full plan: `/home/iwagschal/.claude/plans/sprightly-gliding-squirrel.md`
2. Read VF-2 HANDOFF in `docs/session-openers/SESSION_VF2_STALE_STATE_ACTIVE_SYNC.md`
3. Read `components/ko/estimating-center-screen.jsx` completely — this is the ONLY file you modify
4. Read `app/api/ko/takeoff/[projectId]/versions/route.js` — understand POST copy endpoint (body: `{ sourceSheetName }`)
5. Read `app/api/ko/takeoff/[projectId]/create-version/route.js` — understand POST blank endpoint
6. Identify these exact locations:
   - State declarations (~line 64-88)
   - `handleCreateVersion` function (~line 211)
   - Existing modals section (~line 1200+)
7. `git checkout feature/version-ui-redo && git pull`

---

## SESSION SCOPE: New Version Dialog (Bug 4)
Tasks: VF-3.1, VF-3.2, VF-3.3, VF-3.4

**CRITICAL RULES (from Isaac — NON-NEGOTIABLE):**
- Do NOT remove TakeoffSetupScreen, TakeoffSpreadsheet, or any existing imports
- Do NOT remove or rename any existing buttons (Setup, Takeoff, Upload)
- Do NOT remove showTakeoffSheet state or any existing state variables
- Do NOT remove any existing modals or UI blocks
- ALL changes are ADDITIVE — you are adding a dialog, not replacing existing flows

### VF-3.1: Add state variables for new version dialog
**File:** `components/ko/estimating-center-screen.jsx` — near line ~88
**What:** Add 3 state variables to support the dialog.
```jsx
const [showNewVersionDialog, setShowNewVersionDialog] = useState(false)
const [newVersionMode, setNewVersionMode] = useState('duplicate') // default to duplicate
const [newVersionMakeActive, setNewVersionMakeActive] = useState(true)
```

### VF-3.2: Modify handleCreateVersion to show dialog
**File:** `components/ko/estimating-center-screen.jsx` — line ~211
**What:** Instead of immediately creating a blank sheet, show the dialog with options.
```jsx
const handleCreateVersion = async () => {
  if (!selectedProject || creatingVersion) return
  setNewVersionMode('duplicate')
  setNewVersionMakeActive(true)
  setShowNewVersionDialog(true)
}
```

### VF-3.3: Add handleConfirmCreateVersion function
**File:** `components/ko/estimating-center-screen.jsx` — after handleCreateVersion
**What:** New function that executes the actual creation based on dialog choices.
**Logic:**
- If `newVersionMode === 'duplicate'` AND `currentSheetName`:
  - POST `/api/ko/takeoff/${projectId}/versions` with body `{ sourceSheetName: currentSheetName }`
  - Response shape: `{ newSheetName, newTabSheetId, copiedFrom }`
- If `newVersionMode === 'blank'`:
  - POST `/api/ko/takeoff/${projectId}/create-version` with body `{}`
  - Response shape: `{ sheetName, tabSheetId }`
- After creation:
  - `loadVersions(projectId)` to refresh version bar
  - Switch to new tab via `handleVersionTabClick(newSheetName, newTabSheetId)`
- If `newVersionMakeActive` is false:
  - Fire PUT to revert active flag (non-blocking, fire-and-forget with .catch)
- Close dialog: `setShowNewVersionDialog(false)`
- Handle errors: `setCreatingVersion(false)`, show error toast or console.error

### VF-3.4: Add New Version dialog modal JSX
**File:** `components/ko/estimating-center-screen.jsx` — after existing modals (~line 1360)
**What:** A modal dialog with:
- **Title:** "Create New Version"
- **Radio group:**
  - "Duplicate current version ([currentSheetName])" — default selected
  - "Blank from template"
  - If no currentSheetName, disable duplicate option and default to blank
- **Checkbox:** "Make this the operational version" — default checked
- **Buttons:** Cancel (closes dialog) / Create (calls handleConfirmCreateVersion)
- **Loading state:** Show spinner while `creatingVersion` is true

**Backend endpoints already verified:**
- POST `/api/ko/takeoff/[projectId]/versions` — copy existing (body: `{ sourceSheetName }`)
- POST `/api/ko/takeoff/[projectId]/create-version` — blank from template

**Response shape normalization:**
- Copy endpoint returns: `{ newSheetName, newTabSheetId }`
- Blank endpoint returns: `{ sheetName, tabSheetId }`
- Normalize both to `{ sheetName, tabSheetId }` in handleConfirmCreateVersion

---

## CRITICAL REQUIREMENTS:
- All 4 changes are in ONE file: `components/ko/estimating-center-screen.jsx`
- Do NOT modify the existing "New Version" button — only change what `handleCreateVersion` does
- The dialog is a NEW modal — do NOT repurpose or modify existing modals
- Both POST endpoints already exist — do NOT create new API routes
- Verify: `npm run build` must pass
- Verify: Click "New Version" → dialog appears with Blank/Duplicate + Make Operational checkbox
- Verify: Create duplicate → data copied, version appears in bar
- Verify: Create blank → empty template, version appears in bar

## COMPACTION CHECKPOINT:
VF-3.1+3.2 are trivial (state + redirect to dialog). VF-3.3+3.4 are the meat. If compaction hits, commit 3.1+3.2 first so the dialog gate is wired even if modal JSX isn't complete.

---

## MANDATORY END-OF-SESSION CHECKLIST:
1. Update BigQuery tracker: `bq query --use_legacy_sql=false "UPDATE master-roofing-intelligence.mr_main.implementation_tracker SET status='DONE', session_completed='VF-3', branch='feature/version-ui-redo', verified=true, verified_by='Session VF-3', verified_at=CURRENT_TIMESTAMP() WHERE task_id IN ('VF-3.1','VF-3.2','VF-3.3','VF-3.4')"`
2. Sync to Google Sheet: `cd ~/v0-master-roofing-ai-2-1u && node scripts/sync-tracker-to-sheet.mjs`
3. Write HANDOFF below
4. `npm run build` — verify no errors
5. **Pass this checklist forward**

---

## FULL VERIFICATION PLAN (run after all 3 sessions complete):
1. Create brand new project → click Takeoff → close sheet → verify version bar appears with original version + green dot
2. Click different project → click back → verify version bar still shows correctly (no stale state)
3. Click "New Version" → verify dialog appears with Blank/Duplicate options + "Make operational" checkbox
4. Create duplicate version → verify data copied, version appears in bar
5. Click between version tabs → verify green dot moves live, no refresh needed
6. Open embedded sheet on version tab → Import CSV → verify it targets the selected version
7. Click Proposal → verify it reads from the selected version
8. Refresh page → verify checkmark in Setup tracker matches green dot in version bar
9. `npm run build` → verify no errors

---

### HANDOFF (written by Session VF-3):
[To be filled at session end]
