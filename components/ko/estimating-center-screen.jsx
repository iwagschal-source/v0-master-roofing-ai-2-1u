"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Search,
  Calculator,
  Upload,
  Plus,
  Clock,
  Building2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  X,
  GripHorizontal,
  Send,
  Bot,
  Sparkles,
  Save,
  FileText,
  ExternalLink,
  RefreshCw,
  Download,
  Folder,
  File,
  FileImage,
  Mail,
  Phone,
  MessageSquare,
  User,
  MapPin,
  ArrowRight,
  Eye,
  BookPlus,
  Trash2,
  Wrench
} from "lucide-react"
import { TakeoffProposalPreview } from "./takeoff-proposal-preview"
import { AddItemModal } from "./add-item-modal"
import { BluebeamToolManager } from "./bluebeam-tool-manager"
import { SheetRibbon } from "./sheet-ribbon"
import ProjectStatusIcons from "./project-status-icons"
import { cn } from "@/lib/utils"

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-500", textColor: "text-gray-400" },
  in_progress: { label: "In Progress", color: "bg-yellow-500", textColor: "text-yellow-400" },
  review: { label: "Review", color: "bg-blue-500", textColor: "text-blue-400" },
  submitted: { label: "Submitted", color: "bg-purple-500", textColor: "text-purple-400" },
  won: { label: "Won", color: "bg-green-500", textColor: "text-green-400" },
  lost: { label: "Lost", color: "bg-red-500", textColor: "text-red-400" }
}

