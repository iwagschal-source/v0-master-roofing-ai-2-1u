# Takeoff Sheet Row Types

## Purpose
The Row Type column (Col K) explicitly marks how each row should be treated during proposal generation. This eliminates the need to parse formulas.

## Row Types

| Type | Color | Description | Proposal Behavior |
|------|-------|-------------|-------------------|
| ITEM | None | Regular line item | Bundled into nearest SUBTOTAL above |
| SUBTOTAL:ROOFING | Yellow | Subtotal for roofing section | Creates "WORK DETAILS FOR ROOFING" section |
| SUBTOTAL:EXTERIOR | Yellow | Subtotal for exterior section | Creates "WORK DETAILS FOR EXTERIOR" section |
| SUBTOTAL:BALCONY | Yellow | Subtotal for balcony section | Creates "WORK DETAILS FOR BALCONY" section |
| STANDALONE | Yellow | Individual line item | Gets own line on proposal with its description |
| SECTION_TOTAL | Orange | Total for major section | Displayed as section subtotal on proposal |
| GRAND_TOTAL | Orange | Final total | Displayed as grand total on proposal |

## Example

| Row | Scope | Total Cost | Row Type |
|-----|-------|------------|----------|
| 6 | Roofing 2-ply | $80,000 | ITEM |
| 7 | Up and over | $2,400 | ITEM |
| 8 | Drains | $3,300 | ITEM |
| 9 | Allowance | $3,500 | ITEM |
| 10 | | $89,200 | SUBTOTAL:ROOFING |
| 11 | Overburden | $5,000 | STANDALONE |
| ... | ... | ... | ... |
| 52 | TOTAL ROOFING | $245,000 | SECTION_TOTAL |

## Proposal Generation Logic

1. Find all SUBTOTAL:* rows → create "WORK DETAILS" sections
2. For each SUBTOTAL, find ITEM rows above it (until previous SUBTOTAL or start)
3. Bundle those items' descriptions into the section
4. Find all STANDALONE rows → create individual line items
5. Use SECTION_TOTAL and GRAND_TOTAL for pricing display

## Cell Styling

- **Yellow background (#FFFF00)**: SUBTOTAL and STANDALONE rows - these appear on proposal
- **Orange background (#FFA500)**: SECTION_TOTAL and GRAND_TOTAL rows
- **No background**: Regular ITEM rows - bundled into subtotals

## Column Layout (Updated 2026-01-29)

With item_id added as Column A, the layout is:

| Col | Header | Purpose |
|-----|--------|---------|
| A | item_id | Links to item_description_mapping for proposal descriptions |
| B | Unit Cost | Price per unit |
| C | R | R-value (for insulation items) - dropdown |
| D | IN | Thickness in inches - dropdown |
| E | TYPE | Material type - dropdown |
| F | Scope | Line item name/description |
| G-L | Location 1-6 | Measurements by area |
| M | Total Measurements | =SUM(G:L) |
| N | Total Cost | =B*M |
| O | Row Type | ITEM, SUBTOTAL:*, STANDALONE, etc. |
| P | Comments | Internal notes |

### Placeholder Replacement

When generating proposals, placeholders in descriptions are replaced:
- `{R_VALUE}` → Value from Column C
- `{THICKNESS}` → Value from Column D
- `{TYPE}` → Value from Column E
