#!/usr/bin/env node
/**
 * Complete the Asana to HubSpot Stage Mapping
 */

import { createSign } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.production.local') })

const SHEET_ID = '1_BXig033qgDVjHX8qaiAAPyqyjGVStIzXqu_gZOpzoM'

// HubSpot MR_ASANA pipeline stages
const HUBSPOT_STAGES = {
  'RFP Received': '1265196202',
  'Assigning Estimator': '1265196203',
  'Takeoff in Process': '1265196204',
  'Takeoff Completed': '1265196205',
  'Review Completed': '1265196206',
  'Preparing Proposal': '1265196207',
  'Proposal Final Review': '1265196208',
  'Finalizing Proposal': '1265196209',
  'Proposal Sent': '1265196210',
  'Paused': '1265196211',
  'Won': '1265196212',
  'Lost': '1265196213'
}

// Stage order (higher = more advanced)
const STAGE_ORDER = {
  'RFP Received': 1,
  'Assigning Estimator': 2,
  'Takeoff in Process': 3,
  'Takeoff Completed': 4,
  'Review Completed': 5,
  'Preparing Proposal': 6,
  'Proposal Final Review': 7,
  'Finalizing Proposal': 8,
  'Proposal Sent': 9,
  'Paused': 0,  // Special - not in workflow
  'Won': 100,
  'Lost': 100
}

// Map individual bid status to HubSpot stage
function mapBidStatus(bidStatus) {
  if (!bidStatus || bidStatus === 'NULL') return 'RFP Received'

  const bs = bidStatus.trim()

  // Paused statuses
  if (['RFI - hold', 'Material price hold', 'As per G.C.-project hold',
       'Scope Confirmation Required', 'No Plumbing & Mech Drwg & Energy',
       'Drawing Not Received Yet -From G.C.', 'Not submitted - lack of drawings',
       'Pricing- hold', 'Hold'].includes(bs)) {
    return 'Paused'
  }

  // Won indicator
  if (bs === 'Pin Approved') return 'Won'

  // Proposal Sent
  if (['Proposal sent', '1st bid submitted', 'Takeoff & Markup sent to GC',
       'Warranty Submitted for review'].includes(bs)) {
    return 'Proposal Sent'
  }

  // Finalizing Proposal
  if (['Review and send', ' Review and send', 'Send without Review',
       'Send without Review of TK', 'Update as per comments',
       'Update As per Email.', 'Update As per Email'].includes(bs)) {
    return 'Finalizing Proposal'
  }

  // Proposal Final Review
  if (['Proposal Ready for Review', 'Warranty Ready for Review/Submission',
       'Proposal ready', 'check notes on proposal'].includes(bs)) {
    return 'Proposal Final Review'
  }

  // Preparing Proposal
  if (['Ready for Setting the Proposal', 'Ready for Setting the Proposal ',
       'Ready for proposal', 'Schedule Meeting with G.C.'].includes(bs)) {
    return 'Preparing Proposal'
  }

  // Review Completed
  if (['Reviewed by TK', 'Reviewed by FK', 'Reviewed / No comments',
       'Reviewed by TK- Roofing Only'].includes(bs)) {
    return 'Review Completed'
  }

  // Takeoff Completed
  if (['Ready for Review', 'Takeoff ready for review', 'Takeoff is Ready',
       'G.C. markup-Ready', 'Roofing Ready for review', 'Roofing proposal ready for review'].includes(bs)) {
    return 'Takeoff Completed'
  }

  // Takeoff in Process
  if (['Waiting for Quote', 'Markup Based on Latest Takeoff',
       'Updated Drawings', 'Add Scope for landscape', 'Markup ready for review'].includes(bs)) {
    return 'Takeoff in Process'
  }

  // Assigning Estimator
  if (['High Priority'].includes(bs)) {
    return 'Assigning Estimator'
  }

  // Default
  return 'RFP Received'
}

