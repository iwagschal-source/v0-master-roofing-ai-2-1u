"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import {
  FileText,
  Mail,
  FileSpreadsheet,
  ImageIcon,
  Mic,
  Send,
  X,
  ArrowLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
} from "lucide-react"

/**
 * @typedef {"rfi"|"submittal"|"drawing"|"email"} DocumentType
 * @typedef {"approved"|"pending"|"rejected"} DocumentStatus
 * @typedef {{id: string, name: string, type: DocumentType, status?: DocumentStatus}} Document
 */

/** @type {Document[]} */
const mockDocuments = [
  { id: "1", name: "RFI-247 Membrane Spec", type: "rfi", status: "approved" },
  { id: "2", name: "RFI-248 Flashing Detail", type: "rfi", status: "pending" },
  { id: "3", name: "SUB-102 Insulation", type: "submittal", status: "approved" },
  { id: "4", name: "SUB-103 TPO Membrane", type: "submittal", status: "approved" },
  { id: "5", name: "DWG-A401 Roof Plan", type: "drawing" },
  { id: "6", name: "DWG-A402 Details", type: "drawing" },
  { id: "7", name: "RE: Schedule Update", type: "email" },
  { id: "8", name: "RE: Material Delivery", type: "email" },
]

// Analytics data matching the roofing trade dashboard
const projectFinancials = {
  fullProjectValue: 11735667,
  invoicedSage: 4307723,
  costToFinish: 3520700,
  outstandingAR: 1063223,
  remainingToInvoice: 7427944,
}

const projectProgress = {
  workComplete: 70,
  invoiced: 37,
  collected: 28,
  estCostToComplete: 3520700,
  totalRevenueRemaining: 8491167,
}

const scopeBreakdown = [
  { name: "Roofing Scope", takeoffValue: 5871667, percentOfProject: 50, costToFinish: 1761500, color: "#3b82f6" },
  { name: "Metal Panels", proposalValue: 5694000, percentOfProject: 49, costToFinish: 1708200, color: "#f97316" },
  { name: "ADJ Flashing", proposalValue: 170000, percentOfProject: 1, costToFinish: 51000, color: "#22c55e" },
]

const costByBuilding = [
  { building: "Bldg A", cost: 928170, color: "#3b82f6" },
  { building: "Bldg B", cost: 834658, color: "#22c55e" },
  { building: "Bldg C", cost: 908818, color: "#eab308" },
  { building: "Bldg D", cost: 1820158, color: "#ef4444" },
  { building: "Bldg E", cost: 1379863, color: "#06b6d4" },
]

const costBySystem = [
  { name: "Other", percent: 63, color: "#6b7280" },
  { name: "Membrane/Tor", percent: 11, color: "#3b82f6" },
  { name: "Flashing", percent: 9, color: "#f97316" },
  { name: "Insulation", percent: 8, color: "#eab308" },
  { name: "Penetrations", percent: 3, color: "#a855f7" },
  { name: "Coping & Edg", percent: 3, color: "#22c55e" },
  { name: "Drainage", percent: 2, color: "#ef4444" },
  { name: "Parapet/Wall", percent: 2, color: "#06b6d4" },
]

const progressByScope = [
  { scope: "Roofing", total: 5871667, invoicedPercent: 9, remaining: 2425489 },
  { scope: "Panels", total: 5694000, invoicedPercent: 11, remaining: 5047842 },
  { scope: "Flashing", total: 170000, invoicedPercent: 73, remaining: 45386 },
]

const cashFlowByQuarter = [
  { quarter: "Q2'25", invoiced: 1200000, collected: 900000 },
  { quarter: "Q3'25", invoiced: 1800000, collected: 1400000 },
  { quarter: "Q4'25", invoiced: 1307723, collected: 1100000 },
]

/**
 * Project folder detail/expanded view component
 * @param {{projectId: string, projectName: string, onClose: () => void}} props
 */
