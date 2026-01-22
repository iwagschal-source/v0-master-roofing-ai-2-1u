"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  X,
  Loader2,
  FileSpreadsheet,
  Upload,
  RefreshCw,
  Save,
  Download,
  Check,
  AlertCircle,
  ChevronDown,
  GitCompare,
  History,
  Plus,
  CheckCircle2,
  XCircle,
  Trash2,
  PlusCircle,
  Settings
} from "lucide-react"
import { cn } from "@/lib/utils"

// Master Roofing Official Takeoff Template - aligned with lib_takeoff_template in BigQuery
// IDs are INTERNAL ONLY - never shown to estimators, only display names
// Styling matches old Excel template: yellow headers, orange totals, green special items
const TEMPLATE_ROWS = [
  // ROOFING SECTION
  { row: 1, label: 'ROOFING', section: 'roofing', isSectionHeader: true },
  { row: 2, label: 'Vapor Barrier or Temp waterproofing', code: 'MR-001VB', section: 'roofing', uom: 'SF', rate: 6.95, isItemized: true },
  { row: 3, label: 'Upcharge for 1/4" Pitch', code: 'MR-002PITCH', section: 'roofing', uom: 'SF', rate: 1.50, isItemized: true },
  { row: 4, label: 'Roofing - Builtup - 2 ply Scope', code: 'MR-003BU2PLY', section: 'roofing', uom: 'SF', rate: 16.25, isItemized: true, hasSystem: true },
  { row: 5, label: 'up and over', code: 'MR-004UO', section: 'roofing', uom: 'LF', rate: 12.00, isItemized: true },
  { row: 6, label: 'Scupper/gutter and leader', code: 'MR-005SCUPPER', section: 'roofing', uom: 'EA', rate: 2500.00, isItemized: true },
  { row: 7, isSpacer: true }, // Blank row separator
  { row: 8, label: 'Roofing - IRMA - (Scope - Liquid or 2ply)', code: 'MR-006IRMA', section: 'roofing', uom: 'SF', isBundled: true, hasSystem: true },
  { row: 9, label: 'PMMA (Liquid) or 2ply Torch@Building Wall', code: 'MR-007PMMA', section: 'roofing', uom: 'LF', isBundled: true },
  { row: 10, label: 'PMMA (Liquid) or 2ply Torch@Parapet Wall', code: 'MR-008PMMA', section: 'roofing', uom: 'LF', isBundled: true },
  { row: 11, label: 'up and over - PMMA (Liquid) or 2ply Torch', code: 'MR-009PMMAUO', section: 'roofing', uom: 'LF', isBundled: true },
  { row: 12, isSpacer: true }, // Blank row separator
  { row: 13, label: 'Drains', code: 'MR-010DRAIN', section: 'roofing', uom: 'EA', rate: 550.00, isItemized: true },
  { row: 14, label: 'Doorpans - Standard 3-6\'', code: 'MR-011DOORSTD', section: 'roofing', uom: 'EA', rate: 550.00, isItemized: true },
  { row: 15, label: 'Doorpans - Large', code: 'MR-012DOORLG', section: 'roofing', uom: 'EA', rate: 850.00, isItemized: true },
  { row: 16, isSpacer: true }, // Blank row separator
  { row: 17, label: 'Roof hatch / Skylights (Area)', code: 'MR-013HATCHSF', section: 'roofing', uom: 'SF', isBundled: true, note: 'Select one' },
  { row: 18, label: 'Roof hatch / Skylights (Perimeter)', code: 'MR-014HATCHLF', section: 'roofing', uom: 'LF', rate: 48.00, isItemized: true, note: 'Select one' },
  { row: 19, label: 'Concrete Mechanical Pads/Walkway pads (sf)', code: 'MR-015PAD', section: 'roofing', uom: 'SF', isBundled: true },
  { row: 20, label: 'Fence posts', code: 'MR-016FENCE', section: 'roofing', uom: 'EA', rate: 250.00, isItemized: true },
  { row: 21, label: 'Railing Posts', code: 'MR-017RAIL', section: 'roofing', uom: 'EA', rate: 250.00, isItemized: true },
  { row: 22, label: 'Plumbing Penetrations', code: 'MR-018PLUMB', section: 'roofing', uom: 'EA', rate: 250.00, isItemized: true },
  { row: 23, label: 'Mechanical Penetrations', code: 'MR-019MECH', section: 'roofing', uom: 'EA', rate: 250.00, isItemized: true },
  { row: 24, label: 'Davits (EA)', code: 'MR-020DAVIT', section: 'roofing', uom: 'EA', rate: 150.00, isItemized: true },
  { row: 25, label: 'AC Units -EA (dunnage?)', code: 'MR-021AC', section: 'roofing', uom: 'EA', rate: 550.00, isItemized: true },
  { row: 26, isSpacer: true }, // Blank row separator
  { row: 27, label: '(Alum.) Coping (Low Parapet) Gravel stop/Edge Flashing', code: 'MR-022COPELO', section: 'roofing', uom: 'LF', rate: 32.00, isItemized: true },
  { row: 28, label: '(Alum.) Coping (high Parapet)', code: 'MR-023COPEHI', section: 'roofing', uom: 'LF', rate: 32.00, isItemized: true },
  { row: 29, label: 'Insulation under Coping (R Value)', code: 'MR-024INSUCOPE', section: 'roofing', uom: 'LF', rate: 4.00, isItemized: true },
  { row: 30, isSpacer: true }, // Blank row separator
  { row: 31, label: '(Alum.) Metal Flashing at building wall', code: 'MR-025FLASHBLDG', section: 'roofing', uom: 'LF', rate: 24.00, isItemized: true },
  { row: 32, label: '(Alum.) Metal Flashing at Parapet wall', code: 'MR-026FLASHPAR', section: 'roofing', uom: 'LF', rate: 24.00, isItemized: true },
  { row: 33, isSpacer: true }, // Blank row separator
  { row: 34, label: 'Overburden for Irma Roof (Drainage mat + R? Insulation + Filterfabric)', code: 'MR-027OBIRMA', section: 'roofing', uom: 'SF', rate: 14.00, isItemized: true },
  { row: 35, label: 'Pavers (R ?)', code: 'MR-028PAVER', section: 'roofing', uom: 'SF', isBundled: true, hasSystem: true },
  { row: 36, label: 'Metal Edge flashing at the paver Termination', code: 'MR-029FLASHPAV', section: 'roofing', uom: 'LF', rate: 24.00, isItemized: true },
  { row: 37, isSpacer: true }, // Blank row separator
  { row: 38, label: 'Green Roof Scope', code: 'MR-030GREEN', section: 'roofing', uom: 'SF', rate: 48.00, isItemized: true },
  { row: 39, label: 'Metal Edge flashing at the Green Roof', code: 'MR-031FLASHGRN', section: 'roofing', uom: 'LF', rate: 24.00, isItemized: true },
  { row: 40, isSpacer: true }, // Blank row separator
  { row: 41, label: 'Recessed floor (Location) - Liquid Waterproofing', code: 'MR-032RECESSWP', section: 'roofing', uom: 'SF', rate: 32.00, isItemized: true },
  { row: 42, isSectionTotal: true, label: 'TOTAL COST FOR ALL THE ROOFING WORKS', section: 'roofing' },
  // BALCONIES SECTION
  { row: 43, label: 'BALCONIES', section: 'balcony', isSectionHeader: true },
  { row: 44, label: 'Traffic Coating', code: 'MR-033TRAFFIC', section: 'balcony', uom: 'SF', rate: 17.00, isItemized: true },
  { row: 45, label: 'Aluminum Drip edge', code: 'MR-034DRIP', section: 'balcony', uom: 'LF', rate: 22.00, isItemized: true },
  { row: 46, label: 'Liquid L Flashing (LF)', code: 'MR-035LFLASH', section: 'balcony', uom: 'LF', rate: 48.00, isItemized: true },
  { row: 47, isSpacer: true }, // Blank row separator
  { row: 48, label: 'Doorpans - Balconies', code: 'MR-036DOORBAL', section: 'balcony', uom: 'EA', rate: 550.00, isItemized: true },
  { row: 49, isSectionTotal: true, label: 'TOTAL COST FOR ALL THE BALCONY WORKS', section: 'balcony' },
  // EXTERIOR SECTION
  { row: 50, label: 'EXTERIOR', section: 'exterior', isSectionHeader: true },
  { row: 51, label: 'Brick area - Waterproofing', code: 'MR-037BRICKWP', section: 'exterior', uom: 'SF', rate: 5.25, isItemized: true },
  { row: 52, label: 'Openings at brick areas (Count) < 32lf', code: 'MR-038OPNBRKEA', section: 'exterior', uom: 'EA', rate: 250.00, isItemized: true },
  { row: 53, label: 'Openings at brick areas (LF) > 32lf/40lf', code: 'MR-039OPNBRKLF', section: 'exterior', uom: 'LF', rate: 10.00, isItemized: true },
  { row: 54, isSpacer: true }, // Blank row separator
  { row: 55, label: 'Panel Area - Waterproofing', code: 'MR-040PANELWP', section: 'exterior', uom: 'SF', rate: 5.25, isItemized: true },
  { row: 56, label: 'Openings at panel Areas (Count) < 32lf', code: 'MR-041OPNPNLEA', section: 'exterior', uom: 'EA', rate: 250.00, isItemized: true },
  { row: 57, label: 'Openings at panel Areas (LF) > 32lf/40lf', code: 'MR-042OPNPNLLF', section: 'exterior', uom: 'LF', rate: 10.00, isItemized: true },
  { row: 58, isSpacer: true }, // Blank row separator
  { row: 59, label: 'Eifs - Scope (R?)', code: 'MR-043EIFS', section: 'exterior', uom: 'SF', isBundled: true, hasSystem: true },
  { row: 60, label: 'openings at stucco areas (Count) < 32lf', code: 'MR-044OPNSTCEA', section: 'exterior', uom: 'EA', rate: 250.00, isItemized: true },
  { row: 61, label: 'openings at stucco areas (LF) > 32lf/40lf', code: 'MR-045OPNSTCLF', section: 'exterior', uom: 'LF', rate: 10.00, isItemized: true },
  { row: 62, label: 'Transistional stucco', code: 'MR-046STUCCO', section: 'exterior', uom: 'SF', rate: 17.00, isItemized: true },
  { row: 63, isSpacer: true }, // Blank row separator
  { row: 64, label: 'Drip cap (LF)', code: 'MR-047DRIPCAP', section: 'exterior', uom: 'LF', rate: 33.00, isItemized: true, note: 'Eifs =/> 4"' },
  { row: 65, label: 'Sills', code: 'MR-048SILL', section: 'exterior', uom: 'LF', rate: 33.00, isItemized: true, note: 'Eifs =/> 4"' },
  { row: 66, label: 'Tie - In (LF)', code: 'MR-049TIEIN', section: 'exterior', uom: 'LF', rate: 48.00, isItemized: true },
  { row: 67, label: 'adj. building horizontal (Custom Metal Flashing only)', code: 'MR-050ADJHORZ', section: 'exterior', uom: 'LF', rate: 65.00, isItemized: true },
  { row: 68, label: 'adj. building Vertical (Detail?)', code: 'MR-051ADJVERT', section: 'exterior', uom: 'LF', isBundled: true, note: 'Specify Exclusion' },
  { row: 69, isSectionTotal: true, label: 'TOTAL COST FOR ALL THE EXTERIOR WORKS', section: 'exterior' },
  { row: 70, isGrandTotal: true, label: 'TOTAL COST FOR ALL WORK LISTED IN THIS PROPOSAL' },
]

