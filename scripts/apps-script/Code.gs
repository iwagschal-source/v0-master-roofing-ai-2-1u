/**
 * Apps Script — Column C Auto-Populate Trigger
 *
 * Phase 1C from MASTER_PLAN_v4.md
 *
 * Attached to the takeoff TEMPLATE spreadsheet.
 * When a user manually selects an item in Column C (Scope/Item),
 * this trigger looks up the item in the Library tab and populates:
 *   - Column A: item_id
 *   - Column B: unit_cost
 *   - Column N: UOM (Setup tab only — on takeoff tabs, N = Total Measurements)
 *
 * IMPORTANT:
 * - Uses simple onEdit trigger (NOT installable), so it does NOT fire
 *   on programmatic writes via Sheets API (safe for Bluebeam import,
 *   version creation, Library refresh).
 * - Checks for existing formulas before writing to avoid overwriting
 *   INDEX+MATCH formulas on the Setup tab.
 * - Skips section headers, total rows, and bundle total rows.
 *
 * Library tab column layout (for lookup):
 *   A = item_id
 *   B = section
 *   C = display_name  <-- match target
 *   D = scope_name    <-- fallback match
 *   E = unit_cost (template_unit_cost)
 *   F = default_rate
 *   G = uom
 *
 * Installation:
 *   1. Open the template spreadsheet in Google Sheets
 *   2. Extensions > Apps Script
 *   3. Paste this code into Code.gs
 *   4. Save (Ctrl+S)
 *   5. No manual trigger setup needed — onEdit is a simple trigger
 *
 * When new projects are created by copying the template,
 * the Apps Script is copied along with the spreadsheet.
 */

/**
 * Simple onEdit trigger — fires on manual user edits only.
 * @param {GoogleAppsScript.Events.SheetsOnEdit} e - The edit event object.
 */
function onEdit(e) {
  if (!e) return;

  var sheet = e.source.getActiveSheet();
  var sheetName = sheet.getName();

  // Skip Library tab — never auto-populate there
  if (sheetName === 'Library') return;

  var range = e.range;
  var col = range.getColumn();  // 1-indexed
  var row = range.getRow();     // 1-indexed

  // Only react to Column C (column 3) edits
  if (col !== 3) return;

  // Skip title row (1), project name row (2)
  if (row <= 2) return;

  // Skip section header rows, total rows, and bundle total rows
  // These row numbers match the template layout exactly
  var HEADER_ROWS = [3, 36, 40, 49];
  var TOTAL_ROWS = [47, 68, 70];
  var BUNDLE_TOTAL_ROWS = [14, 21, 25, 28, 32, 35, 45, 53, 57, 62];

  if (HEADER_ROWS.indexOf(row) !== -1) return;
  if (TOTAL_ROWS.indexOf(row) !== -1) return;
  if (BUNDLE_TOTAL_ROWS.indexOf(row) !== -1) return;

  // Get Library tab
  var library = e.source.getSheetByName('Library');
  if (!library) return;

  var value = range.getValue();

  // Handle clearing Column C
  if (!value || String(value).trim() === '') {
    clearAutoPopulatedCells_(sheet, row, sheetName);
    return;
  }

  // Look up the selected item in the Library tab
  populateFromLibrary_(sheet, row, sheetName, String(value), library);
}

/**
 * Clear auto-populated cells when Column C is cleared.
 * Only clears cells that don't have formulas (preserves INDEX+MATCH on Setup tab).
 */
function clearAutoPopulatedCells_(sheet, row, sheetName) {
  var cellA = sheet.getRange(row, 1);  // Column A: item_id
  var cellB = sheet.getRange(row, 2);  // Column B: unit_cost

  if (!cellA.getFormula()) cellA.setValue('');
  if (!cellB.getFormula()) cellB.setValue('');

  // Column N (14) is UOM only on the Setup tab
  if (sheetName === 'Setup') {
    var cellN = sheet.getRange(row, 14);
    if (!cellN.getFormula()) cellN.setValue('');
  }
}

/**
 * Look up the selected item in the Library tab and populate row values.
 * Matches on Library Column C (display_name) or Column D (scope_name).
 * Only writes to cells that don't already have formulas.
 */
function populateFromLibrary_(sheet, row, sheetName, selectedValue, library) {
  // Read Library data: columns A through G (item_id through uom)
  var lastRow = library.getLastRow();
  if (lastRow < 2) return; // No data rows

  var data = library.getRange(2, 1, lastRow - 1, 7).getValues();

  for (var i = 0; i < data.length; i++) {
    // Skip empty rows
    if (!data[i][0]) continue;

    var displayName = String(data[i][2]);  // Column C: display_name
    var scopeName = String(data[i][3]);    // Column D: scope_name

    if (displayName === selectedValue || scopeName === selectedValue) {
      var itemId = data[i][0];    // Column A: item_id
      var unitCost = data[i][4];  // Column E: unit_cost
      var uom = data[i][6];       // Column G: uom

      // Write item_id (Column A) — skip if cell has a formula
      var cellA = sheet.getRange(row, 1);
      if (!cellA.getFormula()) cellA.setValue(itemId);

      // Write unit_cost (Column B) — skip if cell has a formula
      var cellB = sheet.getRange(row, 2);
      if (!cellB.getFormula()) cellB.setValue(unitCost);

      // Write UOM (Column N = 14) — only on Setup tab
      // On takeoff version tabs, column N is Total Measurements, not UOM
      if (sheetName === 'Setup') {
        var cellN = sheet.getRange(row, 14);
        if (!cellN.getFormula()) cellN.setValue(uom);
      }

      return; // Found match, done
    }
  }

  // No match found — leave existing values unchanged
}
