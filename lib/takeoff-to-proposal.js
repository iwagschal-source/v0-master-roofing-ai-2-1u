/**
 * Takeoff to Proposal Conversion
 *
 * Converts takeoff spreadsheet data into formatted proposal structure.
 * Groups line items by system, sums costs, extracts variables, and
 * interpolates narratives from PROPOSAL_SYSTEM_DESCRIPTIONS.
 */

import { PROPOSAL_SYSTEM_DESCRIPTIONS, getSystemNarrative } from './proposal-systems'

/**
 * System grouping rules - maps takeoff item patterns to proposal system IDs
 * Order matters: first match wins
 */
const SYSTEM_GROUPING_RULES = [
  // Roofing Systems
  { pattern: /app\s*160.*180|2\s*ply|built[\s-]*up/i, systemId: 'SYS-APP160180' },
  { pattern: /bulkhead.*roof|bh.*roof/i, systemId: 'SYS-APP160180-BULKHEAD' },
  { pattern: /irma|inverted.*roof/i, systemId: 'SYS-SBS-IRMA' },
  { pattern: /pmma.*roof|firestone.*pmma/i, systemId: 'SYS-PMMA' },
  { pattern: /tpo|thermoplastic/i, systemId: 'SYS-TPO' },
  { pattern: /epdm|ethylene.*propylene/i, systemId: 'SYS-EPDM' },
  { pattern: /soprema.*flam|flam\s*180/i, systemId: 'SYS-SOPREMA-FLAM180' },
  { pattern: /colphene/i, systemId: 'SYS-SOPREMA-COLPHENE' },
  { pattern: /timberline|shingle/i, systemId: 'SYS-GAF-TIMBERLINE' },
  { pattern: /standing\s*seam/i, systemId: 'SYS-STANDING-SEAM' },
  { pattern: /slate/i, systemId: 'SYS-SLATE' },

  // Metal Work
  { pattern: /counter.*flash|stucco.*receiver/i, systemId: 'SYS-AL-COUNTER-FLASH' },
  { pattern: /coping|parapet.*cap/i, systemId: 'SYS-AL-COPING' },

  // Waterproofing
  { pattern: /rs\s*230|soprema.*waterproof.*recess/i, systemId: 'SYS-SOPREMA-RS230' },
  { pattern: /alsan|balcony.*waterproof/i, systemId: 'SYS-ALSAN-RS' },
  { pattern: /traffic.*coat/i, systemId: 'SYS-TRAFFIC-COATING' },
  { pattern: /tie[\s-]*in/i, systemId: 'SYS-TIE-IN' },
  { pattern: /masterseal/i, systemId: 'SYS-MASTERSEAL' },

  // Exterior
  { pattern: /eifs|exterior.*insulation.*finish/i, systemId: 'SYS-EIFS' },
  { pattern: /brick.*waterproof|brick.*wp/i, systemId: 'SYS-BRICK-WATERPROOFING' },
  { pattern: /vinyl.*siding/i, systemId: 'SYS-VINYL-SIDING' },
  { pattern: /equitone/i, systemId: 'SYS-EQUITONE' },
]

/**
 * Items that should be grouped with their parent roofing system
 */
const ROOFING_COMPONENT_PATTERNS = [
  /drain/i,
  /scupper/i,
  /door\s*pan/i,
  /pitch\s*pocket/i,
  /mechanical.*allow/i,
  /plumbing.*allow/i,
  /insulation(?!.*eifs)/i,  // Insulation not part of EIFS
  /vapor\s*barrier/i,
]

/**
 * Items that should be grouped with metal work
 */
const METAL_COMPONENT_PATTERNS = [
  /flashing(?!.*counter)/i,
  /reglet/i,
  /drip.*edge/i,
]

/**
 * Extract variables from item name
 * e.g., "2 ply 6'' (R33)" → { thickness: '6"', r_value: 'R33' }
 */
