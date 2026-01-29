import { createSign } from 'crypto';
import { readFileSync } from 'fs';

const creds = JSON.parse(readFileSync('/home/iwagschal/.gcp/workspace-ingest.json', 'utf8'));

async function main() {
  const email = creds.client_email;
  const privateKey = creds.private_key;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: email, sub: 'rfp@masterroofingus.com', scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = encodedHeader + '.' + encodedPayload;
  const sign = createSign('RSA-SHA256');
  sign.update(signatureInput);
  const signature = sign.sign(privateKey, 'base64url');
  const jwt = signatureInput + '.' + signature;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const t = await tokenResponse.json();
  if (!t.access_token) { console.log('Token error:', t); return; }

  const sheetId = '19HFxoNqMeuhZAwBzwJ40B9-7LNkO6DTagHxdZ4y-HCw';

  // Get metadata first
  const metaResp = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + sheetId + '?fields=sheets.properties', {
    headers: { 'Authorization': 'Bearer ' + t.access_token }
  });
  const meta = await metaResp.json();
  console.log('Tabs available:');
  meta.sheets?.forEach(s => console.log('  - ' + s.properties.title + ' (gid: ' + s.properties.sheetId + ')'));

  // Read SESSION_HISTORY (gid 1037458220)
  const targetTab = meta.sheets?.find(s => s.properties.sheetId === 1037458220);
  const tabName = targetTab?.properties?.title || 'SESSION_HISTORY';
  console.log('\nReading tab:', tabName);

  // Read that tab
  const range = encodeURIComponent(tabName + '!A:Z');
  const resp = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + sheetId + '/values/' + range, {
    headers: { 'Authorization': 'Bearer ' + t.access_token }
  });
  const data = await resp.json();

  if (data.error) { console.log('Error:', data.error); return; }

  console.log('\n=== SHEET CONTENT ===\n');
  data.values?.forEach((row, i) => {
    console.log('Row ' + (i+1) + ': ' + row.join(' | '));
  });
}
main();
