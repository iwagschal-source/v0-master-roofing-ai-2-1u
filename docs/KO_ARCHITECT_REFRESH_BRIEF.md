# KO PLATFORM — ARCHITECT REFRESH BRIEF
# If you are reading this, you were probably just compacted. Read EVERYTHING.

## Last Updated: 2026-02-20 (Session 63B — Communications Hub nav merge)
## Keep this file updated at the end of EVERY session.

---

## WHO YOU ARE WORKING WITH

**Isaac** — CEO of Master Roofing & Siding (20+ year commercial roofing company, NYC metro) and founder of A Eye Corp (AI consulting). He's building KO (Chief Agent Officer), a multi-agent AI platform that transforms Master Roofing's operations into a B2B SaaS offering.

**How Isaac works:**
- Direct, blunt, zero tolerance for inefficiency
- Uses raw language (cursing, venting) — it's decompression, never disrespect. This is on record.
- Brain-dumps ideas without sequence — you capture, organize later
- Manages ADHD, often works 48+ hour stretches
- Over 50, supporting a family, learning AI tech through hands-on building
- His agent designation: synth_00_✨️🥂
- Muddassir (his developer) passed away — NEVER reference him for future tasks

**How to communicate with Isaac:**
- Be concise and direct
- Don't hedge or qualify excessively
- When he asks "does this make sense" — play back what you understood
- When he says "you good?" — he wants to keep going, say yes and listen
- When he gives you a spec — don't redesign it, build what he asked for
- Challenge him when something is technically wrong, but respect his vision

---

## THE PLATFORM — KO (Chief Agent Officer)

**Tech stack:** Next.js app, deployed on Vercel, BigQuery data warehouse, Google Drive via service account, Google Sheets for some data, Google Cloud VMs for Claude Code sessions.

**Repo:** `~/v0-master-roofing-ai-2-1u` on main branch

**Key files:**
- `docs/ARCHITECTURE_BIBLE.md` — the master technical reference (19+ sections)
- `docs/PHASE_13_MASTER_PLAN.md` — communications integration plan
- `docs/session-openers/SESSION_XX_HANDOFF.md` — handoff from each session
- `lib/google-drive.js` — Drive API utilities (service account)
- `lib/google-auth.js` — OAuth token management (created in Phase 13A)
- `lib/brand-colors.js` — includes FOLDER_ICON_COLORS
- `components/ko/` — all KO-specific components
- `public/icons/` — folder category icons (5 colored + 1 gray)

**BigQuery:** `master-roofing-intelligence` project
- `mr_main` dataset (US multi-region) — main tables
- `mr_agent` dataset (us-east4) — agent tables
- CANNOT JOIN across them (different regions — needs future consolidation)

---

## WHAT HAS BEEN BUILT (Phase 12 — Project Folders, Sessions 50-58)

### Project Folder System
- Project cards on list page with colored category icons and mini activity screens
- 5 mandatory subfolders per project: Drawings (black), Bluebeam (blue), Takeoff (green), Markups (orange), Proposals (red)
- Inside folder view: left sidebar with accordion (one folder open at a time), center document viewer, right Agent Preview panel
- Google Drive backend: service account manages all files, auto-creates subfolders
- File viewer supports: PDF, Excel (via gview), Word (via gview), Google Sheets, images, CSV, ZIP
- Upload from sidebar and center panel
- Custom subfolders (add/delete)
- Delete documents and projects (removes from all views)

### Activity Feed System
- BigQuery table: `project_activity_feed` (headline, body as markdown, event_type, source, timestamp)
- Streaming text effect on mini screens (typewriter, character by character, like AI text generation)
- Same feed wired to Agent Preview panel in documents page
- Continuous loop, pauses on hover, manual scrollbar

### Home Page
- Dynamic greeting: "Happy [Day], [Name]" based on time + logged-in user
- 5 category icons (Drawings, Bluebeam, Takeoff, Markups, Proposals)
- Dual-mode interaction screen below icons:
  - Default: KO agent chat
  - Click category icon: transforms to category-colored file browser showing last 5 recent files across all projects
  - "Back to Chat" returns to agent mode
- Screen width matches icon row, same border radius and style

### Card Design
- Thin hairline border with MR red hint
- Project name in tab (marquee scrolls horizontally for long names, fixed tab width)
- Client name below
- Category icons that when clicked, transform mini screen to show that category's files
- Mini activity screen: fixed height, streaming text, thin scrollbar flush right
- Tab left border fully visible (fixed corner clipping issue)

