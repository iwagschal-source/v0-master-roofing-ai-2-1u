#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { BigQuery } = require('@google-cloud/bigquery');

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
    // Extract the key, handling quotes and \n
    const match = line.match(/GOOGLE_PRIVATE_KEY="(.+)"/s);
    if (match) {
      privateKey = match[1].replace(/\\n/g, '\n');
    }
  }
}

console.log('Email:', email);
console.log('Key length:', privateKey.length);

const bq = new BigQuery({
  projectId: 'master-roofing-intelligence',
  credentials: { client_email: email, private_key: privateKey }
});

async function run() {
  const [rows] = await bq.query({
    query: `SELECT id, project_name, takeoff_spreadsheet_id
            FROM \`master-roofing-intelligence.mr_main.project_folders\`
            WHERE LOWER(project_name) LIKE '%tuesday%'
            ORDER BY created_at DESC
            LIMIT 5`,
    location: 'US'
  });
  console.log('\nTuesday projects:');
  console.log(JSON.stringify(rows, null, 2));
}

run().catch(e => console.error('Error:', e.message));
