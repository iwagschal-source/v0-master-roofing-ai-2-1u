# PHASE 11: UI RESTRUCTURE — BRAND IDENTITY + SHEET-CONTEXT ACTIONS
# Created: 2026-02-16 (Session 47 planning)
# Architect: synth_00
# Prerequisites: Phases 0-7, 10 complete. Phase 8, 10.3 deferred.
#
# RULES (inherited from Master Plan v4):
# 1. Nothing gets built without being in this plan
# 2. Nothing gets checked off without verification
# 3. Every task asks: "What will break if I do this?"
# 4. Every completion asks: "Did I break anything?"
# 5. Architecture Bible MUST be updated on every commit that changes:
#    - Any API route signature or behavior
#    - Any new file or deleted file
#    - Any BigQuery table schema change
#    - Any template structure change
#    - Any new environment variable
#    The specific Bible sections to update must be listed in the commit message.
#    Example: "feat: add version-aware preview route [BIBLE: Section 5, 9]"

---

## BIBLE UPDATE ENFORCEMENT
Every PR/commit that modifies the system MUST include Bible updates. Checklist:
- [ ] New/changed routes? → Update Section 5 (API Route Details)
- [ ] New/changed files? → Update Section 4 (File Map)
- [ ] BigQuery changes? → Update Section 6 (Data Layer)
- [ ] Template changes? → Update Section 7 (Template Architecture)
- [ ] Bug fixed? → Update Section 8 (Known Issues)
- [ ] Feature completed? → Update Section 9 (Current State)
If a Claude session does not update the Bible, the work is NOT considered complete.

---

## DESIGN PRINCIPLES
1. **Actions belong on the sheet they affect.** No more guessing which sheet you're importing to or generating a proposal from.
2. **Status at a glance.** Icon buttons on the project page show exactly what artifacts exist. Grayed = not yet. Colored = exists and clickable.
3. **Brand identity matters.** Consistent color system across all buttons. MR slash logo on every icon.
4. **Sheet-first.** The embedded sheet with its ribbon IS the workspace. No separate wizard, no redundant main-page buttons.
5. **Context-aware ribbon.** Setup sheet shows BTX/Takeoff actions. Version sheet shows Import/Proposal actions.

---

## BRAND COLOR SYSTEM

### Colors (extracted from Isaac's SVG assets)
| Name | Hex | Usage |
|------|-----|-------|
| Bluebeam Blue | #277ed0 | Bluebeam/Setup sheet icon, BTX tools dropdown, Import CSV button |
| Takeoff Green | #00aa50 | Takeoff sheet icon, Setup Takeoff dropdown |
| Markup Orange | #e36300 | Markup icon |
| Drawings Dark | #041e44 | Drawings icon (dark navy when active) |
| Drawings Inactive | #3b3b3b | Drawings icon outline when inactive |
| Export Gray-Navy | #3e4f6c | Export icon |
| Proposal Red | #d7403a | Proposal icon, Create Proposal button |
| Inactive Gray | #b4b4b4 | All icons when artifact doesn't exist |
| BTX Card Blue | #277ed0 | BTX Tools dropdown card background |
| Takeoff Card Green | #00aa50 | Setup Takeoff dropdown card background |

