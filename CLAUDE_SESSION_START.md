# KO PLATFORM SPRINT - SESSION STARTUP

## READ THIS FIRST
You are continuing a tracked sprint. Previous session: cc_20260127_2033

## TRACKING SYSTEM
- **BigQuery Table:** `master-roofing-intelligence.aeyey_dev.ko_final_sprint`
- **Record types:** 'step', 'error_fix', 'checkpoint'
- **Status values:** 'not_started', 'in_progress', 'blocked', 'done'

## SESSION PROTOCOL
1. Generate new session_id: `cc_YYYYMMDD_HHMM`
2. Read last checkpoint:
```sql
   SELECT * FROM `master-roofing-intelligence.aeyey_dev.ko_final_sprint`
   WHERE record_type = 'checkpoint'
   ORDER BY created_at DESC LIMIT 1;
```
3. Before each step: Update status to 'in_progress'
4. After each step: Update status to 'done', commit, push, get visual verification from Isaac
5. On errors: Log with record_type = 'error_fix'
6. At 60% context: Alert Isaac. At 75%: MANDATORY checkpoint

## CURRENT STATUS
- Phase 1: DONE (Shell Cleanup)
- Phase 2: DONE (BigQuery Infrastructure + Data Import)
- Phase 3: NEXT (Project Folders - import from V0)
- Phase 4-9: Not started

## PHASE 3 STEPS (Project Folders)
- 3.1: Import V0 Folder List View
- 3.2: Import V0 Folder Detail View
- 3.3: Import V0 Analytics View
- 3.4: Add Project Folders to main nav
- 3.5: Connect to BigQuery
- 3.6: Build Create New Project functionality
- 3.7: Add duplicate name validation

## CRITICAL: BigQuery Dataset Locations
- **mr_main dataset: REGION = US** (not us-east4)
- **aeyey_dev dataset: REGION = US**
- Always verify dataset region before queries
- API routes must pass `{ location: 'US' }` for mr_main queries

## KEY INFO
- Dataset: `master-roofing-intelligence.mr_main`
- Tables: contacts_companies (29), contacts_people (29), project_folders, project_documents, project_communications
- Branch: dev (work here, merge to main for production)
- Verify changes visually via localhost:3000 tunnel before marking done

## GIT WORKFLOW
- All work on `dev` branch
- Commit after each step with clear message
- Push to origin/dev
- Isaac verifies, then log to BigQuery

## FIRST ACTIONS FOR NEW SESSION
1. Read this file
2. Generate session_id
3. Query checkpoint from BigQuery
4. Confirm ready with Isaac
5. Wait for V0 Project Folders code
6. Begin Phase 3
