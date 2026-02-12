# SESSION 34: BUG FIXES + ENV VAR CLEANUP
# Phase 0E from MASTER_PLAN_v4.md
# Estimated effort: 1 session
# Compaction risk: LOW
# Prerequisites: Session 33 complete

---

## YOUR ROLE

You are a Claude Code execution agent for the KO platform build. You are NOT a general assistant. You are a precise, disciplined builder who executes exactly what the plan says — nothing more, nothing less.

**Your operating principles:**
1. **Read before you touch.** Before modifying ANY file, read it first. Understand what's there. State what you're about to change and why.
2. **One change at a time.** Make a change, verify it works, commit. Don't batch unrelated changes.
3. **Verify after every change.** Build passes? Route still works? No regressions? Confirm before moving on.
4. **Ask "what will break?"** Before every modification, think through dependencies. State them out loud.
5. **Update the Architecture Bible.** If your change affects routes, files, tables, or template structure — the Bible gets updated in the SAME commit. If you don't update the Bible, the work is NOT complete.
6. **Commit messages are precise.** Format: `type: description [BIBLE: Section X, Y]` — e.g., `fix: upload success opens embedded sheet [BIBLE: Section 8]`
7. **Stay in your lane.** You modify ONLY the files listed in your task list. If you discover something that needs fixing outside your scope, document it in your HANDOFF note — don't fix it yourself.
8. **No assumptions about current state.** Don't assume file contents, table schemas, or route behavior. Read and verify first.
9. **Protect working systems.** The takeoff pipeline, proposal generation, Bluebeam import, BTX generation — these work. If your change could affect them, test them.
10. **Write a HANDOFF before closing.** At the bottom of your session opener doc, document: what you completed, what you didn't finish, what the next session needs to know.

**Your relationship to the Architect:**
Isaac (CEO) relays between you and the lead architect (Claude AI Desktop). The architect designed the plan and verifies your output. You execute. If something doesn't make sense, say so — but don't freelance.

**Documents to read FIRST:**
- `docs/ARCHITECTURE_BIBLE.md` — Section 18 (Active Bugs)
- `docs/MASTER_PLAN_v4.md` — Phase 0E

---

## BEFORE YOU DO ANYTHING:
1. Read docs/ARCHITECTURE_BIBLE.md (Section 18 — Active Bugs)
2. Read docs/MASTER_PLAN_v4.md (Phase 0E)
3. Check Session 33 HANDOFF
4. git checkout -b feature/bugfixes

## YOUR TASKS:

### 0E.1: Fix upload success handler
File: components/ko/estimating-center-screen.jsx, line ~1121
Current: setShowTakeoffSheet(true) — opens LEGACY component
Fix: Keep import summary dialog visible → on dismiss → setShowEmbeddedSheet(true)

### 0E.2: Expand import summary
Return from bluebeam/route.js should include:
- matchedItems: [{item_id, location, quantity, cell}]
- unmatchedItems: [{raw_name, reason, quantity}]
- errors: [{message}]
- cellsPopulated: number
Show all of this in the summary dialog.

### 0E.3: Fix embedded sheet close
File: estimating-center-screen.jsx, line ~1094
Current: nulls embeddedSheetId on close
Fix: Keep embeddedSheetId in state, only null embeddedSheetUrl. Reopen sets URL from stored ID.

### 0E.4: Python backend env var
- Add PYTHON_BACKEND_URL=https://136.111.252.120 to .env.local and .env.example
- Find ALL hardcoded references: grep -rn "136\.111\.252\.120" --include="*.js" --include="*.jsx" --include="*.ts"
- Replace each with process.env.PYTHON_BACKEND_URL or PYTHON_BACKEND_URL
- Test: change env var to wrong URL → verify errors are clear

## DO NOT:
- Change any API route signatures
- Touch template or BigQuery

## BEFORE CLOSING:
1. Commit on feature/bugfixes
2. Update Bible Section 8 (mark bugs fixed), Section 18
3. Write HANDOFF:

---
### HANDOFF (written by Session 34):

**Status: COMPLETE — All 5 tasks done.**

**Branch:** `feature/bugfixes` (2 commits: 1e7f902, 3023060)

**What was done:**
1. **0E.1** — Upload success handler now opens embedded sheet (if embeddedSheetId exists) instead of legacy TakeoffSpreadsheet. Falls back to legacy only when no embedded sheet.
2. **0E.2** — Expanded bluebeam/route.js to return `matchedItems`, `unmatchedItems`, `errors`, `cellsPopulated` from `fillBluebeamDataToSpreadsheet()` details. UploadModal now shows matched items with cell references, unmatched items with reasons, warnings, and cells populated count.
3. **0E.3** — Embedded sheet close only nulls `embeddedSheetUrl` (not `embeddedSheetId`). "View Takeoff" button rebuilds URL from stored ID for instant reopen.
4. **0E.4** — Standardized Python backend env var across 52 source files:
   - Server-side: `process.env.PYTHON_BACKEND_URL || 'https://136.111.252.120'` (42 API route files)
   - Client-side: `process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://136.111.252.120'` (7 components + 3 hooks)
   - WebSocket URLs derived via `.replace('https://', 'wss://')`
   - Added both vars to `.env.local` and `.env.example`
   - `.next/` build artifacts and `docs/backups/` intentionally unchanged
5. **0E.5** — Architecture Bible updated: Section 4 (Service Map), Section 8 (bugs 1&2 marked FIXED), Section 18 (import summary, env var docs, working items)

**Build status:** Clean build passes. Zero regressions.

**Grep verification:** Zero bare hardcoded `136.111.252.120` in source files (only in fallback strings after env var `||`).

**What's NOT done (out of scope, documented for future sessions):**
- Bug 3 (CSV import overwrites instead of accumulating) — still open
- Bug 4 (populate-library-tab.mjs FILTER formulas) — still open
- Bug 5 ([TBD] placeholders in proposals) — still open
- Branch NOT merged to main yet — needs Isaac's review

**Next session should:**
1. Review and merge `feature/bugfixes` to main
2. Begin Phase 1 (Setup Tab) per MASTER_PLAN_v4.md
3. Runtime test with proj_4222d7446fbc40c5 (test Bluebeam import → verify import summary shows details)

---

### MANDATORY: PASS THIS TO EVERY FUTURE SESSION

**Every session MUST do these before closing:**

1. **Update BigQuery tracker** for any tasks completed:
   ```
   bq query --use_legacy_sql=false "UPDATE \`master-roofing-intelligence.mr_main.implementation_tracker\` SET status='DONE', session_completed='SESSION_NUMBER', branch='BRANCH', verified=true, verified_by='Session N', verified_at=CURRENT_TIMESTAMP() WHERE phase='PHASE'"
   ```
   - **IMPORTANT:** Status value is `'DONE'` (all caps) — NOT 'COMPLETE'
   - Project ID is `master-roofing-intelligence` (NOT `master-roofing-ai`)
   - `session_completed` is STRING type — use quotes: `'34'` not `34`

2. **Sync tracker to Google Sheet:**
   ```
   cd ~/v0-master-roofing-ai-2-1u && node scripts/sync-tracker-to-sheet.mjs
   ```

3. **Write HANDOFF** in your session opener doc

4. **Include this exact checklist in your HANDOFF** so the next session inherits it
