# CLAUDE.md - KO Project Context

> **Auto-generated from ~/KO_Session_State/ on 2026-01-22 11:23**
> **Regenerate:** `python3 /home/iwagschal/open_session.py`

---

## Project Overview

**Project:** KO (Chief Agent Officer) - Multi-agent AI system for Master Roofing & Siding
**Owner:** Isaac Wagschal, CEO of Master Roofing & Siding, Founder of A Eye Corp
**Goal:** CEO interface for querying 20+ years of company data via natural language

### Core Principle
> "Zero assumptions, audit everything" - All AI responses must be grounded in verifiable data.

### CRITICAL: project_id is SACRED
```
project_id = MD5 HASH ONLY (32 lowercase hex chars)
VALID:   43a686edd463a2a7c7af7876b883de48
INVALID: PRJ-12345, UUID, anything else

Generation: hashlib.md5(project_name.lower().strip().encode()).hexdigest()

NEVER create non-canonical project_ids. Use different column names for other IDs.
```

---

## Architecture

### This Repository (Frontend)
- **Framework:** Next.js with App Router
- **Location:** `~/v0-master-roofing-ai-2-1u/`
- **Deployment:** Vercel (auto-deploy on push to main)
- **Key Dirs:** `app/`, `components/`, `lib/`, `hooks/`

### Backend (Separate VM)
- **Framework:** Python FastAPI
- **Location:** `mr-dev-box-01:/home/iwagschal/aeyecorp/`
- **URL:** https://34.95.128.208
- **WebSocket:** wss://34.95.128.208/ws/chat

### Data Layer
- **BigQuery Project:** `master-roofing-intelligence`
- **Key Datasets:** `raw_data`, `identity_resolution`, `semantic`

---

## Key URLs

| Service | URL |
|---------|-----|
| Frontend (Prod) | https://v0-master-roofing-ai-2-1u-iwagschal-2035s-projects.vercel.app |
| Backend API | https://34.95.128.208 |
| WebSocket | wss://34.95.128.208/ws/chat |
| BigQuery Console | https://console.cloud.google.com/bigquery?project=master-roofing-intelligence |
| Health Check | `curl -sk https://34.95.128.208/health` |

---

## Session State System

Full project state is maintained in `~/KO_Session_State/`. 

### At Session Start - Read These:
1. `~/KO_Session_State/06_Session_Log/last_session.md` - What happened last time
2. `~/KO_Session_State/02_Current_State/in_progress.md` - Active work
3. `~/KO_Session_State/02_Current_State/whats_broken.md` - Known issues

### During Session - Update These:
- Feature completed → update `whats_working.md`
- Something breaks → add to `whats_broken.md`
- Decision made → add to `decisions_log.md`
- Schema changes → update `03_Data_Warehouse/`

### At Session End - MUST DO:
1. Update `06_Session_Log/last_session.md` with summary
2. Update `02_Current_State/in_progress.md` with current status

---

## Current State Summary

### What's Working
# What's Working

## Frontend
| Feature | Status | Notes |
|---------|--------|-------|
| Chat interface | WORKING | WebSocket streaming with progressive disclosure |
| Voice input (mic) | WORKING | Deepgram STT, fixed AudioContext issue |
| Voice output (TTS) | WORKING | ElevenLabs Flash v2.5 |
| Phase tracker UI | WORKING | Shows 5-phase progress |
| Reports screen | WORKING | Power BI embed placeholder |
| Documents screen | WORKING | Document viewer |
| Responsive layout | WORKING | Mobile + desktop |

## Backend
| Feature | Status | Notes |
|---------|--------|-------|
| FastAPI server | WORKING | Running on port 8000 |
| WebSocket /ws/chat | WORKING | Streaming responses |
| WebSocket /ws/voice | WORKING | Voice streaming |
| HTTPS/SSL | WORKING | Nginx reverse proxy (self-signed) |
| Health endpoint | WORKING | /health returns status |
| Session management | WORKING | chat_history/ folder |

