# Master Roofing Multi-Agent System

> **READ THIS FIRST** - Complete reference for the MR CEO Agent backend architecture.

---

## System Overview

A multi-agent AI system for Master Roofing's CEO. Uses three LLMs:

| Role | Model | Purpose |
|------|-------|---------|
| **Orchestrator** | Gemini 2.0 Flash | Project resolution, routing, merging |
| **CEO Response** | OpenAI GPT-4.1 | Final human-facing answers |
| **SQL Agent** | Claude | BigQuery SQL generation |

---

## Locations

### Local Development Machine

```
/home/iwagschal/
├── gemini_orchestrator_v2.py    # Gemini orchestrator with project resolver
├── chief_agent_v2.py            # Main 5-phase orchestration
├── claude_sql_v2.py             # SQL generator with project_id filter
├── vertex_search_v2.py          # Doc search with project_id filter
├── hubspot_v2.py                # HubSpot with project_id filter
├── deploy.sh                    # One-command deployment script
├── DEPLOYMENT_GUIDE.md          # Deployment documentation
├── MR_MULTI_AGENT_SYSTEM.md     # THIS FILE
└── masterroofing-multi-agent-dev.zip  # Original backend (backup)
```

### Production VM

```
Host: 34.95.128.208
User: iwagschal
Internal IP: 10.158.0.2
```

```
/home/muddassir/apps/multi-agent-mvp/backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI app, endpoints
│   ├── chief_agent.py           # Main orchestration
│   ├── gemini_orchestrator.py   # Gemini routing/merging
│   ├── config.py                # Settings, env vars, stub flags
│   ├── schemas.py               # Pydantic models
│   └── tools/
│       ├── __init__.py
│       ├── bigquery.py          # BQ query execution
│       ├── claude_sql.py        # Claude SQL generation
│       ├── hubspot.py           # HubSpot CRM
│       ├── powerbi.py           # Power BI embed
│       └── vertex_search.py     # Document search
├── utils/
│   ├── auth.py
│   ├── chat_history.py          # Session management
│   ├── gcs.py                   # GCS utilities
│   └── logging.py
├── chat_history/                # Session JSON files
├── .venv/                       # Python virtual environment
├── .env                         # Environment variables (secrets)
├── requirements.txt
├── start.sh                     # Startup script
└── uvicorn.log                  # Server logs
```

### Frontend (Vercel)

```
/home/iwagschal/v0-master-roofing-ai-2-1u/
├── components/ko/               # React components
│   ├── chat-shell.jsx
│   ├── chat-message.jsx
│   ├── reports-screen.jsx       # Power BI dashboards
│   ├── email-screen.jsx         # Gmail
│   ├── zoom-screen.jsx          # Zoom meetings
│   └── documents-screen.jsx     # Document viewer
└── README.md

Live URL: https://vercel.com/iwagschal-2035s-projects/v0-master-roofing-ai-2-3c
```

---

## BigQuery Structure

**Project:** `master-roofing-intelligence`

### Datasets

| Dataset | Purpose |
|---------|---------|
| `mr_raw` | Raw ingested data |
| `mr_staging` | Intermediate processing |
| `mr_core` | Normalized core tables |
| `mr_view_layer` | Business views |
| `mr_agent` | AI agent views and tables |
| `mr_powerbi` | Power BI star schema |

### Key Tables/Views in `mr_agent`

| Table | Rows | Purpose |
|-------|------|---------|
| `v_project_intelligence_full` | 2,160 | **PRIMARY** - Denormalized AI view with everything |
| `v_project_lookup` | 2,160 | Lean view for project name → ID resolution |
| `v_document_index` | 17,260 | Document GCS paths linked to project_ids |
| `project_master` | 2,160 | Legacy project table |

### v_project_intelligence_full Schema

