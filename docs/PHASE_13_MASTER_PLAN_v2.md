# PHASE 13 — RE-SCOPED MASTER PLAN (v2)
# Communications Integration + Project Detail Redesign
# Updated: 2026-02-20 after Session 59 audit revealed extensive existing code

---

## WHAT CHANGED FROM v1

Session 59 audit + Isaac's live testing revealed:
- **Gmail is WORKING** — emails load, preview renders, reply compose exists, project logging UI exists
- **Chat is PARTIALLY WORKING** — messages load but space names show as raw IDs, transcript not current
- **Calendar is WORKING** — real events show, Join Meeting button works
- **OAuth is WORKING** — all 11 scopes granted, tokens stored
- **Project logging exists** — "Log to PROJECT" dropdown already on emails

**This means:** We don't build from scratch. We FIX, REDESIGN, and ENHANCE.

**Session count: reduced from 8 to 5 sessions (59-63)**
Session 59 (OAuth) is done. Remaining: 60-63.

---

## EXISTING CODE INVENTORY (from Session 59 audit)

### Working Gmail Routes
- `/api/google/gmail` — fetch + send emails, threading
- Gmail screen component (`gmail-screen.jsx`) — 3-panel layout
- Email screen v2 (`email-screen-v2.jsx`) — draft workflow
- Reply compose area
- "Logged to [PROJECT]" badge on emails

### Working Chat Routes  
- `/api/google/chat` — spaces + messages
- Chat page with spaces list + message display
- Message input + send

### Working Calendar Routes
- `/api/google/calendar` — events + Meet links
- Calendar page with month view, upcoming meetings, recordings tab
- Join Meeting button

### Working Infrastructure
- `/api/ko/project-communications` — logging to BigQuery
- `/api/ko/contacts` — companies + people CRUD
- `/api/google/status` — connect/disconnect Google
- `lib/google-token.js` — token refresh with 401-retry
- Token storage in GCS + BigQuery (dual, from Session 59)

---

## KNOWN BUGS TO FIX

| Bug | Severity | Details |
|-----|----------|---------|
| Email attachments don't load | HIGH | Incoming emails with PDF/file attachments don't show them |
| Can't attach files to outgoing emails | HIGH | Compose has no attach button |
| Chat space names are raw IDs | HIGH | Shows "#AAAAuU4NxAQ" instead of space/contact names |
| Chat transcript not current | MEDIUM | Messages may be stale or incomplete |
| Email timestamps relative | LOW | Shows "6h ago" — should show "4:01 PM" |
| Calendar too basic | LOW | No day/week view, no time slots, no click-to-create |
| Meeting "Booked by" raw HTML | LOW | `<b>` tags rendering as text |
| Email folders missing | MEDIUM | Only inbox — no Sent, Drafts, Spam navigation |
| Project log destination unknown | MEDIUM | "Logged to SESSION 50" but where does data go? Audit needed |

---

## RE-SCOPED PHASE 13 SESSIONS

### Session 60: Gmail Fixes + Attachments + Folders
### Session 61: Chat Fix + Communications Hub Layout  
### Session 62: Project Detail Page Redesign (Left + Center)
### Session 63: Project Detail Right Panel + Calendar Enhancement + Polish

---

## SESSION 60 — GMAIL FIXES + ATTACHMENTS + FOLDERS

**Goal:** Fix all Gmail bugs, add attachments (in + out), add folder navigation, fix timestamps.

### Task 1: Audit existing Gmail code
Swarm agents to read EVERY file:
- `gmail-screen.jsx` — full component
- `email-screen-v2.jsx` — draft workflow
- `/api/google/gmail/route.js` — all handlers
- `/api/ko/project-communications/route.js` — logging handler
- Any attachment-related code
- Report: what works, what's broken, what's missing

### Task 2: Fix incoming email attachments
- Gmail API returns attachment IDs in message parts
- Need to call `gmail.users.messages.attachments.get()` to fetch attachment data
- Display attachments below email body: filename, size, type icon
- Click attachment → preview in viewer (PDF, images) or download (other types)
- Attachments are base64-encoded — decode for display/download

### Task 3: Add file attachment to compose
- Add attach button (paperclip icon) to compose form
- File picker → select file → attach to outgoing email
- Gmail API: send email with multipart MIME (text + attachments)
- Show attached files as removable chips in compose area

