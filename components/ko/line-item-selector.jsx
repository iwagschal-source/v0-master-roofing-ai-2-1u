"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  ChevronDown,
  ChevronRight,
  Check,
  Square,
  CheckSquare,
  Loader2,
  Info,
  DollarSign
} from "lucide-react"
import { cn } from "@/lib/utils"
import { VariantSelector, VARIANT_OPTIONS } from "./variant-selector"

/**
 * LineItemSelector Component
 *
 * A searchable, section-organized selector for takeoff line items
 *
 * Props:
 * - items: Array of library items from /api/ko/takeoff/library
 * - sections: Object with items grouped by section
 * - selectedItems: Array of { scope_code, variants?: [] } objects
 * - onChange: Callback when selection changes
 * - gcName: Optional GC name (shows historical rates when available)
 * - loading: Loading state
 * - variantOptions: Optional custom variant options
 */
export function LineItemSelector({
  items = [],
  sections = {},
  selectedItems = [],
  onChange,
  gcName,
  loading = false,
  variantOptions = VARIANT_OPTIONS,
  className
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedSections, setExpandedSections] = useState(new Set(['Roofing']))
  const [expandedItems, setExpandedItems] = useState(new Set())

  // Create a lookup map for selected items
  const selectedMap = useMemo(() => {
    const map = {}
    for (const item of selectedItems) {
      map[item.scope_code] = item
    }
    return map
  }, [selectedItems])

  // Filter items by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections

    const query = searchQuery.toLowerCase()
    const filtered = {}

    for (const [section, sectionItems] of Object.entries(sections)) {
      const matchingItems = sectionItems.filter(item =>
        item.scope_name?.toLowerCase().includes(query) ||
        item.scope_code?.toLowerCase().includes(query) ||
        item.notes?.toLowerCase().includes(query)
      )
      if (matchingItems.length > 0) {
        filtered[section] = matchingItems
      }
    }

    return filtered
  }, [sections, searchQuery])

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // Toggle item expansion (for variant items)
  const toggleItemExpansion = (itemId) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  // Check if an item is selected
  const isSelected = (itemId) => !!selectedMap[itemId]

  // Check if item has variants
  const hasVariants = (item) =>
    item.has_r_value || item.has_thickness || item.has_material_type

  // Toggle item selection
  const toggleItem = (item) => {
    const newSelected = [...selectedItems]
    const idx = newSelected.findIndex(s => s.scope_code === item.scope_code)

    if (idx >= 0) {
      // Remove item
      newSelected.splice(idx, 1)
      // Collapse if expanded
      setExpandedItems(prev => {
        const next = new Set(prev)
        next.delete(item.scope_code)
        return next
      })
    } else {
      // Add item
      const newItem = { scope_code: item.scope_code }
      if (hasVariants(item)) {
        newItem.variants = []
        // Auto-expand variants
        setExpandedItems(prev => new Set([...prev, item.scope_code]))
      }
      newSelected.push(newItem)
    }

    onChange(newSelected)
  }

  // Update variants for an item
  const updateVariants = (itemId, variants) => {
    const newSelected = selectedItems.map(item => {
      if (item.scope_code === itemId) {
        return { ...item, variants }
      }
      return item
    })
    onChange(newSelected)
  }

  // Select all items in a section
  const selectAllInSection = (sectionItems) => {
    const newSelected = [...selectedItems]
    for (const item of sectionItems) {
      if (!isSelected(item.scope_code)) {
        const newItem = { scope_code: item.scope_code }
        if (hasVariants(item)) {
          newItem.variants = []
        }
        newSelected.push(newItem)
      }
    }
    onChange(newSelected)
  }

  // Deselect all items in a section
  const deselectAllInSection = (sectionItems) => {
    const itemIds = new Set(sectionItems.map(i => i.scope_code))
    const newSelected = selectedItems.filter(s => !itemIds.has(s.scope_code))
    onChange(newSelected)
  }

  // Count selected in section
  const countSelectedInSection = (sectionItems) => {
    return sectionItems.filter(item => isSelected(item.scope_code)).length
  }

  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === 0) return '-'
    return `$${value.toFixed(2)}`
  }

  // Render confidence indicator
  const renderConfidence = (confidence) => {
    if (!confidence) return null

    const colors = {
      HIGH: 'bg-green-500',
      MEDIUM: 'bg-yellow-500',
      LOW: 'bg-orange-500',
      VERY_LOW: 'bg-red-500'
    }

    return (
      <span
        className={cn("w-2 h-2 rounded-full", colors[confidence] || 'bg-gray-500')}
        title={`Confidence: ${confidence}`}
      />
    )
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-12", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading line items...</span>
      </div>
    )
  }

  const sectionEntries = Object.entries(filteredSections)

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search items..."
          className="w-full pl-10 pr-4 py-2.5 bg-muted border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Selection summary */}
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm text-muted-foreground">
          {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
        </span>
        {gcName && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="w-3 h-3" />
            Showing rates for {gcName}
          </span>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-2 overflow-y-auto max-h-[500px] pr-2">
        {sectionEntries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No items match your search</p>
          </div>
        ) : (
          sectionEntries.map(([section, sectionItems]) => {
            const isExpanded = expandedSections.has(section)
            const selectedCount = countSelectedInSection(sectionItems)
            const allSelected = selectedCount === sectionItems.length

            return (
              <div key={section} className="border border-border rounded-lg overflow-hidden">
                {/* Section header */}
                <button
                  onClick={() => toggleSection(section)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{section}</span>
                    <span className="text-xs text-muted-foreground">
                      ({selectedCount}/{sectionItems.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        allSelected
                          ? deselectAllInSection(sectionItems)
                          : selectAllInSection(sectionItems)
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                </button>

                {/* Section items */}
                {isExpanded && (
                  <div className="divide-y divide-border">
                    {sectionItems.map(item => {
                      const selected = isSelected(item.scope_code)
                      const itemExpanded = expandedItems.has(item.scope_code) && selected
                      const showVariants = hasVariants(item)

                      return (
                        <div key={item.scope_code} className="bg-background">
                          {/* Item row */}
                          <div
                            onClick={() => toggleItem(item)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors",
                              selected ? "bg-primary/5" : "hover:bg-muted/30"
                            )}
                          >
                            {/* Checkbox */}
                            <div className="flex-shrink-0">
                              {selected ? (
                                <CheckSquare className="w-5 h-5 text-primary" />
                              ) : (
                                <Square className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>

                            {/* Item info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {item.scope_name}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">
                                  ({item.scope_code})
                                </span>
                                {showVariants && (
                                  <span className="text-xs px-1.5 py-0.5 bg-blue-500/10 text-blue-500 rounded">
                                    Variants
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                                <span>{item.uom}</span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {formatCurrency(item.default_unit_cost)}
                                </span>
                                {item.gc_rate && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    {renderConfidence(item.confidence)}
                                    GC: {formatCurrency(item.gc_rate)}
                                    <span className="text-xs opacity-70">
                                      ({item.gc_project_count} projects)
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Expand button for variants */}
                            {showVariants && selected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleItemExpansion(item.scope_code)
                                }}
                                className="p-1 hover:bg-muted rounded"
                              >
                                {itemExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Variant selector */}
                          {itemExpanded && showVariants && (
                            <div className="px-4 py-3 bg-muted/20 border-t border-border">
                              <VariantSelector
                                item={item}
                                variants={selectedMap[item.scope_code]?.variants || []}
                                onChange={(variants) => updateVariants(item.scope_code, variants)}
                                variantOptions={variantOptions}
                              />
                              {(selectedMap[item.scope_code]?.variants || []).length === 0 && (
                                <p className="text-xs text-muted-foreground mt-2 ml-6">
                                  Add at least one variant to include this item in the takeoff
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default LineItemSelector