```
project_id (STRING)          - Unique identifier
project_name (STRING)        - Project name/address
gc_name (STRING)             - General Contractor
gc_email, gc_contact         - GC contact info
award_status (STRING)        - WON, PENDING, LOST, NULL
lifecycle_stage (STRING)     - PROPOSED, IN_PROGRESS, BILLING, AWARDED
proposal_total (FLOAT)       - Proposal value
takeoff_total (FLOAT)        - Takeoff estimate
financial_total_costs (FLOAT)
financial_total_revenue (FLOAT)
financial_net_amount (FLOAT)
profit_margin_pct (FLOAT)
total_emails, total_chats (INT)
data_richness_score (INT)    - 0-7 completeness score
narrative_summary (STRING)   - Pre-built LLM summary
milestone_narrative (STRING) - Milestone timeline text
has_proposal, has_takeoff, has_financials (BOOL)
```

### v_project_lookup Schema (for Gemini resolver)

```
project_id (STRING)
project_name (STRING)
gc_name (STRING)
award_status (STRING)
lifecycle_stage (STRING)
proposal_total (FLOAT)
has_proposal, has_takeoff, has_financials (BOOL)
data_richness_score (INT)
```

### v_document_index Schema

```
doc_type (STRING)            - "proposal" or "takeoff"
doc_id (STRING)              - Document hash
gcs_uri (STRING)             - gs://mr-agent-docs-us-east4/...
file_name (STRING)
project_id (STRING)          - Links to project
container_id (STRING)
observed_key (STRING)
```

---

## GCS Buckets

| Bucket | Purpose |
|--------|---------|
| `gs://mr-agent-docs-us-east4/proposals/` | Proposal PDFs |
| `gs://mr-agent-docs-us-east4/takeoffs/` | Takeoff spreadsheets |
| `gs://mr-agent-docs-us-east4/manifests/` | Manifest files |
| `gs://master-roofing-raw/` | Raw data ingestion |
| `gs://master-roofing-raw/documentation/` | Documentation backups |

---

## Architecture Flow

```
User Question: "What's the status of 203 Sutter?"
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 0: PROJECT RESOLUTION                                 │
│ gemini_orchestrator.resolve_projects()                      │
│                                                             │
│ 1. Gemini extracts: "203 sutter"                           │
│ 2. Query: SELECT * FROM v_project_lookup                    │
│           WHERE LOWER(project_name) LIKE '%203%sutter%'     │
│ 3. Returns: project_id = "f4270c38685739470235fae8d7fbf417" │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: GEMINI ROUTING                                     │
│ gemini_orchestrator.route_query(project_ids=[...])          │
│                                                             │
│ Decides which tools to call:                                │
│ • claude_sql (analytics, KPIs)                              │
│ • vertex_search (documents)                                 │
│ • hubspot (CRM data)                                        │
│ • powerbi (visualizations)                                  │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: TOOL EXECUTION                                     │
│ chief_agent.execute_tools(project_ids=[...])                │
│                                                             │
│ All tools filter by project_id:                             │
│ • claude_sql: WHERE project_id IN ('f4270c38...')          │
│ • vertex_search: v_document_index WHERE project_id = ...    │
│ • hubspot: filter by mr_project_id custom property          │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: GEMINI MERGE                                       │
│ gemini_orchestrator.merge_results()                         │
│                                                             │
│ Combines outputs into structured summary                    │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: OPENAI CEO RESPONSE                                │
│ chief_agent.compose_ceo_response()                          │
│                                                             │
│ Generates natural language answer for CEO                   │
└─────────────────────────────────────────────────────────────┘
                    │
                    ▼
              Final Answer
```

---

## API Endpoints

Base URL: `http://34.95.128.208:8000`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/v1/config` | GET | Architecture and stub status |
| `/v1/chat` | POST | Main chat endpoint |
| `/v1/sessions` | POST | Create session |
| `/v1/sessions` | GET | List sessions |
| `/v1/sessions/{id}` | GET | Get session |
| `/v1/sessions/{id}` | DELETE | Delete session |
| `/v1/powerbi/dashboards` | GET | List Power BI dashboards |

### Chat Request

```json
{
  "message": "What's the status of 203 Sutter?",
  "session_id": "optional-uuid",
  "include_traces": true,
  "context": {}
}
```

### Chat Response

```json
{
  "answer": "203 Sutter is a WON project with City Builders...",
  "sources": [...],
  "reasoning": "Selected claude_sql for project status lookup",
  "traces": [...],
  "session_id": "uuid",
  "resolved_projects": {
    "203 sutter": {
      "project_id": "f4270c38...",
      "project_name": "203 sutter",
      "gc_name": "City Builders",
      "award_status": "WON"
    }
  },
  "stub_mode": {"openai": false, "gemini": false, ...}
}
```

---

## Environment Variables (.env)

```bash
# OpenAI (CEO response only)
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4.1-mini

