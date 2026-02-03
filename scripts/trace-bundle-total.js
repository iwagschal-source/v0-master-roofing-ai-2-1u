#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const key = line.substring(0, idx).trim();
    let val = line.substring(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val.replace(/\\n/g, '\n');
  }
}

const { readSheetValues, readSheetFormulas } = require('../lib/google-sheets');

async function main() {
  const SPREADSHEET_ID = '17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE';

  const [values, formulas] = await Promise.all([
    readSheetValues(SPREADSHEET_ID, "'DATE'!A4:O12"),
    readSheetFormulas(SPREADSHEET_ID, "'DATE'!O4:O12")
  ]);

  console.log('=== ROWS 4-12 (First Bundle) ===\n');
  console.log('Row | item_id      | Scope                           | Total Cost | Formula');
  console.log('----|--------------|----------------------------------|------------|--------');

  for (let i = 0; i < values.length; i++) {
    const row = values[i] || [];
    const rowNum = i + 4;
    const itemId = (row[0] || '').padEnd(12);
    const scope = (row[2] || '').substring(0, 32).padEnd(32);
    const totalCost = (row[14] || '').padEnd(10);
    const formula = formulas[i]?.[0] || '(value)';

    console.log(rowNum + '   | ' + itemId + ' | ' + scope + ' | ' + totalCost + ' | ' + formula);
  }

  console.log('\n=== ANALYSIS ===');
  console.log('Row 9 (BUNDLE TOTAL - 1):');
  console.log('  Scope: ' + values[5]?.[2]);
  console.log('  Total Cost value: ' + values[5]?.[14]);
  console.log('  Formula: ' + formulas[5]?.[0]);
  console.log('\nThe formula =SUM(O6:O8) sums rows 6-8.');
  console.log('But rows 4-8 have item data, row 9 is the bundle total.');
  console.log('The SUM references the wrong rows or the values are $0.00');
}

main().catch(e => console.error(e));
