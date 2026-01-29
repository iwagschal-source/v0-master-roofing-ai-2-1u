-- =============================================================================
-- Proposal Tables Setup Script (Step 8.C.10)
-- Run this in BigQuery console for project: master-roofing-intelligence
-- Dataset: mr_main (Location: US)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Lookup Tables for Dropdown Options
-- -----------------------------------------------------------------------------

-- R-value options for insulation
CREATE TABLE IF NOT EXISTS `master-roofing-intelligence.mr_main.lookup_r_values` (
  value STRING,
  sort_order INT64
);

-- Clear and populate R-values
DELETE FROM `master-roofing-intelligence.mr_main.lookup_r_values` WHERE TRUE;

INSERT INTO `master-roofing-intelligence.mr_main.lookup_r_values` (value, sort_order) VALUES
  ('R5', 1),
  ('R10', 2),
  ('R13', 3),
  ('R19', 4),
  ('R20', 5),
  ('R25', 6),
  ('R30', 7),
  ('R33', 8),
  ('R38', 9),
  ('R40', 10),
  ('R46', 11),
  ('R50', 12);

-- Thickness options (in inches)
CREATE TABLE IF NOT EXISTS `master-roofing-intelligence.mr_main.lookup_thickness` (
  value STRING,
  sort_order INT64
);

-- Clear and populate thickness values
DELETE FROM `master-roofing-intelligence.mr_main.lookup_thickness` WHERE TRUE;

INSERT INTO `master-roofing-intelligence.mr_main.lookup_thickness` (value, sort_order) VALUES
  ('1"', 1),
  ('1.5"', 2),
  ('2"', 3),
  ('2.5"', 4),
  ('3"', 5),
  ('3.5"', 6),
  ('4"', 7),
  ('5"', 8),
  ('6"', 9),
  ('8"', 10),
  ('10"', 11),
  ('12"', 12);

-- Material type options
CREATE TABLE IF NOT EXISTS `master-roofing-intelligence.mr_main.lookup_material_types` (
  value STRING,
  category STRING,
  sort_order INT64
);

-- Clear and populate material types
DELETE FROM `master-roofing-intelligence.mr_main.lookup_material_types` WHERE TRUE;

INSERT INTO `master-roofing-intelligence.mr_main.lookup_material_types` (value, category, sort_order) VALUES
  -- Insulation types
  ('EPS', 'insulation', 1),
  ('XPS', 'insulation', 2),
  ('ISO', 'insulation', 3),
  ('Polyiso', 'insulation', 4),
  ('Fiberglass', 'insulation', 5),
  ('Mineral Wool', 'insulation', 6),

  -- Metal types
  ('Aluminum', 'metal', 10),
  ('Stainless Steel', 'metal', 11),
  ('Galvanized', 'metal', 12),
  ('Pre-finished', 'metal', 13),
  ('Copper', 'metal', 14),

  -- Membrane types
  ('APP', 'membrane', 20),
  ('SBS', 'membrane', 21),
  ('TPO', 'membrane', 22),
  ('EPDM', 'membrane', 23),
  ('PVC', 'membrane', 24),
  ('PMMA', 'membrane', 25);

-- -----------------------------------------------------------------------------
-- 2. Item Description Mapping Table
-- Links takeoff item_ids to proposal paragraph descriptions with placeholders
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS `master-roofing-intelligence.mr_main.item_description_mapping` (
  item_id STRING NOT NULL,
  scope_name STRING,
  paragraph_description STRING,
  bullet_points STRING,
  has_r_value BOOL DEFAULT FALSE,
  has_thickness BOOL DEFAULT FALSE,
  has_material_type BOOL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
);

-- Insert sample description mappings with placeholders
-- Placeholders: {R_VALUE}, {THICKNESS}, {TYPE}

-- Note: Only insert if table is empty (avoid duplicates on re-run)
INSERT INTO `master-roofing-intelligence.mr_main.item_description_mapping`
  (item_id, scope_name, paragraph_description, has_r_value, has_thickness, has_material_type)
