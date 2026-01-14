/**
 * Bluebeam CSV Converter API
 *
 * Converts Bluebeam markup export CSV files into structured takeoff data.
 * Returns both:
 * - items: array for React EstimatingSheet
 * - template_data: object for Google Sheets populate-takeoff
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://34.95.128.208'

// MR Template rates by scope item
const MR_RATES = {
  // Roofing
  'vapor barrier': 6.95,
  'temp waterproofing': 6.95,
  'pitch': 1.50,
  'built-up': 16.25,
  '2 ply': 16.25,
  '3 ply': 18.50,
  'mod bit': 14.00,
  'tpo': 12.00,
  'epdm': 11.00,
  'irma': 18.00,
  'up and over': 12.00,
  'scupper': 2500.00,
  'gutter': 2500.00,
  'pmma': 48.00,
  'drain': 550.00,
  'doorpan': 550.00,
  'door pan': 550.00,
  'hatch': 48.00,
  'skylight': 48.00,
  'fence post': 250.00,
  'railing': 250.00,
  'plumbing': 250.00,
  'mechanical': 250.00,
  'davit': 150.00,
  'ac unit': 550.00,
  'dunnage': 550.00,
  'coping': 32.00,
  'gravel stop': 32.00,
  'edge metal': 32.00,
  'flashing': 24.00,
  'counter': 24.00,
  'reglet': 24.00,
  'overburden': 14.00,
  'paver': 24.00,
  'green roof': 48.00,
  'insulation': 8.00,
  'cover board': 4.50,
  // Balconies
  'traffic coating': 17.00,
  'drip edge': 22.00,
  'l flashing': 48.00,
  'liquid l': 48.00,
  // Exterior
  'brick': 5.25,
  'panel': 5.25,
  'eifs': 5.25,
  'stucco': 17.00,
  'drip cap': 33.00,
  'sill': 33.00,
  'tie-in': 48.00,
  'tie in': 48.00,
}

// Floor name mappings - must match populate-takeoff FLOOR_TO_COLUMN keys
const FLOOR_MAPPINGS = {
  'cellar': '1st Floor',       // Map cellar to 1st floor column
  'basement': '1st Floor',
  'ground': '1st Floor',
  '1st': '1st Floor',
  'first': '1st Floor',
  '2nd': '2nd Floor',
  'second': '2nd Floor',
  '3rd': '3rd Floor',
  'third': '3rd Floor',
  '4th': '4th Floor',
  'fourth': '4th Floor',
  '5th': '4th Floor',          // Map 5th+ to 4th (template only has 4 floor columns)
  'fifth': '4th Floor',
  '6th': '4th Floor',
  'sixth': '4th Floor',
  '7th': '4th Floor',
  'seventh': '4th Floor',
  'roof': 'Main Roof',
  'main roof': 'Main Roof',
  'main': 'Main Roof',
  'bulkhead': 'Stair Bulkhead',
  'stair bh': 'Stair Bulkhead',
  'stair bulkhead': 'Stair Bulkhead',
  'bh': 'Stair Bulkhead',
  'elevator': 'Elev Bulkhead',
  'elev': 'Elev Bulkhead',
  'elev bh': 'Elev Bulkhead',
  'elevator bulkhead': 'Elev Bulkhead',
}

/**
 * Normalize floor/space name to standard format
 */
function normalizeFloor(space) {
  if (!space) return 'Main Roof' // Default to main roof
  const spaceLower = space.toLowerCase().trim()

  for (const [key, value] of Object.entries(FLOOR_MAPPINGS)) {
    if (spaceLower.includes(key)) {
      return value
    }
  }

  // Check for floor numbers like "Floor 3" or "Level 2"
  const floorMatch = spaceLower.match(/(?:floor|level|flr|lvl)\s*(\d+)/i)
  if (floorMatch) {
    const num = parseInt(floorMatch[1])
    if (num === 1) return 'GROUND Floor'
    if (num <= 7) return `${num}${num === 2 ? 'nd' : num === 3 ? 'rd' : 'th'} Floor`
  }

  return 'Main Roof' // Default
}

/**
 * Get rate for a scope item
 */
function getRate(itemName, unit) {
  const nameLower = itemName.toLowerCase()

  for (const [keyword, rate] of Object.entries(MR_RATES)) {
    if (nameLower.includes(keyword)) {
      return rate
    }
  }

  // Default rates by unit
  if (unit === 'SF') return 12.00
  if (unit === 'LF') return 25.00
  return 150.00 // EA
}

