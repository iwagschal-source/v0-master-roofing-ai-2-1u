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

const { runQuery } = require('../lib/bigquery');

async function main() {
  console.log('=== SAMPLE ROWS WITH DESCRIPTIONS ===\n');
  const rows = await runQuery(`
    SELECT item_id, scope_name, section, paragraph_description, description_status, bundling_notes
    FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
    WHERE paragraph_description IS NOT NULL AND paragraph_description != ''
    LIMIT 5
  `, {}, { location: 'US' });

  rows.forEach((r, i) => {
    console.log('--- ' + r.item_id + ' (' + r.section + ') ---');
    console.log('Scope: ' + r.scope_name);
    console.log('Status: ' + r.description_status);
    console.log('Bundling: ' + (r.bundling_notes || '(none)'));
    console.log('Desc: ' + (r.paragraph_description || '').substring(0, 300) + '...');
    console.log('');
  });

  console.log('=== STATS ===');
  const stats = await runQuery(`
    SELECT
      COUNT(*) as total,
      COUNTIF(paragraph_description IS NOT NULL AND paragraph_description != '') as with_desc,
      COUNTIF(paragraph_description IS NULL OR paragraph_description = '') as without_desc
    FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
  `, {}, { location: 'US' });

  console.log('Total: ' + stats[0].total);
  console.log('With description: ' + stats[0].with_desc);
  console.log('Without: ' + stats[0].without_desc);
}

main().catch(e => console.error(e.message));
