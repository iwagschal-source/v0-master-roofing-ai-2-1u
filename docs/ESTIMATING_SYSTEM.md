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

## Current Implementation Status (from Isaac's tracker)

### BTX/Bluebeam Converter
- BTX-001: ✅ btx_location_generator.py WORKING
- BTX-002: PENDING - Map all 87 tools (38 done, 49 remaining)
- BTX-003: PENDING - /bluebeam/generate-btx API endpoint
- BTX-004: PENDING - nginx route for /bluebeam/
- BTX-005: PENDING - Frontend BTX download button
- BTX-006: PENDING - CSV Parser (pipe delimiter)

### Takeoff Sheet System
- TKF-001: PARTIAL - Blank template exists
- TKF-002: UNTESTED - /api/ko/takeoff/create
- TKF-003: PARTIAL - Config save failing
- TKF-004: PENDING - Bluebeam CSV → populate sheet
- TKF-005: ✅ WORKING - Line item selector
- TKF-006: UNTESTED - Rate overrides

### Proposal System
- PRP-001: PENDING - Need Word template
- PRP-002: PARTIAL - /api/ko/export-pdf returns 400
- PRP-003: PARTIAL - /api/ko/generate-descriptions returns 400
- PRP-004: PENDING - Connect proposal to takeoff
- PRP-005: UNTESTED - Proposal preview

### Key Files
- btx_location_generator.py
- Teju Tool Set.btx (48 items)
- BLUEBEAM_COMPLETE_MAPPING.json
- BLANK_TEMPLATE_TAKEOFF_SHEET

### UI Issues (Isaac feedback)
- Center panel has noise (status, GC context) - move or remove
- Folder agent in wrong place - should be in right panel
- Buttons may be redundant
- Giant cards/bubbles - needs cleaner layout like actual takeoff sheet