function extractVariables(itemName) {
  const variables = {}

  // Extract thickness (e.g., "6"", "6''", "6 inch", "6-inch")
  const thicknessMatch = itemName.match(/(\d+(?:\.\d+)?)\s*(?:"|''|inch|in(?:ch)?)/i)
  if (thicknessMatch) {
    variables.thickness = `${thicknessMatch[1]}"`
  }

  // Extract R-value (e.g., "R33", "R-33", "R 33")
  const rValueMatch = itemName.match(/R[\s-]?(\d+(?:\.\d+)?)/i)
  if (rValueMatch) {
    variables.r_value = `R${rValueMatch[1]}`
  }

  // Extract pitch (e.g., "1/8" per ft", "1/4"/ft")
  const pitchMatch = itemName.match(/(\d+\/\d+)\s*(?:"|'')?(?:\s*per\s*|\/)?\s*(?:ft|foot)/i)
  if (pitchMatch) {
    variables.pitch = `${pitchMatch[1]}" per ft`
  }

  // Extract count for items like drains, door pans
  const countMatch = itemName.match(/(\d+)\s*(?:drain|door\s*pan|scupper)/i)
  if (countMatch) {
    const key = itemName.toLowerCase().includes('drain') ? 'drain_count'
              : itemName.toLowerCase().includes('door') ? 'door_pan_count'
              : 'scupper_count'
    variables[key] = parseInt(countMatch[1])
  }

  return variables
}

/**
 * Determine which system a takeoff item belongs to
 */
function classifyItem(itemName) {
  // Check against grouping rules
  for (const rule of SYSTEM_GROUPING_RULES) {
    if (rule.pattern.test(itemName)) {
      return { systemId: rule.systemId, isComponent: false }
    }
  }

  // Check if it's a roofing component (group with main roof system)
  for (const pattern of ROOFING_COMPONENT_PATTERNS) {
    if (pattern.test(itemName)) {
      return { systemId: 'ROOFING_COMPONENT', isComponent: true }
    }
  }

  // Check if it's a metal component
  for (const pattern of METAL_COMPONENT_PATTERNS) {
    if (pattern.test(itemName)) {
      return { systemId: 'METAL_COMPONENT', isComponent: true }
    }
  }

  return { systemId: 'MISC', isComponent: false }
}

/**
 * Convert takeoff data to proposal format
 *
 * @param {Array} takeoffItems - Array of takeoff line items
 *   Each item should have: { scope, total_cost, unit_cost, total_qty, ... }
 * @param {Object} projectInfo - Project metadata
 *   { project_name, gc_name, address, date_of_drawings, addendum }
 * @returns {Object} Proposal data structure
 */
export function convertTakeoffToProposal(takeoffItems, projectInfo = {}) {
  // Step 1: Group items by system
  const systemGroups = {}
  const componentItems = { roofing: [], metal: [] }
  const miscItems = []
  let primaryRoofSystem = null

  for (const item of takeoffItems) {
    if (!item.scope || item.total_cost === 0) continue

    const { systemId, isComponent } = classifyItem(item.scope)
    const variables = extractVariables(item.scope)

    if (isComponent) {
      if (systemId === 'ROOFING_COMPONENT') {
        componentItems.roofing.push({ ...item, variables })
      } else if (systemId === 'METAL_COMPONENT') {
        componentItems.metal.push({ ...item, variables })
      }
    } else if (systemId === 'MISC') {
      miscItems.push(item)
    } else {
      // Main system item
      if (!systemGroups[systemId]) {
        systemGroups[systemId] = {
          systemId,
          items: [],
          totalCost: 0,
          variables: {},
        }
      }
      systemGroups[systemId].items.push(item)
      systemGroups[systemId].totalCost += item.total_cost || 0
      systemGroups[systemId].variables = { ...systemGroups[systemId].variables, ...variables }

      // Track primary roofing system
      const system = PROPOSAL_SYSTEM_DESCRIPTIONS[systemId]
      if (system?.category === 'Roofing' && !primaryRoofSystem) {
        primaryRoofSystem = systemId
      }
    }
  }

  // Step 2: Merge component items into their parent systems
  if (primaryRoofSystem && systemGroups[primaryRoofSystem]) {
    for (const item of componentItems.roofing) {
      systemGroups[primaryRoofSystem].items.push(item)
      systemGroups[primaryRoofSystem].totalCost += item.total_cost || 0
      systemGroups[primaryRoofSystem].variables = {
        ...systemGroups[primaryRoofSystem].variables,
        ...item.variables
      }
    }
  }

  // Merge metal components into coping if exists, otherwise create separate
  if (systemGroups['SYS-AL-COPING']) {
    for (const item of componentItems.metal) {
      systemGroups['SYS-AL-COPING'].items.push(item)
      systemGroups['SYS-AL-COPING'].totalCost += item.total_cost || 0
    }
  } else if (componentItems.metal.length > 0) {
    systemGroups['METAL-WORK'] = {
      systemId: 'METAL-WORK',
      items: componentItems.metal,
      totalCost: componentItems.metal.reduce((sum, i) => sum + (i.total_cost || 0), 0),
      variables: {},
    }
  }

  // Step 3: Convert to proposal base bid items
  const baseBidItems = []

  for (const [systemId, group] of Object.entries(systemGroups)) {
    const system = PROPOSAL_SYSTEM_DESCRIPTIONS[systemId]

    if (system) {
      // Known system with narrative
      const narrative = getSystemNarrative(systemId, group.variables)

      baseBidItems.push({
        name: formatSystemName(system.name, group.variables),
        amount: Math.round(group.totalCost),
        description: narrative || system.name,
        systemId,
        category: system.category,
        items: group.items.map(i => i.scope),
      })
    } else {
      // Unknown system or metal work group
      baseBidItems.push({
        name: systemId === 'METAL-WORK' ? 'Metal Work & Flashings' : systemId,
        amount: Math.round(group.totalCost),
        description: generateGenericDescription(group.items),
        systemId,
        category: 'Miscellaneous',
        items: group.items.map(i => i.scope),
      })
    }
  }

  // Add misc items as separate line items if significant
  for (const item of miscItems) {
    if (item.total_cost >= 1000) {
      baseBidItems.push({
        name: item.scope,
        amount: Math.round(item.total_cost),
        description: item.scope,
        systemId: 'MISC',
        category: 'Miscellaneous',
      })
    }
  }

  // Sort by category and then by amount
  const categoryOrder = ['Roofing', 'Metal Work', 'Waterproofing', 'Exterior', 'Siding', 'Miscellaneous']
  baseBidItems.sort((a, b) => {
    const catA = categoryOrder.indexOf(a.category)
    const catB = categoryOrder.indexOf(b.category)
    if (catA !== catB) return catA - catB
    return b.amount - a.amount
  })

  // Step 4: Generate project summary
  const totalBaseBid = baseBidItems.reduce((sum, item) => sum + item.amount, 0)
  const projectSummary = generateProjectSummary(baseBidItems, projectInfo)

  return {
    version: 'V1',
    created_at: new Date().toISOString(),
    date_of_drawings: projectInfo.date_of_drawings || '',
    addendum: projectInfo.addendum || '',
    project_summary: projectSummary,
    base_bid_items: baseBidItems,
    alternates: [],
    clarifications: getDefaultClarifications(baseBidItems),
    exclusions: [],
    total_base_bid: totalBaseBid,
    project_info: projectInfo,
  }
}

/**
 * Format system name with variables
 */
function formatSystemName(name, variables) {
  let formatted = name

  if (variables.thickness && variables.r_value) {
    // e.g., "Built-Up Roofing – Firestone APP 160/180 System" → "Firestone APP160/180 6" R-33"
    if (name.includes('APP 160/180')) {
      formatted = `Firestone APP160/180 ${variables.thickness} ${variables.r_value}`
    } else if (name.includes('EIFS')) {
      formatted = `EIFS System ${variables.thickness} ${variables.r_value}`
    }
  }

  return formatted
}

/**
 * Generate generic description for ungrouped items
 */
function generateGenericDescription(items) {
  const names = items.map(i => i.scope).join(', ')
  return `Scope includes: ${names}`
}

/**
 * Generate project summary based on included systems
 */
function generateProjectSummary(baseBidItems, projectInfo) {
  const categories = [...new Set(baseBidItems.map(i => i.category))]
  const address = projectInfo.address || 'the project location'

  const scopeParts = []

  if (categories.includes('Roofing')) {
    scopeParts.push('complete roofing system installation')
  }
  if (categories.includes('Waterproofing')) {
    scopeParts.push('waterproofing applications')
  }
  if (categories.includes('Metal Work')) {
    scopeParts.push('metal coping and flashings')
  }
  if (categories.includes('Exterior') || categories.includes('Siding')) {
    scopeParts.push('exterior cladding work')
  }

  const scopeDescription = scopeParts.length > 0
    ? scopeParts.join(', ')
    : 'the specified scope of work'

  return `This proposal covers ${scopeDescription} for the building located at ${address}. All work will be performed in accordance with manufacturer specifications and industry best practices. Master Roofing will provide all labor, materials, and equipment necessary to complete the work as described in the scope items below.`
}

/**
 * Get default clarifications based on included systems
 */
function getDefaultClarifications(baseBidItems) {
  const clarifications = [
    'Containers for garbage must be provided by GC.',
    'All penetrations must be installed prior to installation of roofing system. Any penetrations installed afterwards will be an additional charge per pitch pocket.',
  ]

  const hasRoofing = baseBidItems.some(i => i.category === 'Roofing')
  const hasEIFS = baseBidItems.some(i => i.systemId === 'SYS-EIFS')

  if (hasRoofing) {
    clarifications.push(
      'This roofing system is designed and manufactured for waterproofing purposes only – not for any sort of human traffic. If roof will be used for traffic without the installation of protection boards or pavers, the warranty will not be effective.',
      'R value and thickness of insulation must be reviewed and approved by GC. Master Roofing doesn\'t take any responsibility for the R value requirements.',
      'This roofing system proposed is standard white only; ultra-white will be an upcharge.'
    )
  }

  if (hasEIFS) {
    clarifications.push(
      'EIFS color selection must be finalized prior to material ordering.',
      'Substrate must be clean and free of loose material prior to EIFS installation.'
    )
  }

  return clarifications
}

/**
 * Parse takeoff from various formats
 */
export function parseTakeoffData(data, format = 'json') {
  if (format === 'json' && Array.isArray(data)) {
    // Already in expected format
    return data
  }

  if (format === 'sheets' && data.rows) {
    // Google Sheets template_data format from bluebeam/convert API
    return data.rows.map(row => ({
      scope: row.scope,
      unit_cost: row.unit_cost,
      total_qty: row.total_qty,
      total_cost: row.total_cost,
      floors: row.floors,
    }))
  }

  if (format === 'csv' && typeof data === 'string') {
    // Parse CSV - simplified, use bluebeam/convert API for full parsing
    const lines = data.trim().split('\n')
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())

    const scopeIdx = headers.findIndex(h => h.includes('scope') || h.includes('item'))
    const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('total'))
    const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity'))
    const unitCostIdx = headers.findIndex(h => h.includes('unit') && h.includes('cost'))

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      return {
        scope: values[scopeIdx] || '',
        total_cost: parseFloat(values[costIdx]?.replace(/[$,]/g, '') || '0'),
        total_qty: parseFloat(values[qtyIdx]?.replace(/,/g, '') || '0'),
        unit_cost: parseFloat(values[unitCostIdx]?.replace(/[$,]/g, '') || '0'),
      }
    }).filter(item => item.scope && item.total_cost > 0)
  }

  return data
}

