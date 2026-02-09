#!/usr/bin/env node
/**
 * Dump template formulas and values for BTX column boundary bug analysis.
 * Reads both the TEMPLATE and a live project sheet to compare layouts.
 */

const crypto = require('crypto');
const fs = require('fs');

const TEMPLATE_ID = '1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4';
const IMPERSONATE_USER = 'rfp@masterroofingus.com';

// Load credentials
const creds = JSON.parse(fs.readFileSync('/home/iwagschal/.gcp/workspace-ingest.json', 'utf8'));
const email = creds.client_email;
const privateKey = creds.private_key;

async function getAccessToken() {
  const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: email,
    sub: IMPERSONATE_USER,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');
  const jwt = `${signatureInput}.${signature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Auth failed: ${await tokenResponse.text()}`);
  }
  return (await tokenResponse.json()).access_token;
}

async function readSheet(accessToken, spreadsheetId, range, renderOption) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=${renderOption}`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Sheet read failed (${range}): ${await res.text()}`);
  return (await res.json()).values || [];
}

async function getSheetNames(accessToken, spreadsheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Metadata failed: ${await res.text()}`);
  const data = await res.json();
  return data.sheets.map(s => s.properties.title);
}

function colLetter(idx) {
  return idx < 26 ? String.fromCharCode(65 + idx) : String.fromCharCode(64 + Math.floor(idx / 26)) + String.fromCharCode(65 + (idx % 26));
}

function printRow(rowNum, values, formulas, maxCol) {
  const max = Math.max(values?.length || 0, formulas?.length || 0, maxCol || 0);
  const parts = [];
  for (let c = 0; c < max; c++) {
    const v = values?.[c] ?? '';
    const f = formulas?.[c] ?? '';
    const col = colLetter(c);
    if (v === '' && f === '') continue;
    if (f !== '' && f !== v && f.toString().startsWith('=')) {
      parts.push(`  ${col}: value="${v}" formula=${f}`);
    } else {
      parts.push(`  ${col}: "${v}"`);
    }
  }
  console.log(`Row ${rowNum}:`);
  parts.forEach(p => console.log(p));
}

async function dumpSheet(accessToken, spreadsheetId, label) {
  console.log('\n' + '='.repeat(80));
  console.log(`  ${label}`);
  console.log(`  Spreadsheet ID: ${spreadsheetId}`);
  console.log('='.repeat(80));

  const sheetNames = await getSheetNames(accessToken, spreadsheetId);
  const sheetName = sheetNames[0];
  console.log(`Sheet tab: "${sheetName}"`);
  console.log(`All tabs: ${sheetNames.join(', ')}`);

  // Read A1:Q80 in both modes
  const range = `'${sheetName}'!A1:Q80`;
  const [values, formulas] = await Promise.all([
    readSheet(accessToken, spreadsheetId, range, 'FORMATTED_VALUE'),
    readSheet(accessToken, spreadsheetId, range, 'FORMULA'),
  ]);

  console.log(`\nTotal rows returned: ${values.length}`);
  console.log(`Max columns in any row: ${Math.max(...values.map(r => r?.length || 0))}`);

  // === SECTION 1: Header row (row 3) ===
  console.log('\n--- ROW 3 (Header) ---');
  printRow(3, values[2], formulas[2], 17);

  // === SECTION 2: Rows 4-10 (first data rows + first bundle total) ===
  console.log('\n--- ROWS 4-10 (First data rows) ---');
  for (let i = 3; i <= 9 && i < values.length; i++) {
    printRow(i + 1, values[i], formulas[i], 17);
    console.log('');
  }

  // === SECTION 3: Find all BUNDLE TOTAL / SECTION TOTAL / TOTAL rows ===
  console.log('\n--- ALL TOTAL/BUNDLE ROWS ---');
  for (let i = 0; i < values.length; i++) {
    const row = values[i] || [];
    const fRow = formulas[i] || [];
    const rowText = row.join('|').toUpperCase();

    // Check for totals in any column
    const hasSumFormula = fRow.some(c => c?.toString().startsWith('=SUM'));
    const isBundleTotal = rowText.includes('BUNDLE') || rowText.includes('TOTAL');

    if (hasSumFormula || isBundleTotal) {
      printRow(i + 1, row, fRow, 17);
      console.log('');
    }
  }

  // === SECTION 4: Section headers (rows 45, 54) ===
  console.log('\n--- SECTION HEADERS (rows 44-46, 53-56) ---');
  for (const r of [43, 44, 45, 52, 53, 54, 55]) {
    if (r < values.length) {
      printRow(r + 1, values[r], formulas[r], 17);
      console.log('');
    }
  }

  // === SECTION 5: Column layout summary ===
  console.log('\n--- COLUMN LAYOUT SUMMARY (from Row 3 headers) ---');
  const headerRow = values[2] || [];
  for (let c = 0; c < headerRow.length; c++) {
    console.log(`  ${colLetter(c)} (index ${c}): "${headerRow[c] || '(empty)'}"`);
  }

  return { sheetName, values, formulas };
}

async function lookupSundaySheet(accessToken) {
  // Load env for BigQuery
  const envPath = '/home/iwagschal/v0-master-roofing-ai-2-1u/.env.local';
  let bqProjectId = 'master-roofing-intelligence';

  // Try reading from BigQuery via REST API with the same service account
  // Actually, let's just search for it via Sheets API - search Drive for "SUNDAY" or "V5"
  const searchQuery = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and name contains 'Takeoff' and name contains 'SUNDAY'");
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${searchQuery}&pageSize=5&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`;

  const searchRes = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      console.log('\n\nFound SUNDAY sheets:');
      data.files.forEach(f => console.log(`  ${f.name} → ${f.id} (${f.modifiedTime})`));
      return data.files[0].id;
    }
  }

  // Also search for "V5"
  const searchQuery2 = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and name contains 'V5'");
  const searchRes2 = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQuery2}&pageSize=5&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (searchRes2.ok) {
    const data2 = await searchRes2.json();
    if (data2.files && data2.files.length > 0) {
      console.log('\nFound V5 sheets:');
      data2.files.forEach(f => console.log(`  ${f.name} → ${f.id} (${f.modifiedTime})`));
      return data2.files[0].id;
    }
  }

  // Search for Monday 09 (multi-section test project)
  const searchQuery3 = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and name contains 'Monday'");
  const searchRes3 = await fetch(`https://www.googleapis.com/drive/v3/files?q=${searchQuery3}&pageSize=5&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (searchRes3.ok) {
    const data3 = await searchRes3.json();
    if (data3.files && data3.files.length > 0) {
      console.log('\nFound Monday sheets:');
      data3.files.forEach(f => console.log(`  ${f.name} → ${f.id} (${f.modifiedTime})`));
      return data3.files[0].id;
    }
  }

  return null;
}

async function main() {
  console.log('Getting access token...');
  const accessToken = await getAccessToken();
  console.log('Authenticated.');

  // 1. Dump the TEMPLATE
  await dumpSheet(accessToken, TEMPLATE_ID, 'TAKEOFF TEMPLATE (source of truth for new sheets)');

  // 2. Find and dump a live project sheet
  const liveSheetId = await lookupSundaySheet(accessToken);
  if (liveSheetId) {
    await dumpSheet(accessToken, liveSheetId, 'LIVE PROJECT SHEET (test project)');
  } else {
    console.log('\n\nCould not find SUNDAY/V5/Monday test sheet via Drive search.');
  }
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
