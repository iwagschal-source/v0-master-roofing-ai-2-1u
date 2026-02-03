#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load env vars
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

const { readSheetValues, getFirstSheetName } = require('../lib/google-sheets');

const SPREADSHEET_ID = '17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE';

async function inspect() {
  const sheetName = await getFirstSheetName(SPREADSHEET_ID);
  console.log('Sheet name:', sheetName);

  // Read first 10 rows, columns A-P
  const values = await readSheetValues(SPREADSHEET_ID, "'" + sheetName + "'!A1:P10");

  console.log('\n=== First 10 rows ===\n');
  for (let i = 0; i < values.length; i++) {
    const row = values[i] || [];
    console.log('Row ' + (i+1) + ':', JSON.stringify(row.slice(0, 8)));
  }

  // Check row 3 specifically
  console.log('\n=== Row 3 (potential header) ===\n');
  const row3 = values[2] || [];
  row3.forEach((cell, idx) => {
    if (cell) {
      const colLetter = String.fromCharCode(65 + idx);
      console.log('Col ' + colLetter + ' (' + idx + '): ' + cell);
    }
  });
}

inspect().catch(console.error);
