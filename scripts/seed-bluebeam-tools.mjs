#!/usr/bin/env node
/**
 * Seed bluebeam_tools BigQuery table with 75 tools from teju_tools_full.json
 * merged with item_id mappings from Python backend.
 *
 * Usage: node scripts/seed-bluebeam-tools.mjs
 */

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://136.111.252.120:8000'

function bqStr(v) {
  if (v === null || v === undefined || v === '') return 'NULL'
  // Escape single quotes for BigQuery
  return "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'"
}

function bqNum(v) {
  if (v === null || v === undefined) return 'NULL'
  return String(v)
}

function bqBool(v) {
  return v ? 'TRUE' : 'FALSE'
}

async function main() {
  // Load teju tools
  const teju = JSON.parse(readFileSync('/home/iwagschal/teju_tools_full.json', 'utf8'))
  console.log(`Loaded ${teju.length} tools from teju_tools_full.json`)

  // Fetch backend mappings
  const res = await fetch(`${BACKEND_URL}/bluebeam/tools`)
  const backend = await res.json()
  console.log(`Fetched ${backend.length} tool mappings from Python backend`)

  // Build mapping lookup
  const backendMap = {}
  for (const b of backend) {
    const key = (b.teju_subject || '').trim().toLowerCase()
    if (key) backendMap[key] = b
  }

  // Build rows
  const valueRows = teju.map((t) => {
    const subj = (t.subject || '').trim()
    const key = subj.toLowerCase()
    const b = backendMap[key] || {}

    const vals = [
      t.index,
      bqStr(subj),
      bqStr(t.label || null),
      bqStr(t.label_status || null),
      bqStr(t.layer || null),
      bqStr(t.type || null),
      bqStr(t.type_internal || null),
      bqStr(t.unit || null),
      bqStr(t.visual_template || null),
      bqStr(t.border_color_hex || null),
      bqStr(t.border_color_rgb || null),
      bqStr(t.fill_color_hex || null),
      bqStr(t.fill_color_rgb || null),
      bqNum(t.fill_opacity),
      bqNum(t.line_width),
      bqStr(t.line_style || null),
      bqNum(t.line_opacity),
      bqStr(t.column_data || null),
      bqStr(b.item_id || null),
      bqStr(b.scope_name || null),
      bqBool(b.is_mapped),
      bqBool(b.is_specialty),
      'CURRENT_TIMESTAMP()',
      'CURRENT_TIMESTAMP()',
      bqStr('session-44-seed'),
    ]
    return '(' + vals.join(', ') + ')'
  })

  const sql = `INSERT INTO \`master-roofing-intelligence.mr_main.bluebeam_tools\`
(tool_id, subject, label, label_status, layer, type, type_internal, unit, visual_template,
border_color_hex, border_color_rgb, fill_color_hex, fill_color_rgb,
fill_opacity, line_width, line_style, line_opacity, column_data,
item_id, scope_name, is_mapped, is_specialty, created_at, updated_at, created_by)
VALUES
${valueRows.join(',\n')}
`

  // Write to file
  writeFileSync('/tmp/seed_bluebeam_tools.sql', sql)
  console.log(`Written ${valueRows.length} rows to /tmp/seed_bluebeam_tools.sql (${sql.length} chars)`)

  // Execute via bq CLI using --flagfile approach
  try {
    const result = execSync(
      `bq query --use_legacy_sql=false --flagfile=/dev/null < /tmp/seed_bluebeam_tools.sql`,
      { encoding: 'utf8', timeout: 30000, shell: '/bin/bash' }
    )
    console.log(result)
  } catch (e) {
    console.error('bq query failed:', e.stderr || e.message)
    // Show first few lines of SQL for debugging
    console.log('First 500 chars of SQL:', sql.substring(0, 500))
    process.exit(1)
  }

  // Verify
  const verify = execSync(
    'bq query --use_legacy_sql=false "SELECT COUNT(*) as cnt FROM \\`master-roofing-intelligence.mr_main.bluebeam_tools\\`"',
    { encoding: 'utf8' }
  )
  console.log('Verification:', verify.trim())
}

main().catch(console.error)
