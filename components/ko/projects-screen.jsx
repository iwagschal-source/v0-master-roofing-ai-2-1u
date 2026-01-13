"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Search, Filter, RefreshCw, Loader2, Grid3X3, List, X, Upload, Download, CheckCircle, AlertCircle } from "lucide-react"
import { ProjectCard } from "./project-card"

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "estimating", label: "Estimating" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
]

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

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      setError(null)

      // Try to fetch from API first
      try {
        const response = await fetch("/api/ko/projects")
        if (response.ok) {
          const data = await response.json()
          if (data.projects && data.projects.length > 0) {
            setProjects(data.projects)
            return
          }
        }
      } catch (apiError) {
        console.log("API not available, using mock data")
      }

      // Fall back to mock data for MVP
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate loading
      setProjects(MOCK_PROJECTS)
    } catch (err) {
      console.error("Failed to load projects:", err)
      setError(err.message)
      // Still show mock data on error
      setProjects(MOCK_PROJECTS)
    } finally {
      setLoading(false)
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
