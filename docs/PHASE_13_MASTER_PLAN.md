# PHASE 13 — MASTER ARCHITECTURE PLAN
# Communications Integration + Project Detail Redesign

## Document Type: ARCHITECTURE PLAN (not a session opener)
## Created: 2026-02-19
## Architect: Claude (Anthropic) for Isaac / Master Roofing / A Eye Corp
## Status: PLANNING — No code changes until session openers are written

---

## EXECUTIVE SUMMARY

Phase 13 adds a unified communications layer to the KO platform: Gmail, Google Chat, and Google Meet — all integrated with the project system. Any communication can be logged to a project. Communications initiated from a project page are auto-logged. The Project Detail page is redesigned with a communication log, multi-purpose working window, and intelligence panels.

This is the largest platform expansion since Phase 12 (Project Folders). It touches authentication, Google APIs, page layouts, BigQuery schema, and the core project data model. It MUST be planned holistically and built incrementally.

---

## ARCHITECTURAL PRINCIPLES FOR PHASE 13

### 1. AUDIT BEFORE EVERY SESSION
Every session opener MUST begin with a comprehensive swarm audit:
- Swarm 10+ agents to read every file that will be touched
- Map all existing routes, components, API endpoints, and data flows
- Report findings BEFORE any code changes
- No assumptions. No hallucinations. Read the code.

### 2. BUILD ON DEV, TEST ON DEV, THEN MERGE
```
Code change → Build → Start dev server → Test endpoint/UI manually → 
Verify no regressions → ONLY THEN commit → Push to main
```
NO MORE "build passes so it's fine" — every feature must be tested end-to-end on the dev server with real or dummy data before merging.

### 3. ONE FEATURE PER COMMIT
Learned from Session 50. If something breaks, revert ONE commit, not the whole session.

### 4. SWARM AGENTS FOR ALL READS
Save token space. Use agents for auditing, reading, diffing, searching. Reserve the main context for decision-making and code writing.

### 5. BIGQUERY TRACKING
Every session updates the implementation tracker in BigQuery and syncs to Google Sheet. Every task has a row. No exceptions.

### 6. CANONICAL PROJECT IDS
All new tables use the same project IDs from the master project table. No separate ID systems. Everything joins on the same canonical project_id.

### 7. THREAD-LEVEL LOGGING
When an email is logged to a project, the entire thread is logged. Replies auto-inherit the project association. One thread = one project (no multi-project at this time).

---

## CURRENT STATE AUDIT REQUIREMENTS

Before Phase 13 coding begins, Session 59 must produce a COMPLETE audit of:

### Google Integration (existing)
- [ ] OAuth configuration: Google Cloud Console project, client ID, client secret, redirect URIs
- [ ] Current OAuth scopes requested
- [ ] The redirect URI mismatch error — exact error message, current URI vs expected
- [ ] Existing Google API routes in the codebase
- [ ] Any existing Gmail, Chat, Calendar, Meet integration code
- [ ] Service account configuration (used for Drive)
- [ ] How users currently authenticate (NextAuth? Custom? Cookies?)

### Communications Pages (existing)
- [ ] The current Meetings/Calendar page — what exists, what works
- [ ] Any existing email-related pages or components
- [ ] Any existing chat-related pages or components
- [ ] The home page current state (5 icons + chat screen from Session 57/58)

### Project Detail Page (existing "Estimating Center")
- [ ] Current left panel: project card scroller, toolbar buttons, search
- [ ] Current center panel: status bar, working area, agent
- [ ] Current right panel: Agent Preview / activity feed
- [ ] All toolbar buttons and their handlers
- [ ] How projects are selected and loaded
- [ ] The status icon bar — what icons exist, what they do

### Data Model (existing)
- [ ] BigQuery tables related to projects
- [ ] BigQuery tables related to communications (if any)
- [ ] How project IDs are structured (canonical format)
- [ ] Google Sheets API integration points
- [ ] Drive folder structure per project

---

## BIGQUERY SCHEMA — NEW TABLES

### Table 1: `project_communication_log`
The core association table. Links communications to projects.

