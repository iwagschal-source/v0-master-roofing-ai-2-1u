/**
 * Master Roofing Scope Items
 *
 * This is the single source of truth for all scope items used in:
 * - Google Sheets template dropdowns
 * - Proposal generation
 * - Takeoff to proposal conversion
 *
 * Each item has:
 * - category: Grouping for organization
 * - name: Display name (appears in dropdowns)
 * - description: Professional narrative for proposals
 * - aliases: Alternative names that map to this item
 */

export const SCOPE_ITEMS = [
  // ==========================================
  // ROOFING SYSTEMS
  // ==========================================
  {
    category: 'Roofing',
    name: 'Built-Up Roofing (2-Ply Torchdown)',
    description: 'Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads. Lead sheets installed and sealed at all drains. Assembly includes torch-applied Firestone APP160 smooth base ply and APP180 white granulated cap sheet with 3" laps, with walls and curbs primed and flashed 12" up using APP160/180 binder flashing. Door pans furnished and installed at openings.',
    aliases: ['Built-Up Roofing', '2 Ply Torchdown- Built-up', 'Roofing - Built-up - 2 ply Scope', 'BUR', '2-Ply'],
  },
  {
    category: 'Roofing',
    name: 'Built-Up Roofing (3-Ply)',
    description: 'Built-up roof system with three-ply application for enhanced durability. Includes installation of tapered insulation, coverboard, and three layers of modified bitumen roofing membrane per manufacturer specifications.',
    aliases: ['3-Ply', '3 Ply Torchdown'],
  },
  {
    category: 'Roofing',
    name: 'TPO Roofing System',
    description: 'Thermoplastic polyolefin (TPO) single-ply roofing membrane system. Includes installation of insulation, coverboard, and TPO membrane either mechanically fastened or fully adhered per manufacturer specifications. All seams heat-welded for watertight integrity.',
    aliases: ['TPO', 'TPO Membrane'],
  },
  {
    category: 'Roofing',
    name: 'EPDM Roofing System',
    description: 'Ethylene propylene diene monomer (EPDM) rubber roofing membrane system. Includes installation of insulation, coverboard, and EPDM membrane fully adhered or mechanically attached per manufacturer specifications.',
    aliases: ['EPDM', 'Rubber Roof'],
  },
  {
    category: 'Roofing',
    name: 'Modified Bitumen Roofing',
    description: 'Modified bitumen roofing system with SBS or APP modifier. Includes installation of insulation, coverboard, and multi-ply modified bitumen membrane system per manufacturer specifications.',
    aliases: ['Mod Bit', 'Modified Bit'],
  },

  // ==========================================
  // COPING & FLASHING
  // ==========================================
  {
    category: 'Coping & Flashing',
    name: 'Aluminum Coping - High Parapet',
    description: 'Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.',
    aliases: ['Coping (High Parapet)', 'Coping-High Parapet', 'High Parapet Coping'],
  },
  {
    category: 'Coping & Flashing',
    name: 'Aluminum Coping - Low Parapet',
    description: 'Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.',
    aliases: ['Coping (Low Parapet)', 'Coping-Low Parapet', 'Low Parapet Coping'],
  },
  {
    category: 'Coping & Flashing',
    name: 'Aluminum Coping - Standard',
    description: 'Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.',
    aliases: ['Aluminum Coping', 'Coping', 'Metal Coping'],
  },
  {
    category: 'Coping & Flashing',
    name: 'Aluminum Counter Flashing',
    description: 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".',
    aliases: ['Aluminum Flashing', 'Metal flashing /counter flashing', 'Counter Flashing'],
  },
  {
    category: 'Coping & Flashing',
    name: 'Metal Flashing @ Building Wall',
    description: 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".',
    aliases: ['Metal Flashing@Building Wall', 'Building Wall Flashing'],
  },
  {
    category: 'Coping & Flashing',
    name: 'Metal Flashing @ Parapet Wall',
    description: 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".',
    aliases: ['Metal Flashing@Parapet Wall', 'Parapet Flashing'],
  },
  {
    category: 'Coping & Flashing',
    name: 'Drip Edge',
    description: 'Aluminum drip edge installed at roof perimeter terminations to direct water away from fascia.',
    aliases: ['Aluminum Drip Edge', 'Metal Drip Edge'],
  },
  {
    category: 'Coping & Flashing',
    name: 'Reglet Flashing',
    description: 'Install reglet flashing system with continuous aluminum reglet and removable counter flashing.',
    aliases: ['Reglet'],
  },

  // ==========================================
  // EIFS
  // ==========================================
  {
    category: 'EIFS',
    name: 'EIFS - Standard (3" EPS)',
    description: 'Scope includes priming and waterproofing window heads, jambs, and sills with air and vapor barrier, sealing all joints with mesh tape. Apply continuous air and moisture barrier, followed by 3" EIFS EPS insulation (R-11.4), base coat with mesh, and finish coat. Caulk and seal all window and door perimeters.',
    aliases: ['EIFS', 'EIFS - Scope', 'EFIS - Walls'],
  },
  {
    category: 'EIFS',
    name: 'EIFS - Thick (4" EPS)',
    description: 'Scope includes priming and waterproofing window heads, jambs, and sills with air and vapor barrier, sealing all joints with mesh tape. Apply continuous air and moisture barrier, followed by 4" EIFS EPS insulation (R-15.2), base coat with mesh, and finish coat. Caulk and seal all window and door perimeters.',
    aliases: ['EIFS 4"', 'Thick EIFS'],
  },
  {
    category: 'EIFS',
    name: 'EIFS - Walls Only',
    description: 'EIFS application to wall surfaces only, excluding window and door detailing. Includes air barrier, EPS insulation, base coat with mesh, and finish coat.',
    aliases: ['EIFS Walls'],
  },
  {
    category: 'EIFS',
    name: 'EIFS - Soffit',
    description: 'EIFS application to soffit areas. Includes air barrier, EPS insulation, base coat with mesh, and finish coat suitable for overhead application.',
    aliases: ['Soffit EIFS'],
  },

  // ==========================================
  // WATERPROOFING
  // ==========================================
  {
    category: 'Waterproofing',
    name: 'Balcony Waterproofing (PMMA)',
    description: 'Balcony waterproofing includes application of Alsan RS 276 Primer, Alsan RS 230 flashing 12" up walls, and Alsan RS 289 Textured Finish with color pack. Aluminum drip edge installed at perimeter terminations as required.',
    aliases: ['Balcony Waterproofing', 'Traffic Coating', 'Balcony PMMA'],
  },
  {
    category: 'Waterproofing',
    name: 'Brick Area Waterproofing',
    description: 'Prime and waterproof window heads, jambs, and sills with an air-vapor barrier membrane, then apply a continuous air-vapor-water barrier over exterior brick walls. The membrane is installed to provide a seamless moisture and air seal around all openings and across the wall surface.',
    aliases: ['Brick Area Waterproofing', 'Brick Area - Waterproofing', 'Brick Area'],
  },
  {
    category: 'Waterproofing',
    name: 'Recessed Floor Waterproofing',
    description: 'Prepare the recessed concrete slab by scarifying to achieve a clean, smooth surface, then apply a uniform coat of Soprema RS 276 primer. Install new flashings using Soprema RS 230 Flash grade PMMA resin with Alsan RS fleece reinforcement around all terminations and penetrations, followed by application of the field membrane consisting of Soprema RS 230 Flash grade PMMA with fleece. All work is performed in accordance with Soprema\'s installation guidelines.',
    aliases: ['Recessed Floor Waterproofing', 'Recessed Floor - Waterproofing', 'Liquid Waterproofing (Recessed Floor)'],
  },
  {
    category: 'Waterproofing',
    name: 'Tie-In (PMMA)',
    description: 'Apply PMMA waterproofing membrane where the floor meets the foundation.',
    aliases: ['Tie-In', 'Tie - In (LF) - PMMA', 'Foundation Tie-In'],
  },
  {
    category: 'Waterproofing',
    name: 'Below Grade Waterproofing',
    description: 'Below grade waterproofing membrane application per manufacturer specifications. Includes surface preparation, primer, and waterproofing membrane with protection board.',
    aliases: ['Below Grade', 'Foundation Waterproofing'],
  },
  {
    category: 'Waterproofing',
    name: 'Plaza Deck Waterproofing',
    description: 'Plaza deck waterproofing system with protection course and drainage mat. Includes surface preparation, waterproofing membrane, protection board, and drainage composite.',
    aliases: ['Plaza Deck', 'Podium Deck'],
  },
  {
    category: 'Waterproofing',
    name: 'Hot Fluid Applied Waterproofing',
    description: 'Hot fluid applied rubberized asphalt waterproofing membrane. Includes surface preparation, primer, and hot-applied membrane per manufacturer specifications.',
    aliases: ['Hot Applied', 'Rubberized Asphalt'],
  },

  // ==========================================
  // ACCESSORIES
  // ==========================================
  {
    category: 'Accessories',
    name: 'Roof Drains',
    description: 'Furnish and install roof drains with lead sheets, primed and sealed with water block sealer.',
    aliases: ['Drains', 'Roof Drain'],
  },
  {
    category: 'Accessories',
    name: 'Doorpans - Standard',
    description: 'Furnish and install standard door pans at door openings, fully waterproofed and sealed.',
    aliases: ['Doorpan', 'Door Pan', 'Standard Doorpan'],
  },
  {
    category: 'Accessories',
    name: 'Doorpans - Large',
    description: 'Furnish and install large door pans at door openings, fully waterproofed and sealed.',
    aliases: ['Large Doorpan', 'Oversized Doorpan'],
  },
  {
    category: 'Accessories',
    name: 'Scupper/Gutter and Leader',
    description: 'Furnish and install scupper, gutter, and leader assembly for roof drainage.',
    aliases: ['Scupper', 'Gutter', 'Leader', 'Downspout'],
  },
  {
    category: 'Accessories',
    name: 'Pitch Pockets',
    description: 'Install pitch pockets at penetrations, filled with appropriate pourable sealer per manufacturer specifications.',
    aliases: ['Pitch Pocket'],
  },
  {
    category: 'Accessories',
    name: 'Pipe Boots',
    description: 'Install pipe boots at pipe penetrations with proper flashing and sealant.',
    aliases: ['Pipe Boot', 'Pipe Flashing'],
  },
  {
    category: 'Accessories',
    name: 'Roof Curbs',
    description: 'Furnish and install prefabricated roof curbs for mechanical equipment with proper flashing integration.',
    aliases: ['Curb', 'Equipment Curb'],
  },
  {
    category: 'Accessories',
    name: 'Expansion Joints',
    description: 'Install roof expansion joint assembly with proper membrane integration at building expansion joints.',
    aliases: ['Expansion Joint', 'Roof Expansion Joint'],
  },

  // ==========================================
  // INSULATION & MISC
  // ==========================================
  {
    category: 'Insulation & Misc',
    name: 'Up and Over',
    description: 'Install waterproofing membrane up and over parapet walls and bulkheads.',
    aliases: ['Up and Over', 'Over Parapet'],
  },
  {
    category: 'Insulation & Misc',
    name: 'Vapor Barrier',
    description: 'Install vapor barrier or temporary waterproofing membrane as specified.',
    aliases: ['Vapor Barrier or Temp waterproofing', 'VB', 'Vapor Retarder'],
  },
  {
    category: 'Insulation & Misc',
    name: 'Insulation under Coping',
    description: 'Install insulation under coping per manufacturer specifications.',
    aliases: ['Coping Insulation'],
  },
  {
    category: 'Insulation & Misc',
    name: 'Tapered Insulation System',
    description: 'Furnish and install tapered insulation system to provide positive drainage to roof drains. Includes tapered panels and flat stock as required.',
    aliases: ['Tapered Insulation', 'Tapered ISO'],
  },
  {
    category: 'Insulation & Misc',
    name: 'Cover Board (DensDeck)',
    description: 'Install DensDeck or equivalent high-density cover board over insulation prior to membrane installation.',
    aliases: ['Cover Board', 'DensDeck', 'HD Cover Board'],
  },
  {
    category: 'Insulation & Misc',
    name: 'Wood Blocking',
    description: 'Install pressure-treated wood blocking at parapets, curbs, and equipment supports as required.',
    aliases: ['Blocking', 'Nailer'],
  },
  {
    category: 'Insulation & Misc',
    name: 'Cant Strip',
    description: 'Install fiber or wood cant strips at roof-to-wall transitions per manufacturer specifications.',
    aliases: ['Cant', 'Fiber Cant'],
  },
  {
    category: 'Insulation & Misc',
    name: 'Protection Board',
    description: 'Install protection board over waterproofing membrane to protect from backfill and traffic damage.',
    aliases: ['Protection Course'],
  },
]

