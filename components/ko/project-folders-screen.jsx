"use client"

import { useState, useEffect } from "react"
import { useTheme } from "@/components/theme-provider"
import { ProjectFolder } from "@/components/ko/project-folder"
import { ProjectFolderLight } from "@/components/ko/project-folder-light"
import { ProjectFolderDetail } from "@/components/ko/project-folder-detail"
import { CreateProjectModal } from "@/components/ko/create-project-modal"
import { Search, LayoutGrid, List, Settings, Bell, Sun, Moon, Plus, Loader2, FolderOpen } from "lucide-react"

/**
 * @typedef {"green"|"yellow"|"red"} HealthStatus
 * @typedef {{id: string, name: string, summary: string, healthStatus: HealthStatus, isIngesting: boolean, tickerMessages: string[], companyName?: string}} Project
 */

export default function ProjectFoldersScreen() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { resolvedTheme, toggleTheme } = useTheme()

  // Fetch projects from API on mount
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/ko/project-folders')
        if (!res.ok) {
          throw new Error(`Failed to fetch projects: ${res.status}`)
        }
        const data = await res.json()
        // Map API response to component format
        const mappedProjects = (data.projects || []).map(p => ({
          id: p.id,
          name: p.name,
          summary: p.summary || `Project with ${p.companyName || 'company'}`,
          status: p.healthStatus || 'green',
          healthStatus: p.healthStatus || 'green',
          isIngesting: p.isIngesting || false,
          tickerMessages: p.tickerMessages || [],
          companyName: p.companyName,
          contactName: p.contactName,
          address: p.address,
          city: p.city,
          state: p.state,
        }))
        setProjects(mappedProjects)
      } catch (err) {
        console.error('Error fetching projects:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()
  }, [])

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusCounts = {
    total: projects.length,
    green: projects.filter((p) => p.status === "green" || p.healthStatus === "green").length,
    yellow: projects.filter((p) => p.status === "yellow" || p.healthStatus === "yellow").length,
    red: projects.filter((p) => p.status === "red" || p.healthStatus === "red").length,
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-4">
              <img
                src={resolvedTheme === "light" ? "/images/logo-light.png" : "/images/logo-square.png"}
                alt="Master Roofing"
                className="w-10 h-10 rounded"
              />
              <div>
                <h1 className="font-mono text-sm font-semibold tracking-wide uppercase">
                  Project Folder Agent
                </h1>
                <p className="text-xs text-muted-foreground">
                  {statusCounts.total} Active Projects
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full bg-secondary/30 border border-border/50 rounded-lg pl-10 pr-4 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {/* Status Summary & Actions */}
            <div className="flex items-center gap-6">
              {/* Status Pills */}
              <div className="hidden md:flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-mono text-green-600 dark:text-green-400">{statusCounts.green}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-500/10">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span className="text-xs font-mono text-yellow-600 dark:text-yellow-400">{statusCounts.yellow}</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs font-mono text-red-600 dark:text-red-400">{statusCounts.red}</span>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-secondary/30 rounded-lg">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "grid"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "list"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

              {/* New Project Button */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Project</span>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button className="p-2 rounded hover:bg-secondary transition-colors relative">
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                </button>
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded hover:bg-secondary transition-colors"
                  title={resolvedTheme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                >
                  {resolvedTheme === "light" ? (
                    <Moon className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Sun className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <button className="p-2 rounded hover:bg-secondary transition-colors">
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading projects...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="text-red-500 mb-4">
              <FolderOpen className="w-12 h-12" />
            </div>
            <p className="text-sm text-red-500 mb-2">Error loading projects</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State - No Projects Yet */}
        {!loading && !error && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
              <FolderOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Create your first project folder to start tracking documents, RFIs, and project health.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          </div>
        )}

        {/* Projects Grid/List */}
        {!loading && !error && projects.length > 0 && (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProjects.map((project) => (
                  resolvedTheme === "light" ? (
                    <ProjectFolderLight
                      key={project.id}
                      {...project}
                      isActive={selectedProject?.id === project.id}
                      onClick={() => setSelectedProject(project)}
                    />
                  ) : (
                    <ProjectFolder
                      key={project.id}
                      {...project}
                      isActive={selectedProject?.id === project.id}
                      onClick={() => setSelectedProject(project)}
                    />
                  )
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProject(project)}
                    className="w-full flex items-center gap-4 p-4 bg-card border border-border/50 rounded-lg hover:border-primary/30 transition-colors text-left"
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${
                        (project.status === "green" || project.healthStatus === "green")
                          ? "bg-green-500"
                          : (project.status === "yellow" || project.healthStatus === "yellow")
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-sm font-medium truncate">{project.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{project.summary}</p>
                    </div>
                    {project.isIngesting && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-green-500/70 uppercase">Live</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No search results */}
            {filteredProjects.length === 0 && searchQuery && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No projects found matching "{searchQuery}"</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Expanded View Modal */}
      {selectedProject && (
        <ProjectFolderDetail
          projectName={selectedProject.name}
          onClose={() => setSelectedProject(null)}
        />
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newProject) => {
          // Prepend new project to list
          setProjects(prev => [newProject, ...prev])
          setShowCreateModal(false)
        }}
      />
    </div>
  )
}
