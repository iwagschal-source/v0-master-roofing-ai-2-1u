#!/usr/bin/env node
/**
 * Phase 0A Backup Script — Pre-Rebuild Baseline
 *
 * Tasks:
 * 0A.2: Copy template spreadsheet to backup
 * 0A.3: Export item_description_mapping to CSV
 * 0A.4: Export lib_takeoff_template to CSV
 * 0A.5: Export v_library_complete to CSV
 * 0A.6: Save CSVs to Backups/v2.0-pre-rebuild folder in Drive
 */

import { readFileSync } from 'fs';
import { createSign } from 'crypto';
import { resolve } from 'path';

// Load env vars from .env.local
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

// Also load .env.production for any missing vars
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

const TEMPLATE_ID = '1n0p_EWMwQSqhvBmjXJdy-QH5B7KlRXP5kDhn3Tdhfk4';
const ROOT_FOLDER_ID = process.env.KO_PROJECTS_ROOT_FOLDER_ID;

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY');
  }

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

  const sign = createSign('RSA-SHA256');
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
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await tokenResponse.json();
  return data.access_token;
}

async function createFolder(token, name, parentId) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    }),
  });
  if (!res.ok) throw new Error(`Failed to create folder: ${await res.text()}`);
  return (await res.json()).id;
}

async function findOrCreateBackupFolder(token) {
  // Check if Backups folder exists under root
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name='Backups' and '${ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
    )}&fields=files(id,name)`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const searchData = await searchRes.json();

  let backupsFolderId;
  if (searchData.files && searchData.files.length > 0) {
    backupsFolderId = searchData.files[0].id;
    console.log(`Found existing Backups folder: ${backupsFolderId}`);
  } else {
    backupsFolderId = await createFolder(token, 'Backups', ROOT_FOLDER_ID);
    console.log(`Created Backups folder: ${backupsFolderId}`);
  }

  // Create v2.0-pre-rebuild subfolder
  const subFolderId = await createFolder(token, 'v2.0-pre-rebuild', backupsFolderId);
  console.log(`Created v2.0-pre-rebuild folder: ${subFolderId}`);
  return subFolderId;
}

async function copyTemplate(token, backupFolderId) {
  console.log('\n--- 0A.2: Copying template spreadsheet ---');
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${TEMPLATE_ID}/copy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `BACKUP-template-v2.0-pre-rebuild-${new Date().toISOString().slice(0,10)}`,
      parents: [backupFolderId],
    }),
  });
  if (!res.ok) throw new Error(`Failed to copy template: ${await res.text()}`);
  const data = await res.json();
  console.log(`Template copied: ${data.id} (${data.name})`);
  return data.id;
}

async function uploadCSVToDrive(token, folderId, fileName, csvContent) {
  // Multipart upload
  const boundary = 'backup_boundary_123';
  const metadata = JSON.stringify({
    name: fileName,
    parents: [folderId],
    mimeType: 'text/csv',
  });

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/csv\r\n\r\n` +
    `${csvContent}\r\n` +
    `--${boundary}--`;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) throw new Error(`Failed to upload ${fileName}: ${await res.text()}`);
  const data = await res.json();
  console.log(`Uploaded ${fileName}: ${data.id}`);
  return data.id;
}

async function main() {
  console.log('=== Phase 0A: Pre-Rebuild Backup ===\n');

  // Get auth token
  const token = await getAccessToken();
  console.log('Auth token acquired.');

  // Create backup folder structure
  const backupFolderId = await findOrCreateBackupFolder(token);

  // 0A.2: Copy template
  await copyTemplate(token, backupFolderId);

  // 0A.3-0A.5: Export BigQuery tables via bq CLI
  console.log('\n--- 0A.3-0A.5: Exporting BigQuery tables ---');

  const tables = [
    { name: 'item_description_mapping', dataset: 'mr_main' },
    { name: 'lib_takeoff_template', dataset: 'mr_main' },
    { name: 'v_library_complete', dataset: 'mr_main' },
  ];

  const { execSync } = await import('child_process');

  for (const table of tables) {
    console.log(`\nExporting ${table.dataset}.${table.name}...`);

    // Export to local CSV first
    const localPath = `/tmp/${table.name}.csv`;
    try {
      execSync(
        `bq query --use_legacy_sql=false --format=csv --max_rows=10000 "SELECT * FROM ${table.dataset}.${table.name}" > ${localPath}`,
        { stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 50 * 1024 * 1024 }
      );

      const csvContent = readFileSync(localPath, 'utf-8');
      const lineCount = csvContent.split('\n').filter(l => l.trim()).length;
      console.log(`Exported ${lineCount} rows (including header)`);

      // Upload to Drive
      await uploadCSVToDrive(token, backupFolderId, `${table.name}.csv`, csvContent);
    } catch (err) {
      console.error(`Error exporting ${table.name}: ${err.message}`);
      // Try stderr for more info
      if (err.stderr) console.error(err.stderr.toString());
    }
  }

  console.log('\n=== Backup complete ===');
  console.log(`All files saved to Drive folder: v2.0-pre-rebuild (${backupFolderId})`);
}

main().catch(console.error);
