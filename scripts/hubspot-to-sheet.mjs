#!/usr/bin/env node
/**
 * Fetch HubSpot pipeline deals and write to Google Sheet
 */

import { createSign } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from both locations
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

// HubSpot token from backend env
const HUBSPOT_TOKEN = 'pat-na1-932c3653-8534-408f-973a-46e24b716514'
const HUBSPOT_BASE = 'https://api.hubapi.com'

// Google Sheets config
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive']
const IMPERSONATE_USER = 'rfp@masterroofingus.com'
const SHEET_ID = '1MjSa5jVth8E1h4kVQ3uuRH-53-WwUquN04satOQ4ZU0'

// ============ HubSpot Functions ============

async function hubspotRequest(endpoint, options = {}) {
  const response = await fetch(`${HUBSPOT_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${HUBSPOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`HubSpot API error: ${response.status} - ${error}`)
  }

  return response.json()
}

async function getPipelines() {
  const data = await hubspotRequest('/crm/v3/pipelines/deals')
  return data.results
}

async function getDealsInPipeline(pipelineId, pipelineStages) {
  const allDeals = []
  let after = undefined

  do {
    const body = {
      filterGroups: [{
        filters: [{
          propertyName: 'pipeline',
          operator: 'EQ',
          value: pipelineId
        }]
      }],
      properties: [
        'dealname', 'amount', 'dealstage', 'closedate', 'createdate',
        'pipeline', 'hs_lastmodifieddate', 'hubspot_owner_id',
        'rfp_date', 'bid_due_date', 'proposal_sent',
        'project_address', 'project_city', 'project_state',
        'takeoff_assigned_to', 'senior_estimator',
        'total_proposal_amount', 'proposal_status', 'rfp_original_notes_',
        'scope_of_work___yes', 'market_sector', 'bid_deadline_status'
      ],
      sorts: [{ propertyName: 'createdate', direction: 'DESCENDING' }],
      limit: 100,
      ...(after && { after })
    }

    const data = await hubspotRequest('/crm/v3/objects/deals/search', {
      method: 'POST',
      body: JSON.stringify(body)
    })

    // Map stage IDs to names
    const stageMap = {}
    pipelineStages.forEach(s => { stageMap[s.id] = s.label })

    for (const deal of data.results) {
      const stageId = deal.properties.dealstage
      deal.properties.dealstage_name = stageMap[stageId] || stageId
      allDeals.push(deal)
    }

    after = data.paging?.next?.after
  } while (after)

  return allDeals
}

// ============ Google Sheets Functions ============

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !privateKey) {
    throw new Error('Google service account credentials not configured')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: email,
    sub: IMPERSONATE_USER,
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

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
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function writeToSheet(accessToken, range, values) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to write to sheet: ${error}`)
  }

  return response.json()
}

async function clearSheet(accessToken, range) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}:clear`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to clear sheet: ${error}`)
  }

  return response.json()
}

// ============ Main ============

async function main() {
  console.log('=== HubSpot to Google Sheets Sync ===\n')

  // Step 1: Get all pipelines
  console.log('1. Fetching HubSpot pipelines...')
  const pipelines = await getPipelines()

  console.log(`   Found ${pipelines.length} pipelines:`)
  pipelines.forEach(p => console.log(`   - ${p.label} (${p.id})`))

  // Step 2: Find "mr Asana" pipeline
  const mrAsanaPipeline = pipelines.find(p =>
    p.label.toLowerCase().includes('asana') ||
    p.label.toLowerCase() === 'mr asana'
  )

  if (!mrAsanaPipeline) {
    console.log('\n   ERROR: "mr Asana" pipeline not found!')
    console.log('   Available pipelines:')
    pipelines.forEach(p => console.log(`   - "${p.label}"`))
    return
  }

  console.log(`\n2. Found pipeline: "${mrAsanaPipeline.label}" (${mrAsanaPipeline.id})`)
  console.log(`   Stages: ${mrAsanaPipeline.stages.map(s => s.label).join(', ')}`)

  // Step 3: Get all deals in pipeline
  console.log('\n3. Fetching deals from pipeline...')
  const deals = await getDealsInPipeline(mrAsanaPipeline.id, mrAsanaPipeline.stages)
  console.log(`   Found ${deals.length} deals`)

  if (deals.length === 0) {
    console.log('   No deals to sync.')
    return
  }

  // Step 4: Prepare data for sheet
  console.log('\n4. Preparing data for Google Sheet...')

  const header = [
    'HubSpot ID', 'Deal Name', 'Stage', 'RFP Date', 'Bid Due Date',
    'Proposal Sent', 'Amount', 'Total Proposal Amount',
    'Project Address', 'City', 'State',
    'Assigned Estimator', 'Senior Estimator',
    'Proposal Status', 'Market Sector', 'Bid Deadline Status',
    'Create Date', 'Close Date', 'Last Modified'
  ]
  const rows = deals.map(deal => [
    deal.id,
    deal.properties.dealname || '',
    deal.properties.dealstage_name || '',
    deal.properties.rfp_date?.split('T')[0] || '',
    deal.properties.bid_due_date?.split('T')[0] || '',
    deal.properties.proposal_sent?.split('T')[0] || '',
    deal.properties.amount || '',
    deal.properties.total_proposal_amount || '',
    deal.properties.project_address || '',
    deal.properties.project_city || '',
    deal.properties.project_state || '',
    deal.properties.takeoff_assigned_to || '',
    deal.properties.senior_estimator || '',
    deal.properties.proposal_status || '',
    deal.properties.market_sector || '',
    deal.properties.bid_deadline_status || '',
    deal.properties.createdate?.split('T')[0] || '',
    deal.properties.closedate?.split('T')[0] || '',
    deal.properties.hs_lastmodifieddate?.split('T')[0] || ''
  ])

  const sheetData = [header, ...rows]

  // Step 5: Write to Google Sheet
  console.log('\n5. Writing to Google Sheet "In HubSpot" tab...')
  const accessToken = await getAccessToken()

  // Clear existing data first (tab has trailing space, 19 columns)
  await clearSheet(accessToken, "'In HubSpot '!A1:S500")

  // Write new data
  const result = await writeToSheet(accessToken, "'In HubSpot '!A1", sheetData)

  console.log(`   Success! Updated ${result.updatedRows} rows, ${result.updatedColumns} columns`)
  console.log(`\n   Sheet URL: https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`)

  // Summary
  console.log('\n=== Summary ===')
  console.log(`Pipeline: ${mrAsanaPipeline.label}`)
  console.log(`Total deals synced: ${deals.length}`)

  // Show first few deals
  console.log('\nFirst 5 deals:')
  deals.slice(0, 5).forEach((d, i) => {
    console.log(`  ${i+1}. ${d.properties.dealname} (${d.properties.dealstage_name})`)
  })
}

main().catch(err => {
  console.error('Error:', err.message)
  process.exit(1)
})
