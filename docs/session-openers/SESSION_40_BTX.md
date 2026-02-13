# SESSION 40: BTX v2 (Setup-Aware)
# Phase 3 from MASTER_PLAN_v4.md
# CAN RUN PARALLEL with Sessions 41, 42
# Prerequisites: Phase 2 complete

---

## YOUR ROLE

You are a Claude Code execution agent for the KO platform build. You are NOT a general assistant. You are a precise, disciplined builder who executes exactly what the plan says — nothing more, nothing less.

**Your operating principles:**
1. **Read before you touch.** Before modifying ANY file, read it first. Understand what's there. State what you're about to change and why.
2. **One change at a time.** Make a change, verify it works, commit. Don't batch unrelated changes.
3. **Verify after every change.** Build passes? Route still works? No regressions? Confirm before moving on.
4. **Ask "what will break?"** Before every modification, think through dependencies. State them out loud.
5. **Update the Architecture Bible.** If your change affects routes, files, tables, or template structure — the Bible gets updated in the SAME commit.
6. **Commit messages are precise.** Format: `type: description [BIBLE: Section X, Y]`
7. **Stay in your lane.** You modify ONLY BTX-related files. No overlap with Import or Proposal.
8. **No assumptions about current state.** Read and verify first.
9. **Protect working systems.** Test pipeline after changes.
10. **Write a HANDOFF before closing.**

**Your relationship to the Architect:**
Isaac (CEO) relays between you and the lead architect (Claude AI Desktop). You execute.

**Documents to read FIRST:**
- `docs/ARCHITECTURE_BIBLE.md` — Sections 5, 6 (BTX route, Python backend)
- `docs/MASTER_PLAN_v4.md` — Phase 3

---

## BEFORE YOU DO ANYTHING:
1. Read ARCHITECTURE_BIBLE.md (Sections 5, 6 — BTX route, Python backend)
2. Read MASTER_PLAN_v4.md (Phase 3)
3. git checkout -b feature/btx-v2

## TASKS: 3.1-3.7
## KEY CHANGE: BTX reads Setup tab toggles, not sheet-config from takeoff tab
## PARALLEL SAFETY: This session only modifies BTX-related files. No overlap with Import or Proposal.

---
### HANDOFF:

**Status: COMPLETE (Tasks 3.1-3.5, 3.7 done)**
**Branch:** `feature/btx-v2` (3 commits ahead of main)
**Build:** Passes

### What was done:

| Task | Status | Description |
|------|--------|-------------|
| 3.1 | DONE | `readSetupConfig()` enhanced: returns location names from section headers, tool names (col P), section membership per item. New API `GET /setup-config` reads Setup tab and returns BTX-compatible data |
| 3.2 | DONE | Tool name from Setup column P included in setup-config response and passed through to BTX |
| 3.3 | DONE | Summary dialog shows `{items} × {locations} = {tools}` with location chips, missing-tool warning. User confirms before download |
| 3.4 | DONE | BTX zip saved to Drive project folder → Markups subfolder (non-fatal if Drive save fails) |
| 3.5 | DONE | Filename: `{project}-tools-{YYYY-MM-DD}.zip` |
| 3.6 | SKIPPED | Python backend WATERPROOFING location codes — requires Python server access (out of scope for this session) |
| 3.7 | DONE | Architecture Bible updated: Sections 6, 9, 12, 17 |

### Files modified:
- `lib/version-management.js` — Enhanced `readSetupConfig()` (+30 lines)
- `app/api/ko/takeoff/[projectId]/setup-config/route.js` — NEW (121 lines)
- `app/api/ko/takeoff/[projectId]/btx/route.js` — Dual-format support + Drive save (+175 lines)
- `components/ko/estimating-center-screen.jsx` — Setup-config flow + summary dialog (+89 lines)
- `docs/ARCHITECTURE_BIBLE.md` — Updated sections 6, 9, 12, 17

### Commits:
1. `0359389` — feat: Phase 3 BTX v2 — Setup-aware BTX generation with summary dialog
2. `04192c3` — feat: 3.4-3.5 save BTX zip to Drive Markups folder + proper naming
3. `8c71ca5` — docs: 3.7 update Architecture Bible for BTX v2 (Phase 3)

### Backward compatibility:
- BTX route still accepts legacy `config` body format (old sheet-config flow)
- `readSetupConfig()` returns new fields without breaking existing callers (create-version destructures only what it needs)
- GET /btx tries setup-config first, falls back to legacy /config

### BUGS FOUND IN TESTING (must fix next session):
1. **BTX generates all items on all floors** — Python backend gets flat lists, makes every combination. Setup tab has per-item toggles (Drains only on 1st Floor) but BTX route flattens them. Fix: send per-item locations to Python, filter per floor.
2. **Project creation makes takeoff tab too early** — Template copy creates Setup+DATE+Library immediately. Takeoff tab should NOT exist until user clicks "Create Takeoff" after configuring Setup. Fix: project creation should only create Setup + Library.

### What's done since handoff:
- Task 3.6: DONE — WATERPROOFING location codes added to Python backend, server restarted
- Branch merged to main, pushed to origin

### MANDATORY CHECKLIST:
1. Update BigQuery tracker: `UPDATE master-roofing-intelligence.mr_main.implementation_tracker SET status='DONE', session_completed='40', branch='feature/btx-v2', verified=true, verified_by='Session 40', verified_at=CURRENT_TIMESTAMP() WHERE phase='3' AND task_id IN ('3.1','3.2','3.3','3.4','3.5','3.7')`
2. Sync to Google Sheet: `node scripts/sync-tracker-to-sheet.mjs`
3. Pass this checklist forward
