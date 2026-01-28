# KO PLATFORM SPRINT - SESSION STARTUP

## READ THIS FIRST
You are continuing a tracked sprint. Previous session: cc_20260127_2240

## CURRENT SPRINT STATUS
- Phase 1: DONE (Shell Cleanup)
- Phase 2: DONE (BigQuery Infrastructure)
- Phase 3: DONE (Project Folders)
- Phase 4: IN PROGRESS (Contacts) - Steps 4.1-4.3 done, 4.4 next
- Phases 5-9: Not started

## PHASE 4 STEPS (Contacts)
- 4.1: Companies view - DONE
- 4.2: People view - DONE
- 4.3: BigQuery CRUD - DONE
- 4.4: Company selector - NEXT
- 4.5: Add/Edit Company modal - not_started
- 4.6: Add/Edit Person modal - not_started

## CRITICAL: BigQuery Dataset Locations
- **mr_main dataset: REGION = US** (not us-east4)
- **aeyey_dev dataset: REGION = US**
- Always verify dataset region before queries
- API routes must pass `{ location: 'US' }` for mr_main queries

## CRITICAL: Service Account Auth
- Configured in .env.local as GOOGLE_APPLICATION_CREDENTIALS
- Points to: /home/iwagschal/.gcp/workspace-ingest.json
- Service account: workspace-ingest@master-roofing-intelligence.iam.gserviceaccount.com

## API ROUTES
- `/api/ko/contacts` - Full CRUD (GET, POST, PUT, DELETE) for companies and people
- `/api/ko/project-folders` - Full CRUD for project folders

## TRACKING SYSTEM
- **BigQuery Table:** `master-roofing-intelligence.aeyey_dev.ko_final_sprint`
- **Record types:** 'step', 'error_fix', 'checkpoint'
- **Status values:** 'not_started', 'in_progress', 'blocked', 'done'
- **NOTE:** Phase 3/4 were swapped. BigQuery step IDs: step_3_x = Phase 4, step_4_x = Phase 3

## SESSION PROTOCOL
1. Read this file FIRST
2. Generate session_id: `cc_YYYYMMDD_HHMM`
3. Query BigQuery for last checkpoint and step statuses
4. Confirm understanding before starting work
5. At 50% context: checkpoint immediately
6. Mark steps done in BigQuery after visual verification

## KEY INFO
- Dataset: `master-roofing-intelligence.mr_main`
- Tables: contacts_companies (29), contacts_people (29), project_folders (2)
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
3. Query checkpoint from BigQuery:
```sql
SELECT * FROM `master-roofing-intelligence.aeyey_dev.ko_final_sprint`
WHERE record_type = 'checkpoint'
ORDER BY created_at DESC LIMIT 1;
```
4. Confirm ready with Isaac
5. Continue from Step 4.4 (Company selector)
