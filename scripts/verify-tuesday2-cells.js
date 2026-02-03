#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let email = '';
let privateKey = '';

for (const line of envContent.split('\n')) {
  if (line.startsWith('GOOGLE_SERVICE_ACCOUNT_EMAIL=')) {
    email = line.split('=')[1].trim();
  }
  if (line.startsWith('GOOGLE_PRIVATE_KEY=')) {
    const match = line.match(/GOOGLE_PRIVATE_KEY="(.+)"/s);
    if (match) {
      privateKey = match[1].replace(/\\n/g, '\n');
    }
  }
}

process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = email;
process.env.GOOGLE_PRIVATE_KEY = privateKey;

const { readSheetValues } = require('../lib/google-sheets.js');

const SPREADSHEET_ID = '17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE';

async function main() {
  console.log('=== VERIFY TUESDAY 2 CELLS ===\n');

  // Check the 3 cells that should have been updated
  const cells = [
    { cell: 'G4', expected: 'MR-001VB | 1ST FLOOR', value: 74.79 },
    { cell: 'K15', expected: 'MR-010DRAIN | MAIN ROOF', value: 5 },
    { cell: 'H29', expected: 'MR-022COPELO | 2ND FLOOR', value: 35.6968 }
  ];

  for (const c of cells) {
    const result = await readSheetValues(SPREADSHEET_ID, `'DATE'!${c.cell}`);
    const actual = result[0]?.[0];
    console.log(`${c.cell} (${c.expected}):`);
    console.log(`  Expected: ${c.value}`);
    console.log(`  Actual:   ${actual}`);
    console.log(`  Match:    ${parseFloat(actual) === c.value ? '✅' : '❌'}\n`);
  }
}

main().catch(console.error);
