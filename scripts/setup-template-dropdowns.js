/**
 * Script to set up dropdown selections in the KO Proposal Template Google Sheet
 *
 * This adds:
 * - A "Lookups" sheet with all scope items and their descriptions
 * - Data validation (dropdowns) in the Systems and Pricing tabs
 * - Unit type dropdowns (SF, LF, EA, etc.)
 *
 * Run with: node scripts/setup-template-dropdowns.js [sheetId]
 *
 * If no sheetId provided, it will use GOOGLE_SHEET_TEMPLATE_ID from env
 */

const crypto = require('crypto')
require('dotenv').config({ path: '.env.local' })

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
]

// ============================================
// SCOPE ITEMS - These appear in the dropdown
// ============================================
const SCOPE_ITEMS = [
  // Roofing Systems
  { category: 'Roofing', name: 'Built-Up Roofing (2-Ply Torchdown)', description: 'Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads. Lead sheets installed and sealed at all drains. Assembly includes torch-applied Firestone APP160 smooth base ply and APP180 white granulated cap sheet with 3" laps, with walls and curbs primed and flashed 12" up using APP160/180 binder flashing. Door pans furnished and installed at openings.' },
  { category: 'Roofing', name: 'Built-Up Roofing (3-Ply)', description: 'Built-up roof system with three-ply application for enhanced durability.' },
  { category: 'Roofing', name: 'TPO Roofing System', description: 'Thermoplastic polyolefin single-ply roofing membrane, mechanically fastened or fully adhered.' },
  { category: 'Roofing', name: 'EPDM Roofing System', description: 'Ethylene propylene diene monomer rubber roofing membrane system.' },
  { category: 'Roofing', name: 'Modified Bitumen Roofing', description: 'Modified bitumen roofing system with SBS or APP modifier.' },

  // Coping & Flashing
  { category: 'Coping & Flashing', name: 'Aluminum Coping - High Parapet', description: 'Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.' },
  { category: 'Coping & Flashing', name: 'Aluminum Coping - Low Parapet', description: 'Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.' },
  { category: 'Coping & Flashing', name: 'Aluminum Counter Flashing', description: 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".' },
  { category: 'Coping & Flashing', name: 'Metal Flashing @ Building Wall', description: 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".' },
  { category: 'Coping & Flashing', name: 'Metal Flashing @ Parapet Wall', description: 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".' },
  { category: 'Coping & Flashing', name: 'Drip Edge', description: 'Aluminum drip edge installed at roof perimeter terminations.' },

  // EIFS
  { category: 'EIFS', name: 'EIFS - Standard (3" EPS)', description: 'Scope includes priming and waterproofing window heads, jambs, and sills with air and vapor barrier, sealing all joints with mesh tape. Apply continuous air and moisture barrier, followed by 3" EIFS EPS insulation (R-11.4), base coat with mesh, and finish coat. Caulk and seal all window and door perimeters.' },
  { category: 'EIFS', name: 'EIFS - Thick (4" EPS)', description: 'Scope includes priming and waterproofing window heads, jambs, and sills with air and vapor barrier, sealing all joints with mesh tape. Apply continuous air and moisture barrier, followed by 4" EIFS EPS insulation, base coat with mesh, and finish coat. Caulk and seal all window and door perimeters.' },
  { category: 'EIFS', name: 'EIFS - Walls Only', description: 'EIFS application to wall surfaces only, excluding window/door detailing.' },

  // Waterproofing
  { category: 'Waterproofing', name: 'Balcony Waterproofing (PMMA)', description: 'Balcony waterproofing includes application of Alsan RS 276 Primer, Alsan RS 230 flashing 12" up walls, and Alsan RS 289 Textured Finish with color pack. Aluminum drip edge installed at perimeter terminations as required.' },
  { category: 'Waterproofing', name: 'Traffic Coating', description: 'Balcony waterproofing includes application of Alsan RS 276 Primer, Alsan RS 230 flashing 12" up walls, and Alsan RS 289 Textured Finish with color pack. Aluminum drip edge installed at perimeter terminations as required.' },
  { category: 'Waterproofing', name: 'Brick Area Waterproofing', description: 'Prime and waterproof window heads, jambs, and sills with an air-vapor barrier membrane, then apply a continuous air-vapor-water barrier over exterior brick walls. The membrane is installed to provide a seamless moisture and air seal around all openings and across the wall surface.' },
  { category: 'Waterproofing', name: 'Recessed Floor Waterproofing', description: 'Prepare the recessed concrete slab by scarifying to achieve a clean, smooth surface, then apply a uniform coat of Soprema RS 276 primer. Install new flashings using Soprema RS 230 Flash grade PMMA resin with Alsan RS fleece reinforcement around all terminations and penetrations, followed by application of the field membrane consisting of Soprema RS 230 Flash grade PMMA with fleece.' },
  { category: 'Waterproofing', name: 'Tie-In (PMMA)', description: 'Apply PMMA waterproofing membrane where the floor meets the foundation.' },
  { category: 'Waterproofing', name: 'Below Grade Waterproofing', description: 'Below grade waterproofing membrane application per manufacturer specifications.' },
  { category: 'Waterproofing', name: 'Plaza Deck Waterproofing', description: 'Plaza deck waterproofing system with protection course and drainage mat.' },

  // Accessories
  { category: 'Accessories', name: 'Roof Drains', description: 'Furnish and install roof drains with lead sheets, primed and sealed with water block sealer.' },
  { category: 'Accessories', name: 'Doorpans - Standard', description: 'Furnish and install standard door pans at door openings, fully waterproofed and sealed.' },
  { category: 'Accessories', name: 'Doorpans - Large', description: 'Furnish and install large door pans at door openings, fully waterproofed and sealed.' },
  { category: 'Accessories', name: 'Scupper/Gutter and Leader', description: 'Furnish and install scupper, gutter, and leader assembly for roof drainage.' },
  { category: 'Accessories', name: 'Pitch Pockets', description: 'Install pitch pockets at penetrations, filled with appropriate sealant.' },
  { category: 'Accessories', name: 'Pipe Boots', description: 'Install pipe boots at pipe penetrations with proper flashing.' },

  // Insulation & Misc
  { category: 'Insulation & Misc', name: 'Up and Over', description: 'Install waterproofing membrane up and over parapet walls and bulkheads.' },
  { category: 'Insulation & Misc', name: 'Vapor Barrier', description: 'Install vapor barrier or temporary waterproofing membrane as specified.' },
  { category: 'Insulation & Misc', name: 'Insulation under Coping', description: 'Install insulation under coping per manufacturer specifications.' },
  { category: 'Insulation & Misc', name: 'Tapered Insulation System', description: 'Furnish and install tapered insulation system to provide positive drainage.' },
  { category: 'Insulation & Misc', name: 'Cover Board (DensDeck)', description: 'Install DensDeck or equivalent cover board over insulation.' },
  { category: 'Insulation & Misc', name: 'Wood Blocking', description: 'Install wood blocking at parapets, curbs, and equipment supports.' },
]

// Unit types for quantity measurements
const UNIT_TYPES = [
  'SF',   // Square Feet
  'LF',   // Linear Feet
  'EA',   // Each
  'SQ',   // Roofing Square (100 SF)
  'CY',   // Cubic Yards
  'GAL',  // Gallons
  'LS',   // Lump Sum
]

// R-Value options for insulation
const R_VALUES = [
  'R-10', 'R-15', 'R-20', 'R-25', 'R-30', 'R-33', 'R-38', 'R-40', 'R-45', 'R-50'
]

// Thickness options
const THICKNESS_OPTIONS = [
  '1"', '1.5"', '2"', '2.5"', '3"', '3.5"', '4"', '4.5"', '5"', '5.5"', '6"', '6.5"', '7"', '8"'
]

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !privateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY')
  }

  console.log('Service account:', email)

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: email,
    sub: 'rfp@masterroofingus.com',
    scope: SCOPES.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  const sign = crypto.createSign('RSA-SHA256')
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

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}

async function getSheetInfo(accessToken, sheetId) {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get sheet info: ${error}`)
  }

  return response.json()
}

async function setupTemplateDropdowns(sheetId) {
  console.log('Getting access token...')
  const accessToken = await getAccessToken()
  console.log('Access token obtained!')

  // Get sheet info to find sheet IDs
  console.log('\nGetting sheet information...')
  const sheetInfo = await getSheetInfo(accessToken, sheetId)
  console.log(`Found ${sheetInfo.sheets.length} sheets`)

  // Find or create Lookups sheet
  let lookupsSheetId = null
  let systemsSheetId = null
  let pricingSheetId = null

  for (const sheet of sheetInfo.sheets) {
    const title = sheet.properties.title
    if (title === 'Lookups') lookupsSheetId = sheet.properties.sheetId
    if (title === 'Systems') systemsSheetId = sheet.properties.sheetId
    if (title === 'Pricing') pricingSheetId = sheet.properties.sheetId
  }

  const requests = []

  // Create Lookups sheet if it doesn't exist
  if (lookupsSheetId === null) {
    console.log('Creating Lookups sheet...')
    requests.push({
      addSheet: {
        properties: { title: 'Lookups' }
      }
    })
  }

  // Execute sheet creation if needed
  if (requests.length > 0) {
    const createResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }
    )

    if (!createResponse.ok) {
      const error = await createResponse.text()
      throw new Error(`Failed to create sheets: ${error}`)
    }

    const result = await createResponse.json()
    // Get the new Lookups sheet ID
    if (result.replies) {
      for (const reply of result.replies) {
        if (reply.addSheet && reply.addSheet.properties.title === 'Lookups') {
          lookupsSheetId = reply.addSheet.properties.sheetId
        }
      }
    }
  }

  // Re-fetch sheet info if we created new sheets
  if (lookupsSheetId === null) {
    const updatedInfo = await getSheetInfo(accessToken, sheetId)
    for (const sheet of updatedInfo.sheets) {
      if (sheet.properties.title === 'Lookups') {
        lookupsSheetId = sheet.properties.sheetId
      }
    }
  }

  // Populate Lookups sheet with scope items
  console.log('\nPopulating Lookups sheet with scope items...')

  // Build the lookup data
  const lookupData = [
    ['Scope Items', 'Category', 'Description', '', 'Units', '', 'R-Values', '', 'Thickness'],
    ...SCOPE_ITEMS.map((item, index) => [
      item.name,
      item.category,
      item.description,
      '',
      index < UNIT_TYPES.length ? UNIT_TYPES[index] : '',
      '',
      index < R_VALUES.length ? R_VALUES[index] : '',
      '',
      index < THICKNESS_OPTIONS.length ? THICKNESS_OPTIONS[index] : '',
    ])
  ]

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Lookups!A1:I${lookupData.length}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: lookupData }),
    }
  )

  console.log(`Added ${SCOPE_ITEMS.length} scope items to Lookups sheet`)

  // Now set up data validation (dropdowns) for Systems and Pricing tabs
  console.log('\nSetting up dropdown validations...')

  const validationRequests = []
  const scopeItemCount = SCOPE_ITEMS.length + 1 // +1 for header

  // Systems tab - Column A (Scope Item dropdown) for rows 2-50
  if (systemsSheetId !== null) {
    validationRequests.push({
      setDataValidation: {
        range: {
          sheetId: systemsSheetId,
          startRowIndex: 1,
          endRowIndex: 50,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        rule: {
          condition: {
            type: 'ONE_OF_RANGE',
            values: [{ userEnteredValue: `=Lookups!$A$2:$A$${scopeItemCount}` }],
          },
          showCustomUi: true,
          strict: false,
        },
      },
    })

    // Systems tab - Column B (Thickness dropdown)
    validationRequests.push({
      setDataValidation: {
        range: {
          sheetId: systemsSheetId,
          startRowIndex: 1,
          endRowIndex: 50,
          startColumnIndex: 1,
          endColumnIndex: 2,
        },
        rule: {
          condition: {
            type: 'ONE_OF_RANGE',
            values: [{ userEnteredValue: `=Lookups!$I$2:$I$${THICKNESS_OPTIONS.length + 1}` }],
          },
          showCustomUi: true,
          strict: false,
        },
      },
    })

    // Systems tab - Column C (R-Value dropdown)
    validationRequests.push({
      setDataValidation: {
        range: {
          sheetId: systemsSheetId,
          startRowIndex: 1,
          endRowIndex: 50,
          startColumnIndex: 2,
          endColumnIndex: 3,
        },
        rule: {
          condition: {
            type: 'ONE_OF_RANGE',
            values: [{ userEnteredValue: `=Lookups!$G$2:$G$${R_VALUES.length + 1}` }],
          },
          showCustomUi: true,
          strict: false,
        },
      },
    })

    // Systems tab - Column E (Unit dropdown)
    validationRequests.push({
      setDataValidation: {
        range: {
          sheetId: systemsSheetId,
          startRowIndex: 1,
          endRowIndex: 50,
          startColumnIndex: 4,
          endColumnIndex: 5,
        },
        rule: {
          condition: {
            type: 'ONE_OF_RANGE',
            values: [{ userEnteredValue: `=Lookups!$E$2:$E$${UNIT_TYPES.length + 1}` }],
          },
          showCustomUi: true,
          strict: false,
        },
      },
    })
  }

  // Pricing tab - Column A (Item dropdown) for rows 2-100
  if (pricingSheetId !== null) {
    validationRequests.push({
      setDataValidation: {
        range: {
          sheetId: pricingSheetId,
          startRowIndex: 1,
          endRowIndex: 100,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        rule: {
          condition: {
            type: 'ONE_OF_RANGE',
            values: [{ userEnteredValue: `=Lookups!$A$2:$A$${scopeItemCount}` }],
          },
          showCustomUi: true,
          strict: false,
        },
      },
    })

    // Pricing tab - Column D (Unit dropdown)
    validationRequests.push({
      setDataValidation: {
        range: {
          sheetId: pricingSheetId,
          startRowIndex: 1,
          endRowIndex: 100,
          startColumnIndex: 3,
          endColumnIndex: 4,
        },
        rule: {
          condition: {
            type: 'ONE_OF_RANGE',
            values: [{ userEnteredValue: `=Lookups!$E$2:$E$${UNIT_TYPES.length + 1}` }],
          },
          showCustomUi: true,
          strict: false,
        },
      },
    })

    // Add formula for auto-populating description based on selected item
    // Column B = VLOOKUP to get description from Lookups
    console.log('Adding VLOOKUP formulas for descriptions...')
    const descFormulas = []
    for (let i = 2; i <= 100; i++) {
      descFormulas.push([`=IF(A${i}="","",VLOOKUP(A${i},Lookups!A:C,3,FALSE))`])
    }

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Pricing!B2:B100?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: descFormulas }),
      }
    )
  }

  // Apply validation rules
  if (validationRequests.length > 0) {
    const validationResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: validationRequests }),
      }
    )

    if (!validationResponse.ok) {
      const error = await validationResponse.text()
      console.log('Warning: Could not set validations:', error)
    } else {
      console.log('Dropdown validations set successfully!')
    }
  }

  // Format the Lookups sheet
  console.log('\nFormatting Lookups sheet...')
  const formatRequests = [
    // Bold header row
    {
      repeatCell: {
        range: {
          sheetId: lookupsSheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { bold: true },
            backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
          },
        },
        fields: 'userEnteredFormat(textFormat,backgroundColor)',
      },
    },
    // Auto-resize columns
    {
      autoResizeDimensions: {
        dimensions: {
          sheetId: lookupsSheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 3,
        },
      },
    },
  ]

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: formatRequests }),
    }
  )

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`

  console.log('\n========================================')
  console.log('DROPDOWNS SETUP COMPLETE!')
  console.log('========================================')
  console.log(`\nSheet URL: ${sheetUrl}`)
  console.log('\nDropdowns added to:')
  console.log('  - Systems tab: Column A (Scope Items), B (Thickness), C (R-Value), E (Units)')
  console.log('  - Pricing tab: Column A (Items), D (Units)')
  console.log(`\nLookups sheet contains ${SCOPE_ITEMS.length} scope items with descriptions`)
  console.log('========================================\n')

  return { sheetId, sheetUrl }
}

// Get sheet ID from command line or env
const sheetId = process.argv[2] || process.env.GOOGLE_SHEET_TEMPLATE_ID

if (!sheetId) {
  console.error('Usage: node scripts/setup-template-dropdowns.js [sheetId]')
  console.error('Or set GOOGLE_SHEET_TEMPLATE_ID in .env.local')
  process.exit(1)
}

console.log(`Setting up dropdowns for sheet: ${sheetId}`)

setupTemplateDropdowns(sheetId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
