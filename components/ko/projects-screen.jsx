"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Search, Filter, RefreshCw, Loader2, Grid3X3, List, X, Upload, Download, CheckCircle, AlertCircle, CloudDownload, Users } from "lucide-react"
import Image from "next/image"
import { ProjectCard } from "./project-card"

// HubSpot/Asana aligned status options
const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses", color: null },
  { value: "new_lead", label: "New Lead", color: "bg-blue-500" },
  { value: "rfp_received", label: "RFP Received", color: "bg-indigo-500" },
  { value: "estimating", label: "Estimating", color: "bg-yellow-500" },
  { value: "proposal_pending", label: "Proposal Pending", color: "bg-orange-500" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-purple-500" },
  { value: "negotiation", label: "Negotiation", color: "bg-pink-500" },
  { value: "won", label: "Won", color: "bg-green-500" },
  { value: "lost", label: "Lost", color: "bg-red-500" },
  { value: "on_hold", label: "On Hold", color: "bg-gray-500" },
]

// Get status display info
const getStatusInfo = (status) => {
  const found = STATUS_OPTIONS.find(s => s.value === status)
  return found || { value: status, label: status, color: "bg-gray-400" }
}

export function ProjectsScreen({ onSelectProject, onBack }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const [gridView, setGridView] = useState(true)

  // Import state
  const [showImportModal, setShowImportModal] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileInputRef = useRef(null)

  // New project modal state
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    address: '',
    gc_name: '',
    amount: '',
    due_date: '',
    status: 'estimating',
  })
  const [creatingProject, setCreatingProject] = useState(false)

  // Asana sync state
  const [showAsanaSyncModal, setShowAsanaSyncModal] = useState(false)
  const [asanaSyncing, setAsanaSyncing] = useState(false)
  const [asanaSyncResult, setAsanaSyncResult] = useState(null)
  const [asanaTasks, setAsanaTasks] = useState([])
  const [asanaSections, setAsanaSections] = useState([])
  const [asanaLoading, setAsanaLoading] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/ko/projects")
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects || [])
      } else {
        throw new Error('Failed to load projects')
      }
    } catch (err) {
      console.error("Failed to load projects:", err)
      setError(err.message)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch BIDS tasks from Asana
  const fetchAsanaBids = async () => {
    setAsanaLoading(true)
    try {
      const response = await fetch('/api/asana/bids')
      if (response.ok) {
        const data = await response.json()
        setAsanaTasks(data.tasks || [])
        setAsanaSections(data.sections || [])
        return data
      } else {
        const error = await response.json()
        if (error.needsAuth) {
          throw new Error('NEEDS_AUTH')
        }
        throw new Error(error.error || 'Failed to fetch BIDS')
      }
    } catch (err) {
      console.error('Failed to fetch Asana BIDS:', err)
      throw err
    } finally {
      setAsanaLoading(false)
    }
  }

  // Import all BIDS from Asana
  const syncFromAsana = async () => {
    setAsanaSyncing(true)
    setAsanaSyncResult(null)
    try {
      const response = await fetch('/api/asana/bids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tasks: 'all',
          updateExisting: true,
          clearExisting: false
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setAsanaSyncResult({
          success: true,
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors || []
        })
        // Reload projects
        loadProjects()
      } else {
        setAsanaSyncResult({
          success: false,
          error: result.error || 'Sync failed'
        })
      }
    } catch (err) {
      console.error('Asana sync error:', err)
      setAsanaSyncResult({
        success: false,
        error: err.message || 'Failed to sync from Asana'
      })
    } finally {
      setAsanaSyncing(false)
    }
  }

  // Open Asana sync modal and fetch preview
  const handleAsanaSyncClick = async () => {
    setShowAsanaSyncModal(true)
    setAsanaSyncResult(null)
    try {
      await fetchAsanaBids()
    } catch (err) {
      if (err.message === 'NEEDS_AUTH') {
        setAsanaSyncResult({
          success: false,
          error: 'Not connected to Asana. Please connect first.',
          needsAuth: true
        })
      } else {
        setAsanaSyncResult({
          success: false,
          error: err.message
        })
      }
    }
  }

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchQuery ||
      project.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.gc_name?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || project.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleProjectClick = (project) => {
    if (onSelectProject) {
      onSelectProject(project)
    }
  }

  // CSV Import handlers
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      setImportResult({ success: false, error: 'Please select a CSV file' })
      setShowImportModal(true)
      return
    }

    setImporting(true)
    setImportResult(null)
    setShowImportModal(true)

    try {
      const csvContent = await file.text()

      const response = await fetch('/api/ko/projects/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvContent,
          options: { skipDuplicates: true, updateExisting: false }
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setImportResult({
          success: true,
          imported: result.imported,
          updated: result.updated,
          skipped: result.skipped,
          errors: result.errors || [],
        })
        // Reload projects
        loadProjects()
      } else {
        setImportResult({
          success: false,
          error: result.error || 'Import failed',
        })
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportResult({
        success: false,
        error: error.message || 'Failed to import projects',
      })
    } finally {
      setImporting(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDownloadTemplate = () => {
    window.open('/api/ko/projects/import', '_blank')
  }

  // New project handlers
  const handleNewProjectSubmit = async (e) => {
    e.preventDefault()

    if (!newProjectForm.name.trim()) {
      alert('Project name is required')
      return
    }

    setCreatingProject(true)

    try {
      const response = await fetch('/api/ko/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProjectForm,
          amount: parseFloat(newProjectForm.amount) || 0,
          createSheet: true, // Auto-create Google Sheet
        }),
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setShowNewProjectModal(false)
        setNewProjectForm({
          name: '',
          address: '',
          gc_name: '',
          amount: '',
          due_date: '',
          status: 'estimating',
        })
        loadProjects()
      } else {
        alert(result.error || 'Failed to create project')
      }
    } catch (error) {
      console.error('Create project error:', error)
      alert('Failed to create project: ' + error.message)
    } finally {
      setCreatingProject(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-foreground tracking-wide">Active Projects</h1>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center bg-secondary rounded-lg p-1">
              <button
                onClick={() => setGridView(true)}
                className={`p-2 rounded-md transition-all duration-200 ${
                  gridView ? "bg-card shadow-sm text-foreground" : "text-foreground-secondary hover:text-foreground"
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setGridView(false)}
                className={`p-2 rounded-md transition-all duration-200 ${
                  !gridView ? "bg-card shadow-sm text-foreground" : "text-foreground-secondary hover:text-foreground"
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Refresh */}
            <button
              onClick={loadProjects}
              disabled={loading}
              className="p-2 rounded-lg bg-secondary text-foreground-secondary hover:text-foreground transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            {/* Filter */}
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground-secondary hover:text-foreground transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">Filter</span>
            </button>

            {/* Hidden file input for CSV import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".csv"
              className="hidden"
            />

            {/* Sync from Asana */}
            <button
              onClick={handleAsanaSyncClick}
              disabled={asanaSyncing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500/10 to-orange-400/10 border border-pink-500/20 text-pink-600 dark:text-pink-400 hover:from-pink-500/20 hover:to-orange-400/20 transition-colors"
            >
              {asanaSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Image src="/images/asana.svg" alt="" width={16} height={16} className="opacity-80" />
              )}
              <span className="text-sm font-medium hidden sm:inline">Sync Asana</span>
            </button>

            {/* Import CSV */}
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-foreground-secondary hover:text-foreground transition-colors"
            >
              {importing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="text-sm font-medium hidden sm:inline">Import CSV</span>
            </button>

            {/* New Project */}
            <button
              onClick={() => setShowNewProjectModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium hidden sm:inline">New Project</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-foreground-tertiary" />
          <input
            type="text"
            placeholder="Search projects, GCs, addresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-foreground-tertiary focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Status Filter Pills */}
      <div className="px-6 py-3 border-b border-border/50 flex items-center gap-2 overflow-x-auto">
        {STATUS_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => setStatusFilter(option.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-foreground-secondary hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-foreground-secondary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-foreground-secondary mb-4">{error}</p>
            <button
              onClick={loadProjects}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
            >
              Retry
            </button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-foreground-tertiary" />
            </div>
            <p className="text-foreground-secondary">No projects found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-4 text-primary hover:underline text-sm"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className={gridView ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : "flex flex-col gap-3"}>
            {filteredProjects.map((project, index) => (
              <div
                key={project.id}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: "fadeInUp 0.4s ease-out forwards",
                  opacity: 0,
                }}
              >
                <ProjectCard project={project} onClick={handleProjectClick} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filter Slide-Over */}
      {showFilters && (
        <>
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => setShowFilters(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-card border-l border-border z-50 shadow-2xl animate-in slide-in-from-right duration-250">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">Filters</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-foreground-secondary" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-input-background border border-input rounded-lg text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              {/* More filters can be added here */}
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStatusFilter("all")
                    setSearchQuery("")
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground-secondary hover:bg-secondary transition-colors text-sm font-medium"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Import Result Modal */}
      {showImportModal && (
        <>
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => !importing && setShowImportModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-xl z-50 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                {importing ? 'Importing Projects...' : 'Import Result'}
              </h2>
              {!importing && (
                <button
                  onClick={() => setShowImportModal(false)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-foreground-secondary" />
                </button>
              )}
            </div>

            {importing ? (
              <div className="flex flex-col items-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-foreground-secondary">Processing CSV file...</p>
              </div>
            ) : importResult ? (
              <div className="space-y-4">
                {importResult.success ? (
                  <>
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <div>
                        <p className="font-medium text-green-600">Import Successful</p>
                        <p className="text-sm text-foreground-secondary">
                          {importResult.imported} imported, {importResult.skipped} skipped
                        </p>
                      </div>
                    </div>
                    {importResult.errors?.length > 0 && (
                      <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-sm font-medium text-yellow-600 mb-2">
                          {importResult.errors.length} rows had errors:
                        </p>
                        <ul className="text-xs text-foreground-secondary space-y-1 max-h-24 overflow-y-auto">
                          {importResult.errors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err.error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-6 h-6 text-red-500" />
                    <div>
                      <p className="font-medium text-red-600">Import Failed</p>
                      <p className="text-sm text-foreground-secondary">{importResult.error}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-border text-foreground-secondary hover:bg-secondary transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </button>
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <>
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => !creatingProject && setShowNewProjectModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card border border-border rounded-xl z-50 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">New Project</h2>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4 text-foreground-secondary" />
              </button>
            </div>

            <form onSubmit={handleNewProjectSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., 123 Main Street"
                  className="w-full px-3 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-foreground-tertiary focus:border-primary focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Address
                </label>
                <input
                  type="text"
                  value={newProjectForm.address}
                  onChange={(e) => setNewProjectForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Full address"
                  className="w-full px-3 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-foreground-tertiary focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    GC Name
                  </label>
                  <input
                    type="text"
                    value={newProjectForm.gc_name}
                    onChange={(e) => setNewProjectForm(f => ({ ...f, gc_name: e.target.value }))}
                    placeholder="General Contractor"
                    className="w-full px-3 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-foreground-tertiary focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={newProjectForm.amount}
                    onChange={(e) => setNewProjectForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="$0"
                    className="w-full px-3 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-foreground-tertiary focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newProjectForm.due_date}
                    onChange={(e) => setNewProjectForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-input-background border border-input rounded-lg text-foreground placeholder:text-foreground-tertiary focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Status
                  </label>
                  <select
                    value={newProjectForm.status}
                    onChange={(e) => setNewProjectForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-input-background border border-input rounded-lg text-foreground focus:border-primary focus:outline-none"
                  >
                    <option value="estimating">Estimating</option>
                    <option value="proposal_sent">Proposal Sent</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground-secondary hover:bg-secondary transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProject}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {creatingProject ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Project
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Asana Sync Modal */}
      {showAsanaSyncModal && (
        <>
          <div
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
            onClick={() => !asanaSyncing && setShowAsanaSyncModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card border border-border rounded-xl z-50 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <Image src="/images/asana.svg" alt="Asana" width={24} height={24} className="opacity-80" />
                <h2 className="text-lg font-semibold text-foreground">Sync from Asana BIDS</h2>
              </div>
              {!asanaSyncing && (
                <button
                  onClick={() => setShowAsanaSyncModal(false)}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-foreground-secondary" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {asanaLoading ? (
                <div className="flex flex-col items-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-pink-500 mb-4" />
                  <p className="text-foreground-secondary">Fetching BIDS from Asana...</p>
                </div>
              ) : asanaSyncResult?.needsAuth ? (
                <div className="text-center py-8">
                  <Image src="/images/asana.svg" alt="Asana" width={48} height={48} className="mx-auto mb-4 opacity-60" />
                  <h3 className="text-lg font-medium text-foreground mb-2">Connect to Asana</h3>
                  <p className="text-sm text-foreground-secondary mb-6">
                    Connect your Asana account to import BIDS
                  </p>
                  <a
                    href="/api/auth/asana"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    <Image src="/images/asana.svg" alt="" width={16} height={16} />
                    Connect Asana
                  </a>
                </div>
              ) : asanaSyncResult?.success ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <div>
                      <p className="font-medium text-green-600">Sync Successful</p>
                      <p className="text-sm text-foreground-secondary">
                        {asanaSyncResult.imported} imported, {asanaSyncResult.updated} updated, {asanaSyncResult.skipped} skipped
                      </p>
                    </div>
                  </div>
                  {asanaSyncResult.errors?.length > 0 && (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <p className="text-sm font-medium text-yellow-600 mb-2">
                        {asanaSyncResult.errors.length} items had errors:
                      </p>
                      <ul className="text-xs text-foreground-secondary space-y-1 max-h-24 overflow-y-auto">
                        {asanaSyncResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err.taskName}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : asanaSyncResult?.error ? (
                <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                  <div>
                    <p className="font-medium text-red-600">Sync Failed</p>
                    <p className="text-sm text-foreground-secondary">{asanaSyncResult.error}</p>
                  </div>
                </div>
              ) : asanaTasks.length > 0 ? (
                <div className="space-y-4">
                  {/* Sections summary */}
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">Pipeline Stages (Sections)</h3>
                    <div className="flex flex-wrap gap-2">
                      {asanaSections.map(section => {
                        const statusInfo = getStatusInfo(section.koStatus)
                        return (
                          <span
                            key={section.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-foreground-secondary"
                          >
                            <span className={`w-2 h-2 rounded-full ${statusInfo.color}`} />
                            {section.name}
                            <span className="text-foreground-tertiary">→ {statusInfo.label}</span>
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tasks preview */}
                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-2">
                      {asanaTasks.length} Active Bids to Import
                    </h3>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="max-h-64 overflow-y-auto">
                        {asanaTasks.map(task => {
                          const statusInfo = getStatusInfo(task.status)
                          return (
                            <div
                              key={task.asana_id}
                              className="flex items-center gap-3 px-3 py-2 border-b border-border last:border-b-0 hover:bg-secondary/50"
                            >
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusInfo.color}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{task.name}</p>
                                <p className="text-xs text-foreground-tertiary truncate">
                                  {task.section.name} • {task.assignee?.name || 'Unassigned'}
                                </p>
                              </div>
                              {task.due_date && (
                                <span className="text-xs text-foreground-secondary flex-shrink-0">
                                  {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-foreground-secondary">No active bids found in BIDS project</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex gap-3">
              <button
                onClick={() => setShowAsanaSyncModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground-secondary hover:bg-secondary transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={syncFromAsana}
                disabled={asanaSyncing || asanaLoading || asanaTasks.length === 0 || asanaSyncResult?.needsAuth}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90 transition-opacity text-sm font-medium disabled:opacity-50"
              >
                {asanaSyncing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <CloudDownload className="w-4 h-4" />
                    Import {asanaTasks.length} Bids
                  </>
                )}
              </button>
            </div>
          </div>
        </>
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
