/**
 * Proposal Systems Library
 *
 * Source of truth: system item templates _1-2-2026.pdf
 *
 * Each system has:
 * - id: Unique identifier for joining with takeoff items
 * - name: Display name for proposals
 * - bullet_points: Original bullet-point format (from PDF)
 * - narrative: Professional paragraph description (to be populated)
 * - variables: Placeholders that get filled from takeoff data
 */

export const PROPOSAL_SYSTEMS = {
  // ============================================
  // ROOFING SYSTEMS
  // ============================================

  "SYS-APP160180": {
    id: "SYS-APP160180",
    name: "Built-Up Roofing – Firestone APP 160/180 System",
    category: "Roofing",
    takeoff_ids: ["MR-003BU2PLY"], // Links to estimating-sheet items
    variables: {
      r_value: "R30",
      thickness: "5\"",
      pitch: "1/8\" per ft",
      drain_count: 0,
      door_pan_count: 0,
    },
    bullet_points: [
      "Install Firestone ISO 95 GL flat and tapered roof insulation, fastened with heavy duty Firestone Insulation Fastening Plates 1 fastener per 4 sq. feet. A min. of {{thickness}} at lowest point. ({{r_value}}), {{pitch}}.",
      "Build up diamond cricket with insulation in b/w drains and all inside corners to create pitch for better drainage. Drains to be installed by plumber and sealed by Master Roofing.",
      "Install primed DensDeck on top of tapered insulation mechanically fastened with metal plates & screws. All sheets to be in a staggered layout, cut and adjusted to all openings and penetrations.",
      "Install fiber cant striping on top of mechanically fastened DensDeck at parapet walls and bulkheads.",
      "Install and shape lead sheets around all drains, prime with liquid primer, and apply water block sealer around 4x4 lead sheets.",
      "Install Firestone APP160, smooth surfaced modified bitumen membrane, torch applied on top of primed dens deck, all seams to overlap a min of 3\".",
      "All walls to be primed with Quick dry Asphalt primer and waterproofed with Firestone APP 160/180 binder flashing, 12\" up on the parapet/building walls, up and over the bulkhead parapets.",
      "All curbs to be primed and flashed with Firestone APP 160/180 binder flashing.",
      "Install a second layer of Firestone APP 180 granule surfaced APP modified bitumen membrane - standard white on top of 1st layer. All seams to overlap a min of 3\".",
      "Install aluminum gutters & leaders around the elevator bulkhead to drain water to main roof.",
      "Install flashing at all necessary areas."
    ],
    narrative: "" // TO BE POPULATED
  },

  "SYS-APP160180-BULKHEAD": {
    id: "SYS-APP160180-BULKHEAD",
    name: "Built-Up Roofing – Firestone APP 160/180 System (Bulkhead)",
    category: "Roofing",
    takeoff_ids: ["MR-003BU2PLY"],
    variables: {
      r_value: "R5",
      thickness: "1\"",
    },
    bullet_points: [
      "Install Firestone ISO 95 GL flat and tapered roof insulation, fastened with heavy duty Firestone Insulation Fastening Plates 1 fastener per 4 sq. feet. A min. of {{thickness}} at lowest point. ({{r_value}})",
      "Install primed DensDeck on top of tapered insulation mechanically fastened with metal plates & screws. All sheets to be in a staggered layout, cut and adjusted to all openings and penetrations.",
      "Install fiber cant striping on top of mechanically fastened DensDeck at parapet walls and bulkheads.",
      "Install and shape lead sheets around all drains, prime with liquid primer, and apply water block sealer around 4x4 lead sheets.",
      "Install Firestone APP160, smooth surfaced modified bitumen membrane, torch applied on top of primed dens deck, all seams to overlap a min of 3\".",
      "All walls to be primed with Quick dry Asphalt primer and waterproofed with Firestone APP 160/180 binder flashing up and over the bulkhead parapets.",
      "All curbs to be primed and flashed with Firestone APP 160/180 binder flashing.",
      "Install a second layer of Firestone APP 180 granule surfaced APP modified bitumen membrane - standard white on top of 1st layer. All seams to overlap a min of 3\".",
      "Install aluminum gutters & leaders to drain water.",
      "Clean and prep all penetrations, AC units, skylights drains and low clearance items, grind and scarify as necessary. Apply Primer on roofing objects and flash with Firestone Ultra-flash liquid Membrane System a min of 8\" per Firestone General Requirements and Approved Details."
    ],
    narrative: ""
  },

  "SYS-SBS-IRMA": {
    id: "SYS-SBS-IRMA",
    name: "Firestone SBS Roofing System (Irma)",
    category: "Roofing",
    takeoff_ids: ["MR-006IRMA"],
    variables: {
      door_pan_count: 0,
    },
    bullet_points: [
      "Apply manufactures approved Primer that readily penetrates the pores of the material to which it is applied and seals surfaces to provide a firm bond for asphalt coatings.",
      "Install and shape lead sheets around all drains, prime with liquid primer, and apply water block sealer around 4x4 lead sheets.",
      "Install Firestone SBS, smooth surfaced modified bitumen membrane, torch applied on primed surface, all seams to overlap a minimum of 3\".",
      "Install a second layer of Firestone SBS granule surfaced modified bitumen membrane - standard white on top of 1st layer. All seams to overlap a min of 3\".",
      "Clean and prep all penetrations, drains and low clearance items, grind and scarify as necessary. Apply Primer on roofing objects and flash with Firestone Ultra-flash liquid Membrane System a min of 8\" per Firestone General Requirements and Approved Details.",
      "All walls to be primed with Quick dry Asphalt primer and waterproofed with Firestone binder flashing, 12\" up on the parapet/building walls, up and over the parapets.",
      "Furnish and install {{door_pan_count}} door pans in total at the door openings.",
      "Install flashing at all necessary areas."
    ],
    narrative: ""
  },

  "SYS-PMMA": {
    id: "SYS-PMMA",
    name: "Firestone PMMA Roofing System",
    category: "Roofing",
    takeoff_ids: ["MR-007PMMA", "MR-008PMMA"],
    variables: {},
    bullet_points: [
      "Scarify surface to ensure smooth and leveled surface, this will help for bondage of the roofing system and decrease chances for air pockets or bubbles.",
      "Apply an even single layer of manufacture's recommended Bounder primer, at all areas receiving Firestone liquid waterproofing system.",
      "Install new flashings consisting of Firestone PMMA with Fleece in accordance with Firestone, Inc requirements.",
      "Install field membrane consisting of Firestone PMMA with Fleece in accordance with Firestone, Inc requirements.",
      "Clean and prep all penetrations, drains and low clearance items, grind and scarify as necessary. Apply Primer on roofing objects and flash with Firestone Ultra-flash liquid Membrane System a min of 8\" per Firestone General Requirements and Approved Details.",
      "All walls to be primed with primer and waterproofed with Firestone PMMA binder flashing, 12\" up on the parapet/building walls, up and over the parapets."
    ],
    narrative: ""
  },

  "SYS-TPO": {
    id: "SYS-TPO",
    name: "TPO Roofing System",
    category: "Roofing",
    takeoff_ids: [],
    variables: {
      thickness: "1/2\"",
    },
    bullet_points: [
      "Install ISO 95 GL flat and tapered roof insulation on top of decking fastened with heavy duty insulation fastening plates; 1 fastener per 4 sq. feet. A minimum of {{thickness}} at lowest point.",
      "Build up diamond cricket with insulation in b/w drains and all inside corners to create pitch for drainage. Drains to be installed by plumber and sealed by Master Roofing.",
      "Install TPO vinyl flashing around all new drains, install liquid water block sealer around all drains.",
      "Install Carlisle TPO 060 Mil Sure-Weld white roofing system mechanically fastened as per manufactures specification.",
      "All seams to overlap a minimum of 4\", bonded with automated heat welder, and some areas to be welded with hand held heat welder to meet manufacturers' requirements.",
      "All walls to primed and flashed with Carlisle TPO Sure-Weld membrane 12\" up on the parapet wall.",
      "Install new TPO pipe boot flashing around all pipes & penetrations of roof, sealed & flashed as per manufacturers' specs.",
      "Install pre-molded inside & outside corner 60 mil thick flashing on all inside & outside corners, color to match membrane.",
      "All curbs on roof to flashed with Carlisle Pressure sensitive non-reinforced TPO flashing.",
      "Roofing penetrations and or objects penetrating roofing system to be flashed and waterproofed with pitch pockets filled with two part pourable sealer.",
      "Install flashing at all necessary areas."
    ],
    narrative: ""
  },

  "SYS-EPDM": {
    id: "SYS-EPDM",
    name: "EPDM Roofing System",
    category: "Roofing",
    takeoff_ids: [],
    variables: {
      thickness: "1/2\"",
    },
    bullet_points: [
      "Install tapered roof insulation on top of decking fastened with insulation fastening plates; 1 fastener per 4 sq. feet. A min of {{thickness}}.",
      "Build up diamond cricket with insulation in b/w drains and all inside corners to create pitch for drainage. Drains to be installed by plumber and sealed by Master Roofing.",
      "Install EPDM flashing around all new drains, install liquid water block sealer around all drains.",
      "Install Recovery boards on top of the insulation mechanically fastened, as per manufacturers' requirements.",
      "Install .060 Sure-Seal non-reinforced Ethylene Propylene Diene Terpolymer (EPDM) based elastomeric homogenous roofing membrane, as per manufactures specification. All seams to overlap a minimum of 4\" & bonded with double sided seam tape.",
      "All walls to be primed and flashed with EPDM roofing membrane, 12\" up on building walls and up and over on the bulkhead.",
      "Install new pipe boot flashing around all pipes & penetrations of roof, sealed & flashed as per manufacturers' specs.",
      "Roofing penetrations and or objects penetrating roofing system to be flashed and waterproofed with pitch pockets filled with two-part pourable sealer.",
      "All roofing curbs to be flashed with Pressure sensitive EPDM flashing, as per manufactures specifications.",
      "Install flashing at all necessary areas."
    ],
    narrative: ""
  },

  // ============================================
  // METAL WORK
  // ============================================

  "SYS-AL-COUNTER-FLASH": {
    id: "SYS-AL-COUNTER-FLASH",
    name: "Aluminum Counter Flashing/Stucco Receiver",
    category: "Metal Work",
    takeoff_ids: ["MR-025FLASHBLDG", "MR-026FLASHPAR"],
    variables: {},
    bullet_points: [
      "Install two-part aluminum counter flashing/stucco receiver overlapping roofing membrane a minimum of 4\"."
    ],
    narrative: ""
  },

  "SYS-AL-COPING": {
    id: "SYS-AL-COPING",
    name: "Aluminum Coping System",
    category: "Metal Work",
    takeoff_ids: ["MR-022COPELO", "MR-023COPEHI"],
    variables: {},
    bullet_points: [
      "Install waterproofing membrane on parapet wall prior of installation of steel brackets.",
      "Install metal under plates anchored into parapet walls.",
      "Install aluminum coping clipped onto under plates.",
      "Flash & seal all seams & joint of coping with waterproofing as per manufacturers specs.",
      "Install flashing at all areas necessary."
    ],
    narrative: ""
  },

  // ============================================
  // WATERPROOFING SYSTEMS
  // ============================================

  "SYS-SOPREMA-RS230": {
    id: "SYS-SOPREMA-RS230",
    name: "Soprema RS 230 Waterproofing System",
    category: "Waterproofing",
    takeoff_ids: ["MR-032RECESSWP"],
    variables: {},
    bullet_points: [
      "Scarify surface to ensure smooth and leveled surface, this will help for bondage of the roofing system and decrease chances for air pockets or bubbles.",
      "Apply an even single layer of Soprema RS 276 Primer over the concrete at all receiving Soprema liquid waterproofing system.",
      "Install new flashings consisting of Soprema RS 230 Flash grade PMMA with Alsan RS Fleece in accordance with Soprema, Inc requirements.",
      "Install field membrane consisting of Soprema RS 230 Flash grade PMMA with Alsan RS Fleece in accordance with Soprema, Inc requirements."
    ],
    narrative: ""
  },

  "SYS-ALSAN-RS": {
    id: "SYS-ALSAN-RS",
    name: "Liquid-Applied Alsan RS Waterproofing",
    category: "Waterproofing",
    takeoff_ids: ["MR-033TRAFFIC", "MR-035LFLASH"],
    variables: {},
    bullet_points: [
      "Install SOPREMA \"Alsan RS 276 Primer\".",
      "Apply Soprema Alsan Rs 230 liquid applied flashing 12\" up on primed walls.",
      "Install SOPREMA \"Alsan RS 289 Textured Finish\" mixed with \"Alsan RS Color Pack\".",
      "Install aluminum drip edge at necessary areas."
    ],
    narrative: ""
  },

  "SYS-SOPREMA-FLAM180": {
    id: "SYS-SOPREMA-FLAM180",
    name: "Soprema Flam 180 Roofing System",
    category: "Roofing",
    takeoff_ids: [],
    variables: {
      thickness: "1/2\"",
    },
    bullet_points: [
      "Install SOPREMA Sopra-ISO polyisocyanurate flat and tapered insulation. A minimum of {{thickness}}. Fastened as per manufacturers spec.",
      "Build up diamond cricket with insulation in b/w drains and all inside corners to create pitch for better drainage. Drains to be installed by plumber and sealed by Master Roofing.",
      "Install 4x4 lead sheets around drains, waterproof with Soprema approved flashing.",
      "Install Sopra Boards on top of tapered insulation fastened as per manufactures specifications. Boards to be cut and adjusted to size around all openings and penetrations.",
      "Apply Field membrane one base ply of SOPREMA Colphene/Sopralene Flam 180, heat welded. All seams to overlap a minimum of 3\" as per manufacturers specifications.",
      "Apply Field membrane one cap ply of SOPREMA Colphene/Sopralene Flam 180 GR, heat welded. All seams to overlap a minimum of 3\" as per manufacturers specifications.",
      "All walls to be primed with Soprema Elastocol 500 Primer and Soprema Colphene/Sopralene flashing, 12\" up on the wall.",
      "All A/C curbs to be primed with SOPREMA Blastocoel 500 Primer and flashed with SOPREMA Colphene/Sopralene flashing membrane, a min of 8\" up on curb.",
      "Install flashing at all necessary areas."
    ],
    narrative: ""
  },

  "SYS-SOPREMA-COLPHENE": {
    id: "SYS-SOPREMA-COLPHENE",
    name: "Soprema Colphene Flam 180 Roofing System",
    category: "Roofing",
    takeoff_ids: [],
    variables: {},
    bullet_points: [
      "Concrete deck to be primed with SOPREMA Elastocol 500 Primer.",
      "Install 4x4 lead sheets around drains, waterproof with Soprema approved flashing. Drains to be installed by plumber and sealed by Master Roofing.",
      "Apply Field membrane one base ply of SOPREMA Colphene Flam 180, heat welded. All seams to overlap minimum of 3\".",
      "Apply Field membrane one cap ply of SOPREMA Colphene Flam 180 GR, heat welded. All seams to overlap minimum of 3\".",
      "All walls to be primed with Soprema Elastocol 500 Primer and waterproofed with Soprema Colphene flashing, 12\" up on the wall.",
      "All curbs to be primed with SOPREMA Blastocoel 500 Primer and flashed with Soprema Colphene Flam 180 as per manufacturer's specifications.",
      "Clean and prep all penetrations and low clearance items, grind and scarify as necessary. Apply Soprema RS 276 primer on roofing objects and flash with SOPREMA Alsan RS 230 Flash Reinforced Liquid Membrane System a min of 8\" per SOPREMA General Requirements and Approved Details."
    ],
    narrative: ""
  },

  "SYS-TRAFFIC-COATING": {
    id: "SYS-TRAFFIC-COATING",
    name: "Soprema Heavy Traffic Coating",
    category: "Waterproofing",
    takeoff_ids: ["MR-033TRAFFIC"],
    variables: {},
    bullet_points: [
      "Scarify surface to ensure smooth and leveled surface, this will help with bondage of the roofing system and decrease chances for air pockets or bubbles.",
      "Apply an even single layer of manufacture's recommended Bounder primer, Soprema RS 276 Primer at all areas where Soprema Liquid waterproofing system to be installed.",
      "Install new flashings consisting of Soprema RS 230 Flash grade PMMA with Alsan RS Fleece in accordance with Soprema, Inc requirements.",
      "Install field membrane consisting of Soprema RS 230 Field grade PMMA with Alsan RS Fleece in accordance with Soprema, Inc requirements.",
      "Apply SOPREMA \"Alsan RS 289 Textured Finish\" mixed with \"Alsan RS Color Pack\" on RS230 waterproofing system."
    ],
    narrative: ""
  },

  // ============================================
  // EXTERIOR/FACADE SYSTEMS
  // ============================================

  "SYS-EIFS": {
    id: "SYS-EIFS",
    name: "Exterior Insulation and Finish System (EIFS)",
    category: "Exterior",
    takeoff_ids: ["MR-043EIFS"],
    variables: {
      r_value: "R-11.4",
      thickness: "3\"",
    },
    bullet_points: [
      "Prime and waterproof window heads, jambs, and sills with air and vapor barrier, sealing all joints with mesh tape.",
      "Apply continuous air and moisture barrier.",
      "Install {{thickness}} EIFS EPS insulation ({{r_value}}).",
      "Apply base coat with mesh reinforcement.",
      "Apply finish coat.",
      "Caulk and seal all window and door perimeters."
    ],
    narrative: ""
  },

  "SYS-BRICK-WATERPROOFING": {
    id: "SYS-BRICK-WATERPROOFING",
    name: "Brick Area Waterproofing",
    category: "Exterior",
    takeoff_ids: ["MR-037BRICKWP"],
    variables: {},
    bullet_points: [
      "Prime and waterproof window heads, jambs, and sills with an air–vapor barrier membrane.",
      "Apply a continuous air–vapor–water barrier over exterior brick walls.",
      "The membrane is installed to provide a seamless moisture and air seal around all openings and across the wall surface.",
      "Beauty caulking at exterior joints is excluded from this scope.",
      "Application methods, primers, and termination details follow the manufacturer's recommendations."
    ],
    narrative: ""
  },

  // ============================================
  // SHINGLE SYSTEMS
  // ============================================

  "SYS-GAF-TIMBERLINE": {
    id: "SYS-GAF-TIMBERLINE",
    name: "GAF Timberline Roof Shingles",
    category: "Roofing",
    takeoff_ids: [],
    variables: {},
    bullet_points: [
      "Cover all open plywood with 15 lb. felt paper mechanically fastened to wood decking.",
      "Install self-adhered Ice & Water Shield 36\" on all edges & valleys of roof, mechanically fastened.",
      "Install GAF Timberline HD Lifetime Asphalt Roof Shingles on main roof, mechanically fastened with roofing cap nail on a minimum of 6 nails per shingle.",
      "Install Cobra Ridge Vent with T-text cap on all peaks of roof.",
      "Install GAF Timberline Asphalt Roof capping on all hips & peaks of roof.",
      "Install new pitched pipe flashing around all pipes penetrating the roof area.",
      "Install flashing as necessary."
    ],
    narrative: ""
  },

  "SYS-STANDING-SEAM": {
    id: "SYS-STANDING-SEAM",
    name: "Standing Seam Roof",
    category: "Roofing",
    takeoff_ids: [],
    variables: {},
    bullet_points: [
      "Install Waterproofing membrane on roofing area, all seams to be overlapping a minimum of 4\" as per manufacturer's specifications.",
      "Install aluminum drip edge flashing at necessary areas.",
      "Install aluminum rake edge flashing at necessary areas.",
      "Install aluminum starter all around perimeter of standing seam roof.",
      "Install .040 standing seam roofing panels on top of insulation, all panels to be mechanically fastened with plates & screws as per manufacturer's specifications. (Standard color options)",
      "Install 040 aluminum capping as necessary.",
      "Install aluminum flashing at all necessary area."
    ],
    narrative: ""
  },

  "SYS-SLATE": {
    id: "SYS-SLATE",
    name: "Evergreen Vermont Slate Shingles",
    category: "Roofing",
    takeoff_ids: [],
    variables: {},
    bullet_points: [
      "Install self-adhered Grace self-adhered Waterproofing membrane.",
      "Install lead coated copper on the valleys of the roof fully soldered.",
      "Install Vermont Natural Slate 12\" X 12\" starter tiles on all eaves and rakes of the roof, as per manufactures specifications.",
      "Install Evergreen Vermont Natural Slate Tiles with an exposure as per drawings.",
      "Install Evergreen slate Hip and ridge capping on all hips & peaks of roof.",
      "Install lead coated copper flashing at the dormers as necessary.",
      "Furnish and install drip edge as necessary."
    ],
    narrative: ""
  },

  // ============================================
  // SIDING SYSTEMS
  // ============================================

  "SYS-VINYL-SIDING": {
    id: "SYS-VINYL-SIDING",
    name: "Royal Crest Vinyl Siding",
    category: "Siding",
    takeoff_ids: [],
    variables: {},
    bullet_points: [
      "Provide and set up pump jack scaffolding for the installation of siding.",
      "Cover open plywood with Tri-Build house wrap.",
      "Install aluminum starter channel, as necessary.",
      "Install Royal Crest outside corner post on all corners of the building.",
      "Install Vinyl J Channels around all windows and doors.",
      "Install Royal Crest Double 4 Vinyl Siding, choice of standard colors.",
      "Furnish and install 0.19 Ga aluminum trim coil on top of fascia, choice of standard colors."
    ],
    narrative: ""
  },

  "SYS-EQUITONE": {
    id: "SYS-EQUITONE",
    name: "Equitone Facade Panels",
    category: "Exterior",
    takeoff_ids: [],
    variables: {},
    bullet_points: [
      "Apply Fluid Applied, Vapor Permeable Air & Water Barrier Membrane on surface of exterior wall on, surface to be covered and spread to an even thickness.",
      "Install furring strip as necessary on top of waterproofing.",
      "Install EPDM flashing on top of furring strips.",
      "Furnish and install Equitone paneling, fastened to furring strips as per manufactures specifications."
    ],
    narrative: ""
  },

  // ============================================
  // MISCELLANEOUS
  // ============================================

  "SYS-TIE-IN": {
    id: "SYS-TIE-IN",
    name: "Tie-In (PMMA)",
    category: "Waterproofing",
    takeoff_ids: ["MR-049TIEIN"],
    variables: {},
    bullet_points: [
      "Apply PMMA waterproofing membrane where the 1st floor meets the foundation."
    ],
    narrative: ""
  },

  "SYS-MASTERSEAL": {
    id: "SYS-MASTERSEAL",
    name: "MasterSeal Waterproofing",
    category: "Waterproofing",
    takeoff_ids: [],
    variables: {},
    bullet_points: [
      "Clean and prep surface prior to the installation of Masterseal Waterproofing, remove all loose items to ensure smooth surface.",
      "Apply a coat of MasterSeal Traffic 1500 Polyurethane waterproofing, traffic-bearing membrane systems for vehicular, as per manufacturers specifications."
    ],
    narrative: ""
  },
}

