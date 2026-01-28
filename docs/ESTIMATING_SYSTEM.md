# Master Roofing Estimating System

## Overview
Commercial roofing company with multiple scopes:
- Roofing (built-up, IRMA, liquid, coping, pavers)
- Exterior (EIFS, metal panel, ACM panels)
- Waterproofing

## Current Manual Process

### 1. RFP Intake
- Email received with RFP and link to drawings
- Drawing types: architectural, mechanical, plumbing, landscaping, pool

### 2. Project Folder Setup (Admin)
- Create project folder with project name
- Subfolders:
  - Drawings/ - downloaded drawings
  - Takeoff/ - blank Excel takeoff template
  - Markup/ - marked-up drawings (after takeoff)
  - Proposal/ - proposal versions
- Notify estimator via email/chat/Asana

### 3. Estimator Review
- Review drawings + RFP + customer history
- Determine scope: roofing type, waterproofing, balconies, coping, etc.

### 4. Takeoff Template Setup
- Open blank Excel takeoff template
- Configure columns (starting ~C): Areas/locations (1st floor, 2nd floor, roof levels)
- Configure rows: Line items for project (roofing, coping, flashing, etc.)

### 5. Bluebeam Markup
- Use pre-built tool sets (reusable, not project-specific)
- Each tool has: correct unit of measure (LF, SF), company-standard colors
- Mark up drawings, Bluebeam shows measurements

### 6. Manual Entry (PAIN POINT)
- Two screens: Bluebeam (right), Excel (left)
- Manually transcribe quantities from Bluebeam to Excel by location/line item
- Error-prone and time-consuming

### 7. Review Cycle
- Estimator notifies senior: markup complete
- Senior reviews: missed items, correct formulas, right prices
- Chief estimator approves
- Task sent to create proposal

### 8. Proposal Creation

**Proposal maker receives approved takeoff and uses:**
- Takeoff sheet (scope and quantities)
- "Cheat sheet" template (standard items, descriptions, bullet points)

**Decision logic - line item vs bundled into system:**
- Look at TOTALS column in takeoff sheet
- **Yellow highlighted total = standalone line item** on proposal
- **Not highlighted = bundled into system** (rolls up to sum row)
- Can verify by: color OR formula (what's included in sum row)

**Building the proposal:**
- Standalone items (yellow) → own line item on proposal
- Bundled items (in sum formula) → bullet point in system description
- Reference cheat sheet for standard descriptions
- Fill in: project name, date, customer details

**Final steps:**
- Chief estimator final approval
- Send proposal to customer

## Complete Current Manual Flow
```
RFP Email → Admin creates project folder
                    ↓
         Drawings/, Takeoff/, Markup/, Proposal/
                    ↓
         Notify estimator (email/chat/Asana)
                    ↓
         Estimator reviews drawings + RFP
                    ↓
         Setup takeoff Excel (columns=areas, rows=items)
                    ↓
         Bluebeam markup using tool sets
                    ↓
         MANUAL ENTRY: Bluebeam quantities → Excel (PAIN POINT)
                    ↓
         Senior estimator reviews
                    ↓
         Chief estimator approves takeoff
                    ↓
         Proposal maker reads takeoff + cheat sheet
                    ↓
         Yellow = line item, Not yellow = bundled in system
                    ↓
         Build proposal with descriptions
                    ↓
         Chief estimator approves proposal
                    ↓
         Send to customer
```

## What KO Will Automate
(To be documented - Isaac to explain next)
