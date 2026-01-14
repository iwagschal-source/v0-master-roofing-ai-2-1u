/**
 * Bluebeam CSV Converter API
 *
 * Converts Bluebeam markup export CSV files into structured takeoff data.
 * Proxies to backend /v1/bluebeam/convert or processes locally.
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://34.95.128.208'

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

  const items = []
  const itemMap = {} // Group by subject

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    // Parse CSV line (handle quoted values with commas)
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

    // Group by subject
    if (!itemMap[subject]) {
      itemMap[subject] = {
        subject,
        labels: [],
        total_quantity: 0,
        unit,
        spaces: [],
        pages: []
      }
    }

    itemMap[subject].total_quantity += quantity
    if (label && !itemMap[subject].labels.includes(label)) {
      itemMap[subject].labels.push(label)
    }
    if (space && !itemMap[subject].spaces.includes(space)) {
      itemMap[subject].spaces.push(space)
    }
    if (page && !itemMap[subject].pages.includes(page)) {
      itemMap[subject].pages.push(page)
    }
  }

  // Convert to array
  for (const key of Object.keys(itemMap)) {
    const item = itemMap[key]
    items.push({
      item_name: item.subject,
      description: item.labels.join(', ') || item.subject,
      quantity: Math.round(item.total_quantity * 100) / 100,
      unit: item.unit,
      spaces: item.spaces,
      pages: item.pages,
      rate: null,
      total: null
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
 * Match items to Master Roofing template categories
 */
function categorizeItems(items) {
  const categories = {
    roofing_systems: [],
    metal_work: [],
    accessories: [],
    misc: []
  }

  // Keywords for categorization
  const roofingKeywords = ['roof', 'membrane', 'epdm', 'tpo', 'mod bit', 'shingle', 'insulation', 'cover board', 'gypsum']
  const metalKeywords = ['coping', 'flashing', 'edge metal', 'gravel stop', 'counter', 'cap', 'reglet', 'drip']
  const accessoryKeywords = ['drain', 'scupper', 'vent', 'pitch pan', 'stack', 'curb', 'skylight', 'hatch']

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
 * POST /api/ko/bluebeam/convert
 * Convert Bluebeam CSV to structured takeoff data
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { csv_content, project_name, project_id } = body

    if (!csv_content) {
      return NextResponse.json(
        { error: 'csv_content is required' },
        { status: 400 }
      )
    }

    // Try backend first
    try {
      const backendRes = await fetch(`${BACKEND_URL}/v1/bluebeam/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_content, project_name, project_id }),
        signal: AbortSignal.timeout(30000)
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
      console.log('Backend not available for Bluebeam conversion, processing locally')
    }

    // Local processing
    const items = parseBluebeamCSV(csv_content)
    const categories = categorizeItems(items)

    // Calculate summary
    const totalItems = items.length
    const totalMeasurements = items.reduce((sum, item) => sum + (item.quantity || 0), 0)

    // Estimate costs using rough rates (will be overwritten with actual rates)
    let estimatedCost = 0
    for (const item of items) {
      const unit = item.unit?.toUpperCase() || 'EA'
      // Rough estimates
      if (unit === 'SF') {
        item.rate = 12 // $12/SF default for roofing
        item.total = Math.round(item.quantity * item.rate)
      } else if (unit === 'LF') {
        item.rate = 25 // $25/LF default for metal
        item.total = Math.round(item.quantity * item.rate)
      } else {
        item.rate = 150 // $150/EA default for accessories
        item.total = Math.round(item.quantity * item.rate)
      }
      estimatedCost += item.total
    }

    return NextResponse.json({
      success: true,
      items,
      categories,
      summary: {
        total_items: totalItems,
        total_measurements: Math.round(totalMeasurements),
        estimated_cost: estimatedCost,
        breakdown: {
          roofing_systems: categories.roofing_systems.length,
          metal_work: categories.metal_work.length,
          accessories: categories.accessories.length,
          misc: categories.misc.length
        }
      },
      project_name: project_name || 'Untitled',
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
