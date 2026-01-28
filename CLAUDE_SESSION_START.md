# KO PLATFORM SPRINT - SESSION STARTUP

## READ THIS FIRST
You are continuing a tracked sprint. Previous session: cc_20260128_0332

## CURRENT SPRINT STATUS
- Phase 1: ✅ DONE (Shell Cleanup)
- Phase 2: ✅ DONE (BigQuery Infrastructure)
- Phase 3: ✅ DONE (Project Folders)
- Phase 4: ✅ DONE (Contacts)
- Phase 5: ✅ DONE (Gmail Integration)
- Phase 6: NOT STARTED (Google Chat) - 3 steps
- Phase 7: NOT STARTED (Users) - 1 step
- Phase 8: NOT STARTED (Estimating Center) - 7 steps
- Phase 9: NOT STARTED (Testing) - 8 steps
- Phase 10: NOT STARTED (Asana) - 5 steps

## PHASE 6 STEPS (Google Chat) - NEXT
- 6.1: Keep Google Chat as separate page
- 6.2: Add "Log to project" dropdown per conversation
- 6.3: Wire chat logging to BigQuery

## PHASE 5 STEPS (Gmail Integration) - COMPLETE
- 5.1: 3-panel layout - DONE
- 5.2: Draggable dividers - DONE
- 5.3: Draft options panel - DONE
- 5.4: Draft selection behavior - DONE
- 5.5: Regenerate button - DONE
- 5.6: AI chat panel UI - DONE
- 5.7: Document email_drafts schema - DONE
- 5.8: Log to Project dropdown - DONE
- 5.9: Wire email logging to BigQuery - DONE

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
- `/api/ko/project-folders` - Full CRUD (GET, POST) for project folders
- `/api/ko/email-drafts` - GET (fetch drafts), PUT (update status)
- `/api/ko/project-communications` - GET (fetch), POST (log email to project)

## TABLES

### mr_main.contacts_companies
Company records for contacts system.

### mr_main.contacts_people
Person records linked to companies.

### mr_main.project_folders
Project folder records with company/contact associations.

### mr_main.project_documents
Documents associated with projects.

### mr_main.project_communications
Email/chat logged to projects:
- id, project_id, comm_type, source_id, subject, content
- from_address, to_address, comm_date, notes
- created_at, updated_at

### mr_main.email_drafts
Agent-generated email reply drafts:
- id (STRING, REQUIRED): Primary key
- user_email (STRING, REQUIRED): KO user this draft is for
- thread_id (STRING): Gmail thread ID
- original_email_id (STRING): Gmail message ID replying to
- from_address, to_address, subject (STRING)
- draft_number (INT64): 1, 2, or 3
- draft_text (STRING): Generated draft content
- status (STRING, default 'pending'): pending/selected/edited/sent/discarded
- agent_id (STRING): Which agent generated this
- generated_at, selected_at, sent_at (TIMESTAMP)
- project_id (STRING): If logged to project folder
- created_at, updated_at (TIMESTAMP, auto)

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
5. Continue from Phase 6 Step 6.1 (Google Chat)