# Anthropic (Claude SQL agent)
ANTHROPIC_API_KEY=sk-ant-api03-...

# Google Cloud
GCP_PROJECT_ID=master-roofing-intelligence
VERTEX_SEARCH_ENGINE_ID=mr-agent-docs-search_1765860810364
BQ_DATASET=mr_agent
BQ_TABLE=project_master

# Gemini (Orchestrator)
GEMINI_MODEL=gemini-2.0-flash
VERTEX_LOCATION=us-central1

# Power BI
POWERBI_TENANT_ID=5ea92007-...
POWERBI_CLIENT_ID=2dfb3812-...
POWERBI_CLIENT_SECRET=...
POWERBI_WORKSPACE_ID=40b665cc-...
POWERBI_REPORT_ID=aead73c5-...

# HubSpot
HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-...

# Stub flags (false = use real services)
STUB_OPENAI=false
STUB_ANTHROPIC=false
STUB_GCP=false
STUB_HUBSPOT=false
STUB_POWERBI=false
STUB_GEMINI=false
```

---

## Quick Commands

### SSH into VM
```bash
ssh iwagschal@34.95.128.208
```

### Deploy changes
```bash
./deploy.sh
```

### Check server health
```bash
curl http://34.95.128.208:8000/health
```

### View logs on VM
```bash
ssh iwagschal@34.95.128.208 "tail -50 /home/muddassir/apps/multi-agent-mvp/backend/uvicorn.log"
```

### Restart server on VM
```bash
ssh iwagschal@34.95.128.208 "sudo fuser -k 8000/tcp; sleep 2; cd /home/muddassir/apps/multi-agent-mvp/backend && nohup ./start.sh > uvicorn.log 2>&1 &"
```

### Query BigQuery
```bash
bq query --use_legacy_sql=false "SELECT * FROM mr_agent.v_project_lookup LIMIT 5"
```

---

## Key Files Reference

### gemini_orchestrator.py

**Functions:**
- `resolve_projects(user_message)` → Extracts project mentions, queries v_project_lookup, returns project_ids
- `route_query(user_message, project_ids)` → Decides which tools to call
- `merge_results(gathered_data)` → Combines tool outputs

### chief_agent.py

**Functions:**
- `run_chief_agent(user_message, context, conversation_history)` → Main orchestration (5 phases)
- `execute_tools(tools, user_message, project_ids)` → Runs selected tools
- `compose_ceo_response(merged_data)` → OpenAI generates final answer

### claude_sql.py

**Functions:**
- `generate_sql(question, project_ids)` → Claude generates BQ SQL with project_id filter

### vertex_search.py

**Functions:**
- `search(query, project_ids)` → If project_ids: query v_document_index; else: Vertex AI Search

### hubspot.py

**Functions:**
- `search(query, project_ids)` → HubSpot CRM search with optional mr_project_id filter

---

## Original Source

The original backend code is preserved in:
```
/home/iwagschal/masterroofing-multi-agent-dev.zip
```

To see original files:
```bash
unzip -l /home/iwagschal/masterroofing-multi-agent-dev.zip
python3 -c "import zipfile; z=zipfile.ZipFile('/home/iwagschal/masterroofing-multi-agent-dev.zip'); print(z.read('masterroofing-multi-agent-dev/app/chief_agent.py').decode())"
```

---

## Change History

### 2026-01-01: Gemini Orchestrator + Project Resolution

**Added:**
- `gemini_orchestrator.py` - New module for Gemini routing/merging
- `v_project_lookup` BigQuery view for fast project resolution
- Phase 0 (project resolution) to chief_agent flow
- project_ids filtering to all tools

**Architecture Change:**
```
BEFORE: User → OpenAI (routing + response) → User
AFTER:  User → Gemini (resolve) → Gemini (route) → Tools → Gemini (merge) → OpenAI (response) → User
```

---

## Contact

Isaac Wagschal - Master Roofing