// For combined bid statuses, find the most advanced stage
function mapCombinedBidStatus(bidStatusRaw) {
  if (!bidStatusRaw || bidStatusRaw === 'NULL') return 'RFP Received'

  const statuses = bidStatusRaw.split(',').map(s => s.trim())
  let maxStage = 'RFP Received'
  let maxOrder = STAGE_ORDER[maxStage]

  for (const status of statuses) {
    const stage = mapBidStatus(status)
    const order = STAGE_ORDER[stage]

    // Paused takes precedence if any status is paused
    if (stage === 'Paused') {
      return 'Paused'
    }

    if (order > maxOrder) {
      maxOrder = order
      maxStage = stage
    }
  }

  return maxStage
}

// Map based on both Status and Bid Status
function mapToHubSpot(statusRaw, bidStatusRaw) {
  const status = statusRaw?.trim() || 'NULL'

  // Status field takes precedence for final outcomes
  // Check if status CONTAINS these values (handles combined statuses)
  if (status.includes('MR Awarded')) {
    return { stage: 'Won', note: 'MR won the project' }
  }

  // Check for "Awarded" but NOT "MR Awarded"
  if (status.includes('Awarded') && !status.includes('MR Awarded')) {
    return { stage: 'Lost', note: 'Competitor won the project' }
  }

  if (status.includes('GC didnt get the job')) {
    return { stage: 'Lost', note: 'GC lost, project cancelled' }
  }

  // For other statuses, use Bid Status
  const stage = mapCombinedBidStatus(bidStatusRaw)
  let note = ''

  if (status.includes('Status to be veified')) {
    note = 'Status needs verification'
  } else if (status.includes('Double Check')) {
    note = 'Needs double-checking'
  } else if (status.includes('till here')) {
    note = 'Progress marker'
  }

  return { stage, note }
}

async function getToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: email, sub: 'rfp@masterroofingus.com', scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = encodedHeader + '.' + encodedPayload
  const sign = createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(privateKey, 'base64url')
  const jwt = signatureInput + '.' + signature
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  return (await resp.json()).access_token
}

