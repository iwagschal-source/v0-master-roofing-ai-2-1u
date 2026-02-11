/**
 * Takeoff Library API
 *
 * GET /api/ko/takeoff/library
 * Returns all items from BigQuery lib_takeoff_template with optional GC-specific rates
 *
 * Query params:
 *   - gcName: Optional GC name for GC-specific historical rates
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

// Predefined variant options
const VARIANT_OPTIONS = {
  r_values: ['R-11', 'R-13', 'R-15', 'R-19', 'R-21', 'R-30', 'R-38', 'R-49', 'R-60'],
  sizes: ['1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '1"', '1.5"', '2"', '3"', '3.5"', '4"', '6"', '8"', '10"', '12"'],
  material_types: ['Fiberglass', 'Mineral Wool', 'Spray Foam', 'Rigid Foam', 'Cellulose', 'Denim', 'TPO', 'EPDM', 'PVC', 'Mod Bit', 'BUR']
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const gcName = searchParams.get('gcName')

  try {
    // Query lib_takeoff_template from BigQuery
    const libraryQuery = `
      SELECT
        item_id,
        section,
        scope_name,
        default_unit_cost,
        uom,
        sort_order,
        COALESCE(has_r_value, false) as has_r_value,
        COALESCE(has_thickness, false) as has_thickness,
        COALESCE(has_material_type, false) as has_material_type,
        notes
      FROM \`master-roofing-intelligence.mr_main.lib_takeoff_template\`
      ORDER BY sort_order, section, scope_name
    `

    const libraryItems = await runQuery(libraryQuery)

    // If GC name provided, get historical rates from v_estimator_rate_card
    let gcRates = {}
    if (gcName) {
      try {
        const ratesQuery = `
          SELECT
            item_id,
            item_name,
            median_unit_cost,
            avg_unit_cost,
            project_count,
            confidence_level
          FROM \`master-roofing-intelligence.mr_main.estimator_rate_card\`
          WHERE gc_name = @gcName
        `
        const ratesRows = await runQuery(ratesQuery, { gcName })

        // Build lookup map by scope_code (item_id in BigQuery)
        for (const row of ratesRows) {
          gcRates[row.item_id] = {  // Key is item_id from BQ, maps to scope_code
            gc_rate: Math.round(row.median_unit_cost * 100) / 100,
            gc_avg_rate: Math.round(row.avg_unit_cost * 100) / 100,
            gc_project_count: row.project_count,
            confidence: row.confidence_level
          }
        }
      } catch (rateErr) {
        console.warn('Failed to fetch GC rates:', rateErr.message)
        // Continue without GC rates
      }
    }

    // Merge library items with GC rates
    const items = libraryItems.map(item => {
      const result = {
        scope_code: item.item_id,  // Renamed from item_id to avoid confusion with project_id
        section: item.section,
        scope_name: item.scope_name,
        default_unit_cost: parseFloat(item.default_unit_cost) || 0,
        uom: item.uom,
        sort_order: item.sort_order,
        has_r_value: item.has_r_value,
        has_thickness: item.has_thickness,
        has_material_type: item.has_material_type,
        notes: item.notes
      }

      // Add GC-specific rates if available
      if (gcRates[item.scope_code]) {
        Object.assign(result, gcRates[item.scope_code])
      }

      return result
    })

    // Group items by section for easier UI rendering
    const sections = {}
    for (const item of items) {
      const sectionKey = item.section || 'Other'
      if (!sections[sectionKey]) {
        sections[sectionKey] = []
      }
      sections[sectionKey].push(item)
    }

    return NextResponse.json({
      success: true,
      items,
      sections,
      variant_options: VARIANT_OPTIONS,
      total_items: items.length,
      gc_name: gcName || null,
      has_gc_rates: Object.keys(gcRates).length > 0
    })

  } catch (error) {
    console.error('Takeoff library API error:', error)

    // Return fallback template if BigQuery fails
    return NextResponse.json({
      success: false,
      error: error.message,
      items: getFallbackTemplate(),
      sections: groupBySection(getFallbackTemplate()),
      variant_options: VARIANT_OPTIONS,
      total_items: getFallbackTemplate().length,
      source: 'fallback'
    })
  }
}

/**
 * Fallback template if BigQuery is unavailable
 * Based on TEMPLATE_ROWS from takeoff-spreadsheet.jsx
 */
