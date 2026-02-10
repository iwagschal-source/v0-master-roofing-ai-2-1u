"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  FileSpreadsheet,
  Plus,
  Trash2,
  DollarSign,
  MapPin,
  List,
  Calculator,
  Check,
  AlertCircle,
  Info,
  Download,
  Wrench
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LineItemSelector } from "./line-item-selector"
import { getVariantKey, getVariantDisplayName } from "./variant-selector"

const STEPS = [
  { id: 'columns', label: 'Location Columns', icon: MapPin },
  { id: 'items', label: 'Line Items', icon: List },
  { id: 'rates', label: 'Rates', icon: DollarSign },
  { id: 'generate', label: 'Generate BTX', icon: Wrench },
  { id: 'sheet', label: 'Create Sheet', icon: FileSpreadsheet }
]

/**
 * TakeoffSetupScreen Component
 *
 * A wizard for configuring takeoff structure before importing Bluebeam data.
 * Step 1: Configure location columns and their Bluebeam layer mappings
 * Step 2: Select line items with optional variants
 * Step 3: Configure rate overrides
 *
 * Props:
 * - projectId: The project ID
 * - projectName: The project name (for display)
 * - gcName: The GC name (for historical rates)
 * - onClose: Callback when closing the wizard
 * - onComplete: Callback when setup is complete (receives config)
 * - initialConfig: Optional existing configuration to edit
 */