async function readSheet(token, range) {
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`,
    { headers: { 'Authorization': 'Bearer ' + token } }
  )
  return resp.json()
}

async function writeSheet(token, range, values) {
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values })
    }
  )
  return resp.json()
}

async function main() {
  console.log('=== Complete Asana to HubSpot Stage Mapping ===\n')

  const token = await getToken()

  // Read current mapping sheet
  console.log('1. Reading current mapping...')
  const data = await readSheet(token, 'Mapping!A1:E200')
  const rows = data.values || []

  console.log(`   Found ${rows.length} rows\n`)

  // Additional combinations found in real Asana data
  const additionalCombos = [
    ['Status to be veified', 'Proposal Ready for Review, Reviewed by TK'],
    ['Status to be veified', ' Review and send, Proposal Ready for Review, Reviewed by TK, Updated Drawings'],
    ['Status to be veified', ' Review and send, Proposal Ready for Review, Reviewed by TK'],
    ['NULL', 'Proposal Ready for Review, Reviewed / No comments, Reviewed by TK'],
    ['NULL', 'Ready for Setting the Proposal , Reviewed by TK'],
    ['Status to be veified', 'Updated Drawings'],
    ['Status to be veified', ' Review and send, Proposal Ready for Review'],
    ['Status to be veified', ' Review and send, Proposal Ready for Review, Reviewed by TK, Update As per Email.'],
    ['NULL', 'Proposal Ready for Review, RFI - hold, Reviewed by TK'],
    ['NULL', 'Proposal Ready for Review, Reviewed by TK'],
    ['NULL', ' Review and send, Proposal Ready for Review'],
    ['NULL', 'Ready for Review, Reviewed by TK'],
    ['Status to be veified', 'Proposal sent, Update As per Email.'],
    ['NULL', 'RFI - hold, Updated Drawings'],
    ['NULL', ' Review and send, Proposal Ready for Review, Ready for Setting the Proposal , Reviewed by TK'],
    ['NULL', 'Proposal sent, Reviewed by TK'],
    ['NULL', ' Review and send'],
    ['NULL', 'RFI - hold, Update As per Email.'],
    ['Status to be veified', 'RFI - hold, Reviewed by TK, Update As per Email.'],
    ['Status to be veified', 'Proposal sent, Ready for Setting the Proposal , Reviewed by TK'],
    ['Status to be veified', 'Proposal sent, Reviewed by TK'],
    ['Status to be veified', 'Ready for Setting the Proposal , Reviewed by TK'],
    ['Status to be veified', 'Proposal sent, Ready for Review, Reviewed by TK'],
    ['Status to be veified', ' Review and send'],
    ['Status to be veified', 'Update As per Email.'],
    ['Status to be veified', 'Proposal Ready for Review, Ready for Setting the Proposal , Reviewed by TK'],
    ['Status to be veified', 'Reviewed by TK, Takeoff & Markup sent to GC'],
    ['Status to be veified', 'Proposal Ready for Review, Update As per Email., Update as per comments'],
    ['Status to be veified', ' Review and send, Proposal Ready for Review, RFI - hold, Update as per comments'],
    ['Status to be veified', 'Reviewed by TK, Update as per comments'],
    ['Status to be veified', 'Proposal Ready for Review, Ready for Review, Reviewed / No comments'],
    ['Status to be veified', ' Review and send, G.C. markup-Ready, Proposal Ready for Review, Reviewed by TK'],
    ['Status to be veified', ' Review and send, Proposal Ready for Review, RFI - hold, Reviewed by TK, Scope Confirmation Required'],
    ['Status to be veified', 'Material price hold, Proposal Ready for Review'],
    ['Status to be veified', 'Proposal sent, Update as per comments'],
    ['Status to be veified', 'Reviewed / No comments, Reviewed by TK'],
    ['Status to be veified', 'Proposal Ready for Review, Reviewed by TK, Send without Review'],
    ['Status to be veified', 'Proposal Ready for Review, Reviewed by TK, Scope Confirmation Required, Send without Review'],
    // More from MR Awarded and Awarded that aren't explicitly in sheet
    ['MR Awarded', ' Review and send, Proposal Ready for Review, Ready for Review, Update as per comments'],
    ['Awarded', 'Proposal Ready for Review, Ready for Review'],
    ['Awarded', ' Review and send, Proposal Ready for Review'],
    ['Awarded', 'Reviewed by TK'],
    ['GC didnt get the job, Status to be veified', ' Review and send'],
  ]

  // Check what's already in rows
  const existingCombos = new Set(rows.slice(1).map(r => `${r[0]}|${r[1]}`))

  // Add missing combos
  for (const [status, bidStatus] of additionalCombos) {
    const key = `${status}|${bidStatus}`
    if (!existingCombos.has(key)) {
      rows.push([status, bidStatus, '', '', ''])
      existingCombos.add(key)
    }
  }

  console.log(`   After adding missing combos: ${rows.length} rows\n`)

  // Skip header row, process each row
  console.log('2. Creating mappings...\n')
  const newRows = [rows[0]] // Keep header

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const statusRaw = row[0] || 'NULL'
    const bidStatusRaw = row[1] || 'NULL'

    const { stage, note } = mapToHubSpot(statusRaw, bidStatusRaw)
    const stageId = HUBSPOT_STAGES[stage]

    const newRow = [
      statusRaw,
      bidStatusRaw,
      stage,
      stageId,
      note
    ]

    newRows.push(newRow)
    console.log(`   ${statusRaw} | ${bidStatusRaw.substring(0, 40)}${bidStatusRaw.length > 40 ? '...' : ''}`)
    console.log(`   → ${stage} (${stageId}) ${note ? '- ' + note : ''}\n`)
  }

  // Write back to sheet
  console.log('3. Writing mappings to sheet...')
  const result = await writeSheet(token, 'Mapping!A1:E' + newRows.length, newRows)

  console.log(`   Updated ${result.updatedRows} rows, ${result.updatedColumns} columns`)

  // Summary
  console.log('\n=== MAPPING SUMMARY ===\n')
  const stageCounts = {}
  for (let i = 1; i < newRows.length; i++) {
    const stage = newRows[i][2]
    stageCounts[stage] = (stageCounts[stage] || 0) + 1
  }

  for (const [stage, count] of Object.entries(stageCounts).sort((a, b) => STAGE_ORDER[a[0]] - STAGE_ORDER[b[0]])) {
    console.log(`   ${stage}: ${count} mappings`)
  }

  console.log(`\nSheet: https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`)
}

main().catch(console.error)
