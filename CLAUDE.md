# CLAUDE.md - KO Project Context

> **Auto-generated from ~/KO_Session_State/ on 2026-01-07 10:40**
> **Regenerate:** `python3 ~/generate_claude_md.py`

---

## Project Overview

**Project:** KO (Chief Agent Officer) - Multi-agent AI system for Master Roofing & Siding
**Owner:** Isaac Wagschal, CEO of Master Roofing & Siding, Founder of A Eye Corp
**Goal:** CEO interface for querying 20+ years of company data via natural language

### Core Principle
> "Zero assumptions, audit everything" - All AI responses must be grounded in verifiable data.

---

## Architecture

### This Repository (Frontend)
- **Framework:** Next.js with App Router
- **Location:** `~/v0-master-roofing-ai-2-1u/`
- **Deployment:** Vercel (auto-deploy on push to main)
- **Key Dirs:** `app/`, `components/`, `lib/`, `hooks/`

### Backend (Separate VM)
- **Framework:** Python FastAPI
- **Location:** `mr-dev-box-01:/home/muddassir/apps/multi-agent-mvp/backend/`
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

## Current Session: 2026-01-07 (Day 4 of Phase 1, Session 12)

### Active Work
| Task | Status | Notes |
|------|--------|-------|
| Structured Takeoff Journey | DONE | V1-V7 tracking by official line item |
| project_llm Enhancement | DONE | Added takeoff journey columns |
| Revision Tracking Fixes | DONE | GOOD matches + REMOVED tracking |

### Completed This Session

#### 1. Fixed Revision Tracking Gaps
- **Added GOOD matches** to `revision_takeoff_links` (was EXACT only)
  - Before: 489 links
  - After: 584 links (+95)
- **Fixed REMOVED tracking** in `revision_line_diffs`
  - Before: Only ADDED and CHANGED
  - After: ADDED (5,625), REMOVED (5,792), CHANGED (9,815)
- Filtered out generic sheets (Sheet1, Breakdown, Template)

#### 2. Created Structured Takeoff Journey Tables
Built versioned takeoff tracking mapped to official template items (MR-*):

| Table | Rows | Purpose |
|-------|------|---------|
| `project_takeoff_versioned` | 14,473 | All takeoff data by V1, V2, V3... |
| `project_takeoff_item_diffs` | 4,982 | Structured diffs per official item |
| `v_project_takeoff_journey` | View | Journey with top changes + LLM summaries |

**What's Tracked Per Item:**
- `item_id` - Official template ID (MR-033TRAFFIC, MR-003BU2PLY, etc.)
- `qty_delta` / `qty_pct_change` - Quantity changes
- `rate_delta` / `rate_pct_change` - Unit rate changes
- `cost_delta` / `cost_pct_change` - Total cost changes
- `change_type` - ADDED, REMOVED, CHANGED

#### 3. Updated project

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

## Agent Flow (5 Phases)

```
User Question
     │
     ▼
┌─────────────────────────────────────────┐
│ PHASE 0: Gemini Orchestrator            │
│ - Extracts project mentions             │
│ - Queries v_project_lookup              │
│ - Returns project_ids                   │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ PHASE 1: Gemini Orchestrator            │
│ - Decides which tools to call           │
│ - Routes to: claude_sql, vertex,        │
│   hubspot, powerbi                      │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ PHASE 2: Tool Execution                 │
│ - All tools filter by project_id       │
│ - Parallel execution when possible      │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ PHASE 3: Gemini Orchestrator            │
│ - Merges tool outputs                   │
│ - Creates structured summary            │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ PHASE 4: OpenAI CEO Response            │
│ - Generates natural language answer     │
│ - CEO-friendly tone                     │
└─────────────────────────────────────────┘
     │
     ▼
Final Answer to User
```

---

## Future Agents (Phase 2+)

| Agent | Purpose | Item # | Status |
|-------|---------|--------|--------|
| Gmail Agent | Email search/analysis | 19 | PLANNED |
| Google Chat Agent | Team chat analysis | 20 | PLANNED |
| Asana Agent | Project/task status | 21 | PLANNED |
| Meetings Agent | Calendar/meeting data | 22 | PLANNED |
| Watcher Agents | Autonomous oversight | 25 | DESIGN ONLY |
| Superintelligence | Learning system | 41 | DESIGN ONLY |

---

## Agent Files

### Local (Development)
```
/home/iwagschal/
├── gemini_orchestrator_v2.py    # Orchestrator
├── chief_agent_v2.py            # Main flow
├── claude_s

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
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b --command="tail -50 /home/muddassir/apps/multi-agent-mvp/backend/uvicorn.log"

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
| Date | 2026-01-07 (Session 12) |
| Focus | Structured Takeoff Journey + project_llm Enhancement |
| Day | Day 4 of Phase 1 |
| Key Win | **Structured item-level revision tracking with rate/qty changes** |

---

## What Was Accomplished

### 1. Fixed Revision Tracking Gaps

**Added GOOD matches to revision_takeoff_links:**
- Before: 489 links (EXACT only)
- After: 584 links (EXACT + GOOD ≤3% variance)
- +95 new links recovered

**Fixed REMOVED tracking in revision_line_diffs:**
- Before: Only ADDED and CHANGED (FULL OUTER JOIN was broken)
- After: ADDED (5,625), REMOVED (5,792), CHANGED (9,815)
- Filtered out generic sheets (Sheet1, Breakdown, Template)

### 2. Created Structured Takeoff Journey Tables

Built versioned takeoff tracking mapped to official template items:

| Table | Rows | Purpose |
|-------|------|---------|
| `project_takeoff_versioned` | 14,473 | All takeoff data by V1, V2, V3... mapped to MR-* items |
| `project_takeoff_item_diffs` | 4,982 | Structured diffs per official item between versions |
| `v_project_takeoff_journey` | View | Journey with top changes + LLM summaries |

**Item Diff Change Types:**
| Type | Count | Projects | Avg Cost Impact |
|------|-------|----------|-----------------|
| CHANGED | 2,774 | 119 | $3.7M |
| REMOVED | 1,309 | 105 | $3.5M |
| ADDED | 899 | 102 | $383K |

**What's Tracked Per Official Item:**
- `item_id` - Official template ID (MR-033TRAFFIC, MR-003BU2PLY, etc.)
- `qty_delta` / `qty_pct_change` - Quantity changes between versions
- `rate_delta` / `rate_pct_change` - Unit rate changes
- `cost_delta` / `cost_pct_change` - Total cost changes
- `change_type` - ADDED, REMOVED, CHANGED
- `r_value`, `thickness` - Spec changes

### 3. Updated project_llm with Takeoff Journey

Added 9 new columns:

| Column | Description |
|--------|-------------|
| `takeoff_revision_count` | Number of revision transitions |
| `total_items_changed` | Items with qt

---

*Auto-generated by generate_claude_md.py - Do not edit directly*
*Source: ~/KO_Session_State/*
*Regenerate: `python3 ~/generate_claude_md.py`*