// Build lookup map for template rows by code (for Bluebeam import mapping)
const TEMPLATE_BY_CODE = {}
TEMPLATE_ROWS.forEach(r => {
  if (r.code) TEMPLATE_BY_CODE[r.code] = r
})

// Location columns - default locations for takeoff
const DEFAULT_LOCATION_COLUMNS = [
  { id: 'MR', name: 'Main Roof', mappings: ['MR', 'MAIN', 'ROOF'] },
  { id: 'FL1', name: '1st Floor', mappings: ['FL1', 'FL-1', '1ST', 'GROUND'] },
  { id: 'FL2', name: '2nd Floor', mappings: ['FL2', 'FL-2', '2ND'] },
  { id: 'FR', name: 'Front', mappings: ['FR', 'FRONT', 'NORTH'] },
  { id: 'RR', name: 'Rear', mappings: ['RR', 'REAR', 'SOUTH', 'BACK'] },
  { id: 'LT', name: 'Left', mappings: ['LT', 'LEFT', 'WEST'] },
  { id: 'RT', name: 'Right', mappings: ['RT', 'RIGHT', 'EAST'] },
]

// Styling colors to match old Excel template
// Colors apply ONLY to the Total Cost column
const COLORS = {
  headerGray: '#D9D9D9',        // Gray for header row background
  itemizedYellow: '#FFFF00',    // Yellow for itemized items (have unit cost, broken out on proposal)
  bundledGreen: '#92D050',      // Green for bundled/system items (no unit cost, part of system)
  totalOrange: '#FFC000',       // Orange for section totals and grand total
  borderThick: '#000000',       // Black for thick borders
  borderThin: '#D9D9D9',        // Gray for thin borders
}

