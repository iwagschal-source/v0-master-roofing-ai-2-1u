# Phase 8 Handoff - Ready to Start

## Status
- Phases 1-6: DONE
- Phase 7: DEFERRED (full user management needed)
- Phase 8: NOT STARTED (36 steps defined in BigQuery)

## Verified Working This Session (cc_20260128_0701)

### BTX Generation
- Frontend button exists in takeoff-setup-screen.jsx
- API route: `/api/ko/takeoff/{projectId}/btx`
- Backend: `localhost:8000/bluebeam/generate-btx`
- Returns valid Bluebeam XML

### CSV Parser
- Backend: `localhost:8000/bluebeam/parse-csv`
- Works with pipe format: `"Item | Location"`
- Upload UI exists in estimating-center-screen.jsx

### Line Item Library
- 58 items in `mr_agent.lib_takeoff_template`
- 87 Teju tools → 64 mapped (86%)

## BigQuery Tables

| Table | Location | Rows | Notes |
|-------|----------|------|-------|
| `mr_main.proposal_line_item_descriptions` | US | 56 | Loaded from CSV this session |
| `mr_agent.lib_takeoff_template` | us-east4 | 58 | Master line item library |
| `aeyey_dev.ko_final_sprint` | US | 36 | Phase 8 steps, all not_started |

## Item ID Reconciliation Needed

- Description items: 56
- Library items: 58
- Matched: 23 (41%)
- Unmatched descriptions: 33
- Library items without descriptions: 35

Analysis saved in session - need to create mapping table.

## Key Files to Read

```
docs/ESTIMATING_SYSTEM.md          # Full workflow documentation
docs/CLAUDE_SESSION_START.md       # Sprint tracking protocol
/home/iwagschal/proposal_line_item_descriptions.csv  # Source for descriptions
/home/iwagschal/Takeoff-1086 Dumont Ave Brooklyn, NY 11208_(3).xlsx  # Example takeoff
/home/iwagschal/1086 Dumont Ave proposal_pages 1-3.pdf  # Example proposal
```

## Phase 8 Steps (36 total)

### 8.A Data Reconciliation (1-4)
1. Reconcile description item_ids to line item library
2. Reconcile Bluebeam tool mappings to line item library
3. Define systems/bundles in BigQuery
4. Verify every line item has complete data

### 8.B Takeoff Sheet System (5-9)
5. Fix spreadsheet integration
6. Takeoff sheet read/write yellow highlighting
7. Takeoff sheet save to project folder
8. Test: Create takeoff with locations/items/formulas
9. Test: CSV import populates correct cells

### 8.C Proposal Preview (10-16)
10. Build proposal preview screen with editable fields
11. Pull project info (name, GC, address, date)
12. Pull line items from takeoff (yellow cells)
13. Pull descriptions from BigQuery by item_id
14. Show Areas from location columns
15. Editable description fields before PDF
16. Calculate totals (subtotals, section, grand)

### 8.D Proposal PDF Generation (17-23)
17. Implement Word template merge
18. Map takeoff data to template fields
19. Handle multi-page with proper page breaks
20. Generate PDF from merged Word doc
21. Test: 3, 10, 20 items - verify pagination
22. Test: Cover sheet renders correctly
23. Test: Fonts/spacing match Word template exactly

### 8.E Proposal Storage (24-26)
24. Save PDF to project Proposal folder
25. Preview PDF in platform
26. Version numbering (v1, v2, v3)

### 8.F UI Cleanup (27-33)
27. Remove noise from center panel
28. Move Folder Agent to right panel bottom
29. Right panel top: GC Brief/Project Intelligence
30. Left panel: Clean project list
31. Takeoff sheet displays in center panel
32. Fix button colors
33. Location columns vertical layout

### 8.G End-to-End Testing (34-36)
34. Full flow test: Project to PDF
35. Test with real project data (1086 Dumont)
36. Verify PDF matches Word template exactly

## First Task for New Session

**Step 8.A.1:** Create item mapping between descriptions and library

Options identified:
1. Rename description item_ids to match library (simpler)
2. Add missing items to library (more complete)
3. Hybrid approach (recommended)

## Critical Context

- **Yellow cells** in takeoff = proposal line items (standalone)
- **Subtotal rows** bundle items above into "WORK DETAILS" sections
- **Simple items** (no description) just use display_name on proposal
- **Systems** (have description) get full bullet-point sections
- Proposal totals must match takeoff sheet exactly