```sql
CREATE TABLE IF NOT EXISTS `master-roofing-intelligence.mr_main.project_communication_log` (
  id STRING NOT NULL,                          -- UUID
  project_id STRING NOT NULL,                  -- Canonical project ID (FK to master project table)
  communication_type STRING NOT NULL,          -- 'email' | 'chat' | 'meeting'
  communication_id STRING NOT NULL,            -- Gmail message ID, Chat message ID, or Meet recording ID
  thread_id STRING,                            -- Gmail thread ID (for thread-level logging)
  subject STRING,                              -- Email subject / Chat topic / Meeting title
  participants ARRAY<STRING>,                  -- Email addresses of all participants
  direction STRING,                            -- 'inbound' | 'outbound' | 'internal'
  logged_by STRING NOT NULL,                   -- User who logged it (email address)
  auto_logged BOOL DEFAULT FALSE,              -- TRUE if logged from project page, FALSE if manually logged
  logged_at TIMESTAMP NOT NULL,                -- When the logging action occurred
  communication_timestamp TIMESTAMP NOT NULL,  -- When the actual communication happened
  summary STRING,                              -- AI-generated summary (populated async)
  metadata JSON                                -- Raw data, labels, attachments info
);
```

**Constraints:**
- One communication → one project (no multi-project)
- Thread-level: if thread_id is set, ALL messages in that thread are associated with the project
- `project_id` must exist in the master project table

### Table 2: `communication_intelligence`
AI-generated summaries and insights per project.

```sql
CREATE TABLE IF NOT EXISTS `master-roofing-intelligence.mr_main.communication_intelligence` (
  id STRING NOT NULL,
  project_id STRING NOT NULL,
  intelligence_type STRING NOT NULL,           -- 'communication_summary' | 'project_intelligence'
  content STRING NOT NULL,                     -- Markdown-formatted intelligence content
  generated_by STRING DEFAULT 'ko_agent',      -- Which agent/model generated this
  generated_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,                        -- When this intelligence becomes stale
  source_communication_ids ARRAY<STRING>,      -- Which communications fed this intelligence
  metadata JSON
);
```

### Table 3: `user_google_tokens`
OAuth tokens per user for Google API access.

```sql
CREATE TABLE IF NOT EXISTS `master-roofing-intelligence.mr_main.user_google_tokens` (
  user_id STRING NOT NULL,                     -- Platform user ID
  email STRING NOT NULL,                       -- Google email address
  access_token STRING NOT NULL,                -- OAuth access token (encrypted)
  refresh_token STRING,                        -- OAuth refresh token (encrypted)
  token_expiry TIMESTAMP NOT NULL,
  scopes STRING NOT NULL,                      -- Granted scopes (comma-separated)
  connected_at TIMESTAMP NOT NULL,
  last_used_at TIMESTAMP,
  is_active BOOL DEFAULT TRUE
);
```

---

## OAUTH SCOPES — REQUEST ALL UPFRONT

Request all scopes during initial OAuth consent so users don't have to re-authorize later:

```
https://www.googleapis.com/auth/gmail.readonly        -- Read emails
https://www.googleapis.com/auth/gmail.send             -- Send emails
https://www.googleapis.com/auth/gmail.modify           -- Modify labels, mark read
https://www.googleapis.com/auth/gmail.compose          -- Compose emails
https://www.googleapis.com/auth/chat.messages.readonly -- Read Google Chat messages
https://www.googleapis.com/auth/chat.messages          -- Send Google Chat messages
https://www.googleapis.com/auth/calendar.readonly      -- Read calendar events
https://www.googleapis.com/auth/calendar.events        -- Create/modify calendar events
https://www.googleapis.com/auth/meetings.space.readonly -- Read Meet spaces
https://www.googleapis.com/auth/drive.readonly         -- Read Drive (already have via service account)
https://www.googleapis.com/auth/userinfo.email         -- User's email
https://www.googleapis.com/auth/userinfo.profile       -- User's profile
```

---

## PHASE 13 BREAKDOWN — 7 SUB-PHASES

