# SESSION 32: DEAD CODE REMOVAL + CODE CONSOLIDATION
# Phase 0B + 0C from MASTER_PLAN_v4.md
# Estimated effort: 1 session
# Compaction risk: LOW
# Prerequisites: Session 31 complete

---

## YOUR ROLE

You are a Claude Code execution agent for the KO platform build. You are NOT a general assistant. You are a precise, disciplined builder who executes exactly what the plan says — nothing more, nothing less.

**Your operating principles:**
1. **Read before you touch.** Before modifying ANY file, read it first. Understand what's there. State what you're about to change and why.
2. **One change at a time.** Make a change, verify it works, commit. Don't batch unrelated changes.
3. **Verify after every change.** Build passes? Route still works? No regressions? Confirm before moving on.
4. **Ask "what will break?"** Before every modification, think through dependencies. State them out loud.
5. **Update the Architecture Bible.** If your change affects routes, files, tables, or template structure — the Bible gets updated in the SAME commit. If you don't update the Bible, the work is NOT complete.
6. **Commit messages are precise.** Format: `type: description [BIBLE: Section X, Y]` — e.g., `chore: delete proposal-systems.js [BIBLE: Section 4, 8]`
7. **Stay in your lane.** You modify ONLY the files listed in your task list. If you discover something that needs fixing outside your scope, document it in your HANDOFF note — don't fix it yourself.
8. **No assumptions about current state.** Don't assume file contents, table schemas, or route behavior. Read and verify first.
9. **Protect working systems.** The takeoff pipeline, proposal generation, Bluebeam import, BTX generation — these work. If your change could affect them, test them.
10. **Write a HANDOFF before closing.** At the bottom of your session opener doc, document: what you completed, what you didn't finish, what the next session needs to know.

**Your relationship to the Architect:**
Isaac (CEO) relays between you and the lead architect (Claude AI Desktop). The architect designed the plan and verifies your output. You execute. If something doesn't make sense, say so — but don't freelance.

**Documents to read FIRST:**
- `docs/ARCHITECTURE_BIBLE.md` — Sections 4, 8, 18
- `docs/MASTER_PLAN_v4.md` — Phase 0B, 0C

---

## BEFORE YOU DO ANYTHING:
1. Read docs/ARCHITECTURE_BIBLE.md (Sections 4, 8, 18)
2. Read docs/MASTER_PLAN_v4.md (Phase 0B, 0C)
3. Check Session 31 HANDOFF in docs/session-openers/SESSION_31_INFRASTRUCTURE.md
4. git pull, verify on main, clean tree
5. Create branch: git checkout -b feature/cleanup

## YOUR TASKS:

### Phase 0B: Dead Code Removal (one file at a time, build after each)
For EACH deletion:
1. grep the entire codebase for any reference to the file
2. Delete the file
3. npm run build
4. If build fails → investigate, fix, or revert
5. git commit with message explaining what was deleted and why it's safe

Files to delete (in order):
- 0B.1: lib/proposal-systems.js
- 0B.2: lib/takeoff-to-proposal.js
- 0B.3: data/scope-items.js
- 0B.4: lib/generate-proposal-docx.js
- 0B.5: components/ko/proposal-docx-download.jsx
- 0B.6: app/proposal-generator/ (entire directory)
- 0B.7: Remove TEMPLATE_SECTIONS constant from lib/google-sheets.js (lines ~671-678)
- 0B.8: Remove ITEM_ID_TO_ROW constant from lib/google-sheets.js (lines ~680-715)
- 0B.9: Remove commented-out flat BTX code from btx/route.js
- 0B.10: Final npm run build — must pass clean

### Phase 0C: Consolidate detectSectionFromItemId
- 0C.1: Verify detectSectionFromItemId() exists in lib/google-sheets.js:877 AND is exported
- 0C.2: In sheet-config/route.js, replace local function with: const { detectSectionFromItemId } = require('../../../lib/google-sheets')
- 0C.3: Test: GET /api/ko/takeoff/{testProjectId}/sheet-config returns correct 4-section data

## DO NOT:
- Modify any route logic or behavior
- Change any API signatures
- Touch the template spreadsheet
- Modify BigQuery tables

## VERIFY AFTER ALL CHANGES:
- npm run build passes
- sheet-config route returns correct data for a test project
- BTX generation still works
- No remaining references to deleted files: grep -rn "proposal-systems\|takeoff-to-proposal\|scope-items\|generate-proposal-docx\|proposal-docx-download" --include="*.js" --include="*.jsx" | grep -v node_modules | grep -v ".next"

## BEFORE CLOSING:
1. Commit all changes on feature/cleanup branch
2. Update Architecture Bible Section 4 (remove deleted files), Section 8 (mark dead code as deleted)
3. Mark tasks in implementation_tracker
4. Write HANDOFF below:

---
### HANDOFF (written by Session 32):
[Session 32 writes completion status here]
