# Session 60 — Project Communication Logging Audit

## Date: 2026-02-20

## Current State

### Table: `master-roofing-intelligence.mr_main.project_communications`

**Status:** EXISTS and FUNCTIONAL

### Current Schema

| Column | Type | Purpose |
|--------|------|---------|
| `id` | STRING | Unique ID (`comm_<timestamp>_<random>`) |
| `project_id` | STRING | Canonical project ID |
| `comm_type` | STRING | 'email' or 'chat' |
| `source_id` | STRING | Gmail message ID or chat space ID |
| `subject` | STRING | Email subject or chat topic |
| `content` | STRING | Snippet (~200 chars) |
| `from_address` | STRING | Sender email |
| `to_address` | STRING | Recipient email |
| `comm_date` | TIMESTAMP | When communication occurred |
| `notes` | STRING | Metadata: "threadId: X; loggedBy: Y" |
| `created_at` | TIMESTAMP | When logged |
| `updated_at` | TIMESTAMP | Last update |

### API Endpoints

- `GET /api/ko/project-communications?projectId=X` — fetch all communications for a project (limit 100)
- `GET /api/ko/project-communications?sourceId=X` — check if a specific email is already logged
- `POST /api/ko/project-communications` — log an email/chat to a project

### UI Integration

- **Gmail screen**: "Log to Project" dropdown in email preview (gmail-screen.jsx lines 462-554)
- **Chat screen**: Same pattern (chat-screen.jsx lines 314-406)
- Green badge shows "Logged to {ProjectName}" on success
- Badge resets when selecting a different email

### Data Flow

1. User clicks "Log to Project" → dropdown opens with searchable project list
2. Projects fetched from `/api/ko/project-folders`
3. User selects project → POST to `/api/ko/project-communications`
4. Record inserted into BigQuery `project_communications` table
5. UI shows green success badge

## Schema Gaps (vs Phase 13 Master Plan Spec)

The current table is **functional but simplified**. Missing columns for future migration:

| Missing Column | Type | Purpose |
|----------------|------|---------|
| `thread_id` | STRING | Currently buried in `notes` field — needs its own column |
| `auto_logged` | BOOLEAN | Distinguish manual log vs auto-log (thread inheritance) |
| `direction` | STRING | inbound / outbound / internal |
| `participants` | ARRAY<STRING> | All participants in communication |
| `summary` | STRING | AI-generated communication synopsis |
| `metadata` | JSON | Rich structured data |
| `logged_by` | STRING | Currently in `notes` field — needs own column |

## Migration Plan (DEFERRED — not this session)

1. ALTER TABLE to add `thread_id`, `auto_logged`, `direction`, `logged_by` columns
2. Backfill `thread_id` and `logged_by` from `notes` field parsing
3. Update POST endpoint to write to new columns
4. Implement thread inheritance: when a reply arrives in a logged thread, auto-create a new log entry with `auto_logged=true`
5. Add remaining columns (`participants`, `summary`, `metadata`) when AI summarization is built

## Folder Agent Stub

- `/api/ko/folder-agent/[projectId]/communications/route.js` — EXISTS but returns stub data
- Planned for AI-generated communication summaries per project
- Related `communication_intelligence` table not yet created

## Key Finding

**Data IS persisted to BigQuery** — this is NOT client-side-only state. The green badge is UI-only (resets per email selection), but the underlying data survives page refresh, browser restart, and logout/login.
