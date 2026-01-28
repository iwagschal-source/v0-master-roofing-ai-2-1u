# Master Roofing Estimating System - Complete

## Overview
Commercial roofing company with multiple scopes:
- Roofing (built-up, IRMA, liquid, coping, pavers)
- Exterior (EIFS, metal panel, ACM panels)
- Waterproofing

## The KO Automated Flow

### Phase 1: Intelligent Project Intake

1. **New project created in Project Folders**
2. **Architectural drawing uploaded**
3. **Intelligence agent automatically:**
   - Analyzes the drawings
   - Looks up GC's prior history in BigQuery
   - Determines likely scope based on GC patterns + drawings
   - Generates "GC Summary Brief" for estimator
   - Saves to brief table (brief_estimate or similar)

4. **Project auto-appears in Estimating Center**
   - No manual project creation needed
   - Projects flow from Project Folders

### Phase 2: Estimating Center UI

**When estimator opens a project:**

**Left/Center Area:**
- Project details
- Takeoff sheet setup interface

**Right Panel (split horizontal, draggable):**
- **Top:** GC Summary Brief (AI-analyzed scope, GC history, recommendations)
- **Bottom:** AI Chat with agent that knows this GC's full history

### Phase 3: Takeoff Sheet Setup

1. **Estimator configures takeoff sheet:**
   - Columns: Areas/locations (floors, roof, bulkheads, elevators)
   - Rows: Line items (linked to BigQuery line_item_libraries)
   - System selections (linked to system_libraries)
   - R-value, insulation thickness, type columns (to add)

2. **Can add/remove rows and columns as needed**
   - Formulas continue automatically
   - Links to libraries maintained

### Phase 4: BTX Generation (Bluebeam Tool Sets)

1. **Click "Generate" button**
2. **System creates BTX file containing:**
   - Tool sets for each line item
   - Pre-coded per location (floor 1, floor 2, etc.)
   - Correct units of measure
   - Company-standard colors
   - Rules for main roof vs bulkheads vs elevators

3. **Estimator opens BTX in Bluebeam**
   - Tool sets import automatically
   - Ready for markup

### Phase 5: Bluebeam Markup

1. **Open project drawings in Bluebeam**
2. **Do markup using imported tool sets**
3. **Save marked-up drawings to Markup/ folder**
4. **Export CSV report from Bluebeam** (markup totals)
5. **Save CSV to Markup/ or Takeoff/ folder**

### Phase 6: Auto-Populate Takeoff Sheet

1. **Upload Bluebeam CSV export to converter**
2. **Converter knows:**
   - The toolkit structure
   - Location codes
   - Line item mappings
3. **Auto-populates takeoff sheet with quantities**
   - Eliminates manual entry (former pain point)

4. **Estimator reviews and edits as needed**
5. **Senior estimator reviews**
6. **Chief estimator approves**

### Phase 7: Proposal Generation

1. **Takeoff sheet approved and ready**
2. **Click "Generate Proposal" button**
3. **System uses:**
   - Word template with merge fields (new format, no bullet points)
   - Takeoff sheet data
   - Yellow highlights = standalone line items
   - Sum formulas = bundled into system descriptions

4. **Generates proposal PDF**
5. **Saves to Proposal/ folder in Project Folders**
6. **Email proposal to customer**

## Complete Automated Loop
```
New Project + Drawing Upload
         ↓
Intelligence Agent analyzes (GC history + drawings)
         ↓
GC Summary Brief generated → saved to BigQuery
         ↓
Project appears in Estimating Center
         ↓
Estimator sees Brief + AI Chat in right panel
         ↓
Setup takeoff sheet (locations, line items, systems)
         ↓
Click Generate → BTX file created
         ↓
Import BTX to Bluebeam → tool sets ready
         ↓
Do markup in Bluebeam
         ↓
Export CSV from Bluebeam
         ↓
Upload CSV → Auto-populates takeoff sheet
         ↓
Review & approve takeoff
         ↓
Click Generate Proposal → PDF created
         ↓
PDF saved to Project Folder → Email to customer
```

## BigQuery Tables Involved

- line_item_libraries (line items from audited jobs)
- system_libraries (roofing system types/selections)
- brief_estimate / gc_summary_brief (AI-analyzed scope briefs)
- project_folders (project management)
- project_documents (takeoffs, proposals, markups)
- (R-value, insulation thickness, type - columns to add)

## Phase 8: Estimating Center (36 Steps)

### 8.A Data Reconciliation
1. Reconcile description item_ids to line item library
2. Reconcile Bluebeam tool mappings to line item library
3. Define systems/bundles in BigQuery
4. Verify every line item has complete data

### 8.B Takeoff Sheet System
5. Fix spreadsheet integration (Google Sheets or React)
6. Takeoff sheet read/write yellow highlighting
7. Takeoff sheet save to project folder
8. Test: Create takeoff with locations/items/formulas
9. Test: CSV import populates correct cells

### 8.C Proposal Preview
10. Build proposal preview screen with editable fields
11. Pull project info (name, GC, address, date)
12. Pull line items from takeoff (yellow cells)
13. Pull descriptions from BigQuery by item_id
14. Show Areas from location columns
15. Editable description fields before PDF
16. Calculate totals (subtotals, section, grand)

### 8.D Proposal PDF Generation
17. Implement Word template merge
18. Map takeoff data to template fields
19. Handle multi-page with proper page breaks
20. Generate PDF from merged Word doc
21. Test: 3, 10, 20 items - verify pagination
22. Test: Cover sheet renders correctly
23. Test: Fonts/spacing match Word template exactly

### 8.E Proposal Storage
24. Save PDF to project Proposal folder
25. Preview PDF in platform
26. Version numbering (v1, v2, v3)

### 8.F UI Cleanup
27. Remove noise from center panel
28. Move Folder Agent to right panel bottom
29. Right panel top: GC Brief/Project Intelligence
30. Left panel: Clean project list
31. Takeoff sheet displays in center panel
32. Fix button colors
33. Location columns vertical layout

### 8.G End-to-End Testing
34. Full flow test: Project to PDF
35. Test with real project data (1086 Dumont)
36. Verify PDF matches Word template exactly

---

## Verified Working (Session cc_20260128_0701)

### BTX/Bluebeam Converter
- ✅ BTX generation backend: `localhost:8000/bluebeam/generate-btx`
- ✅ BTX frontend button: `/api/ko/takeoff/{projectId}/btx`
- ✅ 64/74 tools mapped (86%)
- ✅ CSV parser works with pipe format

### Takeoff Sheet System
- ✅ Line item library: 58 items from BigQuery
- ✅ CSV upload UI exists in Estimating Center
- ⚠️ Config save needs testing

### Proposal System
- ✅ proposal_line_item_descriptions loaded to BigQuery (56 rows)
- ⚠️ 33 item_ids need reconciliation with library
- ⚠️ export-pdf and generate-descriptions are MOCK code

### Key Files
- `/home/iwagschal/bluebeam_generators/btx_location_generator.py`
- `/home/iwagschal/Teju Tool Set.btx`
- `/home/iwagschal/BLUEBEAM_COMPLETE_MAPPING.json` (64 tools)
- `mr_main.proposal_line_item_descriptions` (BigQuery)
