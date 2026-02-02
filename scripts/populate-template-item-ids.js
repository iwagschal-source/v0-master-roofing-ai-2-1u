#!/usr/bin/env node
/**
 * Populate Column A of Master Template with item_ids
 *
 * This script populates:
 * 1. A45 and A54 with "item_id" section headers
 * 2. Rows 4-72 with item_ids from the BigQuery item_description_mapping
 *
 * Template ID: 1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4
 * Sheet Name: DATE
 *
 * Requires environment variables:
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL
 * - GOOGLE_PRIVATE_KEY
 *
 * Usage: node scripts/populate-template-item-ids.js [--dry-run] [--verify]
 */

const crypto = require('crypto');

// Try to load environment variables from .env.local if dotenv is available
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenv not installed, assume env vars are already set
}

// Configuration
const TEMPLATE_ID = '1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4';
const SHEET_NAME = 'DATE';

// Row → item_id mapping from SESSION_STATE.md comparison table
// 51 line items + 2 section headers (A45, A54)
const ROW_TO_ITEM_ID = {
  // ROOFING SECTION (header already has "item_id (NEW)" in A3)
  4: 'MR-001VB',
  5: 'MR-002PITCH',
  6: 'MR-003BU2PLY',
  7: 'MR-004UO',
  8: 'MR-005SCUPPER',
  // 9: BUNDLE TOTAL - skip
  10: 'MR-006IRMA',
  11: 'MR-007PMMA',
  12: 'MR-008PMMA',
  13: 'MR-009UOPMMA',
  // 14: BUNDLE TOTAL - skip
  15: 'MR-010DRAIN',
  16: 'MR-011DOORSTD',
  17: 'MR-012DOORLG',
  // 18: BUNDLE TOTAL - skip
  19: 'MR-013HATCHSF',
  20: 'MR-014HATCHLF',
  21: 'MR-015PAD',
  22: 'MR-016FENCE',
  23: 'MR-017RAIL',
  24: 'MR-018PLUMB',
  25: 'MR-019MECH',
  26: 'MR-020DAVIT',
  27: 'MR-021AC',
  // 28: BUNDLE TOTAL - skip
  29: 'MR-022COPELO',
  30: 'MR-023COPEHI',
  31: 'MR-024INSUCOPE',
  // 32: BUNDLE TOTAL - skip
  33: 'MR-025FLASHBLDG',
  34: 'MR-026FLASHPAR',
  // 35: BUNDLE TOTAL - skip
  36: 'MR-027OBIRMA',
  37: 'MR-028PAVER',
  38: 'MR-029FLASHPAV',
  // 39: BUNDLE TOTAL - skip
  40: 'MR-030GREEN',
  41: 'MR-031FLASHGRN',
  // 42: BUNDLE TOTAL - skip
  43: 'MR-032RECESSWP',
  // 44: empty/section break

  // BALCONIES SECTION
  45: 'item_id',  // Section header
  46: 'MR-033TRAFFIC',
  47: 'MR-034DRIP',
  48: 'MR-035LFLASH',
  // 49: BUNDLE TOTAL - skip
  50: 'MR-036DOORBAL',
  // 51-53: BUNDLE TOTAL or empty

  // EXTERIOR SECTION
  54: 'item_id',  // Section header
  55: 'MR-037BRICKWP',
  56: 'MR-038OPNBRKEA',
  57: 'MR-039OPNBRKLF',
  // 58: BUNDLE TOTAL - skip
  59: 'MR-040PANELWP',
  60: 'MR-041OPNPNLEA',
  61: 'MR-042OPNPNLLF',
  // 62: BUNDLE TOTAL - skip
  63: 'MR-043EIFS',
  64: 'MR-044OPNSTCEA',
  65: 'MR-045OPNSTCLF',
  66: 'MR-046STUCCO',
  // 67: BUNDLE TOTAL - skip
  68: 'MR-047DRIPCAP',
  69: 'MR-048SILL',
  70: 'MR-049TIEIN',
  71: 'MR-050ADJHORZ',
  72: 'MR-051ADJVERT',
};

/**
 * Get access token using service account credentials
 * (Same pattern as lib/google-sheets.js)
 */
