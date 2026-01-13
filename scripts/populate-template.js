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

async function setDataValidation(sheetId, sheetTabId, range, values) {
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
          setDataValidation: {
            range: {
              sheetId: sheetTabId,
              startRowIndex: range.startRow,
              endRowIndex: range.endRow,
              startColumnIndex: range.startCol,
              endColumnIndex: range.endCol
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: values.map(v => ({ userEnteredValue: v }))
              },
              showCustomUi: true,
              strict: false
            }
          }
        }]
      }),
    }
  )
  if (!res.ok) console.warn('Validation warning:', await res.text())
}

async function main() {
  const sheetId = process.env.GOOGLE_SHEET_TEMPLATE_ID
  console.log('Populating template sheet:', sheetId)

  // Get existing sheets
  const info = await getSheetInfo(sheetId)
  const existingSheets = info.sheets.map(s => s.properties.title)
  console.log('Existing tabs:', existingSheets.join(', '))

  // Create missing tabs
  const requiredTabs = ['Setup', 'Systems', 'Alternates', 'Clarifications', 'Proposal', 'Systems Library', 'Items Library', 'GC History']
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

    // ============ SYSTEMS LIBRARY ============
    // Columns: System Name | Manufacturer | Type | R-Value | Thickness | Material Rate | Labor Rate | UOM | Description
    { range: 'Systems Library!A1:I30', values: [
      ['System Name', 'Manufacturer', 'Type', 'R-Value', 'Thickness', 'Material Rate', 'Labor Rate', 'UOM', 'Description'],
      // Firestone APP Systems
      ['APP 160/180 Built-Up', 'Firestone', 'Modified Bitumen', 'R-20', '4"', '$4.25', '$3.50', 'SF', 'Two-ply APP modified bitumen system with ISO insulation'],
      ['APP 160/180 Built-Up', 'Firestone', 'Modified Bitumen', 'R-25', '5"', '$4.75', '$3.50', 'SF', 'Two-ply APP modified bitumen system with ISO insulation'],
      ['APP 160/180 Built-Up', 'Firestone', 'Modified Bitumen', 'R-30', '6"', '$5.25', '$3.50', 'SF', 'Two-ply APP modified bitumen system with ISO insulation'],
      ['APP 160/180 Built-Up', 'Firestone', 'Modified Bitumen', 'R-33', '6.5"', '$5.50', '$3.50', 'SF', 'Two-ply APP modified bitumen system with ISO insulation'],
      ['APP 160/180 Built-Up', 'Firestone', 'Modified Bitumen', 'R-38', '7.5"', '$6.00', '$3.75', 'SF', 'Two-ply APP modified bitumen system with ISO insulation'],
      // TPO Systems
      ['TPO Single-Ply 60mil', 'Firestone', 'TPO', 'R-20', '4"', '$3.50', '$2.75', 'SF', '60mil TPO membrane fully adhered'],
      ['TPO Single-Ply 60mil', 'Firestone', 'TPO', 'R-25', '5"', '$3.85', '$2.75', 'SF', '60mil TPO membrane fully adhered'],
      ['TPO Single-Ply 60mil', 'Firestone', 'TPO', 'R-30', '6"', '$4.20', '$2.75', 'SF', '60mil TPO membrane fully adhered'],
      ['TPO Single-Ply 80mil', 'Firestone', 'TPO', 'R-30', '6"', '$4.75', '$3.00', 'SF', '80mil TPO membrane fully adhered'],
      // Carlisle Systems
      ['TPO Single-Ply 60mil', 'Carlisle', 'TPO', 'R-25', '5"', '$3.75', '$2.75', 'SF', '60mil Sure-Weld TPO membrane'],
      ['TPO Single-Ply 60mil', 'Carlisle', 'TPO', 'R-30', '6"', '$4.10', '$2.75', 'SF', '60mil Sure-Weld TPO membrane'],
      ['EPDM 60mil', 'Carlisle', 'EPDM', 'R-25', '5"', '$3.25', '$2.50', 'SF', '60mil EPDM rubber membrane fully adhered'],
      ['EPDM 60mil', 'Carlisle', 'EPDM', 'R-30', '6"', '$3.60', '$2.50', 'SF', '60mil EPDM rubber membrane fully adhered'],
      // GAF Systems
      ['TPO Single-Ply 60mil', 'GAF', 'TPO', 'R-25', '5"', '$3.65', '$2.75', 'SF', 'EverGuard TPO 60mil'],
      ['TPO Single-Ply 80mil', 'GAF', 'TPO', 'R-30', '6"', '$4.50', '$3.00', 'SF', 'EverGuard TPO 80mil'],
      // Soprema Systems
      ['SBS Modified Bitumen', 'Soprema', 'Modified Bitumen', 'R-25', '5"', '$4.50', '$3.50', 'SF', 'Sopralene Flam 180 SBS system'],
      ['SBS Modified Bitumen', 'Soprema', 'Modified Bitumen', 'R-30', '6"', '$5.00', '$3.50', 'SF', 'Sopralene Flam 180 SBS system'],
      ['PMMA Liquid Applied', 'Soprema', 'Liquid Applied', 'N/A', 'N/A', '$8.50', '$6.00', 'SF', 'Alsan RS liquid waterproofing'],
      // Sika Systems
      ['Sarnafil PVC', 'Sika', 'PVC', 'R-25', '5"', '$4.25', '$3.25', 'SF', '60mil Sarnafil PVC membrane'],
      ['Sarnafil PVC', 'Sika', 'PVC', 'R-30', '6"', '$4.60', '$3.25', 'SF', '60mil Sarnafil PVC membrane'],
      // EIFS Systems
      ['EIFS Standard', 'Dryvit', 'EIFS', 'R-7.5', '2"', '$12.00', '$8.00', 'SF', 'Outsulation system with 2" EPS'],
      ['EIFS Standard', 'Dryvit', 'EIFS', 'R-11.25', '3"', '$13.50', '$8.00', 'SF', 'Outsulation system with 3" EPS'],
      ['EIFS Standard', 'Dryvit', 'EIFS', 'R-15', '4"', '$15.00', '$8.50', 'SF', 'Outsulation system with 4" EPS'],
      ['EIFS Standard', 'Sto', 'EIFS', 'R-7.5', '2"', '$12.50', '$8.00', 'SF', 'StoTherm ci system with 2" EPS'],
      ['EIFS Standard', 'Sto', 'EIFS', 'R-15', '4"', '$15.50', '$8.50', 'SF', 'StoTherm ci system with 4" EPS'],
    ]},

    // ============ ITEMS LIBRARY ============
    // Columns: Item Name | Category | Manufacturer | Size/Spec | Material Rate | Labor Rate | UOM | Description
    { range: 'Items Library!A1:H50', values: [
      ['Item Name', 'Category', 'Manufacturer', 'Size/Spec', 'Material Rate', 'Labor Rate', 'UOM', 'Description'],
      // Insulation
      ['ISO 95+ GL Insulation', 'Insulation', 'Firestone', '2"', '$1.10', '$0.40', 'SF', 'Polyiso insulation board R-12.4'],
      ['ISO 95+ GL Insulation', 'Insulation', 'Firestone', '2.5"', '$1.35', '$0.40', 'SF', 'Polyiso insulation board R-15.5'],
      ['ISO 95+ GL Insulation', 'Insulation', 'Firestone', '3"', '$1.60', '$0.45', 'SF', 'Polyiso insulation board R-18.6'],
      ['ISO 95+ GL Insulation', 'Insulation', 'Firestone', '4"', '$2.10', '$0.50', 'SF', 'Polyiso insulation board R-24.8'],
      ['Tapered ISO', 'Insulation', 'Firestone', '1/4"/ft', '$1.85', '$0.55', 'SF', 'Tapered polyiso for drainage'],
      ['DensDeck Prime', 'Coverboard', 'GP', '1/4"', '$0.85', '$0.25', 'SF', 'Gypsum roof board'],
      ['DensDeck Prime', 'Coverboard', 'GP', '1/2"', '$1.15', '$0.30', 'SF', 'Gypsum roof board'],
      // Flashings
      ['Aluminum Coping', 'Metal', 'Various', '12"', '$18.00', '$12.00', 'LF', 'Extruded aluminum snap-on coping'],
      ['Aluminum Coping', 'Metal', 'Various', '18"', '$24.00', '$14.00', 'LF', 'Extruded aluminum snap-on coping'],
      ['Aluminum Coping', 'Metal', 'Various', '24"', '$32.00', '$16.00', 'LF', 'Extruded aluminum snap-on coping'],
      ['Counter Flashing', 'Metal', 'Various', '4"', '$8.50', '$6.00', 'LF', 'Two-piece aluminum counter flashing'],
      ['Counter Flashing', 'Metal', 'Various', '6"', '$10.50', '$6.50', 'LF', 'Two-piece aluminum counter flashing'],
      ['Drip Edge', 'Metal', 'Various', '4"', '$4.50', '$3.00', 'LF', 'Aluminum drip edge'],
      ['Gravel Stop', 'Metal', 'Various', '6"', '$12.00', '$7.00', 'LF', 'Aluminum gravel stop fascia'],
      // Accessories
      ['Roof Drain', 'Drainage', 'Zurn', '4"', '$285.00', '$150.00', 'EA', 'Cast iron roof drain with strainer'],
      ['Roof Drain', 'Drainage', 'Zurn', '6"', '$350.00', '$175.00', 'EA', 'Cast iron roof drain with strainer'],
      ['Overflow Drain', 'Drainage', 'Zurn', '4"', '$185.00', '$125.00', 'EA', 'Overflow scupper drain'],
      ['Pitch Pocket', 'Penetrations', 'Various', 'Standard', '$85.00', '$65.00', 'EA', 'Prefab pitch pocket for penetrations'],
      ['Pipe Boot', 'Penetrations', 'Portals Plus', '1-3"', '$45.00', '$35.00', 'EA', 'EPDM pipe boot flashing'],
      ['Pipe Boot', 'Penetrations', 'Portals Plus', '3-6"', '$65.00', '$45.00', 'EA', 'EPDM pipe boot flashing'],
      ['Roof Hatch', 'Access', 'Bilco', '30x36"', '$1,450.00', '$350.00', 'EA', 'Aluminum roof access hatch'],
      ['Roof Hatch', 'Access', 'Bilco', '36x48"', '$1,850.00', '$400.00', 'EA', 'Aluminum roof access hatch'],
      ['Skylight Curb', 'Skylights', 'Various', 'Custom', '$125.00', '$85.00', 'LF', 'Prefab metal curb for skylight'],
      // Waterproofing
      ['PMMA Primer', 'Waterproofing', 'Soprema', 'RS 276', '$2.50', '$1.50', 'SF', 'Alsan RS 276 primer'],
      ['PMMA Membrane', 'Waterproofing', 'Soprema', 'RS 230', '$6.50', '$4.00', 'SF', 'Alsan RS 230 waterproofing'],
      ['PMMA Finish', 'Waterproofing', 'Soprema', 'RS 289', '$3.50', '$2.50', 'SF', 'Alsan RS 289 textured finish'],
      ['Fluid Applied WP', 'Waterproofing', 'Tremco', 'Vulkem', '$4.25', '$3.00', 'SF', 'Tremco Vulkem fluid applied'],
      ['Sheet Membrane', 'Waterproofing', 'Grace', 'Ice & Water', '$2.25', '$1.25', 'SF', 'Self-adhered sheet membrane'],
      // Misc
      ['Fiber Cant', 'Accessories', 'Various', '4x4"', '$2.50', '$1.50', 'LF', 'Perlite fiber cant strip'],
      ['Wood Nailer', 'Accessories', 'PT Lumber', '2x6"', '$3.50', '$4.00', 'LF', 'Pressure treated blocking'],
      ['Wood Nailer', 'Accessories', 'PT Lumber', '2x8"', '$4.50', '$4.50', 'LF', 'Pressure treated blocking'],
      ['Walkway Pads', 'Protection', 'Various', '30x30"', '$8.50', '$2.00', 'EA', 'Rubber walkway protection pads'],
      ['Protection Board', 'Protection', 'GP', '1/2"', '$1.25', '$0.50', 'SF', 'DensDeck protection board'],
    ]},

    // ============ GC HISTORY ============
    // Pre-populated with sample past projects for this GC
    { range: 'GC History!A1:H15', values: [
      ['Project Name', 'Address', 'Date', 'System Used', 'Total Amount', 'Notes', 'Contact', 'Preferences'],
      ['456 Atlantic Ave', '456 Atlantic Ave, Brooklyn NY', '2024-08-15', 'Firestone APP 160/180 R-30', '$125,400', 'Completed on time, GC was very happy', 'Mike Johnson', 'Prefers white membrane, needs 48hr notice for inspections'],
      ['789 Fulton St', '789 Fulton St, Brooklyn NY', '2024-03-22', 'Carlisle TPO 60mil R-25', '$89,200', 'Added 2 change orders for additional drains', 'Mike Johnson', 'Always requests detailed daily reports'],
      ['122 Smith St', '122 Smith St, Brooklyn NY', '2023-11-10', 'Firestone APP 160/180 R-25', '$156,800', 'Large project, phased over 3 months', 'Sarah Chen', 'Prefers phased billing, pays within 15 days'],
      ['55 Court St', '55 Court St, Brooklyn NY', '2023-06-05', 'Soprema PMMA', '$42,300', 'Balcony waterproofing only', 'Mike Johnson', 'Very particular about finish texture'],
      ['888 Bergen St', '888 Bergen St, Brooklyn NY', '2023-02-18', 'Firestone TPO 80mil R-30', '$198,500', 'New construction, coordinated with other trades', 'Sarah Chen', 'Requires safety meetings before each phase'],
      ['234 Dean St', '234 Dean St, Brooklyn NY', '2022-09-30', 'GAF TPO 60mil R-25', '$67,800', 'Reroof with full tear-off', 'Mike Johnson', 'Budget conscious, open to value engineering'],
      ['', '', '', '', '', '', '', ''],
      ['=== GC PREFERENCES SUMMARY ===', '', '', '', '', '', '', ''],
      ['Preferred Systems:', 'Firestone APP, Carlisle TPO', '', '', '', '', '', ''],
      ['Payment Terms:', 'Net 15, phased billing preferred', '', '', '', '', '', ''],
      ['Communication:', 'Daily reports required, 48hr inspection notice', '', '', '', '', '', ''],
      ['Special Notes:', 'Quality focused, willing to pay for premium systems', '', '', '', '', '', ''],
    ]},
  ]

  const result = await batchUpdate(sheetId, updates)
  console.log('Updated', result.totalUpdatedCells, 'cells')
  console.log('Done! View sheet at: https://docs.google.com/spreadsheets/d/' + sheetId)
}

main().catch(console.error)
