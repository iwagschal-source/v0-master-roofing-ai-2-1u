"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import {
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  FileText,
  Calculator,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Mic,
  Send,
  ImageIcon,
  FolderOpen,
  Trash2,
  Plus,
  FolderPlus,
} from "lucide-react"
import { FOLDER_ICON_COLORS, FOLDER_ICONS, FOLDER_ICONS_CLOSED } from "@/lib/brand-colors"

const FOLDER_KEYS = ['drawings', 'bluebeam', 'takeoff', 'markups', 'proposals']
const FOLDER_LABELS = { drawings: 'DRAWINGS', bluebeam: 'BLUEBEAM', takeoff: 'TAKEOFF', markups: 'MARKUPS', proposals: 'PROPOSALS' }

// Analytics data (unchanged from original)
const projectFinancials = {
  fullProjectValue: 11735667, invoicedSage: 4307723, costToFinish: 3520700,
  outstandingAR: 1063223, remainingToInvoice: 7427944,
}
const projectProgress = {
  workComplete: 70, invoiced: 37, collected: 28,
  estCostToComplete: 3520700, totalRevenueRemaining: 8491167,
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
 * Determine viewer type from file's mimeType and name
 */
function getViewerType(file) {
  const name = (file.name || '').toLowerCase()
  let mime = (file.mimeType || '').toLowerCase()
  // Resolve shortcut target MIME type
  if (mime.includes('shortcut') && file.shortcutDetails?.targetMimeType) {
    mime = file.shortcutDetails.targetMimeType.toLowerCase()
  }
  if (mime.includes('spreadsheet') || mime.includes('google-apps.spreadsheet')) return 'sheets'
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  if (mime.includes('word') || mime.includes('document') || name.endsWith('.docx') || name.endsWith('.doc')) return 'office'
  if (mime.includes('excel') || name.endsWith('.xlsx') || name.endsWith('.xls')) return 'office'
  if (mime.includes('image/') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image'
  if (mime.includes('csv') || name.endsWith('.csv')) return 'csv'
  if (mime.includes('zip') || name.endsWith('.zip') || name.endsWith('.btx')) return 'download'
  return 'download'
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  const num = Number(bytes)
  if (num < 1024) return `${num} B`
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`
  return `${(num / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Project folder detail/expanded view component
 * @param {{projectId: string, projectName: string, onClose: () => void, onNavigateToEstimating?: () => void}} props
 */
export function ProjectFolderDetail({ projectId, projectName, onClose, onNavigateToEstimating, initialFolder, initialFileName }) {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === "light"

  const [activeTab, setActiveTab] = useState("docs")
  const [folders, setFolders] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [settingUp, setSettingUp] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState({})
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [uploading, setUploading] = useState(null) // which folder is uploading
  const uploadRef = useRef(null)
  const [uploadTarget, setUploadTarget] = useState(null)

  // File delete state
  const [deleteConfirm, setDeleteConfirm] = useState(null) // { file, category }
  const [deleting, setDeleting] = useState(false)

  // Custom folders state
  const [customFolders, setCustomFolders] = useState([])
  const [showAddFolder, setShowAddFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState(null) // { id, name }
  const [deletingFolder, setDeletingFolder] = useState(false)

  // Document viewer state
  const [previewZoom, setPreviewZoom] = useState(100)
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false)


  // Agent panel state
  const [panelWidth, setPanelWidth] = useState(360)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  const [previewHeight, setPreviewHeight] = useState(200)
  const [isSplitDragging, setIsSplitDragging] = useState(false)
  const agentPanelRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const [chatInput, setChatInput] = useState("")

  // Fetch folder data
  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    setNeedsSetup(false)
    fetch(`/api/ko/project/${projectId}/folders`)
      .then(async r => {
        if (r.status === 404) {
          const data = await r.json()
          if (data.needsSetup) { setNeedsSetup(true); setLoading(false); return null }
        }
        if (!r.ok) throw new Error('Failed to load folders')
        return r.json()
      })
      .then(data => {
        if (!data) return
        setFolders(data.folders)
        setCustomFolders(data.customFolders || [])
        const expanded = {}
        for (const key of FOLDER_KEYS) {
          if (data.folders[key]?.files?.length > 0) expanded[key] = true
        }
        // Auto-expand custom folders with files
        for (const cf of (data.customFolders || [])) {
          if (cf.files?.length > 0) expanded[`custom_${cf.id}`] = true
        }
        // Auto-select folder and file if navigated with deep link
        if (initialFolder && FOLDER_KEYS.includes(initialFolder)) {
          expanded[initialFolder] = true
          setSelectedCategory(initialFolder)
          if (initialFileName && data.folders[initialFolder]?.files) {
            const matchFile = data.folders[initialFolder].files.find(f => f.name === initialFileName)
            if (matchFile) setSelectedFile(matchFile)
          }
        }
        setExpandedFolders(expanded)
        setLoading(false)
      })
      .catch(err => {
        console.error('[FolderDetail] Load error:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [projectId])

  // Panel drag effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      setPanelWidth(Math.max(280, Math.min(600, rect.right - e.clientX)))
    }
    const handleMouseUp = () => setIsDragging(false)
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }
    return () => { document.removeEventListener("mousemove", handleMouseMove); document.removeEventListener("mouseup", handleMouseUp) }
  }, [isDragging])

  useEffect(() => {
    const handleMove = (e) => {
      if (!isSplitDragging || !agentPanelRef.current) return
      const rect = agentPanelRef.current.getBoundingClientRect()
      setPreviewHeight(Math.max(100, Math.min(400, e.clientY - rect.top)))
    }
    const handleUp = () => setIsSplitDragging(false)
    if (isSplitDragging) {
      document.addEventListener("mousemove", handleMove)
      document.addEventListener("mouseup", handleUp)
    }
    return () => { document.removeEventListener("mousemove", handleMove); document.removeEventListener("mouseup", handleUp) }
  }, [isSplitDragging])

  const handleSetupFolders = async () => {
    setSettingUp(true)
    try {
      const res = await fetch(`/api/ko/project/${projectId}/folders`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to create folders')
      setNeedsSetup(false)
      setLoading(true)
      // Re-fetch to get the new empty folder structure
      const foldersRes = await fetch(`/api/ko/project/${projectId}/folders`)
      if (foldersRes.ok) {
        const data = await foldersRes.json()
        setFolders(data.folders)
      }
    } catch (err) {
      console.error('[FolderDetail] Setup error:', err)
      setError('Failed to set up folders: ' + err.message)
    } finally {
      setSettingUp(false)
      setLoading(false)
    }
  }

  const toggleFolder = (key) => {
    setExpandedFolders(prev => ({ ...prev, [key]: !prev[key] }))
    // Clear selected file and update selected category when clicking a folder header
    setSelectedFile(null)
    setSelectedCategory(key)
    setPreviewZoom(100)
    setIsPreviewExpanded(false)
  }

  const handleFileClick = (file, category) => {
    setSelectedFile(file)
    setSelectedCategory(category)
    setPreviewZoom(100)
    setIsPreviewExpanded(false)
  }

  const handleUploadClick = (folderKey) => {
    setUploadTarget(folderKey)
    uploadRef.current?.click()
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget || !projectId) return
    setUploading(uploadTarget)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/ko/project/${projectId}/folders/${uploadTarget}/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const newFile = { id: data.file.id, name: data.file.name, webViewLink: data.file.webViewLink, mimeType: file.type, size: file.size, modifiedTime: new Date().toISOString() }
      // Add file to local state
      if (uploadTarget.startsWith('custom_')) {
        const folderId = uploadTarget.replace('custom_', '')
        setCustomFolders(prev => prev.map(cf =>
          cf.id === folderId ? { ...cf, files: [newFile, ...cf.files] } : cf
        ))
      } else {
        setFolders(prev => {
          if (!prev) return prev
          const updated = { ...prev }
          updated[uploadTarget] = { ...updated[uploadTarget], files: [newFile, ...(updated[uploadTarget]?.files || [])] }
          return updated
        })
      }
      // Auto-expand the folder
      setExpandedFolders(prev => ({ ...prev, [uploadTarget]: true }))
    } catch (err) {
      console.error('[FolderDetail] Upload error:', err)
    } finally {
      setUploading(null)
      setUploadTarget(null)
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }

  const handleDeleteFile = async () => {
    if (!deleteConfirm || !projectId) return
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/ko/project/${projectId}/folders/${deleteConfirm.category}/file/${deleteConfirm.file.id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Delete failed')
      // Remove from local state
      setFolders(prev => {
        if (!prev) return prev
        const updated = { ...prev }
        const cat = deleteConfirm.category
        updated[cat] = {
          ...updated[cat],
          files: (updated[cat]?.files || []).filter(f => f.id !== deleteConfirm.file.id)
        }
        return updated
      })
      // Clear selected file if it was the deleted one
      if (selectedFile?.id === deleteConfirm.file.id) {
        setSelectedFile(null)
      }
    } catch (err) {
      console.error('[FolderDetail] Delete error:', err)
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const handleCreateCustomFolder = async () => {
    if (!newFolderName.trim() || !projectId) return
    setCreatingFolder(true)
    try {
      const res = await fetch(`/api/ko/project/${projectId}/folders/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      })
      if (!res.ok) throw new Error('Failed to create folder')
      const data = await res.json()
      setCustomFolders(prev => [...prev, { id: data.folder.id, name: data.folder.name, files: [] }])
      setNewFolderName('')
      setShowAddFolder(false)
    } catch (err) {
      console.error('[FolderDetail] Create custom folder error:', err)
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDeleteCustomFolder = async () => {
    if (!deleteFolderConfirm || !projectId) return
    setDeletingFolder(true)
    try {
      const res = await fetch(
        `/api/ko/project/${projectId}/folders/custom/${deleteFolderConfirm.id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Failed to delete folder')
      setCustomFolders(prev => prev.filter(f => f.id !== deleteFolderConfirm.id))
      // Clear selection if viewing a file from deleted folder
      if (selectedCategory === `custom_${deleteFolderConfirm.id}`) {
        setSelectedFile(null)
        setSelectedCategory(null)
      }
    } catch (err) {
      console.error('[FolderDetail] Delete custom folder error:', err)
    } finally {
      setDeletingFolder(false)
      setDeleteFolderConfirm(null)
    }
  }

  const renderViewer = () => {
    if (!selectedFile) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            {selectedCategory ? (
              <>
                {FOLDER_ICONS[selectedCategory] ? (
                  <img src={FOLDER_ICONS[selectedCategory]} alt={selectedCategory} className="w-16 h-16 mx-auto mb-3" />
                ) : (
                  <FolderOpen className="w-12 h-12 mx-auto mb-3" style={{ color: FOLDER_ICON_COLORS[selectedCategory]?.primary || '#888' }} />
                )}
                <p className="text-sm font-medium text-foreground mb-1">{FOLDER_LABELS[selectedCategory] || customFolders.find(cf => `custom_${cf.id}` === selectedCategory)?.name?.toUpperCase() || ''}</p>
                <p className="text-xs text-muted-foreground mb-4">Select a file from this folder to view it here</p>
                <button
                  onClick={() => handleUploadClick(selectedCategory)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: FOLDER_ICON_COLORS[selectedCategory]?.primary || '#555' }}
                >
                  <Upload className="w-4 h-4" />
                  Upload to {FOLDER_LABELS[selectedCategory] || customFolders.find(cf => `custom_${cf.id}` === selectedCategory)?.name || 'Folder'}
                </button>
              </>
            ) : (
              <>
                <FileText className="w-12 h-12 mx-auto mb-3 text-border" />
                <p className="text-sm text-muted-foreground">Select a document from the sidebar to view it here</p>
              </>
            )}
          </div>
        </div>
      )
    }

    const viewerType = getViewerType(selectedFile)

    // Zoom wrapper for iframe-based viewers
    const zoomScale = previewZoom / 100
    const iframeZoomStyle = previewZoom !== 100 ? {
      transform: `scale(${zoomScale})`,
      transformOrigin: 'top left',
      width: `${100 / zoomScale}%`,
      height: `${100 / zoomScale}%`,
    } : {}

    if (viewerType === 'pdf') {
      return (
        <div className="w-full h-full overflow-auto">
          <iframe
            src={`https://drive.google.com/file/d/${selectedFile.id}/preview`}
            className="border-0"
            style={{ width: '100%', height: '100%', ...iframeZoomStyle }}
            title={selectedFile.name}
            allow="autoplay"
          />
        </div>
      )
    }

    if (viewerType === 'office') {
      // Use Google Docs viewer for Office files (xlsx, docx, etc.)
      const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${selectedFile.id}`
      return (
        <div className="w-full h-full overflow-auto">
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(driveDownloadUrl)}&embedded=true`}
            className="border-0"
            style={{ width: '100%', height: '100%', ...iframeZoomStyle }}
            title={selectedFile.name}
          />
        </div>
      )
    }

    if (viewerType === 'sheets') {
      // For shortcuts, resolve to the target file ID
      const targetId = selectedFile.shortcutDetails?.targetId || selectedFile.id
      // Use the edit URL with rm=minimal for a clean embedded view
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${targetId}/edit?usp=sharing&rm=minimal`
      return (
        <div className="w-full h-full overflow-auto">
          <iframe
            src={sheetUrl}
            className="border-0"
            style={{ width: '100%', height: '100%', ...iframeZoomStyle }}
            title={selectedFile.name}
          />
        </div>
      )
    }

    if (viewerType === 'image') {
      return (
        <div className="w-full h-full flex items-center justify-center p-4 overflow-auto">
          <img
            src={selectedFile.webContentLink || `https://drive.google.com/uc?export=view&id=${selectedFile.id}`}
            alt={selectedFile.name}
            className="max-w-full max-h-full object-contain"
            style={{ transform: `scale(${previewZoom / 100})`, transformOrigin: 'center' }}
          />
        </div>
      )
    }

    if (viewerType === 'csv') {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <FileText className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{formatFileSize(selectedFile.size)}</p>
            <a
              href={selectedFile.webViewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Open in Google Sheets
            </a>
          </div>
        </div>
      )
    }

    // Download fallback (ZIP, BTX, etc.)
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className={cn("rounded-xl border p-6 text-center max-w-sm", isLight ? "bg-card border-border" : "bg-card border-border")}>
          <Download className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground mt-1">{formatFileSize(selectedFile.size)}</p>
          {selectedFile.modifiedTime && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Modified {new Date(selectedFile.modifiedTime).toLocaleDateString()}
            </p>
          )}
          <a
            href={selectedFile.webContentLink || selectedFile.webViewLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </a>
        </div>
      </div>
    )
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
          "flex items-center justify-between px-6 py-3 border-b",
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
                  ? "bg-secondary text-foreground"
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
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Analytics
            </button>
            {onNavigateToEstimating && (
              <button
                onClick={onNavigateToEstimating}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wide rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary ml-2"
              >
                <Calculator className="w-3.5 h-3.5" />
                Estimating Center
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div ref={containerRef} className="flex-1 flex overflow-hidden">
          {activeTab === "docs" ? (
            <div className="flex flex-1">
              {/* Hidden file input for uploads */}
              <input
                ref={uploadRef}
                type="file"
                className="hidden"
                accept=".pdf,.docx,.xlsx,.csv,.zip,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
              />

              {/* 5-Folder Sidebar */}
              <aside className={cn(
                "w-72 border-r overflow-y-auto flex-shrink-0",
                isLight ? "bg-white border-border" : "border-border/50"
              )}>
                <div className="p-3">
                  <h2 className="text-[10px] font-mono uppercase tracking-wider mb-2 px-2 text-muted-foreground">
                    Project Folders
                  </h2>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : needsSetup ? (
                    <div className="px-2 py-6 text-center">
                      <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground mb-3">No folders set up yet</p>
                      <button
                        onClick={handleSetupFolders}
                        disabled={settingUp}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {settingUp ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        Set up folders
                      </button>
                    </div>
                  ) : error ? (
                    <div className="px-2 py-4 text-xs text-red-500">{error}</div>
                  ) : (
                    <div className="space-y-0.5">
                      {FOLDER_KEYS.map((key) => {
                        const files = folders?.[key]?.files || []
                        const isExpanded = expandedFolders[key]
                        const colors = FOLDER_ICON_COLORS[key]
                        const isUploading = uploading === key

                        return (
                          <div key={key}>
                            {/* Folder Header */}
                            <div className="flex items-center group">
                              <button
                                onClick={() => toggleFolder(key)}
                                className={cn(
                                  "flex-1 flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors",
                                  "hover:bg-secondary/60"
                                )}
                              >
                                {isExpanded
                                  ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                  : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                }
                                <img
                                  src={selectedCategory === key ? FOLDER_ICONS[key] : FOLDER_ICONS_CLOSED[key]}
                                  alt={key}
                                  className="w-8 h-8 flex-shrink-0 transition-opacity duration-200"
                                  style={{ mixBlendMode: 'multiply' }}
                                />
                                <span className="text-xs font-semibold tracking-wide text-foreground">
                                  {FOLDER_LABELS[key]}
                                </span>
                                {files.length > 0 && (
                                  <span
                                    className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                                    style={{ backgroundColor: colors.light, color: colors.primary }}
                                  >
                                    {files.length}
                                  </span>
                                )}
                                {files.length === 0 && (
                                  <span className="ml-auto text-[10px] text-muted-foreground/50">(empty)</span>
                                )}
                              </button>
                              {/* Upload button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUploadClick(key) }}
                                className="p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-foreground mr-1"
                                title={`Upload to ${FOLDER_LABELS[key]}`}
                                disabled={isUploading}
                              >
                                {isUploading
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Upload className="w-3.5 h-3.5" />
                                }
                              </button>
                            </div>

                            {/* File List */}
                            {isExpanded && files.length > 0 && (
                              <div className="ml-6 pl-3 border-l border-border/50 mb-1">
                                {files.map((file) => (
                                  <div key={file.id} className="group/file flex items-center">
                                    <button
                                      onClick={() => handleFileClick(file, key)}
                                      className={cn(
                                        "flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors text-xs min-w-0",
                                        selectedFile?.id === file.id
                                          ? "bg-secondary text-foreground font-medium"
                                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                      )}
                                    >
                                      <FileText className="w-3 h-3 flex-shrink-0" style={{ color: colors.primary }} />
                                      <span className="truncate">{file.name}</span>
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ file, category: key }) }}
                                      className="p-1 rounded transition-colors opacity-0 group-hover/file:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                                      title="Delete file"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {/* Custom Folders */}
                      {customFolders.map((cf) => {
                        const cfKey = `custom_${cf.id}`
                        const isExpanded = expandedFolders[cfKey]
                        return (
                          <div key={cf.id}>
                            <div className="flex items-center group">
                              <button
                                onClick={() => {
                                  setExpandedFolders(prev => ({ ...prev, [cfKey]: !prev[cfKey] }))
                                  setSelectedFile(null)
                                  setSelectedCategory(cfKey)
                                  setPreviewZoom(100)
                                }}
                                className="flex-1 flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors hover:bg-secondary/60"
                              >
                                {isExpanded
                                  ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                  : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                }
                                <FolderOpen className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs font-semibold tracking-wide text-foreground uppercase">
                                  {cf.name}
                                </span>
                                {cf.files.length > 0 && (
                                  <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                    {cf.files.length}
                                  </span>
                                )}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteFolderConfirm({ id: cf.id, name: cf.name }) }}
                                className="p-1.5 rounded transition-colors opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-red-50 mr-1"
                                title="Delete folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {isExpanded && cf.files.length > 0 && (
                              <div className="ml-6 pl-3 border-l border-border/50 mb-1">
                                {cf.files.map((file) => (
                                  <div key={file.id} className="group/file flex items-center">
                                    <button
                                      onClick={() => { setSelectedFile(file); setSelectedCategory(cfKey); setPreviewZoom(100) }}
                                      className={cn(
                                        "flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors text-xs min-w-0",
                                        selectedFile?.id === file.id
                                          ? "bg-secondary text-foreground font-medium"
                                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                      )}
                                    >
                                      <FileText className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                                      <span className="truncate">{file.name}</span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Add Folder Button */}
                      {showAddFolder ? (
                        <div className="flex items-center gap-1.5 px-2 py-1.5 mt-1">
                          <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCustomFolder(); if (e.key === 'Escape') { setShowAddFolder(false); setNewFolderName('') } }}
                            placeholder="Folder name"
                            autoFocus
                            className="flex-1 text-xs px-2 py-1 rounded border bg-background border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                          />
                          <button
                            onClick={handleCreateCustomFolder}
                            disabled={creatingFolder || !newFolderName.trim()}
                            className="p-1 rounded text-primary hover:bg-primary/10 disabled:opacity-50"
                          >
                            {creatingFolder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowAddFolder(true)}
                          className="flex items-center gap-2 px-2 py-2 mt-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors w-full"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                          Add Folder
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </aside>

              {/* Document Viewer */}
              <main className={cn("flex-1 overflow-hidden flex flex-col", isLight ? "bg-gray-50" : "bg-background")}>
                {/* Breadcrumb + Toolbar */}
                {selectedCategory && (
                  <div className={cn(
                    "shrink-0 flex items-center justify-between px-4 py-2 border-b",
                    isLight ? "bg-white border-border" : "bg-surface-elevated border-border"
                  )}>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold" style={{ color: FOLDER_ICON_COLORS[selectedCategory]?.primary || '#888' }}>
                        {FOLDER_LABELS[selectedCategory] || customFolders.find(cf => `custom_${cf.id}` === selectedCategory)?.name?.toUpperCase() || selectedCategory}
                      </span>
                      {selectedFile && (
                        <>
                          <ChevronRight className="w-3 h-3 text-muted-foreground" />
                          <span className="text-foreground">{selectedFile.name}</span>
                          {selectedFile.size && (
                            <span className="text-muted-foreground/50 ml-2">{formatFileSize(selectedFile.size)}</span>
                          )}
                        </>
                      )}
                    </div>
                    {selectedFile && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewZoom(Math.max(25, previewZoom - 25))}
                        className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="text-[11px] font-mono w-12 text-center text-muted-foreground">{previewZoom}%</span>
                      <button
                        onClick={() => setPreviewZoom(Math.min(400, previewZoom + 25))}
                        className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                      <div className="w-px h-4 mx-2 bg-border" />
                      <button
                        onClick={() => { setPreviewZoom(100) }}
                        className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                        className="p-1.5 rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-secondary"
                      >
                        {isPreviewExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </button>
                      {selectedFile.webViewLink && (
                        <a
                          href={selectedFile.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 px-2 py-1 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                        >
                          Open in Drive
                        </a>
                      )}
                    </div>
                    )}
                  </div>
                )}

                {/* Viewer Area */}
                <div className={cn(
                  "flex-1 overflow-hidden",
                  isPreviewExpanded && "fixed inset-0 z-50",
                  isPreviewExpanded && (isLight ? "bg-white" : "bg-card")
                )}>
                  {renderViewer()}
                  {isPreviewExpanded && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-lg px-3 py-2 border bg-card border-border">
                      {[50, 100, 150, 200].map((zoom) => (
                        <button
                          key={zoom}
                          onClick={() => setPreviewZoom(zoom)}
                          className={cn(
                            "px-2 py-1 rounded text-[11px] font-mono transition-colors",
                            previewZoom === zoom ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
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
              </main>
            </div>
          ) : (
            /* Analytics View — unchanged */
            <main className={cn("flex-1 overflow-y-auto p-4", isLight ? "bg-white" : "bg-card")}>
              <div className="max-w-7xl mx-auto space-y-4">
                <div className="mb-2">
                  <h2 className="text-lg font-semibold text-foreground">{projectName} - Complete Project Projection</h2>
                  <p className="text-xs text-muted-foreground">GC: The Jay Group Inc | 1/14/2026</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-5 gap-3">
                  {[
                    { label: "Full Project Value", value: projectFinancials.fullProjectValue, bg: "bg-blue-600" },
                    { label: "Invoiced (Sage)", value: projectFinancials.invoicedSage, bg: "bg-orange-600" },
                    { label: "Cost to Finish", value: projectFinancials.costToFinish, bg: "bg-teal-600" },
                    { label: "Outstanding A/R", value: projectFinancials.outstandingAR, bg: "bg-red-600" },
                    { label: "Remaining to Invoice", value: projectFinancials.remainingToInvoice, bg: "bg-purple-600" },
                  ].map((kpi, i) => (
                    <div key={i} className={cn("rounded-lg p-3 text-center", kpi.bg)}>
                      <p className="text-[10px] text-white/80 uppercase tracking-wide">{kpi.label}</p>
                      <p className="text-xl font-bold text-white">${kpi.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {/* Gauges */}
                <div className="rounded-lg border p-4 bg-secondary border-border">
                  <div className="flex items-center justify-between">
                    {[
                      { label: "Work Complete", value: projectProgress.workComplete, color: "#22c55e" },
                      { label: "Invoiced", value: projectProgress.invoiced, color: "#eab308" },
                      { label: "Collected", value: projectProgress.collected, color: "#ef4444" },
                    ].map((gauge, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div className="relative w-24 h-24">
                          <svg className="w-24 h-24 transform -rotate-90">
                            <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-border" />
                            <circle cx="48" cy="48" r="40" stroke={gauge.color} strokeWidth="8" fill="none" strokeDasharray={`${gauge.value * 2.51} 251`} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xl font-bold text-foreground">{gauge.value}%</span>
                          </div>
                        </div>
                        <p className="text-xs mt-2 text-muted-foreground">{gauge.label}</p>
                      </div>
                    ))}
                    <div className="flex flex-col items-center px-6">
                      <p className="text-2xl font-bold text-foreground">${projectProgress.estCostToComplete.toLocaleString()}</p>
                      <p className="text-xs mt-1 text-muted-foreground">Est. Cost to Complete</p>
                    </div>
                    <div className="flex flex-col items-center px-6">
                      <p className="text-2xl font-bold text-green-500">${projectProgress.totalRevenueRemaining.toLocaleString()}</p>
                      <p className="text-xs mt-1 text-muted-foreground">Total Revenue Remaining</p>
                    </div>
                  </div>
                </div>

                {/* Scope Cards */}
                <div className="grid grid-cols-3 gap-3">
                  {scopeBreakdown.map((scope, i) => (
                    <div key={i} className="rounded-lg border-l-4 border p-3 bg-secondary border-border" style={{ borderLeftColor: scope.color }}>
                      <h4 className="text-sm font-semibold mb-2" style={{ color: scope.color }}>{scope.name}</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-muted-foreground">{scope.takeoffValue ? "Takeoff Value:" : "Proposal Value:"}</span><span className="font-medium text-foreground">${(scope.takeoffValue || scope.proposalValue || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">% of Project:</span><span className="font-medium text-foreground">{scope.percentOfProject}%</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Cost to Finish (30%):</span><span className="font-medium text-foreground">${scope.costToFinish.toLocaleString()}</span></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cost Charts */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-4 bg-secondary border-border">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Roofing Cost by Building</h4>
                    <div className="space-y-2">
                      {costByBuilding.map((item, i) => {
                        const maxCost = Math.max(...costByBuilding.map(b => b.cost))
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs w-12 text-muted-foreground">{item.building}</span>
                            <div className="flex-1 h-5 rounded overflow-hidden bg-border">
                              <div className="h-full rounded" style={{ width: `${(item.cost / maxCost) * 100}%`, backgroundColor: item.color }} />
                            </div>
                            <span className="text-xs font-medium w-20 text-right text-foreground">${item.cost.toLocaleString()}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 bg-secondary border-border">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Cost by System (Roofing Scope)</h4>
                    <div className="flex items-center gap-4">
                      <div className="relative w-32 h-32">
                        <svg viewBox="0 0 100 100" className="w-32 h-32 transform -rotate-90">
                          {(() => {
                            let cumulative = 0
                            return costBySystem.map((item, i) => {
                              const dash = `${item.percent * 2.51} 251`
                              const offset = -cumulative * 2.51
                              cumulative += item.percent
                              return <circle key={i} cx="50" cy="50" r="40" stroke={item.color} strokeWidth="16" fill="none" strokeDasharray={dash} strokeDashoffset={offset} />
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

                {/* Progress + Cash Flow */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-4 bg-secondary border-border">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Progress by Scope</h4>
                    <div className="space-y-3">
                      {progressByScope.map((item, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div><span className="text-xs font-medium text-foreground">{item.scope}</span><span className="text-[10px] ml-2 text-muted-foreground">${item.total.toLocaleString()} total</span></div>
                            <span className="text-[10px] text-muted-foreground">${item.remaining.toLocaleString()} rem</span>
                          </div>
                          <div className="h-4 rounded overflow-hidden flex bg-border">
                            <div className="h-full bg-blue-500 flex items-center justify-center" style={{ width: `${item.invoicedPercent}%` }}>
                              {item.invoicedPercent > 5 && <span className="text-[9px] text-white font-medium">{item.invoicedPercent}% Inv</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg border p-4 bg-secondary border-border">
                    <h4 className="text-sm font-semibold mb-3 text-foreground">Cash Flow by Quarter</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded" /><span className="text-[10px] text-muted-foreground">Invoiced</span></div>
                      <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded" /><span className="text-[10px] text-muted-foreground">Collected</span></div>
                    </div>
                    <div className="flex items-end justify-around h-32 gap-4">
                      {cashFlowByQuarter.map((item, i) => {
                        const maxVal = Math.max(...cashFlowByQuarter.flatMap(q => [q.invoiced, q.collected]))
                        return (
                          <div key={i} className="flex flex-col items-center gap-1 flex-1">
                            <div className="flex items-end gap-1 h-24">
                              <div className="w-6 bg-blue-500 rounded-t" style={{ height: `${(item.invoiced / maxVal) * 100}%` }} />
                              <div className="w-6 bg-green-500 rounded-t" style={{ height: `${(item.collected / maxVal) * 100}%` }} />
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
              isLight ? "bg-gray-50 border-border" : "bg-folder-bg border-border",
              (isDragging || isSplitDragging) && "select-none"
            )}
            style={{ width: `${panelWidth}px`, minWidth: "280px", maxWidth: "600px" }}
          >
            {/* Width Drag Handle */}
            <div
              onMouseDown={(e) => { e.preventDefault(); setIsDragging(true) }}
              className={cn("absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10 group", isDragging && "bg-primary/20")}
            >
              <div className={cn("absolute top-1/2 -translate-y-1/2 left-0 w-1 h-12 rounded-full transition-colors", isDragging ? "bg-primary" : "bg-border group-hover:bg-primary/50")} />
            </div>

            {/* Upper Section - Agent Preview */}
            <div className="shrink-0 flex flex-col overflow-hidden bg-surface-elevated" style={{ height: `${previewHeight}px`, minHeight: "100px", maxHeight: "400px" }}>
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
                <div className="w-full h-full rounded-lg flex items-center justify-center border bg-card border-border">
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 text-border" />
                    <p className="text-[10px] text-muted-foreground">Agent Preview</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Split Drag Handle */}
            <div
              onMouseDown={(e) => { e.preventDefault(); setIsSplitDragging(true) }}
              className={cn("shrink-0 h-2 cursor-ns-resize group flex items-center justify-center border-y border-border", isSplitDragging && "bg-primary/10")}
            >
              <div className={cn("w-12 h-0.5 rounded-full transition-colors", isSplitDragging ? "bg-primary" : "bg-border group-hover:bg-primary/50")} />
            </div>

            {/* Lower Section - Chat */}
            <div className={cn("flex-1 flex flex-col overflow-hidden", isLight ? "bg-card" : "")}>
              <div className="flex-1 overflow-y-auto flex flex-col justify-end px-4 py-3">
                <div className="space-y-3 opacity-40 mb-4 text-[11px]">
                  <p className="text-right pr-1 text-muted-foreground">What's the status on Bldg D roofing?</p>
                  <p className="pl-1 text-foreground/80">Bldg D membrane installation is 60% complete. Crew scheduled through Friday.</p>
                </div>
                <div className="space-y-2 opacity-60 mb-4 text-xs">
                  <p className="text-right pr-1 text-muted-foreground">Any issues with submittals?</p>
                  <p className="pl-1 text-foreground/80">All roofing submittals approved. Lead times locked at 4 weeks.</p>
                </div>
                <div className="space-y-3 mb-4">
                  <p className="text-[13px] text-right pr-1 text-foreground">Check weather impact on schedule</p>
                  <div className="space-y-1.5 pl-1">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                      <span className="font-mono">scanning weather forecasts...</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <span className="font-mono">cross-referencing schedule milestones</span>
                    </div>
                  </div>
                  <div className="pl-1 space-y-2">
                    <p className="text-[13px] leading-relaxed text-foreground">Rain forecasted Tuesday through Wednesday. Membrane work should pause.</p>
                    <p className="text-[13px] leading-relaxed text-foreground/80">Recommend shifting Bldg D exterior to Thursday. Interior flashing can continue as planned.</p>
                  </div>
                </div>
              </div>

              <div className="shrink-0 px-4 pb-4 pt-2 border-t border-border/50">
                {isListening && (
                  <div className="mb-2 flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="w-0.5 bg-primary rounded animate-pulse" style={{ height: `${6 + Math.random() * 6}px`, animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                    <span className="text-xs italic text-muted-foreground">listening...</span>
                  </div>
                )}
                <div className="relative">
                  <textarea
                    value={chatInput}
                    onChange={(e) => { setChatInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px" }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) e.preventDefault() }}
                    placeholder="Ask something..."
                    rows={1}
                    className="w-full rounded-xl px-4 py-2.5 pr-20 text-[13px] focus:outline-none transition-colors resize-none overflow-hidden bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:border-primary/50"
                    style={{ minHeight: "40px", maxHeight: "120px" }}
                  />
                  <div className="absolute right-2 bottom-2 flex items-center gap-1">
                    <button onClick={() => setIsListening(!isListening)} className={cn("p-1.5 rounded-lg transition-colors", isListening ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground")}>
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

      {/* Delete File Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={cn("rounded-xl border p-6 max-w-sm w-full mx-4 shadow-xl", isLight ? "bg-white border-border" : "bg-card border-border")}>
            <h3 className="text-sm font-semibold text-foreground mb-2">Delete File</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Delete <span className="font-medium text-foreground">{deleteConfirm.file.name}</span>? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-secondary text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFile}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Custom Folder Confirmation Dialog */}
      {deleteFolderConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={cn("rounded-xl border p-6 max-w-sm w-full mx-4 shadow-xl", isLight ? "bg-white border-border" : "bg-card border-border")}>
            <h3 className="text-sm font-semibold text-foreground mb-2">Delete Folder</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Delete <span className="font-medium text-foreground">{deleteFolderConfirm.name}</span> and all its contents? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteFolderConfirm(null)}
                disabled={deletingFolder}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-secondary text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCustomFolder}
                disabled={deletingFolder}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deletingFolder ? 'Deleting...' : 'Delete Folder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
