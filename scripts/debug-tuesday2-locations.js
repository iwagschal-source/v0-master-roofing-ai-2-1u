#!/usr/bin/env node
/**
 * Debug Tuesday 2 location matching
 */
const fs = require('fs');
const path = require('path');

// Read .env.local manually
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

function buildLocationMapFromHeader(headerRow) {
  const locationMap = {};
  const locationCols = ['G', 'H', 'I', 'J', 'K', 'L'];

  for (let i = 0; i < locationCols.length; i++) {
    const headerIdx = 6 + i; // G=6, H=7, etc. (0-indexed)
    const headerValue = headerRow[headerIdx]?.toString().trim().toUpperCase() || '';

    if (headerValue) {
      locationMap[headerValue] = locationCols[i];
      // Add common variations
      const normalized = headerValue.replace(/[^A-Z0-9]/g, '');
      if (normalized !== headerValue) {
        locationMap[normalized] = locationCols[i];
      }
    }
  }

  return locationMap;
}

async function main() {
  console.log('=== TUESDAY 2 LOCATION DEBUG ===\n');

  // Read ROOFING header row (row 3)
  console.log('1. Reading ROOFING header row (A3:L3):');
  const roofingHeader = await readSheetValues(SPREADSHEET_ID, `'${SHEET_NAME}'!A3:L3`);
  console.log('   Full row:', JSON.stringify(roofingHeader[0]));
  console.log('   Columns G-L (indices 6-11):');
  for (let i = 6; i <= 11; i++) {
    const col = String.fromCharCode(65 + i); // A=65, G=71
    const val = roofingHeader[0]?.[i] || '(empty)';
    console.log(`   ${col}: "${val}"`);
  }

  // Build location map
  console.log('\n2. Building location map (same logic as fillBluebeamDataToSpreadsheet):');
  const locationMap = buildLocationMapFromHeader(roofingHeader[0] || []);
  console.log('   Location map:');
  for (const [key, col] of Object.entries(locationMap)) {
    console.log(`   "${key}" → column ${col}`);
  }

  // Test "MAIN ROOF" matching
  console.log('\n3. Testing "MAIN ROOF" matching:');
  const testLocation = 'MAIN ROOF';
  const upperLocation = testLocation.toUpperCase();
  console.log(`   Input: "${testLocation}"`);
  console.log(`   Uppercase: "${upperLocation}"`);
  console.log(`   locationMap["${upperLocation}"]: ${locationMap[upperLocation] || 'NOT FOUND'}`);

  const normalized = upperLocation.replace(/[^A-Z0-9]/g, '');
  console.log(`   Normalized (no spaces): "${normalized}"`);
  console.log(`   locationMap["${normalized}"]: ${locationMap[normalized] || 'NOT FOUND'}`);

  // Check what's actually in column K (which should be MAIN ROOF)
  console.log('\n4. What is in column K (index 10)?');
  const colK = roofingHeader[0]?.[10];
  console.log(`   Raw value: "${colK}"`);
  console.log(`   Type: ${typeof colK}`);
  console.log(`   Uppercase: "${colK?.toString().toUpperCase()}"`);

  // Character-by-character comparison
  console.log('\n5. Character-by-character comparison:');
  const expected = 'MAIN ROOF';
  const actual = colK?.toString().toUpperCase() || '';
  console.log(`   Expected: "${expected}" (length: ${expected.length})`);
  console.log(`   Actual:   "${actual}" (length: ${actual.length})`);

  for (let i = 0; i < Math.max(expected.length, actual.length); i++) {
    const e = expected[i] || '∅';
    const a = actual[i] || '∅';
    const match = e === a ? '✅' : '❌';
    console.log(`   [${i}] expected: '${e}' (${expected.charCodeAt(i) || 'N/A'}) | actual: '${a}' (${actual.charCodeAt(i) || 'N/A'}) ${match}`);
  }

  console.log('\n=== END DEBUG ===');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