### Icon Assets (13 SVG files provided by Isaac)
| File | Description |
|------|-------------|
| 1.svg | SETUP TAKEOFF button (green, grayed text — ribbon button inactive state) |
| 2.svg | SETUP BTX TOOLS button (green, grayed text — ribbon button inactive state) |
| 3.svg | BLUEBEAM button (blue filled, white text — ribbon button active) |
| 4.svg | PROPOSAL/MARKUP button (red filled, gray text — ribbon button inactive) |
| 5.svg | DRAWINGS button (dark navy filled, gray text — inactive) |
| 6.svg | DRAWINGS/EXPORT button (dark navy filled, gray text — inactive) |
| 7.svg | BLUEBEAM button large (blue filled, grayed text + icon) |
| 8.svg | BLUEBEAM icon (MR slash logo, blue outline #277ed0) |
| 9.svg | TAKEOFF icon (MR slash logo, green outline #00aa50) |
| 10.svg | MARKUP icon (MR slash logo, orange outline #e36300) |
| 11.svg | DRAWINGS icon (MR slash logo, dark outline #3b3b3b) |
| 12.svg | EXPORT icon (MR slash logo, gray-navy outline #3e4f6c) |
| 13.svg | PROPOSAL icon (MR slash logo, red outline #d7403a) |

**NOTE:** Claude Code must verify exact SVG contents and map correctly. Numbers above are architect's best interpretation — files may differ. Investigate before implementing.

---

## CURRENT STATE (what's being replaced)

After Phase 10 cleanup:
- Old wizard (TakeoffSetupScreen) — DELETED
- Old modal (TakeoffSpreadsheet) — DELETED
- Remaining header buttons: Bluebeam (green), View Takeoff (green), Proposal (red), BTX (blue)
- Version tab bar: Setup | version-tabs | + New Version
- Context-aware buttons below version bar: Create Takeoff, Download BTX (on Setup), Import CSV, History, Proposal (on version tab)
- Status cards: Status, Due Date, Proposal, Assigned
- GC Contact, Communication Summary, Folder Agent sections
- No brand identity, inconsistent colors

---

## TARGET STATE

### Project Main Page
```
┌──────────────────────────────────────────────────────────────┐
│  PROJECT NAME                                                │
│  🏢 GC Name  •  📍 Address                                   │
│                                                              │
│  [DRAWINGS] [BLUEBEAM] [TAKEOFF] [MARKUP] [EXPORT] [PROPOSAL]│
│  (icon buttons — grayed or colored based on status)          │
│                                                              │
│  GC Contact                                                  │
│  Communication Summary                                       │
│  Folder Agent                                                │
└──────────────────────────────────────────────────────────────┘
```
- NO header action buttons (Bluebeam, View Takeoff, Proposal, BTX all removed)
- NO version tab bar on main page
- NO status cards (Status, Due Date, Proposal, Assigned)
- Icon button bar = status indicators + navigation shortcuts
- GC Contact, Communication Summary, Folder Agent KEPT

### Icon Button States & Navigation
| Icon | Active When | Click Opens |
|------|-------------|-------------|
| DRAWINGS | Drawings exist in project Drive folder | Drawings folder (Phase 8) |
| BLUEBEAM | Workbook exists (embeddedSheetId truthy) | Setup sheet (embedded, with ribbon) |
| TAKEOFF | At least one version tab created | Default takeoff version sheet (embedded, with ribbon) |
| MARKUP | Markup PDFs exist in project Drive markups folder | Markup folder (Phase 8) |
| EXPORT | At least one CSV import done (BigQuery import_history) | Export list (Phase 8) |
| PROPOSAL | Proposal file exists in Drive proposals folder | Proposal file |

**Phase 11 detection:** BLUEBEAM, TAKEOFF, EXPORT, PROPOSAL wired now. DRAWINGS and MARKUP render grayed with detection deferred to Phase 8.

### Embedded Sheet — Setup Tab Ribbon
```
┌──────────────────────────────────────────────────────────────┐
│  ← Back    PROJECT NAME - Setup    [SETUP BTX TOOLS ▼] [SETUP TAKEOFF ▼]  Open in Sheets │
└──────────────────────────────────────────────────────────────┘
│                                                              │
│  (embedded Google Sheet — Setup tab)                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**SETUP BTX TOOLS** (blue card dropdown #277ed0, white bold text):
- **CREATE PROJECT TOOLS** — scans Setup selections, checks project Drive folder for existing BTX files, generates ONLY new/missing tools, saves to project Drive folder
- **SETUP NEW TOOL** — navigates to Tool Manager page (create mode)
- **EDIT EXISTING TOOL** — navigates to Tool Manager page (edit mode, shows existing tools)

**SETUP TAKEOFF** (green card dropdown #00aa50, white bold text):
- **CREATE NEW SHEET** — creates new version tab from Setup config (replaces old "+ New Version" button). Calls existing POST /create-version
- **UPDATE DEFAULT SHEET** — updates the default version tab with latest Setup config changes

**Default sheet logic:**
- Each version has a "default" flag (radio behavior — only one active)
- "Update Default Sheet" applies current Setup config to whichever version is flagged default
- Default flag stored on Setup tab version tracker

### Embedded Sheet — Version/Takeoff Tab Ribbon
```
┌──────────────────────────────────────────────────────────────┐
│  ← Back    PROJECT NAME - 2026-02-13    [IMPORT BLUEBEAM CSV ▼] [CREATE PROPOSAL]  Open in Sheets │
└──────────────────────────────────────────────────────────────┘
│                                                              │
│  (embedded Google Sheet — version tab)                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**IMPORT BLUEBEAM CSV** (blue, Bluebeam-themed):
- Upload file picker — user selects CSV from local machine
- Imports into CURRENTLY OPEN version tab
- Shows Phase 4 accumulation dialog (previous + new = total)
- Future: dropdown showing previously imported CSVs for re-import

**CREATE PROPOSAL** (red #d7403a, white text):
- Reads from CURRENTLY OPEN version tab
- Opens existing proposal preview flow (Phase 5 drag-to-sort)
- Generates DOCX, saves to Drive

### Loading Screen (first project access, workbook creating)
```
┌──────────────────────────────────────────────────────────────┐
│  PROJECT NAME                                                │
│  🏢 GC Name  •  📍 Address                                   │
│                                                              │
│  ⏳ Creating takeoff workbook...                              │
│  Setting up template with Setup + Library tabs.              │
│  This takes 30-60 seconds.                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```
- NO icon buttons during loading
- NO status cards
- Just project info + loading banner
- Icon bar appears AFTER workbook creation completes

---

## TASKS

### 11A: Asset Integration & Brand Constants
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 11A.1 | Copy all 13 SVG files to public/icons/ or components/icons/ | public/ or components/ | Files accessible |
| 11A.2 | Verify each SVG — map file numbers to button identities | Manual review | Mapping documented |
| 11A.3 | Create lib/brand-colors.js with all hex constants from color table above | lib/ | Importable |
| 11A.4 | Create ProjectStatusIcons component — renders 6 icon buttons with active/inactive states | components/ko/ | Component renders |
| 11A.5 | Icon active state: full SVG color. Inactive state: CSS filter grayscale + opacity 0.4 | components/ko/ | Visual difference clear |
| 11A.6 | npm run build | Terminal | Build passes |
| 11A.7 | Update Bible Section 4 (File Map) | docs/ | Bible current |

### 11B: Project Main Page Restructure
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 11B.1 | ADDITIVE: Add ProjectStatusIcons bar below project name/GC info | estimating-center-screen.jsx | Icons visible |
| 11B.2 | Wire BLUEBEAM icon: active when embeddedSheetId exists. Click → opens embedded Setup sheet | estimating-center-screen.jsx | Navigation works |
| 11B.3 | Wire TAKEOFF icon: active when versions.length > 0. Click → opens default version tab | estimating-center-screen.jsx | Navigation works |
| 11B.4 | Wire EXPORT icon: active when import history exists (check via API or state). Click → placeholder for Phase 8 | estimating-center-screen.jsx | Shows active when imports done |
| 11B.5 | Wire PROPOSAL icon: active when proposal file URL exists in state. Click → opens proposal file | estimating-center-screen.jsx | Navigation works |
| 11B.6 | Wire DRAWINGS icon: always inactive (Phase 8). Click → no-op or tooltip | estimating-center-screen.jsx | Renders grayed |
| 11B.7 | Wire MARKUP icon: always inactive (Phase 8). Click → no-op or tooltip | estimating-center-screen.jsx | Renders grayed |
| 11B.8 | VERIFY: All 6 icons render correctly in both states | UI test | Visual check |
| 11B.9 | Remove old header buttons (Bluebeam green, View Takeoff green, Proposal red, BTX blue) | estimating-center-screen.jsx | Old buttons gone |
| 11B.10 | Remove version tab bar from main page (Setup, version tabs, + New Version) | estimating-center-screen.jsx | Tab bar gone from main |
| 11B.11 | Remove status cards row (Status, Due Date, Proposal, Assigned) | estimating-center-screen.jsx | Cards gone |
| 11B.12 | Remove context-aware buttons below version bar (Create Takeoff, Download BTX, Import CSV, etc.) | estimating-center-screen.jsx | Buttons gone |
| 11B.13 | Clean loading screen — show only project info + loading banner during workbook creation | estimating-center-screen.jsx | No buttons/cards during loading |
| 11B.14 | npm run build | Terminal | Build passes |
| 11B.15 | Update Bible Sections 4, 7 | docs/ | Bible current |

### 11C: Setup Sheet Ribbon
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 11C.1 | Replace X close button with ← Back arrow button | estimating-center-screen.jsx | Back arrow visible, navigates to project main page |
| 11C.2 | Add "SETUP BTX TOOLS" button to ribbon (blue #277ed0, white text, toolbox icon) | estimating-center-screen.jsx | Button visible when Setup tab open |
| 11C.3 | Build BTX dropdown card (blue card, 3 options: Create Project Tools, Setup New Tool, Edit Existing Tool) | estimating-center-screen.jsx or new component | Dropdown opens on click |
| 11C.4 | Wire "Create Project Tools" — calls existing handleBtxConfirm flow with setupConfig. Scans project Drive folder for existing BTX files, generates only missing ones. Saves to Drive | estimating-center-screen.jsx + btx/route.js | Only new tools generated |
| 11C.5 | Wire "Setup New Tool" — navigates to /admin/tools (Tool Manager) in create mode | estimating-center-screen.jsx | Navigation works |
| 11C.6 | Wire "Edit Existing Tool" — navigates to /admin/tools (Tool Manager) in list/edit mode | estimating-center-screen.jsx | Navigation works |
| 11C.7 | Add "SETUP TAKEOFF" button to ribbon (green #00aa50, white text, spreadsheet icon) | estimating-center-screen.jsx | Button visible when Setup tab open |
| 11C.8 | Build Takeoff dropdown card (green card, 2 options: Create New Sheet, Update Default Sheet) | estimating-center-screen.jsx or new component | Dropdown opens on click |
| 11C.9 | Wire "Create New Sheet" — calls existing POST /create-version, reloads versions | estimating-center-screen.jsx | New version tab created |
| 11C.10 | Add "default" flag to version tracker on Setup tab — radio behavior (only one default) | lib/version-management.js | Flag readable/writable |
| 11C.11 | Wire "Update Default Sheet" — reads default version, applies current Setup config to it | estimating-center-screen.jsx + new API or existing route | Default version updated |
| 11C.12 | npm run build | Terminal | Build passes |
| 11C.13 | Update Bible Sections 5, 7, 9 | docs/ | Bible current |

### 11D: Version/Takeoff Sheet Ribbon
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 11D.1 | Replace X close button with ← Back arrow button (same as 11C.1, shared logic) | estimating-center-screen.jsx | Back arrow visible |
| 11D.2 | Add "IMPORT BLUEBEAM CSV" button to ribbon (blue Bluebeam-themed) | estimating-center-screen.jsx | Button visible when version tab open |
| 11D.3 | Wire Import button — opens file upload picker, imports into CURRENTLY OPEN version tab, shows accumulation dialog | estimating-center-screen.jsx | Import works, targets correct sheet |
| 11D.4 | Add "CREATE PROPOSAL" button to ribbon (red #d7403a, white text) | estimating-center-screen.jsx | Button visible when version tab open |
| 11D.5 | Wire Proposal button — opens proposal preview for CURRENTLY OPEN version tab | estimating-center-screen.jsx | Proposal reads correct sheet |
| 11D.6 | Verify both ribbon button sets are mutually exclusive — Setup ribbon shows ONLY on Setup, Version ribbon shows ONLY on version tabs | UI test | Correct buttons per context |
| 11D.7 | npm run build | Terminal | Build passes |
| 11D.8 | Update Bible Sections 5, 7 | docs/ | Bible current |

### 11E: BTX Incremental Generation (Create Project Tools)
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 11E.1 | Add Drive folder scan to BTX flow — list existing .btx files in project Markups/ subfolder | btx/route.js or new helper | Returns list of existing tool filenames |
| 11E.2 | Filter setupConfig items — exclude items whose BTX file already exists in Drive | btx/route.js | Only new items sent to Python |
| 11E.3 | Save generated BTX zip to project Drive folder (already partially implemented in Phase 3) | btx/route.js | Zip saved to Drive |
| 11E.4 | Return summary: N new tools generated, M already existed (skipped) | btx/route.js | Summary visible in UI |
| 11E.5 | Update EXPORT icon state after successful BTX generation | estimating-center-screen.jsx | Icon updates |
| 11E.6 | npm run build | Terminal | Build passes |
| 11E.7 | Update Bible Sections 5, 9 | docs/ | Bible current |

### 11F: Final Polish & Bible
| # | Task | File(s) | Verify |
|---|------|---------|--------|
| 11F.1 | Consistent font sizing across all ribbon buttons and icon labels | CSS/Tailwind | Visual consistency |
| 11F.2 | Button hover states in brand colors (darken on hover) | CSS/Tailwind | Hover works |
| 11F.3 | Loading states for all async actions (BTX generation, version creation, proposal generation) | estimating-center-screen.jsx | Spinners/banners visible |
| 11F.4 | Final Architecture Bible update — all Phase 11 changes documented | docs/ | Bible complete |
| 11F.5 | Full build + smoke test (create project, open Setup, create BTX, create version, import CSV, generate proposal) | Terminal + UI | End-to-end works |
| 11F.6 | Update BigQuery implementation_tracker with all Phase 11 tasks | BigQuery + Google Sheet | Tracker synced |

---

## PHASE DEPENDENCIES
```
DONE: 9 → 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 10 (partial)

CURRENT: PHASE 11 (UI Restructure)
    Prerequisites: All above phases
    11A (Assets) → 11B (Main Page) → 11C (Setup Ribbon) + 11D (Version Ribbon) → 11E (BTX Incremental) → 11F (Polish)

NEXT: PHASE 8 (Project Hub — respec needed)
    Wires: DRAWINGS icon, MARKUP icon, project folder browsing, file upload mechanism

DEFERRED: 10.3 (/config route), 10.6-10.9 (migration — sandbox only)
```

### Execution Order
1. Session 47: 11A + 11B (asset integration, main page restructure)
2. Session 48: 11C + 11D (Setup ribbon, Version ribbon)
3. Session 49: 11E + 11F (BTX incremental, polish, Bible)
- Isaac tests between each session
- All changes ADDITIVE FIRST in 11B, then remove old buttons only after new ones proven

---

## RISK REGISTER
| # | Risk | Sub-Phase | Severity | Mitigation |
|---|------|-----------|----------|------------|
| R11.1 | Removing header buttons breaks navigation | 11B | HIGH | ADDITIVE: add icon bar first, verify it works, THEN remove old buttons |
| R11.2 | Ribbon buttons interfere with embedded sheet rendering | 11C, 11D | MEDIUM | Test on multiple screen sizes, ensure ribbon doesn't overlap sheet |
| R11.3 | BTX incremental scan misidentifies existing files | 11E | MEDIUM | Match on exact filename pattern, log scan results |
| R11.4 | Default version flag not persisted correctly | 11C | MEDIUM | Test: set default, close, reopen — flag preserved |
| R11.5 | Icon state detection queries slow down page load | 11B | LOW | Lazy-load state checks, don't block rendering |
| R11.6 | SVG files render differently across browsers | 11A | LOW | Test Chrome, Firefox minimum |

---

## TASK SUMMARY
| Sub-Phase | Description | Tasks |
|-----------|-------------|-------|
| 11A | Asset Integration & Brand Constants | 7 |
| 11B | Project Main Page Restructure | 15 |
| 11C | Setup Sheet Ribbon | 13 |
| 11D | Version/Takeoff Sheet Ribbon | 8 |
| 11E | BTX Incremental Generation | 7 |
| 11F | Final Polish & Bible | 6 |
| **TOTAL** | | **56** |

---

## TRACKING
All tasks to be loaded into BigQuery `mr_main.implementation_tracker`.
Google Sheet view synced for Isaac to monitor.
Fields: phase, task_id, description, file_affected, task_type, status (NOT_STARTED/IN_PROGRESS/DONE/BLOCKED/SKIPPED), verified, verified_by, verified_at, session_completed, notes, branch.

---

*Phase 11 spec built from Isaac's direct design input, SVG assets, and annotated screenshots. Every button, color, and interaction verified through architect Q&A session 2026-02-16.*
