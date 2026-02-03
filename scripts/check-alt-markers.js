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

const { getFirstSheetName, readSheetValues } = require('../lib/google-sheets');

const TEMPLATE_ID = '1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4';

async function main() {
  console.log('=== MASTER TEMPLATE HEADERS ===\n');

  const sheetName = await getFirstSheetName(TEMPLATE_ID);
  console.log('Sheet name:', sheetName);

  const values = await readSheetValues(TEMPLATE_ID, "'" + sheetName + "'!A1:Z3");

  console.log('\nRow 3 (headers):');
  const headers = values[2] || [];
  headers.forEach((h, i) => {
    if (h) {
      const col = String.fromCharCode(65 + i);
      console.log('  Col ' + col + ': ' + h);
      // Check for ALT/BASE/BID markers
      const upper = h.toUpperCase();
      if (upper.includes('ALT') || upper.includes('BASE') || upper.includes('BID') || upper.includes('TYPE')) {
        console.log('    ^^^ MARKER FOUND');
      }
    }
  });

  console.log('\n=== TUESDAY 2 HEADERS ===\n');
  const t2Name = await getFirstSheetName('17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE');
  console.log('Sheet name:', t2Name);

  const t2 = await readSheetValues('17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE', "'" + t2Name + "'!A1:Z3");
  const t2Headers = t2[2] || [];
  t2Headers.forEach((h, i) => {
    if (h) {
      const col = String.fromCharCode(65 + i);
      console.log('  Col ' + col + ': ' + h);
    }
  });
}

main().catch(e => console.error(e.message));
