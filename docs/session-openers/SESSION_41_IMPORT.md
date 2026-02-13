# SESSION 41: CSV IMPORT v2 (Accumulation + Staging)
# Phase 4 from MASTER_PLAN_v4.md
# CAN RUN PARALLEL with Sessions 40, 42
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
7. **Stay in your lane.** Only modify bluebeam/route.js, google-sheets.js (fillBluebeam function), and new UI components. No overlap with BTX or Proposal.
8. **No assumptions about current state.** Read and verify first.
9. **Protect working systems.** Test pipeline after changes.
10. **Write a HANDOFF before closing.**

**Your relationship to the Architect:**
Isaac (CEO) relays between you and the lead architect (Claude AI Desktop). You execute.

**Documents to read FIRST:**
- `docs/ARCHITECTURE_BIBLE.md` — Sections 5, 18 (Bluebeam route, unwired routes)
- `docs/MASTER_PLAN_v4.md` — Phase 4

---

## BEFORE YOU DO ANYTHING:
1. Read ARCHITECTURE_BIBLE.md (Sections 5, 18 — Bluebeam route, unwired routes)
2. Read MASTER_PLAN_v4.md (Phase 4)
3. git checkout -b feature/import-v2

## TASKS: 4A.1-4A.6, 4B.1-4B.5, 4C.1-4C.5
## KEY CHANGE: Accumulate instead of overwrite. Wire existing staging routes.
## PARALLEL SAFETY: Only modifies bluebeam/route.js, google-sheets.js (fillBluebeam function), and new UI components. No overlap with BTX or Proposal files.

---
### HANDOFF:

**Status: COMPLETE — All 16 Phase 4 tasks DONE**

**Branch:** `feature/import-v2` (6 commits, ready to merge to main)

**What was done:**

1. **4A.2-3: Accumulation** — `fillBluebeamDataToSpreadsheet()` now batch-reads existing cell values via Sheets API batchGet, then writes `existing + imported`. Returns `previousValue`, `accumulatedTotal` per cell, plus `accumulated` flag and `accumulatedCount`.

2. **4A.4: Enhanced report** — bluebeam/route.js response now includes accumulation details per matched item, structured unmatched data with `unmatchType`, `availableLocations`, `row`, `section` for UI reassignment.

3. **4A.5-6: Drive CSV save** — Uploaded CSV saved to Drive → project folder → Markups/ subfolder. Named `{project}-bluebeam-{YYYY-MM-DD}.csv`. Non-fatal (import works even if Drive save fails).

4. **4B.1-5: Enhanced UploadModal** — Shows accumulation ("X + Y = Z"), unmatched items with location dropdown reassignment, "Accept Selected" button for re-import, CSV-saved-to-Drive indicator. Wider modal, scrollable content.

5. **4C.1-4: Staging routes wired** — All 3 routes (imports, compare, sync) rewritten from dead Python proxy to BigQuery import_history queries. Import recording added to bluebeam route. New ImportHistoryModal with timestamps, match stats, Drive CSV links. "History" button on version tab action bar.

6. **4C.5: Bible updated** — Sections 6, 9, 16, 17, 18 updated.

**Commits (oldest to newest):**
- `3ce57c1` — accumulation logic in fillBluebeamDataToSpreadsheet
- `346f491` — accumulation details in bluebeam route response
- `bd5b855` — Drive CSV save + getAccessToken import
- `552eb85` — enhanced UploadModal + route unmatched data
- `b10dcbc` — staging routes + ImportHistoryModal
- `84929de` — Architecture Bible update

**Files modified:**
- `lib/google-sheets.js` — fillBluebeamDataToSpreadsheet (accumulation)
- `app/api/ko/takeoff/[projectId]/bluebeam/route.js` — Drive save, import recording, enhanced response
- `app/api/ko/takeoff/[projectId]/imports/route.js` — BigQuery-backed
- `app/api/ko/takeoff/[projectId]/compare/[importId]/route.js` — BigQuery-backed
- `app/api/ko/takeoff/[projectId]/sync/[importId]/route.js` — BigQuery-backed
- `components/ko/estimating-center-screen.jsx` — UploadModal + ImportHistoryModal
- `docs/ARCHITECTURE_BIBLE.md` — Sections 6, 9, 16, 17, 18

**No overlap with BTX or Proposal files.** Safe to merge independently.

**BigQuery tracker:** All 16 tasks (4A.1-4A.6, 4B.1-4B.5, 4C.1-4C.5) marked DONE, verified by Session 41.
**Google Sheet:** Synced.

**MANDATORY END-OF-SESSION CHECKLIST:**
1. Update BigQuery tracker: DONE (16 rows updated)
2. Sync to Google Sheet: DONE
3. Write HANDOFF: This section
4. Pass this checklist forward