## Bluebeam → Excel Export (NEW - Session 16)
| Feature | Status | Notes |
|---------|--------|-------|
| Bluebeam CSV Converter | WORKING | 100% match rate with legacy patterns |
| Excel Template Generator | WORKING | Uses MR template at /home/iwagschal/ |
| CODE → Row Mapping | WORKING | 40+ item codes mapped to template rows |
| Floor → Column Mapping | WORKING | FL1, FL2, FLCELLAR, etc. |
| Aggregation by CODE | WORKING | Same items combined per floor |
| Unmatched Item Handling | WORKING | Red highlight at row 77+ |
| Frontend Upload Modal | WORKING | "Download Excel Takeoff" button |
| Backend Endpoint | WORKING | `/v1/bluebeam/export-excel` |

### Supported Bluebeam Patterns
| Pattern | Extracted Code |
|---------|---------------|
| River Rock Ballast | OVERBURDEN |
| Artificial Turf | GREEN |
| PTAC Units | AC |
| Paver, Concrete Paver | PAVER |
| W.P., Waterproof | LIQUID-WP |
| Vapor Barrier, VB | VB |
| Drain, Roof Drain | DRAIN |
| Coping, Cope | COPE |
| Traffic Coating | TRAFFIC |
| (40+ more patterns) | See bluebeam_converter.py |

## 5-Phase Agent Flow
| P

### What's Broken
# What's Broken / Known Issues

## Critical Issues
*None currently blocking*

## Medium Priority

### Estimating Center - Projects Not Linked to BigQuery
- **Issue:** Projects created in Estimating Center are NOT saved to BigQuery `project_master`
- **Cause:** Backend endpoint `/api/estimating/projects` doesn't exist; falls back to in-memory storage
- **Impact:**
  - Projects disappear on page refresh / Vercel cold start
  - New project_ids are orphaned (not in canonical project tables)
  - Takeoffs created for these projects exist in GCS but have no BigQuery linkage
- **Workaround:** None - projects must be recreated each session
- **Fix needed:** Build backend endpoint to INSERT into BigQuery when creating projects

