#!/usr/bin/env node
/**
 * Reads the CURRENT takeoff template structure from Google Sheets
 * Uses the same auth method as lib/google-sheets.js
 *
 * Run: node scripts/read-template-structure.js
 */

const crypto = require('crypto');
const fs = require('fs');

const TEMPLATE_ID = '1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4';
const IMPERSONATE_USER = 'rfp@masterroofingus.com';

// Load credentials from service account JSON file
const creds = JSON.parse(fs.readFileSync('/home/iwagschal/.gcp/workspace-ingest.json', 'utf8'));
const email = creds.client_email;
const privateKey = creds.private_key;

async function getAccessToken() {
  const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: email,
    sub: IMPERSONATE_USER,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');

  const jwt = `${signatureInput}.${signature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function readTemplate() {
  const accessToken = await getAccessToken();

  console.log('Reading template:', TEMPLATE_ID);
  console.log('='.repeat(80));

  // Get spreadsheet metadata
  const metaResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}?fields=sheets.properties`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  if (!metaResponse.ok) {
    throw new Error(`Metadata fetch failed: ${await metaResponse.text()}`);
  }

  const metadata = await metaResponse.json();
  const sheetNames = metadata.sheets.map(s => s.properties.title);

  console.log('\n## Sheet Names:');
  sheetNames.forEach((name, idx) => console.log(`  ${idx + 1}. "${name}"`));

  const firstSheet = sheetNames[0];
  console.log(`\nUsing first sheet: "${firstSheet}"`);

  // Read values (formatted)
  const dataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}/values/${encodeURIComponent(`'${firstSheet}'!A1:O80`)}?valueRenderOption=FORMATTED_VALUE`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  if (!dataResponse.ok) {
    throw new Error(`Data fetch failed: ${await dataResponse.text()}`);
  }

  const dataJson = await dataResponse.json();
  const data = dataJson.values || [];

  // Read formulas
  const formulaResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}/values/${encodeURIComponent(`'${firstSheet}'!A1:O80`)}?valueRenderOption=FORMULA`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  const formulaJson = await formulaResponse.json();
  const formulas = formulaJson.values || [];

  console.log(`\nTotal rows returned: ${data.length}`);
  console.log('='.repeat(80));

  // Find header row
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i] || [];
    const rowStr = row.join('|').toLowerCase();
    if (rowStr.includes('unit cost') && rowStr.includes('scope')) {
      headerRowIdx = i;
      break;
    }
  }

  console.log('\n## ROWS 1-5 (Header/Logo Area):');
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i] || [];
    console.log(`\nRow ${i + 1}:`);
    row.forEach((cell, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      if (cell !== '' && cell !== null && cell !== undefined) {
        console.log(`  ${colLetter}: ${JSON.stringify(cell)}`);
      }
    });
  }

  // Print header row analysis
  if (headerRowIdx >= 0) {
    console.log(`\n## HEADER ROW FOUND at Row ${headerRowIdx + 1}:`);
    const headerRow = data[headerRowIdx] || [];
    console.log('\nFull Column Layout:');
    headerRow.forEach((cell, colIdx) => {
      const colLetter = String.fromCharCode(65 + colIdx);
      console.log(`  Column ${colLetter}: "${cell || '(empty)'}"`);
    });
  }

  // Print ALL rows with their structure
  console.log('\n## ALL DATA ROWS (after header):');
  const startRow = headerRowIdx >= 0 ? headerRowIdx + 1 : 3;

  for (let i = startRow; i < data.length; i++) {
    const row = data[i] || [];
    const formulaRow = formulas[i] || [];

    // Classify row type
    const hasUnitCost = row[0] && row[0] !== '';
    const hasScope = row[1] && row[1] !== '';
    const hasTotalFormula = formulaRow[10]?.toString().startsWith('=');
    const isTotalMeasFormula = formulaRow[9]?.toString().startsWith('=SUM');
    const isSubtotalOnlyFormula = !hasUnitCost && !hasScope && hasTotalFormula;
    const isSectionHeader = row[0]?.toString().toLowerCase().includes('unit cost');
    const isEmpty = !row[0] && !row[1] && !formulaRow[10];

    let rowType = 'LINE_ITEM';
    if (isEmpty) rowType = 'EMPTY';
    else if (isSectionHeader) rowType = 'SECTION_HEADER';
    else if (isSubtotalOnlyFormula) rowType = 'SUBTOTAL';
    else if (row[0]?.toString().toUpperCase().includes('TOTAL COST')) rowType = 'GRAND_TOTAL';

    // Only print non-empty or interesting rows
    if (rowType !== 'EMPTY' || i < startRow + 5) {
      console.log(`\nRow ${i + 1} [${rowType}]:`);
      if (row[0]) console.log(`  A (Unit Cost): ${row[0]}`);
      if (row[1]) console.log(`  B (Scope): "${row[1]}"`);

      // Show any values in location columns
      const locVals = [];
      for (let c = 2; c <= 8; c++) {
        if (row[c]) locVals.push(`${String.fromCharCode(65 + c)}=${row[c]}`);
      }
      if (locVals.length > 0) {
        console.log(`  Locations: ${locVals.join(', ')}`);
      }

      // Show formulas
      if (formulaRow[9]) console.log(`  J formula: ${formulaRow[9]}`);
      if (formulaRow[10]) console.log(`  K formula: ${formulaRow[10]}`);
      if (row[11]) console.log(`  L (Comments): "${row[11]}"`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('## TEMPLATE STRUCTURE SUMMARY');
  console.log('='.repeat(80));

  const headerRow = data[headerRowIdx] || [];
  const locationCols = headerRow.slice(2, 9).filter(c => c && !c.toLowerCase().includes('total'));

  console.log(`
LAYOUT:
-------
Row 1: Date/Logo row (Row 1 cell A1 shows date)
Row 2: Project Name row
Row 3: HEADER ROW (Column titles)
Row 4+: Line items and subtotals

COLUMNS:
--------
Column A: Unit Cost (numeric)
Column B: Scope (item description text)
Column C-I: Location columns [${locationCols.join(', ')}]
Column J: Total Measurements (formula: =SUM(C:I))
Column K: Total Cost (formula: =A*J)
Column L: Comments/Notes

ROW TYPES:
----------`);

  // Count row types
  let counts = { LINE_ITEM: 0, SUBTOTAL: 0, SECTION_HEADER: 0, GRAND_TOTAL: 0, EMPTY: 0 };
  for (let i = startRow; i < data.length; i++) {
    const row = data[i] || [];
    const formulaRow = formulas[i] || [];

    const hasUnitCost = row[0] && row[0] !== '';
    const hasScope = row[1] && row[1] !== '';
    const hasTotalFormula = formulaRow[10]?.toString().startsWith('=');
    const isSubtotalOnlyFormula = !hasUnitCost && !hasScope && hasTotalFormula;
    const isSectionHeader = row[0]?.toString().toLowerCase().includes('unit cost');
    const isEmpty = !row[0] && !row[1] && !formulaRow[10];

    if (isEmpty) counts.EMPTY++;
    else if (isSectionHeader) counts.SECTION_HEADER++;
    else if (row[0]?.toString().toUpperCase().includes('TOTAL COST')) counts.GRAND_TOTAL++;
    else if (isSubtotalOnlyFormula) counts.SUBTOTAL++;
    else counts.LINE_ITEM++;
  }

  console.log(`  - Line Items: ${counts.LINE_ITEM}`);
  console.log(`  - Subtotal Rows: ${counts.SUBTOTAL}`);
  console.log(`  - Section Headers: ${counts.SECTION_HEADER}`);
  console.log(`  - Grand Totals: ${counts.GRAND_TOTAL}`);
  console.log(`  - Empty Rows: ${counts.EMPTY}`);

  // Build a clean item list for reference
  console.log('\n## LINE ITEMS LIST (for wizard):');
  console.log('Format: [Row] Unit_Cost | Scope_Name\n');

  for (let i = startRow; i < data.length; i++) {
    const row = data[i] || [];
    const formulaRow = formulas[i] || [];

    // Only actual line items (has scope and total formula, not a section header)
    if (row[1] && !row[0]?.toString().toLowerCase().includes('unit cost') &&
        !row[0]?.toString().toUpperCase().includes('TOTAL COST') &&
        formulaRow[9]?.toString().startsWith('=SUM')) {
      const unitCost = row[0] || '(no price)';
      const scope = row[1];
      console.log(`[Row ${i + 1}] ${unitCost} | ${scope}`);
    }
  }

  return { sheetNames, headerRowIdx: headerRowIdx + 1, totalRows: data.length };
}

readTemplate()
  .then(() => {
    console.log('\n' + '='.repeat(80));
    console.log('Done. Use this to update the wizard code.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