### Task 4: Add "Log to Project" on compose
- Add dropdown in compose top bar: "Log to Project"
- Search/select a project from the dropdown
- When email is sent with a project selected → auto-log the thread
- Thread inheritance: all future replies in this thread stay logged to the project

### Task 5: Email folder navigation
- Add folder list to left panel: Inbox, Sent, Drafts, Spam, Trash
- Gmail API: use `labelIds` parameter to filter by folder
- Each folder shows unread count
- Clicking a folder loads that folder's emails in the list

### Task 6: Fix email timestamps
- Replace relative time ("6h ago") with actual time
- Today's emails: show time only ("4:01 PM")
- This week: show day + time ("Mon 4:01 PM")
- Older: show date ("Feb 15, 2026")

### Task 7: Audit project logging
- Swarm: where does "Logged to SESSION 50" actually store data?
- Is it BigQuery? Which table? What fields?
- Does it use the `project_communication_log` table from the master plan, or something else?
- Report findings — we may need to migrate or rewire

### Testing:
- [ ] Open email with PDF attachment → attachment shows, clickable, preview works
- [ ] Compose email → attach a file → send → recipient receives attachment
- [ ] Compose email → log to project → send → thread logged
- [ ] Click Sent folder → sent emails load
- [ ] Click Spam → spam loads
- [ ] Timestamps show actual time, not relative
- [ ] Existing email reading still works

### Commit strategy: one fix per commit, test each on dev server

---

## SESSION 61 — CHAT FIX + COMMUNICATIONS HUB LAYOUT

**Goal:** Fix Google Chat, then build the unified Communications Hub page per Isaac's spec.

### Task 1: Audit existing Chat code
Swarm agents to read:
- Chat page component
- `/api/google/chat/route.js` — all handlers
- Report: why space names show as raw IDs, why transcript is stale

### Task 2: Fix Chat space names
- Google Chat API: `spaces.get()` or `spaces.list()` returns `displayName`
- Replace raw space IDs with actual names
- If it's a DM, show the other person's name
- If it's a group space, show the space name

### Task 3: Fix Chat transcript currency
- Ensure messages are fetched in correct order (newest last)
- Add pagination/loading for older messages
- Real-time or near-real-time: poll for new messages or use push notifications

### Task 4: Build Communications Hub page
**This is the main new page — per Isaac's spec:**

```
┌─────────────────┬──────────────────────┬─────────────────┐
│   LEFT PANEL     │   CENTER PANEL       │  RIGHT PANEL    │
│   (Email List)   │   (Upper: Preview)   │  (Upper: Chat   │
│                  │   ─ ─ draggable ─ ─  │   Window)       │
│   - Search bar   │   (Lower: AI Agent)  │  ─ draggable ─  │
│   - Compose btn  │                      │  (Lower: Chat   │
│   - Folder nav   │                      │   List)         │
│   - Email rows   │                      │                 │
└─────────────────┴──────────────────────┴─────────────────┘
```

**Left Panel — Email (from existing gmail-screen, enhanced):**
- Search bar
- Compose button
- Folder navigation (Inbox, Sent, Drafts, Spam, Trash)
- Email list with: Sender | Subject | Preview | Time (actual, not relative)
- Each row: "Log to Project" option
- Clicking email → opens in center panel upper

**Center Panel — Split: Preview + AI Agent:**
- Upper: email preview (HTML rendered, attachments shown)
- Lower: AI agent with modern input design (+ button, clean style like home page)
- Draggable split between upper and lower

**Right Panel — Chat:**
- Upper: chat conversation window (selected chat)
- Lower: chat list (spaces/contacts with proper names)
- Draggable split
- Mimic Google Chat aesthetic: colored bubbles per user

**All panel dividers are draggable.**

### Task 5: Wire existing components into new layout
- DON'T rebuild from scratch — take existing gmail-screen and chat components
- Restructure into the three-panel layout
- Add the draggable splits (use a library like `react-resizable-panels` or custom)
- Ensure email and chat data flows work in new layout

### Task 6: Navigation
- Add Communications Hub to the left nav sidebar
- Use the envelope icon (already exists in nav)
- This replaces separate email and chat pages (or keeps them as redirects)

