#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

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
  // item_master schema
  console.log('=== item_master SCHEMA ===\n');
  const schema = await runQuery(`
    SELECT column_name, data_type
    FROM \`master-roofing-intelligence.mr_main.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'item_master'
    ORDER BY ordinal_position
  `, {}, { location: 'US' });

  schema.forEach(c => {
    console.log('  ' + c.column_name.padEnd(25) + c.data_type);
  });

  // item_master sample
  console.log('\n=== item_master SAMPLE (3 rows) ===\n');
  const samples = await runQuery(`
    SELECT * FROM \`master-roofing-intelligence.mr_main.item_master\` LIMIT 3
  `, {}, { location: 'US' });

  samples.forEach((row, i) => {
    console.log('--- Row ' + (i+1) + ' ---');
    Object.entries(row).forEach(([key, val]) => {
      const displayVal = val === null ? '(null)' :
                        typeof val === 'string' && val.length > 80 ? val.substring(0, 80) + '...' :
                        val;
      console.log('  ' + key.padEnd(25) + ': ' + displayVal);
    });
    console.log('');
  });

  // Check proposal_line_item_descriptions
  console.log('\n=== proposal_line_item_descriptions SCHEMA ===\n');
  const pSchema = await runQuery(`
    SELECT column_name, data_type
    FROM \`master-roofing-intelligence.mr_main.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'proposal_line_item_descriptions'
    ORDER BY ordinal_position
  `, {}, { location: 'US' });

  pSchema.forEach(c => {
    console.log('  ' + c.column_name.padEnd(25) + c.data_type);
  });

  console.log('\n=== proposal_line_item_descriptions SAMPLE (3 rows) ===\n');
  const pSamples = await runQuery(`
    SELECT * FROM \`master-roofing-intelligence.mr_main.proposal_line_item_descriptions\` LIMIT 3
  `, {}, { location: 'US' });

  pSamples.forEach((row, i) => {
    console.log('--- Row ' + (i+1) + ' ---');
    Object.entries(row).forEach(([key, val]) => {
      const displayVal = val === null ? '(null)' :
                        typeof val === 'string' && val.length > 100 ? val.substring(0, 100) + '...' :
                        val;
      console.log('  ' + key.padEnd(25) + ': ' + displayVal);
    });
    console.log('');
  });
}

main().catch(e => console.error(e.message));
