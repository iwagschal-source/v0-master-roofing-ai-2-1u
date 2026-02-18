"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useTheme } from "@/components/theme-provider"
import { FolderCard } from "@/components/ko/folder-card"
import { CreateProjectModal } from "@/components/ko/create-project-modal"
import { Search, LayoutGrid, List, Plus, Loader2, FolderOpen } from "lucide-react"

/**
 * Project Folders Screen — Phase 12 redesign with folder cards
 * Shows project grid with category icon status badges and hover file popups
 */
export default function ProjectFoldersScreen() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [folderStatus, setFolderStatus] = useState({}) // projectId → { drawings: bool, ... }
  const [folderFiles, setFolderFiles] = useState({})   // projectId → { drawings: { files: [...] }, ... }
  const { resolvedTheme } = useTheme()

  // Fetch projects from API on mount
  useEffect(() => {
    async function fetchProjects() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/ko/project-folders')
        if (!res.ok) throw new Error(`Failed to fetch projects: ${res.status}`)
        const data = await res.json()
        const mappedProjects = (data.projects || []).map(p => ({
          id: p.id,
          name: p.name,
          companyName: p.companyName || 'Unknown Company',
          contactName: p.contactName,
          address: p.address,
          city: p.city,
          state: p.state,
          driveFolderId: p.driveFolderId,
          takeoffSpreadsheetId: p.takeoffSpreadsheetId,
          status: p.status || 'active',
          updatedAt: p.updatedAt,
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

  // Lazy-load folder status when a card becomes visible
  const loadFolderStatus = useCallback(async (projectId) => {
    if (folderStatus[projectId] !== undefined) return // already loaded
    setFolderStatus(prev => ({ ...prev, [projectId]: null })) // mark as loading
    try {
      const res = await fetch(`/api/ko/project/${projectId}/folders/status`)
      if (res.ok) {
        const status = await res.json()
        setFolderStatus(prev => ({ ...prev, [projectId]: status }))
      }
    } catch {
      // Silently fail — card will show no icons
    }
  }, [folderStatus])

  // Load file list for a specific folder category on hover
  const loadFolderFiles = useCallback(async (projectId) => {
    if (folderFiles[projectId]) return // already loaded
    try {
      const res = await fetch(`/api/ko/project/${projectId}/folders`)
      if (res.ok) {
        const data = await res.json()
        setFolderFiles(prev => ({ ...prev, [projectId]: data.folders }))
      }
    } catch {
      // Silently fail
    }
  }, [folderFiles])

  // Build folder categories array for a project card
  const buildFolderCategories = (projectId) => {
    const status = folderStatus[projectId]
    const files = folderFiles[projectId]
    if (!status) return []

    const categories = []
    const keys = ['drawings', 'bluebeam', 'takeoff', 'markups', 'proposals']
    for (const key of keys) {
      if (status[key]) {
        const fileList = files?.[key]?.files || []
        categories.push({
          category: key,
          files: fileList.map(f => f.name),
        })
      }
    }
    return categories
  }

  const handleFileClick = (fileName) => {
    console.log('Opening file:', fileName)
    // TODO: Open webViewLink or trigger download
  }

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (project.companyName || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

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
                  Projects
                </h1>
                <p className="text-xs text-muted-foreground">
                  {projects.length} Active Projects
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

            {/* Actions */}
            <div className="flex items-center gap-4">
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

        {/* Empty State */}
        {!loading && !error && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
              <FolderOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Create your first project folder to start tracking documents.
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

        {/* Projects Grid */}
        {!loading && !error && projects.length > 0 && (
          <>
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <LazyFolderCard
                    key={project.id}
                    project={project}
                    folders={buildFolderCategories(project.id)}
                    onVisible={() => {
                      if (project.driveFolderId) {
                        loadFolderStatus(project.id)
                      }
                    }}
                    onHoverIcons={() => {
                      if (project.driveFolderId && !folderFiles[project.id]) {
                        loadFolderFiles(project.id)
                      }
                    }}
                    onFileClick={handleFileClick}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    className="w-full flex items-center gap-4 p-4 bg-card border border-border/50 rounded-lg hover:border-primary/30 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-mono text-sm font-medium truncate">{project.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{project.companyName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* No search results */}
            {filteredProjects.length === 0 && searchQuery && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No projects found matching &ldquo;{searchQuery}&rdquo;</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(newProject) => {
          setProjects(prev => [newProject, ...prev])
          setShowCreateModal(false)
        }}
      />
    </div>
  )
}

/**
 * Wrapper that uses IntersectionObserver to lazy-load folder status
 */
function LazyFolderCard({ project, folders, onVisible, onHoverIcons, onFileClick }) {
  const cardRef = useRef(null)
  const hasTriggered = useRef(false)

  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasTriggered.current) {
          hasTriggered.current = true
          onVisible()
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [onVisible])

  return (
    <div ref={cardRef} onMouseEnter={onHoverIcons}>
      <FolderCard
        projectName={project.name}
        clientName={project.companyName}
        folders={folders}
        onFileClick={onFileClick}
      />
    </div>
  )
}