export function TakeoffSetupScreen({
  projectId,
  projectName,
  gcName,
  onClose,
  onComplete,
  initialConfig
}) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [downloadingBtx, setDownloadingBtx] = useState(false)
  const [btxGenerated, setBtxGenerated] = useState(false)
  const [error, setError] = useState(null)

  // Sheet creation state (Step 5)
  const [creatingSheet, setCreatingSheet] = useState(false)
  const [sheetCreated, setSheetCreated] = useState(false)
  const [spreadsheetId, setSpreadsheetId] = useState(null)
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(null)
  const [embedUrl, setEmbedUrl] = useState(null)

  // Library data
  const [libraryItems, setLibraryItems] = useState([])
  const [librarySections, setLibrarySections] = useState({})
  const [variantOptions, setVariantOptions] = useState(null)

  // Configuration state
  const [columns, setColumns] = useState([
    { id: 'C', name: 'Main Roof', mappings: ['ROOF', 'MR', 'MAIN'] },
    { id: 'D', name: '1st Floor', mappings: ['FL-1', '1ST', 'GROUND'] },
    { id: 'E', name: '2nd Floor', mappings: ['FL-2', '2ND'] }
  ])
  const [selectedItems, setSelectedItems] = useState([])
  const [rateOverrides, setRateOverrides] = useState({})

  // Load library and existing config on mount
  useEffect(() => {
    loadData()
  }, [projectId, gcName])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Load library items
      const libraryUrl = gcName
        ? `/api/ko/takeoff/library?gcName=${encodeURIComponent(gcName)}`
        : '/api/ko/takeoff/library'
      const libraryRes = await fetch(libraryUrl)
      const libraryData = await libraryRes.json()

      if (libraryData.items) {
        setLibraryItems(libraryData.items)
        setLibrarySections(libraryData.sections || {})
        if (libraryData.variant_options) {
          setVariantOptions(libraryData.variant_options)
        }
      }

      // Load existing config if available
      const configRes = await fetch(`/api/ko/takeoff/${projectId}/config`)
      const configData = await configRes.json()

      if (configData.exists && configData.config) {
        const cfg = configData.config
        if (cfg.columns?.length > 0) setColumns(cfg.columns)
        if (cfg.selectedItems?.length > 0) setSelectedItems(cfg.selectedItems)
        if (cfg.rateOverrides) setRateOverrides(cfg.rateOverrides)
      }

      // Apply initial config if provided
      if (initialConfig) {
        if (initialConfig.columns?.length > 0) setColumns(initialConfig.columns)
        if (initialConfig.selectedItems?.length > 0) setSelectedItems(initialConfig.selectedItems)
        if (initialConfig.rateOverrides) setRateOverrides(initialConfig.rateOverrides)
      }

    } catch (err) {
      console.error('Load data error:', err)
      setError('Failed to load data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Save configuration
  const saveConfig = async () => {
    setSaving(true)
    setError(null)

    try {
      const config = {
        columns,
        selectedItems,
        rateOverrides,
        gcName
      }

      const res = await fetch(`/api/ko/takeoff/${projectId}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save configuration')
      }

      return true
    } catch (err) {
      console.error('Save config error:', err)
      setError('Failed to save: ' + err.message)
      return false
    } finally {
      setSaving(false)
    }
  }

  // Complete wizard and return to Estimating Center
  const handleComplete = async () => {
    // Save config one more time
    await saveConfig().catch(err => {
      console.warn('Final config save failed:', err.message)
    })

    // Call completion callback with all data including spreadsheet
    if (onComplete) {
      onComplete({
        columns,
        selectedItems,
        rateOverrides,
        gcName,
        spreadsheetId,
        spreadsheetUrl,
        embedUrl,
        btxGenerated,
        sheetCreated
      })
    }
  }

  // Column management
  const addColumn = () => {
    const lastCol = columns[columns.length - 1]
    const nextId = lastCol
      ? (lastCol.id === 'Z' ? 'AA' : String.fromCharCode(lastCol.id.charCodeAt(0) + 1))
      : 'C'
    setColumns([...columns, { id: nextId, name: '', mappings: [] }])
  }

  const updateColumn = (index, field, value) => {
    const newColumns = [...columns]
    newColumns[index] = { ...newColumns[index], [field]: value }
    setColumns(newColumns)
  }

  const removeColumn = (index) => {
    if (columns.length <= 1) return
    setColumns(columns.filter((_, i) => i !== index))
  }

  // Parse mappings from comma-separated string
  const parseMappings = (str) => {
    return str.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
  }

  // Get expanded rows (items + their variants)
  const getExpandedRows = useCallback(() => {
    const rows = []

    for (const selected of selectedItems) {
      const libraryItem = libraryItems.find(i => i.scope_code === selected.scope_code)
      if (!libraryItem) continue

      const hasVariants = libraryItem.has_r_value || libraryItem.has_thickness || libraryItem.has_material_type

      if (hasVariants && selected.variants?.length > 0) {
        // Add a row for each variant
        for (const variant of selected.variants) {
          const key = getVariantKey(selected.scope_code, variant)
          const displayName = getVariantDisplayName(libraryItem.scope_name, variant)
          rows.push({
            key,
            scope_code: selected.scope_code,
            displayName,
            variant,
            libraryItem,
            defaultRate: libraryItem.gc_rate || libraryItem.default_unit_cost,
            uom: libraryItem.uom
          })
        }
      } else {
        // Simple item without variants
        rows.push({
          key: selected.scope_code,
          scope_code: selected.scope_code,
          displayName: libraryItem.scope_name,
          variant: null,
          libraryItem,
          defaultRate: libraryItem.gc_rate || libraryItem.default_unit_cost,
          uom: libraryItem.uom
        })
      }
    }

    return rows
  }, [selectedItems, libraryItems])

  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return ''
    return `$${parseFloat(value).toFixed(2)}`
  }

  // Validate current step
  const validateStep = () => {
    if (currentStep === 0) {
      // Must have at least one column with a name
      return columns.some(col => col.name.trim())
    }
    if (currentStep === 1) {
      // Must have at least one item selected
      return selectedItems.length > 0
    }
    return true
  }

  // Download BTX file
  const downloadBtx = async () => {
    setDownloadingBtx(true)
    setError(null)

    try {
      // Try to save config (best effort - don't block on failure)
      await saveConfig().catch(err => {
        console.warn('Config save failed (continuing with BTX download):', err.message)
      })

      // Generate and download BTX - config is passed in body, so save not required
      const res = await fetch(`/api/ko/takeoff/${projectId}/btx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: { columns, selectedItems, rateOverrides, gcName },
          projectName
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate BTX')
      }

      // Get the content and download
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safeName = (projectName || projectId).replace(/[^a-zA-Z0-9]/g, '_')
      const isZip = res.headers.get('Content-Type')?.includes('application/zip')
      a.download = isZip ? `${safeName}_tools.zip` : `${safeName}_Takeoff.btx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setBtxGenerated(true)
    } catch (err) {
      console.error('BTX download error:', err)
      setError('Failed to download BTX: ' + err.message)
    } finally {
      setDownloadingBtx(false)
    }
  }

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderColumnsStep()
      case 1:
        return renderItemsStep()
      case 2:
        return renderRatesStep()
      case 3:
        return renderGenerateStep()
      case 4:
        return renderCreateSheetStep()
      default:
        return null
    }
  }

  // Step 1: Location Columns
  const renderColumnsStep = () => (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Configure Location Columns</h2>
        <p className="text-sm text-muted-foreground">
          Define the columns for different areas/locations. Add Bluebeam layer patterns to auto-match measurements.
        </p>
      </div>

      <div className="space-y-4">
        {columns.map((col, idx) => (
          <div key={col.id} className="flex items-start gap-4 p-4 bg-muted/30 rounded-lg border border-border">
            <div className="w-12 h-10 flex items-center justify-center bg-primary/10 text-primary font-mono font-semibold rounded">
              {col.id}
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Column Name</label>
                <input
                  type="text"
                  value={col.name}
                  onChange={(e) => updateColumn(idx, 'name', e.target.value)}
                  placeholder="e.g., Main Roof, 1st Floor..."
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Bluebeam Layer Patterns (comma-separated)
                </label>
                <input
                  type="text"
                  value={col.mappings?.join(', ') || ''}
                  onChange={(e) => updateColumn(idx, 'mappings', parseMappings(e.target.value))}
                  placeholder="e.g., ROOF, MR, MAIN"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Layer names containing these patterns will map to this column
                </p>
              </div>
            </div>
            <button
              onClick={() => removeColumn(idx)}
              disabled={columns.length <= 1}
              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <button
          onClick={addColumn}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border hover:border-primary/50 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Column
        </button>
      </div>
    </div>
  )

  // Step 2: Line Items
  const renderItemsStep = () => (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Select Line Items</h2>
        <p className="text-sm text-muted-foreground">
          Choose the items to include in this takeoff. Items with variants (R-value, size, type) can be expanded.
        </p>
      </div>

      <LineItemSelector
        items={libraryItems}
        sections={librarySections}
        selectedItems={selectedItems}
        onChange={setSelectedItems}
        gcName={gcName}
        loading={loading}
        variantOptions={variantOptions}
      />
    </div>
  )

  // Step 3: Rates
  const renderRatesStep = () => {
    const rows = getExpandedRows()

    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Configure Rates</h2>
          <p className="text-sm text-muted-foreground">
            Review and adjust rates for each item. Default rates are shown based on library values
            {gcName && ` and ${gcName} historical data`}.
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Calculator className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No items selected</p>
            <p className="text-sm">Go back to Step 2 to select line items</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium w-20">UOM</th>
                  <th className="px-4 py-3 text-right font-medium w-28">Default</th>
                  <th className="px-4 py-3 text-right font-medium w-32">Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(row => (
                  <tr key={row.key} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{row.displayName}</span>
                        {row.libraryItem?.gc_rate && (
                          <span className="text-xs px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded">
                            GC Rate
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.uom}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {formatCurrency(row.defaultRate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rateOverrides[row.key] || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            setRateOverrides(prev => {
                              const next = { ...prev }
                              if (val) {
                                next[row.key] = parseFloat(val)
                              } else {
                                delete next[row.key]
                              }
                              return next
                            })
                          }}
                          placeholder={row.defaultRate?.toFixed(2)}
                          className="w-full pl-6 pr-2 py-1.5 bg-background border border-input rounded text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium">Rate Priority</p>
            <p>Override rates take precedence over GC historical rates, which take precedence over library defaults.</p>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Generate BTX
  const renderGenerateStep = () => {
    const toolCount = selectedItems.length * columns.length

    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Generate Bluebeam Tool Chest</h2>
          <p className="text-sm text-muted-foreground">
            Download a BTX file containing measurement tools for Bluebeam. Each tool is named with a deterministic format
            for accurate parsing when imported back.
          </p>
        </div>

        {/* Summary */}
        <div className="bg-muted/30 rounded-lg p-6 mb-6">
          <h3 className="font-medium mb-4">Configuration Summary</h3>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-background rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">{selectedItems.length}</p>
              <p className="text-sm text-muted-foreground">Line Items</p>
            </div>
            <div className="bg-background rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary">{columns.length}</p>
              <p className="text-sm text-muted-foreground">Locations</p>
            </div>
            <div className="bg-background rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{toolCount}</p>
              <p className="text-sm text-muted-foreground">Total Tools</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm"><strong>Locations:</strong> {columns.map(c => c.name).join(', ')}</p>
            <p className="text-sm"><strong>Items:</strong> {selectedItems.slice(0, 5).map(i => i.scope_code).join(', ')}{selectedItems.length > 5 ? ` (+${selectedItems.length - 5} more)` : ''}</p>
          </div>
        </div>

        {/* Tool Format Explanation */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-6">
          <h4 className="font-medium text-orange-700 dark:text-orange-300 mb-2">Tool Naming Format</h4>
          <p className="text-sm text-orange-600 dark:text-orange-400 mb-2">
            Each tool will be named: <code className="bg-orange-500/20 px-1 rounded">ITEM_CODE | LOCATION</code>
          </p>
          <p className="text-xs text-muted-foreground">
            Example: <code>MR-VB | FL1</code>, <code>MR-2PLY | ROOF</code>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            This format enables automatic parsing when you upload the Bluebeam CSV export back to the system.
          </p>
        </div>

        {/* Download Button */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={downloadBtx}
            disabled={downloadingBtx || selectedItems.length === 0}
            className="flex items-center gap-3 px-8 py-4 bg-orange-600 text-white rounded-xl text-lg font-medium hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {downloadingBtx ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Download className="w-6 h-6" />
            )}
            {downloadingBtx ? 'Generating...' : 'Download BTX File'}
          </button>

          {btxGenerated && (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              <span>BTX file downloaded successfully!</span>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-3">Next Steps</h4>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
              <span>Import the BTX file into Bluebeam Revu (Tool Chest → Import)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
              <span>Open your PDF plans in Bluebeam</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
              <span>Use ONLY the imported tools to mark up measurements</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
              <span>Export markup summary to CSV (Markups → Summary → Export CSV)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 text-xs font-bold">5</span>
              <span>Upload the CSV using the "Bluebeam" button in the Estimating Center</span>
            </li>
          </ol>
        </div>
      </div>
    )
  }

  // Create takeoff sheet
  const createTakeoffSheet = async () => {
    setCreatingSheet(true)
    setError(null)

    try {
      const res = await fetch('/api/ko/takeoff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          project_name: projectName,
          columns,
          lineItems: selectedItems.map(item => {
            const libraryItem = libraryItems.find(i => i.scope_code === item.scope_code)
            // Get unit cost from overrides or library
            const unitCost = rateOverrides[item.scope_code] || libraryItem?.gc_rate || libraryItem?.default_unit_cost || ''
            return {
              scope_code: item.scope_code,
              scope_name: libraryItem?.scope_name || item.scope_code,
              unit_cost: unitCost,
              variants: item.variants
            }
          })
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to create takeoff sheet')
      }

      const data = await res.json()
      setSpreadsheetId(data.spreadsheetId)
      setSpreadsheetUrl(data.spreadsheetUrl)
      setEmbedUrl(data.embedUrl)
      setSheetCreated(true)

    } catch (err) {
      console.error('Create sheet error:', err)
      setError('Failed to create takeoff sheet: ' + err.message)
    } finally {
      setCreatingSheet(false)
    }
  }

  // Step 5: Create Takeoff Sheet
  const renderCreateSheetStep = () => {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Create Takeoff Sheet</h2>
          <p className="text-sm text-muted-foreground">
            Create a Google Sheets workbook with your configured locations and line items.
            The sheet will be linked to this project for tracking.
          </p>
        </div>

        {!sheetCreated ? (
          // Pre-creation state
          <div className="bg-muted/30 rounded-lg p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <FileSpreadsheet className="w-10 h-10 text-green-600" />
            </div>

            <h3 className="text-xl font-semibold mb-2">Ready to Create</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              This will create a new Google Sheets workbook with {columns.length} location columns
              and {selectedItems.length} line items.
            </p>

            <button
              onClick={createTakeoffSheet}
              disabled={creatingSheet}
              className="flex items-center gap-3 px-8 py-4 bg-green-600 text-white rounded-xl text-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto"
            >
              {creatingSheet ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-6 h-6" />
              )}
              {creatingSheet ? 'Creating Sheet...' : 'Create Takeoff Sheet'}
            </button>

            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-left max-w-md mx-auto">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>What happens:</strong>
              </p>
              <ul className="text-sm text-blue-600 dark:text-blue-400 mt-2 space-y-1">
                <li>• A new spreadsheet is created from the MR template</li>
                <li>• Location columns are configured</li>
                <li>• Line items are added as rows</li>
                <li>• Sheet is linked to this project in the database</li>
              </ul>
            </div>
          </div>
        ) : (
          // Post-creation state - show embedded sheet
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Check className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">
                  Takeoff sheet created successfully!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  The sheet is now linked to this project.
                </p>
              </div>
            </div>

            {/* Embedded Sheet Preview */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                <span className="text-sm font-medium">Takeoff Sheet Preview</span>
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Open in Google Sheets
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
              <iframe
                src={embedUrl}
                className="w-full border-0"
                style={{ height: '400px' }}
                allow="clipboard-read; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>

            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <h4 className="font-medium text-orange-700 dark:text-orange-300 mb-2">Next Steps</h4>
              <ol className="text-sm text-orange-600 dark:text-orange-400 space-y-1">
                <li>1. Import the BTX file into Bluebeam (from Step 4)</li>
                <li>2. Mark up your PDF plans using the imported tools</li>
                <li>3. Export CSV from Bluebeam markups</li>
                <li>4. Upload CSV to auto-fill quantities in this sheet</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold">Takeoff Setup</h1>
            <p className="text-sm text-muted-foreground">
              {projectName} {gcName && `• ${gcName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm hover:bg-secondary/80 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Draft
          </button>
        </div>
      </div>

      {/* Step indicators */}
      <div className="px-6 py-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-center gap-4">
          {STEPS.map((step, idx) => {
            const StepIcon = step.icon
            const isActive = idx === currentStep
            const isComplete = idx < currentStep

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(idx)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  !isActive && isComplete && "bg-green-500/10 text-green-600",
                  !isActive && !isComplete && "text-muted-foreground hover:bg-muted"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                  isActive && "bg-primary-foreground/20",
                  isComplete && "bg-green-500 text-white"
                )}>
                  {isComplete ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <span className="font-medium hidden sm:inline">{step.label}</span>
                <StepIcon className="w-4 h-4 sm:hidden" />
              </button>
            )
          })}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-6 py-3 bg-red-500/10 border-b border-red-500/30 text-red-500 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-sm hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderStepContent()}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border bg-card flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-3">
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!validateStep()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!sheetCreated}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {sheetCreated ? 'Finish & View Sheet' : 'Create Sheet First'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TakeoffSetupScreen