### Phase 13A: OAuth Fix + Google Authentication (Session 59)
**Goal:** Fix the 400 redirect URI error, establish working OAuth flow, store tokens.

**Tasks:**
1. Audit entire Google integration codebase (swarm agents)
2. Fix Google Cloud Console OAuth configuration (redirect URIs)
3. Implement/fix OAuth flow: login → consent → callback → store tokens
4. Store tokens in BigQuery `user_google_tokens` table
5. Token refresh logic (auto-refresh expired tokens)
6. Verify: user can sign in with Google, tokens are stored, tokens can access Gmail API
7. No UI changes — backend only

**Dependencies:** Google Cloud Console access (Isaac may need to update settings manually)
**Risk:** Low — configuration + plumbing work
**Testing:** Hit Gmail API with stored token, verify email list returns

---

### Phase 13B: Communications Hub — Email Reading (Session 60)
**Goal:** Build the Communications Hub page with email reading capability.

**Tasks:**
1. Create Communications Hub page route
2. Left panel: email list (Inbox, Sent, Drafts, Search)
3. Center panel upper: email preview (HTML rendering)
4. Center panel lower: AI agent placeholder (input area, modern design)
5. Gmail API integration: list messages, get message content, search
6. Email list row design: Sender | Subject | Preview | Time
7. Draggable panel splits (left-center, center upper-lower)
8. Right panel: placeholder for Chat (Phase 13D)

**Dependencies:** Phase 13A (OAuth + tokens)
**Risk:** Medium — Gmail API has rate limits, HTML email rendering can be tricky
**Testing:** Load real emails, display in list, click to preview, search works

---

### Phase 13C: Project Logging System (Session 61)
**Goal:** Build the logging system that ties communications to projects.

**Tasks:**
1. Create BigQuery `project_communication_log` table
2. "Log to Project" UI on email rows (dropdown with project search)
3. API endpoint: POST /api/ko/communications/log (creates association)
4. API endpoint: GET /api/ko/project/[projectId]/communications (get logged comms)
5. Thread-level logging: when an email is logged, all messages in the thread are associated
6. Reply inheritance: new messages in a logged thread auto-inherit the project
7. Visual indicator on email rows that are logged (project badge/tag)

**Dependencies:** Phase 13B (email list exists)
**Risk:** Medium — thread detection, reply inheritance logic
**Testing:** Log an email to a project, verify it appears in project's communication log, send a reply, verify reply auto-logs

---

### Phase 13D: Communications Hub — Email Composing + Chat (Session 62)
**Goal:** Add email sending and Google Chat to the Communications Hub.

**Tasks:**
1. Email compose form in center panel (To, CC, Subject, Body, Attachments)
2. Gmail API: send email, reply to email, forward
3. Right panel lower: Chat list (Google Chat API: list spaces/conversations)
4. Right panel upper: Chat window (message display, send messages)
5. Chat UI: mimic Google Chat aesthetic (colored message bubbles per user)
6. Chat message logging capability (same "Log to Project" as emails)
7. Draggable split on right panel (chat window / chat list)

**Dependencies:** Phase 13C (logging system)
**Risk:** Medium-High — Google Chat API has different auth requirements, may need Workspace admin approval
**Testing:** Send an email, receive it, reply. Open a chat, send a message. Log both to a project.

---

### Phase 13E: Project Detail Page Redesign (Sessions 63-64)
**Goal:** Redesign the Project Detail page (formerly Estimating Center) with communication log and multi-purpose working window.

**Session 63 Tasks — Left Panel + Center Panel:**
1. AUDIT: Full swarm of current Project Detail / Estimating Center page
2. Left panel redesign:
   - Remove: project card scroller, "All/Draft/Active/Sent" filters, "+" new project button, "Add Item to Library" button, Bluebeam Tool Manager button
   - Add: Search bar, "+Email" button, "+Chat" button, "+Meeting" button
   - Add: Communication log (scrollable list of logged comms for this project)
   - Type indicators: 📧 Email, 💬 Chat, 🎥 Meeting