export function EstimatingCenterScreen() {
  // Project state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState(null)

  // Modal states
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showImportHistory, setShowImportHistory] = useState(false)

  const [showProposalPreview, setShowProposalPreview] = useState(false)
  const [showAddItem, setShowAddItem] = useState(false)
  const [showToolManager, setShowToolManager] = useState(false)
  const [toolManagerInitialView, setToolManagerInitialView] = useState(null)

  // Preview state
  const [previewDoc, setPreviewDoc] = useState(null)

  // Embedded takeoff sheet state (Step 8.B.6)
  const [embeddedSheetId, setEmbeddedSheetId] = useState(null)
  const [embeddedSheetUrl, setEmbeddedSheetUrl] = useState(null)
  const [showEmbeddedSheet, setShowEmbeddedSheet] = useState(false)

  // BTX generation state
  const [generatingBtx, setGeneratingBtx] = useState(false)
  // Workbook auto-creation state
  const [creatingWorkbook, setCreatingWorkbook] = useState(false)

  // Version-aware sheet tracking
  const [currentSheetName, setCurrentSheetName] = useState(null)

  // Version management state (2C.1)
  const [versions, setVersions] = useState([])
  const [versionsLoading, setVersionsLoading] = useState(false)
  const [selectedVersionTab, setSelectedVersionTab] = useState(null)
  const [setupTabSheetId, setSetupTabSheetId] = useState(null)
  const [creatingVersion, setCreatingVersion] = useState(false)
  const [showNewVersionDialog, setShowNewVersionDialog] = useState(false)
  const [newVersionMode, setNewVersionMode] = useState('duplicate')
  const [newVersionMakeActive, setNewVersionMakeActive] = useState(true)

  // Folder agent chat state
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef(null)

  // Folder agent brief/summaries
  const [folderBrief, setFolderBrief] = useState(null)
  const [folderFiles, setFolderFiles] = useState([])

  // Communication summaries
  const [commSummaries, setCommSummaries] = useState([])

  // Draggable dividers - vertical (between columns)
  const [leftPanelWidth, setLeftPanelWidth] = useState(320)
  const [rightPanelWidth, setRightPanelWidth] = useState(350)

  // Draggable dividers - horizontal (within center and right panels)
  const [centerTopHeight, setCenterTopHeight] = useState(280)
  const [rightTopHeight, setRightTopHeight] = useState(300)

  // Drag state
  const [isDragging, setIsDragging] = useState(null) // 'left', 'right', 'center-h', 'right-h'
  const dragStartRef = useRef({ x: 0, y: 0, value: 0 })

  // New project form
  const [newProject, setNewProject] = useState({
    project_name: "",
    gc_name: "",
    address: "",
    due_date: "",
    priority: "normal",
    assigned_to: "Steve"
  })
  const [savingProject, setSavingProject] = useState(false)

  // Load projects on mount
  useEffect(() => {
    loadProjects()
  }, [])

  // Reset states when project changes
  useEffect(() => {
    if (selectedProject) {
      setChatMessages([])
      setChatInput("")
      setPreviewDoc(null)
      setShowEmbeddedSheet(false)
      setEmbeddedSheetId(null)
      setEmbeddedSheetUrl(null)
      setCurrentSheetName(null)
      setVersions([])
      setSelectedVersionTab(null)
      setSetupTabSheetId(null)
      setCreatingWorkbook(false)
      loadFolderData(selectedProject.project_id)
      // Check if project has an existing takeoff spreadsheet
      checkExistingTakeoffSheet(selectedProject.project_id)
    }
  }, [selectedProject?.project_id])

  // Check for existing takeoff spreadsheet — auto-create if none exists
  const checkExistingTakeoffSheet = async (projectId) => {
    try {
      const res = await fetch(`/api/ko/takeoff/create?project_id=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.exists && data.spreadsheetId) {
          setEmbeddedSheetId(data.spreadsheetId)
          setEmbeddedSheetUrl(data.embedUrl)
          // Load versions directly after sheet confirmed (2C.1)
          loadVersions(projectId)
        } else {
          // No takeoff workbook yet — auto-create one (Setup + Library tabs)
          const projectName = selectedProject?.project_name || projectId
          setCreatingWorkbook(true)
          try {
            const createRes = await fetch('/api/ko/takeoff/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ project_id: projectId, project_name: projectName })
            })
            if (createRes.ok) {
              const createData = await createRes.json()
              if (createData.spreadsheetId) {
                setEmbeddedSheetId(createData.spreadsheetId)
                setEmbeddedSheetUrl(createData.embedUrl)
                loadVersions(projectId)
              }
            } else {
              console.warn('Failed to auto-create takeoff sheet:', await createRes.text())
            }
          } catch (createErr) {
            console.warn('Failed to auto-create takeoff sheet:', createErr)
          } finally {
            setCreatingWorkbook(false)
          }
        }
      }
    } catch (err) {
      console.warn('Failed to check takeoff sheet:', err)
    }
  }

  // Load version tabs for a project (2C.1)
  const loadVersions = async (projectId) => {
    setVersionsLoading(true)
    try {
      const res = await fetch(`/api/ko/takeoff/${projectId}/versions`)
      if (res.ok) {
        const data = await res.json()
        // Filter out ghost entries with empty/blank sheetName (Bug fix: deleted versions leave empty tracker rows)
        const validVersions = (data.versions || []).filter(v => v.sheetName && v.sheetName.trim() !== '')
        setVersions(validVersions)
        if (data.setupTabSheetId != null) {
          setSetupTabSheetId(data.setupTabSheetId)
        }
        // Default to active version tab (2C.2)
        const activeVersion = validVersions.find(v => v.active)
        if (activeVersion) {
          setSelectedVersionTab(activeVersion.sheetName)
          setCurrentSheetName(activeVersion.sheetName)
        }
      }
    } catch (err) {
      console.warn('Failed to load versions:', err)
    } finally {
      setVersionsLoading(false)
    }
  }

  // Handle version tab click — switch embedded sheet to that tab (2C.2)
  const handleVersionTabClick = (tabName, tabSheetId) => {
    setSelectedVersionTab(tabName)
    if (tabName === 'Setup') {
      setCurrentSheetName(null) // Setup is not a version
    } else {
      setCurrentSheetName(tabName)
      // Optimistic update: move green dot locally
      setVersions(prev => prev.map(v => ({
        ...v,
        active: v.sheetName === tabName,
      })))
      // Persist active version to Setup tab (async, non-blocking)
      if (selectedProject) {
        fetch(`/api/ko/takeoff/${selectedProject.project_id}/versions`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetName: tabName, setActive: true }),
        }).catch(err => {
          console.warn('Failed to persist active version:', err)
          loadVersions(selectedProject.project_id) // Rollback on error
        })
      }
    }
    // Update embedded sheet URL to show the selected tab
    if (embeddedSheetId && tabSheetId != null) {
      setEmbeddedSheetUrl(
        `https://docs.google.com/spreadsheets/d/${embeddedSheetId}/edit?embedded=true&rm=minimal&gid=${tabSheetId}`
      )
      setShowEmbeddedSheet(true)
    }
  }

  // Show new version dialog (2C.4 — VF-3.2)
  const handleCreateVersion = () => {
    if (!selectedProject || creatingVersion) return
    setNewVersionMode('duplicate')
    setNewVersionMakeActive(true)
    setShowNewVersionDialog(true)
  }

  // Execute version creation after dialog confirmation (VF-3.3)
  const handleConfirmCreateVersion = async () => {
    if (!selectedProject || creatingVersion) return
    setCreatingVersion(true)
    setShowNewVersionDialog(false)
    try {
      let sheetName, tabSheetId

      if (newVersionMode === 'duplicate' && currentSheetName) {
        // Duplicate existing version via POST /versions
        const res = await fetch(`/api/ko/takeoff/${selectedProject.project_id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceSheetName: currentSheetName })
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to duplicate version')
        }
        const data = await res.json()
        // Normalize response: POST /versions returns newSheetName/newTabSheetId
        sheetName = data.newSheetName || data.sheetName
        tabSheetId = data.newTabSheetId ?? data.tabSheetId
      } else {
        // Create blank version from template via POST /create-version
        const res = await fetch(`/api/ko/takeoff/${selectedProject.project_id}/create-version`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create version')
        }
        const data = await res.json()
        sheetName = data.sheetName
        tabSheetId = data.tabSheetId
      }

      // Reload versions to reflect the new one
      await loadVersions(selectedProject.project_id)
      // Switch to the new version tab
      if (sheetName && tabSheetId != null) {
        handleVersionTabClick(sheetName, tabSheetId)
      }

      // If "make active" unchecked, revert active flag
      if (!newVersionMakeActive && sheetName && selectedProject) {
        const activeVersion = versions.find(v => v.active)
        if (activeVersion) {
          fetch(`/api/ko/takeoff/${selectedProject.project_id}/versions`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheetName: activeVersion.sheetName, setActive: true }),
          }).catch(err => console.warn('Failed to revert active version:', err))
        }
      }
    } catch (err) {
      console.error('Create version error:', err)
      alert('Failed to create version: ' + err.message)
    } finally {
      setCreatingVersion(false)
    }
  }

  // Delete a version tab (Bug fix: auto-select another version after deletion)
  const handleDeleteVersion = async (sheetName) => {
    if (!selectedProject || !sheetName) return
    if (!confirm(`Delete version "${sheetName}"? This cannot be undone.`)) return

    try {
      const res = await fetch(
        `/api/ko/takeoff/${selectedProject.project_id}/versions?sheet=${encodeURIComponent(sheetName)}&force=true`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete version')
      }

      // Reload versions after deletion
      await loadVersions(selectedProject.project_id)

      // Auto-select another version if the deleted one was active/selected
      if (selectedVersionTab === sheetName) {
        // Use the freshly loaded versions (from state after loadVersions completes)
        setVersions(prev => {
          const remaining = prev.filter(v => v.sheetName !== sheetName && v.sheetName && v.sheetName.trim() !== '')
          if (remaining.length > 0) {
            // Pick the most recent remaining version (last in the list)
            const mostRecent = remaining[remaining.length - 1]
            setSelectedVersionTab(mostRecent.sheetName)
            setCurrentSheetName(mostRecent.sheetName)
            // Update embedded sheet URL
            if (embeddedSheetId && mostRecent.tabSheetId != null) {
              setEmbeddedSheetUrl(
                `https://docs.google.com/spreadsheets/d/${embeddedSheetId}/edit?embedded=true&rm=minimal&gid=${mostRecent.tabSheetId}`
              )
              setShowEmbeddedSheet(true)
            }
          } else {
            // No versions remain — switch to Setup tab
            setSelectedVersionTab('Setup')
            setCurrentSheetName(null)
            if (embeddedSheetId && setupTabSheetId != null) {
              setEmbeddedSheetUrl(
                `https://docs.google.com/spreadsheets/d/${embeddedSheetId}/edit?embedded=true&rm=minimal&gid=${setupTabSheetId}`
              )
              setShowEmbeddedSheet(true)
            }
          }
          return remaining
        })
      }
    } catch (err) {
      console.error('Delete version error:', err)
      alert('Failed to delete version: ' + err.message)
    }
  }

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ko/estimating')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err)
    } finally {
      setLoading(false)
    }
  }

  const loadFolderData = async (projectId) => {
    // Load folder brief/summaries
    try {
      const briefRes = await fetch(`/api/ko/folder-agent/${projectId}/brief`)
      if (briefRes.ok) {
        const data = await briefRes.json()
        setFolderBrief(data)
      }
    } catch (err) {
      // Use placeholder data for now
      setFolderBrief({
        next_steps: ["Review takeoff quantities", "Send proposal to GC"],
        stage: "in_progress",
        stats: { emails: 12, calls: 3, meetings: 1 },
        last_activity: new Date().toISOString()
      })
    }

    // Load folder files
    try {
      const filesRes = await fetch(`/api/ko/folder-agent/${projectId}/files`)
      if (filesRes.ok) {
        const data = await filesRes.json()
        setFolderFiles(data.files || [])
      }
    } catch (err) {
      // Placeholder files
      setFolderFiles([
        { name: "Proposal_v1.pdf", type: "pdf", url: "#" },
        { name: "Takeoff.xlsx", type: "excel", url: "#" },
        { name: "Site_Photos.zip", type: "archive", url: "#" },
        { name: "Contract_Draft.docx", type: "doc", url: "#" }
      ])
    }

    // Load communication summaries
    try {
      const commRes = await fetch(`/api/ko/folder-agent/${projectId}/communications`)
      if (commRes.ok) {
        const data = await commRes.json()
        setCommSummaries(data.summaries || [])
      }
    } catch (err) {
      // Placeholder summaries
      setCommSummaries([
        { type: "email", date: "2026-01-22", summary: "GC requested updated pricing for roofing materials" },
        { type: "call", date: "2026-01-21", summary: "Discussed timeline - need proposal by Friday" },
        { type: "email", date: "2026-01-20", summary: "Initial RFP received with scope documents" }
      ])
    }
  }

  // Drag handlers
  const handleDragStart = (type, e) => {
    e.preventDefault()
    setIsDragging(type)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      value: type === 'left' ? leftPanelWidth
           : type === 'right' ? rightPanelWidth
           : type === 'center-h' ? centerTopHeight
           : rightTopHeight
    }
  }

  const handleDragMove = useCallback((e) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y

    if (isDragging === 'left') {
      setLeftPanelWidth(Math.max(250, Math.min(500, dragStartRef.current.value + deltaX)))
    } else if (isDragging === 'right') {
      setRightPanelWidth(Math.max(280, Math.min(600, dragStartRef.current.value - deltaX)))
    } else if (isDragging === 'center-h') {
      setCenterTopHeight(Math.max(150, Math.min(500, dragStartRef.current.value + deltaY)))
    } else if (isDragging === 'right-h') {
      setRightTopHeight(Math.max(150, Math.min(500, dragStartRef.current.value + deltaY)))
    }
  }, [isDragging])

  const handleDragEnd = useCallback(() => {
    setIsDragging(null)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove)
      document.addEventListener('mouseup', handleDragEnd)
      document.body.style.cursor = isDragging.includes('h') ? 'row-resize' : 'col-resize'
      document.body.style.userSelect = 'none'
    }
    return () => {
      document.removeEventListener('mousemove', handleDragMove)
      document.removeEventListener('mouseup', handleDragEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // Filter and sort projects
  const filteredProjects = projects.filter(project => {
    if (statusFilter !== "all" && project.estimate_status !== statusFilter) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        project.project_name?.toLowerCase().includes(query) ||
        project.gc_name?.toLowerCase().includes(query)
      )
    }
    return true
  })

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2 }
    const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
    if (priorityDiff !== 0) return priorityDiff
    return new Date(a.due_date) - new Date(b.due_date)
  })

  const formatCurrency = (value) => {
    if (!value) return "-"
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "-"
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Chat handler
  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading || !selectedProject) return

    const userMessage = chatInput.trim()
    setChatInput("")
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)

    try {
      const res = await fetch(`/api/ko/folder-agent/${selectedProject.project_id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: chatMessages.slice(-6)
        })
      })

      if (res.ok) {
        const data = await res.json()
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        throw new Error('Failed to get response')
      }
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `I can help you with information about ${selectedProject.project_name}. What would you like to know?`
      }])
    } finally {
      setChatLoading(false)
    }
  }

  // Save new project
  const handleSaveNewProject = async () => {
    if (!newProject.project_name || !newProject.gc_name) return

    setSavingProject(true)
    try {
      const res = await fetch('/api/ko/estimating/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      })

      if (res.ok) {
        const data = await res.json()
        setProjects(prev => [data.project, ...prev])
        setShowNewProjectModal(false)
        setNewProject({
          project_name: "",
          gc_name: "",
          address: "",
          due_date: "",
          priority: "normal",
          assigned_to: "Steve"
        })
        setSelectedProject(data.project)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to create project')
      }
    } catch (err) {
      alert('Error creating project: ' + err.message)
    } finally {
      setSavingProject(false)
    }
  }

  // Get file icon
  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />
      case 'excel': return <FileSpreadsheet className="w-5 h-5 text-green-500" />
      case 'doc': return <FileText className="w-5 h-5 text-blue-500" />
      case 'image': return <FileImage className="w-5 h-5 text-purple-500" />
      default: return <File className="w-5 h-5 text-gray-500" />
    }
  }

  // Get comm icon
  const getCommIcon = (type) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4 text-blue-400" />
      case 'call': return <Phone className="w-4 h-4 text-green-400" />
      case 'meeting': return <MessageSquare className="w-4 h-4 text-purple-400" />
      default: return <MessageSquare className="w-4 h-4 text-gray-400" />
    }
  }

  // BTX summary state for confirmation dialog
  const [btxSummary, setBtxSummary] = useState(null)
  const [btxSetupData, setBtxSetupData] = useState(null)

  // Step 1: Read Setup tab config and show summary before downloading
  const handleGenerateBtx = async () => {
    if (!selectedProject || generatingBtx) return

    setGeneratingBtx(true)
    try {
      // Read Setup tab toggles via setup-config endpoint
      const setupRes = await fetch(`/api/ko/takeoff/${selectedProject.project_id}/setup-config`)
      if (!setupRes.ok) {
        const err = await setupRes.json()
        throw new Error(err.error || 'Failed to read Setup tab config')
      }
      const setupData = await setupRes.json()

      if (!setupData.selected_items?.length) {
        throw new Error('No items toggled on Setup tab. Toggle locations in columns G-M first.')
      }

      if (!setupData.locations?.length) {
        throw new Error('No locations active. Toggle at least one location column on the Setup tab.')
      }

      // Show summary dialog — user confirms before download
      setBtxSetupData(setupData)
      setBtxSummary({
        items: setupData.items_count,
        locations: setupData.locations_count,
        toolCount: setupData.tool_count,
        locationNames: setupData.locations.map(l => l.name),
        itemsWithoutTools: setupData.selected_items.filter(i => !i.tool_name).length,
      })
      // Don't set generatingBtx false — the dialog handles it
    } catch (err) {
      console.error('BTX generation error:', err)
      alert('Failed to generate BTX: ' + err.message)
      setGeneratingBtx(false)
    }
  }

  // Step 2: User confirmed summary — actually generate and download BTX
  const handleBtxConfirm = async () => {
    if (!btxSetupData) return

    try {
      const btxRes = await fetch(`/api/ko/takeoff/${selectedProject.project_id}/btx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupConfig: {
            items: btxSetupData.selected_items,
            locations: btxSetupData.locations,
          },
          projectName: selectedProject.project_name
        })
      })

      if (!btxRes.ok) {
        const err = await btxRes.json()
        throw new Error(err.error || 'Failed to generate BTX')
      }

      // Download the BTX zip
      const blob = await btxRes.blob()
      const contentDisposition = btxRes.headers.get('Content-Disposition')
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
      const safeName = selectedProject.project_name.replace(/[^a-zA-Z0-9]/g, '_')
      const dateStr = new Date().toISOString().split('T')[0]
      const filename = filenameMatch?.[1] || `${safeName}-tools-${dateStr}.zip`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

    } catch (err) {
      console.error('BTX generation error:', err)
      alert('Failed to generate BTX: ' + err.message)
    } finally {
      setBtxSummary(null)
      setBtxSetupData(null)
      setGeneratingBtx(false)
    }
  }

  // User cancelled BTX summary dialog
  const handleBtxCancel = () => {
    setBtxSummary(null)
    setBtxSetupData(null)
    setGeneratingBtx(false)
  }

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* ============ LEFT PANEL - Project List ============ */}
      <div
        style={{ width: leftPanelWidth }}
        className="flex-shrink-0 flex flex-col border-r border-border bg-card"
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">Estimating</h1>
                <p className="text-xs text-muted-foreground">{projects.length} projects</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={loadProjects}
                disabled={loading}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowToolManager(true)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Bluebeam Tool Manager"
              >
                <Wrench className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowAddItem(true)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Add Item"
              >
                <BookPlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="p-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
                title="New Project"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 bg-muted border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto">
            {[
              { value: 'all', label: 'All' },
              { value: 'draft', label: 'Draft' },
              { value: 'in_progress', label: 'Active' },
              { value: 'submitted', label: 'Sent' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Folder className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No projects</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {sortedProjects.map((project) => {
                const status = STATUS_CONFIG[project.estimate_status] || STATUS_CONFIG.draft
                const isSelected = selectedProject?.project_id === project.project_id

                return (
                  <button
                    key={project.project_id}
                    onClick={() => setSelectedProject(project)}
                    className={cn(
                      "w-full group relative bg-background rounded-lg p-3 text-left transition-all border",
                      isSelected
                        ? "border-primary/50 bg-primary/5"
                        : "border-transparent hover:border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h3 className="font-medium text-sm truncate">
                            {project.project_name}
                          </h3>
                          {project.priority === "urgent" && (
                            <span className="px-1 py-0.5 text-[9px] font-bold bg-red-500/20 text-red-400 rounded">
                              !
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.gc_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {formatCurrency(project.proposal_total)}
                          </span>
                          <span>•</span>
                          <span>{formatDate(project.due_date)}</span>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${status.color} mt-1.5`} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Left Divider */}
      <div
        onMouseDown={(e) => handleDragStart('left', e)}
        className={cn(
          "w-1 flex-shrink-0 bg-border hover:bg-primary/50 cursor-col-resize transition-colors",
          isDragging === 'left' && "bg-primary"
        )}
      />

      {/* ============ CENTER PANEL ============ */}
      {selectedProject ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Center Top - Project Details + Summary Cards */}
          <div style={{ height: centerTopHeight }} className="flex-shrink-0 overflow-auto border-b border-border">
            <div className="p-4">
              {/* Project Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{selectedProject.project_name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      {selectedProject.gc_name}
                    </span>
                    {selectedProject.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {selectedProject.address}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Project Status Icons (11B.1-7) — hidden during workbook creation */}
              {!creatingWorkbook && (
                <ProjectStatusIcons
                  iconStates={{
                    drawings: false,
                    bluebeam: !!embeddedSheetId,
                    takeoff: versions.length > 0,
                    markup: false,
                    export: versions.some(v => v.status?.toLowerCase().includes('import') || v.importCount > 0),
                    proposal: versions.some(v => v.status?.toLowerCase().includes('proposal')),
                  }}
                  onIconClick={(key) => {
                    if (key === 'bluebeam' && embeddedSheetId) {
                      // Open Setup sheet
                      if (!embeddedSheetUrl) {
                        setEmbeddedSheetUrl(`https://docs.google.com/spreadsheets/d/${embeddedSheetId}/edit?embedded=true&rm=minimal${setupTabSheetId ? `&gid=${setupTabSheetId}` : ''}`)
                      }
                      setSelectedVersionTab('Setup')
                      setCurrentSheetName(null)
                      setShowEmbeddedSheet(true)
                    } else if (key === 'takeoff' && versions.length > 0) {
                      // Open default (active) version tab
                      const activeVersion = versions.find(v => v.active) || versions[0]
                      if (activeVersion?.tabSheetId) {
                        setEmbeddedSheetUrl(`https://docs.google.com/spreadsheets/d/${embeddedSheetId}/edit?embedded=true&rm=minimal&gid=${activeVersion.tabSheetId}`)
                        setSelectedVersionTab(activeVersion.sheetName)
                        setCurrentSheetName(activeVersion.sheetName)
                        setShowEmbeddedSheet(true)
                      }
                    } else if (key === 'proposal') {
                      setShowProposalPreview(true)
                    }
                  }}
                />
              )}

              {/* Workbook creation loading indicator */}
              {creatingWorkbook && !embeddedSheetId && (
                <div className="flex items-center gap-3 mb-4 p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">Creating takeoff workbook...</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">Setting up template with Setup + Library tabs. This takes 30-60 seconds.</p>
                  </div>
                </div>
              )}

              {/* Version tab bar removed (11B.10) — navigation via icon clicks */}

              {/* Context-Aware Actions removed (11B.12) — replaced by SheetRibbon in embedded sheet toolbar */}

              {/* Status cards removed (11B.11) */}

              {/* GC Contact */}
              <div className="bg-muted/30 rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground mb-2 font-medium">GC Contact</p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {selectedProject.gc_contact_name || 'Not set'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {selectedProject.gc_contact_phone || '-'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {selectedProject.gc_contact_email || '-'}
                  </span>
                </div>
              </div>

              {/* Stage Summary */}
              {folderBrief?.next_steps && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-xs text-primary font-medium mb-2">Next Steps</p>
                  <ul className="space-y-1">
                    {folderBrief.next_steps.map((step, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <ArrowRight className="w-3 h-3 text-primary" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Center Horizontal Divider */}
          <div
            onMouseDown={(e) => handleDragStart('center-h', e)}
            className={cn(
              "h-1 flex-shrink-0 bg-border hover:bg-primary/50 cursor-row-resize transition-colors flex items-center justify-center",
              isDragging === 'center-h' && "bg-primary"
            )}
          >
            <GripHorizontal className="w-6 h-3 text-muted-foreground/50" />
          </div>

          {/* Center Bottom - Communication Summaries + Folder Agent Chat */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Communication Summaries */}
            <div className="flex-shrink-0 max-h-[200px] overflow-auto border-b border-border p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Communication Summary
              </h3>
              {commSummaries.length > 0 ? (
                <div className="space-y-2">
                  {commSummaries.map((comm, i) => (
                    <div key={i} className="flex items-start gap-3 p-2 bg-muted/30 rounded-lg">
                      {getCommIcon(comm.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{comm.summary}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatDate(comm.date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No communications logged yet</p>
              )}
            </div>

            {/* Folder Agent Chat */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-2 border-b border-border bg-primary/5 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Folder className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-medium">Folder Agent</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-6">
                    <Bot className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Ask me about this project folder
                    </p>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex gap-2",
                          msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Folder className="w-3 h-3 text-primary" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] px-3 py-2 rounded-lg text-sm",
                            msg.role === 'user'
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex gap-2 items-center">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <Loader2 className="w-3 h-3 text-primary animate-spin" />
                        </div>
                        <div className="bg-muted px-3 py-2 rounded-lg">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              <div className="px-3 py-2 border-t border-border bg-card/50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                    placeholder="Ask the folder agent..."
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Folder className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Select a project</p>
            <p className="text-sm mt-1">Choose from the list on the left</p>
          </div>
        </div>
      )}

      {/* Right Divider */}
      {selectedProject && (
        <div
          onMouseDown={(e) => handleDragStart('right', e)}
          className={cn(
            "w-1 flex-shrink-0 bg-border hover:bg-primary/50 cursor-col-resize transition-colors",
            isDragging === 'right' && "bg-primary"
          )}
        />
      )}

      {/* ============ RIGHT PANEL ============ */}
      {selectedProject && (
        <div
          style={{ width: rightPanelWidth }}
          className="flex-shrink-0 flex flex-col border-l border-border bg-card"
        >
          {/* Right Top - Folder Brief / Preview */}
          <div style={{ height: rightTopHeight }} className="flex-shrink-0 overflow-auto border-b border-border">
            {previewDoc ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
                  <span className="text-sm font-medium">{previewDoc.name}</span>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 flex items-center justify-center bg-muted/20">
                  <div className="text-center text-muted-foreground">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Preview: {previewDoc.name}</p>
                    <p className="text-xs mt-1">PDF viewer will be here</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Project Intelligence
                </h3>

                {/* Stats */}
                {folderBrief?.stats && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold">{folderBrief.stats.emails}</p>
                      <p className="text-xs text-muted-foreground">Emails</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold">{folderBrief.stats.calls}</p>
                      <p className="text-xs text-muted-foreground">Calls</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2 text-center">
                      <p className="text-lg font-semibold">{folderBrief.stats.meetings}</p>
                      <p className="text-xs text-muted-foreground">Meetings</p>
                    </div>
                  </div>
                )}

                {/* Key Info */}
                <div className="space-y-3">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-yellow-600 mb-1">Stage</p>
                    <p className="text-sm">{STATUS_CONFIG[selectedProject.estimate_status]?.label || 'Draft'}</p>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                    <p className="text-xs font-medium text-blue-600 mb-1">Last Activity</p>
                    <p className="text-sm">{folderBrief?.last_activity ? formatDate(folderBrief.last_activity) : 'No activity'}</p>
                  </div>

                  {selectedProject.proposal_total && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-green-600 mb-1">Proposal Amount</p>
                      <p className="text-sm font-semibold">{formatCurrency(selectedProject.proposal_total)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Horizontal Divider */}
          <div
            onMouseDown={(e) => handleDragStart('right-h', e)}
            className={cn(
              "h-1 flex-shrink-0 bg-border hover:bg-primary/50 cursor-row-resize transition-colors flex items-center justify-center",
              isDragging === 'right-h' && "bg-primary"
            )}
          >
            <GripHorizontal className="w-6 h-3 text-muted-foreground/50" />
          </div>

          {/* Right Bottom - Folder Files */}
          <div className="flex-1 overflow-auto p-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Folder className="w-4 h-4" />
              Project Files
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {folderFiles.map((file, i) => (
                <button
                  key={i}
                  onClick={() => setPreviewDoc(file)}
                  className="flex items-center gap-2 p-2.5 bg-muted/50 hover:bg-muted rounded-lg text-left transition-colors"
                >
                  {getFileIcon(file.type)}
                  <span className="text-sm truncate flex-1">{file.name}</span>
                </button>
              ))}
            </div>

            {folderFiles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No files in this folder
              </p>
            )}
          </div>
        </div>
      )}

      {/* ============ MODALS ============ */}


      {/* Embedded Google Sheet Modal (Step 8.B.6) */}
      {showEmbeddedSheet && embeddedSheetId && (
        <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
          <SheetRibbon
            projectName={selectedProject?.project_name}
            tabName={selectedVersionTab === 'Setup' ? 'Setup' : currentSheetName}
            embeddedSheetId={embeddedSheetId}
            selectedVersionTab={selectedVersionTab}
            versions={versions}
            creatingVersion={creatingVersion}
            generatingBtx={generatingBtx}
            onBack={() => {
              setShowEmbeddedSheet(false)
              setEmbeddedSheetUrl(null)
            }}
            onGenerateBtx={handleGenerateBtx}
            onOpenToolManager={(view) => {
              setToolManagerInitialView(view)
              setShowToolManager(true)
            }}
            onCreateVersion={handleCreateVersion}
            onImportCsv={() => setShowUploadModal(true)}
            onImportHistory={() => setShowImportHistory(true)}
            onCreateProposal={() => setShowProposalPreview(true)}
            onSetDefault={(sheetName) => {
              // Set the version as active/default
              setVersions(prev => prev.map(v => ({
                ...v,
                active: v.sheetName === sheetName,
              })))
              if (selectedProject) {
                fetch(`/api/ko/takeoff/${selectedProject.project_id}/versions`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sheetName, setActive: true }),
                }).catch(err => {
                  console.warn('Failed to set default version:', err)
                  loadVersions(selectedProject.project_id)
                })
              }
            }}
          />
          <div className="flex-1 relative">
            <iframe
              src={embeddedSheetUrl}
              className="absolute inset-0 w-full h-full border-0"
              allow="clipboard-read; clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadModal
          project={selectedProject}
          sheetName={currentSheetName}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false)
            if (embeddedSheetId) {
              if (!embeddedSheetUrl) {
                setEmbeddedSheetUrl(`https://docs.google.com/spreadsheets/d/${embeddedSheetId}/edit?embedded=true&rm=minimal`)
              }
              setShowEmbeddedSheet(true)
            }
          }}
        />
      )}

      {/* Import History Modal (4C.1) */}
      {showImportHistory && selectedProject && (
        <ImportHistoryModal
          project={selectedProject}
          onClose={() => setShowImportHistory(false)}
        />
      )}

      {/* Proposal Preview Modal (Step 8.C.10 + 8.D) */}
      {showProposalPreview && selectedProject && (
        <TakeoffProposalPreview
          projectId={selectedProject.project_id}
          sheetName={currentSheetName}
          onClose={() => setShowProposalPreview(false)}
          onGeneratePdf={(data) => {
            console.log('Document generated:', data)
            // Document was generated and downloaded
            // If saved to Drive, data includes driveFileId and driveFileUrl
            if (data.driveFileUrl) {
              console.log('Saved to Drive:', data.driveFileUrl)
            }
          }}
        />
      )}

      {/* New Version Dialog (VF-3.4) */}
      {showNewVersionDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">New Version</h2>
              <button
                onClick={() => setShowNewVersionDialog(false)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Mode selection */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Create from:</p>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <input
                    type="radio"
                    name="versionMode"
                    checked={newVersionMode === 'duplicate'}
                    onChange={() => setNewVersionMode('duplicate')}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Duplicate {currentSheetName || 'current version'}</p>
                    <p className="text-xs text-muted-foreground">Copy all items, locations, and quantities</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <input
                    type="radio"
                    name="versionMode"
                    checked={newVersionMode === 'blank'}
                    onChange={() => setNewVersionMode('blank')}
                    className="accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Blank from template</p>
                    <p className="text-xs text-muted-foreground">Start fresh with items and locations only</p>
                  </div>
                </label>
              </div>

              {/* Make active checkbox */}
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newVersionMakeActive}
                  onChange={(e) => setNewVersionMakeActive(e.target.checked)}
                  className="accent-primary"
                />
                <div>
                  <p className="text-sm font-medium">Make this the operational version</p>
                  <p className="text-xs text-muted-foreground">Sets the green dot and uses this for proposals</p>
                </div>
              </label>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowNewVersionDialog(false)}
                  className="flex-1 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCreateVersion}
                  disabled={creatingVersion}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-lg text-sm"
                >
                  {creatingVersion ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {creatingVersion ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BTX Summary Dialog (Phase 3 — 3.3) */}
      {btxSummary && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Generate BTX Tools</h2>
              <button
                onClick={handleBtxCancel}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="text-center space-y-2">
                <p className="text-3xl font-bold text-primary">{btxSummary.toolCount}</p>
                <p className="text-sm text-muted-foreground">
                  {btxSummary.items} items &times; {btxSummary.locations} locations
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Locations</p>
                <div className="flex flex-wrap gap-1.5">
                  {btxSummary.locationNames.map((name, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                      {name}
                    </span>
                  ))}
                </div>
              </div>

              {btxSummary.itemsWithoutTools > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-xs text-yellow-400">
                    {btxSummary.itemsWithoutTools} item{btxSummary.itemsWithoutTools > 1 ? 's' : ''} missing Bluebeam tools — will be skipped by Python backend
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleBtxCancel}
                  className="flex-1 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBtxConfirm}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm"
                >
                  <Download className="w-4 h-4" />
                  Download BTX
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bluebeam Tool Manager */}
      <BluebeamToolManager
        isOpen={showToolManager}
        onClose={() => { setShowToolManager(false); setToolManagerInitialView(null) }}
        initialView={toolManagerInitialView}
      />

      {/* Add Item Modal */}
      <AddItemModal isOpen={showAddItem} onClose={() => setShowAddItem(false)} />

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">New Project</h2>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="p-1 hover:bg-muted rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Project Name *</label>
                <input
                  type="text"
                  value={newProject.project_name}
                  onChange={(e) => setNewProject({ ...newProject, project_name: e.target.value })}
                  placeholder="e.g., 123 Main Street"
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">GC Name *</label>
                <input
                  type="text"
                  value={newProject.gc_name}
                  onChange={(e) => setNewProject({ ...newProject, gc_name: e.target.value })}
                  placeholder="e.g., B Management"
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Address</label>
                <input
                  type="text"
                  value={newProject.address}
                  onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                  placeholder="Full address"
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Due Date</label>
                  <input
                    type="date"
                    value={newProject.due_date}
                    onChange={(e) => setNewProject({ ...newProject, due_date: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority</label>
                  <select
                    value={newProject.priority}
                    onChange={(e) => setNewProject({ ...newProject, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleSaveNewProject}
                disabled={!newProject.project_name || !newProject.gc_name || savingProject}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {savingProject ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingProject ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Upload Modal Component
function UploadModal({ project, sheetName, onClose, onSuccess }) {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [unmatchedAssignments, setUnmatchedAssignments] = useState({})
  const [reImporting, setReImporting] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUnmatchedAssignments({})
    try {
      const content = await file.text()

      const res = await fetch(`/api/ko/takeoff/${project.project_id}/bluebeam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_content: content,
          tab_name: null,
          sheet_name: sheetName || undefined
        })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setResult({
          success: true,
          message: `Imported ${data.items_parsed} items, updated ${data.cells_updated} cells`,
          accumulated: data.accumulated || false,
          accumulatedCount: data.accumulatedCount || 0,
          matchedItems: data.matchedItems || [],
          unmatchedItems: data.unmatchedItems || [],
          errors: data.errors || [],
          cellsPopulated: data.cellsPopulated || 0,
          csvFile: data.csvFile || null
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to process file'
        })
      }
    } catch (err) {
      setResult({
        success: false,
        message: 'Error: ' + err.message
      })
    } finally {
      setUploading(false)
    }
  }

  // Re-import unmatched items with user-assigned locations
  const handleAcceptSelected = async () => {
    const assignable = (result?.unmatchedItems || []).filter(
      (item, i) => item.unmatchType === 'NO_COLUMN_MAPPING' && unmatchedAssignments[i]
    )
    if (assignable.length === 0) return

    setReImporting(true)
    try {
      // Build CSV content for the reassigned items (pipe-delimited format)
      const csvLines = ['Subject,Measurement']
      for (const item of assignable) {
        const idx = result.unmatchedItems.indexOf(item)
        const newLocation = unmatchedAssignments[idx]
        csvLines.push(`"${item.raw_name} | ${newLocation}",${item.quantity}`)
      }

      const res = await fetch(`/api/ko/takeoff/${project.project_id}/bluebeam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_content: csvLines.join('\n'),
          sheet_name: sheetName || undefined
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        // Merge re-import results
        setResult(prev => ({
          ...prev,
          message: `${prev.message} + ${data.cells_updated} reassigned`,
          matchedItems: [...(prev.matchedItems || []), ...(data.matchedItems || [])],
          unmatchedItems: (prev.unmatchedItems || []).filter(
            (_, i) => !unmatchedAssignments[i]
          ),
          cellsPopulated: (prev.cellsPopulated || 0) + (data.cellsPopulated || 0)
        }))
        setUnmatchedAssignments({})
      }
    } catch (err) {
      console.error('Re-import failed:', err)
    } finally {
      setReImporting(false)
    }
  }

  const reassignableCount = (result?.unmatchedItems || []).filter(
    (item, i) => item.unmatchType === 'NO_COLUMN_MAPPING' && unmatchedAssignments[i]
  ).length

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Upload Bluebeam CSV</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {result ? (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <span className={result.success ? 'text-green-500' : 'text-red-500'}>
                  {result.success ? 'Import Complete' : 'Error'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-1">{result.message}</p>

              {/* Accumulation indicator */}
              {result.accumulated && (
                <p className="text-xs text-blue-400 mb-3">
                  {result.accumulatedCount} cell(s) had existing values — quantities were added, not overwritten
                </p>
              )}

              {/* Matched items with accumulation details */}
              {result.matchedItems?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-green-500 mb-1">Matched ({result.matchedItems.length})</p>
                  <div className="max-h-40 overflow-auto space-y-0.5">
                    {result.matchedItems.map((item, i) => (
                      <div key={i} className="text-xs text-muted-foreground flex justify-between gap-2">
                        <span className="truncate">{item.item_id} @ {item.location}</span>
                        <span className="whitespace-nowrap">
                          {item.previousValue > 0
                            ? `${item.previousValue} + ${item.quantity} = ${item.accumulatedTotal}`
                            : `${item.quantity}`
                          }
                          {item.cell && <span className="text-muted-foreground/50 ml-1">[{item.cell}]</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmatched items with location reassignment */}
              {result.unmatchedItems?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-yellow-500 mb-1">Unmatched ({result.unmatchedItems.length})</p>
                  <div className="max-h-48 overflow-auto space-y-1.5">
                    {result.unmatchedItems.map((item, i) => (
                      <div key={i} className="text-xs p-2 rounded bg-yellow-500/5 border border-yellow-500/10">
                        <div className="flex justify-between items-start">
                          <span className="font-medium">{item.raw_name}</span>
                          <span className="text-muted-foreground">qty: {item.quantity}</span>
                        </div>
                        <p className="text-yellow-500/70 mt-0.5">{item.reason}</p>
                        {/* Location reassignment dropdown for NO_COLUMN_MAPPING */}
                        {item.unmatchType === 'NO_COLUMN_MAPPING' && item.availableLocations?.length > 0 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-muted-foreground">Assign to:</span>
                            <select
                              value={unmatchedAssignments[i] || ''}
                              onChange={(e) => setUnmatchedAssignments(prev => ({ ...prev, [i]: e.target.value }))}
                              className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs"
                            >
                              <option value="">Skip</option>
                              {item.availableLocations.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Accept Selected button */}
                  {reassignableCount > 0 && (
                    <button
                      onClick={handleAcceptSelected}
                      disabled={reImporting}
                      className="mt-2 w-full py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/30 text-yellow-500 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
                    >
                      {reImporting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : null}
                      Accept {reassignableCount} Reassigned Item{reassignableCount !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              )}

              {/* Errors */}
              {result.errors?.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-medium text-red-500 mb-1">Warnings</p>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-500/70">{err.message}</p>
                  ))}
                </div>
              )}

              {/* Cells populated summary */}
              {result.cellsPopulated > 0 && (
                <p className="text-xs text-muted-foreground border-t border-border pt-2">
                  {result.cellsPopulated} cells populated in sheet
                  {result.csvFile && (
                    <span className="ml-2 text-blue-400">CSV saved to Drive</span>
                  )}
                </p>
              )}

              {result.success && (
                <button
                  onClick={onSuccess}
                  className="mt-3 w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm"
                >
                  View Takeoff Sheet
                </button>
              )}
              <button
                onClick={() => { setResult(null); setUnmatchedAssignments({}) }}
                className="mt-2 w-full py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm"
              >
                Upload Another
              </button>
            </div>
          ) : (
            <>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
                ) : (
                  <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                )}
                <p className="text-sm font-medium">
                  {uploading ? 'Processing...' : 'Click to upload CSV'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Values will be added to existing quantities
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ImportHistoryModal({ project, onClose }) {
  const [imports, setImports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadImports() {
      try {
        const res = await fetch(`/api/ko/takeoff/${project.project_id}/imports`)
        const data = await res.json()
        if (res.ok) {
          setImports(data.imports || [])
        } else {
          setError(data.error || 'Failed to load')
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    loadImports()
  }, [project.project_id])

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">Import History</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : imports.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No imports yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {imports.map((imp) => (
                <div key={imp.import_id} className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {imp.target_sheet || 'Default sheet'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      imp.status === 'completed' ? 'bg-green-500/10 text-green-500' :
                      imp.status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                      'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {imp.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{new Date(imp.imported_at).toLocaleString()}</span>
                    <span>{imp.import_type}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs">
                    <span className="text-green-500">{imp.items_matched} matched</span>
                    {imp.items_unmatched > 0 && (
                      <span className="text-yellow-500">{imp.items_unmatched} unmatched</span>
                    )}
                    <span className="text-muted-foreground">{imp.cells_populated} cells</span>
                    {imp.accumulation_mode === 'accumulate' && (
                      <span className="text-blue-400">accumulated</span>
                    )}
                  </div>
                  {imp.csv_file_id && (
                    <a
                      href={`https://drive.google.com/file/d/${imp.csv_file_id}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View CSV in Drive
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