SELECT * FROM UNNEST([
  STRUCT(
    'MR-001VB' AS item_id,
    'Vapor Barrier' AS scope_name,
    'Install vapor barrier membrane to deck surface, lapped and sealed per manufacturer specifications, prior to installation of insulation system.' AS paragraph_description,
    FALSE AS has_r_value,
    FALSE AS has_thickness,
    FALSE AS has_material_type
  ),
  STRUCT(
    'MR-002INS',
    'Insulation',
    'Install {TYPE} roof insulation, mechanically fastened with heavy duty insulation fastening plates at 1 fastener per 4 sq. ft. Minimum thickness of {THICKNESS} at lowest point achieving {R_VALUE}. Tapered insulation system to provide positive drainage to roof drains.',
    TRUE,
    TRUE,
    TRUE
  ),
  STRUCT(
    'MR-003BU2PLY',
    'Built-Up 2-Ply Roofing',
    'Install Firestone APP 160/180 modified bitumen roofing system: First layer APP 160 smooth surfaced membrane torch applied to primed DensDeck, all seams overlapping minimum 3". Second layer APP 180 granule surfaced cap sheet, standard white, torch applied with minimum 3" overlaps. All penetrations and terminations flashed per Firestone approved details.',
    FALSE,
    FALSE,
    FALSE
  ),
  STRUCT(
    'MR-004PITCH',
    'Tapered Insulation/Pitch',
    'Install tapered {TYPE} insulation system to create {THICKNESS} per foot pitch for positive drainage to roof drains. Build up diamond cricket at inside corners and between drains. Minimum {THICKNESS} at lowest points, {R_VALUE}.',
    TRUE,
    TRUE,
    TRUE
  ),
  STRUCT(
    'MR-005DRAIN',
    'Roof Drains',
    'Install and shape lead sheets around all roof drains, prime with liquid primer, and apply water block sealer around 4x4 lead sheets. Drains to be installed by plumber and sealed by Master Roofing.',
    FALSE,
    FALSE,
    FALSE
  ),
  STRUCT(
    'MR-006IRMA',
    'IRMA System',
    'Install Firestone SBS modified bitumen roofing system for inverted roof membrane assembly (IRMA). Apply manufacturer approved primer, install SBS smooth surfaced base sheet torch applied with minimum 3" overlaps, followed by SBS granule surfaced cap sheet in standard white.',
    FALSE,
    FALSE,
    FALSE
  ),
  STRUCT(
    'MR-007PMMA',
    'PMMA Liquid Waterproofing',
    'Scarify surface to ensure smooth and leveled surface. Apply even single layer of manufacturer recommended primer. Install Firestone PMMA liquid waterproofing membrane in two coats with reinforcing fabric embedded, minimum 80 mil DFT. Flash all penetrations and terminations minimum 8".',
    FALSE,
    FALSE,
    FALSE
  ),
  STRUCT(
    'MR-COPE',
    'Coping',
    'Furnish and install pre-finished {TYPE} coping with snap-on cover system and concealed fasteners. All joints sealed with compatible sealant. Coping to extend minimum 2" below wall line both sides.',
    FALSE,
    FALSE,
    TRUE
  ),
  STRUCT(
    'MR-FLASH',
    'Flashing',
    'Install pre-finished {TYPE} flashing at all wall terminations, penetrations, and transitions. All flashing to be counter-flashed or terminated into reglet. Sealed with compatible sealant at all joints.',
    FALSE,
    FALSE,
    TRUE
  ),
  STRUCT(
    'MR-DOORPAN',
    'Door Pan',
    'Furnish and install door pan at door opening. Pan to be watertight with welded seams, turned up sides minimum 4", and integrated with roofing membrane system.',
    FALSE,
    FALSE,
    FALSE
  ),
  STRUCT(
    'MR-EIFS',
    'EIFS System',
    'Install Exterior Insulation and Finish System (EIFS) including: preparation of substrate, installation of {THICKNESS} {TYPE} insulation boards mechanically fastened and adhesive applied, reinforcing mesh embedded in base coat, and textured acrylic finish coat in owner-selected color. {R_VALUE} total assembly.',
    TRUE,
    TRUE,
    TRUE
  ),
  STRUCT(
    'MR-OVERBURDEN',
    'Overburden/Ballast',
    'Install roof ballast system over protection board including filter fabric and specified ballast material. Ballast to be minimum weight per square foot as required for wind uplift resistance.',
    FALSE,
    FALSE,
    FALSE
  ),
  STRUCT(
    'MR-PAVER',
    'Pavers',
    'Install pedestal paver system over protection course. Pavers set on adjustable pedestals to maintain level walking surface and allow for drainage below. Perimeter and penetration details per manufacturer specifications.',
    FALSE,
    FALSE,
    FALSE
  )
])
WHERE NOT EXISTS (
  SELECT 1 FROM `master-roofing-intelligence.mr_main.item_description_mapping` LIMIT 1
);

-- -----------------------------------------------------------------------------
-- 3. Verify Tables Created
-- -----------------------------------------------------------------------------

SELECT 'lookup_r_values' AS table_name, COUNT(*) AS row_count
FROM `master-roofing-intelligence.mr_main.lookup_r_values`
UNION ALL
SELECT 'lookup_thickness', COUNT(*)
FROM `master-roofing-intelligence.mr_main.lookup_thickness`
UNION ALL
SELECT 'lookup_material_types', COUNT(*)
FROM `master-roofing-intelligence.mr_main.lookup_material_types`
UNION ALL
SELECT 'item_description_mapping', COUNT(*)
FROM `master-roofing-intelligence.mr_main.item_description_mapping`;