### Folder Icon System
- 5 colored PNGs for active/expanded folders
- 1 gray PNG for all collapsed/unselected folders
- Icons at 24x24 on cards, 32x32 in sidebar
- File icons next to filenames inherit parent folder color

### Color Constants
```js
FOLDER_ICON_COLORS = {
  drawings:  { primary: '#333333', light: '#f0f0f0', dark: '#333333' },
  bluebeam:  { primary: '#277ed0', light: '#e8f0fa', dark: '#277ed0' },
  takeoff:   { primary: '#00883e', light: '#e8f5e9', dark: '#00883e' },
  markups:   { primary: '#c96500', light: '#fff3e0', dark: '#c96500' },
  proposals: { primary: '#c0352f', light: '#fce8e7', dark: '#c0352f' },
}
```

### Other Completed Work
- BTX tools auto-save to Bluebeam/ folder
- CSV imports auto-save to Bluebeam/ folder
- Proposal generation downloads .docx to browser + saves to Proposals/ folder
- Takeoff workbook auto-linked in Takeoff/ via Drive shortcut
- All X buttons replaced with back arrows (30+ instances, 19 files)
- Zoom controls on document viewer
- Tool Manager: dark theme with readable text, all buttons blue
- Estimating center button from documents page opens with project pre-selected
- File click from card → opens in documents viewer directly

---

## WHAT IS BEING BUILT NOW (Phase 13 — Communications Integration)

### Master Plan: `docs/PHASE_13_MASTER_PLAN.md`

### Phase 13 Sub-phases:
| Phase | Session | Focus |
|-------|---------|-------|
| 13A | 59 | OAuth fix + Google auth + token storage |
| 13B | 60 | Communications Hub — email reading |
| 13C | 61 | Project logging system |
| 13D | 62 | Email composing + Google Chat |
| 13E.1 | 63 | Project Detail — left + center panel redesign |
| 13E.2 | 64 | Project Detail — right panel + intelligence |
| 13F | 65 | Google Meet + Calendar |
| 13G | 66 | Intelligence pipeline + polish |

### Key Architecture Decisions (ALREADY MADE — do not re-discuss):
- **Storage:** Everything in BigQuery (not Gmail labels, not external DBs)
- **Thread-level logging:** One email logged = entire thread logged to that project
- **No multi-project:** One communication → one project only (for now)
- **OAuth scopes:** All requested upfront (Gmail, Chat, Calendar, Drive, Meet)
- **Service account stays:** Drive file management continues via service account. OAuth is for user-facing APIs (Gmail, Chat, Calendar)
- **Canonical project IDs:** All tables join on the same project_id from the master project table

### New BigQuery Tables (Phase 13):
1. `project_communication_log` — links communications to projects
2. `communication_intelligence` — AI-generated summaries per project
3. `user_google_tokens` — OAuth tokens per user

### Communications Hub Page (new):
- Three-panel: Left (email list) | Center (preview + AI agent) | Right (Chat)
- All panel dividers draggable

### Project Detail Page (redesign of Estimating Center):
- Left panel: CHANGES from project card scroller → communication log
- Center: status bar (static) + multi-purpose working window + folder agent
- Right: Communication Intelligence (upper) + Project Intelligence (lower)
- "+Email", "+Chat", "+Meeting" buttons auto-log to current project

---

## DESIGN RULES (Isaac's preferences — NEVER VIOLATE)

