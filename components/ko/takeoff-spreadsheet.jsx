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

// ============================================================================
// MASTER ROOFING OFFICIAL TAKEOFF TEMPLATE
// Exact replica of the Excel template with proper colors and formatting
// ============================================================================

// Color constants matching the Excel template
const COLORS = {
  headerYellow: '#FFFF00',      // Yellow for headers
  unitCostYellow: '#FFFF00',    // Yellow for unit cost column
  totalCostGreen: '#92D050',    // Green for total cost column
  summaryYellow: '#FFFF00',     // Yellow for summary rows
  finalTotalGreen: '#92D050',   // Green for final total
  variableRed: '#FF0000',       // Red for variable indicators (R Value, Scope, etc.)
  borderGray: '#000000',        // Black borders
  white: '#FFFFFF',
}

// ROOFING SECTION - Columns: Unit Cost, Scope, 1st Floor, 2nd Floor, 3rd Floor, 4th Floor, Main Roof, Stair Bulkhead, Elev. Bulkhead, Total Measurements, Total Cost, Comments
const ROOFING_COLUMNS = [
  { key: 'unitCost', label: 'Unit Cost', width: 80 },
  { key: 'scope', label: 'Scope', width: 280 },
  { key: 'floor1', label: '1st Floor', width: 70 },
  { key: 'floor2', label: '2nd Floor', width: 70 },
  { key: 'floor3', label: '3rd Floor', width: 70 },
  { key: 'floor4', label: '4th Floor', width: 70 },
  { key: 'mainRoof', label: 'Main Roof', width: 70 },
  { key: 'stairBulkhead', label: 'Stair Bulkhead', width: 80 },
  { key: 'elevBulkhead', label: 'Elev. Bulkhead', width: 80 },
  { key: 'totalMeasurements', label: 'Total Measurements', width: 100 },
  { key: 'totalCost', label: 'Total Cost', width: 90 },
  { key: 'comments', label: 'Comments/Notes/Details', width: 150 },
]

// BALCONIES SECTION - Different columns
const BALCONY_COLUMNS = [
  { key: 'unitCost', label: 'Unit Cost', width: 80 },
  { key: 'scope', label: 'Scope', width: 200 },
  { key: 'bal1', label: '1st floor Balconies', width: 90 },
  { key: 'bal2', label: '2nd floor Balconies', width: 90 },
  { key: 'bal3', label: '3rd floor Balconies', width: 90 },
  { key: 'bal4', label: '4th floor Balconies', width: 90 },
  { key: 'bal5', label: '5th floor Balconies', width: 90 },
  { key: 'bal6', label: '6th floor Balconies', width: 90 },
  { key: 'bal7', label: '7th floor Balconies', width: 90 },
  { key: 'totalMeasurements', label: 'Total Measurements', width: 100 },
  { key: 'totalCost', label: 'Total Cost', width: 90 },
  { key: 'comments', label: 'Comments/Notes/Details', width: 150 },
]

// EXTERIOR SECTION - Different columns
const EXTERIOR_COLUMNS = [
  { key: 'unitCost', label: 'Unit Cost', width: 80 },
  { key: 'scope', label: 'Scope', width: 280 },
  { key: 'front', label: 'Front / ---- Elevation', width: 90 },
  { key: 'rear', label: 'Rear / --- Elevation', width: 90 },
  { key: 'right', label: 'Right / ---- Elevation', width: 90 },
  { key: 'left', label: 'Left / ---- Elevation', width: 90 },
  { key: 'bulkhead', label: 'Bulkhead', width: 70 },
  { key: 'overhang', label: 'Overhang', width: 70 },
  { key: 'insideParapet', label: 'Inside Parapet', width: 80 },
  { key: 'totalMeasurements', label: 'Total Measurements', width: 100 },
  { key: 'totalCost', label: 'Total Cost', width: 90 },
  { key: 'comments', label: 'Comments/Notes/Details', width: 150 },
]

