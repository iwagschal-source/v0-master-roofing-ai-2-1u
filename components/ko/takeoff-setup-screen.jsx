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
  Info
} from "lucide-react"
import { cn } from "@/lib/utils"
import { LineItemSelector } from "./line-item-selector"
import { getVariantKey, getVariantDisplayName } from "./variant-selector"

const STEPS = [
  { id: 'columns', label: 'Location Columns', icon: MapPin },
  { id: 'items', label: 'Line Items', icon: List },
  { id: 'rates', label: 'Rates', icon: DollarSign }
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
  const [error, setError] = useState(null)

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
        gcId: gcName?.toLowerCase().replace(/\s+/g, '-'),
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

  // Generate takeoff and complete
  const handleComplete = async () => {
    // First save config
    const saved = await saveConfig()
    if (!saved) return

    setGenerating(true)
    setError(null)

    try {
      // Generate takeoff from config
      const res = await fetch(`/api/ko/takeoff/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          columns,
          selectedItems,
          rateOverrides,
          gcName
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate takeoff')
      }

      const result = await res.json()

      // Call completion callback
      if (onComplete) {
        onComplete({
          columns,
          selectedItems,
          rateOverrides,
          gcName,
          generated: result
        })
      }

    } catch (err) {
      console.error('Generate error:', err)
      setError('Failed to generate takeoff: ' + err.message)
    } finally {
      setGenerating(false)
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
      const libraryItem = libraryItems.find(i => i.item_id === selected.item_id)
      if (!libraryItem) continue

      const hasVariants = libraryItem.has_r_value || libraryItem.has_thickness || libraryItem.has_material_type

      if (hasVariants && selected.variants?.length > 0) {
        // Add a row for each variant
        for (const variant of selected.variants) {
          const key = getVariantKey(selected.item_id, variant)
          const displayName = getVariantDisplayName(libraryItem.scope_name, variant)
          rows.push({
            key,
            item_id: selected.item_id,
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
          key: selected.item_id,
          item_id: selected.item_id,
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

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderColumnsStep()
      case 1:
        return renderItemsStep()
      case 2:
        return renderRatesStep()
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
              disabled={generating || !validateStep() || selectedItems.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              {generating ? 'Generating...' : 'Generate Takeoff'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TakeoffSetupScreen