/**
 * NEW DESCRIPTIONS TABLE
 * Copy of systems with narrative field ready to be populated
 * The bullet_points field is removed - populate narrative with professional paragraphs
 */
export const PROPOSAL_SYSTEM_DESCRIPTIONS = {
  "SYS-APP160180": {
    id: "SYS-APP160180",
    name: "Built-Up Roofing – Firestone APP 160/180 System",
    category: "Roofing",
    takeoff_ids: ["MR-003BU2PLY"],
    variables: { r_value: "R30", thickness: "5\"", pitch: "1/8\" per ft", drain_count: 0, door_pan_count: 0 },
    narrative: "Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads. Lead sheets installed and sealed at all drains. Assembly includes torch-applied Firestone APP160 smooth base ply and APP180 white granulated cap sheet with 3\" laps, with walls and curbs primed and flashed 12\" up using APP160/180 binder flashing. Door pans furnished and installed at openings."
  },

  "SYS-APP160180-BULKHEAD": {
    id: "SYS-APP160180-BULKHEAD",
    name: "Built-Up Roofing – Firestone APP 160/180 System (Bulkhead)",
    category: "Roofing",
    takeoff_ids: ["MR-003BU2PLY"],
    variables: { r_value: "R5", thickness: "1\"" },
    narrative: "Bulkhead roofing includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, minimum {{thickness}} at lowest point ({{r_value}}), with primed DensDeck coverboard and fiber cant at parapets. Lead sheets installed and sealed at all drains. Assembly includes torch-applied Firestone APP160 smooth base ply and APP180 white granulated cap sheet with 3\" laps. All walls primed and flashed up and over bulkhead parapets using APP160/180 binder flashing. Penetrations, AC units, skylights, and low clearance items cleaned, prepped, and flashed with Firestone Ultra-flash liquid membrane system minimum 8\" per manufacturer requirements. Aluminum gutters and leaders installed to drain water."
  },

  "SYS-SBS-IRMA": {
    id: "SYS-SBS-IRMA",
    name: "Firestone SBS Roofing System (Irma)",
    category: "Roofing",
    takeoff_ids: ["MR-006IRMA"],
    variables: { door_pan_count: 0 },
    narrative: "IRMA roofing system includes application of manufacturer-approved primer to seal surfaces and provide firm bond for asphalt coatings. Lead sheets installed and sealed at all drains with water block sealer. Assembly includes torch-applied Firestone SBS smooth base ply and SBS white granulated cap sheet with minimum 3\" laps. All walls primed with quick-dry asphalt primer and flashed 12\" up on parapet walls and up and over parapets. Penetrations, drains, and low clearance items cleaned, prepped, and flashed with Firestone Ultra-flash liquid membrane system minimum 8\" per manufacturer requirements. Door pans furnished and installed at openings."
  },

  "SYS-PMMA": {
    id: "SYS-PMMA",
    name: "Firestone PMMA Roofing System",
    category: "Roofing",
    takeoff_ids: ["MR-007PMMA", "MR-008PMMA"],
    variables: {},
    narrative: "PMMA roofing system includes surface preparation by scarifying to ensure smooth, leveled surface for proper membrane bondage. Apply manufacturer-recommended primer at all areas receiving Firestone liquid waterproofing. Install new flashings and field membrane consisting of Firestone PMMA with fleece reinforcement in accordance with Firestone requirements. All penetrations, drains, and low clearance items cleaned, prepped, and flashed with Firestone Ultra-flash liquid membrane system minimum 8\" per manufacturer requirements. All walls primed and waterproofed with Firestone PMMA binder flashing 12\" up on parapet walls and up and over parapets."
  },

  "SYS-TPO": {
    id: "SYS-TPO",
    name: "TPO Roofing System",
    category: "Roofing",
    takeoff_ids: [],
    variables: { thickness: "1/2\"" },
    narrative: "TPO roofing system includes installation of ISO 95 GL flat and tapered insulation mechanically fastened on top of decking, minimum {{thickness}} at lowest point. Diamond crickets built up with insulation between drains and inside corners for proper drainage. Install Carlisle TPO 060 mil Sure-Weld white roofing system mechanically fastened per manufacturer specifications, all seams overlapping minimum 4\" and bonded with automated heat welder. TPO vinyl flashing installed around all drains with liquid water block sealer. All walls primed and flashed with Carlisle TPO Sure-Weld membrane 12\" up on parapet walls. Pre-molded inside and outside corner flashing installed at all corners, color to match membrane. All curbs flashed with Carlisle pressure-sensitive TPO flashing, and penetrations waterproofed with pitch pockets filled with two-part pourable sealer."
  },

  "SYS-EPDM": {
    id: "SYS-EPDM",
    name: "EPDM Roofing System",
    category: "Roofing",
    takeoff_ids: [],
    variables: { thickness: "1/2\"" },
    narrative: "EPDM roofing system includes installation of tapered roof insulation mechanically fastened on top of decking, minimum {{thickness}} at lowest point. Diamond crickets built up with insulation between drains and inside corners for proper drainage. Recovery boards installed on top of insulation mechanically fastened per manufacturer requirements. Install .060 Sure-Seal non-reinforced EPDM elastomeric roofing membrane with all seams overlapping minimum 4\" and bonded with double-sided seam tape. EPDM flashing installed around all drains with liquid water block sealer. All walls primed and flashed with EPDM membrane 12\" up on building walls and up and over bulkheads. Pipe boot flashing installed around all penetrations per manufacturer specifications. All curbs flashed with pressure-sensitive EPDM flashing, and penetrations waterproofed with pitch pockets filled with two-part pourable sealer."
  },

  "SYS-AL-COUNTER-FLASH": {
    id: "SYS-AL-COUNTER-FLASH",
    name: "Aluminum Counter Flashing/Stucco Receiver",
    category: "Metal Work",
    takeoff_ids: ["MR-025FLASHBLDG", "MR-026FLASHPAR"],
    variables: {},
    narrative: "Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4\"."
  },

  "SYS-AL-COPING": {
    id: "SYS-AL-COPING",
    name: "Aluminum Coping System",
    category: "Metal Work",
    takeoff_ids: ["MR-022COPELO", "MR-023COPEHI"],
    variables: {},
    narrative: "Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications."
  },

  "SYS-SOPREMA-RS230": {
    id: "SYS-SOPREMA-RS230",
    name: "Soprema RS 230 Waterproofing System",
    category: "Waterproofing",
    takeoff_ids: ["MR-032RECESSWP"],
    variables: {},
    narrative: "Prepare the recessed concrete slab by scarifying to achieve a clean, smooth surface, then apply a uniform coat of Soprema RS 276 primer. Install new flashings using Soprema RS 230 Flash grade PMMA resin with Alsan RS fleece reinforcement around all terminations and penetrations, followed by application of the field membrane consisting of Soprema RS 230 Flash grade PMMA with fleece. All work is performed in accordance with Soprema's installation guidelines to produce a seamless, cold liquid-applied waterproofing system."
  },

  "SYS-ALSAN-RS": {
    id: "SYS-ALSAN-RS",
    name: "Liquid-Applied Alsan RS Waterproofing",
    category: "Waterproofing",
    takeoff_ids: ["MR-033TRAFFIC", "MR-035LFLASH"],
    variables: {},
    narrative: "Balcony waterproofing includes application of Alsan RS 276 Primer, Alsan RS 230 flashing 12\" up walls, and Alsan RS 289 Textured Finish with color pack. Aluminum drip edge installed at perimeter terminations as required."
  },

  "SYS-SOPREMA-FLAM180": {
    id: "SYS-SOPREMA-FLAM180",
    name: "Soprema Flam 180 Roofing System",
    category: "Roofing",
    takeoff_ids: [],
    variables: { thickness: "1/2\"" },
    narrative: "Soprema Flam 180 roofing system includes installation of Soprema Sopra-ISO polyisocyanurate flat and tapered insulation, minimum {{thickness}}, fastened per manufacturer specifications. Diamond crickets built up with insulation between drains and inside corners for proper drainage. Install 4x4 lead sheets around drains waterproofed with Soprema-approved flashing. Sopra boards installed on top of tapered insulation and fastened per manufacturer requirements. Apply one base ply of Soprema Colphene/Sopralene Flam 180 heat-welded with minimum 3\" lap, followed by one cap ply of Soprema Colphene/Sopralene Flam 180 GR heat-welded. All walls primed with Soprema Elastocol 500 primer and flashed 12\" up with Soprema Colphene/Sopralene flashing. All AC curbs primed and flashed minimum 8\" up per manufacturer specifications."
  },

  "SYS-SOPREMA-COLPHENE": {
    id: "SYS-SOPREMA-COLPHENE",
    name: "Soprema Colphene Flam 180 Roofing System",
    category: "Roofing",
    takeoff_ids: [],
    variables: {},
    narrative: "Soprema Colphene roofing system includes priming concrete deck with Soprema Elastocol 500 primer. Install 4x4 lead sheets around drains waterproofed with Soprema-approved flashing. Apply one base ply of Soprema Colphene Flam 180 heat-welded with minimum 3\" lap, followed by one cap ply of Soprema Colphene Flam 180 GR heat-welded. All walls primed with Soprema Elastocol 500 primer and waterproofed with Soprema Colphene flashing 12\" up on walls. All curbs primed with Soprema Blastocoel 500 primer and flashed with Soprema Colphene Flam 180 per manufacturer specifications. All penetrations and low clearance items cleaned, prepped, primed with Soprema RS 276 primer and flashed with Soprema Alsan RS 230 Flash reinforced liquid membrane system minimum 8\" per Soprema requirements."
  },

  "SYS-TRAFFIC-COATING": {
    id: "SYS-TRAFFIC-COATING",
    name: "Soprema Heavy Traffic Coating",
    category: "Waterproofing",
    takeoff_ids: ["MR-033TRAFFIC"],
    variables: {},
    narrative: "Heavy traffic coating system includes surface preparation by scarifying to achieve clean, smooth surface for proper membrane bondage. Apply uniform coat of Soprema RS 276 primer at all areas receiving Soprema liquid waterproofing. Install new flashings consisting of Soprema RS 230 Flash grade PMMA with Alsan RS fleece reinforcement in accordance with Soprema requirements. Install field membrane consisting of Soprema RS 230 Field grade PMMA with Alsan RS fleece. Apply Soprema Alsan RS 289 Textured Finish mixed with Alsan RS Color Pack on RS230 waterproofing system for traffic-bearing surface."
  },

  "SYS-EIFS": {
    id: "SYS-EIFS",
    name: "Exterior Insulation and Finish System (EIFS)",
    category: "Exterior",
    takeoff_ids: ["MR-043EIFS"],
    variables: { r_value: "R-11.4", thickness: "3\"" },
    narrative: "Scope includes priming and waterproofing window heads, jambs, and sills with air and vapor barrier, sealing all joints with mesh tape. Apply continuous air and moisture barrier, followed by {{thickness}} EIFS EPS insulation ({{r_value}}), base coat with mesh, and finish coat. Caulk and seal all window and door perimeters."
  },

  "SYS-BRICK-WATERPROOFING": {
    id: "SYS-BRICK-WATERPROOFING",
    name: "Brick Area Waterproofing",
    category: "Exterior",
    takeoff_ids: ["MR-037BRICKWP"],
    variables: {},
    narrative: "Prime and waterproof window heads, jambs, and sills with an air-vapor barrier membrane, then apply a continuous air-vapor-water barrier over exterior brick walls. The membrane is installed to provide a seamless moisture and air seal around all openings and across the wall surface. Beauty caulking at exterior joints is excluded from this scope. Application methods, primers, and termination details follow the manufacturer's recommendations."
  },

  "SYS-GAF-TIMBERLINE": {
    id: "SYS-GAF-TIMBERLINE",
    name: "GAF Timberline Roof Shingles",
    category: "Roofing",
    takeoff_ids: [],
    variables: {},
    narrative: "Shingle roofing system includes covering all open plywood with 15 lb. felt paper mechanically fastened to wood decking. Install self-adhered Ice & Water Shield 36\" on all edges and valleys of roof mechanically fastened. Install GAF Timberline HD Lifetime Asphalt Roof Shingles on main roof mechanically fastened with minimum 6 roofing cap nails per shingle. Install Cobra Ridge Vent with T-text cap on all peaks of roof. Install GAF Timberline Asphalt Roof capping on all hips and peaks of roof. Install new pitched pipe flashing around all pipes penetrating the roof area. Install flashing as necessary."
  },

  "SYS-STANDING-SEAM": {
    id: "SYS-STANDING-SEAM",
    name: "Standing Seam Roof",
    category: "Roofing",
    takeoff_ids: [],
    variables: {},
    narrative: "Standing seam roofing system includes installation of waterproofing membrane on roofing area with all seams overlapping minimum 4\" per manufacturer specifications. Install aluminum drip edge and rake edge flashing at necessary areas. Install aluminum starter all around perimeter of standing seam roof. Install .040 standing seam roofing panels on top of insulation mechanically fastened with plates and screws per manufacturer specifications, standard color options. Install .040 aluminum capping as necessary. Install aluminum flashing at all necessary areas."
  },

  "SYS-SLATE": {
    id: "SYS-SLATE",
    name: "Evergreen Vermont Slate Shingles",
    category: "Roofing",
    takeoff_ids: [],
    variables: {},
    narrative: "Slate roofing system includes installation of self-adhered Grace waterproofing membrane. Install lead-coated copper on valleys of roof fully soldered. Install Vermont Natural Slate 12\" x 12\" starter tiles on all eaves and rakes of roof per manufacturer specifications. Install Evergreen Vermont Natural Slate tiles with exposure per drawings. Install Evergreen slate hip and ridge capping on all hips and peaks of roof. Install lead-coated copper flashing at dormers as necessary. Furnish and install drip edge as necessary."
  },

  "SYS-VINYL-SIDING": {
    id: "SYS-VINYL-SIDING",
    name: "Royal Crest Vinyl Siding",
    category: "Siding",
    takeoff_ids: [],
    variables: {},
    narrative: "Vinyl siding system includes providing and setting up pump jack scaffolding for installation. Cover open plywood with Tri-Build house wrap. Install aluminum starter channel as necessary. Install Royal Crest outside corner post on all corners of building. Install vinyl J channels around all windows and doors. Install Royal Crest Double 4 Vinyl Siding, choice of standard colors. Furnish and install 0.19 Ga aluminum trim coil on top of fascia, choice of standard colors."
  },

  "SYS-EQUITONE": {
    id: "SYS-EQUITONE",
    name: "Equitone Facade Panels",
    category: "Exterior",
    takeoff_ids: [],
    variables: {},
    narrative: "Equitone facade system includes application of fluid-applied, vapor-permeable air and water barrier membrane on surface of exterior wall, spread to even thickness. Install furring strips as necessary on top of waterproofing. Install EPDM flashing on top of furring strips. Furnish and install Equitone paneling fastened to furring strips per manufacturer specifications."
  },

  "SYS-TIE-IN": {
    id: "SYS-TIE-IN",
    name: "Tie-In (PMMA)",
    category: "Waterproofing",
    takeoff_ids: ["MR-049TIEIN"],
    variables: {},
    narrative: "Apply PMMA waterproofing membrane where the 1st floor meets the foundation."
  },

  "SYS-MASTERSEAL": {
    id: "SYS-MASTERSEAL",
    name: "MasterSeal Waterproofing",
    category: "Waterproofing",
    takeoff_ids: [],
    variables: {},
    narrative: "MasterSeal waterproofing system includes cleaning and prepping surface prior to installation, removing all loose items to ensure smooth surface. Apply coat of MasterSeal Traffic 1500 polyurethane waterproofing, traffic-bearing membrane system for vehicular traffic per manufacturer specifications."
  },
}

/**
 * Helper to get system by takeoff item ID
 */
export function getSystemByTakeoffId(takeoffId) {
  for (const system of Object.values(PROPOSAL_SYSTEMS)) {
    if (system.takeoff_ids.includes(takeoffId)) {
      return system
    }
  }
  return null
}

/**
 * Helper to get narrative description with variables replaced
 */
export function getSystemNarrative(systemId, variables = {}) {
  const system = PROPOSAL_SYSTEM_DESCRIPTIONS[systemId]
  if (!system || !system.narrative) return null

  let narrative = system.narrative
  const mergedVars = { ...system.variables, ...variables }

  for (const [key, value] of Object.entries(mergedVars)) {
    narrative = narrative.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }

  return narrative
}

export default PROPOSAL_SYSTEMS
