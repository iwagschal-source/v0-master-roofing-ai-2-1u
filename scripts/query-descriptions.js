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
  // 1. Get table schema
  console.log('=== TABLE SCHEMA ===\n');
  const schema = await runQuery(`
    SELECT column_name, data_type
    FROM \`master-roofing-intelligence.mr_main.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'item_description_mapping'
    ORDER BY ordinal_position
  `, {}, { location: 'US' });

  schema.forEach(col => {
    console.log('  ' + col.column_name.padEnd(25) + col.data_type);
  });

  // 2. Get sample rows with paragraph_description
  console.log('\n=== SAMPLE ROWS WITH DESCRIPTIONS ===\n');
  const samples = await runQuery(`
    SELECT item_id, scope_name, paragraph_description, bullet_points
    FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
    WHERE paragraph_description IS NOT NULL AND paragraph_description != ''
    LIMIT 5
  `, {}, { location: 'US' });

  samples.forEach((row, i) => {
    console.log('--- Item ' + (i+1) + ': ' + row.item_id + ' ---');
    console.log('Scope: ' + row.scope_name);
    console.log('Description: ' + (row.paragraph_description || '').substring(0, 200) + '...');
    console.log('Bullets: ' + (row.bullet_points || '(none)').substring(0, 100));
    console.log('');
  });

  // 3. Count stats
  console.log('=== STATS ===\n');
  const stats = await runQuery(`
    SELECT
      COUNT(*) as total,
      COUNTIF(paragraph_description IS NOT NULL AND paragraph_description != '') as with_description,
      COUNTIF(paragraph_description IS NULL OR paragraph_description = '') as without_description
    FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
  `, {}, { location: 'US' });

  console.log('Total items: ' + stats[0].total);
  console.log('With description: ' + stats[0].with_description);
  console.log('Without description: ' + stats[0].without_description);
}

main().catch(console.error);
