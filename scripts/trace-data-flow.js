#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load env
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

const SPREADSHEET_ID = '17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE';

async function trace() {
  const [values, formulas] = await Promise.all([
    readSheetValues(SPREADSHEET_ID, "'DATE'!A1:O12"),
    readSheetFormulas(SPREADSHEET_ID, "'DATE'!A1:O12")
  ]);

  console.log('=== ROW 3 (Headers) ===');
  const headers = values[2];
  headers.forEach((h, i) => {
    console.log('  Col ' + String.fromCharCode(65 + i) + ': ' + h);
  });

  console.log('\n=== ROW 4 (First Data Row) ===');
  const row4 = values[3];
  console.log('  A (item_id):     ' + row4[0]);
  console.log('  B (Unit Cost):   ' + row4[1]);
  console.log('  C (Scope):       ' + row4[2]);
  console.log('  D (R):           ' + row4[3]);
  console.log('  E (IN):          ' + row4[4]);
  console.log('  F (TYPE):        ' + row4[5]);
  console.log('  G-M (Locations): ' + row4.slice(6, 13).join(', '));
  console.log('  N (Total Meas):  ' + row4[13]);
  console.log('  O (Total Cost):  ' + row4[14]);
  console.log('  Formula Col O:   ' + (formulas[3]?.[14] || '(none)'));

  console.log('\n=== ROW 9 (First Bundle Total) ===');
  const row9 = values[8];
  console.log('  A (item_id):     ' + row9[0]);
  console.log('  B (Unit Cost):   ' + row9[1]);
  console.log('  C (Scope):       ' + row9[2]);
  console.log('  D-F (R/IN/TYPE): ' + [row9[3], row9[4], row9[5]].join(', '));
  console.log('  G-M (Locations): ' + row9.slice(6, 13).join(', '));
  console.log('  N (Total Meas):  ' + row9[13]);
  console.log('  O (Total Cost):  ' + row9[14]);
  console.log('  Formula Col O:   ' + (formulas[8]?.[14] || '(none)'));
}

trace().catch(console.error);