async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error(
      'Missing credentials. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.\n' +
      'You can load them from .env.local by running: source .env.local'
    );
  }

  // Create JWT for service account auth
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };
  const claims = {
    iss: email,
    sub: email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive'
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signatureInput = `${headerB64}.${claimsB64}`;

  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');
  const jwt = `${signatureInput}.${signature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function verifyCurrentState(accessToken) {
  console.log('Checking current state of Column A...');
  console.log('');

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}/values/${encodeURIComponent(`'${SHEET_NAME}'!A3:A72`)}`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to read template: ${error}`);
  }

  const data = await response.json();
  const values = data.values || [];

  let emptyCount = 0;
  let populatedCount = 0;
  let mismatchCount = 0;

  for (const [rowStr, expectedId] of Object.entries(ROW_TO_ITEM_ID)) {
    const row = parseInt(rowStr);
    const idx = row - 3;  // Row 3 is index 0
    const value = values[idx]?.[0] || '';

    if (value) {
      populatedCount++;
      if (value !== expectedId && value !== 'item_id (NEW)') {
        mismatchCount++;
        console.log(`  Row ${row}: "${value}" (expected: "${expectedId}")`);
      }
    } else {
      emptyCount++;
    }
  }

  console.log(`Current state: ${populatedCount} populated, ${emptyCount} empty, ${mismatchCount} mismatched`);
  console.log(`Target: ${Object.keys(ROW_TO_ITEM_ID).length} cells`);
  console.log('');

  return emptyCount;
}

async function populateTemplateColumnA(accessToken, dryRun = false) {
  console.log('='.repeat(60));
  console.log('Populate Template Column A with item_ids');
  console.log('='.repeat(60));
  console.log(`Template ID: ${TEMPLATE_ID}`);
  console.log(`Sheet Name: ${SHEET_NAME}`);
  console.log(`Dry Run: ${dryRun}`);
  console.log('');

  // Build batch update data
  const data = [];

  for (const [row, itemId] of Object.entries(ROW_TO_ITEM_ID)) {
    data.push({
      range: `'${SHEET_NAME}'!A${row}`,
      values: [[itemId]]
    });
  }

  console.log(`Preparing ${data.length} cell updates:`);
  console.log('');

  // Group by section for display
  const roofingRows = Object.entries(ROW_TO_ITEM_ID).filter(([r]) => parseInt(r) <= 43);
  const balconyRows = Object.entries(ROW_TO_ITEM_ID).filter(([r]) => parseInt(r) >= 45 && parseInt(r) <= 53);
  const exteriorRows = Object.entries(ROW_TO_ITEM_ID).filter(([r]) => parseInt(r) >= 54);

  console.log('ROOFING SECTION (rows 4-43):');
  roofingRows.forEach(([row, id]) => console.log(`  A${row}: ${id}`));
  console.log(`  Total: ${roofingRows.length} cells`);
  console.log('');

  console.log('BALCONIES SECTION (rows 45-53):');
  balconyRows.forEach(([row, id]) => console.log(`  A${row}: ${id}`));
  console.log(`  Total: ${balconyRows.length} cells`);
  console.log('');

  console.log('EXTERIOR SECTION (rows 54-72):');
  exteriorRows.forEach(([row, id]) => console.log(`  A${row}: ${id}`));
  console.log(`  Total: ${exteriorRows.length} cells`);
  console.log('');

  if (dryRun) {
    console.log('DRY RUN - No changes made to the template.');
    console.log('Run without --dry-run to apply changes.');
    return;
  }

  // Execute batch update
  console.log('Executing batch update...');

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${TEMPLATE_ID}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'RAW',
        data: data
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update template: ${error}`);
  }

  const result = await response.json();

  console.log('');
  console.log('SUCCESS!');
  console.log(`Total cells updated: ${result.totalUpdatedCells}`);
  console.log(`Total rows updated: ${result.totalUpdatedRows}`);
  console.log('');
  console.log('Verification URL:');
  console.log(`https://docs.google.com/spreadsheets/d/${TEMPLATE_ID}/edit`);
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const verifyOnly = args.includes('--verify');

  try {
    console.log('Authenticating with Google Sheets API...');
    const accessToken = await getAccessToken();
    console.log('Authentication successful.');
    console.log('');

    // Always verify first
    const emptyCount = await verifyCurrentState(accessToken);

    if (verifyOnly) {
      return;
    }

    if (emptyCount === 0) {
      console.log('All target cells are already populated. Nothing to do.');
      return;
    }

    await populateTemplateColumnA(accessToken, dryRun);

  } catch (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
}

main();
