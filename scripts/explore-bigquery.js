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
  // 1. List all tables
  console.log('=== ALL TABLES IN mr_main ===\n');
  const tables = await runQuery(`
    SELECT table_name
    FROM \`master-roofing-intelligence.mr_main.INFORMATION_SCHEMA.TABLES\`
    ORDER BY table_name
  `, {}, { location: 'US' });

  tables.forEach(t => {
    console.log('  ' + t.table_name);
  });

  // 2. item_description_mapping schema
  console.log('\n\n=== item_description_mapping SCHEMA ===\n');
  const schema = await runQuery(`
    SELECT column_name, data_type, is_nullable
    FROM \`master-roofing-intelligence.mr_main.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'item_description_mapping'
    ORDER BY ordinal_position
  `, {}, { location: 'US' });

  schema.forEach(c => {
    console.log('  ' + c.column_name.padEnd(25) + c.data_type.padEnd(15) + (c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'));
  });

  // 3. item_description_mapping sample data
  console.log('\n\n=== item_description_mapping SAMPLE (5 rows) ===\n');
  const samples = await runQuery(`
    SELECT *
    FROM \`master-roofing-intelligence.mr_main.item_description_mapping\`
    LIMIT 5
  `, {}, { location: 'US' });

  samples.forEach((row, i) => {
    console.log('--- Row ' + (i+1) + ' ---');
    Object.entries(row).forEach(([key, val]) => {
      const displayVal = val === null ? '(null)' :
                        typeof val === 'string' && val.length > 100 ? val.substring(0, 100) + '...' :
                        val;
      console.log('  ' + key.padEnd(25) + ': ' + displayVal);
    });
    console.log('');
  });

  // 4. Look for system/lib tables
  console.log('\n=== TABLES WITH "system" OR "lib" IN NAME ===\n');
  const systemTables = tables.filter(t =>
    t.table_name.toLowerCase().includes('system') ||
    t.table_name.toLowerCase().includes('lib') ||
    t.table_name.toLowerCase().includes('library')
  );

  if (systemTables.length === 0) {
    console.log('  (none found)');
  } else {
    for (const t of systemTables) {
      console.log('--- ' + t.table_name + ' ---');
      const tSchema = await runQuery(`
        SELECT column_name, data_type
        FROM \`master-roofing-intelligence.mr_main.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = '${t.table_name}'
        ORDER BY ordinal_position
      `, {}, { location: 'US' });

      console.log('Schema:');
      tSchema.forEach(c => console.log('  ' + c.column_name.padEnd(25) + c.data_type));

      const tSamples = await runQuery(`
        SELECT * FROM \`master-roofing-intelligence.mr_main.${t.table_name}\` LIMIT 3
      `, {}, { location: 'US' });

      console.log('Sample rows:');
      tSamples.forEach((row, i) => {
        console.log('  Row ' + (i+1) + ': ' + JSON.stringify(row).substring(0, 250));
      });
      console.log('');
    }
  }
}

main().catch(e => console.error(e.message));