3. Center panel redesign:
   - Status bar becomes static with separator line underneath
   - Status icon strokes: thicker, sharper, crisper
   - Multi-purpose working window:
     - Click communication → email/chat/meeting preview
     - Click "+" email → compose form
     - Click "+" chat → chat interface
     - Click status icon → color-coded folder contents (same as home page pattern, but project-scoped)
     - Click file/attachment → document viewer
   - Lower section: Folder Agent with modern input design
   - Draggable split between working window and agent
4. Auto-logging: communications initiated from "+Email"/"+Chat"/"+Meeting" buttons are automatically logged to the current project

**Session 64 Tasks — Right Panel + Intelligence:**
1. Right panel upper: Communication Intelligence
   - AI-generated summary of all project communications
   - Pulls from `communication_intelligence` BigQuery table
   - Auto-updates when new communications are logged
   - Refresh button
   - Markdown rendering
2. Right panel lower: Project Intelligence
   - Historical data for this project
   - GC (general contractor) intelligence
   - Similar projects comparison
   - Placeholder cards for now (data pipeline comes later)
3. Draggable split between upper and lower right panels
4. Relocate buttons:
   - "Add Item to Library" → Library page toolbar
   - "Bluebeam Tool Manager" → Setup page toolbar + Library page toolbar
   - Verify these buttons are removed from Project Detail

**Dependencies:** Phase 13C (logging system), Phase 13D (email/chat capabilities)
**Risk:** HIGH — this is the most complex redesign, touches the core workflow page
**Testing:** Full flow: open project → see communication log → click "+Email" → compose → send → email appears in log → click it → preview in working window → click status icon → folder contents shown → verify all old estimating center functionality still works

---

### Phase 13F: Google Meet + Calendar Integration (Session 65)
**Goal:** Add meeting scheduling, recording access, and calendar view.

**Tasks:**
1. Google Calendar API: list events, create events, modify events
2. Schedule Meeting from Project Detail page ("+Meeting" button)
3. Meeting recording access via Google Meet API
4. Meeting items in project communication log (🎥 icon)
5. Meetings page / calendar view (redesign existing if present, create if not)
6. Meeting logging: auto-log when scheduled from project, manual log otherwise
7. Meeting recordings linked to projects

**Dependencies:** Phase 13E (Project Detail redesign)
**Risk:** Medium — Meet API has limited recording access, may require Workspace admin settings
**Testing:** Schedule a meeting from project page, verify it appears in communication log, access recording

---

### Phase 13G: Intelligence Pipeline + Polish (Session 66)
**Goal:** Wire up the AI intelligence generation and polish everything.

**Tasks:**
1. Communication Intelligence generation pipeline:
   - When communications are logged, trigger AI summary generation
   - Use LLM to summarize email threads, chat conversations, meeting notes
   - Store in `communication_intelligence` table
   - Display in Project Detail right panel
2. Project Intelligence placeholder data:
   - GC profile cards
   - Similar project cards
   - Historical data summary
3. Polish: consistent styling, loading states, error handling, empty states
4. Performance: lazy loading, caching, pagination for large email lists
5. Full regression test: every feature from Phase 12 still works
6. Full E2E test: complete communication flow from Hub to Project to Intelligence

**Dependencies:** All previous phases
**Risk:** Low-Medium — mostly polish and AI pipeline work
**Testing:** Full platform walkthrough, every page, every feature

---

## PHASE 13 SESSION MAP

| Session | Phase | Focus | Risk |
|---------|-------|-------|------|
| 59 | 13A | OAuth fix + Google auth + token storage | Low |
| 60 | 13B | Communications Hub — email reading | Medium |
| 61 | 13C | Project logging system | Medium |
| 62 | 13D | Email composing + Google Chat | Medium-High |
| 63 | 13E.1 | Project Detail — left panel + center panel redesign | HIGH |
| 64 | 13E.2 | Project Detail — right panel + intelligence panels | Medium |
| 65 | 13F | Google Meet + Calendar | Medium |
| 66 | 13G | Intelligence pipeline + polish + full regression | Low-Medium |

**Total: 8 sessions (59-66)**

