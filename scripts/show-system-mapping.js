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
  // First list all datasets
  console.log('=== ALL DATASETS ===\n');
  try {
    const datasets = await runQuery(`
      SELECT schema_name
      FROM \`master-roofing-intelligence.INFORMATION_SCHEMA.SCHEMATA\`
    `, {}, { location: 'US' });
    datasets.forEach(d => console.log('  ' + d.schema_name));
  } catch (e) {
    console.log('Error listing datasets: ' + e.message);
  }

  // Try mr_agent without location
  console.log('\n=== TRYING mr_agent TABLES ===\n');
  try {
    const tables = await runQuery(`
      SELECT table_name
      FROM \`master-roofing-intelligence.mr_agent.INFORMATION_SCHEMA.TABLES\`
    `, {}, {});
    tables.forEach(t => console.log('  ' + t.table_name));
  } catch (e) {
    console.log('mr_agent not found: ' + e.message.substring(0, 100));
  }

  // Check mr_main for any system-related tables
  console.log('\n=== mr_main TABLES WITH "system" OR "lib" ===\n');
  const mainTables = await runQuery(`
    SELECT table_name
    FROM \`master-roofing-intelligence.mr_main.INFORMATION_SCHEMA.TABLES\`
    WHERE LOWER(table_name) LIKE '%system%'
       OR LOWER(table_name) LIKE '%lib%'
       OR LOWER(table_name) LIKE '%mapping%'
  `, {}, { location: 'US' });

  if (mainTables.length === 0) {
    console.log('  (none found)');
  } else {
    mainTables.forEach(t => console.log('  ' + t.table_name));
  }

  // Show all mr_main tables for reference
  console.log('\n=== ALL mr_main TABLES ===\n');
  const allTables = await runQuery(`
    SELECT table_name
    FROM \`master-roofing-intelligence.mr_main.INFORMATION_SCHEMA.TABLES\`
    ORDER BY table_name
  `, {}, { location: 'US' });
  allTables.forEach(t => console.log('  ' + t.table_name));
}

main().catch(e => console.error(e.message));
