#!/usr/bin/env node
import { createSign } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.production.local') })

async function getAccessToken(scopes) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: email, scope: scopes, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const sign = createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(privateKey, 'base64url')
  const jwt = `${signatureInput}.${signature}`
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  return (await tokenResponse.json()).access_token
}

async function runQuery(token, sql) {
  const resp = await fetch('https://bigquery.googleapis.com/bigquery/v2/projects/master-roofing-intelligence/queries', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, useLegacySql: false, timeoutMs: 120000 })
  })
  const r = await resp.json()
  if (r.error) console.log('BQ Error:', r.error.message)
  return r
}

async function main() {
  const projectId = process.argv[2] || 'e022ff095a4b7cd05650715127e9cc89'
  console.log(`=== Takeoff for project_id: ${projectId} ===\n`)

  const bqToken = await getAccessToken('https://www.googleapis.com/auth/bigquery')

  // First get schema
  console.log('Checking fct_takeoff_line schema...\n')
  const schemaSql = `
    SELECT column_name, data_type
    FROM \`master-roofing-intelligence.mr_core.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'fct_takeoff_line'
  `
  const schemaResult = await runQuery(bqToken, schemaSql)
  if (schemaResult.rows) {
    console.log('Columns:')
    for (const row of schemaResult.rows) {
      console.log(`  ${row.f[0].v} (${row.f[1].v})`)
    }
    console.log('')
  }

  // Query fct_takeoff_line - search by project_folder_name
  console.log('Querying fct_takeoff_line for 102 fleet...\n')
  const sql = `
    SELECT
      project_folder_name,
      sheet_name,
      block_label,
      total_measurements,
      unit_cost,
      total_cost,
      row_index
    FROM \`master-roofing-intelligence.mr_core.fct_takeoff_line\`
    WHERE LOWER(project_folder_name) LIKE '%102%fleet%'
       OR LOWER(project_folder_name) LIKE '%fleet%102%'
    ORDER BY project_folder_name, sheet_name, row_index
    LIMIT 200
  `

  const result = await runQuery(bqToken, sql)

  if (!result.rows || result.rows.length === 0) {
    console.log('No data in proposal_takeoff_unified_v2. Trying dim_takeoff...\n')

    // Try dim_takeoff
    const altSql = `
      SELECT *
      FROM \`master-roofing-intelligence.mr_core.dim_takeoff\`
      WHERE project_id = '${projectId}'
      LIMIT 100
    `
    const altResult = await runQuery(bqToken, altSql)

    if (altResult.rows) {
      console.log('Found in dim_takeoff:\n')
      console.log(JSON.stringify(altResult, null, 2))
    } else {
      // List available tables with takeoff
      console.log('Searching for takeoff tables...\n')
      const tablesSql = `
        SELECT table_name
        FROM \`master-roofing-intelligence.mr_core.INFORMATION_SCHEMA.TABLES\`
        WHERE LOWER(table_name) LIKE '%takeoff%'
      `
      const tablesResult = await runQuery(bqToken, tablesSql)
      if (tablesResult.rows) {
        console.log('Available takeoff tables:')
        for (const row of tablesResult.rows) {
          console.log(`  - ${row.f[0].v}`)
        }
      }
    }
    return
  }

  // Print takeoff lines
  console.log('Project | Sheet | Block/Item | Qty | Unit Cost | Total')
  console.log('-'.repeat(100))

  let currentSheet = ''
  let sheetTotal = 0
  let grandTotal = 0

  for (const row of result.rows) {
    const [folder, sheet, block, qty, unitCost, total, rowIdx] = row.f.map(f => f.v)

    if (sheet !== currentSheet) {
      if (currentSheet) console.log(`  Subtotal: $${sheetTotal.toLocaleString()}\n`)
      currentSheet = sheet
      sheetTotal = 0
      console.log(`\n=== ${sheet} ===`)
    }

    const totalNum = parseFloat(total) || 0
    sheetTotal += totalNum
    grandTotal += totalNum

    const qtyStr = parseFloat(qty || 0).toLocaleString()
    const unitStr = parseFloat(unitCost || 0).toLocaleString()
    console.log(`  ${(block || '').substring(0, 50).padEnd(50)} | ${qtyStr.padStart(10)} | $${unitStr.padStart(8)} | $${totalNum.toLocaleString()}`)
  }

  console.log(`  Subtotal: $${sheetTotal.toLocaleString()}`)
  console.log(`\n${'='.repeat(50)}`)
  console.log(`GRAND TOTAL: $${grandTotal.toLocaleString()}`)
  console.log(`${'='.repeat(50)}`)
}


main().catch(console.error)
