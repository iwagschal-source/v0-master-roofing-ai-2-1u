"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
  RefreshCw,
  GripVertical
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

/**
 * SortableSection — wraps a section card with drag handle for section-level reordering
 */
function SortableSection({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : 'auto'
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  )
}

/**
 * SortableItem — wraps an item row with drag handle for item-level reordering
 */
function SortableItem({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : 'auto'
  }

  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  )
}

/**
 * TakeoffProposalPreview Component
 *
 * Shows a preview of what will appear on the proposal DOCX based on takeoff data.
 * Supports drag-to-sort for sections and items within sections.
 * Passes custom sort order to the generate endpoint.
 *
 * Props:
 * - projectId: The project ID
 * - sheetName: Active version sheet name
 * - onClose: Callback when closing
 * - onGeneratePdf: Callback after document generation
 */
export function TakeoffProposalPreview({ projectId, sheetName, onClose, onGeneratePdf }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previewData, setPreviewData] = useState(null)

  // Ordered arrays — these track the user's custom sort order
  const [orderedSections, setOrderedSections] = useState([])
  const [orderedStandalones, setOrderedStandalones] = useState([])

  // Editable descriptions state
  const [editedDescriptions, setEditedDescriptions] = useState({})
  const [editingKey, setEditingKey] = useState(null)

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState({})

  // Generate state
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState(null)

  // DnD sensors with activation constraint to distinguish clicks from drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Stable IDs for sortable sections
  const sectionIds = useMemo(
    () => orderedSections.map(s => `section-${s.rowNumber}`),
    [orderedSections]
  )

  // Stable IDs for sortable standalone items
  const standaloneIds = useMemo(
    () => orderedStandalones.map(s => `standalone-${s.rowNumber}`),
    [orderedStandalones]
  )

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
      const previewUrl = `/api/ko/proposal/${projectId}/preview${sheetName ? `?sheet=${encodeURIComponent(sheetName)}` : ''}`
      const res = await fetch(previewUrl)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load preview')
      }

      setPreviewData(data)

      // Initialize ordered arrays from loaded data
      setOrderedSections(data.sections || [])
      setOrderedStandalones(data.standaloneItems || [])

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

  // --- Section-level drag end ---
  const handleSectionDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setOrderedSections((prev) => {
      const oldIndex = prev.findIndex(s => `section-${s.rowNumber}` === active.id)
      const newIndex = prev.findIndex(s => `section-${s.rowNumber}` === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  // --- Item-level drag end (within a section) ---
  const handleItemDragEnd = (sectionRowNumber) => (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setOrderedSections((prev) => {
      return prev.map(section => {
        if (section.rowNumber !== sectionRowNumber) return section
        const items = [...section.items]
        const oldIndex = items.findIndex(i => `item-${sectionRowNumber}-${i.rowNumber}` === active.id)
        const newIndex = items.findIndex(i => `item-${sectionRowNumber}-${i.rowNumber}` === over.id)
        if (oldIndex === -1 || newIndex === -1) return section
        return { ...section, items: arrayMove(items, oldIndex, newIndex) }
      })
    })
  }

  // --- Standalone item drag end ---
  const handleStandaloneDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setOrderedStandalones((prev) => {
      const oldIndex = prev.findIndex(s => `standalone-${s.rowNumber}` === active.id)
      const newIndex = prev.findIndex(s => `standalone-${s.rowNumber}` === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev
      return arrayMove(prev, oldIndex, newIndex)
    })
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

  // Calculate sections total
  const calculateSectionsTotal = () => {
    if (!previewData) return 0
    const sectionsSum = orderedSections.reduce((sum, s) => sum + (s.subtotal || 0), 0)
    const standalonesSum = orderedStandalones.reduce((sum, i) => sum + (i.totalCost || 0), 0)
    return sectionsSum + standalonesSum
  }

  // Build the sort order to pass to generate endpoint
  const buildSortOrder = () => {
    return {
      sections: orderedSections.map(s => ({
        rowNumber: s.rowNumber,
        itemOrder: s.items.map(i => i.rowNumber)
      })),
      standalones: orderedStandalones.map(s => s.rowNumber)
    }
  }

  // Handle generate document
  const handleGenerateDocument = async () => {
    setGenerating(true)
    setGenerateResult(null)

    try {
      const sortOrder = buildSortOrder()
      const res = await fetch(`/api/ko/proposal/${projectId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          editedDescriptions,
          sheet: sheetName || undefined,
          sortOrder
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Failed to generate document')
      }

      // Get the file as a blob and trigger download
      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition')
      const driveFileId = res.headers.get('X-Drive-File-Id')
      const driveFileUrl = res.headers.get('X-Drive-File-Url')

      // Extract filename from header or generate one
      let filename = 'Proposal.docx'
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = match[1]
      }

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setGenerateResult({
        success: true,
        message: 'Document generated and downloaded!',
        driveFileId,
        driveFileUrl
      })

      // Also call the callback if provided
      if (onGeneratePdf) {
        onGeneratePdf({
          ...previewData,
          editedDescriptions,
          sortOrder,
          driveFileId,
          driveFileUrl
        })
      }

    } catch (err) {
      console.error('Generate error:', err)
      setGenerateResult({
        success: false,
        message: err.message
      })
    } finally {
      setGenerating(false)
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

  const { project, totals } = previewData || {}

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
              Drag to reorder sections and items. Edit descriptions before generating.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {generateResult && (
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
              generateResult.success
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
            )}>
              {generateResult.success ? (
                <Check className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {generateResult.message}
              {generateResult.driveFileUrl && (
                <a
                  href={generateResult.driveFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline ml-1"
                >
                  View in Drive
                </a>
              )}
            </div>
          )}
          <button
            onClick={loadPreviewData}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", generating && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={handleGenerateDocument}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {generating ? 'Generating...' : 'Generate Document'}
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
                    {sheetName || project?.date || new Date().toLocaleDateString()}
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

          {/* Sortable Sections */}
          {orderedSections.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleSectionDragEnd}
            >
              <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
                <div className="space-y-4 mb-6">
                  {orderedSections.map((section) => {
                    const sectionId = `section-${section.rowNumber}`
                    const itemIds = section.items.map(i => `item-${section.rowNumber}-${i.rowNumber}`)

                    return (
                      <SortableSection key={sectionId} id={sectionId}>
                        {({ dragHandleProps }) => (
                          <div className="bg-card border border-border rounded-xl overflow-hidden">
                            {/* Section Header with drag handle */}
                            <div className="w-full flex items-center justify-between px-6 py-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                              <div className="flex items-center gap-2">
                                <div
                                  {...dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing p-1 -ml-2 rounded hover:bg-yellow-200/50 dark:hover:bg-yellow-800/50"
                                  title="Drag to reorder section"
                                >
                                  <GripVertical className="w-4 h-4 text-yellow-600/60" />
                                </div>
                                <button
                                  onClick={() => toggleSection(section.title)}
                                  className="flex items-center gap-2"
                                >
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
                                </button>
                                {section.bidType === 'ALT' && (
                                  <span className="text-xs px-2 py-0.5 bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded font-medium">
                                    ALT
                                  </span>
                                )}
                              </div>
                              <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                                {formatCurrency(section.subtotal)}
                              </span>
                            </div>

                            {/* Sortable Items within section */}
                            {!collapsedSections[section.title] && section.items && section.items.length > 0 && (
                              <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleItemDragEnd(section.rowNumber)}
                              >
                                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                                  <div className="divide-y divide-border">
                                    {section.items.map((item) => {
                                      const itemSortId = `item-${section.rowNumber}-${item.rowNumber}`
                                      const descKey = `section-${section.title}-item-${item.rowNumber}`
                                      const isEditing = editingKey === descKey

                                      return (
                                        <SortableItem key={itemSortId} id={itemSortId}>
                                          {({ dragHandleProps: itemDragProps }) => (
                                            <div className="p-4">
                                              <div className="flex items-start gap-2 mb-2">
                                                <div
                                                  {...itemDragProps}
                                                  className="cursor-grab active:cursor-grabbing p-1 mt-0.5 rounded hover:bg-muted"
                                                  title="Drag to reorder item"
                                                >
                                                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
                                                </div>
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
                                              <div className="mt-3 ml-7">
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
                                          )}
                                        </SortableItem>
                                      )
                                    })}
                                  </div>
                                </SortableContext>
                              </DndContext>
                            )}
                          </div>
                        )}
                      </SortableSection>
                    )
                  })}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Sortable Standalone Items */}
          {orderedStandalones.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden mb-6">
              <div className="px-6 py-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  ADDITIONAL LINE ITEMS
                </h3>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleStandaloneDragEnd}
              >
                <SortableContext items={standaloneIds} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-border">
                    {orderedStandalones.map((item) => {
                      const standaloneSortId = `standalone-${item.rowNumber}`
                      const descKey = `standalone-${item.rowNumber}`
                      const isEditing = editingKey === descKey

                      return (
                        <SortableItem key={standaloneSortId} id={standaloneSortId}>
                          {({ dragHandleProps: standaloneDragProps }) => (
                            <div className="p-4">
                              <div className="flex items-start gap-2 mb-2">
                                <div
                                  {...standaloneDragProps}
                                  className="cursor-grab active:cursor-grabbing p-1 mt-0.5 rounded hover:bg-muted"
                                  title="Drag to reorder item"
                                >
                                  <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
                                </div>
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
                              <div className="mt-3 ml-7">
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
                          )}
                        </SortableItem>
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
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
          {orderedSections.length === 0 && orderedStandalones.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No Proposal Items Found
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                The takeoff sheet doesn't have any items with measurements or cost.
                Import Bluebeam data or enter quantities in the takeoff sheet.
              </p>
            </div>
          )}

          {/* Help Note */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              About This Preview
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• <strong>Drag handles</strong> (left side) let you reorder sections and items</li>
              <li>• <strong>Yellow sections</strong> are bundled work items with a system description</li>
              <li>• <strong>Orange items</strong> are standalone line items</li>
              <li>• Click <strong>Edit</strong> to customize descriptions before generating</li>
              <li>• The generated DOCX will use your custom order and edited descriptions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TakeoffProposalPreview
