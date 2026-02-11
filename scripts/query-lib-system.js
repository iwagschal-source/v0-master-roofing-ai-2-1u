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
  // 1. Schema
  console.log('=== lib_item_system_mapping SCHEMA ===\n');
  const schema = await runQuery(`
    SELECT column_name, data_type
    FROM \`master-roofing-intelligence.mr_agent.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'lib_item_system_mapping'
    ORDER BY ordinal_position
  `, {}, {});
  schema.forEach(c => console.log('  ' + c.column_name.padEnd(25) + c.data_type));

  // 2. All rows
  console.log('\n=== lib_item_system_mapping DATA ===\n');
  const rows = await runQuery(`
    SELECT * FROM \`master-roofing-intelligence.mr_agent.lib_item_system_mapping\`
    ORDER BY system_id, item_id
  `, {}, {});
  console.log('Total rows: ' + rows.length + '\n');
  rows.forEach((r, i) => console.log(String(i+1).padStart(3) + '. ' + JSON.stringify(r)));

  // 3. Also show lib_systems
  console.log('\n\n=== lib_systems SCHEMA ===\n');
  const sysSchema = await runQuery(`
    SELECT column_name, data_type
    FROM \`master-roofing-intelligence.mr_agent.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'lib_systems'
    ORDER BY ordinal_position
  `, {}, {});
  sysSchema.forEach(c => console.log('  ' + c.column_name.padEnd(25) + c.data_type));

  console.log('\n=== lib_systems DATA ===\n');
  const systems = await runQuery(`
    SELECT * FROM \`master-roofing-intelligence.mr_agent.lib_systems\`
    ORDER BY system_id
  `, {}, {});
  systems.forEach((r, i) => console.log(String(i+1).padStart(3) + '. ' + JSON.stringify(r)));
}

main().catch(e => console.error(e.message));
