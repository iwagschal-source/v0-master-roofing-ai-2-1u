#!/usr/bin/env node
/**
 * Sync implementation_tracker from BigQuery → existing Google Sheet
 * Target sheet: 1nku5_kxXzdSPyVi1HnYNzj33bk2e8pr5Qbf9pi6SWc8
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
  const prodContent = readFileSync(resolve(import.meta.dirname, '..', '.env.production'), 'utf-8');
  for (const line of prodContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch (e) { /* ignore */ }

const SPREADSHEET_ID = '1nku5_kxXzdSPyVi1HnYNzj33bk2e8pr5Qbf9pi6SWc8';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: email, sub: 'rfp@masterroofingus.com',
    scope: SCOPES.join(' '),
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
  console.log('Auth acquired');

  // Query BigQuery
  const bqResult = execSync(
    'bq query --use_legacy_sql=false --format=json --max_rows=300 "SELECT phase, task_id, description, file_affected, task_type, status, verified, session_completed, notes, branch FROM mr_main.implementation_tracker ORDER BY phase, task_id"',
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
  );
  const tasks = JSON.parse(bqResult);
  console.log(`Got ${tasks.length} tasks from BigQuery`);

  // Build rows
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

  // Clear existing data
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Tracker!A1:J300:clear`,
    { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' }
  );
  if (!clearRes.ok) throw new Error(`Clear failed: ${await clearRes.text()}`);

  // Write updated data
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Tracker!A1?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range: 'Tracker!A1', majorDimension: 'ROWS', values: rows }),
    }
  );
  if (!updateRes.ok) throw new Error(`Update failed: ${await updateRes.text()}`);
  console.log(`Wrote ${rows.length} rows to sheet (including header)`);
  console.log('Done! Sheet synced from BigQuery.');
}

main().catch(console.error);
