import { DEFAULT_EXCLUSIONS } from "@/lib/generate-proposal-pdf"

// Maps takeoff items to proposal line items with descriptions
const ITEM_DESCRIPTIONS = {
  "Built-Up Roofing":
    'Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads. Lead sheets installed and sealed at all drains. Assembly includes torch-applied Firestone APP160 smooth base ply and APP180 white granulated cap sheet with 3" laps, with walls and curbs primed and flashed 12" up using APP160/180 binder flashing. Door pans furnished and installed at openings.',
  "2 Ply Torchdown- Built-up":
    'Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads. Lead sheets installed and sealed at all drains. Assembly includes torch-applied Firestone APP160 smooth base ply and APP180 white granulated cap sheet with 3" laps, with walls and curbs primed and flashed 12" up using APP160/180 binder flashing. Door pans furnished and installed at openings.',
  "Roofing - Built-up - 2 ply Scope":
    'Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads. Lead sheets installed and sealed at all drains. Assembly includes torch-applied Firestone APP160 smooth base ply and APP180 white granulated cap sheet with 3" laps, with walls and curbs primed and flashed 12" up using APP160/180 binder flashing.',
  "Aluminum Coping":
    "Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.",
  "Coping (High Parapet)":
    "Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.",
  "Coping (Low Parapet)":
    "Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.",
  "Coping-High Parapet":
    "Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.",
  "Coping-Low Parapet":
    "Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.",
  "Aluminum Flashing": 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".',
  "Metal flashing /counter flashing":
    'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".',
  "Metal Flashing@Building Wall": 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".',
  "Metal Flashing@Parapet Wall": 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".',
  EIFS: 'Scope includes priming and waterproofing window heads, jambs, and sills with air and vapor barrier, sealing all joints with mesh tape. Apply continuous air and moisture barrier, followed by 3" EIFS EPS insulation (R-11.4), base coat with mesh, and finish coat. Caulk and seal all window and door perimeters.',
  "EIFS - Scope":
    'Scope includes priming and waterproofing window heads, jambs, and sills with air and vapor barrier, sealing all joints with mesh tape. Apply continuous air and moisture barrier, followed by EIFS EPS insulation, base coat with mesh, and finish coat. Caulk and seal all window and door perimeters.',
  "EFIS - Walls":
    'Scope includes priming and waterproofing window heads, jambs, and sills with air and vapor barrier, sealing all joints with mesh tape. Apply continuous air and moisture barrier, followed by 3" EIFS EPS insulation (R-11.4), base coat with mesh, and finish coat. Caulk and seal all window and door perimeters.',
  "Tie-In": "Apply PMMA waterproofing membrane where the floor meets the foundation.",
  "Tie - In (LF) - PMMA": "Apply PMMA waterproofing membrane where the floor meets the foundation.",
  "Balcony Waterproofing":
    'Balcony waterproofing includes application of Alsan RS 276 Primer, Alsan RS 230 flashing 12" up walls, and Alsan RS 289 Textured Finish with color pack. Aluminum drip edge installed at perimeter terminations as required.',
  "Traffic Coating":
    'Balcony waterproofing includes application of Alsan RS 276 Primer, Alsan RS 230 flashing 12" up walls, and Alsan RS 289 Textured Finish with color pack. Aluminum drip edge installed at perimeter terminations as required.',
  "Brick Area Waterproofing":
    "Prime and waterproof window heads, jambs, and sills with an air–vapor barrier membrane, then apply a continuous air–vapor–water barrier over exterior brick walls. The membrane is installed to provide a seamless moisture and air seal around all openings and across the wall surface. Beauty caulking at exterior joints is excluded from this scope. Application methods, primers, and termination details follow the manufacturer's recommendations.",
  "Brick Area - Waterproofing":
    "Prime and waterproof window heads, jambs, and sills with an air–vapor barrier membrane, then apply a continuous air–vapor–water barrier over exterior brick walls. The membrane is installed to provide a seamless moisture and air seal around all openings and across the wall surface.",
  "Brick Area":
    "Prime and waterproof window heads, jambs, and sills with an air–vapor barrier membrane, then apply a continuous air–vapor–water barrier over exterior brick walls. The membrane is installed to provide a seamless moisture and air seal around all openings and across the wall surface.",
  "Recessed Floor Waterproofing":
    "Prepare the recessed concrete slab by scarifying to achieve a clean, smooth surface, then apply a uniform coat of Soprema RS 276 primer. Install new flashings using Soprema RS 230 Flash grade PMMA resin with Alsan RS fleece reinforcement around all terminations and penetrations, followed by application of the field membrane consisting of Soprema RS 230 Flash grade PMMA with fleece. All work is performed in accordance with Soprema's installation guidelines to produce a seamless, cold liquid‑applied waterproofing system.",
  "Recessed Floor - Waterproofing":
    "Prepare the recessed concrete slab by scarifying to achieve a clean, smooth surface, then apply a uniform coat of Soprema RS 276 primer. Install new flashings using Soprema RS 230 Flash grade PMMA resin with Alsan RS fleece reinforcement around all terminations and penetrations.",
  "Liquid Waterproofing (Recessed Floor)":
    "Prepare the recessed concrete slab by scarifying to achieve a clean, smooth surface, then apply a uniform coat of Soprema RS 276 primer. Install new flashings using Soprema RS 230 Flash grade PMMA resin with Alsan RS fleece reinforcement around all terminations and penetrations.",
  "Drains": "Furnish and install roof drains with lead sheets, primed and sealed with water block sealer.",
  "Doorpans - Standard": "Furnish and install standard door pans at door openings, fully waterproofed and sealed.",
  "Doorpans - Large": "Furnish and install large door pans at door openings, fully waterproofed and sealed.",
  "Scupper/Gutter and Leader": "Furnish and install scupper, gutter, and leader assembly for roof drainage.",
  "Up and Over": 'Install waterproofing membrane up and over parapet walls and bulkheads.',
  "Vapor Barrier or Temp waterproofing": "Install vapor barrier or temporary waterproofing membrane as specified.",
  "Insulation under Coping": "Install insulation under coping per manufacturer specifications.",
}

