"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X,
  Loader2,
  FileText,
  Edit3,
  Check,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  DollarSign,
  MapPin,
  Building2,
  Calendar,
  Save,
  Download,
  RefreshCw
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * TakeoffProposalPreview Component (Step 8.C.10)
 *
 * Shows a preview of what will appear on the proposal PDF based on takeoff data.
 * Reads from the takeoff sheet and uses Row Type column to structure the proposal.
 *
 * Displays:
 * - Project info header
 * - Sections (WORK DETAILS FOR...) with bundled items
 * - Standalone items
 * - Section totals and grand total
 * - Editable description fields
 *
 * Props:
 * - projectId: The project ID
 * - onClose: Callback when closing
 * - onGeneratePdf: Callback to generate PDF (wired in 8.D)
 */
export function TakeoffProposalPreview({ projectId, onClose, onGeneratePdf }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previewData, setPreviewData] = useState(null)

  // Editable descriptions state
  const [editedDescriptions, setEditedDescriptions] = useState({})
  const [editingKey, setEditingKey] = useState(null)

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState({})

  // Load preview data
  useEffect(() => {
    if (projectId) {
      loadPreviewData()
    }
  }, [projectId])

  const loadPreviewData = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/ko/proposal/${projectId}/preview`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load preview')
      }

      setPreviewData(data)

      // Initialize edited descriptions from loaded data
      const initialEdits = {}
      for (const section of data.sections || []) {
        for (const item of section.items || []) {
          if (item.description) {
            initialEdits[`section-${section.title}-item-${item.rowNumber}`] = item.description
          }
        }
      }
      for (const item of data.standaloneItems || []) {
        if (item.description) {
          initialEdits[`standalone-${item.rowNumber}`] = item.description
        }
      }
      setEditedDescriptions(initialEdits)

    } catch (err) {
      console.error('Load preview error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Toggle section collapse
  const toggleSection = (sectionTitle) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }))
  }

  // Update description
  const updateDescription = (key, value) => {
    setEditedDescriptions(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // Format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '$0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  // Format locations as readable string
  const formatLocations = (locations) => {
    if (!locations || Object.keys(locations).length === 0) return ''
    return Object.entries(locations)
      .map(([key, value]) => `${value}`)
      .join(', ')
  }

  // Calculate sections total
  const calculateSectionsTotal = () => {
    if (!previewData) return 0
    const sectionsSum = (previewData.sections || []).reduce((sum, s) => sum + (s.subtotal || 0), 0)
    const standalonesSum = (previewData.standaloneItems || []).reduce((sum, i) => sum + (i.totalCost || 0), 0)
    return sectionsSum + standalonesSum
  }

  // Handle generate PDF
  const handleGeneratePdf = () => {
    if (onGeneratePdf) {
      onGeneratePdf({
        ...previewData,
        editedDescriptions
      })
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading proposal preview...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">Failed to Load Preview</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadPreviewData}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { project, sections, standaloneItems, totals } = previewData || {}

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
            <h1 className="font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Proposal Preview
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and edit descriptions before generating PDF
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadPreviewData}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={!onGeneratePdf}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Generate PDF
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          {/* Project Header */}
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  {project?.name || 'Project Name'}
                </h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {project?.gcName || 'General Contractor'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {project?.date || new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Estimated Total</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totals?.grandTotal || calculateSectionsTotal())}
                </p>
              </div>
            </div>

            {project?.address && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground pt-4 border-t border-border">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{project.address}</span>
              </div>
            )}
          </div>

          {/* Sections */}
          {sections && sections.length > 0 && (
            <div className="space-y-4 mb-6">
              {sections.map((section, sectionIdx) => (
                <div
                  key={`section-${sectionIdx}`}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {collapsedSections[section.title] ? (
                        <ChevronRight className="w-5 h-5 text-yellow-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-yellow-600" />
                      )}
                      <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                        {section.title}
                      </h3>
                      <span className="text-sm text-yellow-600 dark:text-yellow-400">
                        ({section.items?.length || 0} items)
                      </span>
                    </div>
                    <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                      {formatCurrency(section.subtotal)}
                    </span>
                  </button>

                  {/* Section Items */}
                  {!collapsedSections[section.title] && section.items && section.items.length > 0 && (
                    <div className="divide-y divide-border">
                      {section.items.map((item, itemIdx) => {
                        const descKey = `section-${section.title}-item-${item.rowNumber}`
                        const isEditing = editingKey === descKey

                        return (
                          <div key={`item-${itemIdx}`} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-medium text-foreground">
                                    {item.name || item.itemId}
                                  </span>
                                  {item.rValue && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                      {item.rValue}
                                    </span>
                                  )}
                                  {item.thickness && (
                                    <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                                      {item.thickness}
                                    </span>
                                  )}
                                  {item.materialType && (
                                    <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                                      {item.materialType}
                                    </span>
                                  )}
                                </div>
                                {item.totalMeasurements > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.totalMeasurements.toLocaleString()} SF
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {formatCurrency(item.totalCost)}
                                </p>
                                {item.unitCost > 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    @ {formatCurrency(item.unitCost)}/unit
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Editable Description */}
                            <div className="mt-3">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs text-muted-foreground">
                                  Description (editable)
                                </label>
                                <button
                                  onClick={() => setEditingKey(isEditing ? null : descKey)}
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  {isEditing ? 'Done' : 'Edit'}
                                </button>
                              </div>
                              {isEditing ? (
                                <textarea
                                  value={editedDescriptions[descKey] || ''}
                                  onChange={(e) => updateDescription(descKey, e.target.value)}
                                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]"
                                  placeholder="Enter item description..."
                                />
                              ) : (
                                <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                                  {editedDescriptions[descKey] || item.description || 'No description'}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Standalone Items */}
          {standaloneItems && standaloneItems.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
              <div className="px-6 py-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  ADDITIONAL LINE ITEMS
                </h3>
              </div>

              <div className="divide-y divide-border">
                {standaloneItems.map((item, idx) => {
                  const descKey = `standalone-${item.rowNumber}`
                  const isEditing = editingKey === descKey

                  return (
                    <div key={`standalone-${idx}`} className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium text-foreground">
                              {item.name || item.itemId}
                            </span>
                            {item.rValue && (
                              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                {item.rValue}
                              </span>
                            )}
                            {item.thickness && (
                              <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                                {item.thickness}
                              </span>
                            )}
                          </div>
                          {item.totalMeasurements > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {item.totalMeasurements.toLocaleString()} SF
                            </p>
                          )}
                        </div>
                        <p className="font-semibold text-orange-600">
                          {formatCurrency(item.totalCost)}
                        </p>
                      </div>

                      {/* Editable Description */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-muted-foreground">
                            Description (editable)
                          </label>
                          <button
                            onClick={() => setEditingKey(isEditing ? null : descKey)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            {isEditing ? 'Done' : 'Edit'}
                          </button>
                        </div>
                        {isEditing ? (
                          <textarea
                            value={editedDescriptions[descKey] || ''}
                            onChange={(e) => updateDescription(descKey, e.target.value)}
                            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px]"
                            placeholder="Enter item description..."
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                            {editedDescriptions[descKey] || item.description || 'No description'}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Totals Section */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-green-50 dark:bg-green-900/20 border-b border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                TOTALS
              </h3>
            </div>

            <div className="p-4 space-y-3">
              {/* Section Totals */}
              {totals?.sectionTotals && totals.sectionTotals.length > 0 && (
                <div className="space-y-2 pb-3 border-b border-border">
                  {totals.sectionTotals.map((st, idx) => (
                    <div key={`st-${idx}`} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{st.name}</span>
                      <span className="font-medium">{formatCurrency(st.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Calculated Total */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Calculated Subtotal</span>
                <span className="font-medium">{formatCurrency(calculateSectionsTotal())}</span>
              </div>

              {/* Grand Total */}
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className="font-semibold text-lg">Grand Total</span>
                <span className="font-bold text-2xl text-green-600">
                  {formatCurrency(totals?.grandTotal || calculateSectionsTotal())}
                </span>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {(!sections || sections.length === 0) && (!standaloneItems || standaloneItems.length === 0) && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No Proposal Items Found
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                The takeoff sheet doesn't have any items with Row Type set.
                Add SUBTOTAL:*, STANDALONE, or other row types to your takeoff to see items here.
              </p>
            </div>
          )}

          {/* Help Note */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              About This Preview
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>Yellow sections</strong> (SUBTOTAL:*) bundle items into "Work Details" sections</li>
              <li>• <strong>Orange items</strong> (STANDALONE) appear as individual line items</li>
              <li>• Click <strong>Edit</strong> to customize descriptions before generating the PDF</li>
              <li>• Placeholders like {'{R_VALUE}'} are replaced with values from the takeoff</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TakeoffProposalPreview
