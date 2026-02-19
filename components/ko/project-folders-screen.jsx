"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { FolderCard } from "@/components/ko/folder-card"
import { CreateProjectModal } from "@/components/ko/create-project-modal"
import { Search, LayoutGrid, List, Plus, Loader2, FolderOpen, MoreVertical, Trash2, ExternalLink, Settings } from "lucide-react"
import { FOLDER_ICON_COLORS } from "@/lib/brand-colors"

/**
 * Project Folders Screen — Phase 12 redesign with folder cards
 * Shows project grid with category icon status badges and hover file popups
 */
export default function ProjectFoldersScreen({ onNavigateToProject }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [folderStatus, setFolderStatus] = useState({}) // projectId → { drawings: bool, ... }
  const [folderFiles, setFolderFiles] = useState({})   // projectId → { drawings: { files: [...] }, ... }
  const [menuOpen, setMenuOpen] = useState(null)        // projectId of open menu
  const [deleteConfirm, setDeleteConfirm] = useState(null) // project to confirm delete
  const [deleting, setDeleting] = useState(false)
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

  const handleFileClick = (category, fileName) => {
    console.log('Opening file:', category, fileName)
    // TODO: Navigate to project documents page with file open (Task 6)
  }

  const handleDeleteProject = async (project) => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/ko/project/${project.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setProjects(prev => prev.filter(p => p.id !== project.id))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Error deleting project:', err)
      alert('Failed to delete project. Please try again.')
    } finally {
      setDeleting(false)
    }
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
            {/* Title */}
            <div>
              <h1 className="font-mono text-sm font-semibold tracking-wide uppercase">
                Projects
              </h1>
              <p className="text-xs text-muted-foreground">
                {projects.length} Active Projects
              </p>
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
                    onCardClick={() => onNavigateToProject?.({ id: project.id, name: project.name })}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredProjects.map((project) => {
                  const status = folderStatus[project.id]
                  const iconKeys = ['drawings', 'bluebeam', 'takeoff', 'markups', 'proposals']
                  const activeIcons = status ? iconKeys.filter(k => status[k]) : []

                  return (
                    <LazyListRow
                      key={project.id}
                      project={project}
                      activeIcons={activeIcons}
                      onVisible={() => {
                        if (project.driveFolderId) loadFolderStatus(project.id)
                      }}
                      onOpen={() => onNavigateToProject?.({ id: project.id, name: project.name })}
                      onDelete={() => setDeleteConfirm(project)}
                      menuOpen={menuOpen === project.id}
                      onToggleMenu={() => setMenuOpen(menuOpen === project.id ? null : project.id)}
                      onCloseMenu={() => setMenuOpen(null)}
                    />
                  )
                })}
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-base">Delete project</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Delete project <strong className="text-foreground">{deleteConfirm.name}</strong>? This will remove the project folder and all its contents. This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(deleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

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
function LazyFolderCard({ project, folders, onVisible, onHoverIcons, onFileClick, onCardClick }) {
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
        onClick={onCardClick}
      />
    </div>
  )
}

/** Map category keys to v0 PNG icon files (64x64, transparent bg) */
const LIST_ICON_SRC = {
  drawings: '/icons/drawings.png',
  bluebeam: '/icons/bluebeam.png',
  takeoff: '/icons/takeoff.png',
  markups: '/icons/markups.png',
  proposals: '/icons/proposals.png',
}

/**
 * List row with IntersectionObserver, category icons, and three-dot menu
 */
function LazyListRow({ project, activeIcons, onVisible, onOpen, onDelete, menuOpen, onToggleMenu, onCloseMenu }) {
  const rowRef = useRef(null)
  const hasTriggered = useRef(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const el = rowRef.current
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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onCloseMenu()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen, onCloseMenu])

  return (
    <div
      ref={rowRef}
      className="flex items-center gap-4 px-4 py-3 bg-card border border-border/50 rounded-lg hover:border-primary/30 transition-colors cursor-pointer"
      onClick={onOpen}
    >
      {/* Project name + client */}
      <div className="flex-1 min-w-0">
        <h3 className="font-mono text-sm font-medium truncate">{project.name}</h3>
        <p className="text-xs text-muted-foreground truncate">{project.companyName}</p>
      </div>

      {/* Category icons — use working numbered SVGs with mix-blend-multiply */}
      <div className="flex items-center gap-1.5 shrink-0">
        {activeIcons.map((key) => (
          <img
            key={key}
            src={LIST_ICON_SRC[key]}
            alt={key}
            className="block w-5 h-5"
            draggable={false}
          />
        ))}
      </div>

      {/* Three-dot menu */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMenu() }}
          className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-card border border-border rounded-lg shadow-xl overflow-hidden">
            <button
              onClick={(e) => { e.stopPropagation(); onCloseMenu(); onOpen() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-secondary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCloseMenu(); onDelete() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-red-500/10 text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
            <button
              disabled
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left text-muted-foreground/50 cursor-not-allowed"
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
              <span className="text-[10px] ml-auto opacity-60">Soon</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
