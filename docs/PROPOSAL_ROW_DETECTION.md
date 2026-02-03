# Proposal Row Type Auto-Detection

## Overview

The proposal preview system needs to detect which rows are:
- Regular line items (ITEM)
- Bundle/system totals (BUNDLE_TOTAL)
- Section totals (SECTION_TOTAL)
- Grand total (GRAND_TOTAL)

Currently relies on a `Row Type` column that **doesn't exist** in the template.

## Solution: Auto-Detect from Column O Formulas

Google Sheets API can return formulas using `valueRenderOption=FORMULA`.

---

## Formula Patterns Discovered

### 1. Regular Item Rows
```
Pattern: =B{row}*N{row}
Examples: =B4*N4, =B15*N15, =B29*N29
Meaning: Unit Cost × Total Measurements
```

### 2. Bundle Total Rows (System Subtotals)
```
Pattern: =SUM(O{start}:O{end})
Examples:
  Row 9:  =SUM(O6:O8)      → bundles rows 6-8
  Row 14: =SUM(O10:O13)    → bundles rows 10-13
  Row 28: =SUM(O19:O27)    → bundles rows 19-27
  Row 32: =SUM(O29:O31)    → bundles rows 29-31
```

### 3. Bundle Total Variant (Addition)
```
Pattern: =O{a}+O{b}+O{c}
Example: Row 49: =O46+O47+O48
Used in: BALCONIES section
```

### 4. Section Totals
```
Pattern: Multiple O references (5+ cells)
Example: Row 51: =O4+O5+O9+O14+O15+O18+O28+O32+O35+O36+O39+O42+O43+O49+O50
Meaning: Sum of all ROOFING items + bundle totals
```

### 5. Grand Total
```
Pattern: =O{section1}+O{section2}
Example: Row 75: =O51+O73
Meaning: ROOFING total + EXTERIOR total
```

---

## Detection Rules Table

| Formula Pattern | Detected Type | Confidence |
|-----------------|---------------|------------|
| `=B{n}*N{n}` | ITEM | High |
| `=SUM(O{x}:O{y})` | BUNDLE_TOTAL | High |
| `=O{a}+O{b}+O{c}` (3-4 refs) | BUNDLE_TOTAL | Medium |
| `=O{a}+O{b}+...` (5+ refs) | SECTION_TOTAL | High |
| References known section totals | GRAND_TOTAL | High |
| No formula, has item_id | ITEM | High |
| No formula, no item_id | HEADER or EMPTY | Low |

---

## Backup Indicator: Column C (Scope)

Column C contains explicit labels:
- `"BUNDLE TOTAL - 1"` through `"BUNDLE TOTAL - 12"`

**Regex pattern:** `/BUNDLE\s*T?OTAL/i`

This provides a reliable fallback if formula parsing fails.

---

## Template Structure Reference

### ROOFING Section (Rows 4-43)
| Row | Type | Scope Label |
|-----|------|-------------|
| 4-8 | ITEM | Individual items |
| 9 | BUNDLE_TOTAL | "BUNDLE TOTAL - 1" |
| 10-13 | ITEM | Individual items |
| 14 | BUNDLE_TOTAL | "BUNDLE TOTAL - 2" |
| ... | ... | ... |
| 43 | ITEM | Last ROOFING item |
| 51 | SECTION_TOTAL | (no label, formula sums all) |

### BALCONIES Section (Rows 46-50)
| Row | Type | Notes |
|-----|------|-------|
| 46-48 | ITEM | Traffic, Drip, L-Flash |
| 49 | BUNDLE_TOTAL | Uses + instead of SUM |
| 50 | ITEM | Doorpans |

### EXTERIOR Section (Rows 55-72)
| Row | Type | Notes |
|-----|------|-------|
| 55-57 | ITEM | Brick items |
| 58 | BUNDLE_TOTAL | "BUNDLE TOTAL - 10" |
| ... | ... | ... |
| 73 | SECTION_TOTAL | Sums all EXTERIOR |

### Grand Total
| Row | Type | Formula |
|-----|------|---------|
| 75 | GRAND_TOTAL | =O51+O73 |

---

## Implementation Plan

### Step 1: Modify `readSheetValues` or create new function
```javascript
async function readSheetFormulas(spreadsheetId, range) {
  // Use valueRenderOption=FORMULA
}
```

### Step 2: Create formula parser
```javascript
function detectRowType(formula, scopeValue, itemId) {
  // 1. Check if formula matches =B{n}*N{n} → ITEM
  // 2. Check if formula matches =SUM(O{x}:O{y}) → BUNDLE_TOTAL
  // 3. Check if scopeValue matches /BUNDLE.*TOTAL/i → BUNDLE_TOTAL
  // 4. Check if formula has 5+ O references → SECTION_TOTAL
  // 5. Check if references O51 or O73 → GRAND_TOTAL
  // 6. Default: ITEM if has itemId, else UNKNOWN
}
```

### Step 3: Update preview/route.js
- Fetch formulas alongside values
- Auto-detect row types
- Remove dependency on Row Type column

### Step 4: Handle bundle descriptions
- Items in a bundle: use short description or skip
- Bundle total row: use combined/system description
- Standalone items: use full paragraph description

---

## Files to Modify

1. `lib/google-sheets.js` - Add `readSheetFormulas()` function
2. `app/api/ko/proposal/[projectId]/preview/route.js` - Add auto-detection logic
3. `lib/proposal-utils.js` - Add formula parsing utilities (if created)

---

## Created
- **Date:** 2026-02-03
- **Session:** 22
- **Status:** Analysis complete, ready to implement
