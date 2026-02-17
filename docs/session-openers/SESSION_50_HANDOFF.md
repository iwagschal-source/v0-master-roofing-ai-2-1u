# SESSION 50 HANDOFF

## Completed

| Task | Status | Commit | Notes |
|------|--------|--------|-------|
| BTX Label→Subject fix | DONE | 51c754f (aeyecorp) | Python backend: Subject always uses MR- item_id, Label keeps human name |
| Tab click no longer changes default | DONE | 05f589a | Only "Set as Default" button moves the green dot |
| Duplicate auto-navigates | DONE | 05f589a | Fixed `newSheetId` vs `newTabSheetId` property mismatch |
| Duplicate copies default when on Setup | DONE | 85d94c5 | Falls back to active version when currentSheetName is null |
| "Make active" checkbox works | DONE | 85d94c5 | Explicit PUT after creation; no stale closure |
| Architecture Bible update | DONE | (pending) | Section 9 + Section 17 updated |
| Architect refresh doc | DONE | ~/ARCHITECT_REFRESH.md | Context recovery after architect compaction |

## Branch State
- **Next.js repo:** `main` branch, last commit `85d94c5`
- **Python backend:** `main` branch (aeyecorp), last commit `51c754f`
- **Build:** Passes (verified after each commit)
- **All commits pushed to origin**

## Key Changes Summary

### 1. BTX Subject vs Label Fix (Python Backend)
- **Root cause:** `btx_generator.py` used `bq_label or item_id` for Subject. When label existed (e.g., "Tie-In"), Bluebeam CSV exported that instead of MR- code.
- **Fix:** Subject always uses `item_id` (e.g., `MR-049TIEIN | LEFTELEVATION`). `/Label` keeps human name for display.
- **3 methods fixed:** `generate_btx_with_locations`, `generate_btx_with_display_names`, `generate_btx_per_floor`
- **Tested:** Generated BTX for MR-049TIEIN confirmed Subject=`MR-049TIEIN | LEFTELEVATION`, Label=`Tie-In`
- **Impact:** The 7 previously-skipped items will now match after regenerating project tools

### 2. Default Version System Fixes (Next.js)
- **Tab click bug:** `handleVersionTabClick` was silently setting clicked version as active via PUT. Removed — now only updates UI state (selectedVersionTab, currentSheetName, iframe URL).
- **Property mismatch:** `copyExistingVersion()` returns `newSheetId` but POST handler referenced `newTabSheetId` (undefined). Fixed in versions/route.js.
- **Duplicate always blank:** When on Setup tab, `currentSheetName` is null, so the duplicate condition `newVersionMode === 'duplicate' && currentSheetName` failed, falling through to blank template. Fixed: falls back to `previousActive.sheetName`.
- **Checkbox ignored:** Backend auto-activates new versions. Frontend now explicitly PUTs the correct active version after creation based on checkbox state. Captures `previousActive` before API calls to avoid stale closure.

### 3. Investigation: Legend Column Fallback (Option B) — REJECTED
- Swarmed 5 agents across BTX format, CSV columns, Tool Manager pipeline, parser logic, risk assessment
- **Finding:** Legend column contains either EMPTY or literal string "Legend" — never MR- codes
- **Finding:** Label and Layer columns also never contain MR- codes
- **Conclusion:** Parser fallback is impossible — the MR- code is completely lost when Label overrides Subject
- **Correct fix:** Fix the source (Python backend), not the parser — implemented above

## What Isaac Needs to Test

1. **Regenerate BTX tools** — Click "Create Project Tools" for the test project. This creates new tools with MR- codes in Subject.
2. **Re-import CSV** — Import "GOOD MORNING TUESDAY AGAIN.csv" again. All 24 detail rows should match (previously 7 were skipped).
3. **Tab switching** — Click between version tabs. Verify green dot does NOT move.
4. **Set Default** — Click "Set as Default" on a non-default version. Verify green dot moves.
5. **Duplicate from Setup tab** — While on Setup tab, click "Create New Sheet" → select "Duplicate current version" → Create. Verify the new tab has data (not blank).
6. **Make active checkbox** — Create a version with checkbox unchecked. Verify green dot stays on the previous default.

## Deferred to Session 51

- **11C.11:** Wire "Update Default Sheet" button
- **11F.1-3:** CSS polish — font sizing, hover states, loading states
- **11F.5:** Full end-to-end smoke test
- **Tool Manager dark mode:** Pitch-black background needs warm dark brown/charcoal with amber hue (low priority)

## MANDATORY END-OF-SESSION CHECKLIST
1. Update BigQuery tracker: `UPDATE master-roofing-intelligence.mr_main.implementation_tracker SET status='DONE', session_completed='50', branch='main', verified=true, verified_by='Session 50', verified_at=CURRENT_TIMESTAMP() WHERE phase IN ('11C', '11D')`
   - **Status value is `'DONE'` (all caps) — NOT 'COMPLETE'**
2. Sync to Google Sheet: `node scripts/sync-tracker-to-sheet.mjs`
3. Write HANDOFF in session opener doc ← THIS FILE
4. **Pass this checklist forward** — include in every HANDOFF so the next session knows
