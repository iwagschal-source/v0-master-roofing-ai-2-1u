#!/usr/bin/env node
/**
 * Analyze Asana to HubSpot Stage Mapping
 */

import { createSign } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.production.local') })

const ASANA_PAT = '2/1210265196196335/1212775865924391:725275789145e9e8e1946d3737a9e8b9'
const HUBSPOT_TOKEN = 'pat-na1-932c3653-8534-408f-973a-46e24b716514'

async function getGoogleToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: email,
    sub: 'rfp@masterroofingus.com',
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }
  const header = { alg: 'RS256', typ: 'JWT' }
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

async function readSheet(token, sheetId, range) {
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
    { headers: { 'Authorization': 'Bearer ' + token } }
  )
  return resp.json()
}

async function getSheetMetadata(token, sheetId) {
  const resp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties`,
    { headers: { 'Authorization': 'Bearer ' + token } }
  )
  return resp.json()
}

async function getAsanaSections(projectGid) {
  const resp = await fetch(
    `https://app.asana.com/api/1.0/projects/${projectGid}/sections`,
    { headers: { 'Authorization': 'Bearer ' + ASANA_PAT } }
  )
  return resp.json()
}

async function getAsanaTasksInSection(sectionGid) {
  const resp = await fetch(
    `https://app.asana.com/api/1.0/sections/${sectionGid}/tasks?opt_fields=name,completed,created_at&limit=100`,
    { headers: { 'Authorization': 'Bearer ' + ASANA_PAT } }
  )
  return resp.json()
}

async function getHubSpotPipelines() {
  const resp = await fetch(
    'https://api.hubapi.com/crm/v3/pipelines/deals',
    { headers: { 'Authorization': 'Bearer ' + HUBSPOT_TOKEN } }
  )
  return resp.json()
}

async function main() {
  console.log('=== Asana to HubSpot Stage Mapping Analysis ===\n')

  // Step 1: Get Asana sections for each project
  console.log('1. ASANA PROJECT SECTIONS\n')

  const asanaProjects = [
    { gid: '1160614300237021', name: 'Bids' },
    { gid: '916647532526133', name: 'Projects' },
    { gid: '916647532526131', name: 'Billing' },
  ]

  const asanaSections = {}

  for (const project of asanaProjects) {
    console.log(`=== ${project.name} ===`)
    const sections = await getAsanaSections(project.gid)
    asanaSections[project.name] = []

    if (sections.data) {
      for (const section of sections.data) {
        const tasks = await getAsanaTasksInSection(section.gid)
        const taskCount = tasks.data?.length || 0
        const activeCount = tasks.data?.filter(t => !t.completed).length || 0
        asanaSections[project.name].push({
          name: section.name,
          gid: section.gid,
          totalTasks: taskCount,
          activeTasks: activeCount
        })
        console.log(`  ${section.name}`)
        console.log(`    GID: ${section.gid}`)
        console.log(`    Tasks: ${activeCount} active / ${taskCount} total`)
      }
    }
    console.log('')
  }

  // Step 2: Get HubSpot pipelines and stages
  console.log('\n2. HUBSPOT PIPELINES AND STAGES\n')
  const pipelines = await getHubSpotPipelines()
  const hubspotStages = {}

  if (pipelines.results) {
    for (const pipeline of pipelines.results) {
      console.log(`=== ${pipeline.label} (ID: ${pipeline.id}) ===`)
      hubspotStages[pipeline.label] = []

      if (pipeline.stages) {
        const sortedStages = pipeline.stages.sort((a, b) => a.displayOrder - b.displayOrder)
        for (const stage of sortedStages) {
          hubspotStages[pipeline.label].push({
            label: stage.label,
            id: stage.id,
            displayOrder: stage.displayOrder
          })
          console.log(`  ${stage.displayOrder}. ${stage.label}`)
          console.log(`     ID: ${stage.id}`)
        }
      }
      console.log('')
    }
  }

  // Step 3: Print summary for mapping
  console.log('\n3. MAPPING SUMMARY\n')
  console.log('ASANA BIDS SECTIONS:')
  for (const section of asanaSections['Bids'] || []) {
    console.log(`  - ${section.name} (${section.activeTasks} active)`)
  }

  console.log('\nASANA PROJECTS SECTIONS:')
  for (const section of asanaSections['Projects'] || []) {
    console.log(`  - ${section.name} (${section.activeTasks} active)`)
  }

  console.log('\nHUBSPOT MR_ASANA STAGES:')
  for (const stage of hubspotStages['MR_ASANA'] || []) {
    console.log(`  ${stage.displayOrder}. ${stage.label}`)
  }

  console.log('\n=== END OF ANALYSIS ===')
}

main().catch(console.error)
