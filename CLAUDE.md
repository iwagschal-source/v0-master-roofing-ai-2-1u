# CLAUDE.md - KO Project Context

> **Auto-generated from ~/KO_Session_State/ on 2026-01-12 20:37**
> **Regenerate:** `python3 ~/generate_claude_md.py`

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

## 5-Phase Agent Flow
| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Project Resolution | WORKING | Gemini extracts project mentions → v_project_lookup |
| Phase 1: Query Routing | WORKING | Gemini decides which tools |
| Phase 2: Tool Execution | WORKING | Claude SQL, Vertex, HubSpot run with project_id filter |
| Phase 3: Result Merge | WORKING | Gemini combines outputs |
| Phase 4: CEO Response | WORKING | OpenAI generates final answer |

## Data Warehouse

### Project ID System (CANONICAL ONLY)
| Feature | Status | Notes |
|---------|--------|-------|
| **project_master** | WORKING | 1,529 canonical projects (single `project_id` column) |
| **project_id_canonical_map** | WORKING | 8,828 mappings → 5,037 canonical IDs |
| **dim_project_v2** | WORKING | 5,002 unique projects in mr_core |

### Core Tables (Canonical IDs)
| Table | Status | Notes |
|-------|--------|-------|
| extracted_facts_v2 | WORKING | 68,505 facts across 1,099 projects |
| proposal_takeoff_unified_v2 | WORKING | 52,511 rows |
| proposal_takeoff_matches_v9 | WORKING | 4,430 matches 

### What's Broken
# What's Broken / Known Issues

## Critical Issues
*None currently blocking*

## Medium Priority

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
- **Logged in:** `/home/iwagschal/parsed_proposals_errors.json`

### Unmatched Projects
- **Issue:** 25% of proposals don't match to takeoffs
- **Cause:** Different folder naming conventions, root-level files
- **Impact:** Incomplete project linking
- **Details:** See MR_DATA_ARCHITECTURE_AUDIT.md Section 4.7

### Vercel Git Author Error (Intermittent)
- **Issue:** `npx vercel deploy` sometimes fails with "Git author must have access"
- **Workaround:** Use Vercel API method or git push to main
- **Details:** See DEPLOYMENT_GUIDE.md

## Monitoring Notes
| What to Watch | Threshold | Action |
|---------------|-----------|--------|


### In Progress
# In Progress

## Current Session: 2026-01-12 (Day 5 of Phase 1, Session 15)

### Completed This Session
| Task | Status | Notes |
|------|--------|-------|
| Sprint G Model Arena Review | DONE | All backend components working |
| Nginx routing fix | DONE | Added /arena/* proxy rules |
| Frontend integration verified | DONE | Dashboard accessible via nav |

### Sprint G Status: RESTORED

The Model Arena system is now fully operational:

| Component | Status |
|-----------|--------|
| Backend API | WORKING |
| Model Registry (38 models) | WORKING |
| Universal Model Caller | WORKING |
| Test Orchestrator | WORKING |
| Ranking Engine | WORKING |
| Live Dashboard | WORKING |
| Agent Promoter | WORKING |
| Re-test Scheduler | WORKING |
| Nginx Routing | FIXED |

### Next Steps (Future Sessions)
| Task | Priority | Notes |
|------|----------|-------|
| End-to-end arena test | HIGH | Run full model comparison |
| WebSocket streaming test | MEDIUM | Verify through nginx |
| Add more agents to scheduler | LOW | Currently only test_agent_promotion |
| Integrate with KO agent | HIGH | Natural language queries over email |

---

## Parking Lot
- Gmail agent integration (Phase 2)
- Google Chat agent (Phase 2)
- Asana live sync


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
python3 ~/generate_claude_md.py
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
| Date | 2026-01-12 (Session 15) |
| Focus | Sprint G Model Arena Restoration |
| Day | Day 5 of Phase 1 |
| Key Win | **Fixed nginx routing - Model Arena dashboard now functional** |

---

## What Was Accomplished

### Sprint G: Model Arena (TST-001) - Status Restored

#### Backend Components (Already Working)
All backend components were already created and functional:

| File | Purpose | Status |
|------|---------|--------|
| `app/model_arena/__init__.py` | Module init | WORKING |
| `app/model_arena/api.py` | REST API endpoints | WORKING |
| `app/model_arena/bigquery_helper.py` | BigQuery operations | WORKING |
| `app/model_arena/model_caller.py` | Universal LLM caller | WORKING |
| `app/model_arena/orchestrator.py` | Test orchestration | WORKING |
| `app/model_arena/promoter.py` | Agent promotion | WORKING |
| `app/model_arena/scheduler.py` | Re-test scheduling | WORKING |
| `app/model_arena/scoring.py` | Output scoring | WORKING |

#### Models Registered
- **38 LLM models** across 11 providers:
  - Anthropic (3): Claude Opus 4, Sonnet 4, Haiku 3.5
  - OpenAI (6): GPT-4o, 4o-mini, 4-turbo, o1, o1-mini, o3-mini
  - Google (4): Gemini 2.0 Pro/Flash, 1.5 Pro/Flash
  - DeepSeek (3): V3, R1, Coder
  - Together/Meta (4): Llama 3.1 8B/70B/405B, 3.3 70B
  - Mistral (4): Large, Small, Codestral, Ministral 8B
  - xAI (2): Grok-2, Grok-2 Mini
  - Groq (4): Llama 3.1 70B/8B, Mixtral, Gemma 2
  - Cohere (2): Command R, Command R+
  - Amazon (3): Nova Pro/Lite/Micro
  - Alibaba (3): Qwen Max/Plus/Turbo

#### Frontend Dashboard
| Component | File | Status |
|-----------|------|--------|
| Model Arena Dashboard | `components/ko/model-arena-dashboard.jsx` | WORKING |
| Navigation Rail (arena mode) | `components/ko/navigation-rail.jsx` | WORKING |
| Page.jsx integration | `app/page.jsx` | WORKING |

### Issue Fixed This Session

#### Nginx Routing Missing
- **Problem:** `/arena/*` requests were not proxied t

---

*Auto-generated by generate_claude_md.py - Do not edit directly*
*Source: ~/KO_Session_State/*
*Regenerate: `python3 ~/generate_claude_md.py`*