---

## MANDATORY SESSION PROTOCOLS

### Every session opener MUST include:

```markdown
## STEP 0: COMPREHENSIVE AUDIT (MANDATORY)
Swarm 10+ agents to read and report on:
1. Every file that will be touched in this session
2. All related API routes and their current behavior
3. All related components and their current state
4. BigQuery tables and their current schema
5. Google API configuration and current OAuth state
6. Any recent changes from the previous session

REPORT ALL FINDINGS before writing any code.
Do NOT proceed until the audit is complete and reviewed.
```

### Every session MUST follow this workflow:
```
1. Audit (swarm agents) → Report findings
2. Plan changes based on audit
3. Implement ONE change
4. Build
5. Start dev server
6. Test the change end-to-end (real or dummy data)
7. Verify no regressions on existing features
8. Commit (one feature per commit)
9. Repeat 3-8 for next change
10. Push to main ONLY after all changes tested
11. Update BigQuery tracker
12. Sync Google Sheet
13. Write HANDOFF
```

### Testing requirements:
- Every API endpoint: test with curl or fetch on dev server
- Every UI change: verify visually on dev server
- Every data flow: verify data appears in BigQuery
- Every Google API call: verify with real API responses
- Regression check: existing features still work after changes

---

## RISK MITIGATION

### Highest Risk: Project Detail Page Redesign (Session 63)
This touches the estimating center — the core workflow page. Mitigation:
- Full swarm audit of EVERY component and route before touching anything
- ADDITIVE: build new panels alongside old ones, verify, then swap
- Feature flag: if possible, keep old layout accessible during transition
- Commit frequently — every small change is a commit
- If anything breaks estimating center functionality, REVERT immediately

### Google API Rate Limits
Gmail API: 250 quota units per user per second. Mitigation:
- Implement request batching
- Cache email lists (refresh on demand)
- Background sync rather than real-time for large mailboxes

### OAuth Token Security
Tokens grant access to user email. Mitigation:
- Encrypt tokens at rest in BigQuery
- Use refresh tokens (short-lived access tokens)
- Implement token revocation on user logout/disconnect
- Never expose tokens to the frontend

### Chat API Workspace Requirements
Google Chat API may require Workspace admin approval for bot/app access. Mitigation:
- Isaac is admin — can approve
- Test with Isaac's account first
- Document any admin console changes needed

---

## WHAT THIS PLAN DOES NOT COVER (FUTURE)

- Multi-project communication logging (decided: not now)
- Shared Drive migration (decided: not now, service account works)
- WhatsApp integration (future)
- SMS integration (future)
- AI auto-logging (detecting which project an email belongs to without human input)
- Full Project Intelligence data pipeline (placeholder UI only)
- Meeting transcription AI
- Email template system for common project communications

---

## DELIVERABLES CHECKLIST

By the end of Phase 13 (Session 66), the platform will have:

- [ ] Working Google OAuth for all users
- [ ] Communications Hub page (Gmail + Chat, three-panel layout)
- [ ] Email: read, compose, send, reply, search, folder navigation
- [ ] Google Chat: read conversations, send messages
- [ ] "Log to Project" on any email or chat
- [ ] Thread-level logging with reply inheritance
- [ ] Redesigned Project Detail page:
  - [ ] Left panel: communication log with type indicators
  - [ ] Center: multi-purpose working window + status icon folder view
  - [ ] Right: Communication Intelligence + Project Intelligence
- [ ] Auto-logging from project page ("+Email", "+Chat", "+Meeting")
- [ ] Google Calendar integration (schedule, view, modify meetings)
- [ ] Google Meet recording access
- [ ] BigQuery tables: communication_log, communication_intelligence, user_google_tokens
- [ ] All buttons relocated per spec
- [ ] All panel splits draggable
- [ ] Full regression test: Phase 12 features intact

---

## NEXT STEP

Isaac reviews this plan. Once approved:
1. Write Session 59 opener (Phase 13A: OAuth fix)
2. Isaac provides Google Cloud Console access details (or performs manual config steps)
3. Begin implementation
