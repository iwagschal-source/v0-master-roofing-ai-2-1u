"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Filter, RefreshCw, Loader2, Grid3X3, List, X } from "lucide-react"
import { ProjectCard } from "./project-card"

// Mock data for MVP demo
const MOCK_PROJECTS = [
  {
    id: "proj-001",
    name: "307 Beach 67th Street",
    address: "307 Beach 67th Street, Brooklyn, NY",
    gc_id: "gc-mjh",
    gc_name: "MJH Construction Corp",
    amount: 300309,
    due_date: "2025-10-27",
    status: "estimating",
    sheet_id: null, // Will be filled when sheet is connected
  },
  {
    id: "proj-002",
    name: "1086 Dumont Ave",
    address: "1086 Dumont Ave, Brooklyn, NY",
    gc_id: "gc-bluesky",
    gc_name: "Blue Sky Builders",
    amount: 156000,
    due_date: "2025-11-15",
    status: "proposal_sent",
    sheet_id: null,
  },
  {
    id: "proj-003",
    name: "960 Franklin Ave",
    address: "960 Franklin Ave, Brooklyn, NY",
    gc_id: "gc-apex",
    gc_name: "Apex Construction",
    amount: 425000,
    due_date: "2025-09-30",
    status: "won",
    sheet_id: null,
  },
  {
    id: "proj-004",
    name: "245 Park Avenue",
    address: "245 Park Avenue, Manhattan, NY",
    gc_id: "gc-turner",
    gc_name: "Turner Construction",
    amount: 1250000,
    due_date: "2025-12-15",
    status: "estimating",
    sheet_id: null,
  },
  {
    id: "proj-005",
    name: "500 Fifth Avenue",
    address: "500 Fifth Avenue, Manhattan, NY",
    gc_id: "gc-skanska",
    gc_name: "Skanska USA",
    amount: 875000,
    due_date: "2025-11-30",
    status: "proposal_sent",
    sheet_id: null,
  },
]

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

            {/* New Project */}
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
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
