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
  XCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

// Master Roofing Official Takeoff Template - aligned with lib_takeoff_template in BigQuery
// IDs match mr_agent.lib_takeoff_template item_id format (MR-xxxYYY)
const TEMPLATE_ROWS = [
  { row: 3, label: 'Headers', code: 'HEADER', section: 'header', isHeader: true },
  // ROOFING SECTION
  { row: 4, label: 'Vapor Barrier', code: 'MR-001VB', section: 'roofing', uom: 'SF', rate: 6.95 },
  { row: 5, label: 'Pitch Upcharge', code: 'MR-002PITCH', section: 'roofing', uom: 'SF', rate: 1.5 },
  { row: 6, label: 'Roofing - 2 Ply', code: 'MR-003BU2PLY', section: 'roofing', uom: 'SF', rate: 16.25, hasSystem: true },
  { row: 7, label: 'Up and Over', code: 'MR-004UO', section: 'roofing', uom: 'LF', rate: 12.0 },
  { row: 8, label: 'Scupper/Leader', code: 'MR-005SCUPPER', section: 'roofing', uom: 'EA', rate: 2500.0 },
  { row: 10, label: 'Roofing - IRMA', code: 'MR-006IRMA', section: 'roofing', uom: 'SF', hasSystem: true, hasRValue: true },
  { row: 11, label: 'PMMA @ Building', code: 'MR-007PMMA', section: 'roofing', uom: 'LF', hasSystem: true },
  { row: 12, label: 'PMMA @ Parapet', code: 'MR-008PMMA', section: 'roofing', uom: 'LF', hasSystem: true },
  { row: 15, label: 'Drains', code: 'MR-010DRAIN', section: 'roofing', uom: 'EA', rate: 550.0 },
  { row: 16, label: 'Doorpans - Std', code: 'MR-011DOORSTD', section: 'roofing', uom: 'EA', rate: 550.0 },
  { row: 17, label: 'Doorpans - Large', code: 'MR-012DOORLG', section: 'roofing', uom: 'EA', rate: 850.0 },
  { row: 19, label: 'Hatch/Skylight (SF)', code: 'MR-013HATCHSF', section: 'roofing', uom: 'SF' },
  { row: 20, label: 'Hatch/Skylight (LF)', code: 'MR-014HATCHLF', section: 'roofing', uom: 'LF', rate: 48.0 },
  { row: 21, label: 'Mech Pads', code: 'MR-015PAD', section: 'roofing', uom: 'SF' },
  { row: 22, label: 'Fence Posts', code: 'MR-016FENCE', section: 'roofing', uom: 'EA', rate: 250.0 },
  { row: 23, label: 'Railing Posts', code: 'MR-017RAIL', section: 'roofing', uom: 'EA', rate: 250.0 },
  { row: 24, label: 'Plumbing Pen.', code: 'MR-018PLUMB', section: 'roofing', uom: 'EA', rate: 250.0 },
  { row: 25, label: 'Mechanical Pen.', code: 'MR-019MECH', section: 'roofing', uom: 'EA', rate: 250.0 },
  { row: 26, label: 'Davits', code: 'MR-020DAVIT', section: 'roofing', uom: 'EA', rate: 150.0 },
  { row: 27, label: 'AC Units/Dunnage', code: 'MR-021AC', section: 'roofing', uom: 'EA', rate: 550.0 },
  { row: 29, label: 'Coping (Low)', code: 'MR-022COPELO', section: 'roofing', uom: 'LF', rate: 32.0, hasSystem: true },
  { row: 30, label: 'Coping (High)', code: 'MR-023COPEHI', section: 'roofing', uom: 'LF', rate: 32.0, hasSystem: true },
  { row: 31, label: 'Insul. Coping', code: 'MR-024INSUCOPE', section: 'roofing', uom: 'LF', rate: 4.0, hasRValue: true },
  { row: 33, label: 'Flash @ Building', code: 'MR-025FLASHBLDG', section: 'roofing', uom: 'LF', rate: 24.0 },
  { row: 34, label: 'Flash @ Parapet', code: 'MR-026FLASHPAR', section: 'roofing', uom: 'LF', rate: 24.0 },
  { row: 36, label: 'Overburden IRMA', code: 'MR-027OBIRMA', section: 'roofing', uom: 'SF', rate: 14.0 },
  { row: 37, label: 'Pavers', code: 'MR-028PAVER', section: 'roofing', uom: 'SF', hasSystem: true },
  { row: 38, label: 'Edge @ Pavers', code: 'MR-029FLASHPAV', section: 'roofing', uom: 'LF', rate: 24.0 },
  { row: 40, label: 'Green Roof', code: 'MR-030GREEN', section: 'roofing', uom: 'SF', rate: 48.0 },
  { row: 41, label: 'Edge @ Green', code: 'MR-031FLASHGRN', section: 'roofing', uom: 'LF', rate: 24.0 },
  { row: 43, label: 'Recessed Floor WP', code: 'MR-032RECESSWP', section: 'roofing', uom: 'SF', rate: 32.0 },
  // BALCONIES SECTION
  { row: 46, label: 'Traffic Coating', code: 'MR-033TRAFFIC', section: 'balcony', uom: 'SF', rate: 17.0 },
  { row: 47, label: 'Alum. Drip Edge', code: 'MR-034DRIP', section: 'balcony', uom: 'LF', rate: 22.0 },
  { row: 48, label: 'Liquid L Flash', code: 'MR-035LFLASH', section: 'balcony', uom: 'LF', rate: 48.0 },
  { row: 50, label: 'Doorpans - Balc.', code: 'MR-036DOORBAL', section: 'balcony', uom: 'EA', rate: 550.0 },
  // EXTERIOR SECTION
  { row: 55, label: 'Brick WP', code: 'MR-037BRICKWP', section: 'exterior', uom: 'SF', rate: 5.25 },
  { row: 56, label: 'Open Brick (EA)', code: 'MR-038OPNBRKEA', section: 'exterior', uom: 'EA', rate: 250.0 },
  { row: 57, label: 'Open Brick (LF)', code: 'MR-039OPNBRKLF', section: 'exterior', uom: 'LF', rate: 10.0 },
  { row: 59, label: 'Panel WP', code: 'MR-040PANELWP', section: 'exterior', uom: 'SF', rate: 5.25 },
  { row: 60, label: 'Open Panel (EA)', code: 'MR-041OPNPNLEA', section: 'exterior', uom: 'EA', rate: 250.0 },
  { row: 61, label: 'Open Panel (LF)', code: 'MR-042OPNPNLLF', section: 'exterior', uom: 'LF', rate: 10.0 },
  { row: 63, label: 'EIFS', code: 'MR-043EIFS', section: 'exterior', uom: 'SF', hasSystem: true, hasRValue: true, hasThickness: true },
  { row: 64, label: 'Open Stucco (EA)', code: 'MR-044OPNSTCEA', section: 'exterior', uom: 'EA', rate: 250.0 },
  { row: 65, label: 'Open Stucco (LF)', code: 'MR-045OPNSTCLF', section: 'exterior', uom: 'LF', rate: 10.0 },
  { row: 66, label: 'Trans. Stucco', code: 'MR-046STUCCO', section: 'exterior', uom: 'SF', rate: 17.0 },
  { row: 68, label: 'Drip Cap', code: 'MR-047DRIPCAP', section: 'exterior', uom: 'LF', rate: 33.0 },
  { row: 69, label: 'Sills', code: 'MR-048SILL', section: 'exterior', uom: 'LF', rate: 33.0 },
  { row: 70, label: 'Tie-In', code: 'MR-049TIEIN', section: 'exterior', uom: 'LF', rate: 48.0 },
  { row: 71, label: 'Adj. Bldg Horiz', code: 'MR-050ADJHORZ', section: 'exterior', uom: 'LF', rate: 65.0 },
  { row: 72, label: 'Adj. Bldg Vert', code: 'MR-051ADJVERT', section: 'exterior', uom: 'LF' },
]