### Testing:
- [ ] Communications Hub loads with three panels
- [ ] Left panel: emails with folders, search, compose
- [ ] Center: email preview when clicked, AI agent below
- [ ] Right: chat spaces with proper names, messages display
- [ ] All panel dividers draggable
- [ ] Chat messages current and in correct order
- [ ] Can send a chat message
- [ ] Existing email functionality preserved

---

## SESSION 62 — PROJECT DETAIL PAGE REDESIGN (LEFT + CENTER)

**Goal:** Redesign the Project Detail page per Isaac's spec. This is HIGH RISK — touches the core workflow page.

### CRITICAL: FULL AUDIT FIRST
Swarm 15+ agents:
- Read EVERY component in the estimating center / project detail page
- Map every button, every handler, every API call
- Understand the full data flow
- List everything that exists and what it does
- DO NOT TOUCH CODE until audit is complete

### Task 1: Left Panel Redesign

**REMOVE:**
- Project card scroller (projects are selected elsewhere now)
- "All / Draft / Active / Sent" filters
- "+" button for creating new projects
- "Add Item to Library" button (moves to Library page)
- Bluebeam Tool Manager button (moves to Setup + Library pages)

**ADD:**
- Search bar (keep existing)
- `+ Email` button — compose email, auto-logged to current project
- `+ Chat` button — start chat, auto-logged to current project  
- `+ Meeting` button — schedule meeting, auto-logged to current project
- Communication log (scrollable list):
  - All communications logged to this project
  - Type indicators: 📧 Email, 💬 Chat, 🎥 Meeting
  - Chronological order
  - Click any item → opens in center working window

**Auto-logging:**
- "+Email" → opens compose in center panel, pre-tagged with current project
- "+Chat" → opens chat in center panel, pre-tagged
- "+Meeting" → opens scheduling in center panel, pre-tagged
- No manual "log to project" step needed from here

### Task 2: Center Panel Redesign

**Status Bar (top, static):**
- Keep status icons (Drawings, Bluebeam, Takeoff, Markups, Proposals, etc.)
- Make icon strokes THICKER and SHARPER — increase stroke width, crisper lines
- Add visual separator line underneath the status bar
- **REMOVE:** "Next Steps" bar, GC Contact bar

**Status Icon Click Behavior:**
- Click a status icon → working window shows that category's files for THIS project
- Color-coded border matching the icon category (same pattern as home page)
- Header row: ← back arrow + category icon + "RECENT PROPOSALS" label
- Below header: scrollable file list (filename, date)
- Only border and header get category color — file list area stays white/neutral
- Same behavior as home page but scoped to current project only

**Working Window (multi-purpose, dynamic):**
- Click communication item from left panel → email/chat/meeting preview
- Click "+ Email" → email compose form
- Click "+ Chat" → chat interface  
- Click "+ Meeting" → meeting scheduler
- Click status icon → color-coded folder contents
- Click file/attachment → document viewer
- Agent pushes content here too

**Folder Agent (below working window):**
- AI/LLM agent area
- Modern clean input design (like home page — + button, clean area)
- Draggable split between working window and agent
- Can push content to the working window above

### Task 3: Relocate buttons
- Verify "Add Item to Library" is on Library page toolbar
- Verify "Bluebeam Tool Manager" is on Setup page toolbar AND Library page toolbar
- If not there, add them
- Remove from Project Detail page

### Task 4: Verify estimating center core functionality
After all changes:
- Takeoff sheet still loads and works
- BTX tools still generate
- Proposal generation still works
- All existing workflows intact

### Testing:
- [ ] Project Detail opens with communication log in left panel
- [ ] "+ Email" opens compose, auto-logged to project
- [ ] "+ Chat" opens chat interface
- [ ] "+ Meeting" opens scheduler
- [ ] Communication log shows logged items with type icons
- [ ] Click logged email → preview in working window
- [ ] Status bar icons clickable → folder contents shown with colored border
- [ ] Folder Agent input works with modern design
- [ ] All panel splits draggable
- [ ] Takeoff, BTX, proposals still work
- [ ] No buttons that should be removed are present

---

## SESSION 63 — RIGHT PANEL + CALENDAR + POLISH

**Goal:** Build intelligence panels, enhance calendar, full regression test.

