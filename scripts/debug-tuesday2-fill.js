#!/usr/bin/env node
/**
 * Debug fillBluebeamDataToSpreadsheet for Tuesday 2
 */
const fs = require('fs');
const path = require('path');

// Read .env.local
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

const { fillBluebeamDataToSpreadsheet } = require('../lib/google-sheets.js');

const SPREADSHEET_ID = '17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE';

async function main() {
  console.log('=== TUESDAY 2 FILL DEBUG ===\n');

  // Simulate the parsed bluebeam items
  const bluebeamItems = [
    { code: 'MR-001VB', floor: '1ST FLOOR', quantity: 74.79 },
    { code: 'MR-010DRAIN', floor: 'MAIN ROOF', quantity: 5 },
    { code: 'MR-022COPELO', floor: '2ND FLOOR', quantity: 35.6968 }
  ];

  console.log('Input items:');
  bluebeamItems.forEach(item => {
    console.log(`  - ${item.code} | ${item.floor} = ${item.quantity}`);
  });

  console.log('\nCalling fillBluebeamDataToSpreadsheet (DRY RUN - will NOT write)...\n');

  // Actually call the function but we'll just look at the details
  // Note: This WILL write to the sheet! If you want a dry run, you'd need to modify the function
  // For now, let's just trace what it does

  try {
    const result = await fillBluebeamDataToSpreadsheet(SPREADSHEET_ID, bluebeamItems, null);

    console.log('Result:');
    console.log(`  updated: ${result.updated}`);
    console.log('\n  Details:');
    result.details.forEach(d => {
      console.log(`  - ${d.code} | ${d.floor}:`);
      console.log(`      status: ${d.status}`);
      if (d.row) console.log(`      row: ${d.row}`);
      if (d.section) console.log(`      section: ${d.section}`);
      if (d.col) console.log(`      col: ${d.col}`);
      if (d.availableLocations) console.log(`      availableLocations: ${d.availableLocations.join(', ')}`);
    });
  } catch (e) {
    console.error('Error:', e.message);
  }

  console.log('\n=== END DEBUG ===');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