// Default columns
const DEFAULT_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']

export function TakeoffSpreadsheet({
  projectId,
  projectName,
  onClose,
  onSave
}) {
  // State
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [takeoffExists, setTakeoffExists] = useState(false)
  const [creating, setCreating] = useState(false)

  // Sheet data
  const [sheetData, setSheetData] = useState({})
  const [columns, setColumns] = useState(DEFAULT_COLUMNS)
  const [columnHeaders, setColumnHeaders] = useState({})
  const [pendingChanges, setPendingChanges] = useState({})

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

      // Parse Luckysheet celldata format
      // Backend returns: { sheet_data: { celldata: [{ r: row, c: col, v: { v: value, m: display } }] } }
      const celldata = data.sheet_data?.celldata || data.cells || []

      if (celldata.length > 0) {
        const parsed = {}
        const detectedCols = new Set()

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
        }

        setSheetData(parsed)

        // Set columns in order
        const sortedCols = Array.from(detectedCols).sort((a, b) => {
          // Sort alphabetically but handle multi-letter columns
          if (a.length !== b.length) return a.length - b.length
          return a.localeCompare(b)
        })
        setColumns(sortedCols.length > 0 ? sortedCols : DEFAULT_COLUMNS)

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

  // Save changes
  const saveChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return

    setSaving(true)
    try {
      const updates = Object.values(pendingChanges)

      const res = await fetch(`/api/ko/takeoff/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
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

          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
          >
            <Upload className="w-4 h-4" />
            Import Bluebeam
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
            disabled={saving || Object.keys(pendingChanges).length === 0}
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
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30">
        <button
          onClick={() => { setActiveTab('master'); setShowComparison(false) }}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
            activeTab === 'master'
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-secondary"
          )}
        >
          Master Sheet
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
        {activeTab === 'master' && !showComparison && (
          <div className="p-4">
            {/* Spreadsheet table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="border-r border-border px-2 py-2 text-left w-12">#</th>
                    {columns.map(col => (
                      <th key={col} className="border-r border-border px-3 py-2 text-left min-w-[100px]">
                        {columnHeaders[col] || col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TEMPLATE_ROWS.filter(r => !r.isHeader).map(rowDef => (
                    <tr key={rowDef.row} className="border-t border-border hover:bg-muted/30">
                      <td className="border-r border-border px-2 py-1 text-muted-foreground text-xs">
                        {rowDef.row}
                      </td>
                      {columns.map(col => {
                        const value = getCellValue(rowDef.row, col)
                        const isPending = hasPendingChange(rowDef.row, col)
                        const isEditable = col !== 'A' && col !== 'B' // A=rate, B=item name

                        return (
                          <td
                            key={col}
                            className={cn(
                              "border-r border-border px-1 py-0.5",
                              isPending && "bg-yellow-500/10"
                            )}
                          >
                            {isEditable ? (
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => handleCellChange(rowDef.row, col, e.target.value)}
                                className="w-full px-2 py-1 bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-primary rounded text-sm"
                              />
                            ) : (
                              <span className="px-2 py-1 block text-muted-foreground">
                                {col === 'B' ? rowDef.label : value}
                              </span>
                            )}
                          </td>
                        )
                      })}
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