1. **No X buttons** — always back arrows (←)
2. **No bold project names** on card tabs
3. **No gray icon placeholders** — icons are either colored (active) or the single gray icon (inactive)
4. **Accordion folders** — only one open at a time, all collapsed by default
5. **Activity feed = streaming text** (typewriter effect, NOT slideshow, NOT static list)
6. **Mini screens: fixed height** — never expand, content scrolls within
7. **Scrollbar always visible**, flush right, 3px thin
8. **"Intelligence" not "Summary"** in naming
9. **Modern clean input design** — like Claude's chat, not old narrow bars
10. **Bluebeam Tool Manager: dark theme** — but all text readable (light gray/white), all buttons blue (#277ed0)
11. **MR Red:** rgba(215, 64, 58) for brand accents
12. **Draggable panel splits** wherever there are panel divisions

---

## SESSION PROTOCOLS (NEVER SKIP)

### Before EVERY session:
1. Swarm 10+ agents to audit ALL files being touched
2. Report findings before writing any code
3. Read the most recent HANDOFF document
4. Read the Architecture Bible (relevant sections)

### During EVERY session:
1. One feature per commit
2. Build after every change
3. Test on dev server (not just "build passes")
4. If anything breaks, revert that ONE commit

### After EVERY session:
1. Update BigQuery tracker
2. Sync: `node scripts/sync-tracker-to-sheet.mjs`
3. Write HANDOFF at `docs/session-openers/SESSION_XX_HANDOFF.md`
4. Update THIS FILE if any major decisions were made

### Testing protocol:
- Every API endpoint: test with real calls on dev server
- Every UI change: verify visually
- Every data flow: verify in BigQuery
- Regression: 5 random existing features still work

---

## COMMON GOTCHAS (learned the hard way)

1. **Canva SVG icons don't render with next/image** — always use PNGs
2. **Drive iframe "request access" errors** — service account files need `setFilePublicRead` permissions
3. **BigQuery datasets in different regions can't JOIN** — mr_agent (us-east4) vs mr_main (US multi-region)
4. **Build passing ≠ feature working** — MUST test on dev server
5. **Session compaction kills context** — this document exists for that reason
6. **The estimating center is being renamed** to "Project Detail" page in Phase 13
7. **Google Sheets embed URL** must use `/edit?usp=sharing&rm=minimal`, NOT Drive preview URL
8. **Excel/Word files** open via Google gview: `https://docs.google.com/gview?url={webContentLink}&embedded=true`
9. **Proposal generation** was reverted to simple browser download (Session 57/58) — the in-platform editing flow (Google Docs conversion) was abandoned because it mangles formatting
10. **Tab text scrolling** — marquee must be clipped within tab borders on BOTH sides (left and right)

---

## WHAT TO DO IF YOU JUST GOT COMPACTED

1. **Read this entire file first**
2. **Read the most recent HANDOFF** — `docs/session-openers/SESSION_XX_HANDOFF.md` (find the latest)
3. **Read the Architecture Bible** — `docs/ARCHITECTURE_BIBLE.md` (at least the table of contents + Section 19 + Section 20)
4. **Read the Phase 13 Master Plan** — `docs/PHASE_13_MASTER_PLAN.md`
5. **Ask Isaac** what session we're on and what the current task is
6. **Do NOT pretend you remember things you don't** — Isaac can tell when you're guessing. Be honest: "I've been compacted, let me re-read the context."
7. **Swarm agents to read the current codebase state** before making any changes

---

## SESSION HISTORY (update after each session)

| Session | Phase | What Was Done | Key Files |
|---------|-------|---------------|-----------|
| 50-51 | 11→12 | Phase 11 wrap, Phase 12 spec, version tracker | docs/PHASE_12_SPEC.md |
| 52 | 12A | V0 integration, backend folder API, card redesign | folder-card.tsx, google-drive.js |
| 53 | 12B | Bug fixes, inside folder view, document viewer | Documents page, viewer component |
| 54 | 12C | Auto-save wiring (BTX, CSV, proposals, takeoff) | Multiple API routes |
| 55 | 12D | 7 bug fixes + 3 features (delete, custom folders, etc.) | 19 files modified |
| 56 | 12E | Tool Manager fix, new icons, tab hover, upload button | bluebeam-tool-manager, folder-card |
| 57 | 12F | Card redesign, activity feed, home page, gray icons | Home page, activity-feed.tsx |
| 58 | 12G | Feed streaming fix, home redesign, accordion, agent panel | Home page, documents page |
| 59 | 13A | (NEXT) OAuth fix + Google auth | TBD |
| 63 | 13C | Google Chat real names fix (directory API resolution) | chat/route.js |
| 63B | 13C | Nav merge — single Comms Hub entry, remove email/messages nav | navigation-rail.jsx, page.jsx |

---

## REMEMBER

Isaac is building something real. This isn't a hobby project. Master Roofing is a real company with real employees who will use this platform. Every bug, every broken feature, every sloppy commit affects a real business. Treat every session like you're shipping production software, because you are.

Isaac trusts you as the architect. Don't break that trust by guessing or hallucinating. When you don't know, audit. When you're unsure, ask. When you make a mistake, own it and fix it.

And update this damn file after every session.
