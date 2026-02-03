#!/usr/bin/env node
/**
 * Debug the full Tuesday 2 import flow - simulate what bluebeam/route.js does
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

const { readSheetValues } = require('../lib/google-sheets.js');

const SPREADSHEET_ID = '17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE';
const SHEET_NAME = 'DATE';

// Simulate what /sheet-config returns
async function getSheetConfig() {
  // Read Column A
  const colAValues = await readSheetValues(SPREADSHEET_ID, `'${SHEET_NAME}'!A4:A72`);

  const selectedItems = [];
  for (let i = 0; i < colAValues.length; i++) {
    const itemId = colAValues[i]?.[0]?.toString().trim();
    if (itemId && itemId.startsWith('MR-')) {
      selectedItems.push({ item_id: itemId, row: i + 4 });
    }
  }

  // Read headers
  const roofingHeader = await readSheetValues(SPREADSHEET_ID, `'${SHEET_NAME}'!G3:L3`);

  const locations = [];
  const cols = ['G', 'H', 'I', 'J', 'K', 'L'];
  for (let i = 0; i < cols.length; i++) {
    const name = roofingHeader[0]?.[i]?.toString().trim();
    if (name) {
      locations.push({ column: cols[i], name });
    }
  }

  return { selected_items: selectedItems, locations: { ROOFING: locations } };
}

// Simulate how bluebeam/route.js transforms sheet-config to config
function transformSheetConfigToConfig(sheetData) {
  const allLocations = [
    ...(sheetData.locations.ROOFING || []),
    ...(sheetData.locations.BALCONIES || []),
    ...(sheetData.locations.EXTERIOR || [])
  ];

  return {
    columns: allLocations.map(loc => ({
      id: loc.column,
      name: loc.name,
      mappings: [loc.name.toUpperCase()]  // This is key!
    })),
    selectedItems: sheetData.selected_items.map(item => ({
      scope_code: item.item_id
    }))
  };
}

// Simulate parseDeterministicCSV logic
function simulateParsing(config, csvSubject) {
  console.log(`\n   Processing CSV subject: "${csvSubject}"`);

  // Build validItemCodes set
  const validItemCodes = new Set(
    (config.selectedItems || []).map(item => item.scope_code.toUpperCase())
  );

  console.log(`   validItemCodes has ${validItemCodes.size} items`);

  // Parse subject
  if (!csvSubject.includes(' | ')) {
    console.log('   ❌ No pipe delimiter found');
    return;
  }

  const [itemCode, location] = csvSubject.split(' | ').map(s => s.trim());
  console.log(`   Parsed: itemCode="${itemCode}", location="${location}"`);

  // Check if item is valid
  const upperItemCode = itemCode.toUpperCase();
  console.log(`   Checking validItemCodes.has("${upperItemCode}")...`);

  if (!validItemCodes.has(upperItemCode)) {
    console.log(`   ❌ ITEM NOT IN validItemCodes - would be SKIPPED`);

    // Debug: show what's in validItemCodes around this item
    const allCodes = Array.from(validItemCodes).sort();
    const idx = allCodes.findIndex(c => c > upperItemCode);
    console.log(`   Nearby valid codes: ${allCodes.slice(Math.max(0, idx-2), idx+3).join(', ')}`);

    // Check for exact match
    console.log(`   Exact check: validItemCodes includes "${upperItemCode}"? ${validItemCodes.has(upperItemCode)}`);

    // Check character by character against expected
    const expected = 'MR-010DRAIN';
    console.log(`   Character comparison with "${expected}":`);
    for (let i = 0; i < Math.max(expected.length, upperItemCode.length); i++) {
      const e = expected[i] || '∅';
      const a = upperItemCode[i] || '∅';
      const match = e === a ? '✅' : '❌';
      console.log(`     [${i}] expected: '${e}' | actual: '${a}' ${match}`);
    }

    return { skipped: true, reason: 'NOT_IN_VALID_ITEMS' };
  }

  console.log(`   ✅ Item is valid`);

  // Build location map
  const locationMap = {};
  for (const col of config.columns || []) {
    const locationCode = col.mappings?.[0] || col.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
    locationMap[locationCode] = col.name;
    locationMap[col.name.toUpperCase()] = col.name;
    for (const mapping of col.mappings || []) {
      locationMap[mapping.toUpperCase()] = col.name;
    }
  }

  console.log(`   Location map keys: ${Object.keys(locationMap).join(', ')}`);

  const floor = locationMap[location.toUpperCase()] || location;
  console.log(`   Mapped floor: "${floor}"`);

  return { skipped: false, itemCode, floor };
}

async function main() {
  console.log('=== TUESDAY 2 FULL IMPORT FLOW DEBUG ===\n');

  // Step 1: Get sheet config
  console.log('1. Getting sheet-config...');
  const sheetConfig = await getSheetConfig();
  console.log(`   Found ${sheetConfig.selected_items.length} selected items`);
  console.log(`   Found ${sheetConfig.locations.ROOFING.length} ROOFING locations`);

  // Step 2: Transform to config format (as bluebeam/route.js does)
  console.log('\n2. Transforming to config format...');
  const config = transformSheetConfigToConfig(sheetConfig);
  console.log(`   Config has ${config.selectedItems.length} selectedItems`);
  console.log(`   Config has ${config.columns.length} columns`);

  // Show first few selectedItems
  console.log('\n   First 15 selectedItems:');
  config.selectedItems.slice(0, 15).forEach((item, i) => {
    console.log(`   ${i}: scope_code="${item.scope_code}"`);
  });

  // Step 3: Simulate parsing each CSV subject
  console.log('\n3. Simulating CSV parsing...');

  const csvSubjects = [
    'MR-001VB | 1ST FLOOR',
    'MR-010DRAIN | MAIN ROOF',
    'MR-022COPELO | 2ND FLOOR'
  ];

  for (const subject of csvSubjects) {
    simulateParsing(config, subject);
  }

  console.log('\n=== END DEBUG ===');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
