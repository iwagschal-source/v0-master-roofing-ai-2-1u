"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Search,
  Calculator,
  Upload,
  Plus,
  Clock,
  Building2,
  ChevronRight,
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
  DollarSign,
  Calendar,
  Download
} from "lucide-react"
import { GCBrief } from "./gc-brief"
import { TakeoffSpreadsheet } from "./takeoff-spreadsheet"
import { TakeoffSetupScreen } from "./takeoff-setup-screen"
import { cn } from "@/lib/utils"

// Mock data for development - will be replaced with API calls
const MOCK_PROJECTS = [
  {
    project_id: "b01c9f28d8acb8f17c8fdcf2003c1ce5",
    project_name: "1086 Dumont Ave",
    gc_name: "B Management",
    proposal_total: 383071,
    takeoff_total: 380000,
    estimate_status: "in_progress",
    assigned_to: "Steve",
    due_date: "2026-01-20",
    priority: "high",
    has_takeoff: true,
    has_proposal: true
  },
  {
    project_id: "6267cd7a1cc37be59b278b7d23892520",
    project_name: "253 Empire Blvd",
    gc_name: "MJH Construction",
    proposal_total: 156000,
    takeoff_total: 152000,
    estimate_status: "draft",
    assigned_to: "Steve",
    due_date: "2026-01-18",
    priority: "urgent",
    has_takeoff: true,
    has_proposal: false
  },
  {
    project_id: "abc123def456789",
    project_name: "960 Franklin Ave",
    gc_name: "Mega Contracting",
    proposal_total: 892500,
    takeoff_total: 890000,
    estimate_status: "submitted",
    assigned_to: "Mike",
    due_date: "2026-01-15",
    priority: "normal",
    has_takeoff: true,
    has_proposal: true
  },
  {
    project_id: "def456ghi789012",
    project_name: "445 Park Place",
    gc_name: "B Management",
    proposal_total: 245000,
    takeoff_total: 240000,
    estimate_status: "won",
    assigned_to: "Steve",
    due_date: "2026-01-10",
    priority: "normal",
    has_takeoff: true,
    has_proposal: true
  },
  {
    project_id: "ghi789jkl012345",
    project_name: "889 Bushwick Ave",
    gc_name: "Bushwick Partners",
    proposal_total: 178500,
    takeoff_total: null,
    estimate_status: "draft",
    assigned_to: "Mike",
    due_date: "2026-01-22",
    priority: "normal",
    has_takeoff: false,
    has_proposal: false
  },
  {
    project_id: "jkl012mno345678",
    project_name: "625 Fulton St",
    gc_name: "Prestige Builders",
    proposal_total: 520000,
    takeoff_total: 515000,
    estimate_status: "review",
    assigned_to: "Steve",
    due_date: "2026-01-19",
    priority: "high",
    has_takeoff: true,
    has_proposal: true
  }
]

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-500", textColor: "text-gray-400" },
  in_progress: { label: "In Progress", color: "bg-yellow-500", textColor: "text-yellow-400" },
  review: { label: "Review", color: "bg-blue-500", textColor: "text-blue-400" },
  submitted: { label: "Submitted", color: "bg-purple-500", textColor: "text-purple-400" },
  won: { label: "Won", color: "bg-green-500", textColor: "text-green-400" },
  lost: { label: "Lost", color: "bg-red-500", textColor: "text-red-400" }
}