export function TakeoffSpreadsheet({
  projectId,
  projectName,
  onClose,
  onSave,
  onEditSetup
}) {
  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [takeoffExists, setTakeoffExists] = useState(false)
  const [creating, setCreating] = useState(false)
  const [viewMode, setViewMode] = useState('template') // 'template' or 'raw'

  // Template data - quantities per location per item
  // Structure: { [itemCode]: { [locationId]: quantity } }
  const [templateData, setTemplateData] = useState({})

  // Rate overrides from GC history
  const [rateOverrides, setRateOverrides] = useState({})

  // Location columns configuration
  const [locationColumns, setLocationColumns] = useState(DEFAULT_LOCATION_COLUMNS)

  // Legacy sheet data (for raw view)
  const [sheetData, setSheetData] = useState({})
  const [columns, setColumns] = useState(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'])
  const [columnHeaders, setColumnHeaders] = useState({})
  const [pendingChanges, setPendingChanges] = useState({})
  const [rows, setRows] = useState(Array.from({ length: 75 }, (_, i) => i + 1))
  const [maxRow, setMaxRow] = useState(75)
  const [columnWidths, setColumnWidths] = useState({})
  const [resizing, setResizing] = useState(null)

  // Tabs state
  const [activeTab, setActiveTab] = useState('master')
  const [imports, setImports] = useState([])
  const [selectedImport, setSelectedImport] = useState(null)
  const [importData, setImportData] = useState(null)

  // Comparison state
  const [showComparison, setShowComparison] = useState(false)
  const [comparison, setComparison] = useState(null)
  const [approvedChanges, setApprovedChanges] = useState(new Set())
  const [syncing, setSyncing] = useState(false)

  // Upload state
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  // Load takeoff on mount
  useEffect(() => {
    loadTakeoff()
  }, [projectId])

  // Convert column number to letter (0=A, 1=B, etc.)
  const colNumToLetter = (num) => {
    let result = ''
    while (num >= 0) {
      result = String.fromCharCode((num % 26) + 65) + result
      num = Math.floor(num / 26) - 1
    }
    return result
  }

  // Load takeoff data
  const loadTakeoff = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load config from Bluebeam API (includes locations, items, rates)
      const configRes = await fetch(`/api/ko/takeoff/${projectId}/config`)
      if (configRes.ok) {
        const configData = await configRes.json()
        if (configData.exists && configData.config) {
          const config = configData.config

          // Load location columns from config
          if (config.columns && config.columns.length > 0) {
            setLocationColumns(config.columns.map((col, idx) => ({
              id: col.id || `LOC${idx}`,
              name: col.name,
              mappings: col.mappings || [col.id]
            })))
          }

          // Load rate overrides from config
          if (config.rateOverrides) {
            setRateOverrides(config.rateOverrides)
          }

          // Load template data (quantities per item per location)
          if (config.templateData) {
            setTemplateData(config.templateData)
          }
        }
      }

      // Load GC-specific rates if available
      try {
        const ratesRes = await fetch(`/api/ko/takeoff/${projectId}/rates`)
        if (ratesRes.ok) {
          const ratesData = await ratesRes.json()
          if (ratesData.rates) {
            // Merge GC rates with any existing overrides (GC rates take precedence if no override)
            setRateOverrides(prev => {
              const merged = { ...ratesData.rates }
              // User overrides take precedence over GC historical rates
              Object.keys(prev).forEach(key => {
                if (prev[key] !== undefined) {
                  merged[key] = prev[key]
                }
              })
              return merged
            })
          }
        }
      } catch (rateErr) {
        console.warn('Could not load GC rates:', rateErr.message)
      }

      // Load raw sheet data for "raw" view mode
      const res = await fetch(`/api/ko/takeoff/${projectId}?format=json`)

      if (res.status === 404) {
        // No takeoff exists - but we can still show template view
        setTakeoffExists(true) // Allow template view even without raw data
        setLoading(false)
        loadImports()
        return
      }

      if (!res.ok) {
        throw new Error('Failed to load takeoff')
      }

      const data = await res.json()

      // Parse Luckysheet celldata format
      // Backend returns: { sheet_data: { celldata: [{ r: row, c: col, v: { v: value, m: display } }] } }
      const celldata = data.sheet_data?.celldata || data.cells || []

      if (celldata.length > 0) {
        const parsed = {}
        const detectedCols = new Set()
        const detectedRows = new Set()

        for (const cell of celldata) {
          const rowNum = (cell.r || 0) + 1 // Convert 0-indexed to 1-indexed
          const colLetter = colNumToLetter(cell.c || 0)
          const key = `${colLetter}${rowNum}`

          // Get value - handle Luckysheet value object format
          let value = ''
          if (cell.v) {
            if (typeof cell.v === 'object') {
              value = cell.v.m || cell.v.v || '' // m is display value, v is actual value
            } else {
              value = cell.v
            }
          }

          parsed[key] = value
          detectedCols.add(colLetter)
          detectedRows.add(rowNum)
        }

        setSheetData(parsed)

        // Set columns in order
        const sortedCols = Array.from(detectedCols).sort((a, b) => {
          // Sort alphabetically but handle multi-letter columns
          if (a.length !== b.length) return a.length - b.length
          return a.localeCompare(b)
        })
        setColumns(sortedCols.length > 0 ? sortedCols : ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'])

        // Set rows in order (1 to max detected row)
        const maxDetectedRow = Math.max(...detectedRows, 75)
        setMaxRow(maxDetectedRow)
        const rowList = Array.from({ length: maxDetectedRow }, (_, i) => i + 1)
        setRows(rowList)

        // Extract column headers from row 3
        const headers = {}
        sortedCols.forEach(col => {
          const headerKey = `${col}3`
          if (parsed[headerKey]) {
            headers[col] = parsed[headerKey]
          }
        })
        setColumnHeaders(headers)
      }

      setTakeoffExists(true)

      // Also load imports
      loadImports()

    } catch (err) {
      console.error('Load takeoff error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Create new takeoff from template
  const createTakeoff = async () => {
    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/ko/takeoff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          project_name: projectName
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create takeoff')
      }

      // Reload
      await loadTakeoff()

    } catch (err) {
      console.error('Create takeoff error:', err)
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // Load imports list
  const loadImports = async () => {
    try {
      const res = await fetch(`/api/ko/takeoff/${projectId}/imports`)
      if (res.ok) {
        const data = await res.json()
        setImports(data.imports || [])
      }
    } catch (err) {
      console.error('Load imports error:', err)
    }
  }

  // Handle cell edit
  const handleCellChange = (row, col, value) => {
    const key = `${col}${row}`
    setSheetData(prev => ({ ...prev, [key]: value }))
    setPendingChanges(prev => ({
      ...prev,
      [key]: { row, col, value }
    }))
  }

  // Handle header edit (row 3)
  const handleHeaderChange = (col, value) => {
    setColumnHeaders(prev => ({ ...prev, [col]: value }))
    handleCellChange(3, col, value)
  }

  // Add a new row at the end
  const addRow = () => {
    const newRowNum = maxRow + 1
    setMaxRow(newRowNum)
    setRows(prev => [...prev, newRowNum])
  }

  // Delete a row
  const deleteRow = (rowNum) => {
    if (rows.length <= 1) return // Don't delete last row
    setRows(prev => prev.filter(r => r !== rowNum))
    // Clear data for deleted row
    const newData = { ...sheetData }
    const newChanges = { ...pendingChanges }
    columns.forEach(col => {
      const key = `${col}${rowNum}`
      delete newData[key]
      newChanges[key] = { row: rowNum, col, value: null } // Mark as deleted
    })
    setSheetData(newData)
    setPendingChanges(newChanges)
  }

  // Add a new column at the end
  const addColumn = () => {
    const lastCol = columns[columns.length - 1]
    // Calculate next column letter
    const nextCol = lastCol === 'Z' ? 'AA' :
      lastCol.length === 1 ? String.fromCharCode(lastCol.charCodeAt(0) + 1) :
      lastCol.slice(0, -1) + String.fromCharCode(lastCol.charCodeAt(lastCol.length - 1) + 1)
    setColumns(prev => [...prev, nextCol])
  }

  // Delete a column
  const deleteColumn = (col) => {
    if (columns.length <= 2) return // Keep at least A and B
    setColumns(prev => prev.filter(c => c !== col))
    // Clear data for deleted column
    const newData = { ...sheetData }
    const newChanges = { ...pendingChanges }
    rows.forEach(rowNum => {
      const key = `${col}${rowNum}`
      delete newData[key]
      newChanges[key] = { row: rowNum, col, value: null } // Mark as deleted
    })
    setSheetData(newData)
    setPendingChanges(newChanges)
  }

  // Column resize handlers
  const handleResizeStart = (col, e) => {
    e.preventDefault()
    e.stopPropagation() // Prevent input focus
    setResizing({ col, startX: e.clientX, startWidth: columnWidths[col] || 120 })
  }

  const handleResizeMove = useCallback((e) => {
    if (!resizing) return
    const delta = e.clientX - resizing.startX
    const newWidth = Math.max(60, resizing.startWidth + delta)
    setColumnWidths(prev => ({ ...prev, [resizing.col]: newWidth }))
  }, [resizing])

  const handleResizeEnd = useCallback(() => {
    setResizing(null)
  }, [])

  // Add resize event listeners and cursor style during resize
  useEffect(() => {
    if (resizing) {
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleResizeMove)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        document.removeEventListener('mousemove', handleResizeMove)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [resizing, handleResizeMove, handleResizeEnd])

  // ============================================
  // TEMPLATE VIEW FUNCTIONS
  // ============================================

  // Handle quantity change in template view
  const handleQuantityChange = (itemCode, locationId, value) => {
    const numValue = parseFloat(value) || 0
    setTemplateData(prev => ({
      ...prev,
      [itemCode]: {
        ...(prev[itemCode] || {}),
        [locationId]: numValue
      }
    }))
    setPendingChanges(prev => ({
      ...prev,
      [`${itemCode}:${locationId}`]: { itemCode, locationId, value: numValue }
    }))
  }

  // Get quantity for an item at a location
  const getQuantity = (itemCode, locationId) => {
    return templateData[itemCode]?.[locationId] || ''
  }

  // Calculate total for an item across all locations
  const getItemTotal = (itemCode) => {
    const itemData = templateData[itemCode] || {}
    return Object.values(itemData).reduce((sum, qty) => sum + (parseFloat(qty) || 0), 0)
  }

  // Get rate for an item (override or default)
  const getRate = (itemCode, defaultRate) => {
    return rateOverrides[itemCode] ?? defaultRate ?? 0
  }

  // Calculate total cost for an item
  const getItemCost = (item) => {
    const total = getItemTotal(item.code)
    const rate = getRate(item.code, item.rate)
    return total * rate
  }

  // Format currency
  const formatCurrency = (value) => {
    if (!value && value !== 0) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  // Format number with commas
  const formatNumber = (value) => {
    if (!value && value !== 0) return ''
    return new Intl.NumberFormat('en-US').format(value)
  }

  // Add a new location column
  const addLocationColumn = () => {
    const newId = `LOC${locationColumns.length + 1}`
    setLocationColumns(prev => [
      ...prev,
      { id: newId, name: `Location ${locationColumns.length + 1}`, mappings: [newId] }
    ])
  }

  // Update location column name
  const updateLocationName = (locationId, newName) => {
    setLocationColumns(prev => prev.map(loc =>
      loc.id === locationId ? { ...loc, name: newName } : loc
    ))
  }

  // Remove a location column
  const removeLocationColumn = (locationId) => {
    if (locationColumns.length <= 1) return
    setLocationColumns(prev => prev.filter(loc => loc.id !== locationId))
  }

  // Save changes - saves both template config and raw data
  const saveChanges = async () => {
    setSaving(true)
    try {
      // Save template configuration (locations, items, rates, quantities)
      const configPayload = {
        columns: locationColumns,
        selectedItems: TEMPLATE_ROWS
          .filter(item => !item.isSectionHeader && item.code)
          .map(item => ({
            scope_code: item.code,
            section: item.section,
            display_name: item.label
          })),
        rateOverrides,
        templateData // Quantities per item per location
      }

      const configRes = await fetch(`/api/ko/takeoff/${projectId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload)
      })

      if (!configRes.ok) {
        console.warn('Config save warning:', await configRes.text())
      }

      // Save raw sheet updates if any
      if (Object.keys(pendingChanges).length > 0) {
        const updates = Object.values(pendingChanges)

        const res = await fetch(`/api/ko/takeoff/${projectId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates })
        })

        if (!res.ok) {
          throw new Error('Failed to save changes')
        }
      }

      setPendingChanges({})
      if (onSave) onSave()

    } catch (err) {
      console.error('Save error:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Generate BTX file for Bluebeam
  const [generatingBTX, setGeneratingBTX] = useState(false)
  const generateBTX = async () => {
    setGeneratingBTX(true)
    try {
      // First save current config
      await saveChanges()

      // Then generate BTX
      const res = await fetch(`/api/ko/takeoff/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns: locationColumns,
          selectedItems: TEMPLATE_ROWS
            .filter(item => !item.isSectionHeader && item.code)
            .map(item => ({
              scope_code: item.code,
              display_name: item.label
            })),
          rateOverrides
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate BTX')
      }

      const data = await res.json()

      // If BTX file URL is returned, download it
      if (data.btx_url || data.download_url) {
        window.open(data.btx_url || data.download_url, '_blank')
      } else if (data.btx_id) {
        // Download via API
        window.open(`/api/ko/takeoff/${projectId}/btx/${data.btx_id}/download`, '_blank')
      }

      setError(null)

    } catch (err) {
      console.error('Generate BTX error:', err)
      setError(err.message)
    } finally {
      setGeneratingBTX(false)
    }
  }

  // Upload Bluebeam CSV
  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const content = await file.text()

      const res = await fetch(`/api/ko/takeoff/${projectId}/bluebeam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_content: content,
          use_historical_rates: true
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to import')
      }

      const data = await res.json()

      // Refresh imports list
      await loadImports()

      // Select the new import
      if (data.import_id) {
        setSelectedImport(data.import_id)
        setActiveTab('imports')
      }

      setShowUpload(false)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  // Compare import with master
  const compareImport = async (importId) => {
    try {
      const res = await fetch(`/api/ko/takeoff/${projectId}/compare/${importId}`)
      if (!res.ok) throw new Error('Failed to compare')

      const data = await res.json()
      setComparison(data)
      setShowComparison(true)
      setApprovedChanges(new Set()) // Reset selections

    } catch (err) {
      console.error('Compare error:', err)
      setError(err.message)
    }
  }

  // Toggle change approval
  const toggleApproval = (key) => {
    setApprovedChanges(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Approve all changes
  const approveAll = () => {
    if (comparison?.changes) {
      // Handle both array format (backend) and object format
      if (Array.isArray(comparison.changes)) {
        const keys = comparison.changes.map((change, idx) =>
          `${change.col}${change.row}` || idx.toString()
        )
        setApprovedChanges(new Set(keys))
      } else {
        setApprovedChanges(new Set(Object.keys(comparison.changes)))
      }
    }
  }

  // Sync approved changes
  const syncChanges = async () => {
    if (approvedChanges.size === 0 || !selectedImport) return

    setSyncing(true)
    try {
      // Convert cell keys like "H6" to {row: 6, col: "H", action: "accept"} for backend
      const approvedList = Array.from(approvedChanges).map(key => {
        // Parse key: letters are col, numbers are row
        const match = key.match(/^([A-Z]+)(\d+)$/)
        if (match) {
          return { col: match[1], row: parseInt(match[2], 10), action: "accept" }
        }
        return null
      }).filter(Boolean)

      const res = await fetch(`/api/ko/takeoff/${projectId}/sync/${selectedImport}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_changes: approvedList
        })
      })

      if (!res.ok) throw new Error('Failed to sync')

      const result = await res.json()

      // Reload master
      await loadTakeoff()

      setShowComparison(false)
      setSelectedImport(null)
      setActiveTab('master')

      // Show success message briefly
      if (result.applied_changes > 0) {
        setError(null)
      }

    } catch (err) {
      console.error('Sync error:', err)
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  // Get cell value
  const getCellValue = (row, col) => {
    return sheetData[`${col}${row}`] || ''
  }

  // Check if cell has pending change
  const hasPendingChange = (row, col) => {
    return !!pendingChanges[`${col}${row}`]
  }

  // Render loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading takeoff...</p>
        </div>
      </div>
    )
  }

  // Render create takeoff state
  if (!takeoffExists) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center max-w-md p-8 bg-card rounded-xl border border-border">
          <FileSpreadsheet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Takeoff Sheet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            This project doesn't have a takeoff sheet yet. Create one from the Master Roofing template to get started.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80"
            >
              Cancel
            </button>
            <button
              onClick={createTakeoff}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Takeoff
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold">{projectName || 'Takeoff Sheet'}</h1>
            <p className="text-xs text-muted-foreground">Master Roofing Template</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pending changes indicator */}
          {Object.keys(pendingChanges).length > 0 && (
            <span className="text-xs text-yellow-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {Object.keys(pendingChanges).length} unsaved
            </span>
          )}

          {onEditSetup && (
            <button
              onClick={onEditSetup}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <Settings className="w-4 h-4" />
              Edit Setup
            </button>
          )}

          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
          >
            <Upload className="w-4 h-4" />
            Import Bluebeam
          </button>

          <button
            onClick={generateBTX}
            disabled={generatingBTX}
            className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
            title="Generate Bluebeam Tool Chest (.btx) for marking up PDF"
          >
            {generatingBTX ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export BTX
          </button>

          <button
            onClick={loadTakeoff}
            className="p-2 hover:bg-secondary rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={saveChanges}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setActiveTab('master'); setShowComparison(false) }}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              activeTab === 'master'
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            )}
          >
            Takeoff Sheet
          </button>

          {imports.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setActiveTab('imports')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  activeTab === 'imports'
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                )}
              >
                Imports ({imports.length})
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* View mode toggle - only show for master tab */}
        {activeTab === 'master' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">View:</span>
            <button
              onClick={() => setViewMode('template')}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                viewMode === 'template'
                  ? "bg-blue-600 text-white"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              Template
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={cn(
                "px-3 py-1 text-xs rounded transition-colors",
                viewMode === 'raw'
                  ? "bg-blue-600 text-white"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              )}
            >
              Raw
            </button>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/30 text-red-500 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:underline">Dismiss</button>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        {/* TEMPLATE VIEW - Styled like old Excel */}
        {activeTab === 'master' && !showComparison && viewMode === 'template' && (
          <div className="p-4">
            {/* Add location column button */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={addLocationColumn}
                className="flex items-center gap-1 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Add Location
              </button>
            </div>

            {/* Template spreadsheet - styled like old Excel */}
            <div className="border-2 border-black overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)]">
              <table className="text-xs border-collapse" style={{ minWidth: '100%' }}>
                <thead className="sticky top-0 z-10">
                  {/* Header row - Gray background with thick borders */}
                  <tr style={{ backgroundColor: COLORS.headerGray }}>
                    <th className="border-2 border-black px-2 py-1 text-center font-bold" style={{ width: 70 }}>
                      Unit Cost
                    </th>
                    <th className="border-2 border-black px-2 py-1 text-left font-bold" style={{ width: 280 }}>
                      Scope
                    </th>
                    {/* Location columns */}
                    {locationColumns.map(loc => (
                      <th
                        key={loc.id}
                        className="border-2 border-black px-1 py-1 text-center font-bold group relative"
                        style={{ width: 70, minWidth: 60 }}
                      >
                        <input
                          type="text"
                          value={loc.name}
                          onChange={(e) => updateLocationName(loc.id, e.target.value)}
                          className="w-full text-center bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs font-bold"
                        />
                        {locationColumns.length > 1 && (
                          <button
                            onClick={() => removeLocationColumn(loc.id)}
                            className="absolute top-0 right-0 p-0.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded"
                          >
                            <X className="w-3 h-3 text-red-500" />
                          </button>
                        )}
                      </th>
                    ))}
                    <th className="border-2 border-black px-2 py-1 text-center font-bold" style={{ width: 80 }}>
                      Total<br/>Measurements
                    </th>
                    <th className="border-2 border-black px-2 py-1 text-center font-bold" style={{ width: 90 }}>
                      Total Cost
                    </th>
                    <th className="border-2 border-black px-2 py-1 text-left font-bold" style={{ width: 120 }}>
                      Comments/Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {TEMPLATE_ROWS.map((item) => {
                    // Spacer/blank row
                    if (item.isSpacer) {
                      return (
                        <tr key={item.row} style={{ height: 8 }}>
                          <td colSpan={5 + locationColumns.length} className="border border-gray-300 bg-white"></td>
                        </tr>
                      )
                    }

                    // Section header row (ROOFING, BALCONIES, EXTERIOR)
                    if (item.isSectionHeader) {
                      return (
                        <tr key={item.row}>
                          <td colSpan={5 + locationColumns.length} className="border-2 border-black px-2 py-1 font-bold bg-white">
                            {/* Section headers don't span full width in original */}
                          </td>
                        </tr>
                      )
                    }

                    // Section total row
                    if (item.isSectionTotal) {
                      const sectionItems = TEMPLATE_ROWS.filter(r => r.section === item.section && r.code && !r.isSectionHeader && !r.isSpacer && !r.isSectionTotal)
                      const sectionTotal = sectionItems.reduce((sum, i) => {
                        const total = getItemTotal(i.code)
                        const rate = getRate(i.code, i.rate)
                        return sum + (total * rate)
                      }, 0)
                      return (
                        <tr key={item.row}>
                          <td colSpan={2 + locationColumns.length} className="border border-gray-300 px-2 py-1 text-right font-bold">
                            {item.label}
                          </td>
                          <td className="border border-gray-300 px-2 py-1"></td>
                          <td className="border border-gray-300 px-2 py-1 text-right font-bold" style={{ backgroundColor: COLORS.totalOrange }}>
                            {sectionTotal > 0 ? formatCurrency(sectionTotal) : '$ -'}
                          </td>
                          <td className="border border-gray-300 px-2 py-1"></td>
                        </tr>
                      )
                    }

                    // Grand total row
                    if (item.isGrandTotal) {
                      const grandTotal = TEMPLATE_ROWS.filter(r => r.code && !r.isSpacer).reduce((sum, i) => {
                        const total = getItemTotal(i.code)
                        const rate = getRate(i.code, i.rate)
                        return sum + (total * rate)
                      }, 0)
                      return (
                        <tr key={item.row}>
                          <td colSpan={2 + locationColumns.length} className="border-2 border-black px-2 py-1 text-right font-bold">
                            {item.label}
                          </td>
                          <td className="border-2 border-black px-2 py-1"></td>
                          <td className="border-2 border-black px-2 py-1 text-right font-bold" style={{ backgroundColor: COLORS.totalOrange }}>
                            {grandTotal > 0 ? formatCurrency(grandTotal) : '$ -'}
                          </td>
                          <td className="border-2 border-black px-2 py-1"></td>
                        </tr>
                      )
                    }

                    // Regular item row
                    const total = getItemTotal(item.code)
                    const rate = getRate(item.code, item.rate)
                    const cost = total * rate

                    // Determine Total Cost cell color:
                    // Yellow = isItemized (has unit cost, broken out on proposal)
                    // Green = isBundled (no unit cost, part of system)
                    let costCellColor = 'white'
                    if (item.isItemized) {
                      costCellColor = COLORS.itemizedYellow
                    } else if (item.isBundled) {
                      costCellColor = COLORS.bundledGreen
                    }

                    return (
                      <tr key={item.row} className="hover:bg-gray-50">
                        {/* Unit Cost column - shows $ prefix */}
                        <td className="border border-gray-300 px-1 py-0.5 text-right">
                          {item.rate !== undefined ? (
                            <div className="flex items-center justify-end">
                              <span className="text-gray-500 mr-0.5">$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={rate || ''}
                                onChange={(e) => setRateOverrides(prev => ({
                                  ...prev,
                                  [item.code]: parseFloat(e.target.value) || 0
                                }))}
                                className="w-14 text-right bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                                placeholder="0.00"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400">$ -</span>
                          )}
                        </td>
                        {/* Scope/Item name - NO CODE shown to estimator */}
                        <td className="border border-gray-300 px-2 py-0.5">
                          {item.label}
                        </td>
                        {/* Location quantity cells */}
                        {locationColumns.map(loc => (
                          <td key={loc.id} className="border border-gray-300 px-1 py-0.5">
                            <input
                              type="number"
                              value={getQuantity(item.code, loc.id)}
                              onChange={(e) => handleQuantityChange(item.code, loc.id, e.target.value)}
                              className="w-full text-center bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                              placeholder=""
                            />
                          </td>
                        ))}
                        {/* Total Measurements */}
                        <td className="border border-gray-300 px-2 py-0.5 text-center">
                          {total > 0 ? total : 0}
                        </td>
                        {/* Total Cost - COLOR APPLIES HERE ONLY */}
                        <td
                          className="border border-gray-300 px-2 py-0.5 text-right"
                          style={{ backgroundColor: costCellColor }}
                        >
                          <span className="text-gray-500">$</span> {cost > 0 ? formatNumber(cost) : '-'}
                        </td>
                        {/* Comments/Notes column */}
                        <td className="border border-gray-300 px-2 py-0.5 text-xs text-gray-600">
                          {item.note || ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RAW VIEW - Generic spreadsheet */}
        {activeTab === 'master' && !showComparison && viewMode === 'raw' && (
          <div className="p-4">
            {/* Add row/column buttons */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={addRow}
                className="flex items-center gap-1 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Add Row
              </button>
              <button
                onClick={addColumn}
                className="flex items-center gap-1 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Add Column
              </button>
            </div>

            {/* Spreadsheet table with horizontal scroll */}
            <div className="border border-border rounded-lg overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
              <table className="text-sm" style={{ tableLayout: 'fixed', minWidth: '100%' }}>
                <thead className="bg-muted sticky top-0 z-10">
                  <tr>
                    <th className="border-r border-border px-2 py-2 text-left" style={{ width: 50 }}>#</th>
                    {columns.map(col => (
                      <th
                        key={col}
                        className="border-r border-border px-1 py-1 text-left group relative select-none"
                        style={{ width: columnWidths[col] || 120, minWidth: 60, maxWidth: 400 }}
                      >
                        <div className="flex items-center gap-1 pr-4">
                          <input
                            type="text"
                            value={columnHeaders[col] || col}
                            onChange={(e) => handleHeaderChange(col, e.target.value)}
                            className="flex-1 px-2 py-1 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded text-sm font-semibold min-w-0"
                            placeholder={col}
                          />
                          {col !== 'A' && col !== 'B' && (
                            <button
                              onClick={() => deleteColumn(col)}
                              className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-opacity flex-shrink-0"
                              title={`Delete column ${col}`}
                            >
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </button>
                          )}
                        </div>
                        {/* Resize handle - wider hit area with z-index to be above content */}
                        <div
                          onMouseDown={(e) => handleResizeStart(col, e)}
                          className="absolute right-0 top-0 bottom-0 w-4 cursor-col-resize hover:bg-primary/30 z-10 flex items-center justify-center"
                          style={{ cursor: 'col-resize' }}
                        >
                          <div className="w-0.5 h-full bg-border hover:bg-primary transition-colors" />
                        </div>
                      </th>
                    ))}
                    <th className="px-2 py-2" style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(rowNum => (
                    <tr key={rowNum} className="border-t border-border hover:bg-muted/30 group">
                      <td className="border-r border-border px-2 py-1 text-muted-foreground text-xs" style={{ width: 50 }}>
                        {rowNum}
                      </td>
                      {columns.map(col => {
                        const value = getCellValue(rowNum, col)
                        const isPending = hasPendingChange(rowNum, col)

                        return (
                          <td
                            key={col}
                            className={cn(
                              "border-r border-border px-1 py-0.5",
                              isPending && "bg-yellow-500/10"
                            )}
                            style={{ width: columnWidths[col] || 120, minWidth: 60, maxWidth: 400 }}
                          >
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => handleCellChange(rowNum, col, e.target.value)}
                              className="w-full px-2 py-1 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded text-sm"
                            />
                          </td>
                        )
                      })}
                      <td className="px-1 py-0.5" style={{ width: 40 }}>
                        <button
                          onClick={() => deleteRow(rowNum)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-opacity"
                          title={`Delete row ${rowNum}`}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'imports' && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {imports.map(imp => {
                // Handle field name differences between backend and frontend
                const importId = imp.id || imp.import_id
                const createdAt = imp.uploaded_at || imp.created_at
                const itemCount = imp.stats?.total_items || imp.item_count || 0

                return (
                  <div
                    key={importId}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-colors",
                      selectedImport === importId
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                    onClick={() => setSelectedImport(importId)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">Import #{importId?.slice(-6)}</p>
                        <p className="text-xs text-muted-foreground">
                          {createdAt ? new Date(createdAt).toLocaleString() : 'Unknown date'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 text-xs bg-green-500/10 text-green-600 rounded">
                        {itemCount} items
                      </span>
                    </div>

                    {selectedImport === importId && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            compareImport(importId)
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs"
                        >
                          <GitCompare className="w-3 h-3" />
                          Compare & Sync
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}

              {imports.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No imports yet</p>
                  <p className="text-xs mt-1">Upload a Bluebeam CSV to create an import</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comparison View */}
        {showComparison && comparison && (
          <div className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Compare & Sync Changes</h2>
                <p className="text-sm text-muted-foreground">
                  Review changes from import and approve what to sync to master
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowComparison(false)}
                  className="px-3 py-2 bg-secondary text-foreground rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={approveAll}
                  className="px-3 py-2 bg-secondary text-foreground rounded-lg text-sm"
                >
                  Approve All
                </button>
                <button
                  onClick={syncChanges}
                  disabled={syncing || approvedChanges.size === 0}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  {syncing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Sync {approvedChanges.size} Changes
                </button>
              </div>
            </div>

            {/* Changes list */}
            <div className="space-y-2">
              {comparison.changes && (Array.isArray(comparison.changes) ? comparison.changes : Object.entries(comparison.changes).map(([k, v]) => ({ ...v, _key: k }))).map((change, idx) => {
                // Handle both array format (backend) and object format
                // Backend returns: { row, col, scope, master_value, import_value, type }
                // Generate cell key like "H6" from row/col
                const cellKey = change._key || `${change.col}${change.row}` || idx.toString()
                const masterVal = change.master_value ?? change.master
                const importVal = change.import_value ?? change.import

                return (
                  <div
                    key={cellKey}
                    onClick={() => toggleApproval(cellKey)}
                    className={cn(
                      "flex items-center gap-4 p-3 border rounded-lg cursor-pointer transition-colors",
                      approvedChanges.has(cellKey)
                        ? "border-green-500 bg-green-500/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center",
                      approvedChanges.has(cellKey) ? "bg-green-500 text-white" : "bg-muted"
                    )}>
                      {approvedChanges.has(cellKey) ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                      )}
                    </div>

                    <div className="flex-1 grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Cell</p>
                        <p className="font-mono font-medium">{cellKey}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Scope</p>
                        <p className="text-sm truncate">{change.scope || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Master Value</p>
                        <p className="text-red-500 line-through">{masterVal ?? '(empty)'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Import Value</p>
                        <p className="text-green-500">{importVal ?? '(empty)'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}

              {comparison.keeps && Object.keys(comparison.keeps).length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    Keeping {Object.keys(comparison.keeps).length} manual values (no override)
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="font-semibold mb-4">Import Bluebeam CSV</h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
              ) : (
                <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
              )}
              <p className="text-sm font-medium">
                {uploading ? 'Processing...' : 'Click to upload CSV'}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleUpload}
              className="hidden"
            />

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
