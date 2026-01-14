/**
 * Historical Rates API
 *
 * GET /api/ko/rates - Get average rates for scope items from BigQuery
 * Query params:
 *   - gcName: Optional GC name for GC-specific pricing
 *   - items: Comma-separated list of item names to look up
 *
 * Returns rates based on 700K+ historical takeoff line items
 */

import { NextResponse } from 'next/server'
import { getAverageRates, getRateForItem } from '@/lib/bigquery'

// Fallback hardcoded rates (MR defaults)
const DEFAULT_RATES = {
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
  'traffic coating': 17.00,
  'drip edge': 22.00,
  'l flashing': 48.00,
  'brick': 5.25,
  'panel': 5.25,
  'eifs': 5.25,
  'stucco': 17.00,
  'drip cap': 33.00,
  'sill': 33.00,
  'tie-in': 48.00,
  'roofing': 12.00,
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const gcName = searchParams.get('gcName')
  const itemsParam = searchParams.get('items')

  try {
    // If specific items requested, look them up individually
    if (itemsParam) {
      const items = itemsParam.split(',').map(i => i.trim())
      const results = {}

      for (const item of items) {
        // Try BigQuery first
        const bqRate = await getRateForItem(item, null, gcName)
        if (bqRate) {
          results[item] = {
            rate: bqRate.avgRate,
            source: 'historical',
            ...bqRate,
          }
        } else {
          // Fall back to defaults
          const defaultRate = findDefaultRate(item)
          results[item] = {
            rate: defaultRate,
            source: 'default',
          }
        }
      }

      return NextResponse.json({
        success: true,
        rates: results,
        gcName: gcName || 'all',
      })
    }

    // Otherwise, get all average rates
    const historicalRates = await getAverageRates(gcName)

    // Merge with defaults (historical takes precedence)
    const mergedRates = { ...DEFAULT_RATES }
    for (const [key, data] of Object.entries(historicalRates)) {
      // Only use historical if we have enough samples
      if (data.sampleCount >= 5) {
        mergedRates[key] = data.avgRate
      }
    }

    return NextResponse.json({
      success: true,
      rates: mergedRates,
      historicalCount: Object.keys(historicalRates).length,
      gcName: gcName || 'all',
      source: 'bigquery+defaults',
    })

  } catch (error) {
    console.error('Rates API error:', error)

    // Return defaults on error
    return NextResponse.json({
      success: true,
      rates: DEFAULT_RATES,
      source: 'defaults_only',
      error: error.message,
    })
  }
}

/**
 * Find default rate for an item by keyword matching
 */
function findDefaultRate(itemName) {
  const nameLower = itemName.toLowerCase()

  for (const [keyword, rate] of Object.entries(DEFAULT_RATES)) {
    if (nameLower.includes(keyword)) {
      return rate
    }
  }

  // Default by common patterns
  if (nameLower.includes('sf') || nameLower.includes('area')) return 12.00
  if (nameLower.includes('lf') || nameLower.includes('linear')) return 25.00
  return 150.00 // EA default
}
