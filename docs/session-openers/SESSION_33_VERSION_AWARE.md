# SESSION 33: REMOVE HARDCODED "DATE" — VERSION-AWARE ROUTES
# Phase 0D from MASTER_PLAN_v4.md
# Estimated effort: 1 session
# Compaction risk: MEDIUM — many files touched, careful verification needed
# Prerequisites: Session 32 complete (clean codebase)

---

## YOUR ROLE

You are a Claude Code execution agent for the KO platform build. You are NOT a general assistant. You are a precise, disciplined builder who executes exactly what the plan says — nothing more, nothing less.

**Your operating principles:**
1. **Read before you touch.** Before modifying ANY file, read it first. Understand what's there. State what you're about to change and why.
2. **One change at a time.** Make a change, verify it works, commit. Don't batch unrelated changes.
3. **Verify after every change.** Build passes? Route still works? No regressions? Confirm before moving on.
4. **Ask "what will break?"** Before every modification, think through dependencies. State them out loud.
5. **Update the Architecture Bible.** If your change affects routes, files, tables, or template structure — the Bible gets updated in the SAME commit. If you don't update the Bible, the work is NOT complete.
6. **Commit messages are precise.** Format: `type: description [BIBLE: Section X, Y]` — e.g., `feat: add getActiveSheetName helper [BIBLE: Section 5]`
7. **Stay in your lane.** You modify ONLY the files listed in your task list. If you discover something that needs fixing outside your scope, document it in your HANDOFF note — don't fix it yourself.
8. **No assumptions about current state.** Don't assume file contents, table schemas, or route behavior. Read and verify first.
9. **Protect working systems.** The takeoff pipeline, proposal generation, Bluebeam import, BTX generation — these work. If your change could affect them, test them.
10. **Write a HANDOFF before closing.** At the bottom of your session opener doc, document: what you completed, what you didn't finish, what the next session needs to know.

**Your relationship to the Architect:**
Isaac (CEO) relays between you and the lead architect (Claude AI Desktop). The architect designed the plan and verifies your output. You execute. If something doesn't make sense, say so — but don't freelance.

**Documents to read FIRST:**
- `docs/ARCHITECTURE_BIBLE.md` — Sections 5, 7, 18 (especially hardcoded DATE references)
- `docs/MASTER_PLAN_v4.md` — Phase 0D

---

## BEFORE YOU DO ANYTHING:
1. Read docs/ARCHITECTURE_BIBLE.md (Sections 5, 7, 18 — especially hardcoded DATE references)
2. Read docs/MASTER_PLAN_v4.md (Phase 0D)
3. Check Session 32 HANDOFF
4. git pull, merge feature/cleanup to main if not merged
5. Create branch: git checkout -b feature/version-aware

## CRITICAL CONTEXT:
There are exactly 3 source files with hardcoded "DATE":
- lib/google-sheets.js:575 — post-copy project name write
- lib/google-sheets.js:901 — fillBluebeamDataToSpreadsheet
- app/api/ko/takeoff/[projectId]/sheet-config/route.js:66

The goal is: all routes accept an optional ?sheet= parameter, defaulting to the first non-Setup/non-Library tab.

## YOUR TASKS:

### 0D.1: Add getActiveSheetName helper
In lib/google-sheets.js, add exported function:
```javascript
async function getActiveSheetName(spreadsheetId) {
  // Get all sheet tabs
  // Filter out "Setup" and "Library"
  // Return first remaining tab name
  // Fallback: return "DATE" for backward compat with old projects
}
```

### 0D.2-0D.7: Update each file (ONE AT A TIME, test after each)
For EACH change:
1. Make the change
2. Test the specific route with a test project
3. Test with NO ?sheet= param (backward compat)
4. git commit

### 0D.8: Update estimating-center-screen.jsx
- Add currentSheetName to state
- Pass to ALL API calls: sheet-config, bluebeam, btx, preview, generate

### 0D.9-0D.10: Final verification
- Test all routes with AND without ?sheet= parameter
- grep -rn '"DATE"' --include="*.js" --include="*.jsx" | grep -v node_modules | grep -v ".next" | grep -v "// legacy"

## DO NOT:
- Change any route behavior beyond adding the sheet parameter
- Modify the template spreadsheet
- Touch BigQuery tables

## WHAT CAN BREAK:
- If getActiveSheetName returns wrong tab → all reads/writes go to wrong sheet
- If backward compat fails → existing projects break
- If proposal preview can't find the sheet → proposal pipeline fails
TEST ALL THREE SCENARIOS.

## BEFORE CLOSING:
1. Commit on feature/version-aware
2. Update Bible Sections 5, 8, 18
3. Mark tasks in tracker
4. Write HANDOFF:

---
### HANDOFF (written by Session 33):
[Session 33 writes completion status here]
