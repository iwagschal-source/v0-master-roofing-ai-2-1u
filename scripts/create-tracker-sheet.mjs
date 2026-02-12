#!/usr/bin/env node
/**
 * Phase 9.3: Create Google Sheet view of implementation_tracker
 * Populates sheet with all tracker data and shares with Isaac
 */

import { readFileSync } from 'fs';
import { createSign } from 'crypto';
import { execSync } from 'child_process';
import { resolve } from 'path';

// Load env vars
const envPath = resolve(import.meta.dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const val = match[2].trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}
try {
  const prodEnvPath = resolve(import.meta.dirname, '..', '.env.production');
  const prodContent = readFileSync(prodEnvPath, 'utf-8');
  for (const line of prodContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch (e) { /* ignore */ }

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
];
const IMPERSONATE_USER = 'rfp@masterroofingus.com';
const ROOT_FOLDER_ID = process.env.KO_PROJECTS_ROOT_FOLDER_ID;

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: email, sub: IMPERSONATE_USER, scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');
  const jwt = `${signatureInput}.${signature}`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  if (!tokenResponse.ok) throw new Error(`Token error: ${await tokenResponse.text()}`);
  return (await tokenResponse.json()).access_token;
}

async function main() {
  const token = await getAccessToken();
  console.log('Auth token acquired.');

  // 1. Create spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      properties: { title: 'KO Platform — Implementation Tracker' },
      sheets: [{
        properties: {
          title: 'Tracker',
          gridProperties: { frozenRowCount: 1, frozenColumnCount: 2 },
        },
      }],
    }),
  });
  if (!createRes.ok) throw new Error(`Create sheet failed: ${await createRes.text()}`);
  const sheet = await createRes.json();
  const spreadsheetId = sheet.spreadsheetId;
  console.log(`Created spreadsheet: ${spreadsheetId}`);

  // 2. Move to root folder
  await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}?addParents=${ROOT_FOLDER_ID}&fields=id`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  console.log('Moved to KO Projects folder.');

  // 3. Query BigQuery for all tasks
  console.log('Querying tracker data from BigQuery...');
  const bqResult = execSync(
    'bq query --use_legacy_sql=false --format=json --max_rows=300 "SELECT phase, task_id, description, file_affected, task_type, status, verified, session_completed, notes, branch FROM mr_main.implementation_tracker ORDER BY phase, task_id"',
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
  );
  const tasks = JSON.parse(bqResult);
  console.log(`Got ${tasks.length} tasks from BigQuery.`);

  // 4. Build data rows
  const headers = ['Phase', 'Task ID', 'Description', 'File Affected', 'Task Type', 'Status', 'Verified', 'Session Completed', 'Notes', 'Branch'];
  const rows = [headers];
  for (const t of tasks) {
    rows.push([
      t.phase || '',
      t.task_id || '',
      t.description || '',
      t.file_affected || '',
      t.task_type || '',
      t.status || 'NOT_STARTED',
      t.verified === true || t.verified === 'true' ? 'YES' : 'NO',
      t.session_completed || '',
      t.notes || '',
      t.branch || 'main',
    ]);
  }

  // 5. Write data to sheet
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Tracker!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: 'Tracker!A1', majorDimension: 'ROWS', values: rows }),
    }
  );
  if (!updateRes.ok) throw new Error(`Update failed: ${await updateRes.text()}`);
  console.log(`Wrote ${rows.length} rows (including header).`);

  // 6. Format header row + conditional formatting for status
  const sheetId = sheet.sheets[0].properties.sheetId;
  const formatRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          // Bold header row
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)',
            },
          },
          // Header text color white
          {
            repeatCell: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                },
              },
              fields: 'userEnteredFormat(textFormat)',
            },
          },
          // Auto-resize columns
          { autoResizeDimensions: { dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 10 } } },
          // Conditional format: DONE = green
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 5, endColumnIndex: 6 }],
                booleanRule: {
                  condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'DONE' }] },
                  format: { backgroundColor: { red: 0.7, green: 0.93, blue: 0.7 } },
                },
              },
              index: 0,
            },
          },
          // Conditional format: IN_PROGRESS = yellow
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 5, endColumnIndex: 6 }],
                booleanRule: {
                  condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'IN_PROGRESS' }] },
                  format: { backgroundColor: { red: 1, green: 0.95, blue: 0.6 } },
                },
              },
              index: 1,
            },
          },
          // Conditional format: BLOCKED = red
          {
            addConditionalFormatRule: {
              rule: {
                ranges: [{ sheetId, startRowIndex: 1, startColumnIndex: 5, endColumnIndex: 6 }],
                booleanRule: {
                  condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'BLOCKED' }] },
                  format: { backgroundColor: { red: 1, green: 0.7, blue: 0.7 } },
                },
              },
              index: 2,
            },
          },
          // Status dropdown validation
          {
            setDataValidation: {
              range: { sheetId, startRowIndex: 1, endRowIndex: rows.length, startColumnIndex: 5, endColumnIndex: 6 },
              rule: {
                condition: {
                  type: 'ONE_OF_LIST',
                  values: [
                    { userEnteredValue: 'NOT_STARTED' },
                    { userEnteredValue: 'IN_PROGRESS' },
                    { userEnteredValue: 'DONE' },
                    { userEnteredValue: 'BLOCKED' },
                    { userEnteredValue: 'SKIPPED' },
                  ],
                },
                strict: true,
                showCustomUi: true,
              },
            },
          },
        ],
      }),
    }
  );
  if (!formatRes.ok) throw new Error(`Format failed: ${await formatRes.text()}`);
  console.log('Applied formatting and validation.');

  // 7. Share with Isaac
  const shareRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'user',
        role: 'writer',
        emailAddress: 'iwagschal@masterroofingus.com',
      }),
    }
  );
  if (!shareRes.ok) {
    console.warn(`Share warning: ${await shareRes.text()}`);
  } else {
    console.log('Shared with iwagschal@masterroofingus.com (writer).');
  }

  console.log(`\n=== Done ===`);
  console.log(`Spreadsheet ID: ${spreadsheetId}`);
  console.log(`URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
}

main().catch(console.error);
