# Architecture Bible — KO Platform (Master Roofing AI)

> **Repo:** `v0-master-roofing-ai-2-1u`
> **Stack:** Next.js 16 + React 19 + Tailwind 4 + Radix UI
> **Deployed:** Vercel — https://v0-master-roofing-ai-2-1u.vercel.app
> **Current version:** v2.1-proposal-v2 (feature/proposal-v2 branch)
> **Last updated:** 2026-02-16

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Directory Structure](#2-directory-structure)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [External Services & Integrations](#4-external-services--integrations)
5. [Data Model](#5-data-model)
6. [API Routes](#6-api-routes)
7. [Frontend Architecture](#7-frontend-architecture)
8. [Google Sheets Integration](#8-google-sheets-integration)
9. [Bluebeam Integration](#9-bluebeam-integration)
10. [Proposal Pipeline](#10-proposal-pipeline)
11. [AI Agent System](#11-ai-agent-system)
12. [Key Library Files](#12-key-library-files)
13. [Scripts & Utilities](#13-scripts--utilities)
14. [Deployment & Infrastructure](#14-deployment--infrastructure)
15. [Git History & Rollback Points](#15-git-history--rollback-points)
16. [Known Limitations](#16-known-limitations)
17. [Workbook Rebuild (Planned)](#17-workbook-rebuild-planned)

---

## 1. System Overview

KO Platform is an internal estimating and proposal tool for **Master Roofing & Siding**. It connects Bluebeam measurement tools, Google Sheets takeoff workbooks, BigQuery historical data, and AI-powered document generation into a single web application.

### Core Workflow

```
 Bluebeam Markup         Google Sheet           Proposal
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ BTX tools    │───>│ Takeoff workbook │───>│ DOCX output  │
│ (per-floor)  │    │ (items × locs)   │    │ (bid types)  │
│ CSV export   │───>│ auto-populate    │    │              │
└──────────────┘    └──────────────────┘    └──────────────┘
       ↑                    ↑                      ↑
  Python backend      BigQuery rates         Description
  136.111.252.120     + item library         library (BQ)
```

**What the app does, end to end:**

1. **Project creation** — Creates a Google Sheet workbook from template, registers in GCS
2. **BTX generation** — Generates per-floor Bluebeam tool files (zip of .btx) for field measurement
3. **Bluebeam import** — Parses CSV output from Bluebeam, writes quantities into the takeoff sheet
4. **Proposal preview** — Reads the sheet, resolves sections/items/bundles, fetches descriptions from BigQuery
5. **Proposal generation** — Merges data into a Word template, splits by bid type (BASE/ALT)
6. **AI chat** — Multiple agent personas for estimating, sales, and operations support

---

## 2. Directory Structure

```
v0-master-roofing-ai-2-1u/
├── app/                              # Next.js App Router
│   ├── api/ko/                       # All API routes (~27 domains)
│   │   ├── takeoff/[projectId]/      # Takeoff: sheet-config, btx, bluebeam, generate
│   │   ├── proposal/[projectId]/     # Proposal: preview, generate
│   │   ├── projects/                 # Project CRUD
│   │   ├── agents/[agentId]/         # Agent: chat, history, training
│   │   ├── factory/                  # Agent factory: create, tools, models
│   │   ├── ko-prime/                 # KO Prime AI chat
│   │   ├── estimator-chat/           # Estimator AI chat
│   │   ├── contacts/                 # Contact search
│   │   ├── gc-intelligence/          # GC intelligence
│   │   ├── gc-brief/                 # GC brief generation
│   │   ├── sheets/                   # Google Sheets search/share
│   │   ├── email/                    # Email draft generation
│   │   ├── bluebeam/                 # Bluebeam file conversion + tool manager CRUD
│   │   ├── rates/                    # Rate card endpoint
│   │   ├── admin/                    # System config, agent code
│   │   ├── arena/                    # Model testing arena
│   │   ├── network/                  # Agent network topology
│   │   └── ...                       # 10+ more domains
│   ├── login/page.tsx                # Google OAuth login
│   ├── page.jsx                      # Main app (single-page)
│   ├── layout.jsx                    # Root layout (providers)
│   └── globals.css                   # Global styles
│
├── components/
│   ├── ko/                           # 74 app-specific components
│   │   ├── home-screen.jsx           # Dashboard
│   │   ├── estimating-center-screen.jsx  # Main estimating UI
│   │   ├── project-status-icons.jsx  # Brand icon bar (Phase 11)
│   │   ├── sheet-ribbon.jsx          # Setup/Version ribbon toolbar (Phase 11C/11D)
│   │   ├── proposal-preview-screen.jsx   # Proposal preview
│   │   ├── chat-screen.jsx           # AI chat
│   │   ├── agent-dashboard-screen.jsx    # Agent management
│   │   ├── project-folders-screen.jsx    # Project browser
│   │   ├── gmail-screen.jsx          # Email
│   │   ├── contacts-screen.jsx       # Contacts
│   │   ├── navigation-rail.jsx       # Left sidebar nav
│   │   ├── ko-stage.jsx              # Main content area
│   │   └── ...                       # 60+ more
│   ├── ui/                           # Radix UI primitives (button, card, input, etc.)
│   └── providers/                    # NextAuth session provider
│
├── lib/                              # Backend libraries
│   ├── auth.ts                       # NextAuth config
│   ├── brand-colors.js               # Brand color hex constants + SVG mapping (Phase 11)
│   ├── google-sheets.js              # Sheets API (45KB, core file)
│   ├── version-management.js         # Version tab CRUD (~20KB, Session 38)
│   ├── bigquery.js                   # BigQuery client
│   ├── gcs-storage.js                # Google Cloud Storage
│   ├── project-storage.js            # Project CRUD (GCS-backed)
│   ├── google-token.js               # Token management
│   ├── generate-proposal-pdf.js      # PDF generation
│   ├── chat-logger.js                # Chat audit logging (BigQuery)
│   ├── chat-storage.js               # Chat localStorage persistence
│   └── api/                          # Frontend API client
│       ├── client.ts                 # HTTP client
│       ├── endpoints.ts              # Endpoint definitions
│       └── types.ts                  # TypeScript interfaces
│
├── hooks/                            # 12 custom React hooks
│   ├── useChat.ts                    # Chat session management
│   ├── useGoogleAuth.ts             # Google OAuth
│   ├── useKOPrimeChat.ts            # KO Prime chat
│   ├── useAsana.ts                  # Asana tasks
│   ├── useCalendar.ts               # Google Calendar
│   ├── useGmail.ts                  # Gmail messages
│   ├── useAudioCapture.ts           # Microphone input
│   ├── useTTSPlayback.ts            # Text-to-speech
│   ├── useVoiceWebSocket.ts         # Voice streaming
│   ├── useWebSocketChat.ts          # WebSocket chat
│   ├── useChatSpaces.ts             # Google Chat
│   └── use-agent-status.js          # Agent status polling
│
├── data/                             # Static data
│   ├── agent-data.js                 # Fallback agent definitions
│   └── rfp-import.csv               # Sample RFP data
│
├── scripts/                          # 80+ utility scripts
│   ├── *.mjs / *.js                  # Node.js (BigQuery checks, sheet ops)
│   ├── *.py                          # Python (auditor, sales scanner)
│   ├── setup-proposal-tables.sql     # BigQuery DDL
│   └── archive/                      # Retired scripts
│
├── docs/                             # Design & architecture docs
│   ├── ARCHITECTURE_BIBLE.md         # This file
│   └── WORKBOOK_REBUILD_DESIGN.md    # Multi-tab template design
│
├── public/                           # Static assets (logos, images)
│   ├── icons/                        # MR brand SVGs (Phase 11: 13 files)
│   └── templates/                    # Word templates (.docx)
│
├── types/                            # TypeScript type definitions
├── styles/                           # Tailwind CSS
├── providers/                        # Context providers
│
├── middleware.ts                      # NextAuth route protection
├── next.config.mjs                   # Next.js config
├── vercel.json                       # Vercel deployment
├── package.json                      # Dependencies
├── SESSION_25_HANDOFF.md             # Session history & bug tracker
├── SESSION_24_HANDOFF.md             # Previous session
└── WORKFLOW.md                       # Git workflow rules
```

---

## 3. Authentication & Authorization

### OAuth Flow

```
User → /login → Google OAuth consent → callback → domain check → JWT session
```

**Config file:** `lib/auth.ts`
**Middleware:** `middleware.ts`

| Setting | Value |
|---------|-------|
| Provider | Google OAuth 2.0 |
| Allowed domain | `@masterroofingus.com` |
| Admin email | `iwagschal@masterroofingus.com` |
| Session strategy | JWT |
| Session lifetime | 24 hours |
| Login page | `/login` |

### Route Protection

The middleware protects all routes **except:**
- `/login` — public auth page
- `/api/*` — API routes handle their own auth
- `/_next/*` — Next.js internals
- `/templates/*` — public Word templates
- Static files (`.svg`, `.png`, `.jpg`, `.docx`, etc.)

### Service Account (Server-Side)

All Google API calls (Sheets, Drive, BigQuery) use a service account with domain-wide delegation:

| Setting | Value |
|---------|-------|
| Account | `workspace-ingest@master-roofing-intelligence.iam.gserviceaccount.com` |
| Delegation | Impersonates `rfp@masterroofingus.com` |
| Scopes | `spreadsheets`, `drive` |
| Auth method | RS256-signed JWT → exchanged for access token |

### Session Shape

```typescript
session.user = {
  id: string        // Google sub ID
  name: string
  email: string     // must be @masterroofingus.com
  image?: string
  isAdmin: boolean  // true for iwagschal@masterroofingus.com
}
```

---

## 4. External Services & Integrations

### Service Map

```
┌──────────────────────────────────────────────────────────────┐
│                      KO Platform (Vercel)                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐  │
│  │BigQuery │  │ Sheets   │  │ Drive   │  │    GCS       │  │
│  │(queries)│  │(read/    │  │(copy/   │  │(project JSON │  │
│  │         │  │ write)   │  │ share)  │  │ + tokens)    │  │
│  └────┬────┘  └────┬─────┘  └────┬────┘  └──────┬───────┘  │
│       │            │             │               │           │
│       └────────────┴──────┬──────┴───────────────┘           │
│                           │                                  │
│                Service Account JWT                           │
│                                                              │
│  ┌──────────────────┐  ┌───────────┐  ┌──────────────────┐  │
│  │ Python Backend   │  │ Asana API │  │ Google Workspace │  │
│  │ (env var config) │  │ (OAuth2)  │  │ (Gmail, Calendar │  │
│  │ - BTX generation │  │           │  │  Chat) via user  │  │
│  │ - Bluebeam tools │  │           │  │  OAuth token     │  │
│  │ - WebSocket chat │  │           │  │                  │  │
│  │ - Voice stream   │  │           │  │                  │  │
│  └──────────────────┘  └───────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### BigQuery

**File:** `lib/bigquery.js`
**Project:** `master-roofing-intelligence`

| Dataset | Location | Tables |
|---------|----------|--------|
| `mr_main` | US (multi-region) | `item_description_mapping`, `lib_takeoff_template`, `estimator_rate_card`, `v_library_complete`, `project_folders`, `implementation_tracker`, `project_versions`, `import_history`, `bluebeam_tools` |
| `mr_staging` | us-east4 | `takeoff_lines_enriched` (700k+ rows) |
| `ko_estimating` | US | Estimating module data |
| `ko_audit` | US | `agent_chat_history`, activity logs |

Key functions:
- `runQuery(sql, params, options)` — Executes SQL with auto-location detection
- `getAverageRates(gcName)` — Historical rate averages from takeoff_lines_enriched
- `getRateForItem(itemName, unit, gcName)` — Specific item rates (median/min/max)

### Google Sheets API

**File:** `lib/google-sheets.js` (45KB — the largest and most critical file)

Key functions:
- `getAccessToken()` — JWT → bearer token
- `copyTemplateSheet(templateId, newName, folderId)` — Clone template for new project
- `createProjectSheet(projectName, gcName)` — Create + register new project sheet
- `readSheetValues(sheetId, range)` — Read cell values
- `readSheetFormulas(sheetId, range)` — Read cell formulas
- `updateSheetCell(sheetId, range, value)` — Update single cell
- `batchUpdateSheet(sheetId, data)` — Batch update
- `fillBluebeamDataToSpreadsheet(...)` — Import Bluebeam CSV data into sheet
- `discoverSheetLayout(headerRow)` — Dynamic section/column detection

### Google Cloud Storage

**File:** `lib/gcs-storage.js`

| Bucket | Purpose |
|--------|---------|
| `master-roofing-raw` | OAuth tokens (`auth/google/{userId}.json`) |
| `ko-platform-data` | Project data (`projects/projects.json`) |

### Python Backend (136.111.252.120)

| Endpoint | Purpose |
|----------|---------|
| `POST /bluebeam/generate-btx-per-floor` | Generate zip of per-floor BTX files |
| `POST /bluebeam/generate-btx` | Generate flat single BTX (legacy) |
| `WS /ws/chat` | WebSocket AI chat |
| `WS /ws/voice` | WebSocket voice streaming |

Key files on the Python server:
- `BLUEBEAM_COMPLETE_MAPPING.json` — 64 teju_subject → item_id mappings
- `MASTER_BLUEBEAM_CONFIG.json` — Item → display/systems/rates config
- `Teju Tool Set.btx` — Base Bluebeam tool library (74 tools)

### Google Workspace (User-Scoped)

Accessed via user's OAuth token (not service account):
- **Gmail** — Read/send emails, draft generation
- **Calendar** — Meeting data, recordings
- **Google Chat** — Team messaging (deferred)

### Asana

OAuth2 integration for project/task management syncing.

---

## 5. Data Model

### Item Hierarchy

```
item_description_mapping (27 columns, 87+ items: 58 original + 29 Cat 2 + new via Add Item)
├── item_id              (MR-001 through MR-051, MR-FIRE-*, MR-THORO-*, MR-{AUTO})
├── section              (ROOFING | BALCONIES | EXTERIOR | WATERPROOFING)
├── display_name         (user-friendly name)
├── scope_name           (technical spec name)
├── default_rate         (FLOAT64, optional)
├── uom                  (SF | LF | EA | SY | CF | GAL | LS)
├── row_type             (item | system | COMPONENT_ROW | STANDALONE_ROW | header)
├── is_system            (TRUE = system parent item)
├── can_bundle           (TRUE = can appear in bundles; auto-FALSE for systems)
├── can_standalone       (TRUE = can appear standalone)
├── parent_item_id       (STRING, for components — links to parent system)
├── system_heading       (paragraph title for system items)
├── paragraph_description (full system paragraph, with {R_VALUE}/{THICKNESS}/{TYPE} placeholders)
├── bundle_fragment      (component text fragment for bundles)
├── standalone_description (full standalone paragraph)
├── fragment_sort_order  (INT64, controls fragment ordering within system)
├── bundling_notes       (internal notes about bundling logic)
├── description_status   (HAS_DESCRIPTION | MISSING — auto-computed)
├── has_r_value          (BOOL)
├── has_thickness        (BOOL)
├── has_material_type    (BOOL)
├── has_bluebeam_tool    (BOOL — auto-set from bluebeam_tool_name)
├── has_template_row     (BOOL — legacy, FALSE for new items)
├── has_scope_mapping    (BOOL — auto-set from scope_name)
├── has_historical_data  (BOOL — FALSE for new items)
├── has_rate             (BOOL — FALSE for new items)
├── historical_project_count (INT64 — 0 for new items)
└── bluebeam_tool_name   (STRING — tool name from Python backend)

lib_takeoff_template (10 columns, per-item takeoff specs)
├── item_id              (NOT NULL — FK to item_description_mapping)
├── section              (STRING)
├── scope_name           (STRING)
├── default_unit_cost    (FLOAT64)
├── uom                  (STRING)
├── sort_order           (INT64 — auto-incremented on insert)
├── has_r_value          (BOOL)
├── has_thickness        (BOOL)
├── has_material_type    (BOOL)
└── notes                (STRING)

estimator_rate_card (historical rates by GC)
├── gc_name
├── item_id            (STRING, added Session 31 — maps to item_description_mapping.item_id, 93% backfilled)
├── median_unit_cost / avg_unit_cost
├── min_rate / max_rate
├── project_count
└── confidence_level

v_library_complete (view: LEFT JOIN idm + lt, 32 columns)
├── All columns from item_description_mapping
├── template_unit_cost, template_sort_order, template_has_thickness, template_notes (from lt)
├── readiness_score (INT64, computed: counts filled required fields, max 6)
└── readiness_max   (INT64, constant 6)

Add Item Pipeline (Phase 6, Session 43):
  POST /api/ko/admin/add-item → inserts into both tables above
  → v_library_complete auto-updates (it's a view)
  → refreshLibraryTab() writes 31 columns (A-AE) to template spreadsheet
  → FILTER formulas in AF-AQ auto-recalculate (dropdown validation)
  → Returns readiness_score + propagation status + manual_steps
  Form: components/ko/add-item-modal.jsx (wired via BookPlus button in estimating center)
  Audit: docs/LIBRARY_COLUMN_AUDIT.md (31 data cols + 12 formula cols)

implementation_tracker (project plan task tracking, added Session 31)
├── phase, task_id, description
├── file_affected, task_type
├── status             (NOT_STARTED | IN_PROGRESS | DONE | BLOCKED | SKIPPED)
├── verified, verified_by, verified_at
├── session_completed, notes, branch

project_versions (takeoff version tracking, added Session 31)
├── project_id, spreadsheet_id, sheet_name
├── version_number, created_at, created_by
├── is_active, status
├── items_count, locations_count
├── proposal_file_id, notes

import_history (Bluebeam CSV import tracking, added Session 31)
├── import_id, project_id, spreadsheet_id, target_sheet
├── import_type, csv_file_id, csv_filename
├── imported_at, imported_by
├── items_matched, items_unmatched, cells_populated
├── accumulation_mode, status, error_details, notes

project_folders (existing, column added Session 31)
└── active_version_sheet (STRING — tracks which takeoff version tab is active)

bluebeam_tools (78 rows: 75 from Teju Tool Set + 3 test, added Phase 7)
├── tool_id              (INT64 — unique tool identifier)
├── subject              (STRING — Bluebeam system/tool name)
├── label                (STRING — REQUIRED, human-readable display name)
├── label_status         (STRING — empty | matches_subject | custom)
├── type                 (STRING — Area | Polylength | Count | Perimeter)
├── unit                 (STRING — SF | LF | EA)
├── visual_template      (STRING — template category A-H)
├── border_color_hex     (STRING — hex color code)
├── fill_color_hex       (STRING — hex color code)
├── fill_opacity         (FLOAT64)
├── line_width           (FLOAT64)
├── item_id              (STRING — FK to item_description_mapping)
├── scope_name           (STRING — matches library scope)
├── is_mapped            (BOOL — TRUE if linked to a library item)
├── is_specialty         (BOOL — TRUE for specialty/one-off tools)
├── created_at           (TIMESTAMP)
├── updated_at           (TIMESTAMP)
└── created_by           (STRING)
Source of truth for Bluebeam tool definitions (replaces static JSON files).
Python backend reads from this table for BTX generation.
```

### Section Distribution

| Section | Item ID Range | Examples |
|---------|---------------|----------|
| ROOFING | MR-001 to MR-031 | 2-ply BUR, coping, flashing, pavers, pitch pockets |
| BALCONIES | MR-032 to MR-036 | Recessed WP, balcony WP |
| EXTERIOR | MR-037 to MR-051 | EIFS, metal panel, ACM, sealant, tie-in |
| WATERPROOFING | MR-FIRE-*, MR-THORO-* | Firestopping, Thoroseal |

### Project Storage

```json
// gs://ko-platform-data/projects/projects.json
[{
  "id": "proj_4222d7446fbc40c5",
  "name": "Project Name",
  "address": "123 Main St",
  "gc_name": "General Contractor LLC",
  "status": "active|won|lost|archived",
  "takeoff_spreadsheet_id": "1A2B3C...",
  "created_at": "2026-02-12T00:00:00Z",
  "created_by": "iwagschal@masterroofingus.com"
}]
```

---

## 6. API Routes

### Takeoff Operations (`/api/ko/takeoff/[projectId]/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/` | GET/PUT | Get/update takeoff sheet info |
| `/sheet-config` | GET | Read actual Google Sheet layout dynamically. Accepts `?sheet=` param (Session 33) |
| `/config` | GET/POST | Read/write wizard-generated config |
| `/setup-config` | GET | Read Setup tab toggles for BTX: items with active locations, tool names, section membership (Session 40) |
| `/btx` | GET/POST | GET: check readiness (reads setup-config). POST: generate per-floor BTX zip via Python backend. Accepts `setupConfig` body (Phase 3) or legacy `config`. Saves zip to Drive Markups folder. Filename: `{project}-tools-{date}.zip` (Session 40) |
| `/bluebeam` | POST | Import Bluebeam CSV into sheet with accumulation. Reads existing values and adds imported quantities. Saves CSV to Drive Markups/. Records to BigQuery import_history. Returns matchedItems with previousValue/accumulatedTotal, unmatchedItems with availableLocations. Accepts `sheet_name` in body. (Session 33, enhanced Session 41) |
| `/generate` | POST | Generate proposal from takeoff |
| `/imports` | GET | List past imports from BigQuery import_history (Session 41 — rewritten from Python proxy to BigQuery) |
| `/sync/[importId]` | POST | Update import status/notes in BigQuery (Session 41 — rewritten from Python proxy) |
| `/compare/[importId]` | GET | Get specific import details from BigQuery (Session 41 — rewritten from Python proxy) |
| `/create-version` | POST | Create new takeoff version tab (copy template, transfer config, hide rows/cols, update tracker) |
| `/versions` | GET | List versions from Setup tracker, cross-ref actual tabs. Returns `tabSheetId` (gid) + `setupTabSheetId` for embedded sheet navigation |
| `/versions` | PUT | Set active version and/or update status |
| `/versions` | POST | Copy existing version tab |
| `/versions` | DELETE | Safe delete version tab (?sheet=name&force=bool) |
| `/library` | GET | Get library items with GC-specific rates |
| `/create` | POST | Create new takeoff |

### Proposal Operations (`/api/ko/proposal/[projectId]/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/preview` | GET | Extract + preview proposal data from sheet. Accepts `?sheet=` param (Session 33) |
| `/generate` | POST | Generate DOCX from sheet data. Accepts `sheet`, `editedDescriptions`, `sortOrder` in body. Reorders sections/items per sortOrder. Updates version tracker status to "Proposal Generated". Naming: `{project}-proposal-{version_date}-{timestamp}.docx` (Session 42) |

### Project Management

| Route | Method | Purpose |
|-------|--------|---------|
| `/projects` | GET/POST | List/create projects |
| `/projects/[id]/create-sheet` | POST | Create Google Sheet for project |
| `/projects/import` | GET/POST | Import projects from external sources |
| `/project-folders` | GET | List project folders |
| `/project-communications` | POST | Project communications |

### AI & Chat

| Route | Method | Purpose |
|-------|--------|---------|
| `/ko-prime/chat` | POST | KO Prime AI chat |
| `/estimator-chat` | POST | Estimator AI chat |
| `/agents/[agentId]/chat` | POST | Chat with specific agent |
| `/agents/[agentId]/history` | POST | Agent chat history |
| `/agents/[agentId]/training/` | POST | Agent training |
| `/agents/[agentId]/enable\|disable\|restart` | POST | Agent control |
| `/factory/agents` | GET/POST | Create/list agents |
| `/factory/tools` | GET | Available tools |
| `/factory/models` | GET | Available LLM models |

### Intelligence & Contacts

| Route | Method | Purpose |
|-------|--------|---------|
| `/gc-intelligence` | GET | GC intelligence data |
| `/gc-brief` | GET | Generate GC brief |
| `/contacts` | GET | List/search contacts |
| `/rates` | GET | Rate card endpoint |
| `/generate-descriptions` | POST | Auto-generate item descriptions |

### Google Workspace

| Route | Method | Purpose |
|-------|--------|---------|
| `/sheets/search` | GET | Search Google Sheets |
| `/sheets/share` | POST | Share sheets |
| `/email/draft` | POST | Email draft generation |
| `/email-drafts` | GET | List email drafts |

### Admin

| Route | Method | Purpose |
|-------|--------|---------|
| `/admin/add-item` | GET | Reference data for Add Item form: `?field=all` (item IDs for duplicate check), `?field=systems` (parent dropdown), `?field=tools` (Bluebeam tools) |
| `/admin/add-item` | POST | Add new item to library. Inserts into `item_description_mapping` (27 cols) + `lib_takeoff_template` (10 cols). Refreshes Library tab on template via `refreshLibraryTab()`. Returns readiness_score, propagation status, manual_steps. (Phase 6, Session 43) |
| `/admin/system-config` | POST | System configuration |
| `/admin/agent-code/[agentId]` | GET | Agent code inspection |
| `/arena/models` | POST | Model arena testing |
| `/network/agents` | GET | Agent network topology |

### Bluebeam Tool Manager (`/api/ko/bluebeam/tools`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/bluebeam/tools` | GET | List all tools + library items + gaps + stats. Query params: `?section=ROOFING&search=coping`. Returns tool list with label_status, mapping status, gap analysis (unmapped library items), and aggregate stats |
| `/bluebeam/tools` | POST | CRUD actions via `action` field in body: `update` (tool properties), `create` (new tool + auto-assign), `clone` (copy source tool), `assign` (link tool to library item), `unassign` (remove link) |

**Source:** `app/api/ko/bluebeam/tools/route.js`
Reads/writes BigQuery `mr_main.bluebeam_tools` directly. No Python backend dependency for CRUD.

---

## 7. Frontend Architecture

### Single-Page App Pattern

The app uses a **modal/screen** pattern — one main `page.jsx` renders different screens based on navigation state, rather than using Next.js file-based routing for pages.

```
page.jsx
└── layout.jsx (SessionProvider)
    └── NavigationRail (left sidebar)
    └── TopHeader
    └── KOStage (renders active screen)
        ├── HomeScreen
        ├── EstimatingCenterScreen
        ├── TakeoffSetupScreen
        ├── ProposalPreviewScreen
        ├── ChatScreen
        ├── AgentDashboardScreen
        ├── ProjectFoldersScreen
        ├── ContactsScreen
        ├── GmailScreen
        ├── SettingsScreen
        └── ... (15+ screens)
```

### Component Categories

**Screen Components (74 total in `components/ko/`):**

| Category | Components |
|----------|-----------|
| **Core Layout** | `navigation-rail`, `top-header`, `ko-stage`, `mobile-menu-toggle` |
| **Dashboard** | `home-screen`, `sales-dashboard`, `phase-tracker` |
| **Estimating** | `estimating-center-screen`, `embedded-sheet`, `project-status-icons`, `sheet-ribbon` |
| **Proposals** | `proposal-preview-screen`, `proposal-document`, `proposal-template`, `proposal-template-v2`, `proposal-pdf-download`, `takeoff-proposal-preview` |
| **Projects** | `project-folders-screen`, `project-folder`, `project-folder-detail`, `project-folder-light`, `project-card`, `project-detail-screen`, `create-project-modal` |
| **AI Agents** | `agent-dashboard-screen`, `agent-detail-screen`, `agent-card`, `agent-grid`, `agent-network-map-screen`, `add-agent-screen`, `clone-agent-modal`, `agent-model-icon`, `model-arena-dashboard` |
| **Chat** | `chat-screen`, `chat-shell`, `chat-message`, `message-input`, `conversation-pane`, `conversation-list`, `mini-ko-chat`, `streaming-response`, `thinking-indicator`, `reasoning-indicator`, `source-viewer` |
| **Email** | `gmail-screen`, `email-screen`, `email-screen-v2` |
| **Contacts** | `contacts-screen`, `person-modal`, `company-modal`, `company-selector` |
| **GC Intel** | `gc-intelligence`, `gc-brief`, `gc-brief-with-chat` |
| **Voice** | `voice-indicator`, `voice-toggle`, `tts-play-button` |
| **Admin** | `user-admin-screen`, `user-card`, `user-detail-screen`, `settings-screen`, `history-screen`, `history-list` |
| **Bluebeam** | `bluebeam-tool-manager` (Phase 7 — modal overlay, tool CRUD, gap analysis, visual config) |
| **Misc** | `startup-sequence`, `ko-glyph`, `resizable-panel`, `pane-divider`, `action-buttons`, `asana-screen`, `zoom-screen`, `prompt-designer` (chat) |

**UI Primitives (`components/ui/`):**
Shadcn/ui-based Radix components: `button`, `card`, `input`, `textarea`, `dialog`, `select`, `dropdown-menu`, `tabs`, `toast`, `tooltip`, `accordion`, `checkbox`, `switch`, `slider`, `progress`, `scroll-area`, `popover`, `separator`, `avatar`, `badge`, `command` (cmdk), etc.

### Custom Hooks (12)

| Hook | Purpose |
|------|---------|
| `useChat` | Chat session management |
| `useGoogleAuth` | Google OAuth integration |
| `useKOPrimeChat` | KO Prime AI chat |
| `useAsana` | Asana task access |
| `useCalendar` | Google Calendar |
| `useGmail` | Gmail messages |
| `useAudioCapture` | Microphone capture |
| `useTTSPlayback` | Text-to-speech |
| `useVoiceWebSocket` | Voice streaming WS |
| `useWebSocketChat` | Chat WebSocket |
| `useChatSpaces` | Google Chat spaces |
| `use-agent-status` | Agent status polling |

### BluebeamToolManager (Phase 7)

**File:** `components/ko/bluebeam-tool-manager.jsx` (774 lines)
**Entry point:** Wrench icon in Estimating Center toolbar
**Props:** `isOpen`, `onClose`, `onSuccess`, `initialView` (optional: 'tools' | 'create')

Modal overlay for managing Bluebeam tool definitions stored in BigQuery `mr_main.bluebeam_tools`.

| View | Purpose |
|------|---------|
| **Tool List** | All 78 tools with label_status badges (empty/matches_subject/custom), section filter, search. Click to edit |
| **Gap Analysis** | Library items missing a linked Bluebeam tool. One-click create or assign |
| **Edit Panel** | Modify tool properties: Subject (system name), Label (REQUIRED, human-readable), Comment (read-only, auto-filled by Bluebeam). Visual config: 32-color palette, fill opacity, line width, visual template selector (A-H categories) |
| **Create/Clone Panel** | Create new tool from scratch with auto-assign to library item, or clone existing tool as starting point |

Three text fields follow Bluebeam XML spec: Subject (system identifier), Label (display name shown in markup), Comment (reserved, read-only).

---

## 8. Google Sheets Integration

### Template System

| Template | Env Var | Purpose |
|----------|---------|---------|
| Master template | `GOOGLE_SHEET_TEMPLATE_ID` (`19HFx...`) | Index/sessions template |
| Takeoff template | `GOOGLE_TAKEOFF_TEMPLATE_ID` (`1n0p_...`) | Per-project takeoff |
| Projects folder | `KO_PROJECTS_ROOT_FOLDER_ID` (`1Fjo-...`) | Google Drive folder |

### Template Structure (3-Tab Workbook)

```
Tab 0: Setup (configuration hub — added Session 35)
Tab 1: DATE → renamed to YYYY-MM-DD on project creation (Session 37)
Tab 2: Library (87 items from BigQuery, read-only reference)
Apps Script: onEdit Column C trigger → auto-populate A, B, N (Session 37)
```

### Setup Tab Layout (Tab 0)

```
     A          B         C           D    E    F      G-M          N     O         P              Q           R
┌──────────┬──────────┬───────────┬────┬────┬──────┬──────────┬─────┬─────────┬──────────────┬───────────┬─────────┐
│ item_id  │ unit_cost│ Scope/Item│ R  │ IN │ TYPE │ Loc Tgls │ UOM │BID TYPE │ Bluebeam Tool│Tool Status│Loc Count│
│ (formula)│ (formula)│ (dropdown)│    │    │      │ (toggles)│(fml)│(dropdown│ (formula)    │ (formula) │(COUNTA) │
├──────────┼──────────┼───────────┼────┼────┼──────┼──────────┼─────┼─────────┼──────────────┼───────────┼─────────┤
│ Mirrors takeoff row layout EXACTLY — same item_ids, same row numbers                                           │
│ Row 3: ROOFING header    │ Row 36: WATERPROOFING header                                                         │
│ Row 40: BALCONIES header │ Row 49: EXTERIOR header                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- Columns A, B, N, P: INDEX+MATCH formulas referencing Library tab
- Column C: Dropdown validated per section (systems/bundle/standalone from Library FILTER formulas)
- Columns G-M: Location toggles — conditional formatting: any value → blue fill, white text
- Column O: BASE/ALTERNATE dropdown — ALTERNATE highlighted orange
- Column Q: `=IF(P{row}<>"", "✓ Ready", "✗ Missing")`
- Column R: `=COUNTA(G{row}:M{row})`

### Takeoff Tab Layout (Tab 1)

```
     A          B         C      D    E    F      G-M        N              O           P
┌──────────┬──────────┬───────┬────┬────┬──────┬────────┬────────────┬────────────┬──────────┐
│ item_id  │ unit_cost│ scope │ R  │ IN │ TYPE │ Locs   │ Total Meas │ Total Cost │ BID TYPE │
├──────────┼──────────┼───────┼────┼────┼──────┼────────┼────────────┼────────────┼──────────┤
│ Row 3: ROOFING section header                                                              │
│ Row 4+: ROOFING items (MR-001 to MR-031)                                                  │
│ ~Row 45: BALCONIES section header                                                          │
│ Row 46+: BALCONIES items                                                                   │
│ ~Row 54: EXTERIOR section header                                                           │
│ Row 55+: EXTERIOR items                                                                    │
│ ~Row 65: WATERPROOFING section header                                                      │
│ Row 66+: WATERPROOFING items                                                               │
└────────────────────────────────────────────────────────────────────────────────────────────-┘
```

**Important:** Column positions shift when estimators delete unused location columns. The codebase uses **dynamic column detection** (via `discoverSheetLayout()` and `findColumnIndices()`) — never hardcoded column letters.

### Dynamic Layout Discovery

The system detects sheet structure at runtime:

1. **Section headers** — Rows where column A starts with `item_id` and another column has scope-like text
2. **Location columns** — Columns between the fixed columns (F) and "Total Measurements" header
3. **Total Measurements** — First column after locations with header containing "total"
4. **Total Cost** — Column after Total Measurements
5. **Row types** — Detected from formulas: `=B4*N4` → ITEM, `=SUM(O6:O8)` → BUNDLE_TOTAL, etc.

Key functions:
- `getActiveSheetName()` in `lib/google-sheets.js` — Returns first tab that isn't "Setup" or "Library"; fallback "DATE" (Session 33)
- `discoverSheetLayout()` in `lib/google-sheets.js` — Returns sections, location maps, column indices
- `findColumnIndices()` in `preview/route.js` — Finds totalMeas/totalCost positions
- `isSectionHeaderRow()` in `preview/route.js` — Detects section boundary rows
- `buildGetSectionForRow()` in `lib/google-sheets.js` — Factory for section membership lookup

---

## 9. Bluebeam Integration

### BTX Generation Flow (v2 — Setup-Aware, Session 40)

```
Setup Tab (items with location toggles G-M)
    ↓ GET /setup-config
readSetupConfig() → active items + location names + tool names
    ↓
UI shows summary dialog (items × locations = tools)
    ↓ User confirms
POST /btx with setupConfig { items, locations }
    ↓
Python backend /bluebeam/generate-btx-per-floor
    ↓
Zip of BTX files (one per floor)
    ↓
1. Saved to Drive → project folder → Markups/
2. Browser downloads .zip
```

Each BTX file contains XML tool definitions. Tool subjects follow the pattern: `MR-003BU2PLY | 1STFLOOR`

**Key change (Session 40):** BTX reads Setup tab toggles (columns G-M) to determine which items and locations to include, instead of reading all items from the takeoff tab via sheet-config. Only items with at least one active toggle are included. The summary dialog shows item/location counts and warns about items missing Bluebeam tools.

**Per-item filtering:** Each BTX file only contains items toggled for that specific location. `items_with_locations` sent to Python backend enables per-floor filtering.

**Multi-section support:** Location names are section-specific (column G = "1st Floor" for ROOFING, "Front / Elevation" for EXTERIOR). The `setup-config` endpoint builds locations as a union of all per-item location names across all 4 sections (ROOFING, WATERPROOFING, BALCONIES, EXTERIOR).

**Project creation:** `createProjectTakeoffSheet()` deletes the DATE tab after template copy. New projects start with Setup + Library only. First takeoff version tab is created via `POST /create-version` after estimator configures Setup.

### CSV Import Flow

```
Bluebeam CSV export (from markup)
    ↓
Next.js /bluebeam route (POST)
    ↓ parse CSV (deterministic or fuzzy)
Match Subject to item_id + location
    ↓
fillBluebeamDataToSpreadsheet()
    ↓ batch-read existing values (Sheets API batchGet)
    ↓ accumulate: new = existing + imported
    ↓ Sheets API batch update
Quantities accumulated to correct cells
    ↓
Save CSV to Drive → Markups/ subfolder
    ↓
Record import to BigQuery import_history
    ↓
Return detailed report (matched with accumulation, unmatched with reassignment options)
```

**Accumulation (Session 41):** Import no longer overwrites. Reads existing cell values first, adds imported quantities. Each matched item reports `previousValue`, `quantity` (imported), `accumulatedTotal`. UI shows "X + Y = Z" for cells with existing data.

**Unmatched reassignment (Session 41):** Items with `NO_COLUMN_MAPPING` show a location dropdown in the UI. User can assign to an available location and re-import selected items.

**Import history (Session 41):** Each import is recorded to `mr_main.import_history` in BigQuery. Import History panel accessible via "History" button on version tab action bar. Shows timestamps, match counts, accumulation mode, and links to CSV files in Drive.

**Cross-section handling:** A merged location map combines all section location names. If an Exterior item was measured on a Roofing floor name (e.g., "MAIN ROOF"), the merged map catches it because all sections share the same physical columns (G-L).

---

## 10. Proposal Pipeline

### Data Flow

```
GET /preview                          POST /generate
┌────────────────────────┐            ┌──────────────────────┐
│ 1. Read sheet A1:Z200  │            │ 1. Receive preview   │
│ 2. Find column indices │            │    data + sortOrder   │
│ 3. Detect section hdrs │            │ 2. Apply sort order   │
│ 4. Classify row types  │            │    (reorder sections  │
│    (ITEM, BUNDLE,      │            │     and items)        │
│     SECTION_TOTAL,     │            │ 3. Fetch descriptions │
│     STANDALONE)        │            │    from BigQuery      │
│ 5. Extract quantities  │            │ 4. Compose paragraphs │
│ 6. Resolve locations   │            │    (system/standalone) │
│ 7. Return JSON         │            │ 5. Replace placeholders│
└────────────────────────┘            │ 6. Split by bid type  │
                                      │    (BASE vs ALT)      │
  UI: TakeoffProposalPreview          │ 7. Merge into DOCX    │
┌────────────────────────┐            │ 8. Save to Drive      │
│ • Drag-to-sort sections│            │ 9. Update version     │
│ • Drag-to-sort items   │            │    tracker status     │
│ • Edit descriptions    │            │ 10. Return .docx      │
│ • BASE/ALT badges      │            └──────────────────────┘
│ • Pass sortOrder to    │
│   generate endpoint    │
└────────────────────────┘
```

### Row Type Detection

Row types are detected from **formulas** in the Total Cost column:

| Type | Formula Pattern | Example |
|------|-----------------|---------|
| ITEM | `=B{row}*{totalMeasCol}{row}` | `=B4*N4` |
| BUNDLE_TOTAL | `=SUM({totalCostCol}{start}:{totalCostCol}{end})` | `=SUM(O6:O8)` |
| SECTION_TOTAL | Multiple `{totalCostCol}{row}` references (5+) | `=O4+O8+O12+...` |
| STANDALONE | `=B{row}*{totalMeasCol}{row}` with no parent bundle | Same formula as ITEM |

### Description Composition

Three modes based on item classification:

1. **System paragraphs** — `system_heading` + `paragraph_description` with placeholders replaced by sheet values (R, IN, TYPE columns)
2. **Bundle fragments** — Component items sorted by `fragment_sort_order`, concatenated into a single sentence
3. **Standalone descriptions** — `standalone_description` used directly, with placeholder replacement

### Word Template

**Current template:** `public/templates/Proposal_Template_v1_FIXED.docx` (v6)
**Engine:** docxtemplater + PizZip

Template variables:
- `{project_name}`, `{prepared_for}`, `{date}`, `{version_date}`
- `{project_summary}` — auto-generated scope summary
- `{#line_items}` loop → `{section_title}`, `{price}`, `{areas}`, `{description}`
- `{#alt_line_items}` loop → same fields for ALT items
- `{#has_alternates}` conditional → ALT items section
- `{base_bid_total}`, `{add_alt_total}`, `{grand_total_bid}`
- `{description}` — composed paragraph text
- Sections and items respect user's drag-to-sort order (Session 42)

---

## 11. AI Agent System

### Architecture

The platform supports multiple AI agent personas, each with specialized tools and knowledge:

```
┌─────────────────────────────────────────────┐
│               Agent Factory                  │
│  /factory/agents  — CRUD agents             │
│  /factory/tools   — Available tools          │
│  /factory/models  — LLM model options        │
├─────────────────────────────────────────────┤
│               Agent Runtime                  │
│  /agents/[id]/chat    — Conversational AI    │
│  /agents/[id]/history — Chat history         │
│  /agents/[id]/training — Training pipeline   │
│  /agents/[id]/enable|disable|restart         │
├─────────────────────────────────────────────┤
│             Specialized Chats                │
│  /ko-prime/chat       — KO Prime (general)   │
│  /estimator-chat      — Estimating assistant  │
│  /prompt-designer/chat — Prompt engineering   │
├─────────────────────────────────────────────┤
│              Voice Pipeline                   │
│  WS /ws/chat  — Text chat (Python backend)   │
│  WS /ws/voice — Voice streaming              │
│  useAudioCapture → useVoiceWebSocket → useTTS │
└─────────────────────────────────────────────┘
```

### Chat Logging

All chat exchanges are logged to BigQuery (`ko_audit.agent_chat_history`) with:
- Conversation/message IDs
- Agent ID, sender type (user/agent/system)
- Token counts (input/output) for cost tracking
- Quality scores and training flags

---

## 12. Key Library Files

| File | Size | Purpose | Critical Functions |
|------|------|---------|-------------------|
| `lib/google-sheets.js` | 45KB | Google Sheets API | `getAccessToken`, `getActiveSheetName`, `copyTemplateSheet`, `fillBluebeamDataToSpreadsheet`, `discoverSheetLayout`, `readSheetValues`, `batchUpdateSheet` |
| `lib/version-management.js` | ~20KB | Version tab CRUD + Setup config | `copyTemplateTabToProject`, `readSetupConfig` (returns items with toggles, tool names, section membership, location names from headers), `transferSetupToVersion`, `hideEmptyRows`, `hideEmptyColumns`, `addVersionTrackerEntry`, `setActiveVersion`, `deleteVersion` |
| `lib/bigquery.js` | ~8KB | BigQuery client | `runQuery`, `getAverageRates`, `getRateForItem` |
| `lib/auth.ts` | ~3KB | NextAuth config | `authOptions`, domain check, admin check |
| `lib/project-storage.js` | ~6KB | GCS-backed project CRUD | `loadProjects`, `saveProjects`, `addProject`, `importProjectsFromCSV` |
| `lib/gcs-storage.js` | ~4KB | GCS raw storage | `readJSON`, `writeJSON`, `deleteObject` |
| `lib/google-token.js` | ~4KB | Token management | `getValidGoogleToken`, `refreshAccessToken`, `makeGoogleApiRequest` |
| `lib/generate-proposal-pdf.js` | ~8KB | PDF generation | jsPDF rendering |
| `lib/chat-logger.js` | ~5KB | Audit logging | `logChatExchange`, `updateMessageScores` |
| `lib/chat-storage.js` | ~4KB | LocalStorage chat | `getConversations`, `addMessage` |

---

## 13. Scripts & Utilities

### By Category

**BigQuery Verification:**
`bq-check.mjs`, `bq-check2.mjs`, `bq-check3.mjs`, `bq-check4.mjs`, `full-bq-check.mjs`, `explore-bigquery.js`, `check-bigquery-match.mjs`

**Google Sheets Operations:**
`search-sheets.mjs`, `read-full-sheet.mjs`, `populate-template.js`, `setup-template-dropdowns.js`, `create-template-sheet.js`, `populate-library-tab.mjs`, `apply-column-c-validation.mjs`, `create-setup-tab.mjs`

**Bluebeam Debugging:**
`complete-mapping.mjs`, `mapping-analysis.mjs`, `debug-headers.js`, `debug-monday-import.js`, `debug-tuesday2-*.js`

**Asana Integration:**
`asana-api.mjs`, `asana-match.mjs`, `check-asana.mjs`, `find-asana-tables.mjs`, `get-asana-dates.mjs`, `add-asana-dates.mjs`, `update-asana-sheet.mjs`

**PDF/Report Generation:**
`generate-report-pdf.mjs`, `generate-projection-pdf.mjs`, `generate-sage-pdf.mjs`, `generate-signed-urls.mjs`

**Data Analysis:**
`analyze-102-fleet.mjs`, `analyze-active-projects.mjs`, `projection-analysis.mjs`

**Item Library:**
`show-item-master.js`, `show-lib-systems.js`, `show-system-mapping.js`, `show-template-data.js`, `query-descriptions.js`, `query-descriptions2.js`

**SQL:**
`setup-proposal-tables.sql` — BigQuery DDL for proposal system tables

**Apps Script (scripts/apps-script/):**
`Code.gs` — Column C onEdit trigger for auto-populating item_id, unit_cost, UOM from Library tab (Session 37)

---

## 14. Deployment & Infrastructure

### Vercel Configuration

```json
{
  "installCommand": "npm install",
  "buildCommand": "npm run build",
  "framework": "nextjs"
}
```

| Setting | Value |
|---------|-------|
| Platform | Vercel |
| Framework | Next.js 16 |
| Region | US (default) |
| Build | `next build` |
| Node | 20.x |

### Environment Variables Required

```
# Auth
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL

# Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_PRIVATE_KEY

# Templates
GOOGLE_SHEET_TEMPLATE_ID
GOOGLE_TAKEOFF_TEMPLATE_ID
KO_PROJECTS_ROOT_FOLDER_ID

# External Services
NEXT_PUBLIC_API_URL=https://136.111.252.120
NEXT_PUBLIC_BACKEND_URL=https://136.111.252.120
NEXT_PUBLIC_WS_URL=wss://136.111.252.120/ws/chat
NEXT_PUBLIC_WS_VOICE_URL=wss://136.111.252.120/ws/voice

# Storage
GCS_BUCKET=master-roofing-raw

# Asana (optional)
ASANA_CLIENT_ID
ASANA_CLIENT_SECRET

# Dev only
NODE_TLS_REJECT_UNAUTHORIZED=0
```

### Build & Deploy Workflow

```
git checkout -b feature/[name]    # New feature branch
npm run build                     # Always build before deploying
git tag v[X.Y]-[description]     # Tag rollback point
git push origin feature/[name]    # Push branch
# Merge to main via PR → Vercel auto-deploys
```

---

## 15. Git History & Rollback Points

### Version Tags (Chronological)

| Tag | Description |
|-----|-------------|
| `v1.0-working-flow` | BTX generation, CSV import, proposal generation |
| `v1.1-session-24` | 7 bug fixes: bundling, locations, standalone, generate |
| `v1.2-bid-type-template-v2` | BID TYPE column + template v2 |
| `v1.4-section-location-headers` | Section-aware location headers |
| `v1.5-code-cleanup` | 2,014 lines deleted |
| `v1.6-btx-dynamic-columns` | 8 hardcoded column bugs fixed |
| `v1.7-cross-section-fix` | Cross-section location fallback |
| `v1.8-dynamic-rows` | Dynamic section header detection (no more hardcoded rows 3/45/54) |
| `v1.9-per-floor-btx` | Per-floor BTX generation (zip of .btx files) |
| `v2.0-description-composition` | Full description library (system paragraphs, bundle fragments, standalone) |

### Branches

| Branch | Status | Purpose |
|--------|--------|---------|
| `main` | **Active** | Production (Vercel auto-deploy) |
| `feature/workbook-rebuild` | Planning | Multi-tab workbook redesign |
| `feature/description-composition` | Merged | Description library content |
| `fix/btx-dynamic-columns` | Merged | Column boundary bug fixes |
| `feature/section-location-headers` | Merged | Section-aware headers |
| `feature/bid-type-and-template-v2` | Merged | BID TYPE feature |
| `experiment/btx-per-floor` | Merged | Per-floor BTX experiment |
| `dev` | Stale | General development |
| `chief_estimator` | Stale | Agent experiment |
| `sheet-first` | Stale | Sheet-first approach |

### Test Projects

| Name | Project ID | Purpose |
|------|-----------|---------|
| SUNDAY - V5 | `proj_db22560e20a04064` | Clean single-section test |
| SUNDAY - V3 | Sheet `1c5_v840g...` | Column shift bug reproduction |
| Monday 09 | `proj_06dcfaef8e6a4cdb` | Multi-section (Roofing/Balconies/Exterior) |
| Monday Night | `proj_0d4693d93c8a460c` | Cross-section Bluebeam test |
| Tuesday 2 | `proj_4222d7446fbc40c5` | General testing |

---

## 16. Known Limitations

| Issue | Status | Notes |
|-------|--------|-------|
| `has_bluebeam_tool` always FALSE | Deferred | Needs Python backend update to populate |
| `has_rate` always FALSE | Deferred | Rate card lacks item_id mapping |
| Folder agent | Stub | Endpoint exists, not implemented |
| Google Chat integration | Deferred | Phase 6, minimal priority |
| User permissions system | Deferred | Phase 7 |
| Sheet `#REF!` on row deletion | Partial | Section totals break when rows deleted; code-side mitigation in v1.8 |
| `lib/proposal-systems.js` | Dead code | Replaced by BigQuery description library; kept for reference |
| `lib/takeoff-to-proposal.js` | Dead code | Same; unused |
| TakeoffSetupScreen wizard | Deleted (Session 46) | Replaced by auto-creation in checkExistingTakeoffSheet + Setup tab in sheet |
| BigQuery region split | Tech debt | `mr_staging` in us-east4, `mr_main` in US multi-region |

---

## 17. Workbook Rebuild (In Progress)

**Design doc:** `docs/WORKBOOK_REBUILD_DESIGN.md`
**Branch:** `main` (feature/setup-tab merged Session 36, feature/apps-script Session 37)
**Status:** Phase 1A + 1B + 1C + 1D + 1E complete

### Current Architecture: 3-Tab Workbook

```
┌───────────────────────────────────────────────────────────┐
│ Tab 0: Setup (configuration hub) — IMPLEMENTED Session 35 │
│ - Mirrors takeoff row layout exactly                      │
│ - Columns: item, cost, scope, R/IN/TYPE, 7 location       │
│   toggles, UOM, bid type, tool name/status, location count │
│ - INDEX+MATCH from Library for A, B, N, P columns         │
│ - Dropdown validation on C (scope) and O (bid type)       │
│ - Conditional formatting: blue toggles, orange ALTERNATE  │
├───────────────────────────────────────────────────────────┤
│ Tab 2: Library (read-only) — 31 columns + 12 FILTER fmls  │
│ - Source: BigQuery v_library_complete + Python Bluebeam   │
│ - 86 items with descriptions, rates, readiness scores     │
│ - Column AE: bluebeam_tool_name (48 items populated)      │
│ - Refreshable on demand                                   │
│ - Protected: read-only for estimators                     │
├───────────────────────────────────────────────────────────┤
│ Tab 1: DATE → renamed to YYYY-MM-DD on project creation   │
│ - Takeoff data: items × locations with quantities          │
│ - CSV import target                                        │
│ - Formulas: unit_cost × total_measurements = total_cost    │
│ - Versioned: new date tab per session (Phase 2)           │
└───────────────────────────────────────────────────────────┘
```

### Changes Already Committed

**Session 35 (feature/setup-tab):**
1. `d7a1c53` — 1E: bluebeam_tool_name populated (48 items), v_library_complete view updated, Library tab enhanced (col 31)
2. `4ec1b8b` — 1A: Setup tab created (index 0) with full row mirror, formulas, dropdowns, conditional formatting
3. `c0e0c72` — 1B: Version tracker area on Setup tab (rows 72-80)

**Session 37 (feature/apps-script):**
4. 1C: Apps Script Column C auto-populate trigger (`scripts/apps-script/Code.gs`)
   - Simple onEdit trigger — fires on manual edits only (NOT on API writes)
   - Checks for formulas before writing (preserves INDEX+MATCH on Setup tab)
   - Writes item_id (A), unit_cost (B), UOM (N, Setup only)
   - Skips Library tab, header/total/bundle rows
5. 1D: Project creation now renames "DATE" tab → YYYY-MM-DD, writes project name to both Setup and version tab

**Session 39+ (feature/version-ui-redo):**
6. 2A: Version creation API — `POST /create-version` copies template tab, transfers Setup config, hides empty rows/cols
7. 2B: Version tracker operations — `GET/PUT/POST/DELETE /versions` for list, activate, copy, delete
8. 2C: Version management UI — `estimating-center-screen.jsx`
   - Version selector bar (below header buttons, visible when embeddedSheetId is truthy)
   - Tab buttons: Setup + version tabs + New Version, with active indicator (green dot)
   - Click tab → switches embedded sheet iframe gid to selected tab
   - Context-aware action bar: Setup tab shows "Create Takeoff" + "Download BTX"; version tab shows "Import CSV" + "Proposal"
   - `loadVersions()` called inside `checkExistingTakeoffSheet` after `setEmbeddedSheetId` (direct call, not useEffect)
   - `currentSheetName` passed to BTX, Upload, and Proposal from selected version tab

**Session 40 (feature/btx-v2):**
9. Phase 3: BTX v2 (Setup-Aware)
   - `readSetupConfig()` enhanced: returns location names from section headers, tool names (col P), section membership per item
   - New API: `GET /setup-config` — reads Setup tab toggles and returns BTX-compatible data
   - BTX route updated: accepts `setupConfig` body format alongside legacy `config`; saves zip to Drive Markups folder
   - Frontend: `handleGenerateBtx` reads setup-config → shows summary dialog (items × locations = tools) → user confirms → downloads
   - Filename changed to `{project}-tools-{YYYY-MM-DD}.zip`

**Session 41 (feature/import-v2):**
10. Phase 4: CSV Import v2 (Accumulation + Staging)
    - `fillBluebeamDataToSpreadsheet()` now batch-reads existing values and accumulates (new = existing + imported)
    - Each import recorded to BigQuery `import_history` with match counts, accumulation mode, CSV file ID
    - Uploaded CSV saved to Drive → Markups/ subfolder ({project}-bluebeam-{date}.csv)
    - Enhanced UploadModal: shows accumulation details (X + Y = Z), unmatched items with location reassignment dropdowns, "Accept Selected" for re-import
    - ImportHistoryModal: lists past imports with timestamps, match stats, Drive CSV links
    - /imports, /compare, /sync routes rewritten from Python proxies to BigQuery-backed
    - "History" button added to version tab action bar

**Session 42 (feature/proposal-v2):**
11. Phase 5: Proposal v2 (Sortable + Enhanced)
    - TakeoffProposalPreview: drag-to-sort sections (DndContext + SortableContext from @dnd-kit)
    - TakeoffProposalPreview: drag-to-sort items within each section (nested DndContext per section)
    - TakeoffProposalPreview: drag-to-sort standalone items
    - GripVertical drag handles on sections and items, 5px activation distance to distinguish clicks from drags
    - sortOrder passed to POST /generate: `{ sections: [{rowNumber, itemOrder}], standalones: [rowNumbers] }`
    - generate/route.js: applySortOrder() reorders preview data before building template
    - Version date (sheet name) included in proposal metadata as `version_date`
    - Proposal naming: `{project}-proposal-{version_date}-{timestamp}.docx` (both download and Drive)
    - After generation: version tracker status updated to "Proposal Generated" via updateVersionStatus()
    - Dependencies added: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
    - "History" button added to version tab action bar

**Session 46 (feature/cleanup-v2):**
12. Phase 10: Cleanup & Deletion
    - Deleted TakeoffSetupScreen wizard (920 lines) — replaced by auto-creation on first project access
    - Deleted TakeoffSpreadsheet legacy modal (329 lines) — replaced by embedded sheet system
    - Deleted line-item-selector.jsx (392 lines) + variant-selector.jsx (198 lines) — orphaned by wizard deletion
    - Deleted /proposal-preview and /test-proposal standalone pages (487 lines)
    - Added workbook auto-creation loading indicator ("Creating takeoff workbook...")
    - Fixed bid type mismatch: proposal code now accepts both 'ALT' and 'ALTERNATE'
    - Total: ~2,381 lines removed

**Session 47 (feature/ui-restructure):**
13. Phase 11A + 11B: UI Restructure — Brand Identity + Main Page
    - Added 13 MR brand SVG files to public/icons/ (buttons, dropdown cards, status icons)
    - Created lib/brand-colors.js with hex constants and verified SVG-to-purpose mapping
    - Created components/ko/project-status-icons.jsx — 6 icon badges with active/inactive states
    - Wired icon bar into estimating-center-screen.jsx below project header
    - Icon detection: BLUEBEAM (embeddedSheetId), TAKEOFF (versions.length), EXPORT (version import status), PROPOSAL (version proposal status), DRAWINGS/MARKUP (Phase 8, always inactive)
    - mix-blend-multiply on icon images to eliminate black PNG backgrounds
    - Removed: header action buttons (Bluebeam, View Takeoff, Proposal, BTX)
    - Removed: version tab bar from main page (navigation via icon clicks)
    - Removed: status cards row (Status, Due Date, Proposal, Assigned)
    - Kept: context-aware action buttons (Create Takeoff, Download BTX, Import CSV, History, Proposal) — replaced by ribbon in Session 48
    - Icons hidden during workbook creation (creatingWorkbook flag)

**Session 48:**
14. Phase 11C + 11D + 11B.12: Setup Ribbon + Version Ribbon
    - Created components/ko/sheet-ribbon.jsx — context-aware ribbon toolbar in embedded sheet overlay
    - Setup ribbon (11C): BTX Tools dropdown (Create Project Tools, Setup New Tool, Edit Existing Tool) + Setup Takeoff dropdown (Create New Sheet, Update Default Sheet disabled)
    - Version ribbon (11D): Import Bluebeam CSV dropdown (Import CSV, Import History) + Create Proposal button + Default toggle
    - Back arrow replaces X close button; layout: ← Back | ProjectName - TabName | [Ribbon Buttons] | Open in Sheets
    - Added initialView prop to BluebeamToolManager for direct navigation to 'create' or 'tools' view
    - Removed old context-aware action buttons from main page (11B.12)
    - Dropdowns: mutual exclusivity via openDropdown state, close on click outside/Escape/option click

15. CSV Import Setup Config Filter (Bug Fix)
    - Bluebeam import route now reads Setup tab toggles via readSetupConfig before writing
    - Builds validTargets map: item_id → Set of active location toggle indices
    - fillBluebeamDataToSpreadsheet filters: ITEM_NOT_ACTIVE (item has no toggles), LOCATION_NOT_ACTIVE (location not toggled for that item)
    - Response includes skippedItems array with reasons
    - Graceful degradation: if Setup read fails, imports without filter

### Remaining Work

- Phase 3.6: Python backend — add WATERPROOFING location codes (FL1-FL7, MR, SBH, EBH) — requires Python server access
- Library tab refresh mechanism
- Migration path for existing single-tab projects

---

## Dependencies (package.json)

### Core Framework
- `next` 16.0.10 + `react` 19.2.0 + `react-dom` 19.2.0
- `typescript` ^5 + `tailwindcss` ^4.1.9

### Google Cloud
- `@google-cloud/bigquery` ^8.1.1
- `@google-cloud/storage` ^7.18.0
- `googleapis` ^170.1.0

### Auth
- `next-auth` ^4.24.13

### UI
- `@dnd-kit/core` ^6.3.1 + `@dnd-kit/sortable` ^10.0.0 + `@dnd-kit/utilities` ^3.2.2 — Drag-to-sort (Session 42)
- `@radix-ui/*` (25 packages) — Headless UI primitives
- `lucide-react` ^0.454.0 — Icons
- `cmdk` 1.0.4 — Command palette
- `sonner` ^1.7.4 — Toast notifications
- `vaul` ^1.1.2 — Drawer
- `recharts` 2.15.4 — Charts
- `react-resizable-panels` ^2.1.7
- `react-day-picker` 9.8.0
- `embla-carousel-react` 8.5.1
- `class-variance-authority` + `clsx` + `tailwind-merge` — Style utils
- `tailwindcss-animate` + `tw-animate-css`

### Document Generation
- `docxtemplater` ^3.67.6 + `pizzip` ^3.2.0 — DOCX templating
- `jspdf` ^4.0.0 — PDF generation
- `@react-pdf/renderer` 4.3.2 — React PDF
- `html2pdf.js` ^0.14.0 — HTML to PDF
- `jszip` ^3.10.1 — ZIP file handling

### Forms & Validation
- `react-hook-form` ^7.60.0 + `@hookform/resolvers` ^3.10.0
- `zod` 3.25.76

### Dates
- `date-fns` 4.1.0

### Analytics
- `@vercel/analytics` 1.3.1

---

*This document is the single source of truth for the KO Platform architecture. Update it when making structural changes.*

---

## 18. CRITICAL AUDIT FINDINGS (Session 30)

### Dead Code — Status (Session 32)
| File | Lines | Status |
|------|-------|--------|
| lib/proposal-systems.js | ~677 | **DELETED** (Session 32) |
| lib/takeoff-to-proposal.js | ~465 | **DELETED** (Session 32) |
| data/scope-items.js | ~400 | **DELETED** (Session 32) |
| lib/generate-proposal-docx.js | ~100 | **DELETED** (Session 32, with proposal-docx-download.jsx + app/proposal-generator/) |
| components/ko/proposal-docx-download.jsx | ~100 | **DELETED** (Session 32) |
| app/proposal-generator/ | ~200 | **DELETED** (Session 32) |
| TEMPLATE_SECTIONS constant | ~15 | **DELETED** (Session 32) |
| ITEM_ID_TO_ROW constant | ~40 | **DELETED** (Session 32) |
| detectSectionFromItemId duplication | — | **CONSOLIDATED** to lib/google-sheets.js (Session 32) |
| Commented-out flat BTX code | ~40 | **DELETED** from btx/route.js (Session 32) |
| components/ko/takeoff-setup-screen.jsx | ~920 | **DELETED** (Session 46) |
| components/ko/takeoff-spreadsheet.jsx | ~329 | **DELETED** (Session 46) |
| components/ko/line-item-selector.jsx | ~392 | **DELETED** (Session 46) |
| components/ko/variant-selector.jsx | ~198 | **DELETED** (Session 46) |
| Wizard Steps 1-3 data flow | — | Config saved to Python backend but NEVER written to sheet | Dead logic |
| ko_estimating.takeoff_configs table | — | Zero live source references. Config fully on Python backend | Dead table |

### What's Working in Production Right Now
- ✅ 4-section template (ROOFING, WATERPROOFING, BALCONIES, EXTERIOR) on main branch
- ✅ Library tab: 30 columns, 80+ items, auto-refreshed from BigQuery v_library_complete on project creation
- ✅ Column C dropdowns: 3 types × 4 sections from Library FILTER formulas (AF-AQ), strict:false
- ✅ Project creation: Drive folder structure + template copy + Library refresh + project name write
- ✅ Sheet-first BTX generation: reads live sheet via sheet-config, proxies to Python backend, returns per-floor zip
- ✅ Bluebeam CSV import: deterministic (pipe-delimited) + fuzzy (27 regex) parsing → accumulates to active takeoff tab (version-aware, Session 33; accumulation + Drive save + import history Session 41)
- ✅ Proposal preview: dynamic section/row detection from formulas, 3-mode description composition from BigQuery (version-aware, Session 33). Drag-to-sort sections and items (Session 42)
- ✅ Proposal DOCX generation: Docxtemplater + Drive upload to Proposals subfolder. Respects custom sort order. Naming: `{project}-proposal-{version}-{ts}.docx` (Session 42)
- ✅ Bid type: BASE/ALT split detected in preview, separate sections in DOCX
- ✅ Version tracker update: proposal generation sets version status to "Proposal Generated" (Session 42)
- ✅ 87 items in item_description_mapping (13 columns queried by preview)
- ✅ 48 items with Bluebeam tools on Python backend
- ✅ Import summary: shows matched/unmatched items with reasons, errors, cells populated (Session 34)
- ✅ Upload success → embedded sheet (not legacy TakeoffSpreadsheet) (Session 34)
- ✅ Python backend URL: env var standardized across 52 source files (Session 34)
- ✅ Git: clean working tree on main, commit d4f27a1 (Session 33) → feature/bugfixes (Session 34)

### Active Bugs (Verified)
1. ~~**Upload success opens legacy component**~~ — **FIXED** (Session 34) — onSuccess now opens embedded sheet if embeddedSheetId exists, falls back to legacy only when no embedded sheet
2. ~~**Embedded sheet close loses state**~~ — **FIXED** (Session 34) — close only nulls embeddedSheetUrl, keeps embeddedSheetId for instant reopen
3. ~~**CSV import overwrites instead of accumulating**~~ — **FIXED** (Session 41) — fillBluebeamDataToSpreadsheet() now batch-reads existing values and accumulates (new = existing + imported). CSV saved to Drive Markups/. Import recorded to BigQuery import_history.
4. **populate-library-tab.mjs clears FILTER formulas** — clears Library tab then rewrites, but formulas in AF-AQ can be lost if script interrupted
5. **[TBD] placeholders in proposals** — when sheet R/IN/TYPE columns are empty, descriptions show [TBD] instead of graceful handling
6. ~~**Bid type mismatch (ALTERNATE vs ALT)**~~ — **FIXED** (Session 46) — generate route and preview component now accept both values

### Import Summary Enhancement (Session 34)
- bluebeam/route.js now returns: `matchedItems`, `unmatchedItems`, `errors`, `cellsPopulated`
- UploadModal displays matched/unmatched items with reasons, errors, and cell count

### Python Backend Env Var Standardization (Session 34)
- **Server-side:** `process.env.PYTHON_BACKEND_URL` (42 API route files)
- **Client-side:** `process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL` (7 component + 3 hook files)
- **CRITICAL: URL must be `http://136.111.252.120:8000`** (port 8000, HTTP, FastAPI direct)
- **DO NOT use `https://136.111.252.120`** (port 443 = nginx, returns 405 on POST endpoints like BTX)
- Fallback in all source files: `'http://136.111.252.120:8000'`
- Both env vars set in `.env.local`, `.env.example`, AND Vercel production dashboard
- WebSocket URLs derived via `.replace('http://', 'ws://')` (no TLS on port 8000)

### Hardcoded "DATE" Tab References — **RESOLVED** (Session 33)
All 3 production source files updated to use `getActiveSheetName()`:
| File | Line | Status |
|------|------|--------|
| lib/google-sheets.js | 575 | **FIXED** — uses `getActiveSheetName()` (Session 33) |
| lib/google-sheets.js | 837 | **FIXED** — accepts `sheetName` param, defaults to `getActiveSheetName()` (Session 33) |
| app/api/ko/takeoff/[projectId]/sheet-config/route.js | 54 | **FIXED** — accepts `?sheet=` param, defaults to `getActiveSheetName()` (Session 33) |
Plus ~12 scripts (non-production, debug/template tools) — intentionally unchanged

### ~~Unwired Infrastructure~~ — **WIRED** (Session 41)
| Route | Backend Status | Frontend Status |
|-------|---------------|----------------|
| /takeoff/[projectId]/imports | **Rewritten**: queries BigQuery import_history (Session 41) | **WIRED**: ImportHistoryModal in estimating-center-screen.jsx |
| /takeoff/[projectId]/compare/[importId] | **Rewritten**: returns import details from BigQuery (Session 41) | Available for future detail view |
| /takeoff/[projectId]/sync/[importId] | **Rewritten**: updates import status in BigQuery (Session 41) | Available for future approval flow |

### Two Parallel Paths (Must Be Reconciled)
| Aspect | Wizard Path | Sheet-First Path (Current) |
|--------|------------|---------------------------|
| Config source | /config endpoint (Python backend) | Live sheet via /sheet-config |
| Sheet creation | Template copy only | Template copy + Library refresh |
| BTX generation | From wizard config | From sheet-config (live sheet) |
| CSV import | Deterministic (if config exists) | Deterministic or fuzzy |
| Item selection | Wizard Step 2 UI | Column C dropdowns in sheet |
| Location setup | Wizard Step 1 UI | Sheet header columns |

The sheet-first path is the active workflow. The wizard path is legacy.

### detectSectionFromItemId() — DUPLICATED
- Location 1: lib/google-sheets.js:877-888
- Location 2: app/api/ko/takeoff/[projectId]/sheet-config/route.js:22-29
- Logic is identical. Should be consolidated to single shared import.

### Template Row Map (55 items across 4 sections)

**ROOFING** — Header row 3, data rows 4-35 (23 items, 6 bundles)
Row 4: MR-001VB, Row 5: MR-002PITCH, Row 6: MR-003BU2PLY, Row 7: MR-004UO
Row 8: MR-010DRAIN, Row 9: MR-011DOORSTD, Row 10: MR-017RAIL
Row 11: MR-018PLUMB, Row 12: MR-019MECH, Row 13: MR-021AC, Row 14: BUNDLE TOTAL
Row 15: MR-006IRMA, Row 16: MR-007PMMA, Row 17: MR-008PMMA, Row 18: MR-009UOPMMA
Row 19: MR-011DOORSTD (dup), Row 20: MR-010DRAIN (dup), Row 21: BUNDLE TOTAL
Rows 22-25: Coping (COPELO, COPEHI, INSUCOPE, TOTAL)
Rows 26-28: Flashing (FLASHBLDG, FLASHPAR, TOTAL)
Rows 29-32: Paver/IRMA (OBIRMA, PAVER, FLASHPAV, TOTAL)
Rows 33-35: Green Roof (GREEN, FLASHGRN, TOTAL)

**WATERPROOFING** — Header row 36, data rows 37-39 (3 standalones, no bundles)
Row 37: MR-032RECESSWP, Row 38: MR-FIRE-LIQ, Row 39: MR-THORO

**BALCONIES** — Header row 40, data rows 41-45 (4 items, 1 bundle)
Row 41: MR-033TRAFFIC, Row 42: MR-034DRIP, Row 43: MR-036DOORBAL, Row 44: MR-035LFLASH, Row 45: TOTAL

**EXTERIOR** — Header row 49, data rows 50-67 (18 items, 3 bundles + 5 standalones)
Rows 50-53: BrickWP bundle (037, 038, 039, TOTAL)
Rows 54-57: PanelWP bundle (040, 041, 042, TOTAL)
Rows 58-62: EIFS bundle (043, 044, 045, 046, TOTAL)
Rows 63-67: Standalones (DRIPCAP, SILL, TIEIN, ADJHORZ, ADJVERT)
Row 68: Exterior total, Row 70: Grand total

### System Item Flags (12 systems, verified by Isaac)
| item_id | is_system | can_standalone | can_bundle | Section |
|---------|-----------|---------------|------------|---------|
| MR-003BU2PLY | TRUE | TRUE | FALSE | ROOFING |
| MR-006IRMA | TRUE | TRUE | FALSE | ROOFING |
| MR-022COPELO | TRUE | TRUE | FALSE | ROOFING |
| MR-023COPEHI | TRUE | TRUE | FALSE | ROOFING |
| MR-025FLASHBLDG | TRUE | TRUE | FALSE | ROOFING |
| MR-027OBIRMA | TRUE | TRUE | FALSE | ROOFING |
| MR-030GREEN | TRUE | TRUE | FALSE | ROOFING |
| MR-033TRAFFIC | TRUE | TRUE | TRUE | BALCONIES |
| MR-037BRICKWP | TRUE | TRUE | FALSE | EXTERIOR |
| MR-040PANELWP | TRUE | TRUE | FALSE | EXTERIOR |
| MR-043EIFS | TRUE | TRUE | FALSE | EXTERIOR |
Rule: Systems CANNOT bundle (can_bundle=FALSE) — only exception is MR-033TRAFFIC.

### Description Composition Detail
Preview route (preview/route.js) queries 13 columns from item_description_mapping:
```
item_id, paragraph_description, scope_name, display_name, section,
row_type, is_system, can_bundle, can_standalone, system_heading,
bundle_fragment, standalone_description, fragment_sort_order
```

buildDescription(item, descriptions, mode, bundleItems):
- **system mode:** Start with system's paragraph_description → collect all bundle siblings' bundle_fragment sorted by fragment_sort_order → concatenate
- **standalone mode:** standalone_description → paragraph_description → display_name (first non-empty)
- **default mode:** paragraph_description → display_name

Placeholder replacement (case-insensitive): {R_VALUE}→col D, {THICKNESS}→col E, {TYPE}/{MATERIAL_TYPE}→col F, unfilled→[TBD]

### Dropdown Variant Items (on parent rows, NOT own rows)
| Parent | Variants |
|--------|----------|
| MR-001VB | MR-TEMPBLUE, MR-TEMPFIRE |
| MR-006IRMA | MR-IRMA-SBS, MR-IRMA2PLY, MR-SIPLAST, MR-PMMA-IRMA |
| MR-028PAVER | MR-PAVER-CONC, MR-PAVER-PORC, MR-BALLAST, MR-GRAVEL, MR-TURF |
| MR-033TRAFFIC | MR-LAVA, MR-SOP-TRAFFIC, MR-MASTERSEAL |
| MR-037BRICKWP | MR-BLUESKIN, MR-EXTWP |
| MR-043EIFS | MR-EIFS-BRICK |
| MR-PMMA-FLASH | MR-LIQBINDER, MR-LIQFLASH |

---

## 19. Pre-Rebuild Baseline (Session 31)

| Item | Value |
|------|-------|
| Baseline commit | `dfd8ba6` (main branch) |
| Git tag | `v2.0-pre-rebuild` |
| Template backup | `1Ykh3y_ghNwIcpDEJ0b7w9z8WFCqDkIMDaiRiLfMiL2M` (Drive: Backups/v2.0-pre-rebuild/) |
| item_description_mapping CSV | `1b8m0CPqKp-W-dFcN15LSDJroZoXDhDZl` (87 rows) |
| lib_takeoff_template CSV | `1cq3NqU53SYkR52DN-6ijMLHMjxtA-kky` (60 rows) |
| v_library_complete CSV | `1JcN7JJw8f6Vxfa3eJhlCOotdsCUpjOKz` (86 rows) |
| Backup folder | `1zBKwmq_E3ww_T1Jo3F_lWwwb8PGC726-` (Drive: Backups/v2.0-pre-rebuild/) |
| Backup date | 2026-02-12 |
| Backed up by | Session 31 (Infrastructure + Backup) |
