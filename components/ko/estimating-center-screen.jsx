"use client"

import { useState, useEffect, useRef } from "react"
import {
  Search,
  Calculator,
  Upload,
  Plus,
  Clock,
  DollarSign,
  Building2,
  ChevronRight,
  Filter,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  X
} from "lucide-react"

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

const PRIORITY_CONFIG = {
  urgent: { label: "Urgent", color: "text-red-400" },
  high: { label: "High", color: "text-orange-400" },
  normal: { label: "Normal", color: "text-muted-foreground" }
}

export function EstimatingCenterScreen({ onSelectProject, onBack }) {
  const [activeTab, setActiveTab] = useState("queue") // queue | all
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const fileInputRef = useRef(null)

  // Current estimator (would come from auth in production)
  const currentEstimator = "Steve"

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    setError(null)
    try {
      // Try to fetch from API
      const res = await fetch('/api/ko/estimating')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      } else {
        // Fallback to mock data
        console.log("API not available, using mock data")
        setProjects(MOCK_PROJECTS)
      }
    } catch (err) {
      console.log("Failed to fetch projects, using mock data:", err)
      setProjects(MOCK_PROJECTS)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter(project => {
    // Tab filter
    if (activeTab === "queue" && project.assigned_to !== currentEstimator) {
      return false
    }

    // Status filter
    if (statusFilter !== "all" && project.estimate_status !== statusFilter) {
      return false
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        project.project_name?.toLowerCase().includes(query) ||
        project.gc_name?.toLowerCase().includes(query)
      )
    }

    return true
  })

  // Sort by priority and due date
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2 }
    const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2)
    if (priorityDiff !== 0) return priorityDiff
    return new Date(a.due_date) - new Date(b.due_date)
  })

  // Calculate stats
  const myProjects = projects.filter(p => p.assigned_to === currentEstimator)
  const stats = {
    pending: myProjects.filter(p => p.estimate_status === "draft").length,
    inProgress: myProjects.filter(p => p.estimate_status === "in_progress").length,
    review: myProjects.filter(p => p.estimate_status === "review").length,
    submitted: myProjects.filter(p => p.estimate_status === "submitted").length
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
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
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
          project_name: file.name.replace('.csv', '')
        })
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setUploadResult({
          success: true,
          summary: data.summary,
          message: `Processed ${data.summary?.total_items || 0} items with ${data.summary?.total_measurements || 0} measurements`
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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">Estimating Center</h1>
              <p className="text-sm text-muted-foreground">
                {currentEstimator}'s workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Bluebeam
            </button>
            <button
              className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Project
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-500" />
            <span className="text-sm text-muted-foreground">Draft: {stats.pending}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-sm text-muted-foreground">In Progress: {stats.inProgress}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm text-muted-foreground">Review: {stats.review}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-purple-500" />
            <span className="text-sm text-muted-foreground">Submitted: {stats.submitted}</span>
          </div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "queue"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            My Queue
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Projects
          </button>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects or GCs..."
              className="w-full pl-10 pr-4 py-2 bg-muted border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-muted border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="submitted">Submitted</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
            <p>{error}</p>
          </div>
        ) : sortedProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <FileSpreadsheet className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No projects found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedProjects.map((project) => {
              const status = STATUS_CONFIG[project.estimate_status] || STATUS_CONFIG.draft
              const priority = PRIORITY_CONFIG[project.priority] || PRIORITY_CONFIG.normal

              return (
                <div
                  key={project.project_id}
                  onClick={() => onSelectProject?.(project)}
                  className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    {/* Status indicator */}
                    <div className={`w-1.5 h-12 rounded-full ${status.color}`} />

                    {/* Project info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground truncate">
                          {project.project_name}
                        </h3>
                        {project.priority === "urgent" && (
                          <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                            URGENT
                          </span>
                        )}
                        {project.priority === "high" && (
                          <span className="px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded">
                            HIGH
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5" />
                          {project.gc_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Due {formatDate(project.due_date)}
                        </span>
                        {activeTab === "all" && project.assigned_to && (
                          <span className="text-xs">
                            Assigned: {project.assigned_to}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Value and status */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-medium text-foreground">
                          {formatCurrency(project.proposal_total)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {project.has_takeoff && project.has_proposal ? (
                            <span className="text-green-400">Complete</span>
                          ) : project.has_takeoff ? (
                            <span className="text-yellow-400">Takeoff only</span>
                          ) : (
                            <span className="text-gray-400">No data</span>
                          )}
                        </div>
                      </div>

                      <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}/20 ${status.textColor}`}>
                        {status.label}
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              )
            })}
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
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadResult(null)
                }}
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
                    <div className="mt-3 pt-3 border-t border-border text-sm">
                      <p>Items: {uploadResult.summary.total_items}</p>
                      <p>Estimated: {formatCurrency(uploadResult.summary.estimated_cost)}</p>
                    </div>
                  )}
                  <button
                    onClick={() => setUploadResult(null)}
                    className="mt-4 w-full py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors"
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
    </div>
  )
}