### Task 1: Project Detail — Right Panel

**Upper: Communication Intelligence**
- AI-generated summary of ALL communications logged to this project
- Pulls from `communication_intelligence` BigQuery table
- If no intelligence generated yet: placeholder "No communication intelligence yet — log emails and chats to this project to generate insights"
- Refresh button to regenerate
- Auto-updates when new communications are logged
- Markdown rendering for rich content
- Use "Intelligence" branding, not "Summary"

**Lower: Project Intelligence**
- Historical data for this project
- GC (general contractor) profile/intelligence
- Similar projects comparison
- Similar conditions analysis
- **Placeholder cards for now** — data pipeline comes later
- Each card: title + "Coming soon" or sample data
- This is a STUB — don't over-build

**Draggable split between upper and lower.**

### Task 2: Calendar Enhancement
- If a good calendar component exists (FullCalendar, react-big-calendar, etc.):
  - Plug it in, replace the basic month grid
  - Day view with time slots
  - Week view
  - Click a day → see that day's events with times
  - Click to create new event
  - Brand with MR colors
- If no good component: leave as-is, note for future
- Fix "Booked by" HTML rendering bug (`<b>` tags showing as text)
- Recordings tab: audit what's there, fix or mark as placeholder

### Task 3: Intelligence Generation Pipeline (basic)
- When a communication is logged to a project, trigger a simple summary
- Use the platform's existing AI/LLM capability
- Generate a 2-3 sentence summary of the communication
- Store in `communication_intelligence` table
- Display in the right panel
- This is a V1 — basic summarization, not sophisticated analysis

### Task 4: Full Regression Test
Run through EVERY feature:
- [ ] Home page: greeting, 5 icons, dual-mode screen
- [ ] Project folders: cards, mini screens, activity feed streaming
- [ ] Inside folder: accordion, gray/colored icons, upload, delete, viewer
- [ ] Estimating center / Project Detail: takeoff, BTX, proposals
- [ ] Communications Hub: email read/compose/attach/send, chat, folders
- [ ] Project logging: log email, log from compose, thread inheritance
- [ ] Calendar: month/week/day view, upcoming meetings, join button
- [ ] All panel splits draggable
- [ ] No X buttons — all back arrows
- [ ] No console errors
- [ ] Build clean

### Task 5: Update all docs
- Update Architecture Bible (Section 20: Phase 13)
- Update Architect Refresh Brief with Phase 13 completion status
- Update BigQuery tracker
- Sync Google Sheet
- Final handoff

---

## UPDATED SESSION MAP

| Session | Focus | Status |
|---------|-------|--------|
| 59 | OAuth fix + token storage | ✅ DONE |
| 60 | Gmail fixes (attachments, folders, timestamps, logging audit) | NEXT |
| 61 | Chat fix + Communications Hub three-panel layout | |
| 62 | Project Detail page redesign (left + center panels) | HIGH RISK |
| 63 | Right panel intelligence + calendar enhancement + polish | |

**Total remaining: 4 sessions (60-63)**

---

## MANDATORY SESSION PROTOCOLS (unchanged from v1)

### Every session:
1. Swarm 10+ agents to audit ALL files being touched — REPORT before coding
2. One feature per commit
3. Test on dev server (real API calls, not just build)
4. No regressions on existing features
5. Update BigQuery tracker + Google Sheet
6. Write HANDOFF
7. Update Architect Refresh Brief if major decisions made

### Isaac's preferences (NEVER VIOLATE):
- No X buttons — back arrows only
- Actual timestamps (4:01 PM) not relative (6h ago)
- "Intelligence" not "Summary"
- Modern clean input design (+ button style)
- All panel splits draggable
- Folder contents: only border + header colored, file list area white/neutral
- Status icon strokes: thick, sharp, crisp

---

## KEY ARCHITECTURAL DECISIONS (carried from v1)

- BigQuery for all logging (canonical project IDs)
- Thread-level logging (one email logged = whole thread)
- No multi-project logging (one comm → one project)
- Service account stays for Drive — OAuth for user-facing APIs
- GCS token storage kept, BigQuery added as secondary
- All OAuth scopes requested upfront

---

## NEXT STEP

Isaac approves this re-scoped plan → Write Session 60 opener (Gmail fixes)