// Unit types for quantity measurements
export const UNIT_TYPES = [
  { code: 'SF', name: 'Square Feet' },
  { code: 'LF', name: 'Linear Feet' },
  { code: 'EA', name: 'Each' },
  { code: 'SQ', name: 'Roofing Square (100 SF)' },
  { code: 'CY', name: 'Cubic Yards' },
  { code: 'GAL', name: 'Gallons' },
  { code: 'LS', name: 'Lump Sum' },
]

// R-Value options for insulation
export const R_VALUES = [
  'R-10', 'R-15', 'R-20', 'R-25', 'R-30', 'R-33', 'R-38', 'R-40', 'R-45', 'R-50'
]

// Thickness options
export const THICKNESS_OPTIONS = [
  '1"', '1.5"', '2"', '2.5"', '3"', '3.5"', '4"', '4.5"', '5"', '5.5"', '6"', '6.5"', '7"', '8"'
]

/**
 * Find a scope item by name or alias
 * @param {string} searchName - Name to search for
 * @returns {object|null} - Matching scope item or null
 */
export function findScopeItem(searchName) {
  if (!searchName) return null

  const normalizedSearch = searchName.toLowerCase().trim()

  // Try exact match on name first
  for (const item of SCOPE_ITEMS) {
    if (item.name.toLowerCase() === normalizedSearch) {
      return item
    }
  }

  // Try exact match on aliases
  for (const item of SCOPE_ITEMS) {
    for (const alias of item.aliases || []) {
      if (alias.toLowerCase() === normalizedSearch) {
        return item
      }
    }
  }

  // Try partial match on name
  for (const item of SCOPE_ITEMS) {
    if (item.name.toLowerCase().includes(normalizedSearch) ||
        normalizedSearch.includes(item.name.toLowerCase())) {
      return item
    }
  }

  // Try partial match on aliases
  for (const item of SCOPE_ITEMS) {
    for (const alias of item.aliases || []) {
      if (alias.toLowerCase().includes(normalizedSearch) ||
          normalizedSearch.includes(alias.toLowerCase())) {
        return item
      }
    }
  }

  return null
}

/**
 * Get description for a scope item by name
 * @param {string} itemName - Name of the scope item
 * @returns {string} - Description or fallback
 */
export function getScopeItemDescription(itemName) {
  const item = findScopeItem(itemName)
  if (item) {
    return item.description
  }
  return `Installation of ${itemName} per manufacturer specifications and industry standards.`
}

/**
 * Get all scope items grouped by category
 * @returns {object} - Items grouped by category
 */
export function getScopeItemsByCategory() {
  const grouped = {}
  for (const item of SCOPE_ITEMS) {
    if (!grouped[item.category]) {
      grouped[item.category] = []
    }
    grouped[item.category].push(item)
  }
  return grouped
}

/**
 * Get just the scope item names (for dropdown lists)
 * @returns {string[]} - Array of scope item names
 */
export function getScopeItemNames() {
  return SCOPE_ITEMS.map(item => item.name)
}
