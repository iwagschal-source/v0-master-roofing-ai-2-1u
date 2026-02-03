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

const { readSheetValues, readSheetFormulas, getFirstSheetName } = require('../lib/google-sheets');

const SPREADSHEET_ID = '17SCbPSeoaGC3gEs7Y_mbMbQu4UYUldu0_hk3QsxrPVE';

function detectRowTypeFromFormula(formula, scopeValue, itemId) {
  const f = (formula || '').trim();
  const scope = (scopeValue || '').toUpperCase();

  if (/^=B(\d+)\*N\1$/i.test(f)) return 'ITEM';
  if (/^=SUM\(O\d+:O\d+\)$/i.test(f)) return 'BUNDLE_TOTAL';
  if (/BUNDLE\s*TOTAL/i.test(scope)) return 'BUNDLE_TOTAL';

  const oRefs = f.match(/O\d+/gi) || [];
  if (oRefs.length >= 5) return 'SECTION_TOTAL';

  return itemId ? 'ITEM' : 'UNKNOWN';
}

async function test() {
  const sheetName = await getFirstSheetName(SPREADSHEET_ID);
  console.log('Sheet:', sheetName);

  const [values, formulas] = await Promise.all([
    readSheetValues(SPREADSHEET_ID, "'" + sheetName + "'!A1:P60"),
    readSheetFormulas(SPREADSHEET_ID, "'" + sheetName + "'!A1:P60")
  ]);

  const headers = values[0];
  const colO = headers.findIndex(h => h && h.toLowerCase().includes('total') && h.toLowerCase().includes('cost'));
  const colC = headers.findIndex(h => h && (h.toLowerCase().includes('scope') || h.toLowerCase() === 'description'));
  const colA = 0;

  console.log('Columns: item_id=' + colA + ', scope=' + colC + ', totalCost=' + colO);
  console.log('\n--- Row Detection Results ---\n');

  let counts = { ITEM: 0, BUNDLE_TOTAL: 0, SECTION_TOTAL: 0, UNKNOWN: 0 };

  for (let i = 1; i < Math.min(values.length, 55); i++) {
    const row = values[i] || [];
    const formulaRow = formulas[i] || [];

    const itemId = row[colA] || '';
    const scope = row[colC] || '';
    const formula = formulaRow[colO] || '';

    const rowType = detectRowTypeFromFormula(formula, scope, itemId);
    counts[rowType] = (counts[rowType] || 0) + 1;

    if (scope || itemId || formula) {
      const shortScope = (scope + '').substring(0, 32).padEnd(32);
      const shortFormula = (formula + '').substring(0, 18).padEnd(18);
      console.log('Row ' + String(i+1).padStart(2) + ': ' + rowType.padEnd(14) + ' | ' + shortScope + ' | ' + shortFormula);
    }
  }

  console.log('\n--- Summary ---');
  console.log('ITEM:', counts.ITEM);
  console.log('BUNDLE_TOTAL:', counts.BUNDLE_TOTAL);
  console.log('SECTION_TOTAL:', counts.SECTION_TOTAL);
  console.log('UNKNOWN:', counts.UNKNOWN);
}

test().catch(console.error);