function getFallbackTemplate() {
  return [
    // ROOFING SECTION
    { scope_code: 'MR-001VB', section: 'Roofing', scope_name: 'Vapor Barrier', default_unit_cost: 6.95, uom: 'SF', sort_order: 1 },
    { scope_code: 'MR-002PITCH', section: 'Roofing', scope_name: 'Pitch Upcharge', default_unit_cost: 1.5, uom: 'SF', sort_order: 2 },
    { scope_code: 'MR-003BU2PLY', section: 'Roofing', scope_name: 'Roofing - 2 Ply', default_unit_cost: 16.25, uom: 'SF', sort_order: 3, has_material_type: true },
    { scope_code: 'MR-004UO', section: 'Roofing', scope_name: 'Up and Over', default_unit_cost: 12.0, uom: 'LF', sort_order: 4 },
    { scope_code: 'MR-005SCUPPER', section: 'Roofing', scope_name: 'Scupper/Leader', default_unit_cost: 2500.0, uom: 'EA', sort_order: 5 },
    { scope_code: 'MR-006IRMA', section: 'Roofing', scope_name: 'Roofing - IRMA', default_unit_cost: 18.0, uom: 'SF', sort_order: 6, has_material_type: true, has_r_value: true },
    { scope_code: 'MR-007PMMA', section: 'Roofing', scope_name: 'PMMA @ Building', default_unit_cost: 48.0, uom: 'LF', sort_order: 7, has_material_type: true },
    { scope_code: 'MR-008PMMA', section: 'Roofing', scope_name: 'PMMA @ Parapet', default_unit_cost: 48.0, uom: 'LF', sort_order: 8, has_material_type: true },
    { scope_code: 'MR-010DRAIN', section: 'Roofing', scope_name: 'Drains', default_unit_cost: 550.0, uom: 'EA', sort_order: 10 },
    { scope_code: 'MR-011DOORSTD', section: 'Roofing', scope_name: 'Doorpans - Std', default_unit_cost: 550.0, uom: 'EA', sort_order: 11 },
    { scope_code: 'MR-012DOORLG', section: 'Roofing', scope_name: 'Doorpans - Large', default_unit_cost: 850.0, uom: 'EA', sort_order: 12 },
    { scope_code: 'MR-013HATCHSF', section: 'Roofing', scope_name: 'Hatch/Skylight (SF)', default_unit_cost: 48.0, uom: 'SF', sort_order: 13 },
    { scope_code: 'MR-014HATCHLF', section: 'Roofing', scope_name: 'Hatch/Skylight (LF)', default_unit_cost: 48.0, uom: 'LF', sort_order: 14 },
    { scope_code: 'MR-015PAD', section: 'Roofing', scope_name: 'Mech Pads', default_unit_cost: 32.0, uom: 'SF', sort_order: 15 },
    { scope_code: 'MR-016FENCE', section: 'Roofing', scope_name: 'Fence Posts', default_unit_cost: 250.0, uom: 'EA', sort_order: 16 },
    { scope_code: 'MR-017RAIL', section: 'Roofing', scope_name: 'Railing Posts', default_unit_cost: 250.0, uom: 'EA', sort_order: 17 },
    { scope_code: 'MR-018PLUMB', section: 'Roofing', scope_name: 'Plumbing Pen.', default_unit_cost: 250.0, uom: 'EA', sort_order: 18 },
    { scope_code: 'MR-019MECH', section: 'Roofing', scope_name: 'Mechanical Pen.', default_unit_cost: 250.0, uom: 'EA', sort_order: 19 },
    { scope_code: 'MR-020DAVIT', section: 'Roofing', scope_name: 'Davits', default_unit_cost: 150.0, uom: 'EA', sort_order: 20 },
    { scope_code: 'MR-021AC', section: 'Roofing', scope_name: 'AC Units/Dunnage', default_unit_cost: 550.0, uom: 'EA', sort_order: 21 },
    { scope_code: 'MR-022COPELO', section: 'Roofing', scope_name: 'Coping (Low)', default_unit_cost: 32.0, uom: 'LF', sort_order: 22, has_material_type: true },
    { scope_code: 'MR-023COPEHI', section: 'Roofing', scope_name: 'Coping (High)', default_unit_cost: 32.0, uom: 'LF', sort_order: 23, has_material_type: true },
    { scope_code: 'MR-024INSUCOPE', section: 'Roofing', scope_name: 'Insul. Coping', default_unit_cost: 4.0, uom: 'LF', sort_order: 24, has_r_value: true },
    { scope_code: 'MR-025FLASHBLDG', section: 'Roofing', scope_name: 'Flash @ Building', default_unit_cost: 24.0, uom: 'LF', sort_order: 25 },
    { scope_code: 'MR-026FLASHPAR', section: 'Roofing', scope_name: 'Flash @ Parapet', default_unit_cost: 24.0, uom: 'LF', sort_order: 26 },
    { scope_code: 'MR-027OBIRMA', section: 'Roofing', scope_name: 'Overburden IRMA', default_unit_cost: 14.0, uom: 'SF', sort_order: 27 },
    { scope_code: 'MR-028PAVER', section: 'Roofing', scope_name: 'Pavers', default_unit_cost: 24.0, uom: 'SF', sort_order: 28, has_material_type: true },
    { scope_code: 'MR-029FLASHPAV', section: 'Roofing', scope_name: 'Edge @ Pavers', default_unit_cost: 24.0, uom: 'LF', sort_order: 29 },
    { scope_code: 'MR-030GREEN', section: 'Roofing', scope_name: 'Green Roof', default_unit_cost: 48.0, uom: 'SF', sort_order: 30 },
    { scope_code: 'MR-031FLASHGRN', section: 'Roofing', scope_name: 'Edge @ Green', default_unit_cost: 24.0, uom: 'LF', sort_order: 31 },
    { scope_code: 'MR-032RECESSWP', section: 'Roofing', scope_name: 'Recessed Floor WP', default_unit_cost: 32.0, uom: 'SF', sort_order: 32 },
    // INSULATION SECTION
    { scope_code: 'MR-INS-BATT', section: 'Insulation', scope_name: 'Batt Insulation', default_unit_cost: 2.5, uom: 'SF', sort_order: 40, has_r_value: true, has_thickness: true, has_material_type: true },
    { scope_code: 'MR-INS-RIGID', section: 'Insulation', scope_name: 'Rigid Insulation', default_unit_cost: 3.25, uom: 'SF', sort_order: 41, has_r_value: true, has_thickness: true },
    { scope_code: 'MR-INS-COVER', section: 'Insulation', scope_name: 'Cover Board', default_unit_cost: 4.5, uom: 'SF', sort_order: 42, has_thickness: true },
    // BALCONIES SECTION
    { scope_code: 'MR-033TRAFFIC', section: 'Balcony', scope_name: 'Traffic Coating', default_unit_cost: 17.0, uom: 'SF', sort_order: 50 },
    { scope_code: 'MR-034DRIP', section: 'Balcony', scope_name: 'Alum. Drip Edge', default_unit_cost: 22.0, uom: 'LF', sort_order: 51 },
    { scope_code: 'MR-035LFLASH', section: 'Balcony', scope_name: 'Liquid L Flash', default_unit_cost: 48.0, uom: 'LF', sort_order: 52 },
    { scope_code: 'MR-036DOORBAL', section: 'Balcony', scope_name: 'Doorpans - Balc.', default_unit_cost: 550.0, uom: 'EA', sort_order: 53 },
    // EXTERIOR SECTION
    { scope_code: 'MR-037BRICKWP', section: 'Exterior', scope_name: 'Brick WP', default_unit_cost: 5.25, uom: 'SF', sort_order: 60 },
    { scope_code: 'MR-038OPNBRKEA', section: 'Exterior', scope_name: 'Open Brick (EA)', default_unit_cost: 250.0, uom: 'EA', sort_order: 61 },
    { scope_code: 'MR-039OPNBRKLF', section: 'Exterior', scope_name: 'Open Brick (LF)', default_unit_cost: 10.0, uom: 'LF', sort_order: 62 },
    { scope_code: 'MR-040PANELWP', section: 'Exterior', scope_name: 'Panel WP', default_unit_cost: 5.25, uom: 'SF', sort_order: 63 },
    { scope_code: 'MR-041OPNPNLEA', section: 'Exterior', scope_name: 'Open Panel (EA)', default_unit_cost: 250.0, uom: 'EA', sort_order: 64 },
    { scope_code: 'MR-042OPNPNLLF', section: 'Exterior', scope_name: 'Open Panel (LF)', default_unit_cost: 10.0, uom: 'LF', sort_order: 65 },
    { scope_code: 'MR-043EIFS', section: 'Exterior', scope_name: 'EIFS', default_unit_cost: 5.25, uom: 'SF', sort_order: 66, has_material_type: true, has_r_value: true, has_thickness: true },
    { scope_code: 'MR-044OPNSTCEA', section: 'Exterior', scope_name: 'Open Stucco (EA)', default_unit_cost: 250.0, uom: 'EA', sort_order: 67 },
    { scope_code: 'MR-045OPNSTCLF', section: 'Exterior', scope_name: 'Open Stucco (LF)', default_unit_cost: 10.0, uom: 'LF', sort_order: 68 },
    { scope_code: 'MR-046STUCCO', section: 'Exterior', scope_name: 'Trans. Stucco', default_unit_cost: 17.0, uom: 'SF', sort_order: 69 },
    { scope_code: 'MR-047DRIPCAP', section: 'Exterior', scope_name: 'Drip Cap', default_unit_cost: 33.0, uom: 'LF', sort_order: 70 },
    { scope_code: 'MR-048SILL', section: 'Exterior', scope_name: 'Sills', default_unit_cost: 33.0, uom: 'LF', sort_order: 71 },
    { scope_code: 'MR-049TIEIN', section: 'Exterior', scope_name: 'Tie-In', default_unit_cost: 48.0, uom: 'LF', sort_order: 72 },
    { scope_code: 'MR-050ADJHORZ', section: 'Exterior', scope_name: 'Adj. Bldg Horiz', default_unit_cost: 65.0, uom: 'LF', sort_order: 73 },
    { scope_code: 'MR-051ADJVERT', section: 'Exterior', scope_name: 'Adj. Bldg Vert', default_unit_cost: 65.0, uom: 'LF', sort_order: 74 },
    // MISC SECTION
    { scope_code: 'MR-MISC-OTHER', section: 'Misc', scope_name: 'Other/Custom', default_unit_cost: 0, uom: 'EA', sort_order: 100 },
    { scope_code: 'MR-MISC-DEMO', section: 'Misc', scope_name: 'Demo', default_unit_cost: 0, uom: 'SF', sort_order: 101 },
    { scope_code: 'MR-MISC-GARAGE', section: 'Misc', scope_name: 'Garage', default_unit_cost: 0, uom: 'SF', sort_order: 102 },
  ]
}

function groupBySection(items) {
  const sections = {}
  for (const item of items) {
    const sectionKey = item.section || 'Other'
    if (!sections[sectionKey]) {
      sections[sectionKey] = []
    }
    sections[sectionKey].push(item)
  }
  return sections
}