/**
 * Convert EstimatingSheet data format to takeoff items format
 *
 * @param {Object} sheetData - Data from EstimatingSheet component { itemId: { rate, values: { colIndex: qty } } }
 * @param {Object} template - MR_TEMPLATE structure with section definitions
 * @returns {Array} Takeoff items array for convertTakeoffToProposal
 */
export function convertEstimatingSheetToTakeoff(sheetData, template) {
  const items = []

  for (const [sectionName, section] of Object.entries(template)) {
    for (const templateItem of section.items) {
      const itemData = sheetData[templateItem.id]
      if (!itemData) continue

      // Sum all location values
      const values = itemData.values || {}
      const totalQty = Object.values(values).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)

      if (totalQty === 0) continue // Skip items with no quantity

      const rate = itemData.rate || templateItem.rate || 0
      const totalCost = totalQty * rate

      // Build floors breakdown from column values
      const floors = {}
      const columns = section.columns || []
      for (const [colIdx, qty] of Object.entries(values)) {
        const colName = columns[parseInt(colIdx)]
        if (colName && parseFloat(qty) > 0) {
          floors[colName] = parseFloat(qty)
        }
      }

      items.push({
        scope: templateItem.name,
        item_id: templateItem.id,
        unit_cost: rate,
        total_qty: totalQty,
        total_cost: totalCost,
        uom: templateItem.uom || 'SF',
        floors,
        section: sectionName,
      })
    }
  }

  return items
}

export default convertTakeoffToProposal
