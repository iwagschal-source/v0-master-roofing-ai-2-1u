"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  Calculator,
  Plus,
  Trash2,
  Upload,
  FileSpreadsheet
} from "lucide-react"
import { cn } from "@/lib/utils"

// Location columns for each section
const ROOFING_COLUMNS = ["Cellar", "Ground", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "Main Roof", "Stair BH", "Elev BH"]
const BALCONY_COLUMNS = ["1st Bal", "2nd Bal", "3rd Bal", "4th Bal", "5th Bal", "6th Bal", "7th Bal"]
const EXTERIOR_COLUMNS = ["Front", "Rear", "Right", "Left", "Bulkhead", "Overhang", "Inside Par"]

// Master Roofing Official Takeoff Template - organized by section
const MR_TEMPLATE = {
  "Roofing": {
    columns: ROOFING_COLUMNS,
    items: [
      { id: "MR-001VB", name: "Vapor Barrier or Temp waterproofing", rate: 6.95, uom: "SF" },
      { id: "MR-002PITCH", name: "Upcharge for 1/4\" Pitch", rate: 1.5, uom: "SF" },
      { id: "MR-003BU2PLY", name: "Roofing - Built-up - 2 ply Scope", rate: 16.25, uom: "SF" },
      { id: "MR-006IRMA", name: "Roofing - IRMA", rate: 0, uom: "SF" },
      { id: "MR-004UO", name: "Up and Over", rate: 12.0, uom: "LF" },
      { id: "MR-005SCUPPER", name: "Scupper/Gutter and Leader", rate: 2500.0, uom: "EA" },
      { id: "MR-007PMMA", name: "PMMA@Building Wall", rate: 0, uom: "LF" },
      { id: "MR-008PMMA", name: "PMMA@Parapet Wall", rate: 0, uom: "LF" },
      { id: "MR-010DRAIN", name: "Drains", rate: 550.0, uom: "EA" },
      { id: "MR-011DOORSTD", name: "Doorpans - Standard", rate: 550.0, uom: "EA" },
      { id: "MR-012DOORLG", name: "Doorpans - Large", rate: 850.0, uom: "EA" },
      { id: "MR-013HATCHSF", name: "Roof Hatch/Skylights (Area)", rate: 0, uom: "SF" },
      { id: "MR-014HATCHLF", name: "Roof Hatch/Skylights (Perimeter)", rate: 48.0, uom: "LF" },
      { id: "MR-016FENCE", name: "Fence Posts", rate: 250.0, uom: "EA" },
      { id: "MR-017RAIL", name: "Railing Posts", rate: 250.0, uom: "EA" },
      { id: "MR-018PLUMB", name: "Plumbing Penetrations", rate: 250.0, uom: "EA" },
      { id: "MR-019MECH", name: "Mechanical Penetrations", rate: 250.0, uom: "EA" },
      { id: "MR-020DAVIT", name: "Davits", rate: 150.0, uom: "EA" },
      { id: "MR-021AC", name: "AC Units/Dunnage", rate: 550.0, uom: "EA" },
      { id: "MR-022COPELO", name: "Coping (Low Parapet)", rate: 32.0, uom: "LF" },
      { id: "MR-023COPEHI", name: "Coping (High Parapet)", rate: 32.0, uom: "LF" },
      { id: "MR-024INSUCOPE", name: "Insulation under Coping", rate: 4.0, uom: "LF" },
      { id: "MR-025FLASHBLDG", name: "Metal Flashing@Building Wall", rate: 24.0, uom: "LF" },
      { id: "MR-026FLASHPAR", name: "Metal Flashing@Parapet Wall", rate: 24.0, uom: "LF" },
      { id: "MR-027OBIRMA", name: "Overburden for IRMA Roof", rate: 14.0, uom: "SF" },
      { id: "MR-028PAVER", name: "Pavers", rate: 0, uom: "SF" },
      { id: "MR-029FLASHPAV", name: "Metal Edge@Paver Termination", rate: 24.0, uom: "LF" },
      { id: "MR-030GREEN", name: "Green Roof Scope", rate: 48.0, uom: "SF" },
      { id: "MR-031FLASHGRN", name: "Metal Edge@Green Roof", rate: 24.0, uom: "LF" },
      { id: "MR-032RECESSWP", name: "Recessed Floor - Waterproofing", rate: 32.0, uom: "LF" },
    ]
  },
  "Balconies": {
    columns: BALCONY_COLUMNS,
    items: [
      { id: "MR-033TRAFFIC", name: "Traffic Coating", rate: 17.0, uom: "SF" },
      { id: "MR-034DRIP", name: "Aluminum Drip Edge", rate: 22.0, uom: "LF" },
      { id: "MR-035LFLASH", name: "Liquid L Flashing", rate: 48.0, uom: "LF" },
      { id: "MR-036DOORBAL", name: "Doorpans - Balconies", rate: 550.0, uom: "EA" },
    ]
  },
  "Exterior/Facade": {
    columns: EXTERIOR_COLUMNS,
    items: [
      { id: "MR-037BRICKWP", name: "Brick Area - Waterproofing", rate: 5.25, uom: "SF" },
      { id: "MR-038OPNBRKEA", name: "Openings@Brick (Count)", rate: 250.0, uom: "EA" },
      { id: "MR-039OPNBRKLF", name: "Openings@Brick (LF)", rate: 10.0, uom: "LF" },
      { id: "MR-040PANELWP", name: "Panel Area - Waterproofing", rate: 5.25, uom: "SF" },
      { id: "MR-041OPNPNLEA", name: "Openings@Panel (Count)", rate: 250.0, uom: "EA" },
      { id: "MR-042OPNPNLLF", name: "Openings@Panel (LF)", rate: 10.0, uom: "LF" },
      { id: "MR-043EIFS", name: "EIFS - Scope", rate: 0, uom: "SF" },
      { id: "MR-044OPNSTCEA", name: "Openings@Stucco (Count)", rate: 250.0, uom: "EA" },
      { id: "MR-045OPNSTCLF", name: "Openings@Stucco (LF)", rate: 10.0, uom: "LF" },
      { id: "MR-046STUCCO", name: "Transitional Stucco", rate: 17.0, uom: "LF" },
      { id: "MR-047DRIPCAP", name: "Drip Cap", rate: 33.0, uom: "LF" },
      { id: "MR-048SILL", name: "Sills", rate: 33.0, uom: "LF" },
      { id: "MR-049TIEIN", name: "Tie-In", rate: 48.0, uom: "LF" },
      { id: "MR-050ADJHORZ", name: "Adj. Building Horizontal", rate: 65.0, uom: "LF" },
      { id: "MR-051ADJVERT", name: "Adj. Building Vertical", rate: 0, uom: "LF" },
    ]
  }
}

