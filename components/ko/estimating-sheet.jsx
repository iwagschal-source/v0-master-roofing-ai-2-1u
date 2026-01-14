"use client"

import { useState, useMemo, useCallback } from "react"
import { Save, Loader2, FileSpreadsheet, X } from "lucide-react"
import { cn } from "@/lib/utils"

// Template structure matching KO Proposal Template exactly
// Groups with subtotals marked [Y] = yellow, section totals [O] = orange
const TEMPLATE = {
  roofing: {
    title: "ROOFING",
    columns: ["1st Floor", "2nd Floor", "3rd Floor", "4th Floor", "Main Roof", "Stair Bulkhead", "Elev. Bulkhead"],
    groups: [
      {
        items: [
          { id: "R1", name: "Vapor Barrier or Temp waterproofing", rate: 6.95 },
          { id: "R2", name: "Upcharge for 1/4\" Pitch", rate: 1.5 },
          { id: "R3", name: "Roofing - Builtup - 2 ply Scope (R?)", rate: 16.25 },
          { id: "R4", name: "up and over", rate: 12 },
          { id: "R5", name: "Scupper /gutter and leader", rate: 2500 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "R6", name: "Roofing - IRMA - (Scope - Liquid or 2ply)", rate: 0 },
          { id: "R7", name: "PMMA (Liquid) or 2ply Torch@Building Wall", rate: 0 },
          { id: "R8", name: "PMMA (Liquid) or 2ply Torch@Parapet Wall", rate: 0 },
          { id: "R9", name: "up and over - PMMA (Liquid)", rate: 0 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "R10", name: "Drains", rate: 550 },
        ],
        subtotal: false,
        yellowTotal: true
      },
      {
        items: [
          { id: "R11", name: "Doorpans - Standard 3-6'", rate: 550 },
          { id: "R12", name: "Doorpans - Large", rate: 850 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "R13", name: "Roof hatch / Skylights (Area)", rate: 0 },
          { id: "R14", name: "Roof hatch / Skylights (Perimeter)", rate: 48 },
          { id: "R15", name: "Concrete Mechanical Pads/Walkway pads (sf)", rate: 0 },
          { id: "R16", name: "Fence posts", rate: 250 },
          { id: "R17", name: "Railing Posts", rate: 250 },
          { id: "R18", name: "Plumbing Penetrations", rate: 250 },
          { id: "R19", name: "Mechanical Penetrations", rate: 250 },
          { id: "R20", name: "Davits (EA)", rate: 150 },
          { id: "R21", name: "AC Units -EA (dunnage?)", rate: 550 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "R22", name: "(Alum.) Coping (Low Parapet) Gravel stop/ Edge Flashing", rate: 32 },
          { id: "R23", name: "(Alum.) Coping (high Parapet)", rate: 32 },
          { id: "R24", name: "Insulation under Coping [R Value]", rate: 4 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "R25", name: "(Alum.) Metal Flashing at building wall", rate: 24 },
          { id: "R26", name: "(Alum.) Metal Flashing at Parapet wall", rate: 24 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "R27", name: "Overburden for Irma Roof (Drainage mat + Insulation + Filterfabric)", rate: 14 },
        ],
        subtotal: false,
        yellowTotal: true
      },
      {
        items: [
          { id: "R28", name: "Pavers (R ?)", rate: 0 },
          { id: "R29", name: "Metal Edge flashing at the paver Termination", rate: 24 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "R30", name: "Green Roof (Scope)", rate: 48 },
          { id: "R31", name: "Metal Edge flashing at the Green Roof", rate: 24 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "R32", name: "Recessed floor [Location] - Liquid Waterproofing", rate: 32 },
        ],
        subtotal: false,
        yellowTotal: true
      },
    ]
  },
  balconies: {
    title: "BALCONIES",
    columns: ["1st floor Bal", "2nd floor Bal", "3rd floor Bal", "4th floor Bal", "5th floor Bal", "6th floor Bal", "7th floor Bal"],
    groups: [
      {
        items: [
          { id: "B1", name: "Traffic Coating", rate: 17 },
          { id: "B2", name: "Aluminum Drip edge", rate: 22 },
          { id: "B3", name: "Liquid L Flashing (LF)", rate: 48 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "B4", name: "Doorpans - Balconies", rate: 550 },
        ],
        subtotal: false,
        yellowTotal: true
      },
    ]
  },
  exterior: {
    title: "EXTERIOR / FACADE",
    columns: ["Front Elev", "Rear Elev", "Right Elev", "Left Elev", "Bulkhead", "Overhang", "Inside Parapet"],
    groups: [
      {
        items: [
          { id: "E1", name: "Brick area - Waterproofing", rate: 5.25 },
          { id: "E2", name: "Openings at brick areas (Count) < 32lf", rate: 250 },
          { id: "E3", name: "Openings at brick areas (LF) > 32lf/40lf", rate: 10 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "E4", name: "Panel Area - Waterproofing", rate: 5.25 },
          { id: "E5", name: "Openings at panel Areas (Count) < 32lf", rate: 250 },
          { id: "E6", name: "Openings at panel Areas (LF) > 32lf/40lf", rate: 10 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "E7", name: "Eifs - Scope (R?)", rate: 0 },
          { id: "E8", name: "openings at stucco areas (Count) < 32lf", rate: 250 },
          { id: "E9", name: "openings at stucco areas (LF) > 32lf/40lf", rate: 10 },
          { id: "E10", name: "Transistional stucco", rate: 17 },
        ],
        subtotal: true
      },
      {
        items: [
          { id: "E11", name: "Drip cap (LF)", rate: 33 },
        ],
        subtotal: false,
        yellowTotal: true
      },
      {
        items: [
          { id: "E12", name: "Sills", rate: 33 },
        ],
        subtotal: false,
        yellowTotal: true
      },
      {
        items: [
          { id: "E13", name: "Tie - In (LF)", rate: 48 },
        ],
        subtotal: false,
        yellowTotal: true
      },
      {
        items: [
          { id: "E14", name: "adj. building horizontal (Custom Metal Flashing only)", rate: 65 },
        ],
        subtotal: false,
        yellowTotal: true
      },
      {
        items: [
          { id: "E15", name: "adj. building Vertical (Detail?)", rate: 0 },
        ],
        subtotal: false,
        yellowTotal: true
      },
    ]
  }
}

