#!/usr/bin/env node
/**
 * Debug Tuesday 2 sheet-config - what does /sheet-config return?
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

// Set env vars for google-sheets.js
process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = email;
process.env.GOOGLE_PRIVATE_KEY = privateKey;

const { readSheetValues } = require('../lib/google-sheets.js');

const SPREADSHEET_ID = '17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE';
const SHEET_NAME = 'DATE';

async function main() {
  console.log('=== TUESDAY 2 SHEET-CONFIG DEBUG ===\n');
  console.log('Spreadsheet ID:', SPREADSHEET_ID);
  console.log('Sheet name:', SHEET_NAME);

  // Step 1: Read Column A (item_ids) - rows 4-72
  console.log('\n1. Reading Column A (rows 4-72)...');
  const colAValues = await readSheetValues(SPREADSHEET_ID, `'${SHEET_NAME}'!A4:A72`);

  console.log(`   Raw colAValues length: ${colAValues.length}`);
  console.log('   First 20 values:');
  for (let i = 0; i < Math.min(20, colAValues.length); i++) {
    const val = colAValues[i]?.[0] || '(empty)';
    console.log(`   Row ${i+4}: "${val}"`);
  }

  // Step 2: Parse selected items the same way sheet-config does
  console.log('\n2. Parsing selected_items (same logic as /sheet-config):');
  const selectedItems = [];
  for (let i = 0; i < colAValues.length; i++) {
    const itemId = colAValues[i]?.[0]?.toString().trim();
    if (itemId && itemId.startsWith('MR-')) {
      const row = i + 4;
      selectedItems.push({ item_id: itemId, row });
    }
  }

  console.log(`   Found ${selectedItems.length} items with MR- prefix`);

  // Step 3: Check specifically for MR-010DRAIN
  console.log('\n3. Checking for MR-010DRAIN:');
  const drain = selectedItems.find(i => i.item_id === 'MR-010DRAIN');
  if (drain) {
    console.log(`   ✅ FOUND: MR-010DRAIN at row ${drain.row}`);
  } else {
    console.log('   ❌ NOT FOUND in selectedItems');

    // Check raw value at row 15 (index 11)
    console.log('\n   Raw value at row 15 (index 11):');
    const rawRow15 = colAValues[11];
    console.log(`   colAValues[11] = ${JSON.stringify(rawRow15)}`);
    console.log(`   Value: "${rawRow15?.[0]}"`);
    console.log(`   Type: ${typeof rawRow15?.[0]}`);

    // Check if it starts with MR-
    const val = rawRow15?.[0]?.toString().trim();
    console.log(`   .toString().trim() = "${val}"`);
    console.log(`   .startsWith("MR-") = ${val?.startsWith('MR-')}`);
  }

  // Step 4: Show all items around row 15
  console.log('\n4. Items around row 15:');
  for (let i = 8; i < 18 && i < colAValues.length; i++) {
    const val = colAValues[i]?.[0] || '(empty)';
    const row = i + 4;
    const isMR = val?.toString().trim().startsWith('MR-');
    console.log(`   Row ${row}: "${val}" ${isMR ? '✅' : '❌'}`);
  }

  console.log('\n=== END DEBUG ===');
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