/**
 * Parse Bluebeam CSV export into structured takeoff items
 * CSV format: Subject,Label,Space,Measurement,Author,Date,Markup Type,Color,Page Label
 */
function parseBluebeamCSV(csvContent) {
  const lines = csvContent.trim().split('\n')
  if (lines.length < 2) {
    throw new Error('CSV file is empty or has no data rows')
  }

  // Parse header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  const subjectIdx = header.indexOf('subject')
  const labelIdx = header.indexOf('label')
  const measurementIdx = header.indexOf('measurement')
  const spaceIdx = header.indexOf('space')
  const pageIdx = header.indexOf('page label')

  if (subjectIdx === -1) {
    throw new Error('CSV must have a "Subject" column')
  }

  // Group by subject AND space for floor breakdown
  const itemMap = {} // { subject: { floors: { floorName: qty }, total: qty, unit, labels, pages } }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const values = parseCSVLine(line)

    const subject = values[subjectIdx]?.trim() || ''
    const label = labelIdx >= 0 ? values[labelIdx]?.trim() : ''
    const measurement = measurementIdx >= 0 ? values[measurementIdx]?.trim() : ''
    const space = spaceIdx >= 0 ? values[spaceIdx]?.trim() : ''
    const page = pageIdx >= 0 ? values[pageIdx]?.trim() : ''

    if (!subject) continue

    // Parse measurement (e.g., "1234.56 SF" or "567.89 LF")
    const measurementMatch = measurement.match(/([\d,]+\.?\d*)\s*(\w+)?/)
    const quantity = measurementMatch ? parseFloat(measurementMatch[1].replace(/,/g, '')) : 0
    const unit = measurementMatch ? (measurementMatch[2] || 'EA').toUpperCase() : 'EA'

    // Normalize floor name
    const floorName = normalizeFloor(space)

    // Initialize subject if not exists
    if (!itemMap[subject]) {
      itemMap[subject] = {
        subject,
        labels: [],
        floors: {},
        total_quantity: 0,
        unit,
        pages: []
      }
    }

    // Add to floor
    itemMap[subject].floors[floorName] = (itemMap[subject].floors[floorName] || 0) + quantity
    itemMap[subject].total_quantity += quantity

    if (label && !itemMap[subject].labels.includes(label)) {
      itemMap[subject].labels.push(label)
    }
    if (page && !itemMap[subject].pages.includes(page)) {
      itemMap[subject].pages.push(page)
    }
  }

  // Convert to items array
  const items = []
  for (const key of Object.keys(itemMap)) {
    const item = itemMap[key]
    const rate = getRate(item.subject, item.unit)
    const total = Math.round(item.total_quantity * rate)

    items.push({
      item_name: item.subject,
      description: item.labels.join(', ') || item.subject,
      quantity: Math.round(item.total_quantity * 100) / 100,
      unit: item.unit,
      floors: item.floors,
      pages: item.pages,
      rate,
      total
    })
  }

  return items
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      values.push(current.replace(/^"|"$/g, '').trim())
      current = ''
    } else {
      current += char
    }
  }
  values.push(current.replace(/^"|"$/g, '').trim())

  return values
}

/**
 * Convert items to Google Sheets template_data format
 */
function convertToTemplateData(items, projectName) {
  const rows = items.map(item => ({
    unit_cost: item.rate || 0,
    scope: item.item_name,
    floors: item.floors || {},
    total_qty: item.quantity || 0,
    total_cost: item.total || 0
  }))

  return {
    project_name: projectName || 'Untitled',
    rows
  }
}

/**
 * Match items to Master Roofing template categories
 */
function categorizeItems(items) {
  const categories = {
    roofing_systems: [],
    metal_work: [],
    accessories: [],
    misc: []
  }

  const roofingKeywords = ['roof', 'membrane', 'epdm', 'tpo', 'mod bit', 'shingle', 'insulation', 'cover board', 'gypsum', 'built-up', 'ply', 'irma']
  const metalKeywords = ['coping', 'flashing', 'edge metal', 'gravel stop', 'counter', 'cap', 'reglet', 'drip']
  const accessoryKeywords = ['drain', 'scupper', 'vent', 'pitch pan', 'stack', 'curb', 'skylight', 'hatch', 'doorpan', 'door pan', 'ac unit', 'dunnage']

  for (const item of items) {
    const nameLower = item.item_name.toLowerCase()

    if (roofingKeywords.some(k => nameLower.includes(k))) {
      categories.roofing_systems.push(item)
    } else if (metalKeywords.some(k => nameLower.includes(k))) {
      categories.metal_work.push(item)
    } else if (accessoryKeywords.some(k => nameLower.includes(k))) {
      categories.accessories.push(item)
    } else {
      categories.misc.push(item)
    }
  }

  return categories
}

