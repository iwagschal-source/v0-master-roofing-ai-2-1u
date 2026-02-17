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
