/**
 * Populate the template Google Sheet with sample data
 * Run with: node scripts/populate-template.js
 */

require('dotenv').config({ path: '.env.local' })

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
]
const IMPERSONATE_USER = 'rfp@masterroofingus.com'

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !privateKey) {
    throw new Error('Google credentials not configured')
  }

  const { createSign } = require('crypto')
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

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) throw new Error(`Token error: ${await res.text()}`)
  const data = await res.json()
  return data.access_token
}

async function batchUpdate(sheetId, data) {
  const token = await getAccessToken()
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: data,
      }),
    }
  )
  if (!res.ok) throw new Error(`Update error: ${await res.text()}`)
  return res.json()
}

async function getSheetInfo(sheetId) {
  const token = await getAccessToken()
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  )
  if (!res.ok) throw new Error(`Get sheet error: ${await res.text()}`)
  return res.json()
}

async function createSheet(sheetId, title) {
  const token = await getAccessToken()
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [{
          addSheet: {
            properties: { title }
          }
        }]
      }),
    }
  )
  if (!res.ok) throw new Error(`Create sheet error: ${await res.text()}`)
  return res.json()
}

async function main() {
  const sheetId = process.env.GOOGLE_SHEET_TEMPLATE_ID
  console.log('Populating template sheet:', sheetId)

  // Get existing sheets
  const info = await getSheetInfo(sheetId)
  const existingSheets = info.sheets.map(s => s.properties.title)
  console.log('Existing tabs:', existingSheets.join(', '))

  // Create missing tabs
  const requiredTabs = ['Setup', 'Systems', 'Alternates', 'Clarifications', 'Proposal']
  for (const tab of requiredTabs) {
    if (!existingSheets.includes(tab)) {
      console.log(`Creating tab: ${tab}`)
      await createSheet(sheetId, tab)
    }
  }
  console.log('All required tabs ready')

  const updates = [
    // Setup tab
    { range: 'Setup!A1:B10', values: [
      ['Project Name', '912-916 Home St Brooklyn'],
      ['Address', '912-916 Home St Brooklyn, NY 11238'],
      ['GC Name', 'YBBY Construction'],
      ['Amount', '$247,850.00'],
      ['Due Date', '10/27/2025'],
      ['Date of Drawings', '02/10/2025'],
      ['Addendum', '03'],
      ['Version', 'V2'],
      ['Supersedes', 'v2 Dated Oct 27 2025'],
      ['Project Summary', 'This project involves the installation of new roofing, waterproofing, and EIFS systems at the existing two-story building with cellar and balconies. The scope includes a Firestone APP 160/180 built-up roofing system at main and bulkhead roofs, aluminum coping and counter-flashing at parapets, EIFS with air-vapor barrier across the rear and side elevations, and balcony waterproofing using the Alsan RS 289 textured finish.'],
    ]},

    // Systems tab (Base Bid items) - 15 items to stress test pagination
    { range: 'Systems!A1:D20', values: [
      ['Name', 'Specs', 'Amount', 'Description'],
      ['Built-Up Roofing – Firestone APP 160/180 System', 'R-33    6.5"', '$42,203.00', 'Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads. Lead sheets installed and sealed at all drains.'],
      ['Architectural Coping System – Aluminum Coping', 'R-20    4"', '$7,934.00', 'Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.'],
      ['Aluminum Flashing - Main Roof', '', '$5,794.00', 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".'],
      ['Tie-In at Foundation', '', '$3,817.00', 'Apply PMMA waterproofing membrane where the 1st floor meets the foundation.'],
      ['Recessed Floor Waterproofing', '', '$15,115.00', 'Prepare the recessed concrete slab by scarifying to achieve a clean, smooth surface, then apply a uniform coat of Soprema RS 276 primer. Install new flashings using Soprema RS 230 Flash grade PMMA resin with Alsan RS fleece reinforcement.'],
      ['Aluminum Flashing - Bulkhead', '', '$5,794.00', 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4" at bulkhead areas.'],
      ['EIFS System – Rear Elevation', 'CI-4"', '$28,500.00', 'Exterior Insulation and Finish System with air-vapor barrier across the rear elevation. Includes 4" continuous insulation, base coat with mesh reinforcement, and finish coat in color selected by architect.'],
      ['EIFS System – Side Elevations', 'CI-4"', '$32,750.00', 'Exterior Insulation and Finish System with air-vapor barrier across both side elevations. Includes 4" continuous insulation, base coat with mesh reinforcement, and finish coat.'],
      ['Parapet Wall Waterproofing', '', '$8,420.00', 'Full waterproofing treatment of all parapet walls including fluid-applied membrane, reinforcing fabric at corners and penetrations, and protection board.'],
      ['Roof Drain Installation', '', '$4,850.00', 'Supply and install 6 new roof drains with cast iron bodies and aluminum strainers. Includes lead flashings and tie-in to existing storm drainage system.'],
      ['Skylight Curb Flashing', '', '$6,200.00', 'Custom fabricated aluminum curb flashing for 4 existing skylights. Includes removal of existing deteriorated flashing and sealant.'],
      ['Mechanical Equipment Curbs', '', '$12,350.00', 'Construct new insulated curbs for rooftop mechanical equipment. Includes waterproofing membrane, cant strips, and aluminum counterflashing.'],
      ['Expansion Joint Cover', '', '$7,890.00', 'Install new expansion joint cover system at building expansion joints. Bellows-type cover with aluminum frames and EPDM membrane.'],
      ['Roof Access Hatch', '', '$3,450.00', 'Supply and install new 30x36 aluminum roof access hatch with insulated curb and safety railings.'],
      ['Lightning Protection System', '', '$18,600.00', 'Complete lightning protection system including air terminals, conductors, and ground rods. UL Master Label certified installation.'],
    ]},

    // Alternates tab - 8 items
    { range: 'Alternates!A1:D12', values: [
      ['Name', 'Specs', 'Amount', 'Description'],
      ['Balcony Waterproofing - 2nd Floor', '', '$4,965.00', 'Balcony waterproofing includes application of Alsan RS 276 Primer, Alsan RS 230 flashing 12" up walls, and Alsan RS 289 Textured Finish with color pack. Aluminum drip edge installed at perimeter terminations.'],
      ['Balcony Waterproofing - 3rd Floor', '', '$5,280.00', 'Balcony waterproofing includes application of Alsan RS 276 Primer, Alsan RS 230 flashing 12" up walls, and Alsan RS 289 Textured Finish with color pack.'],
      ['Tie-In at Cellar Level', '', '$3,817.00', 'Apply PMMA waterproofing membrane where the cellar level meets the foundation walls.'],
      ['Green Roof System', 'Extensive', '$45,000.00', 'Extensive green roof system over main roof area. Includes root barrier, drainage mat, filter fabric, growing medium, and sedum plant material. 2-year plant establishment warranty.'],
      ['Cool Roof Upgrade', 'CRRC Rated', '$8,500.00', 'Upgrade to CRRC-rated highly reflective white membrane. Achieves LEED heat island credit and reduces cooling costs.'],
      ['Extended Warranty - 25 Year', 'NDL', '$12,000.00', 'Upgrade from standard 20-year warranty to 25-year No Dollar Limit (NDL) manufacturer warranty covering materials and labor.'],
      ['Photovoltaic Roof Preparation', '', '$6,750.00', 'Structural reinforcement and conduit installation for future solar panel installation. Includes additional blocking and waterproofing at anticipated penetration locations.'],
      ['Premium Finish Coat - EIFS', 'Stolit Milano', '$4,200.00', 'Upgrade EIFS finish coat from standard to Stolit Milano textured finish with enhanced durability and aesthetic appeal.'],
    ]},

    // Clarifications tab - 10 items
    { range: 'Clarifications!A1:A12', values: [
      ['Clarification'],
      ['Containers for garbage must be provided by GC.'],
      ['All penetrations must be installed prior to installation of roofing system. Any penetrations installed afterwards will be an additional charge per pitch pocket.'],
      ['This APP 160/180 roofing system is designed and manufactured for waterproofing purposes only- not for any sort of human traffic. If roof will be used for traffic without the installation of protection boards or pavers, the warranty will not be effective.'],
      ['R value and thickness of insulation must be reviewed and approved by GC. Master Roofing doesn\'t take any responsibility for the R value requirements.'],
      ['This roofing system proposed is standard white only, ultra-white will be an upcharge.'],
      ['Hoisting and staging to be coordinated with GC. Master Roofing requires minimum 48-hour notice for crane/hoist availability.'],
      ['Work is based on normal working hours (7:00 AM - 3:30 PM, Monday-Friday). Overtime or weekend work will be billed at 1.5x labor rates.'],
      ['Temporary protection of adjacent surfaces and landscaping is the responsibility of the GC.'],
      ['Master Roofing is not responsible for concealed conditions. Any unforeseen substrate damage or deterioration will be addressed via change order.'],
      ['Price is valid for 30 days from proposal date. Material costs are subject to change based on manufacturer pricing at time of order.'],
    ]},
  ]

  const result = await batchUpdate(sheetId, updates)
  console.log('Updated', result.totalUpdatedCells, 'cells')
  console.log('Done! View sheet at: https://docs.google.com/spreadsheets/d/' + sheetId)
}

main().catch(console.error)