/**
 * Fetch historical rates from BigQuery
 * @param {string} gcName - Optional GC name for GC-specific rates
 * @returns {Promise<Object>} - Rate lookup map
 */
async function fetchHistoricalRates(gcName = null) {
  try {
    const url = new URL('/api/ko/rates', 'http://localhost:3000')
    if (gcName) url.searchParams.set('gcName', gcName)

    // Use internal fetch (same server)
    const { getAverageRates } = await import('@/lib/bigquery')
    const rates = await getAverageRates(gcName)

    // Convert to simple rate map
    const rateMap = {}
    for (const [key, data] of Object.entries(rates)) {
      rateMap[key] = data.avgRate
    }
    return rateMap
  } catch (err) {
    console.log('Historical rates unavailable:', err.message)
    return {}
  }
}

/**
 * Apply historical rates to items
 * @param {Array} items - Parsed items
 * @param {Object} historicalRates - Rate lookup from BigQuery
 * @returns {Array} - Items with updated rates
 */
function applyHistoricalRates(items, historicalRates) {
  return items.map(item => {
    const nameLower = item.item_name.toLowerCase()

    // Try to find a matching historical rate
    let historicalRate = null
    for (const [keyword, rate] of Object.entries(historicalRates)) {
      if (nameLower.includes(keyword) || keyword.includes(nameLower)) {
        historicalRate = rate
        break
      }
    }

    if (historicalRate && historicalRate > 0) {
      return {
        ...item,
        rate: historicalRate,
        total: Math.round(item.quantity * historicalRate),
        rate_source: 'historical'
      }
    }

    return { ...item, rate_source: 'default' }
  })
}

/**
 * POST /api/ko/bluebeam/convert
 * Convert Bluebeam CSV to structured takeoff data
 *
 * Body params:
 * - csv_content: CSV file content (required)
 * - project_name: Project name
 * - project_id: Project ID
 * - gc_name: GC name for GC-specific historical rates
 * - use_historical_rates: Boolean to enable historical rate lookup
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { csv_content, project_name, project_id, gc_name, use_historical_rates } = body

    if (!csv_content) {
      return NextResponse.json(
        { error: 'csv_content is required' },
        { status: 400 }
      )
    }

    // Try backend first (may have better parsing/ML matching)
    try {
      const backendRes = await fetch(`${BACKEND_URL}/v1/bluebeam/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content, project_name, project_id, gc_name, use_historical_rates }),
        signal: AbortSignal.timeout(10000) // 10s timeout
      })

      if (backendRes.ok) {
        const data = await backendRes.json()
        return NextResponse.json({
          success: true,
          ...data,
          source: 'backend'
        })
      }
    } catch (err) {
      console.log('Backend not available, processing locally')
    }

    // Local processing
    let items = parseBluebeamCSV(csv_content)

    // Fetch and apply historical rates if requested
    let rateSource = 'default'
    if (use_historical_rates) {
      const historicalRates = await fetchHistoricalRates(gc_name)
      if (Object.keys(historicalRates).length > 0) {
        items = applyHistoricalRates(items, historicalRates)
        rateSource = 'historical'
      }
    }

    const categories = categorizeItems(items)
    const template_data = convertToTemplateData(items, project_name)

    // Calculate summary
    const totalItems = items.length
    const totalMeasurements = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
    const estimatedCost = items.reduce((sum, item) => sum + (item.total || 0), 0)
    const historicalCount = items.filter(i => i.rate_source === 'historical').length

    return NextResponse.json({
      success: true,
      items,
      categories,
      template_data, // For Google Sheets
      summary: {
        total_items: totalItems,
        total_measurements: Math.round(totalMeasurements),
        estimated_cost: estimatedCost,
        scope_items: totalItems,
        historical_rates_used: historicalCount,
        breakdown: {
          roofing_systems: categories.roofing_systems.length,
          metal_work: categories.metal_work.length,
          accessories: categories.accessories.length,
          misc: categories.misc.length
        }
      },
      project_name: project_name || 'Untitled',
      gc_name: gc_name || null,
      rate_source: rateSource,
      source: 'local'
    })

  } catch (err) {
    console.error('Bluebeam conversion error:', err)
    return NextResponse.json(
      { error: 'Failed to convert CSV: ' + err.message },
      { status: 500 }
    )
  }
}
