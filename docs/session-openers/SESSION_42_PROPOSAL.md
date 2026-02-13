# SESSION 42: PROPOSAL v2 (Sortable + Enhanced)
# Phase 5 from MASTER_PLAN_v4.md
# CAN RUN PARALLEL with Sessions 40, 41
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
7. **Stay in your lane.** Only modify preview/route.js, generate/route.js, TakeoffProposalPreview component. No overlap with BTX or Import.
8. **No assumptions about current state.** Read and verify first.
9. **Protect working systems.** Test pipeline after changes.
10. **Write a HANDOFF before closing.**

**Your relationship to the Architect:**
Isaac (CEO) relays between you and the lead architect (Claude AI Desktop). You execute.

**Documents to read FIRST:**
- `docs/ARCHITECTURE_BIBLE.md` — Sections 5, 10 (Proposal routes, Description composition)
- `docs/MASTER_PLAN_v4.md` — Phase 5

---

## BEFORE YOU DO ANYTHING:
1. Read ARCHITECTURE_BIBLE.md (Sections 5, 10 — Proposal routes, Description composition)
2. Read MASTER_PLAN_v4.md (Phase 5)
3. git checkout -b feature/proposal-v2

## TASKS: 5.1-5.10
## KEY CHANGE: Drag-to-sort sections and items in preview. Pass sort order to generate.
## PARALLEL SAFETY: Only modifies preview/route.js, generate/route.js, TakeoffProposalPreview component. No overlap with BTX or Import files.

---
### HANDOFF:

**Status: PHASE 5 COMPLETE** (all 10 tasks: 5.1-5.10)
**Branch:** `feature/proposal-v2`
**Commit:** `f85217a`
**Build:** Passes
**BigQuery tracker:** Updated (10 rows → DONE)
**Google Sheet:** Synced

### What was done:
1. **5.1** Verified: preview reads version-specific sheet via `?sheet=` param (already done in Phase 0D)
2. **5.2** Verified: BASE/ALT split correctly separates items in preview and generate
3. **5.3** Added: drag-to-sort SECTIONS in TakeoffProposalPreview (@dnd-kit/sortable)
4. **5.4** Added: drag-to-sort ITEMS within each section (nested DndContext per section)
5. **5.5** Added: `sortOrder` passed from UI → generate route → `applySortOrder()` reorders data
6. **5.6** Added: version date (sheet name) in proposal template data as `version_date`
7. **5.7** Updated: proposal naming to `{project}-proposal-{version_date}-{timestamp}.docx`
8. **5.8** Verified: Drive upload works with version-aware filename
9. **5.9** Added: version tracker status updated to "Proposal Generated" after DOCX generation
10. **5.10** Updated: Architecture Bible Sections 5, 10, 17 + dependencies

### Files modified:
- `components/ko/takeoff-proposal-preview.jsx` — Full rewrite with @dnd-kit drag-to-sort
- `app/api/ko/proposal/[projectId]/generate/route.js` — sortOrder, version naming, tracker link
- `docs/ARCHITECTURE_BIBLE.md` — Sections 5, 10, 17 updated
- `package.json` — @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities added

### Dependencies added:
- `@dnd-kit/core` ^6.3.1
- `@dnd-kit/sortable` ^10.0.0
- `@dnd-kit/utilities` ^3.2.2

### What was NOT touched (parallel safety):
- No changes to BTX routes or components
- No changes to Import routes or components
- No changes to Setup tab or version management
- No changes to estimating-center-screen.jsx

### Next steps (for future sessions):
- Merge `feature/proposal-v2` to `main`
- Phase 6: Add Item Pipeline
- Phase 7: Bluebeam Tool Manager
- Phase 10: Wizard cleanup + migration (last)

### MANDATORY END-OF-SESSION CHECKLIST:
1. ✅ BigQuery tracker updated: Phase 5 → DONE, session_completed='42'
2. ✅ Google Sheet synced via `node scripts/sync-tracker-to-sheet.mjs`
3. ✅ HANDOFF written
4. **Pass this checklist forward** — include in every HANDOFF so the next session knows