export function ProjectFolderDetail({ projectId, projectName, onClose }) {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === "light"

  const [selectedDoc, setSelectedDoc] = useState(mockDocuments[4])
  const [isListening, setIsListening] = useState(false)
  const [chatInput, setChatInput] = useState("")
  const [activeTab, setActiveTab] = useState("docs")

  // Draggable panel state (horizontal - width)
  const [panelWidth, setPanelWidth] = useState(360)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)

  // Draggable split state (vertical - height)
  const [previewHeight, setPreviewHeight] = useState(200)
  const [isSplitDragging, setIsSplitDragging] = useState(false)
  const agentPanelRef = useRef(null)

  // Mock agent preview content
  const [agentPreviewType] = useState("image")

  // Plan sheet preview state
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false)
  const [previewZoom, setPreviewZoom] = useState(100)
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleSplitMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsSplitDragging(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newWidth = containerRect.right - e.clientX
      setPanelWidth(Math.max(280, Math.min(600, newWidth)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging])

  // Vertical split drag effect
  useEffect(() => {
    const handleSplitMouseMove = (e) => {
      if (!isSplitDragging || !agentPanelRef.current) return
      const panelRect = agentPanelRef.current.getBoundingClientRect()
      const newHeight = e.clientY - panelRect.top
      setPreviewHeight(Math.max(100, Math.min(400, newHeight)))
    }

    const handleSplitMouseUp = () => {
      setIsSplitDragging(false)
    }

    if (isSplitDragging) {
      document.addEventListener("mousemove", handleSplitMouseMove)
      document.addEventListener("mouseup", handleSplitMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleSplitMouseMove)
      document.removeEventListener("mouseup", handleSplitMouseUp)
    }
  }, [isSplitDragging])

  const getDocIcon = (type) => {
    switch (type) {
      case "rfi":
        return <FileText className="w-3.5 h-3.5" />
      case "submittal":
        return <FileSpreadsheet className="w-3.5 h-3.5" />
      case "drawing":
        return <ImageIcon className="w-3.5 h-3.5" />
      case "email":
        return <Mail className="w-3.5 h-3.5" />
      default:
        return <FileText className="w-3.5 h-3.5" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "text-green-400"
      case "pending":
        return "text-yellow-400"
      case "rejected":
        return "text-red-400"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 backdrop-blur-sm animate-in fade-in duration-300",
        isLight ? "bg-white" : "bg-background/95",
        isDragging && "cursor-ew-resize select-none",
        isSplitDragging && "cursor-ns-resize select-none"
      )}
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className={cn(
          "flex items-center justify-between px-6 py-4 border-b",
          isLight ? "border-border bg-white" : "border-border/50"
        )}>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground"
              title="Back to Projects"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-mono text-sm font-medium tracking-wide uppercase text-primary">
                {projectName}
              </h1>
              <p className="text-xs text-muted-foreground">Documents</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("docs")}
              className={cn(
                "px-3 py-1.5 text-xs font-mono uppercase tracking-wide rounded transition-colors",
                activeTab === "docs"
                  ? isLight ? "bg-secondary text-foreground" : "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Documents
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "px-3 py-1.5 text-xs font-mono uppercase tracking-wide rounded transition-colors",
                activeTab === "analytics"
                  ? isLight ? "bg-secondary text-foreground" : "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Analytics
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div ref={containerRef} className="flex-1 flex overflow-hidden">
          {activeTab === "docs" ? (
            <div className="flex flex-1">
              {/* Document Spine */}
              <aside className={cn(
                "w-64 border-r overflow-y-auto",
                isLight ? "bg-surface-glass border-border" : "border-border/50"
              )}>
                <div className="p-4">
                  <h2 className="text-xs font-mono uppercase tracking-wider mb-3 text-muted-foreground">
                    Project Documents
                  </h2>
                  <div className="space-y-1">
                    {mockDocuments.map((doc) => (
                      <button
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded text-left transition-colors",
                          selectedDoc?.id === doc.id
                            ? isLight ? "bg-card text-foreground shadow-sm" : "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        )}
                      >
                        <span className={getStatusColor(doc.status)}>{getDocIcon(doc.type)}</span>
                        <span className="text-xs truncate flex-1">{doc.name}</span>
                        {selectedDoc?.id === doc.id && (
                          <ChevronRight className="w-3 h-3 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Document Viewer */}
              <main className={cn(
                "flex-1 overflow-y-auto",
                isLight ? "bg-surface-glass" : "bg-background"
              )}>
                {selectedDoc ? (
                  <div className="h-full flex flex-col">
                    <div className={cn("px-6 py-4 border-b", isLight ? "border-border" : "border-border/30")}>
                      <div className="flex items-center gap-2">
                        <span className={getStatusColor(selectedDoc.status)}>
                          {getDocIcon(selectedDoc.type)}
                        </span>
                        <h3 className="font-mono text-sm">{selectedDoc.name}</h3>
                        {selectedDoc.status && (
                          <span
                            className={cn(
                              "ml-auto px-2 py-0.5 text-[10px] font-mono uppercase rounded",
                              selectedDoc.status === "approved" && "bg-green-500/10 text-green-400",
                              selectedDoc.status === "pending" && "bg-yellow-500/10 text-yellow-400",
                              selectedDoc.status === "rejected" && "bg-red-500/10 text-red-400"
                            )}
                          >
                            {selectedDoc.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Document Preview Area */}
                    <div
                      className={cn(
                        "flex-1 flex flex-col overflow-hidden relative",
                        isPreviewExpanded && (isLight ? "fixed inset-0 z-50 bg-white" : "fixed inset-0 z-50 bg-card")
                      )}
                    >
                      {/* Preview Toolbar */}
                      <div className={cn(
                        "shrink-0 flex items-center justify-between px-4 py-2 border-b",
                        isLight ? "bg-secondary border-border" : "bg-surface-elevated border-border"
                      )}>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {selectedDoc.type === "drawing" && "PLAN SHEET"}
                            {selectedDoc.type === "rfi" && "PDF DOCUMENT"}
                            {selectedDoc.type === "submittal" && "SPREADSHEET"}
                            {selectedDoc.type === "email" && "EMAIL"}
                          </span>
                          <span className="text-[11px] text-border">|</span>
                          <span className="text-[11px] text-foreground">{selectedDoc.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground/50">
                            {selectedDoc.type === "drawing" && ".dwg"}
                            {selectedDoc.type === "rfi" && ".pdf"}
                            {selectedDoc.type === "submittal" && ".xlsx"}
                            {selectedDoc.type === "email" && ".eml"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewZoom(Math.max(25, previewZoom - 25))}
                            className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
                            title="Zoom out"
                          >
                            <ZoomOut className="w-4 h-4" />
                          </button>
                          <span className="text-[11px] font-mono w-12 text-center text-muted-foreground">{previewZoom}%</span>
                          <button
                            onClick={() => setPreviewZoom(Math.min(400, previewZoom + 25))}
                            className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
                            title="Zoom in"
                          >
                            <ZoomIn className="w-4 h-4" />
                          </button>
                          <div className="w-px h-4 mx-2 bg-border" />
                          <button
                            onClick={() => {
                              setPreviewZoom(100)
                              setPreviewPosition({ x: 0, y: 0 })
                            }}
                            className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
                            title="Reset view"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                            className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
                            title={isPreviewExpanded ? "Exit fullscreen" : "Fullscreen"}
                          >
                            {isPreviewExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Preview Canvas */}
                      <div
                        className={cn(
                          "flex-1 overflow-hidden cursor-grab active:cursor-grabbing",
                          isLight ? "bg-card" : "bg-card"
                        )}
                        onMouseDown={(e) => {
                          setIsPanning(true)
                          setPanStart({ x: e.clientX - previewPosition.x, y: e.clientY - previewPosition.y })
                        }}
                        onMouseMove={(e) => {
                          if (isPanning) {
                            setPreviewPosition({
                              x: e.clientX - panStart.x,
                              y: e.clientY - panStart.y,
                            })
                          }
                        }}
                        onMouseUp={() => setIsPanning(false)}
                        onMouseLeave={() => setIsPanning(false)}
                        onWheel={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            e.preventDefault()
                            const delta = e.deltaY > 0 ? -10 : 10
                            setPreviewZoom(Math.max(25, Math.min(400, previewZoom + delta)))
                          }
                        }}
                      >
                        <div
                          className="w-full h-full flex items-center justify-center p-8"
                          style={{
                            transform: `translate(${previewPosition.x}px, ${previewPosition.y}px)`,
                          }}
                        >
                          {/* Document Preview Content */}
                          <div
                            className="rounded-lg shadow-2xl transition-transform duration-100 overflow-hidden border bg-card border-border"
                            style={{
                              width: selectedDoc.type === "drawing"
                                ? `${Math.max(400, Math.min(1200, 800 * (previewZoom / 100)))}px`
                                : `${Math.max(300, Math.min(800, 500 * (previewZoom / 100)))}px`,
                              height: selectedDoc.type === "drawing"
                                ? `${Math.max(300, Math.min(900, 600 * (previewZoom / 100)))}px`
                                : `${Math.max(400, Math.min(1000, 650 * (previewZoom / 100)))}px`,
                            }}
                          >
                            {/* Drawing Preview */}
                            {selectedDoc.type === "drawing" && (
                              <div className="w-full h-full flex flex-col">
                                <div className="shrink-0 h-12 border-b px-4 flex items-center justify-between bg-secondary border-border">
                                  <span className="text-[10px] font-mono text-muted-foreground">ROOF PLAN - BLDG D</span>
                                  <span className="text-[10px] font-mono text-muted-foreground/50">SCALE: 1/8" = 1'-0"</span>
                                </div>
                                <div className="flex-1 flex items-center justify-center p-8 bg-surface-glass">
                                  <div className="text-center">
                                    <ImageIcon className="w-16 h-16 mx-auto mb-3 text-border" />
                                    <p className="text-xs font-mono text-muted-foreground">{selectedDoc.name}</p>
                                    <p className="text-[10px] mt-1 text-muted-foreground/50">Drawing content renders here</p>
                                  </div>
                                </div>
                                <div className="shrink-0 h-8 border-t px-4 flex items-center justify-between bg-secondary border-border">
                                  <span className="text-[9px] font-mono text-muted-foreground/50">REV 03</span>
                                  <span className="text-[9px] font-mono text-muted-foreground/50">SHEET A401</span>
                                </div>
                              </div>
                            )}

                            {/* RFI/PDF Preview */}
                            {selectedDoc.type === "rfi" && (
                              <div className="w-full h-full flex flex-col bg-gray-50">
                                <div className="shrink-0 px-6 py-4 border-b border-gray-200">
                                  <p className="text-sm font-semibold text-gray-900">Request for Information</p>
                                  <p className="text-[10px] text-gray-500 mt-0.5">{selectedDoc.name}</p>
                                </div>
                                <div className="flex-1 p-6 overflow-auto">
                                  <div className="space-y-3">
                                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                                    <div className="h-3 bg-gray-200 rounded w-full" />
                                    <div className="h-3 bg-gray-200 rounded w-5/6" />
                                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                                    <div className="h-6" />
                                    <div className="h-3 bg-gray-200 rounded w-full" />
                                    <div className="h-3 bg-gray-200 rounded w-4/5" />
                                  </div>
                                </div>
                                <div className="shrink-0 px-6 py-2 border-t border-gray-200 flex items-center justify-between">
                                  <span className="text-[9px] text-gray-400">Page 1 of 2</span>
                                  <span className="text-[9px] text-gray-400">PDF Document</span>
                                </div>
                              </div>
                            )}

                            {/* Submittal/Spreadsheet Preview */}
                            {selectedDoc.type === "submittal" && (
                              <div className="w-full h-full flex flex-col bg-gray-50">
                                <div className="shrink-0 h-8 bg-green-700 flex items-center px-3">
                                  <FileSpreadsheet className="w-4 h-4 text-white mr-2" />
                                  <span className="text-[11px] text-white font-medium">{selectedDoc.name}</span>
                                </div>
                                <div className="flex-1 overflow-auto">
                                  <div className="min-w-full">
                                    <div className="flex border-b border-gray-300 bg-gray-100">
                                      <div className="w-10 shrink-0 h-6 border-r border-gray-300" />
                                      {["A", "B", "C", "D", "E", "F"].map((col) => (
                                        <div key={col} className="w-20 shrink-0 h-6 border-r border-gray-300 flex items-center justify-center">
                                          <span className="text-[10px] text-gray-600 font-medium">{col}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                                      <div key={row} className="flex border-b border-gray-200">
                                        <div className="w-10 shrink-0 h-6 border-r border-gray-300 bg-gray-100 flex items-center justify-center">
                                          <span className="text-[10px] text-gray-600">{row}</span>
                                        </div>
                                        {[1, 2, 3, 4, 5, 6].map((col) => (
                                          <div key={col} className="w-20 shrink-0 h-6 border-r border-gray-200 px-1 flex items-center">
                                            {row === 1 && <div className="h-2.5 bg-gray-300 rounded w-full" />}
                                            {row > 1 && col < 4 && <div className="h-2 bg-gray-200 rounded w-3/4" />}
                                          </div>
                                        ))}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div className="shrink-0 h-6 border-t border-gray-300 bg-gray-100 px-3 flex items-center">
                                  <span className="text-[9px] text-gray-600">Sheet1</span>
                                </div>
                              </div>
                            )}

                            {/* Email Preview */}
                            {selectedDoc.type === "email" && (
                              <div className="w-full h-full flex flex-col bg-white">
                                <div className="shrink-0 px-4 py-3 border-b border-gray-200 space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 w-12">From:</span>
                                    <span className="text-[11px] text-gray-900">john.smith@jaygroupinc.com</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 w-12">To:</span>
                                    <span className="text-[11px] text-gray-900">pm@masterroofing.com</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 w-12">Subject:</span>
                                    <span className="text-[11px] text-gray-900 font-medium">{selectedDoc.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 w-12">Date:</span>
                                    <span className="text-[11px] text-gray-400">Jan 14, 2026 at 2:34 PM</span>
                                  </div>
                                </div>
                                <div className="flex-1 p-4 overflow-auto">
                                  <div className="space-y-2">
                                    <div className="h-2.5 bg-gray-200 rounded w-1/4" />
                                    <div className="h-4" />
                                    <div className="h-2.5 bg-gray-200 rounded w-full" />
                                    <div className="h-2.5 bg-gray-200 rounded w-5/6" />
                                    <div className="h-2.5 bg-gray-200 rounded w-4/5" />
                                  </div>
                                </div>
                                <div className="shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
                                  <span className="text-[9px] text-gray-400">1 attachment</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Hint Text */}
                      {!isPreviewExpanded && (
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full border bg-card/90 border-border">
                          <p className="text-[10px] text-muted-foreground">
                            Ctrl+Scroll to zoom | Drag to pan | Click expand for fullscreen
                          </p>
                        </div>
                      )}

                      {/* Fullscreen Zoom Presets */}
                      {isPreviewExpanded && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg px-3 py-2 border bg-card border-border">
                          {[50, 100, 150, 200].map((zoom) => (
                            <button
                              key={zoom}
                              onClick={() => setPreviewZoom(zoom)}
                              className={cn(
                                "px-2 py-1 rounded text-[11px] font-mono transition-colors",
                                previewZoom === zoom
                                  ? "bg-primary/20 text-primary"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                              )}
                            >
                              {zoom}%
                            </button>
                          ))}
                          <div className="w-px h-4 bg-border mx-1" />
                          <button
                            onClick={() => setIsPreviewExpanded(false)}
                            className="px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            Exit
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-card">
                    <p className="text-muted-foreground text-sm">Select a document to view</p>
                  </div>
                )}
              </main>
            </div>
          ) : (
            /* Analytics View */
            <main className={cn(
              "flex-1 overflow-y-auto p-4",
              isLight ? "bg-white" : "bg-card"
            )}>
              <div className="max-w-7xl mx-auto space-y-4">
                {/* Header */}
                <div className="mb-2">
                  <h2 className="text-lg font-semibold text-foreground">{projectName} - Complete Project Projection</h2>
                  <p className="text-xs text-muted-foreground">GC: The Jay Group Inc | Project ID: e022ff095a4b7cd05650715127e9cc89 | 1/14/2026</p>
                </div>

                {/* Row 1: 5 KPI Cards */}
                <div className="grid grid-cols-5 gap-3">
                  <div className="rounded-lg p-3 text-center bg-blue-600">
                    <p className="text-[10px] text-white/80 uppercase tracking-wide">Full Project Value</p>
                    <p className="text-xl font-bold text-white">${projectFinancials.fullProjectValue.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-orange-600">
                    <p className="text-[10px] text-white/80 uppercase tracking-wide">Invoiced (Sage)</p>
                    <p className="text-xl font-bold text-white">${projectFinancials.invoicedSage.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-teal-600">
                    <p className="text-[10px] text-white/80 uppercase tracking-wide">Cost to Finish</p>
                    <p className="text-xl font-bold text-white">${projectFinancials.costToFinish.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-red-600">
                    <p className="text-[10px] text-white/80 uppercase tracking-wide">Outstanding A/R</p>
                    <p className="text-xl font-bold text-white">${projectFinancials.outstandingAR.toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg p-3 text-center bg-purple-600">
                    <p className="text-[10px] text-white/80 uppercase tracking-wide">Remaining to Invoice</p>
                    <p className="text-xl font-bold text-white">${projectFinancials.remainingToInvoice.toLocaleString()}</p>
                  </div>
                </div>

                {/* Row 2: Circular Gauges */}
                <div className="rounded-lg border p-4 bg-secondary border-border">
                  <div className="flex items-center justify-between">
                    {/* Work Complete Gauge */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-24 h-24">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-border" />
                          <circle
                            cx="48" cy="48" r="40"
                            stroke="#22c55e"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${projectProgress.workComplete * 2.51} 251`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold text-foreground">{projectProgress.workComplete}%</span>
                        </div>
                      </div>
                      <p className="text-xs mt-2 text-muted-foreground">Work Complete</p>
                    </div>

                    {/* Invoiced Gauge */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-24 h-24">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-border" />
                          <circle
                            cx="48" cy="48" r="40"
                            stroke="#eab308"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${projectProgress.invoiced * 2.51} 251`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold text-foreground">{projectProgress.invoiced}%</span>
                        </div>
                      </div>
                      <p className="text-xs mt-2 text-muted-foreground">Invoiced</p>
                    </div>

                    {/* Collected Gauge */}
                    <div className="flex flex-col items-center">
                      <div className="relative w-24 h-24">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-border" />
                          <circle
                            cx="48" cy="48" r="40"
                            stroke="#ef4444"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${projectProgress.collected * 2.51} 251`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold text-foreground">{projectProgress.collected}%</span>
                        </div>
                      </div>
                      <p className="text-xs mt-2 text-muted-foreground">Collected</p>
                    </div>

                    {/* Est. Cost to Complete */}
                    <div className="flex flex-col items-center px-6">
                      <p className="text-2xl font-bold text-foreground">${projectProgress.estCostToComplete.toLocaleString()}</p>
                      <p className="text-xs mt-1 text-muted-foreground">Est. Cost to Complete</p>
                    </div>

                    {/* Total Revenue Remaining */}
                    <div className="flex flex-col items-center px-6">
                      <p className="text-2xl font-bold text-green-500">${projectProgress.totalRevenueRemaining.toLocaleString()}</p>
                      <p className="text-xs mt-1 text-muted-foreground">Total Revenue Remaining</p>
                    </div>
                  </div>
                </div>

                {/* Row 3: Scope Cards */}
                <div className="grid grid-cols-3 gap-3">
                  {scopeBreakdown.map((scope, i) => (
                    <div key={i} className="rounded-lg border-l-4 border p-3 bg-secondary border-border" style={{ borderLeftColor: scope.color }}>
                      <h4 className="text-sm font-semibold mb-2" style={{ color: scope.color }}>{scope.name}</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{scope.takeoffValue ? "Takeoff Value:" : "Proposal Value:"}</span>
                          <span className="font-medium text-foreground">${(scope.takeoffValue || scope.proposalValue || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">% of Project:</span>
                          <span className="font-medium text-foreground">{scope.percentOfProject}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cost to Finish (30%):</span>
                          <span className="font-medium text-foreground">${scope.costToFinish.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Row 4: Cost by Building + Cost by System */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Cost by Building */}
                  <div className="rounded-lg border p-4 bg-secondary border-border">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Roofing Cost by Building</h4>
                    <div className="space-y-2">
                      {costByBuilding.map((item, i) => {
                        const maxCost = Math.max(...costByBuilding.map(b => b.cost))
                        const widthPercent = (item.cost / maxCost) * 100
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs w-12 text-muted-foreground">{item.building}</span>
                            <div className="flex-1 h-5 rounded overflow-hidden bg-border">
                              <div
                                className="h-full rounded"
                                style={{ width: `${widthPercent}%`, backgroundColor: item.color }}
                              />
                            </div>
                            <span className="text-xs font-medium w-20 text-right text-foreground">${item.cost.toLocaleString()}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Cost by System */}
                  <div className="rounded-lg border p-4 bg-secondary border-border">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Cost by System (Roofing Scope)</h4>
                    <div className="flex items-center gap-4">
                      <div className="relative w-32 h-32">
                        <svg viewBox="0 0 100 100" className="w-32 h-32 transform -rotate-90">
                          {(() => {
                            let cumulative = 0
                            return costBySystem.map((item, i) => {
                              const strokeDasharray = `${item.percent * 2.51} 251`
                              const strokeDashoffset = -cumulative * 2.51
                              cumulative += item.percent
                              return (
                                <circle
                                  key={i}
                                  cx="50" cy="50" r="40"
                                  stroke={item.color}
                                  strokeWidth="16"
                                  fill="none"
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                />
                              )
                            })
                          })()}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold text-foreground">$5,871,667</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {costBySystem.map((item, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[10px] text-muted-foreground">{item.name} {item.percent}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 5: Progress by Scope + Cash Flow */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Progress by Scope */}
                  <div className="rounded-lg border p-4 bg-secondary border-border">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Progress by Scope</h4>
                    <div className="space-y-3">
                      {progressByScope.map((item, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <span className="text-xs font-medium text-foreground">{item.scope}</span>
                              <span className="text-[10px] ml-2 text-muted-foreground">${item.total.toLocaleString()} total</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">${item.remaining.toLocaleString()} rem</span>
                          </div>
                          <div className="h-4 rounded overflow-hidden flex bg-border">
                            <div
                              className="h-full bg-blue-500 flex items-center justify-center"
                              style={{ width: `${item.invoicedPercent}%` }}
                            >
                              {item.invoicedPercent > 5 && (
                                <span className="text-[9px] text-white font-medium">{item.invoicedPercent}% Inv</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] mt-3 text-center text-muted-foreground">Invoiced vs Remaining by Scope</p>
                  </div>

                  {/* Cash Flow by Quarter */}
                  <div className="rounded-lg border p-4 bg-secondary border-border">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Cash Flow by Quarter</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded" />
                        <span className="text-[10px] text-muted-foreground">Invoiced</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded" />
                        <span className="text-[10px] text-muted-foreground">Collected</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-around h-32 gap-4">
                      {cashFlowByQuarter.map((item, i) => {
                        const maxValue = Math.max(...cashFlowByQuarter.flatMap(q => [q.invoiced, q.collected]))
                        const invoicedHeight = (item.invoiced / maxValue) * 100
                        const collectedHeight = (item.collected / maxValue) * 100
                        return (
                          <div key={i} className="flex flex-col items-center gap-1 flex-1">
                            <div className="flex items-end gap-1 h-24">
                              <div
                                className="w-6 bg-blue-500 rounded-t"
                                style={{ height: `${invoicedHeight}%` }}
                              />
                              <div
                                className="w-6 bg-green-500 rounded-t"
                                style={{ height: `${collectedHeight}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground">{item.quarter}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </main>
          )}

          {/* Agent Panel */}
          <aside
            ref={agentPanelRef}
            className={cn(
              "relative flex flex-col border-l",
              isLight ? "bg-surface-glass border-border" : "bg-folder-bg border-border",
              (isDragging || isSplitDragging) && "select-none"
            )}
            style={{ width: `${panelWidth}px`, minWidth: "280px", maxWidth: "600px" }}
          >
            {/* Width Drag Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={cn(
                "absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10 group",
                isDragging && "bg-primary/20"
              )}
            >
              <div
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 left-0 w-1 h-12 rounded-full transition-colors",
                  isDragging ? "bg-primary" : "bg-border group-hover:bg-primary/50"
                )}
              />
            </div>

            {/* Upper Section - Agent Preview */}
            <div
              className="shrink-0 flex flex-col overflow-hidden bg-surface-elevated"
              style={{ height: `${previewHeight}px`, minHeight: "100px", maxHeight: "400px" }}
            >
              <div className="shrink-0 px-3 py-2 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Agent View</span>
                </div>
                <button className="p-1 rounded transition-colors text-muted-foreground hover:text-foreground">
                  <Maximize2 className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center p-3 overflow-hidden">
                {agentPreviewType === "image" && (
                  <div className="w-full h-full rounded-lg flex items-center justify-center border bg-card border-border">
                    <div className="text-center">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 text-border" />
                      <p className="text-[10px] text-muted-foreground">Bldg D - Section Detail</p>
                      <p className="text-[9px] mt-0.5 text-muted-foreground/50">RFI-2847 attachment</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Split Drag Handle */}
            <div
              onMouseDown={handleSplitMouseDown}
              className={cn(
                "shrink-0 h-2 cursor-ns-resize group flex items-center justify-center border-y border-border",
                isSplitDragging && "bg-primary/10"
              )}
            >
              <div
                className={cn(
                  "w-12 h-0.5 rounded-full transition-colors",
                  isSplitDragging ? "bg-primary" : "bg-border group-hover:bg-primary/50"
                )}
              />
            </div>

            {/* Lower Section - Chat */}
            <div className={cn("flex-1 flex flex-col overflow-hidden", isLight ? "bg-card" : "")}>
              <div className="flex-1 overflow-y-auto flex flex-col justify-end px-4 py-3">
                {/* Faded Past Context */}
                <div className="space-y-3 opacity-40 mb-4 text-[11px]">
                  <p className="text-right pr-1 text-muted-foreground">What's the status on Bldg D roofing?</p>
                  <p className="pl-1 text-foreground/80">Bldg D membrane installation is 60% complete. Crew scheduled through Friday.</p>
                </div>

                {/* Previous Exchange */}
                <div className="space-y-2 opacity-60 mb-4 text-xs">
                  <p className="text-right pr-1 text-muted-foreground">Any issues with submittals?</p>
                  <p className="pl-1 text-foreground/80">All roofing submittals approved. Lead times locked at 4 weeks.</p>
                </div>

                {/* Current Exchange */}
                <div className="space-y-3 mb-4">
                  <p className="text-[13px] text-right pr-1 text-foreground">
                    Check weather impact on schedule
                  </p>

                  {/* Agent Activity Traces */}
                  <div className="space-y-1.5 pl-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                      <span className="font-mono">scanning weather forecasts...</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <span className="font-mono">cross-referencing schedule milestones</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <span className="font-mono">updating project health</span>
                    </div>
                  </div>

                  {/* Agent Response */}
                  <div className="pl-1 space-y-2">
                    <p className="text-[13px] leading-relaxed text-foreground">
                      Rain forecasted Tuesday through Wednesday. Membrane work should pause.
                    </p>
                    <p className="text-[13px] leading-relaxed text-foreground/80">
                      Recommend shifting Bldg D exterior to Thursday. Interior flashing can continue as planned. No overall schedule impact if adjusted by EOD today.
                    </p>
                  </div>
                </div>
              </div>

              {/* Input Area */}
              <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border/50">
                {isListening && (
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="w-0.5 bg-primary rounded animate-pulse"
                          style={{
                            height: `${6 + Math.random() * 6}px`,
                            animationDelay: `${i * 0.1}s`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-xs italic text-muted-foreground">listening...</span>
                  </div>
                )}

                <div className="relative">
                  <textarea
                    value={chatInput}
                    onChange={(e) => {
                      setChatInput(e.target.value)
                      e.target.style.height = "auto"
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                      }
                    }}
                    placeholder="Ask something..."
                    rows={1}
                    className={cn(
                      "w-full rounded-xl px-4 py-2.5 pr-20 text-[13px] focus:outline-none transition-colors resize-none overflow-hidden",
                      "bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                    )}
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button
                      onClick={() => setIsListening(!isListening)}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        isListening ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
