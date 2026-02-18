# SESSION 54 HANDOFF — Phase 12C: Auto-Save Wiring + Bug Fixes

## Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Bug 1: Sidebar icons use PNG at 32x32 | `a162956` | DONE |
| 2 | Bug 2: Drive file permissions (setFilePublicRead) | `1204529` | DONE |
| 3 | Bug 3: CSV imports save to Bluebeam/ not Markups/ | `fc7a41a` | DONE |
| 4 | Feature 1: BTX success toast notification | `5f6f3f1` | DONE |
| 5 | Feature 2: CSV import filename preservation | `9fc3e18` | DONE |
| 6 | Feature 3: Proposal Save as PDF endpoint + button | `0c712e5` | DONE |
| 7 | Feature 4: Takeoff workbook shortcut in Takeoff/ | `54e43d9` | DONE |
| 8 | Architecture Bible Section 19 update | `f626154` | DONE |

## Branch State
- Branch: main
- Build: CLEAN (no errors)
- BigQuery tracker: updated (12.5 → Session 54)
- Synced to Google Sheet
- Pushed to origin

## What Was Built

### Bug Fixes
1. **Sidebar icons**: PNGs exist at `/public/icons/*.png`, `FOLDER_ICONS` in `brand-colors.js` already mapped. Bumped `w-6` → `w-8` (32px) in sidebar
2. **Drive permissions**: `setFilePublicRead` (already existed in `lib/google-drive.js`) now called after every inline upload in BTX, CSV, and Proposal routes. All uploaded files are "anyone with link can view"
3. **CSV save path**: `saveCsvToDrive()` in `bluebeam/route.js` changed from `'Markups'` → `'Bluebeam'`. Naming: `import-{date}-{originalFilename}.csv`. Frontend passes `csv_filename`

### New Features
4. **BTX success toast**: Green notification "Tools saved to project folder (Bluebeam) and downloaded" with auto-dismiss (6s). State: `btxSuccessMsg` in estimating-center-screen.jsx
5. **CSV filename**: Frontend passes original `csv_filename` to backend for Drive save naming
6. **Proposal PDF export**:
   - New endpoint: `POST /api/ko/proposal/[projectId]/export-pdf`
   - Takes `driveFileId`, copies DOCX as Google Doc, exports as PDF, saves to Proposals/
   - Cleanup: deletes temp Google Doc in finally block
   - Red "Save as PDF" button in `takeoff-proposal-preview.jsx` (visible after DOCX generation)
7. **Takeoff workbook shortcut**:
   - New function: `createDriveShortcut()` in `lib/google-drive.js`
   - Folders API lazily creates shortcut when Takeoff/ is empty but workbook exists
   - `listFilesInFolder` returns `shortcutDetails` field
   - `getViewerType` resolves shortcut target MIME type for proper viewer rendering
   - Sheets shortcuts render via embedded `/htmlembed` URL

### Modified Files
| File | Change |
|------|--------|
| `components/ko/project-folder-detail.jsx` | Icon size 32px, shortcut MIME resolution, sheets viewer targetId |
| `components/ko/estimating-center-screen.jsx` | BTX success toast, csv_filename pass-through |
| `components/ko/takeoff-proposal-preview.jsx` | Save as PDF button + handler |
| `lib/google-drive.js` | `createDriveShortcut()`, `shortcutDetails` in file listing |
| `app/api/ko/proposal/[projectId]/export-pdf/route.js` | **NEW** — DOCX→PDF conversion endpoint |
| `app/api/ko/project/[projectId]/folders/route.js` | Lazy takeoff workbook shortcut creation |
| `app/api/ko/takeoff/[projectId]/btx/route.js` | `setFilePublicRead` after upload |
| `app/api/ko/takeoff/[projectId]/bluebeam/route.js` | CSV→Bluebeam path, `csv_filename`, `setFilePublicRead` |
| `app/api/ko/proposal/[projectId]/generate/route.js` | `setFilePublicRead` after upload |
| `docs/ARCHITECTURE_BIBLE.md` | Section 19 Session 54 changes, folder destinations |

### Final Folder Destination Mapping
| Content | Folder | How |
|---------|--------|-----|
| BTX tool zips | Bluebeam/ | Auto-save on generation |
| CSV imports | Bluebeam/ | Auto-save copy on import |
| Original PDFs | Drawings/ | Manual upload only |
| Annotated PDFs | Markups/ | Manual upload only |
| Proposal DOCX | Proposals/ | Auto-save on generation |
| Proposal PDF | Proposals/ | "Save as PDF" button |
| Takeoff workbook | Takeoff/ | Drive shortcut (lazy) |

## What Isaac Should Test
1. **Open a project Documents page** → sidebar shows 5 folders with 32px PNG icons
2. **Click a PDF file** → renders in viewer (no "Request access" error)
3. **Generate BTX tools** → green toast "saved to Bluebeam", zip downloads, appears in Bluebeam/ folder
4. **Import a CSV** → copy saved to Bluebeam/ as `import-{date}-{filename}.csv`
5. **Generate proposal** → DOCX downloads + saved to Proposals/. Click "Save as PDF" → PDF appears
6. **Takeoff workbook** → appears in Takeoff/ folder as shortcut, click opens embedded Sheets viewer
7. **Upload a file** → manual upload to any folder works, file viewable immediately

## Known Limitations
- Proposal PDF conversion requires DOCX to first be in Drive (uses copy→Google Doc→export flow)
- Takeoff workbook shortcut only created lazily (first time folders API is called for that project)
- Agent chat panel still shows mock data
- Activity feed on cards still placeholder

## MANDATORY END-OF-SESSION CHECKLIST
1. [x] Update BigQuery tracker (12.5 → Session 54)
2. [x] Sync to Google Sheet: `node scripts/sync-tracker-to-sheet.mjs`
3. [x] Write HANDOFF (this document)
4. **Pass this checklist forward** — include in every HANDOFF so the next session knows