// Get description for an item, with fallback
function getItemDescription(itemName) {
  // Try exact match first
  if (ITEM_DESCRIPTIONS[itemName]) {
    return ITEM_DESCRIPTIONS[itemName]
  }

  // Try partial match
  for (const [key, desc] of Object.entries(ITEM_DESCRIPTIONS)) {
    if (itemName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(itemName.toLowerCase())) {
      return desc
    }
  }

  // Default fallback
  return `Installation of ${itemName} per manufacturer specifications and industry standards.`
}

// Normalize takeoff row to consistent format
function normalizeRow(row) {
  const name = row.item_name || row.scope || row.item || "Unknown Item"
  const amount = row.total_cost || row.total ||
    ((row.unit_cost || row.unitCost || row.rate || 0) * (row.quantity || row.total_qty || 0))
  return { name, amount: Math.round(amount) }
}

// Group and aggregate takeoff rows into proposal line items
export function takeoffToLineItems(takeoffRows) {
  // Group by item name and aggregate
  const grouped = new Map()

  for (const row of takeoffRows) {
    const { name, amount } = normalizeRow(row)
    if (amount <= 0) continue

    const existing = grouped.get(name)
    if (existing) {
      existing.total += amount
    } else {
      grouped.set(name, {
        total: amount,
        description: getItemDescription(name),
      })
    }
  }

  return Array.from(grouped.entries()).map(([title, data]) => ({
    title,
    amount: Math.round(data.total),
    description: data.description,
  }))
}

// Generate project summary from line items
export function generateProjectSummary(projectName, lineItems) {
  const itemNames = lineItems.map((item) => item.title.toLowerCase())

  const hasRoofing = itemNames.some((n) => n.includes("roof") || n.includes("torchdown") || n.includes("ply"))
  const hasEIFS = itemNames.some((n) => n.includes("eifs") || n.includes("efis"))
  const hasBalcony = itemNames.some((n) => n.includes("balcony") || n.includes("traffic"))
  const hasCoping = itemNames.some((n) => n.includes("coping"))
  const hasWaterproofing = itemNames.some((n) => n.includes("waterproof") || n.includes("brick"))
  const hasFlashing = itemNames.some((n) => n.includes("flash"))

  let summary = `This project involves the installation of `
  const scopes = []

  if (hasRoofing) scopes.push("new roofing systems")
  if (hasWaterproofing) scopes.push("waterproofing")
  if (hasEIFS) scopes.push("EIFS systems")
  if (hasBalcony) scopes.push("balcony waterproofing")
  if (hasCoping || hasFlashing) scopes.push("aluminum coping and flashing")

  if (scopes.length === 0) {
    scopes.push("exterior building envelope systems")
  }

  summary += scopes.join(", ") + ` at ${projectName}. `

  if (hasRoofing) {
    summary += "The scope includes a Firestone APP 160/180 built-up roofing system at main and bulkhead roofs. "
  }
  if (hasCoping) {
    summary += "Aluminum coping and counter-flashing installed at parapets. "
  }
  if (hasEIFS) {
    summary += "EIFS with air-vapor barrier across exterior elevations. "
  }
  if (hasBalcony) {
    summary += "Balcony waterproofing using the Alsan RS 289 textured finish. "
  }

  summary += "All work is performed in accordance with manufacturer requirements and standard installation practices."

  return summary
}

// Create full proposal data from takeoff
export function createProposalFromTakeoff(
  projectName,
  projectAddress,
  clientName,
  clientCompany,
  takeoffRows,
  drawingsDate
) {
  const lineItems = takeoffToLineItems(takeoffRows)

  return {
    projectName,
    projectAddress,
    clientName,
    clientCompany,
    date: new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    drawingsDate,
    summary: generateProjectSummary(projectName, lineItems),
    lineItems,
    exclusions: DEFAULT_EXCLUSIONS,
  }
}
