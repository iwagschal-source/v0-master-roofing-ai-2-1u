// Brand Color System — Phase 11 UI Restructure
// Source: Isaac's SVG assets (MR_BUTTONS.zip)

export const BRAND_COLORS = {
  bluebeamBlue: '#277ed0',
  takeoffGreen: '#00aa50',
  markupOrange: '#e36300',
  drawingsDark: '#041e44',
  drawingsInactive: '#3b3b3b',
  exportGrayNavy: '#3e4f6c',
  proposalRed: '#d7403a',
  inactiveGray: '#b4b4b4',
  btxCardBlue: '#277ed0',
  takeoffCardGreen: '#00aa50',
}

// Icon SVG file mapping (verified from actual file contents)
// Group A: Ribbon action buttons (solid pill, 288x48)
// Group B: Dropdown cards (expanded panels with sub-options)
// Group C: Status icon badges (outline pills with MR logo, 144x48)
export const ICON_FILES = {
  // Ribbon buttons (used in Setup and Version ribbons — Session 48)
  setupTakeoffButton: '/icons/1.svg',
  setupBtxToolsButton: '/icons/3.svg',
  createProposalButton: '/icons/4.svg',
  importBluebeamCsvButton: '/icons/5.svg',

  // Dropdown cards (used in Setup and Version ribbons — Session 48)
  setupTakeoffCard: '/icons/2.svg',
  importBluebeamCsvCard: '/icons/6.svg',
  btxToolsCard: '/icons/7.svg',

  // Status icon badges (used on project main page)
  bluebeamIcon: '/icons/8.svg',
  takeoffIcon: '/icons/9.svg',
  markupIcon: '/icons/10.svg',
  drawingsIcon: '/icons/11.svg',
  exportIcon: '/icons/12.svg',
  proposalIcon: '/icons/13.svg',
}

// Phase 12: Folder card category icon colors (from v0 design package, Isaac-approved)
export const FOLDER_ICON_COLORS = {
  drawings:  { primary: '#333333', light: '#f5f4f3', dark: '#333333' },
  bluebeam:  { primary: '#277ed0', light: '#edf4fc', dark: '#277ed0' },
  takeoff:   { primary: '#00883e', light: '#edf8f0', dark: '#00883e' },
  markups:   { primary: '#c96500', light: '#fef5eb', dark: '#c96500' },
  proposals: { primary: '#c0352f', light: '#fdf0ef', dark: '#c0352f' },
}

// Phase 12: Folder category PNG icons (Canva SVGs don't render — use extracted PNGs)
export const FOLDER_ICONS = {
  drawings:  '/icons/drawings.png',
  bluebeam:  '/icons/bluebeam.png',
  takeoff:   '/icons/takeoff.png',
  markups:   '/icons/markups.png',
  proposals: '/icons/proposals.png',
}

// Single universal gray icon for all collapsed/unselected folders
export const FOLDER_ICON_CLOSED = '/icons/folder-closed.png'

// Closed/unselected folder icons (legacy per-category — use FOLDER_ICON_CLOSED instead)
export const FOLDER_ICONS_CLOSED = {
  drawings:  '/icons/drawings-closed.png',
  bluebeam:  '/icons/bluebeam-closed.png',
  takeoff:   '/icons/takeoff-closed.png',
  markups:   '/icons/markups-closed.png',
  proposals: '/icons/proposals-closed.png',
}
