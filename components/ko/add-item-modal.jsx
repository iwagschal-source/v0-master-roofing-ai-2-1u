"use client"

import { useState, useEffect } from "react"
import {
  X, Plus, Loader2, AlertCircle, CheckCircle2,
  ChevronDown, Eye, Package, Layers, Box
} from "lucide-react"

const SECTIONS = ['ROOFING', 'BALCONIES', 'EXTERIOR', 'WATERPROOFING']
const UOMS = ['SF', 'LF', 'EA', 'SY', 'CF', 'GAL', 'LS']
const ITEM_TYPES = [
  { value: 'system', label: 'System', icon: Layers, desc: 'Parent item that bundles components (e.g., 2-Ply BUR system)' },
  { value: 'component', label: 'Component', icon: Package, desc: 'Part of a system bundle (e.g., insulation within a BUR system)' },
  { value: 'standalone', label: 'Standalone', icon: Box, desc: 'Independent item not part of any system' },
]

function generateItemId(section, displayName) {
  const prefix = 'MR-'
  const abbr = (displayName || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 8)
    .toUpperCase()
  return `${prefix}${abbr}`
}

export function AddItemModal({ isOpen, onClose, onSuccess }) {
  // Form state
  const [itemId, setItemId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [scopeName, setScopeName] = useState('')
  const [section, setSection] = useState('')
  const [uom, setUom] = useState('SF')
  const [defaultUnitCost, setDefaultUnitCost] = useState('')
  const [defaultRate, setDefaultRate] = useState('')
  const [itemType, setItemType] = useState('standalone')

  // Type-specific fields
  const [systemHeading, setSystemHeading] = useState('')
  const [paragraphDescription, setParagraphDescription] = useState('')
  const [bundleFragment, setBundleFragment] = useState('')
  const [standaloneDescription, setStandaloneDescription] = useState('')
  const [fragmentSortOrder, setFragmentSortOrder] = useState('')
  const [parentItemId, setParentItemId] = useState('')

  // Flag toggles
  const [canStandalone, setCanStandalone] = useState(true)
  const [canBundle, setCanBundle] = useState(false)
  const [hasRValue, setHasRValue] = useState(false)
  const [hasThickness, setHasThickness] = useState(false)
  const [hasMaterialType, setHasMaterialType] = useState(false)

  // Optional
  const [bundlingNotes, setBundlingNotes] = useState('')
  const [notes, setNotes] = useState('')
  const [bluebeamToolName, setBluebeamToolName] = useState('')

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  // Reference data
  const [existingItems, setExistingItems] = useState([])
  const [systemItems, setSystemItems] = useState([])
  const [existingTools, setExistingTools] = useState([])
  const [loadingRef, setLoadingRef] = useState(true)

  // Load reference data on open
  useEffect(() => {
    if (!isOpen) return
    async function loadRefData() {
      setLoadingRef(true)
      try {
        const [itemsRes, systemsRes, toolsRes] = await Promise.all([
          fetch('/api/ko/admin/add-item?field=all'),
          fetch('/api/ko/admin/add-item?field=systems'),
          fetch('/api/ko/admin/add-item?field=tools'),
        ])
        if (itemsRes.ok) {
          const data = await itemsRes.json()
          setExistingItems(data.items || [])
        }
        if (systemsRes.ok) {
          const data = await systemsRes.json()
          setSystemItems(data.systems || [])
        }
        if (toolsRes.ok) {
          const data = await toolsRes.json()
          setExistingTools(data.tools || [])
        }
      } catch (err) {
        console.error('Failed to load reference data:', err)
      } finally {
        setLoadingRef(false)
      }
    }
    loadRefData()
  }, [isOpen])

  // Auto-generate item_id when display_name changes
  useEffect(() => {
    if (displayName && !itemId.includes('-')) {
      setItemId(generateItemId(section, displayName))
    }
  }, [displayName])

  // Auto-set flags based on item type
  useEffect(() => {
    if (itemType === 'system') {
      setCanStandalone(true)
      setCanBundle(false) // Systems cannot bundle (rule)
    } else if (itemType === 'component') {
      setCanStandalone(false)
      setCanBundle(true)
    } else if (itemType === 'standalone') {
      setCanStandalone(true)
      setCanBundle(false)
    }
  }, [itemType])

  function resetForm() {
    setItemId('')
    setDisplayName('')
    setScopeName('')
    setSection('')
    setUom('SF')
    setDefaultUnitCost('')
    setDefaultRate('')
    setItemType('standalone')
    setSystemHeading('')
    setParagraphDescription('')
    setBundleFragment('')
    setStandaloneDescription('')
    setFragmentSortOrder('')
    setParentItemId('')
    setCanStandalone(true)
    setCanBundle(false)
    setHasRValue(false)
    setHasThickness(false)
    setHasMaterialType(false)
    setBundlingNotes('')
    setNotes('')
    setBluebeamToolName('')
    setError(null)
    setSuccess(null)
    setShowPreview(false)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  // Duplicate check
  const isDuplicate = existingItems.some(i => i.item_id === itemId)

  async function handleSubmit() {
    setError(null)
    setSubmitting(true)

    try {
      const payload = {
        item_id: itemId.trim(),
        display_name: displayName.trim(),
        scope_name: scopeName.trim(),
        section,
        uom,
        item_type: itemType,
        default_unit_cost: defaultUnitCost || null,
        default_rate: defaultRate || null,
        can_standalone: canStandalone,
        can_bundle: canBundle,
        has_r_value: hasRValue,
        has_thickness: hasThickness,
        has_material_type: hasMaterialType,
        system_heading: systemHeading || null,
        paragraph_description: paragraphDescription || null,
        bundle_fragment: bundleFragment || null,
        standalone_description: standaloneDescription || null,
        fragment_sort_order: fragmentSortOrder || null,
        parent_item_id: parentItemId || null,
        bundling_notes: bundlingNotes || null,
        notes: notes || null,
        bluebeam_tool_name: bluebeamToolName || null,
      }

      const res = await fetch('/api/ko/admin/add-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.details ? data.details.join(', ') : data.error)
      }

      setSuccess(data)
      onSuccess?.(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = itemId && displayName && scopeName && section && uom && !isDuplicate && !submitting && !success

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl w-full max-w-2xl mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card rounded-t-xl z-10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Plus size={20} />
            Add Item to Library
          </h2>
          <button onClick={handleClose} className="p-1 hover:bg-secondary rounded">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {loadingRef ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading reference data...</span>
            </div>
          ) : success ? (
            // Success state
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                <CheckCircle2 size={20} />
                <div>
                  <p className="font-medium">Item created successfully!</p>
                  <p className="text-sm">{success.item_id} — {success.display_name}</p>
                </div>
              </div>

              <div className="p-4 bg-secondary rounded-lg space-y-2">
                <p className="font-medium text-sm">Readiness Score: {success.readiness_score}/{success.readiness_max}</p>
                <div className="w-full bg-background rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${(success.readiness_score / success.readiness_max) * 100}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-secondary rounded-lg space-y-2">
                <p className="font-medium text-sm">Propagation Status</p>
                {Object.entries(success.propagation).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className={val === 'inserted' || val.includes('auto') ? 'text-green-400' : 'text-yellow-400'}>
                      {val}
                    </span>
                  </div>
                ))}
              </div>

              {success.manual_steps?.length > 0 && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg space-y-1">
                  <p className="font-medium text-sm text-yellow-400">Manual Steps Remaining</p>
                  <ul className="list-disc pl-5 text-sm text-yellow-300/80 space-y-1">
                    {success.manual_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            // Form
            <>
              {/* Section 1: Core Identity */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Item Identity</h3>

                {/* Section dropdown */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Section *</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select section...</option>
                    {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Display name + Item ID */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Display Name *</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g., Hot Asphalt Kettle"
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Item ID *</label>
                    <input
                      type="text"
                      value={itemId}
                      onChange={(e) => setItemId(e.target.value.toUpperCase())}
                      placeholder="MR-XXXX"
                      className={`w-full px-3 py-2 bg-secondary border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        isDuplicate ? 'border-red-500' : 'border-border'
                      }`}
                    />
                    {isDuplicate && (
                      <p className="text-xs text-red-400 mt-1">This item ID already exists</p>
                    )}
                  </div>
                </div>

                {/* Scope name */}
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Scope Name *</label>
                  <input
                    type="text"
                    value={scopeName}
                    onChange={(e) => setScopeName(e.target.value)}
                    placeholder="e.g., Hot Asphalt Kettle Setup and Operation"
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* UOM + Costs */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">UOM *</label>
                    <select
                      value={uom}
                      onChange={(e) => setUom(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {UOMS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Unit Cost ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={defaultUnitCost}
                      onChange={(e) => setDefaultUnitCost(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Default Rate ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={defaultRate}
                      onChange={(e) => setDefaultRate(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Item Type */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Item Type</h3>
                <div className="grid grid-cols-3 gap-3">
                  {ITEM_TYPES.map(t => {
                    const Icon = t.icon
                    const selected = itemType === t.value
                    return (
                      <button
                        key={t.value}
                        onClick={() => setItemType(t.value)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selected
                            ? 'border-primary bg-primary/10 ring-1 ring-primary'
                            : 'border-border bg-secondary hover:border-muted-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={16} className={selected ? 'text-primary' : 'text-muted-foreground'} />
                          <span className="font-medium text-sm">{t.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{t.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Section 3: Conditional fields based on type */}
              {itemType === 'system' && (
                <div className="space-y-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <h3 className="text-sm font-medium text-blue-400 flex items-center gap-2">
                    <Layers size={16} />
                    System Configuration
                  </h3>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">System Heading</label>
                    <input
                      type="text"
                      value={systemHeading}
                      onChange={(e) => setSystemHeading(e.target.value)}
                      placeholder="e.g., Furnish and Install 2-Ply Modified Bitumen Roofing System"
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">
                      Paragraph Description
                      <span className="text-xs ml-2 text-muted-foreground/60">
                        Placeholders: {'{R_VALUE}'}, {'{THICKNESS}'}, {'{TYPE}'}
                      </span>
                    </label>
                    <textarea
                      value={paragraphDescription}
                      onChange={(e) => setParagraphDescription(e.target.value)}
                      rows={4}
                      placeholder="Full proposal paragraph with placeholders..."
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    />
                  </div>
                </div>
              )}

              {itemType === 'component' && (
                <div className="space-y-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                  <h3 className="text-sm font-medium text-purple-400 flex items-center gap-2">
                    <Package size={16} />
                    Component Configuration
                  </h3>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Parent System</label>
                    <select
                      value={parentItemId}
                      onChange={(e) => setParentItemId(e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select parent system...</option>
                      {systemItems
                        .filter(s => !section || s.section === section)
                        .map(s => (
                          <option key={s.item_id} value={s.item_id}>
                            {s.display_name} ({s.item_id}) — {s.section}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Bundle Fragment</label>
                    <textarea
                      value={bundleFragment}
                      onChange={(e) => setBundleFragment(e.target.value)}
                      rows={3}
                      placeholder="Text fragment used when this item appears in a bundle..."
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Fragment Sort Order</label>
                    <input
                      type="number"
                      value={fragmentSortOrder}
                      onChange={(e) => setFragmentSortOrder(e.target.value)}
                      placeholder="e.g., 10"
                      className="w-full max-w-[120px] px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {itemType === 'standalone' && (
                <div className="space-y-4 p-4 bg-green-500/5 border border-green-500/20 rounded-lg">
                  <h3 className="text-sm font-medium text-green-400 flex items-center gap-2">
                    <Box size={16} />
                    Standalone Configuration
                  </h3>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Standalone Description</label>
                    <textarea
                      value={standaloneDescription}
                      onChange={(e) => setStandaloneDescription(e.target.value)}
                      rows={4}
                      placeholder="Full standalone proposal paragraph..."
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    />
                  </div>
                </div>
              )}

              {/* Section 4: Flags */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Properties & Flags</h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={canStandalone}
                      onChange={(e) => setCanStandalone(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-medium">Can Standalone</p>
                      <p className="text-xs text-muted-foreground">Can appear as its own line item</p>
                    </div>
                  </label>
                  <label className={`flex items-center gap-3 p-3 bg-secondary rounded-lg ${
                    itemType === 'system' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-accent'
                  }`}>
                    <input
                      type="checkbox"
                      checked={canBundle}
                      onChange={(e) => setCanBundle(e.target.checked)}
                      disabled={itemType === 'system'}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-medium">Can Bundle</p>
                      <p className="text-xs text-muted-foreground">
                        {itemType === 'system' ? 'Systems cannot bundle (rule)' : 'Can appear in system bundles'}
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={hasRValue}
                      onChange={(e) => setHasRValue(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-medium">Has R-Value</p>
                      <p className="text-xs text-muted-foreground">Requires R-value input on takeoff</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={hasThickness}
                      onChange={(e) => setHasThickness(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-medium">Has Thickness</p>
                      <p className="text-xs text-muted-foreground">Requires thickness input on takeoff</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent">
                    <input
                      type="checkbox"
                      checked={hasMaterialType}
                      onChange={(e) => setHasMaterialType(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="text-sm font-medium">Has Material Type</p>
                      <p className="text-xs text-muted-foreground">Requires material type selection</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Section 5: Bluebeam Tool */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bluebeam Tool</h3>
                <div>
                  <label className="text-sm text-muted-foreground mb-1 block">Tool Name</label>
                  <select
                    value={bluebeamToolName}
                    onChange={(e) => setBluebeamToolName(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">None (create later via Tool Manager)</option>
                    {existingTools.map(t => (
                      <option key={t.item_id} value={t.bluebeam_tool_name}>
                        {t.bluebeam_tool_name} ({t.item_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 6: Optional Notes */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Notes</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Bundling Notes</label>
                    <textarea
                      value={bundlingNotes}
                      onChange={(e) => setBundlingNotes(e.target.value)}
                      rows={2}
                      placeholder="Internal notes..."
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1 block">Template Notes</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Template-specific notes..."
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="p-4 bg-secondary rounded-lg space-y-2 border border-border">
                  <h3 className="text-sm font-medium">Library Row Preview</h3>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div><span className="text-muted-foreground">item_id:</span> {itemId}</div>
                    <div><span className="text-muted-foreground">section:</span> {section}</div>
                    <div><span className="text-muted-foreground">display_name:</span> {displayName}</div>
                    <div><span className="text-muted-foreground">uom:</span> {uom}</div>
                    <div><span className="text-muted-foreground">row_type:</span> {itemType === 'system' ? 'system' : itemType === 'component' ? 'COMPONENT_ROW' : 'STANDALONE_ROW'}</div>
                    <div><span className="text-muted-foreground">is_system:</span> {String(itemType === 'system')}</div>
                    <div><span className="text-muted-foreground">can_standalone:</span> {String(canStandalone)}</div>
                    <div><span className="text-muted-foreground">can_bundle:</span> {String(canBundle)}</div>
                    {parentItemId && <div><span className="text-muted-foreground">parent:</span> {parentItemId}</div>}
                    {bluebeamToolName && <div><span className="text-muted-foreground">tool:</span> {bluebeamToolName}</div>}
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                  <AlertCircle size={16} />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border sticky bottom-0 bg-card rounded-b-xl">
          <div>
            {!success && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Eye size={14} />
                {showPreview ? 'Hide Preview' : 'Preview'}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-accent transition-colors"
            >
              {success ? 'Close' : 'Cancel'}
            </button>
            {!success && (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add Item
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