export function EstimatingCenterScreen({ onSelectProject, onBack }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [showTakeoffSheet, setShowTakeoffSheet] = useState(false)
  const [showTakeoffSetup, setShowTakeoffSetup] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const fileInputRef = useRef(null)
  const projectListRef = useRef(null)

  // Excel export state
  const [exportingExcel, setExportingExcel] = useState(false)

  // Historical rates toggle
  const [useHistoricalRates, setUseHistoricalRates] = useState(true)

  // Chat state
  const [chatHeight, setChatHeight] = useState(280)
  const [isDragging, setIsDragging] = useState(false)
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const containerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)

  const minChatHeight = 150
  const maxChatHeight = 500

  // New project form state
  const [newProject, setNewProject] = useState({
    project_name: "",
    gc_name: "",
    address: "",
    due_date: "",
    priority: "normal",
    assigned_to: "Steve"
  })
  const [savingProject, setSavingProject] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  // Reset chat when project changes
  useEffect(() => {
    setMessages([])
    setChatInput("")
  }, [selectedProject?.project_id])

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ko/estimating')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      } else {
        setProjects(MOCK_PROJECTS)
      }
    } catch (err) {
      console.log("Failed to fetch projects, using mock data:", err)
      setProjects(MOCK_PROJECTS)
    } finally {
      setLoading(false)
    }
  }

  // Export Bluebeam data to Excel (MR Template)
  const handleExportExcel = async (templateData, csvContent = null) => {
    if (!templateData && !csvContent) return
    setExportingExcel(true)

    try {
      const projectName = selectedProject?.project_name || 'Takeoff'
      const res = await fetch('/api/ko/bluebeam/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_content: csvContent,
          template_data: templateData,
          project_name: projectName,
          gc_name: selectedProject?.gc_name || null
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to generate Excel')
      }

      // Download the file
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_Takeoff.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
      return true
    } catch (err) {
      console.error('Export Excel error:', err)
      alert('Error exporting Excel: ' + err.message)
      return false
    } finally {
      setExportingExcel(false)
    }
  }

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    startYRef.current = e.clientY
    startHeightRef.current = chatHeight
  }, [chatHeight])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    const delta = startYRef.current - e.clientY
    const newHeight = Math.min(maxChatHeight, Math.max(minChatHeight, startHeightRef.current + delta))
    setChatHeight(newHeight)
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

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

  // Stats for all projects
  const stats = {
    total: projects.length,
    pending: projects.filter(p => p.estimate_status === "draft").length,
    inProgress: projects.filter(p => p.estimate_status === "in_progress").length,
    review: projects.filter(p => p.estimate_status === "review").length,
    submitted: projects.filter(p => p.estimate_status === "submitted").length
  }

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

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    setUploadResult(null)

    try {
      const content = await file.text()
      const res = await fetch('/api/ko/bluebeam/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_content: content,
          project_name: selectedProject?.project_name || file.name.replace('.csv', ''),
          gc_name: selectedProject?.gc_name || null,
          use_historical_rates: useHistoricalRates
        })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setUploadResult({
          success: true,
          summary: data.summary,
          items: data.items,
          template_data: data.template_data,
          csvContent: content,  // Keep CSV for Excel export
          rateSource: data.rate_source,
          historicalRatesUsed: data.summary?.historical_rates_used || 0,
          formatDetected: data.format_detected,  // 'protocol' or 'legacy'
          unmatched: data.unmatched || [],       // items that didn't match known codes
          bySection: data.by_section,            // roofing/balconies/exterior breakdown
          source: data.source,                   // 'backend' or 'local'
          message: `Processed ${data.summary?.total_items || 0} items`
        })
      } else {
        setUploadResult({
          success: false,
          message: data.error || 'Failed to process file'
        })
      }
    } catch (err) {
      setUploadResult({
        success: false,
        message: 'Error uploading file: ' + err.message
      })
    } finally {
      setUploadingFile(false)
    }
  }

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading || !selectedProject) return

    const userMessage = chatInput.trim()
    setChatInput("")
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setChatLoading(true)

    try {
      const response = await fetch('/api/ko/estimator-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          gcName: selectedProject.gc_name,
          projectName: selectedProject.project_name,
          history: messages.slice(-6)
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Based on the data for ${selectedProject.gc_name}, I can help answer questions about their pricing history, bundling preferences, negotiation patterns, and more. What would you like to know?`
      }])
    } finally {
      setChatLoading(false)
    }
  }

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

  const suggestions = [
    "What's their typical roofing system?",
    "Preferred coping material?",
    "Any payment issues?",
    "Best pricing strategy?",
  ]

  return (
    <div className="flex h-full bg-background">
      {/* LEFT PANEL - Project List */}
      <div className="w-[400px] flex-shrink-0 flex flex-col border-r border-border">
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calculator className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">Estimating Center</h1>
                <p className="text-xs text-muted-foreground">{stats.total} projects</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadProjects}
                disabled={loading}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Upload Bluebeam"
              >
                <Upload className="w-4 h-4" />
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
              placeholder="Search projects, GCs..."
              className="w-full pl-10 pr-4 py-2.5 bg-muted border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'draft', label: 'Draft', color: 'bg-gray-500' },
              { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-500' },
              { value: 'review', label: 'Review', color: 'bg-blue-500' },
              { value: 'submitted', label: 'Submitted', color: 'bg-purple-500' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                  statusFilter === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.color && <div className={`w-2 h-2 rounded-full ${opt.color}`} />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project List */}
        <div ref={projectListRef} className="flex-1 overflow-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <FileSpreadsheet className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No projects found</p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-primary text-xs mt-2 hover:underline">
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedProjects.map((project, index) => {
                const status = STATUS_CONFIG[project.estimate_status] || STATUS_CONFIG.draft
                const isSelected = selectedProject?.project_id === project.project_id

                return (
                  <button
                    key={project.project_id}
                    onClick={() => setSelectedProject(project)}
                    style={{
                      animationDelay: `${index * 30}ms`,
                      animation: "fadeInUp 0.3s ease-out forwards",
                      opacity: 0,
                    }}
                    className={cn(
                      "w-full group relative bg-card rounded-xl p-4 text-left transition-all duration-200 hover:scale-[1.01] border hover:shadow-lg",
                      isSelected
                        ? "border-primary/50 bg-primary/5 shadow-md"
                        : "border-border/50 hover:border-primary/20"
                    )}
                  >
                    {/* Active indicator line */}
                    <div className={cn(
                      "absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full transition-all",
                      isSelected ? "bg-primary opacity-100" : "bg-primary opacity-0 group-hover:opacity-50"
                    )} />

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 pl-2">
                        {/* Project Name */}
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground truncate">
                            {project.project_name}
                          </h3>
                          {project.priority === "urgent" && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-500/20 text-red-400 rounded">
                              URGENT
                            </span>
                          )}
                          {project.priority === "high" && (
                            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-500/20 text-orange-400 rounded">
                              HIGH
                            </span>
                          )}
                        </div>

                        {/* GC Name */}
                        <p className="text-muted-foreground text-sm truncate mb-2 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" />
                          {project.gc_name || "No GC assigned"}
                        </p>

                        {/* Bottom row */}
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5 text-green-500" />
                            {formatCurrency(project.proposal_total).replace('$', '')}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(project.due_date)}
                          </span>
                        </div>
                      </div>

                      {/* Status + Arrow */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${status.color}`} />
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            {status.label}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL - Emails + Chat */}
      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
        {selectedProject ? (
          <>
            {/* Project Header with Actions */}
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedProject.project_name}</h2>
                <p className="text-sm text-muted-foreground">{selectedProject.gc_name} • {formatCurrency(selectedProject.proposal_total)}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Upload Bluebeam button */}
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Bluebeam
                </button>
                <button
                  onClick={() => setShowTakeoffSetup(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm transition-colors"
                >
                  <Calculator className="w-4 h-4" />
                  Setup Takeoff
                </button>
                <button
                  onClick={() => setShowTakeoffSheet(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-sm transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  View Takeoff
                </button>
                <button
                  onClick={() => {
                    const proposalUrl = `/proposal-preview?projectId=${selectedProject.project_id}&gcName=${encodeURIComponent(selectedProject.gc_name)}&projectName=${encodeURIComponent(selectedProject.project_name)}`
                    window.open(proposalUrl, '_blank')
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Proposal
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Takeoff Setup Wizard */}
            {showTakeoffSetup && (
              <TakeoffSetupScreen
                projectId={selectedProject.project_id}
                projectName={selectedProject.project_name}
                gcName={selectedProject.gc_name}
                onClose={() => setShowTakeoffSetup(false)}
                onComplete={(config) => {
                  setShowTakeoffSetup(false)
                  setShowTakeoffSheet(true) // Open spreadsheet after setup
                }}
              />
            )}

            {/* GCS-based Takeoff Spreadsheet */}
            {showTakeoffSheet && !showTakeoffSetup && (
              <TakeoffSpreadsheet
                projectId={selectedProject.project_id}
                projectName={selectedProject.project_name}
                onClose={() => setShowTakeoffSheet(false)}
                onEditSetup={() => {
                  setShowTakeoffSheet(false)
                  setShowTakeoffSetup(true)
                }}
              />
            )}

            {/* GC Brief - Top Section */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="p-4">
                <GCBrief
                  gcName={selectedProject.gc_name}
                  projectName={selectedProject.project_name}
                  className="border-0 rounded-none"
                />
              </div>
            </div>

            {/* Draggable Divider */}
            <div
              onMouseDown={handleMouseDown}
              className={cn(
                "h-1.5 flex-shrink-0 bg-border hover:bg-primary/50 cursor-row-resize transition-colors relative group flex items-center justify-center",
                isDragging && "bg-primary"
              )}
            >
              <div className="absolute -top-2 -bottom-2 left-0 right-0" />
              <GripHorizontal className="w-6 h-4 text-foreground-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Chat Section - Bottom */}
            <div
              style={{ height: chatHeight }}
              className="flex-shrink-0 flex flex-col bg-background border-t border-border"
            >
              {/* Chat Header */}
              <div className="px-4 py-2 border-b border-border bg-primary/5 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-medium">Estimator Assistant</span>
                <span className="text-xs text-muted-foreground">• Ask about {selectedProject.gc_name}</span>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="text-center py-4">
                    <Bot className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Ask me anything about {selectedProject.gc_name}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => setChatInput(s)}
                          className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 text-foreground rounded-full transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex gap-2",
                          msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-3 h-3 text-primary" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[85%] px-3 py-2 rounded-lg text-sm",
                            msg.role === 'user'
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground"
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
                        <div className="bg-secondary px-3 py-2 rounded-lg">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
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
                    placeholder={`Ask about ${selectedProject.gc_name}...`}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || chatLoading}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Select a project</p>
              <p className="text-sm mt-1">Choose a project from the left to view GC brief and chat</p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Upload Bluebeam Export</h2>
              <button
                onClick={() => { setShowUploadModal(false); setUploadResult(null) }}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {uploadResult ? (
                <div className={`p-4 rounded-lg ${uploadResult.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {uploadResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                    <span className={uploadResult.success ? 'text-green-400' : 'text-red-400'}>
                      {uploadResult.success ? 'Success!' : 'Error'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{uploadResult.message}</p>
                  {uploadResult.summary && (
                    <div className="mt-3 pt-3 border-t border-border text-sm space-y-1">
                      <p>Items: {uploadResult.summary.total_items}</p>
                      <p>Estimated: {formatCurrency(uploadResult.summary.estimated_cost)}</p>
                      {uploadResult.formatDetected && (
                        <p className="text-muted-foreground flex items-center gap-1">
                          Format: {uploadResult.formatDetected === 'protocol' ? 'Protocol (CODE | LOC)' : 'Legacy'}
                          {uploadResult.source === 'backend' && <span className="text-xs opacity-60">via backend</span>}
                        </p>
                      )}
                      {uploadResult.rateSource === 'historical' && (
                        <p className="text-blue-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {uploadResult.historicalRatesUsed} items with historical rates
                        </p>
                      )}
                      {uploadResult.unmatched?.length > 0 && (
                        <p className="text-yellow-400 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {uploadResult.unmatched.length} unrecognized items (will appear in red)
                        </p>
                      )}
                    </div>
                  )}
                  {uploadResult.success && (
                    <div className="mt-4 space-y-2">
                      <button
                        onClick={async () => {
                          const success = await handleExportExcel(uploadResult.template_data, uploadResult.csvContent)
                          if (success) {
                            setUploadResult(prev => ({ ...prev, excelExported: true }))
                          }
                        }}
                        disabled={exportingExcel}
                        className="w-full py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {exportingExcel ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4" />
                        )}
                        {exportingExcel ? 'Generating Excel...' : 'Download Excel Takeoff'}
                      </button>
                      <button
                        onClick={() => {
                          setShowUploadModal(false)
                          setShowTakeoffSheet(true)
                        }}
                        className="w-full py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        View in App
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setUploadResult(null)}
                    className="mt-2 w-full py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
                  >
                    Upload Another
                  </button>
                </div>
              ) : (
                <>
                  {/* Historical rates toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4">
                    <div>
                      <p className="text-sm font-medium">Use Historical Rates</p>
                      <p className="text-xs text-muted-foreground">
                        Apply average rates from past projects
                        {selectedProject?.gc_name && ` (${selectedProject.gc_name})`}
                      </p>
                    </div>
                    <button
                      onClick={() => setUseHistoricalRates(!useHistoricalRates)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        useHistoricalRates ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          useHistoricalRates ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    {uploadingFile ? (
                      <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
                    ) : (
                      <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                    )}
                    <p className="text-sm font-medium">
                      {uploadingFile ? 'Processing...' : 'Click to upload CSV'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Bluebeam markup export (CSV format)
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground mt-4 text-center">
                    Export from Bluebeam: Markups &gt; Export &gt; CSV
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">New Project</h2>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
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
              <div>
                <label className="text-sm font-medium mb-1 block">Assigned To</label>
                <select
                  value={newProject.assigned_to}
                  onChange={(e) => setNewProject({ ...newProject, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="Steve">Steve</option>
                  <option value="Mike">Mike</option>
                </select>
              </div>
              <button
                onClick={handleSaveNewProject}
                disabled={!newProject.project_name || !newProject.gc_name || savingProject}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Animation Keyframes */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
