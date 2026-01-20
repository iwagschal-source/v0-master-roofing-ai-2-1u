"use client"

import { useState } from "react"
import { X, Plus, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Predefined variant options
const VARIANT_OPTIONS = {
  r_values: ['R-11', 'R-13', 'R-15', 'R-19', 'R-21', 'R-30', 'R-38', 'R-49', 'R-60'],
  sizes: ['1/4"', '3/8"', '1/2"', '5/8"', '3/4"', '1"', '1.5"', '2"', '3"', '3.5"', '4"', '6"', '8"', '10"', '12"'],
  material_types: ['Fiberglass', 'Mineral Wool', 'Spray Foam', 'Rigid Foam', 'Cellulose', 'Denim', 'TPO', 'EPDM', 'PVC', 'Mod Bit', 'BUR']
}

/**
 * VariantSelector Component
 *
 * Allows selection of R-value, Size, and Material Type variants for line items
 *
 * Props:
 * - item: The line item with has_r_value, has_thickness, has_material_type flags
 * - variants: Array of current variant selections
 * - onChange: Callback when variants change
 * - variantOptions: Optional custom variant options (defaults to VARIANT_OPTIONS)
 */
export function VariantSelector({
  item,
  variants = [],
  onChange,
  variantOptions = VARIANT_OPTIONS,
  className
}) {
  const [showDropdown, setShowDropdown] = useState(null) // 'r_value', 'size', 'type', or null

  const hasRValue = item?.has_r_value
  const hasThickness = item?.has_thickness
  const hasMaterialType = item?.has_material_type

  // Get currently selected values for each variant type
  const selectedRValues = variants.map(v => v.r_value).filter(Boolean)
  const selectedSizes = variants.map(v => v.size).filter(Boolean)
  const selectedTypes = [...new Set(variants.map(v => v.type).filter(Boolean))]

  // Add a new variant value
  const addVariant = (type, value) => {
    const newVariants = [...variants]

    if (type === 'r_value') {
      // For R-values, create a new variant entry for each unique R-value
      if (!selectedRValues.includes(value)) {
        newVariants.push({
          r_value: value,
          size: selectedSizes[0] || null,
          type: selectedTypes[0] || null
        })
      }
    } else if (type === 'size') {
      // For sizes, update all variants or add new ones
      if (!selectedSizes.includes(value)) {
        if (newVariants.length === 0) {
          newVariants.push({ r_value: null, size: value, type: null })
        } else {
          // Add new variant with this size
          newVariants.push({
            r_value: selectedRValues[0] || null,
            size: value,
            type: selectedTypes[0] || null
          })
        }
      }
    } else if (type === 'type') {
      // Material type usually applies to all variants
      for (let i = 0; i < newVariants.length; i++) {
        newVariants[i] = { ...newVariants[i], type: value }
      }
      if (newVariants.length === 0) {
        newVariants.push({ r_value: null, size: null, type: value })
      }
    }

    onChange(newVariants)
    setShowDropdown(null)
  }

  // Remove a variant value
  const removeVariant = (type, value) => {
    let newVariants = [...variants]

    if (type === 'r_value') {
      newVariants = newVariants.filter(v => v.r_value !== value)
    } else if (type === 'size') {
      newVariants = newVariants.filter(v => v.size !== value)
    } else if (type === 'type') {
      newVariants = newVariants.map(v => ({ ...v, type: null }))
    }

    onChange(newVariants)
  }

  // Render a variant row with chips and add button
  const renderVariantRow = (label, type, selectedValues, options) => (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{label}:</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {selectedValues.map(value => (
          <span
            key={value}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full"
          >
            {value}
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeVariant(type, value)
              }}
              className="hover:bg-primary/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowDropdown(showDropdown === type ? null : type)
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary hover:bg-secondary/80 text-muted-foreground text-xs rounded-full transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
            <ChevronDown className="w-3 h-3" />
          </button>
          {showDropdown === type && (
            <div className="absolute z-50 top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px] max-h-48 overflow-y-auto">
              {options.filter(opt => !selectedValues.includes(opt)).map(option => (
                <button
                  key={option}
                  onClick={(e) => {
                    e.stopPropagation()
                    addVariant(type, option)
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors"
                >
                  {option}
                </button>
              ))}
              {options.filter(opt => !selectedValues.includes(opt)).length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  All options selected
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  // Don't render if item has no variant flags
  if (!hasRValue && !hasThickness && !hasMaterialType) {
    return null
  }

  return (
    <div
      className={cn("pl-6 border-l-2 border-primary/20", className)}
      onClick={(e) => e.stopPropagation()}
    >
      {hasRValue && renderVariantRow('R-Value', 'r_value', selectedRValues, variantOptions.r_values)}
      {hasThickness && renderVariantRow('Size', 'size', selectedSizes, variantOptions.sizes)}
      {hasMaterialType && renderVariantRow('Type', 'type', selectedTypes, variantOptions.material_types)}
    </div>
  )
}

/**
 * Generate a unique key for a variant combination
 */
export function getVariantKey(scopeCode, variant) {
  const parts = [scopeCode]
  if (variant?.r_value) parts.push(variant.r_value)
  if (variant?.size) parts.push(variant.size)
  if (variant?.type) parts.push(variant.type)
  return parts.join('|')
}

/**
 * Generate a display name for a variant combination
 */
export function getVariantDisplayName(baseName, variant) {
  const parts = [baseName]
  if (variant?.r_value) parts.push(variant.r_value)
  if (variant?.size) parts.push(variant.size)
  if (variant?.type) parts.push(variant.type)
  return parts.join(' ')
}

export { VARIANT_OPTIONS }
