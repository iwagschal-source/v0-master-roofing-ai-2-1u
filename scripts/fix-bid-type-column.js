#!/usr/bin/env node
/**
 * Fix BID TYPE column (P) on takeoff template
 *
 * Logic:
 * - BUNDLE TOTAL rows (=SUM(O{x}:O{y})) → dropdown (BASE/ALT) + default "BASE"
 * - Bundled item rows (referenced by a SUM range) → clear value + remove validation
 * - Standalone item rows (not in any SUM range, has item_id) → dropdown + "BASE"
 *
 * Template: 1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4
 * Sheet: DATE
 */
const crypto = require('crypto');

const TEMPLATE_ID = '1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4';
const SHEET_NAME = 'DATE';
const BID_TYPE_COL = 15; // Column P (0-indexed)

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !privateKey) throw new Error('Missing credentials');
  const now = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const p = Buffer.from(JSON.stringify({
    iss: email, sub: 'rfp@masterroofingus.com',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/spreadsheets'
  })).toString('base64url');
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(`${h}.${p}`);
  const jwt = `${h}.${p}.${sign.sign(privateKey, 'base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  });
  return (await res.json()).access_token;
}

async function main() {
  const token = await getAccessToken();
  console.log('Authenticated.\n');

  // Step 1: Get sheetId
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}?fields=sheets.properties`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const meta = await metaRes.json();
  const sheetId = meta.sheets.find(s => s.properties.title === SHEET_NAME).properties.sheetId;

  // Step 2: Read column A (item_ids) and column O (formulas) for rows 3-75
  console.log('Step 1: Reading column A (item_ids) and column O (formulas)...');
  const [colARes, colORes] = await Promise.all([
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}/values/${encodeURIComponent(`'${SHEET_NAME}'!A3:A75`)}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    ),
    fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}/values/${encodeURIComponent(`'${SHEET_NAME}'!O3:O75`)}?valueRenderOption=FORMULA`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
  ]);

  const colA = (await colARes.json()).values || [];
  const colO = (await colORes.json()).values || [];

  // Step 3: Classify every row
  const bundleTotalRows = [];   // rows with =SUM(O{x}:O{y})
  const bundledItemRows = new Set(); // rows referenced inside SUM ranges
  const standaloneRows = [];    // item rows not in any bundle

  // First pass: find all bundle totals and their ranges
  for (let i = 0; i < colO.length; i++) {
    const row = i + 3; // Row 3 is index 0
    const formula = (colO[i]?.[0] || '').toString().trim();
    const match = formula.match(/^=SUM\(O(\d+):O(\d+)\)$/i);
    if (match) {
      const startRow = parseInt(match[1]);
      const endRow = parseInt(match[2]);
      bundleTotalRows.push({ row, startRow, endRow, formula });
      for (let r = startRow; r <= endRow; r++) {
        bundledItemRows.add(r);
      }
    }
  }

  // Second pass: find standalone item rows (have item_id, not in any bundle)
  for (let i = 0; i < colA.length; i++) {
    const row = i + 3;
    const itemId = (colA[i]?.[0] || '').toString().trim();
    if (itemId && itemId.startsWith('MR-') && !bundledItemRows.has(row)) {
      standaloneRows.push(row);
    }
  }

  console.log(`\n  Bundle total rows (${bundleTotalRows.length}):`);
  for (const bt of bundleTotalRows) {
    console.log(`    Row ${bt.row}: ${bt.formula} (items: rows ${bt.startRow}-${bt.endRow})`);
  }
  console.log(`\n  Bundled item rows (${bundledItemRows.size}): ${[...bundledItemRows].sort((a,b)=>a-b).join(', ')}`);
  console.log(`\n  Standalone item rows (${standaloneRows.length}): ${standaloneRows.join(', ')}`);

  // Step 4: Clear ALL existing values in column P (rows 4-75) to start fresh
  console.log('\nStep 2: Clearing all existing BID TYPE values (P4:P75)...');
  const clearData = [];
  for (let r = 4; r <= 75; r++) {
    clearData.push({ range: `'${SHEET_NAME}'!P${r}`, values: [['']] });
  }
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'RAW', data: clearData })
    }
  );

  // Step 5: Remove ALL existing data validation from column P (rows 4-72)
  console.log('Step 3: Removing all existing data validation from P4:P72...');
  const clearValidationRanges = [
    { start: 3, end: 43 },  // rows 4-43
    { start: 45, end: 53 }, // rows 46-53
    { start: 54, end: 72 }, // rows 55-72
  ];
  const clearValidationRequests = clearValidationRanges.map(range => ({
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: range.start,
        endRowIndex: range.end,
        startColumnIndex: BID_TYPE_COL,
        endColumnIndex: BID_TYPE_COL + 1,
      },
      rule: null  // null removes validation
    }
  }));
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}:batchUpdate`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: clearValidationRequests })
    }
  );

  // Step 6: Write "BASE" to bundle total rows + standalone rows
  console.log('Step 4: Writing "BASE" to bundle total and standalone rows...');
  const rowsToSet = [...bundleTotalRows.map(bt => bt.row), ...standaloneRows];
  const setData = rowsToSet.map(r => ({
    range: `'${SHEET_NAME}'!P${r}`,
    values: [['BASE']]
  }));
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'RAW', data: setData })
    }
  );
  console.log(`  Set "BASE" on ${rowsToSet.length} rows: ${rowsToSet.sort((a,b)=>a-b).join(', ')}`);

  // Step 7: Add data validation (BASE/ALT dropdown) to bundle total rows + standalone rows
  console.log('Step 5: Adding data validation dropdowns...');
  const validationRequests = rowsToSet.map(row => ({
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: row - 1,  // 0-indexed
        endRowIndex: row,
        startColumnIndex: BID_TYPE_COL,
        endColumnIndex: BID_TYPE_COL + 1,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: [
            { userEnteredValue: 'BASE' },
            { userEnteredValue: 'ALT' }
          ]
        },
        showCustomUi: true,
        strict: true
      }
    }
  }));
  const valRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}:batchUpdate`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: validationRequests })
    }
  );
  if (!valRes.ok) throw new Error(`Validation error: ${await valRes.text()}`);
  console.log(`  Added dropdowns to ${rowsToSet.length} rows`);

  // Step 8: Verify
  console.log('\n' + '='.repeat(70));
  console.log('VERIFICATION');
  console.log('='.repeat(70));

  // Read P column for all relevant rows
  const allRows = [...rowsToSet, ...[...bundledItemRows].sort((a,b)=>a-b)];
  const spotRows = [3, 4, 5, 6, 9, 10, 13, 14, 15, 27, 28, 43, 45, 46, 48, 49, 50, 54, 55, 57, 58, 63, 72];
  const spotRanges = spotRows.map(r => `'${SHEET_NAME}'!P${r}`);
  const spotUrl = `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}/values:batchGet?${spotRanges.map(r => `ranges=${encodeURIComponent(r)}`).join('&')}`;
  const spotRes = await fetch(spotUrl, { headers: { 'Authorization': `Bearer ${token}` } });
  const spotData = await spotRes.json();

  for (const vr of spotData.valueRanges) {
    const row = parseInt(vr.range.match(/P(\d+)/)[1]);
    const val = vr.values?.[0]?.[0] || '(empty)';
    let type = '';
    if (row === 3 || row === 45 || row === 54) type = ' [HEADER]';
    else if (bundleTotalRows.some(bt => bt.row === row)) type = ' [BUNDLE TOTAL → has dropdown]';
    else if (bundledItemRows.has(row)) type = ' [BUNDLED ITEM → no dropdown]';
    else if (standaloneRows.includes(row)) type = ' [STANDALONE → has dropdown]';
    console.log(`  P${row}: ${val}${type}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Bundle total rows with dropdown: ${bundleTotalRows.map(bt => bt.row).join(', ')}`);
  console.log(`  Standalone rows with dropdown:   ${standaloneRows.join(', ')}`);
  console.log(`  Bundled item rows (no dropdown):  ${[...bundledItemRows].sort((a,b)=>a-b).join(', ')}`);
  console.log(`  Total dropdowns: ${rowsToSet.length}`);
}

main().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