export function EstimatingSheet({ projectId, projectName, gcName, initialData, onSave, onClose }) {
  // Data: { itemId: { rate, values: { colIdx: qty } } }
  const [data, setData] = useState(() => {
    if (initialData?.data) return initialData.data
    const init = {}
    Object.values(TEMPLATE).forEach(section => {
      section.groups.forEach(group => {
        group.items.forEach(item => {
          init[item.id] = { rate: item.rate, values: {} }
        })
      })
    })
    return init
  })

  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Calculate all totals
  const totals = useMemo(() => {
    const result = { sections: {}, grand: 0 }

    Object.entries(TEMPLATE).forEach(([sectionKey, section]) => {
      let sectionTotal = 0
      section.groups.forEach(group => {
        group.items.forEach(item => {
          const itemData = data[item.id] || { rate: item.rate, values: {} }
          const qty = Object.values(itemData.values || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0)
          sectionTotal += qty * (itemData.rate || 0)
        })
      })
      result.sections[sectionKey] = sectionTotal
      result.grand += sectionTotal
    })

    return result
  }, [data])

  const updateCell = useCallback((itemId, colIdx, value) => {
    setData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        values: { ...(prev[itemId]?.values || {}), [colIdx]: value }
      }
    }))
    setHasChanges(true)
  }, [])

  const updateRate = useCallback((itemId, rate) => {
    setData(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], rate: parseFloat(rate) || 0 }
    }))
    setHasChanges(true)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const saveData = { projectId, projectName, gcName, data, totals, savedAt: new Date().toISOString() }
      if (onSave) {
        await onSave(saveData)
      } else {
        await fetch('/api/ko/estimating/takeoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(saveData)
        })
      }
      setHasChanges(false)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const fmt = (v) => v ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""

  return (
    <div className="flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5" />
          <div>
            <div className="font-bold">{projectName || "New Takeoff"}</div>
            {gcName && <div className="text-xs text-gray-600">{gcName}</div>}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-gray-500">Grand Total</div>
            <div className="text-xl font-bold text-orange-600">{fmt(totals.grand)}</div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto">
        {Object.entries(TEMPLATE).map(([sectionKey, section]) => (
          <div key={sectionKey} className="mb-4">
            {/* Section Header */}
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 p-1 w-20 text-left">Unit Cost</th>
                  <th className="border border-gray-400 p-1 text-left min-w-[200px]">Scope</th>
                  {section.columns.map((col, i) => (
                    <th key={i} className="border border-gray-400 p-1 w-16 text-center">{col}</th>
                  ))}
                  <th className="border border-gray-400 p-1 w-20 text-center">Total Meas.</th>
                  <th className="border border-gray-400 p-1 w-24 text-center">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {section.groups.map((group, gIdx) => {
                  // Calculate group subtotal
                  let groupTotal = 0
                  const groupRows = group.items.map(item => {
                    const itemData = data[item.id] || { rate: item.rate, values: {} }
                    const totalQty = Object.values(itemData.values || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0)
                    const totalCost = totalQty * (itemData.rate || 0)
                    groupTotal += totalCost
                    return { item, itemData, totalQty, totalCost }
                  })

                  return (
                    <React.Fragment key={gIdx}>
                      {groupRows.map(({ item, itemData, totalQty, totalCost }, rIdx) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-0">
                            <input
                              type="number"
                              value={itemData.rate || ""}
                              onChange={(e) => updateRate(item.id, e.target.value)}
                              className="w-full px-1 py-0.5 text-right bg-transparent"
                            />
                          </td>
                          <td className="border border-gray-300 px-1 py-0.5 truncate" title={item.name}>
                            {item.name}
                          </td>
                          {section.columns.map((_, colIdx) => (
                            <td key={colIdx} className="border border-gray-300 p-0">
                              <input
                                type="number"
                                value={itemData.values?.[colIdx] || ""}
                                onChange={(e) => updateCell(item.id, colIdx, e.target.value)}
                                className="w-full px-1 py-0.5 text-center bg-transparent"
                              />
                            </td>
                          ))}
                          <td className="border border-gray-300 px-1 py-0.5 text-center">
                            {totalQty > 0 ? totalQty : ""}
                          </td>
                          <td className={cn(
                            "border border-gray-300 px-1 py-0.5 text-right font-medium",
                            group.yellowTotal && rIdx === groupRows.length - 1 && "bg-yellow-200"
                          )}>
                            {fmt(totalCost)}
                          </td>
                        </tr>
                      ))}
                      {/* Subtotal row */}
                      {group.subtotal && (
                        <tr className="bg-yellow-200 font-medium">
                          <td className="border border-gray-300 p-1" colSpan={2 + section.columns.length}></td>
                          <td className="border border-gray-300 p-1 text-center"></td>
                          <td className="border border-gray-300 p-1 text-right">{fmt(groupTotal)}</td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                {/* Section Total */}
                <tr className="bg-orange-300 font-bold">
                  <td className="border border-gray-400 p-1" colSpan={2}>
                    TOTAL COST FOR ALL {section.title} WORKS
                  </td>
                  <td className="border border-gray-400 p-1" colSpan={section.columns.length}></td>
                  <td className="border border-gray-400 p-1 text-center"></td>
                  <td className="border border-gray-400 p-1 text-right">{fmt(totals.sections[sectionKey])}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}

        {/* Grand Total */}
        <table className="w-full border-collapse text-xs mb-8">
          <tbody>
            <tr className="bg-orange-400 font-bold text-lg">
              <td className="border-2 border-gray-500 p-2">
                TOTAL COST FOR ALL WORK LISTED IN THIS PROPOSAL
              </td>
              <td className="border-2 border-gray-500 p-2 text-right w-32">{fmt(totals.grand)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