// Template rows with EXACT text from the original template
const TEMPLATE_DATA = {
  roofing: [
    { id: 'r1', rate: 6.95, scope: 'Vapor Barrier or Temp waterproofing' },
    { id: 'r2', rate: 1.50, scope: 'Upcharge for 1/4" Pitch' },
    { id: 'r3', rate: 16.25, scope: 'Roofing - Builtup - 2 ply', scopeVar: 'Scope (R?)', hasVar: true },
    { id: 'r4', rate: 12.00, scope: 'up and over' },
    { id: 'r5', rate: 2500.00, scope: 'Scupper /gutter and leader' },
    { id: 'r6', rate: null, scope: '' }, // blank row
    { id: 'r7', rate: null, scope: 'Roofing - IRMA - ', scopeVar: '(Scope - Liquid or 2ply)', hasVar: true },
    { id: 'r8', rate: null, scope: 'PMMA (Liquid) or 2ply Torch@Building Wall' },
    { id: 'r9', rate: null, scope: 'PMMA (Liquid) or 2ply Torch@Parapet Wall' },
    { id: 'r10', rate: null, scope: 'up and over - PMMA (Liquid) or 2ply Torch@Parapet Wall' },
    { id: 'r11', rate: null, scope: '' }, // blank row
    { id: 'r12', rate: 550.00, scope: 'Drains' },
    { id: 'r13', rate: 550.00, scope: 'Doorpans - Standard 3-6\'' },
    { id: 'r14', rate: 850.00, scope: 'Doorpans - Large' },
    { id: 'r15', rate: null, scope: '' }, // blank row
    { id: 'r16', rate: null, scope: 'Roof hatch / Skylights (Area)', comment: 'Select one\'' },
    { id: 'r17', rate: 48.00, scope: 'Roof hatch / Skylights (Perimeter)', comment: 'Select one\'' },
    { id: 'r18', rate: null, scope: 'Concrete Mechanical Pads/Walkway pads (sf)' },
    { id: 'r19', rate: 250.00, scope: 'Fence posts' },
    { id: 'r20', rate: 250.00, scope: 'Railing Posts' },
    { id: 'r21', rate: 250.00, scope: 'Plumbing Penetrations' },
    { id: 'r22', rate: 250.00, scope: 'Mechanical Penetrations' },
    { id: 'r23', rate: 150.00, scope: 'Davits (EA)' },
    { id: 'r24', rate: 550.00, scope: 'AC Units -EA (dunnage?)' },
    { id: 'r25', rate: null, scope: '' }, // blank row
    { id: 'r26', rate: 32.00, scope: '(Alum.) Coping (Low Parapet) Gravel stop/ Edge Flashing' },
    { id: 'r27', rate: 32.00, scope: '(Alum.) Coping (high Parapet)' },
    { id: 'r28', rate: 4.00, scope: 'Insulation under Coping ', scopeVar: '(R Value)', hasVar: true },
    { id: 'r29', rate: null, scope: '' }, // blank row
    { id: 'r30', rate: 24.00, scope: '(Alum.) Metal Flashing at building wall' },
    { id: 'r31', rate: 24.00, scope: '(Alum.) Metal Flashing at Parapet wall' },
    { id: 'r32', rate: null, scope: '' }, // blank row
    { id: 'r33', rate: 14.00, scope: 'Overburden for Irma Roof (Drainage mat + ', scopeVar: 'R?', hasVar: true, scopeAfter: ' Insulation + Filterfabric)' },
    { id: 'r34', rate: null, scope: 'Pavers ', scopeVar: '(R ?)', hasVar: true },
    { id: 'r35', rate: 24.00, scope: 'Metal Edge flashing at the paver Termination' },
    { id: 'r36', rate: null, scope: '' }, // blank row
    { id: 'r37', rate: 48.00, scope: 'Green Roof ', scopeVar: 'Scope', hasVar: true },
    { id: 'r38', rate: 24.00, scope: 'Metal Edge flashing at the Green Roof' },
    { id: 'r39', rate: null, scope: '', comment: 'Specify Exclusion' }, // blank row
    { id: 'r40', rate: 32.00, scope: 'Recessed floor ', scopeVar: '(Location)', hasVar: true, scopeAfter: ' - Liquid Waterproofing' },
  ],
  balcony: [
    { id: 'b1', rate: 17.00, scope: 'Traffic Coating' },
    { id: 'b2', rate: 22.00, scope: 'Aluminum Drip edge' },
    { id: 'b3', rate: 48.00, scope: 'Liquid L Flashing ', scopeVar: '(LF)', hasVar: true },
    { id: 'b4', rate: null, scope: '' }, // blank row
    { id: 'b5', rate: 550.00, scope: 'Doorpans - Balconies' },
  ],
  exterior: [
    { id: 'e1', rate: 5.25, scope: 'Brick area - Waterproofing' },
    { id: 'e2', rate: 250.00, scope: 'Openings at brick areas (Count) < 32lf' },
    { id: 'e3', rate: 10.00, scope: 'Openings at brick areas (LF) > 32lf/40lf' },
    { id: 'e4', rate: null, scope: '' }, // blank row
    { id: 'e5', rate: 5.25, scope: 'Panel Area - Waterproofing' },
    { id: 'e6', rate: 250.00, scope: 'Openings at panel Areas (Count) < 32lf' },
    { id: 'e7', rate: 10.00, scope: 'Openings at panel Areas (LF) > 32lf/40lf' },
    { id: 'e8', rate: null, scope: '' }, // blank row
    { id: 'e9', rate: null, scope: 'Eifs - ', scopeVar: 'Scope (R?)', hasVar: true },
    { id: 'e10', rate: 250.00, scope: 'openings at stucco areas (Count) < 32lf' },
    { id: 'e11', rate: 10.00, scope: 'openings at stucco areas (LF) > 32lf/40lf' },
    { id: 'e12', rate: 17.00, scope: 'Transistional stucco' },
    { id: 'e13', rate: null, scope: '' }, // blank row
    { id: 'e14', rate: 33.00, scope: 'Drip cap (LF)', comment: 'Eifs =/> 4"' },
    { id: 'e15', rate: 33.00, scope: 'Sills', comment: 'Eifs =/> 4"' },
    { id: 'e16', rate: 48.00, scope: 'Tie - In (LF)' },
    { id: 'e17', rate: 65.00, scope: 'adj. building horizontal (Coustom Metal Flashing only)' },
    { id: 'e18', rate: null, scope: 'adj. building Vertical (Detail?)', comment: 'Specify Exclusion' },
  ],
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

  // Sheet data - keyed by row id and column key
  const [sheetData, setSheetData] = useState({})
  const [pendingChanges, setPendingChanges] = useState({})

  // Tabs state
  const [activeTab, setActiveTab] = useState('master')
  const [imports, setImports] = useState([])
  const [selectedImport, setSelectedImport] = useState(null)

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

  // Load takeoff data
  const loadTakeoff = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/ko/takeoff/${projectId}?format=json`)

      if (res.status === 404) {
        setTakeoffExists(false)
        setLoading(false)
        return
      }

      if (!res.ok) {
        throw new Error('Failed to load takeoff')
      }

      const data = await res.json()

      // Parse data into our format
      if (data.sheet_data) {
        setSheetData(data.sheet_data)
      }

      setTakeoffExists(true)
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
  const handleCellChange = (rowId, colKey, value) => {
    const key = `${rowId}_${colKey}`
    setSheetData(prev => ({ ...prev, [key]: value }))
    setPendingChanges(prev => ({
      ...prev,
      [key]: { rowId, colKey, value }
    }))
  }

  // Get cell value
  const getCellValue = (rowId, colKey) => {
    return sheetData[`${rowId}_${colKey}`] || ''
  }

  // Calculate row total
  const calculateRowTotal = (rowId, columns, rate) => {
    let total = 0
    columns.forEach(col => {
      if (col.key !== 'unitCost' && col.key !== 'scope' && col.key !== 'totalMeasurements' && col.key !== 'totalCost' && col.key !== 'comments') {
        const val = parseFloat(getCellValue(rowId, col.key)) || 0
        total += val
      }
    })
    return total
  }

  // Calculate total cost for a row
  const calculateRowCost = (rowId, columns, rate) => {
    const measurements = calculateRowTotal(rowId, columns, rate)
    if (rate && measurements > 0) {
      return measurements * rate
    }
    return 0
  }

  // Save changes
  const saveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return

    setSaving(true)
    try {
      const res = await fetch(`/api/ko/takeoff/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheet_data: sheetData })
      })

      if (!res.ok) {
        throw new Error('Failed to save changes')
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
      await loadImports()

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
      setApprovedChanges(new Set())

    } catch (err) {
      console.error('Compare error:', err)
      setError(err.message)
    }
  }

  // Sync approved changes
  const syncChanges = async () => {
    if (approvedChanges.size === 0 || !selectedImport) return

    setSyncing(true)
    try {
      const approvedList = Array.from(approvedChanges).map(key => {
        const match = key.match(/^([A-Z]+)(\d+)$/)
        if (match) {
          return { col: match[1], row: parseInt(match[2], 10), action: "accept" }
        }
        return null
      }).filter(Boolean)

      const res = await fetch(`/api/ko/takeoff/${projectId}/sync/${selectedImport}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved_changes: approvedList })
      })

      if (!res.ok) throw new Error('Failed to sync')

      await loadTakeoff()
      setShowComparison(false)
      setSelectedImport(null)
      setActiveTab('master')

    } catch (err) {
      console.error('Sync error:', err)
      setError(err.message)
    } finally {
      setSyncing(false)
    }
  }

  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return ''
    const num = parseFloat(value)
    if (isNaN(num)) return ''
    return `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Render a section header row
  const renderSectionHeader = (columns, isFirst = false) => (
    <tr>
      {columns.map((col, idx) => (
        <th
          key={col.key}
          style={{
            backgroundColor: COLORS.headerYellow,
            border: '1px solid ' + COLORS.borderGray,
            padding: '4px 6px',
            fontSize: '11px',
            fontWeight: 'bold',
            textAlign: col.key === 'unitCost' ? 'right' : 'left',
            minWidth: col.width,
            maxWidth: col.width,
          }}
        >
          {col.label}
        </th>
      ))}
    </tr>
  )

  // Render a data row
  const renderDataRow = (row, columns) => {
    const totalMeasurements = calculateRowTotal(row.id, columns, row.rate)
    const totalCost = calculateRowCost(row.id, columns, row.rate)

    return (
      <tr key={row.id}>
        {columns.map((col) => {
          let cellContent = ''
          let bgColor = COLORS.white
          let textColor = '#000000'
          let textAlign = 'left'
          let fontWeight = 'normal'

          if (col.key === 'unitCost') {
            bgColor = COLORS.unitCostYellow
            textAlign = 'right'
            cellContent = row.rate ? formatCurrency(row.rate) : ''
          } else if (col.key === 'scope') {
            // Handle variable text in red
            if (row.hasVar) {
              cellContent = (
                <span>
                  {row.scope}
                  <span style={{ color: COLORS.variableRed }}>{row.scopeVar}</span>
                  {row.scopeAfter || ''}
                </span>
              )
            } else {
              cellContent = row.scope
            }
          } else if (col.key === 'totalMeasurements') {
            cellContent = totalMeasurements > 0 ? totalMeasurements : '0'
            textAlign = 'right'
          } else if (col.key === 'totalCost') {
            bgColor = COLORS.totalCostGreen
            cellContent = formatCurrency(totalCost) || '$ -'
            textAlign = 'right'
          } else if (col.key === 'comments') {
            cellContent = row.comment || ''
          } else {
            // Data entry cells
            const value = getCellValue(row.id, col.key)
            cellContent = (
              <input
                type="text"
                value={value}
                onChange={(e) => handleCellChange(row.id, col.key, e.target.value)}
                style={{
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'right',
                  fontSize: '11px',
                  padding: '2px',
                }}
              />
            )
          }

          return (
            <td
              key={col.key}
              style={{
                backgroundColor: bgColor,
                border: '1px solid ' + COLORS.borderGray,
                padding: '2px 4px',
                fontSize: '11px',
                textAlign: textAlign,
                fontWeight: fontWeight,
                minWidth: col.width,
                maxWidth: col.width,
              }}
            >
              {cellContent}
            </td>
          )
        })}
      </tr>
    )
  }

  // Render summary row
  const renderSummaryRow = (text, columns, bgColor = COLORS.summaryYellow) => {
    return (
      <tr>
        <td
          colSpan={columns.length - 1}
          style={{
            backgroundColor: bgColor,
            border: '1px solid ' + COLORS.borderGray,
            padding: '4px 6px',
            fontSize: '11px',
            fontWeight: 'bold',
            textAlign: 'center',
          }}
        >
          {text}
        </td>
        <td
          style={{
            backgroundColor: COLORS.totalCostGreen,
            border: '1px solid ' + COLORS.borderGray,
            padding: '4px 6px',
            fontSize: '11px',
            fontWeight: 'bold',
            textAlign: 'right',
          }}
        >
          $ -
        </td>
      </tr>
    )
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
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 bg-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-lg">{projectName || 'Takeoff Sheet'}</h1>
            <p className="text-xs text-gray-500">Master Roofing Official Template</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {Object.keys(pendingChanges).length > 0 && (
            <span className="text-xs text-yellow-600 flex items-center gap-1">
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
            onClick={loadTakeoff}
            className="p-2 hover:bg-gray-200 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={saveChanges}
            disabled={saving || Object.keys(pendingChanges).length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50"
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

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-100 border-b border-red-300 text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:underline">Dismiss</button>
        </div>
      )}

      {/* Spreadsheet content */}
      <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: '#f5f5f5' }}>
        {activeTab === 'master' && !showComparison && (
          <div style={{ backgroundColor: 'white', border: '1px solid #ccc', display: 'inline-block', minWidth: '100%' }}>
            {/* Master Roofing Header */}
            <div style={{ padding: '10px 20px', borderBottom: '2px solid #000', backgroundColor: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <img
                    src="/master-roofing-logo.png"
                    alt="Master Roofing"
                    style={{ height: '40px' }}
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                </div>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>Project Name</h2>
                  <input
                    type="text"
                    value={projectName || ''}
                    readOnly
                    style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      border: '1px solid #ccc',
                      padding: '4px 8px',
                      textAlign: 'center',
                      width: '300px',
                      marginTop: '4px',
                    }}
                  />
                </div>
                <div style={{ textAlign: 'right', fontSize: '10px', color: '#666' }}>
                  <div>TEL: 800.605.1619</div>
                  <div>FAX: 800.605.1666</div>
                  <div>MASTERROOFINGSUB.COM</div>
                </div>
              </div>
            </div>

            {/* ROOFING SECTION */}
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                {renderSectionHeader(ROOFING_COLUMNS, true)}
              </thead>
              <tbody>
                {TEMPLATE_DATA.roofing.map(row => renderDataRow(row, ROOFING_COLUMNS))}
              </tbody>
            </table>

            {/* BALCONIES SECTION */}
            <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '20px' }}>
              <thead>
                {renderSectionHeader(BALCONY_COLUMNS)}
              </thead>
              <tbody>
                {TEMPLATE_DATA.balcony.map(row => renderDataRow(row, BALCONY_COLUMNS))}
                {renderSummaryRow('TOTAL COST FOR ALL THE ROOFING WORKS', BALCONY_COLUMNS)}
                <tr>
                  <td colSpan={BALCONY_COLUMNS.length} style={{ textAlign: 'center', fontSize: '11px', color: '#999', padding: '4px' }}>
                    Note:
                  </td>
                </tr>
              </tbody>
            </table>

            {/* EXTERIOR SECTION */}
            <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '20px' }}>
              <thead>
                {renderSectionHeader(EXTERIOR_COLUMNS)}
              </thead>
              <tbody>
                {TEMPLATE_DATA.exterior.map(row => renderDataRow(row, EXTERIOR_COLUMNS))}
                {renderSummaryRow('TOTAL COST FOR ALL THE EXTERIOR WORKS', EXTERIOR_COLUMNS)}
              </tbody>
            </table>

            {/* FINAL TOTAL */}
            <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '10px' }}>
              <tbody>
                <tr>
                  <td
                    style={{
                      backgroundColor: COLORS.white,
                      border: '1px solid ' + COLORS.borderGray,
                      padding: '8px 20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                    }}
                  >
                    TOTAL COST FOR ALL WORK LISTED IN THIS PROPOSAL -
                  </td>
                  <td
                    style={{
                      backgroundColor: COLORS.finalTotalGreen,
                      border: '1px solid ' + COLORS.borderGray,
                      padding: '8px 20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textAlign: 'right',
                      width: '120px',
                    }}
                  >
                    $ -
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Imports Tab */}
        {activeTab === 'imports' && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {imports.map(imp => {
                const importId = imp.id || imp.import_id
                const createdAt = imp.uploaded_at || imp.created_at
                const itemCount = imp.stats?.total_items || imp.item_count || 0

                return (
                  <div
                    key={importId}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-colors bg-white",
                      selectedImport === importId
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-blue-300"
                    )}
                    onClick={() => setSelectedImport(importId)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">Import #{importId?.slice(-6)}</p>
                        <p className="text-xs text-gray-500">
                          {createdAt ? new Date(createdAt).toLocaleString() : 'Unknown date'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 text-xs bg-green-100 text-green-600 rounded">
                        {itemCount} items
                      </span>
                    </div>

                    {selectedImport === importId && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            compareImport(importId)
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs"
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
                <div className="col-span-full text-center py-12 text-gray-500">
                  <History className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p>No imports yet</p>
                  <p className="text-xs mt-1">Upload a Bluebeam CSV to create an import</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-t border-gray-300 bg-gray-100">
        <button
          onClick={() => { setActiveTab('master'); setShowComparison(false) }}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            activeTab === 'master'
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-200"
          )}
        >
          Master Sheet
        </button>

        {imports.length > 0 && (
          <button
            onClick={() => setActiveTab('imports')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
              activeTab === 'imports'
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:bg-gray-200"
            )}
          >
            Imports ({imports.length})
          </button>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="font-semibold mb-4">Import Bluebeam CSV</h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-600" />
              ) : (
                <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
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
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
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
