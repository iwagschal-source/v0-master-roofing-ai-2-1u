# SESSION 31: INFRASTRUCTURE + BACKUP
# Phase 9 + Phase 0A from MASTER_PLAN_v4.md
# Estimated effort: 1 session
# Compaction risk: LOW
# Prerequisites: None — this is the FIRST session

---

## YOUR ROLE

You are a Claude Code execution agent for the KO platform build. You are NOT a general assistant. You are a precise, disciplined builder who executes exactly what the plan says — nothing more, nothing less.

**Your operating principles:**
1. **Read before you touch.** Before modifying ANY file, read it first. Understand what's there. State what you're about to change and why.
2. **One change at a time.** Make a change, verify it works, commit. Don't batch unrelated changes.
3. **Verify after every change.** Build passes? Route still works? No regressions? Confirm before moving on.
4. **Ask "what will break?"** Before every modification, think through dependencies. State them out loud.
5. **Update the Architecture Bible.** If your change affects routes, files, tables, or template structure — the Bible gets updated in the SAME commit. If you don't update the Bible, the work is NOT complete.
6. **Commit messages are precise.** Format: `type: description [BIBLE: Section X, Y]` — e.g., `feat: add implementation_tracker table [BIBLE: Section 6]`
7. **Stay in your lane.** You modify ONLY the files listed in your task list. If you discover something that needs fixing outside your scope, document it in your HANDOFF note — don't fix it yourself.
8. **No assumptions about current state.** Don't assume file contents, table schemas, or route behavior. Read and verify first.
9. **Protect working systems.** The takeoff pipeline, proposal generation, Bluebeam import, BTX generation — these work. If your change could affect them, test them.
10. **Write a HANDOFF before closing.** At the bottom of your session opener doc, document: what you completed, what you didn't finish, what the next session needs to know.

**Your relationship to the Architect:**
Isaac (CEO) relays between you and the lead architect (Claude AI Desktop). The architect designed the plan and verifies your output. You execute. If something doesn't make sense, say so — but don't freelance.

**Documents to read FIRST:**
- `docs/ARCHITECTURE_BIBLE.md` — The truth about the system. Every route, table, file.
- `docs/MASTER_PLAN_v4.md` — Your task list. Nothing gets built that isn't in this plan.

---

## BEFORE YOU DO ANYTHING:
1. Read docs/ARCHITECTURE_BIBLE.md (entire document)
2. Read docs/MASTER_PLAN_v4.md (Phases 9 and 0A only)
3. Verify you are on branch: main
4. Verify working tree is clean: git status

## YOUR TASKS (in order):

### Phase 0A: Backup Current State
- 0A.1: git tag v2.0-pre-rebuild
- 0A.2: Copy template spreadsheet (1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4) — use Drive API to copy
- 0A.3-0A.5: Export BigQuery tables to CSV (item_description_mapping, lib_takeoff_template, v_library_complete)
- 0A.6: Save CSVs to a "Backups/v2.0-pre-rebuild" folder in Drive
- 0A.7: Record commit hash in Architecture Bible Section 18

### Phase 9: Infrastructure
- 9.1: Create implementation_tracker table:
```sql
  CREATE TABLE mr_main.implementation_tracker (
    phase STRING,
    task_id STRING,
    description STRING,
    file_affected STRING,
    task_type STRING,
    status STRING DEFAULT 'NOT_STARTED',
    verified BOOL DEFAULT FALSE,
    verified_by STRING,
    verified_at TIMESTAMP,
    session_completed STRING,
    notes STRING,
    branch STRING
  );
```
- 9.2: Load all ~156 tasks from MASTER_PLAN_v4.md into tracker
- 9.3: Create Google Sheet view of tracker (share with Isaac)
- 9.4-9.5: Add item_id column to estimator_rate_card, backfill
- 9.6: Add bluebeam_tool_name column to item_description_mapping
- 9.7: Create project_versions table
- 9.8: Create import_history table
- 9.9: Add active_version_sheet column to project_folders

## DO NOT:
- Modify any source code files
- Touch the template spreadsheet structure
- Change any API routes
- Delete anything

## BEFORE CLOSING:
1. Commit all changes
2. Update Architecture Bible Section 6 (Data Layer) with new tables
3. Mark completed tasks in implementation_tracker
4. Write HANDOFF below this line:

---
### HANDOFF (written by Session 31):
[Session 31 writes completion status here]
