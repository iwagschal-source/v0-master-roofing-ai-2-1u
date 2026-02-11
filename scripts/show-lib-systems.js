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
  const rows = await runQuery(`
    SELECT * FROM \`master-roofing-intelligence.mr_agent.lib_systems\`
    ORDER BY display_order
  `, {}, {});

  console.log('=== lib_systems FULL TABLE ===\n');
  console.log('Columns: ' + Object.keys(rows[0]).join(', '));
  console.log('Total rows: ' + rows.length);
  console.log('');

  rows.forEach((r, i) => {
    console.log('--- System ' + (i+1) + ': ' + r.system_id + ' ---');
    console.log('  system_code       : ' + r.system_code);
    console.log('  system_name       : ' + r.system_name);
    console.log('  system_name_short : ' + r.system_name_short);
    console.log('  manufacturer      : ' + r.manufacturer);
    console.log('  category          : ' + r.category);
    console.log('  subcategory       : ' + r.subcategory);
    console.log('  default_unit      : ' + r.default_unit);
    console.log('  show_r_value      : ' + r.show_r_value);
    console.log('  show_thickness    : ' + r.show_thickness);
    console.log('  display_order     : ' + r.display_order);
    console.log('  is_active         : ' + r.is_active);
    console.log('');
  });
}

main().catch(e => console.error(e.message));