### SSL Certificate Warning
- **Issue:** Browser shows "Not Secure" warning for backend
- **Cause:** Self-signed SSL certificate on 34.95.128.208
- **Workaround:** User must accept certificate manually (Advanced → Proceed)
- **Fix:** Get proper SSL cert (Let's Encrypt or GCP-managed)

### Direct SSH Fails
- **Issue:** `ssh iwagschal@34.95.128.208` doesn't work
- **Cause:** SSH key not configured for direct access
- **Workaround:** Use `gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b`
- **Impact:** Minor - gcloud works fine

## Low Priority

### Missing PDFs in GCS
- **Issue:** ~30-35% of proposals fail to download during batch parsing
- **Cause:** Files moved, renamed, or deleted from GCS
- **Impact:** Batch extraction gets ~65% success rate
- **Log

### In Progress
# In Progress

## Current Session: 2026-01-16 (Day 6 of Phase 1, Session 16)

### Completed This Session
| Task | Status | Notes |
|------|--------|-------|
| Replace Google Sheets with Excel export | DONE | Frontend updated, deployed |
| Backend Excel generator | DONE | `/v1/bluebeam/export-excel` working |
| Floor detection fix | DONE | FL1, FL2, FLCELLAR now map correctly |
| Aggregation by CODE | DONE | Same items combined per floor |
| Create handoff document | DONE | See 06_Session_Log/ |

### Bluebeam → Excel System Status: COMPLETE

| Component | Status |
|-----------|--------|
| Bluebeam CSV Converter | WORKING (100% match rate) |
| Excel Template Generator | WORKING |
| CODE → Row Mapping | WORKING (40+ codes) |
| Floor → Column Mapping | WORKING (FL1, FL2, etc.) |
| Unmatched Item Handling | WORKING (red highlight at bottom) |
| Frontend Upload Modal | UPDATED (Download Excel button) |
| Backend Endpoint | WORKING (`/v1/bluebeam/export-excel`) |

---

### Key Files
| File | Location | Purpose |
|------|----------|---------|
| estimating-center-screen.jsx | Frontend | Upload UI, Excel download |
| excel_takeoff_generator.py | Backend | Generates Excel from template |
| bluebeam_converter.py | Backend | CSV parsing, pattern matching |
| Master Roofing takeoff template.xlsx | /home/iwagschal/ | Excel template |

### Handoff Document
Full documentation at:
`/home/iwagschal/KO_Session_State/06_Session_Log/HANDOFF_2026-01-16_Bluebeam_Excel_Export.md`

---

### Next Steps

---

## Agents

# Agent Registry

## Current Agents (Production)

| Agent | Model | Purpose | Status |
|-------|-------|---------|--------|
| **Gemini Orchestrator** | Gemini 2.0 Flash | Project resolution, routing, merging | WORKING |
| **Claude SQL** | Claude 3 | BigQuery SQL generation | WORKING |
| **Vertex Search** | Vertex AI | Document search | WORKING |
| **HubSpot** | API | CRM data access | WORKING |
| **Power BI** | API | Dashboard embedding | WORKING |
| **CEO Response** | OpenAI GPT-4.1 | Final answer generation | WORKING |

---

## Full Agent Registry (ko_audit.agent_registry)

**Source:** BigQuery `ko_audit.agent_registry` table
**Total Agents:** 26
**Created:** 2026-01-12 (Sprint C)

### Deterministic Agents (7)
Python/SQL based - predictable outputs

| ID | Name | Display Name | Description | Category |
|----|------|--------------|-------------|----------|
| DET-001 | email_scanner | Email Scanner | Scans mr_brain for new emails, updates tables | email |
| DET-002 | asana_sync | Asana Sync | Syncs Asana tasks to BigQuery and HubSpot | sync |
| DET-003 | takeoff_parser | Takeoff Parser | Parses Bluebeam exports into structured data | takeoff |
| DET-004 | proposal_matcher | Proposal Matcher | Matches proposals to takeoffs by total | proposal |
| DET-005 | sage_sync | Sage Sync | Imports Sage accounting data | sync |
| DET-006 | hubspot_sync | HubSpot Sync | Syncs data to HubSpot CRM | sync |
| DET-007 | transcript_processor | Transcript Processor | Processes raw transcripts into structured sessions | audit |

### Interpretive Agents (9)
LLM based - creative/analytical outputs

| ID | Name | Display Name | Description | Category |
|----|------|--------------|-------------|----------|
| INT-001 | email_analyzer | Email Analyzer | Analyzes emails for priority, sentiment, action needed | email |
| INT-002 | email_drafter | Email Drafter | Drafts emails in employee voice based on history | email |
| INT-003 | takeoff_generator | Takeoff Generator | Generates takeoff from Bluebeam + GC history | takeoff |
| INT-004 | proposal_generator | Proposal Generator | Generates proposal from approved takeoff | proposal |
| INT-005 | project_summarizer | Project Summarizer | Creates project intelligence summaries | intelligence |
| INT-006 | gc_profiler | GC Profiler | Builds GC preference profiles from history | intelligence |
| INT-007 | rfi_responder | RFI Responder | Suggests RFI answers from historical responses | communication |
| INT-008 | session_summarizer | Sessi

---

## BigQuery Reference

**Project:** `master-roofing-intelligence`

### Key Tables
- `raw_data.proposals` - 14,000+ parsed proposals
- `raw_data.raw_takeoffs_azure` - 431,001 takeoff line items  
- `identity_resolution.canonical_projects` - Unified project records
- `semantic.vw_agent_projects` - Agent-facing view

### Important Rules
- NEVER modify production tables directly
- Always use views for agent queries
- All queries must include audit trail columns

See full schema: `~/KO_Session_State/03_Data_Warehouse/bigquery_tables.md`

---

## Quick Commands
```bash
# Check backend health
curl -sk https://34.95.128.208/health

# Deploy frontend (from this directory)
git add -A && git commit -m "update" && git push origin dev:main --force

# SSH to backend VM  
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b

# View backend logs
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="tail -50 /home/iwagschal/aeyecorp/uvicorn.log"

# Regenerate this file
python3 /home/iwagschal/open_session.py
```

---

## Code Conventions

### Frontend (This Repo)
- Use existing component patterns in `components/`
- Tailwind for styling
- Keep API calls in `lib/` or `hooks/`

### Backend
- Follow existing FastAPI patterns
- All agents in `/agents/` directory
- Comprehensive error handling with audit logs

### General
- Clear variable names over comments
- Small, focused functions
- Test locally before deploying

---

## HubSpot Integration Notes

- "Deals" object is renamed to "Jobs" in Master Roofing's HubSpot
- Project tracking fields are in the "PROJECT" group
- **STRICT RULE:** Never create/update HubSpot without explicit Isaac approval

---

## Do NOT

1. Modify production BigQuery tables directly
2. Create/update HubSpot records without approval
3. Deploy without testing locally first
4. Assume - ask Isaac if unclear
5. Batch session updates - update files as you go

---

## Parking Lot (Future Ideas)

# Parking Lot

## Ideas to Revisit Later

### Data Quality
| Idea | Priority | Notes |
|------|----------|-------|
| Improve match rate beyond 75% | MEDIUM | Address root files, more fuzzy matching |
| Recover missing GCS files | LOW | 35% of proposals missing from GCS |
| Add more GC consolidation rules | ONGOING | As new variations discovered |
| Standardize takeoff units (LF, SF, EA) | LOW | Useful for rate analysis |

### Features
| Idea | Priority | Notes |
|------|----------|-------|
| Email agent (Gmail) | HIGH | Phase 2, needs domain delegation |
| Google Chat agent | MEDIUM | Phase 2 |
| Asana live sync | MEDIUM | Currently static import |
| Bluebeam auto-populate | MEDIUM | Item #33 |
| Proposal generator from templates | HIGH | Phase 2, Item #39 |

### Infrastructure
| Idea | Priority | Notes |
|------|----------|-------|
| Proper SSL certificate | MEDIUM | Replace self-signed with Let's Encrypt |
| Direct SSH access | LOW | Currently requires gcloud |
| Automated backups | 

---

## Last Session Summary

# Last Session

## Session Info
| Property | Value |
|----------|-------|
| Date | 2026-01-16 (Session 16) |
| Focus | Bluebeam to Excel Export System |
| Day | Day 6 of Phase 1 |
| Key Win | **Replaced Google Sheets with direct Excel export using MR template** |

---

## What Was Accomplished

### Bluebeam → Excel Export System - COMPLETE

Replaced the Google Sheets integration with a direct Excel export that uses the exact Master Roofing template format.

| Component | Status | Notes |
|-----------|--------|-------|
| Backend Excel Generator | WORKING | `/v1/bluebeam/export-excel` endpoint |
| Frontend Upload Modal | UPDATED | "Download Excel Takeoff" button |
| Template Row Mapping | WORKING | CODE_TO_ROW for 40+ item types |
| Floor Detection | WORKING | FL1, FL2, FL Cellar → correct columns |
| Aggregation | WORKING | Same CODE items combined by floor |
| Unmatched Items | WORKING | Red highlighted at bottom (row 77+) |

### Files Modified

**Frontend (v0-master-roofing-ai-2-1u):**
- `components/ko/estimating-center-screen.jsx`
  - Removed Google Sheets integration (handleCreateSheet, populateGoogleSheet)
  - Added `handleExportExcel` function
  - Updated upload modal: "Download Excel Takeoff" instead of Google Sheets

**Backend (aeyecorp on VM 136.111.252.120):**
- `app/tools/excel_takeoff_generator.py` - Excel generation with aggregation
- `app/main.py` - `/v1/bluebeam/export-excel` endpoint

---

## System Flow

```
User uploads CSV → Backend converts → Backend generates Excel → User downloads
```

1. **Upload**: User clicks "Upload Bluebeam" in Estimating Center
2. **Convert**: Backend parses CSV with legacy pattern matching (100% match rate)
3. **Generate**: Backend fills MR template, adds unmatched items at bottom
4. **Download**: Browser downloads `{ProjectName}_Takeoff.xlsx`

---

## Key Technical Details

### Template Mapping (excel_takeoff_generator.py)

```python
CODE_TO_ROW = {
    'VB': 4, 'PITCH': 5, 'ROOF-2PLY': 6, 'DRAIN': 15,
    'DOOR-STD': 16

---

*Auto-generated by generate_claude_md.py - Do not edit directly*
*Source: ~/KO_Session_State/*
*Regenerate: `python3 /home/iwagschal/open_session.py`*