// Section colors
const SECTION_COLORS = {
  "Roofing": "bg-red-500/10 border-l-4 border-l-red-500",
  "Balconies": "bg-blue-500/10 border-l-4 border-l-blue-500",
  "Exterior/Facade": "bg-green-500/10 border-l-4 border-l-green-500",
}

export function EstimatingSheet({
  projectId,
  projectName,
  gcName,
  initialData = null,
  onSave,
  onClose,
  className
}) {
  // Initialize data structure: { itemId: { colIndex: value, rate: number } }
  const [data, setData] = useState(() => {
    if (initialData?.data) return initialData.data
    const init = {}
    Object.values(MR_TEMPLATE).forEach(section => {
      section.items.forEach(item => {
        init[item.id] = { rate: item.rate, values: {} }
      })
    })
    return init
  })

  const [collapsedSections, setCollapsedSections] = useState({})
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Calculate totals
  const totals = useMemo(() => {
    let grandTotal = 0
    const sectionTotals = {}

    Object.entries(MR_TEMPLATE).forEach(([sectionName, section]) => {
      let sectionTotal = 0
      section.items.forEach(item => {
        const itemData = data[item.id] || { rate: item.rate, values: {} }
        const rate = itemData.rate || 0
        const total = Object.values(itemData.values || {}).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
        sectionTotal += total * rate
      })
      sectionTotals[sectionName] = sectionTotal
      grandTotal += sectionTotal
    })

    return { grandTotal, sectionTotals }
  }, [data])

  // Update cell value
  const updateCell = useCallback((itemId, colIndex, value) => {
    setData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        values: {
          ...(prev[itemId]?.values || {}),
          [colIndex]: value
        }
      }
    }))
    setHasChanges(true)
  }, [])

  // Update rate
  const updateRate = useCallback((itemId, rate) => {
    setData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        rate: parseFloat(rate) || 0
      }
    }))
    setHasChanges(true)
  }, [])

  // Toggle section collapse
  const toggleSection = (section) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Save takeoff
  const handleSave = async () => {
    setSaving(true)
    try {
      const saveData = {
        projectId,
        projectName,
        gcName,
        data,
        totals,
        savedAt: new Date().toISOString()
      }

      if (onSave) {
        await onSave(saveData)
      } else {
        const res = await fetch('/api/ko/estimating/takeoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData)
        })
        if (!res.ok) throw new Error('Failed to save')
      }

      setHasChanges(false)
    } catch (err) {
      console.error('Save error:', err)
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Format currency
  const formatCurrency = (value) => {
    if (!value) return "$0"
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5 text-primary" />
          <div>
            <h2 className="font-semibold">Takeoff Sheet</h2>
            <p className="text-xs text-muted-foreground">
              {projectName || "New Takeoff"} {gcName && `• ${gcName}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Grand Total</div>
            <div className="text-lg font-bold text-primary">{formatCurrency(totals.grandTotal)}</div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          {onClose && (
            <button onClick={onClose} className="px-3 py-2 text-sm bg-secondary rounded-lg">
              Close
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto">
        {Object.entries(MR_TEMPLATE).map(([sectionName, section]) => (
          <div key={sectionName} className="border-b border-border">
            {/* Section Header */}
            <div
              onClick={() => toggleSection(sectionName)}
              className={cn(
                "sticky top-0 z-10 px-4 py-2 cursor-pointer flex items-center justify-between",
                SECTION_COLORS[sectionName]
              )}
            >
              <div className="flex items-center gap-2">
                {collapsedSections[sectionName] ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span className="font-semibold">{sectionName}</span>
                <span className="text-xs text-muted-foreground">({section.items.length} items)</span>
              </div>
              <span className="font-semibold">{formatCurrency(totals.sectionTotals[sectionName])}</span>
            </div>

            {/* Section Content */}
            {!collapsedSections[sectionName] && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left py-1.5 px-2 font-medium sticky left-0 bg-muted/50 min-w-[180px] border-r border-border">Line Item</th>
                      <th className="text-right py-1.5 px-1 font-medium w-16 border-r border-border">Rate</th>
                      <th className="text-center py-1.5 px-1 font-medium w-10 border-r border-border">UOM</th>
                      {section.columns.map((col, idx) => (
                        <th key={idx} className="text-center py-1.5 px-1 font-medium w-16 border-r border-border">{col}</th>
                      ))}
                      <th className="text-right py-1.5 px-1 font-medium w-16 border-r border-border">Total Qty</th>
                      <th className="text-right py-1.5 px-2 font-medium w-20">Total $</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.items.map((item, rowIdx) => {
                      const itemData = data[item.id] || { rate: item.rate, values: {} }
                      const totalQty = Object.values(itemData.values || {}).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
                      const totalCost = totalQty * (itemData.rate || 0)

                      return (
                        <tr key={item.id} className={cn("border-b border-border/50", rowIdx % 2 === 0 ? "bg-background" : "bg-muted/20")}>
                          <td className="py-1 px-2 sticky left-0 bg-inherit border-r border-border truncate" title={item.name}>
                            {item.name}
                          </td>
                          <td className="py-0.5 px-0.5 border-r border-border">
                            <input
                              type="number"
                              value={itemData.rate || ""}
                              onChange={(e) => updateRate(item.id, e.target.value)}
                              className="w-full text-right px-1 py-0.5 bg-transparent border border-transparent hover:border-input focus:border-primary rounded text-xs"
                            />
                          </td>
                          <td className="py-1 px-1 text-center text-muted-foreground border-r border-border">{item.uom}</td>
                          {section.columns.map((col, colIdx) => (
                            <td key={colIdx} className="py-0.5 px-0.5 border-r border-border">
                              <input
                                type="number"
                                value={itemData.values?.[colIdx] || ""}
                                onChange={(e) => updateCell(item.id, colIdx, e.target.value)}
                                placeholder=""
                                className="w-full text-right px-1 py-0.5 bg-muted/50 border border-input focus:border-primary rounded text-xs"
                              />
                            </td>
                          ))}
                          <td className="py-1 px-1 text-right font-medium border-r border-border">
                            {totalQty > 0 ? totalQty.toLocaleString() : ""}
                          </td>
                          <td className="py-1 px-2 text-right font-medium">
                            {totalCost > 0 ? formatCurrency(totalCost) : ""}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
