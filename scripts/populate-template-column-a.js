/**
 * Google Apps Script to populate Column A with item_ids
 *
 * HOW TO USE:
 * 1. Open the template: https://docs.google.com/spreadsheets/d/1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4
 * 2. Go to Extensions > Apps Script
 * 3. Paste this code and run populateColumnA()
 */

function populateColumnA() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  // Map of scope_name (Column C) → item_id (Column A)
  // This matches the order in lib_takeoff_template
  const scopeNameToItemId = {
    'Vapor Barrier': 'MR-001VB',
    'Pitch Upcharge': 'MR-002PITCH',
    'Roofing - 2 Ply': 'MR-003BU2PLY',
    'Up and Over': 'MR-004UO',
    'Scupper/Leader': 'MR-005SCUPPER',
    'Roofing - IRMA': 'MR-006IRMA',
    'PMMA @ Building': 'MR-007PMMA',
    'PMMA @ Parapet': 'MR-008PMMA',
    'Drains': 'MR-010DRAIN',
    'Doorpans - Std': 'MR-011DOORSTD',
    'Doorpans - Large': 'MR-012DOORLG',
    'Hatch/Skylight (SF)': 'MR-013HATCHSF',
    'Hatch/Skylight (LF)': 'MR-014HATCHLF',
    'Mech Pads': 'MR-015PAD',
    'Fence Posts': 'MR-016FENCE',
    'Railing Posts': 'MR-017RAIL',
    'Plumbing Pen.': 'MR-018PLUMB',
    'Mechanical Pen.': 'MR-019MECH',
    'Davits': 'MR-020DAVIT',
    'AC Units/Dunnage': 'MR-021AC',
    'Coping (Low)': 'MR-022COPELO',
    'Coping (High)': 'MR-023COPEHI',
    'Insul. Coping': 'MR-024INSUCOPE',
    'Flash @ Building': 'MR-025FLASHBLDG',
    'Flash @ Parapet': 'MR-026FLASHPAR',
    'Overburden IRMA': 'MR-027OBIRMA',
    'Pavers': 'MR-028PAVER',
    'Edge @ Pavers': 'MR-029FLASHPAV',
    'Green Roof': 'MR-030GREEN',
    'Edge @ Green': 'MR-031FLASHGRN',
    'Recessed Floor WP': 'MR-032RECESSWP',
    'Batt Insulation': 'MR-INS-BATT',
    'Rigid Insulation': 'MR-INS-RIGID',
    'Cover Board': 'MR-INS-COVER',
    'Traffic Coating': 'MR-033TRAFFIC',
    'Alum. Drip Edge': 'MR-034DRIP',
    'Liquid L Flash': 'MR-035LFLASH',
    'Doorpans - Balc.': 'MR-036DOORBAL',
    'Brick WP': 'MR-037BRICKWP',
    'Open Brick (EA)': 'MR-038OPNBRKEA',
    'Open Brick (LF)': 'MR-039OPNBRKLF',
    'Panel WP': 'MR-040PANELWP',
    'Open Panel (EA)': 'MR-041OPNPNLEA',
    'Open Panel (LF)': 'MR-042OPNPNLLF',
    'EIFS': 'MR-043EIFS',
    'Open Stucco (EA)': 'MR-044OPNSTCEA',
    'Open Stucco (LF)': 'MR-045OPNSTCLF',
    'Trans. Stucco': 'MR-046STUCCO',
    'Drip Cap': 'MR-047DRIPCAP',
    'Sills': 'MR-048SILL',
    'Tie-In': 'MR-049TIEIN',
    'Adj. Bldg Horiz': 'MR-050ADJHORZ',
    'Adj. Bldg Vert': 'MR-051ADJVERT',
    'Other/Custom': 'MR-MISC-OTHER',
    'Demo': 'MR-MISC-DEMO',
    'Garage': 'MR-MISC-GARAGE'
  };

  // Read Column C (scope_names) starting from row 4
  const lastRow = sheet.getLastRow();
  const scopeNames = sheet.getRange('C4:C' + lastRow).getValues();

  let updated = 0;
  let notFound = [];

  for (let i = 0; i < scopeNames.length; i++) {
    const scopeName = scopeNames[i][0];
    if (!scopeName) continue;

    const itemId = scopeNameToItemId[scopeName.trim()];
    if (itemId) {
      sheet.getRange('A' + (i + 4)).setValue(itemId);
      updated++;
    } else {
      notFound.push(scopeName);
    }
  }

  Logger.log('Updated ' + updated + ' cells in Column A');
  if (notFound.length > 0) {
    Logger.log('Not found: ' + notFound.join(', '));
  }

  SpreadsheetApp.getUi().alert('Updated ' + updated + ' cells in Column A.\n\nNot found: ' + (notFound.length > 0 ? notFound.join(', ') : 'None'));
}
