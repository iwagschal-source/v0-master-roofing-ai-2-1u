# Architecture Bible — KO Platform (Master Roofing AI)

> **Repo:** `v0-master-roofing-ai-2-1u`
> **Stack:** Next.js 16 + React 19 + Tailwind 4 + Radix UI
> **Deployed:** Vercel — https://v0-master-roofing-ai-2-1u.vercel.app
> **Current version:** v2.0-description-composition (main branch)
> **Last updated:** 2026-02-12

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
│   │   ├── bluebeam/                 # Bluebeam file conversion
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
│   │   ├── takeoff-setup-screen.jsx  # Takeoff wizard
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
│   ├── google-sheets.js              # Sheets API (45KB, core file)
│   ├── bigquery.js                   # BigQuery client
│   ├── gcs-storage.js                # Google Cloud Storage
│   ├── project-storage.js            # Project CRUD (GCS-backed)
│   ├── google-token.js               # Token management
│   ├── generate-proposal-docx.js     # DOCX generation
│   ├── generate-proposal-pdf.js      # PDF generation
│   ├── proposal-systems.js           # Roofing system definitions
│   ├── takeoff-to-proposal.js        # Takeoff → proposal conversion
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
│   ├── scope-items.js                # Item library (100+ items)
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
│  │ 136.111.252.120  │  │ (OAuth2)  │  │ (Gmail, Calendar │  │
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
| `mr_main` | US (multi-region) | `item_description_mapping`, `lib_takeoff_template`, `estimator_rate_card`, `v_library_complete`, `project_folders` |
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
item_description_mapping (87 items: 58 original + 29 Cat 2)
├── item_id         (MR-001 through MR-051, MR-FIRE-*, MR-THORO-*)
├── section         (ROOFING | BALCONIES | EXTERIOR | WATERPROOFING)
├── display_name    (user-friendly name)
├── scope_name      (technical spec name)
├── row_type        (item | system | header)
├── is_system       (TRUE = system parent item)
├── can_bundle      (TRUE = can appear in bundles)
├── can_standalone  (TRUE = can appear standalone)
├── system_heading  (paragraph title for system items)
├── paragraph_description  (full system paragraph, with {R_VALUE}/{THICKNESS}/{TYPE} placeholders)
├── bundle_fragment (component text fragment for bundles)
├── standalone_description (full standalone paragraph)
├── fragment_sort_order    (1-85, controls fragment ordering)
└── description_status     (complete | partial | missing)

lib_takeoff_template (per-item specs)
├── uom             (SF, LF, EA, etc.)
├── default_unit_cost
├── has_r_value     (TRUE/FALSE)
├── has_thickness   (TRUE/FALSE)
├── has_material_type (TRUE/FALSE)
└── sort_order

estimator_rate_card (historical rates by GC)
├── gc_name
├── median_unit_cost / avg_unit_cost
├── min_rate / max_rate
├── project_count
└── confidence_level

v_library_complete (view joining all above)
└── readiness_score (1-6)
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
| `/sheet-config` | GET | Read actual Google Sheet layout dynamically |
| `/config` | GET/POST | Read/write wizard-generated config |
| `/btx` | GET | Generate per-floor BTX zip (calls Python backend) |
| `/bluebeam` | POST | Import Bluebeam CSV into sheet |
| `/generate` | POST | Generate proposal from takeoff |
| `/imports` | GET/POST | List/create takeoff imports |
| `/sync/[importId]` | POST | Sync import with sheet |
| `/compare/[importId]` | GET | Compare import versions |
| `/library` | GET | Get library items with GC-specific rates |
| `/create` | POST | Create new takeoff |

### Proposal Operations (`/api/ko/proposal/[projectId]/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/preview` | GET | Extract + preview proposal data from sheet |
| `/generate` | POST | Generate DOCX from sheet data |

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
| `/admin/system-config` | POST | System configuration |
| `/admin/agent-code/[agentId]` | GET | Agent code inspection |
| `/arena/models` | POST | Model arena testing |
| `/network/agents` | GET | Agent network topology |

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
| **Estimating** | `estimating-center-screen`, `takeoff-setup-screen`, `takeoff-spreadsheet`, `embedded-sheet`, `variant-selector`, `line-item-selector` |
| **Proposals** | `proposal-preview-screen`, `proposal-document`, `proposal-template`, `proposal-template-v2`, `proposal-pdf-download`, `proposal-docx-download`, `takeoff-proposal-preview` |
| **Projects** | `project-folders-screen`, `project-folder`, `project-folder-detail`, `project-folder-light`, `project-card`, `project-detail-screen`, `create-project-modal` |
| **AI Agents** | `agent-dashboard-screen`, `agent-detail-screen`, `agent-card`, `agent-grid`, `agent-network-map-screen`, `add-agent-screen`, `clone-agent-modal`, `agent-model-icon`, `model-arena-dashboard` |
| **Chat** | `chat-screen`, `chat-shell`, `chat-message`, `message-input`, `conversation-pane`, `conversation-list`, `mini-ko-chat`, `streaming-response`, `thinking-indicator`, `reasoning-indicator`, `source-viewer` |
| **Email** | `gmail-screen`, `email-screen`, `email-screen-v2` |
| **Contacts** | `contacts-screen`, `person-modal`, `company-modal`, `company-selector` |
| **GC Intel** | `gc-intelligence`, `gc-brief`, `gc-brief-with-chat` |
| **Voice** | `voice-indicator`, `voice-toggle`, `tts-play-button` |
| **Admin** | `user-admin-screen`, `user-card`, `user-detail-screen`, `settings-screen`, `history-screen`, `history-list` |
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

---

## 8. Google Sheets Integration

### Template System

| Template | Env Var | Purpose |
|----------|---------|---------|
| Master template | `GOOGLE_SHEET_TEMPLATE_ID` (`19HFx...`) | Index/sessions template |
| Takeoff template | `GOOGLE_TAKEOFF_TEMPLATE_ID` (`1n0p_...`) | Per-project takeoff |
| Projects folder | `KO_PROJECTS_ROOT_FOLDER_ID` (`1Fjo-...`) | Google Drive folder |

### Takeoff Sheet Layout (Current — Single Tab)

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
- `discoverSheetLayout()` in `lib/google-sheets.js` — Returns sections, location maps, column indices
- `findColumnIndices()` in `preview/route.js` — Finds totalMeas/totalCost positions
- `isSectionHeaderRow()` in `preview/route.js` — Detects section boundary rows
- `buildGetSectionForRow()` in `lib/google-sheets.js` — Factory for section membership lookup

---

## 9. Bluebeam Integration

### BTX Generation Flow

```
Sheet Config (items + locations)
    ↓
Next.js /btx route
    ↓ POST with items[] + locations[]
Python backend /bluebeam/generate-btx-per-floor
    ↓
Zip of BTX files (one per floor)
    ↓
Browser downloads .zip
```

Each BTX file contains XML tool definitions. Tool subjects follow the pattern: `MR-003BU2PLY | 1STFLOOR`

### CSV Import Flow

```
Bluebeam CSV export (from markup)
    ↓
Next.js /bluebeam route (POST)
    ↓ parse CSV
Match Subject to item_id + location
    ↓
fillBluebeamDataToSpreadsheet()
    ↓ Sheets API batch update
Quantities written to correct cells
```

**Cross-section handling:** A merged location map combines all section location names. If an Exterior item was measured on a Roofing floor name (e.g., "MAIN ROOF"), the merged map catches it because all sections share the same physical columns (G-L).

---

## 10. Proposal Pipeline

### Data Flow

```
GET /preview                          POST /generate
┌────────────────────────┐            ┌──────────────────────┐
│ 1. Read sheet A1:Z200  │            │ 1. Receive preview   │
│ 2. Find column indices │            │    data + options     │
│ 3. Detect section hdrs │            │ 2. Fetch descriptions │
│ 4. Classify row types  │            │    from BigQuery      │
│    (ITEM, BUNDLE,      │            │ 3. Compose paragraphs │
│     SECTION_TOTAL,     │            │    (system/standalone) │
│     STANDALONE)        │            │ 4. Replace placeholders│
│ 5. Extract quantities  │            │    ({R_VALUE}, etc.)  │
│ 6. Resolve locations   │            │ 5. Merge into DOCX    │
│ 7. Return JSON         │            │    template           │
└────────────────────────┘            │ 6. Split by bid type  │
                                      │    (BASE vs ALT)      │
                                      │ 7. Return .docx       │
                                      └──────────────────────┘
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
- `{projectName}`, `{gcName}`, `{address}`, `{date}`
- `{#sections}` loop → `{sectionName}`, `{#items}` loop
- `{#has_alternates}` conditional → ALT items section
- `{description}` — composed paragraph text

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
| `lib/google-sheets.js` | 45KB | Google Sheets API | `getAccessToken`, `copyTemplateSheet`, `fillBluebeamDataToSpreadsheet`, `discoverSheetLayout`, `readSheetValues`, `batchUpdateSheet` |
| `lib/bigquery.js` | ~8KB | BigQuery client | `runQuery`, `getAverageRates`, `getRateForItem` |
| `lib/auth.ts` | ~3KB | NextAuth config | `authOptions`, domain check, admin check |
| `lib/project-storage.js` | ~6KB | GCS-backed project CRUD | `loadProjects`, `saveProjects`, `addProject`, `importProjectsFromCSV` |
| `lib/gcs-storage.js` | ~4KB | GCS raw storage | `readJSON`, `writeJSON`, `deleteObject` |
| `lib/google-token.js` | ~4KB | Token management | `getValidGoogleToken`, `refreshAccessToken`, `makeGoogleApiRequest` |
| `lib/generate-proposal-docx.js` | ~10KB | DOCX generation | docxtemplater + PizZip merge |
| `lib/generate-proposal-pdf.js` | ~8KB | PDF generation | jsPDF rendering |
| `lib/proposal-systems.js` | ~15KB | System definitions | 50+ roofing system configs |
| `lib/takeoff-to-proposal.js` | ~6KB | Data conversion | Takeoff → proposal line items |
| `lib/chat-logger.js` | ~5KB | Audit logging | `logChatExchange`, `updateMessageScores` |
| `lib/chat-storage.js` | ~4KB | LocalStorage chat | `getConversations`, `addMessage` |

---

## 13. Scripts & Utilities

### By Category

**BigQuery Verification:**
`bq-check.mjs`, `bq-check2.mjs`, `bq-check3.mjs`, `bq-check4.mjs`, `full-bq-check.mjs`, `explore-bigquery.js`, `check-bigquery-match.mjs`

**Google Sheets Operations:**
`search-sheets.mjs`, `read-full-sheet.mjs`, `populate-template.js`, `setup-template-dropdowns.js`, `create-template-sheet.js`, `populate-library-tab.mjs`, `apply-column-c-validation.mjs`

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
| BigQuery region split | Tech debt | `mr_staging` in us-east4, `mr_main` in US multi-region |

---

## 17. Workbook Rebuild (Planned)

**Design doc:** `docs/WORKBOOK_REBUILD_DESIGN.md`
**Branch:** `feature/workbook-rebuild`
**Status:** In progress — template structure committed, Library tab population working

### Target Architecture: 3-Tab Workbook

```
┌───────────────────────────────────────────────────────────┐
│ Tab 1: Library (read-only)                                │
│ - Source: BigQuery v_library_complete + Python Bluebeam   │
│ - All 87 items with descriptions, rates, readiness scores │
│ - Refreshable on demand                                   │
│ - Protected: read-only for estimators                     │
├───────────────────────────────────────────────────────────┤
│ Tab 2: Bluebeam Setup (control center)                    │
│ - Rows: items from Library (dropdown validated)           │
│ - Columns: locations set by estimator                     │
│ - Cells: checkboxes (TRUE/FALSE)                          │
│ - Drives BTX generation + Takeoff tab visibility          │
├───────────────────────────────────────────────────────────┤
│ Tab 3: Takeoff — [DATE] (auto-populated)                  │
│ - Items/locations from Bluebeam Setup checkboxes          │
│ - CSV import target                                       │
│ - Formulas: unit_cost × total_measurements = total_cost   │
│ - Versioned: new date tab per session                     │
└───────────────────────────────────────────────────────────┘
```

### Changes Already Committed (feature/workbook-rebuild)

1. `c11dddd` — 4-section template rebuild: SECTION_NAMES, TEMPLATE_SECTIONS, ITEM_ID_TO_ROW all updated for WATERPROOFING
2. `77bd92e` — Fallback template + lib_takeoff_template updates for WATERPROOFING
3. `87259b5` — Post-copy project name write + Library tab BigQuery refresh
4. `580d336` — Column C dropdowns with INDEX+MATCH auto-populate for item_id and unit_cost

### Remaining Work

- Bluebeam Setup tab implementation (checkbox matrix)
- Setup ↔ Takeoff tab sync (show/hide rows/columns based on checkboxes)
- BTX generation reads checkbox state
- New version tab creation (`+` button)
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

### Dead Code — Confirmed Safe to Delete (~1,600 lines)
| File | Lines | Evidence | Safe to Delete |
|------|-------|----------|---------------|
| lib/proposal-systems.js | ~677 | Zero active imports. Only imported by takeoff-to-proposal.js which is also dead | YES |
| lib/takeoff-to-proposal.js | ~465 | Zero active imports anywhere in codebase | YES |
| data/scope-items.js | ~400 | Zero active imports. Superseded by BigQuery item_description_mapping | YES |
| lib/generate-proposal-docx.js | ~100 | Only used by standalone /proposal-generator page (demo) | YES (with page) |
| TEMPLATE_SECTIONS constant (google-sheets.js:671) | ~15 | Dynamic scanning via discoverSheetLayout() used instead | YES |
| ITEM_ID_TO_ROW constant (google-sheets.js:680) | ~40 | Dynamic Column A scanning used instead | YES |
| Wizard Steps 1-3 data flow | — | Config saved to Python backend but NEVER written to sheet | Dead logic |
| ko_estimating.takeoff_configs table | — | Zero live source references. Config fully on Python backend | Dead table |

### What's Working in Production Right Now
- ✅ 4-section template (ROOFING, WATERPROOFING, BALCONIES, EXTERIOR) on main branch
- ✅ Library tab: 30 columns, 80+ items, auto-refreshed from BigQuery v_library_complete on project creation
- ✅ Column C dropdowns: 3 types × 4 sections from Library FILTER formulas (AF-AQ), strict:false
- ✅ Project creation: Drive folder structure + template copy + Library refresh + project name write
- ✅ Sheet-first BTX generation: reads live sheet via sheet-config, proxies to Python backend, returns per-floor zip
- ✅ Bluebeam CSV import: deterministic (pipe-delimited) + fuzzy (27 regex) parsing → writes to DATE tab
- ✅ Proposal preview: dynamic section/row detection from formulas, 3-mode description composition from BigQuery
- ✅ Proposal DOCX generation: Docxtemplater + Drive upload to Proposals subfolder
- ✅ Bid type: BASE/ALT split detected in preview, separate sections in DOCX
- ✅ 87 items in item_description_mapping (13 columns queried by preview)
- ✅ 48 items with Bluebeam tools on Python backend
- ✅ Git: clean working tree on main, commit d4f27a1

### Active Bugs (Verified)
1. **Upload success opens legacy component** — estimating-center-screen.jsx:1121 sets showTakeoffSheet (legacy TakeoffSpreadsheet) instead of showEmbeddedSheet
2. **Embedded sheet close loses state** — line 1094 nulls embeddedSheetId, requiring re-fetch via checkExistingTakeoffSheet() to reopen
3. **CSV import overwrites instead of accumulating** — fillBluebeamDataToSpreadsheet() writes new values, doesn't add to existing
4. **populate-library-tab.mjs clears FILTER formulas** — clears Library tab then rewrites, but formulas in AF-AQ can be lost if script interrupted
5. **[TBD] placeholders in proposals** — when sheet R/IN/TYPE columns are empty, descriptions show [TBD] instead of graceful handling

### Hardcoded "DATE" Tab References (Exactly 3 Source Files)
| File | Line | Code |
|------|------|------|
| lib/google-sheets.js | 575 | `'DATE'!A2` (post-copy project name write) |
| lib/google-sheets.js | 901 | `const sheetName = 'DATE'` (fillBluebeamDataToSpreadsheet) |
| app/api/ko/takeoff/[projectId]/sheet-config/route.js | 66 | `const sheetName = 'DATE'` |
Plus ~12 scripts (non-production, debug/template tools)

### Unwired Infrastructure (Backend Built, No Frontend)
| Route | Backend Status | Frontend Status |
|-------|---------------|----------------|
| /takeoff/[projectId]/imports | Active (proxies to Python) | ZERO UI references |
| /takeoff/[projectId]/compare/[importId] | Active (proxies to Python) | ZERO UI references |
| /takeoff/[projectId]/sync/[importId] | Active (proxies to Python) | ZERO UI references |

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
