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
[Session 37 writes completion status here]
