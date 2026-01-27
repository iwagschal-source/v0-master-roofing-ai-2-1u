"use client"

import { useState } from "react"
import { useTheme } from "@/components/theme-provider"
import { ProjectFolder } from "@/components/ko/project-folder"
import { ProjectFolderLight } from "@/components/ko/project-folder-light"
import { ProjectFolderDetail } from "@/components/ko/project-folder-detail"
import { Search, LayoutGrid, List, Settings, Bell, Sun, Moon } from "lucide-react"

/**
 * @typedef {"green"|"yellow"|"red"} HealthStatus
 * @typedef {{id: string, name: string, summary: string, status: HealthStatus, isIngesting: boolean, tickerMessages: string[]}} Project
 */

/** @type {Project[]} */
const mockProjects = [
  {
    id: "1",
    name: "Riverside Office Complex",
    summary: "Roofing submittals approved; lead times locked; no schedule risk.",
    status: "green",
    isIngesting: true,
    tickerMessages: ["Ingesting RFI 247", "Comparing Rev 4 vs Rev 5", "Updating dependencies"],
  },
  {
    id: "2",
    name: "Downtown Medical Center",
    summary: "Awaiting GC response on membrane specification; 3 days to deadline.",
    status: "yellow",
    isIngesting: true,
    tickerMessages: ["Awaiting GC response", "Monitoring deadline", "Preparing escalation draft"],
  },
  {
    id: "3",
    name: "Harbor View Apartments",
    summary: "Material delivery delayed; schedule impact being assessed.",
    status: "red",
    isIngesting: true,
    tickerMessages: ["Tracking shipment", "Calculating delay impact", "Notifying stakeholders"],
  },
  {
    id: "4",
    name: "Tech Park Building A",
    summary: "All phases on track; final inspection scheduled for next week.",
    status: "green",
    isIngesting: false,
    tickerMessages: [],
  },
  {
    id: "5",
    name: "Metro Station Canopy",
    summary: "Weather hold lifted; crews resuming work tomorrow.",
    status: "green",
    isIngesting: true,
    tickerMessages: ["Updating schedule", "Confirming crew availability"],
  },
  {
    id: "6",
    name: "University Science Hall",
    summary: "Change order pending approval; budget impact under review.",
    status: "yellow",
    isIngesting: true,
    tickerMessages: ["Analyzing cost impact", "Preparing documentation"],
  },
  {
    id: "7",
    name: "Corporate HQ Renovation",
    summary: "Submittal reviews complete; installation begins Monday.",
    status: "green",
    isIngesting: false,
    tickerMessages: [],
  },
  {
    id: "8",
    name: "Airport Terminal Roof",
    summary: "Critical path item delayed; mitigation plan in progress.",
    status: "red",
    isIngesting: true,
    tickerMessages: ["Developing mitigation plan", "Coordinating with GC", "Updating timeline"],
  },
  {
    id: "9",
    name: "Retail Plaza Phase 2",
    summary: "Warranty documentation finalized; closeout in progress.",
    status: "green",
    isIngesting: false,
    tickerMessages: [],
  },
  {
    id: "10",
    name: "Warehouse Distribution",
    summary: "Prefab panels on schedule; quality checks passed.",
    status: "green",
    isIngesting: true,
    tickerMessages: ["Processing QC reports", "Updating completion %"],
  },
  {
    id: "11",
    name: "Community Center Gym",
    summary: "Minor punch list items remaining; substantial completion achieved.",
    status: "green",
    isIngesting: false,
    tickerMessages: [],
  },
  {
    id: "12",
    name: "Hotel Tower Podium",
    summary: "Design revision required; architect coordination underway.",
    status: "yellow",
    isIngesting: true,
    tickerMessages: ["Reviewing architect feedback", "Updating shop drawings"],
  },
]

export default function ProjectFoldersScreen() {
  const [selectedProject, setSelectedProject] = useState(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState("grid")
  const { resolvedTheme, toggleTheme } = useTheme()

  const filteredProjects = mockProjects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusCounts = {
    total: mockProjects.length,
    green: mockProjects.filter((p) => p.status === "green").length,
    yellow: mockProjects.filter((p) => p.status === "yellow").length,
    red: mockProjects.filter((p) => p.status === "red").length,
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
                    project.status === "green"
                      ? "bg-green-500"
                      : project.status === "yellow"
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

        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No projects found matching your search.</p>
          </div>
        )}
      </main>

      {/* Expanded View Modal */}
      {selectedProject && (
        <ProjectFolderDetail
          projectName={selectedProject.name}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </div>
  )
}
