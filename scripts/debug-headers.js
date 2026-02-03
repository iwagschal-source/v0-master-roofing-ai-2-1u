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

const { readSheetValues } = require('../lib/google-sheets');

const SPREADSHEET_ID = '17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE';

async function debug() {
  const values = await readSheetValues(SPREADSHEET_ID, "'DATE'!A1:P5");

  console.log('=== Raw rows 1-5 ===\n');
  for (let i = 0; i < values.length; i++) {
    console.log('Row ' + (i+1) + ':', JSON.stringify(values[i]));
  }

  console.log('\n=== Header detection test ===\n');
  for (let i = 0; i < values.length; i++) {
    const row = values[i] || [];
    const rowText = row.join(' ').toLowerCase();
    const hasItemId = rowText.includes('item_id');
    const hasScope = rowText.includes('scope');
    const hasCost = rowText.includes('cost');
    console.log('Row ' + (i+1) + ': item_id=' + hasItemId + ', scope=' + hasScope + ', cost=' + hasCost);
    console.log('  rowText: "' + rowText.substring(0, 80) + '..."');
  }

  // Simulate findColumnIndices on row 3
  console.log('\n=== findColumnIndices on Row 3 ===\n');
  const row3 = values[2] || [];
  const headers = row3.map(h => (h || '').toString().toLowerCase().trim());

  console.log('Headers array:', headers);

  headers.forEach((h, idx) => {
    const matches = [];
    if (h.includes('item_id') || h === 'item id' || h === 'itemid') matches.push('itemId');
    if (h.includes('unit') && h.includes('cost')) matches.push('unitCost');
    if (h === 'r' || h === 'r-value') matches.push('rValue');
    if (h === 'in' || h === 'thickness') matches.push('thickness');
    if (h === 'type' || h === 'material') matches.push('materialType');
    if (h.includes('scope') || h === 'description') matches.push('scope');
    if (h.includes('total') && h.includes('meas')) matches.push('totalMeasurements');
    if (h.includes('total') && h.includes('cost')) matches.push('totalCost');

    if (matches.length > 0) {
      console.log('Col ' + idx + ' "' + h + '" -> ' + matches.join(', '));
    }
  });
}

debug().catch(console.error);
