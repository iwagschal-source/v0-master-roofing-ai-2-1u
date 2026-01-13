"use client"

import { useState } from "react"
import { CheckSquare, Circle, CheckCircle2, RefreshCw, Loader2, Calendar, ExternalLink, FolderKanban, ChevronRight, Filter, Search } from "lucide-react"
import { useAsana, formatDueDate, getTagColor } from "@/hooks/useAsana"

export function AsanaScreen() {
  const {
    tasks,
    projects,
    loading,
    selectedProject,
    selectProject,
    completeTask,
    refresh
  } = useAsana({ autoFetch: true })

  const [searchQuery, setSearchQuery] = useState("")
  const [showCompleted, setShowCompleted] = useState(false)
  const [completingTaskId, setCompletingTaskId] = useState(null)

  const handleCompleteTask = async (taskId) => {
    setCompletingTaskId(taskId)
    await completeTask(taskId)
    setCompletingTaskId(null)
  }

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (!showCompleted && task.completed) return false
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      task.name.toLowerCase().includes(q) ||
      task.notes?.toLowerCase().includes(q)
    )
  })

  // Sort: incomplete first, then by due date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (!a.due_on && !b.due_on) return 0
    if (!a.due_on) return 1
    if (!b.due_on) return -1
    return new Date(a.due_on).getTime() - new Date(b.due_on).getTime()
  })

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* LEFT SIDEBAR - Projects */}
      <div className="w-64 border-r border-border flex flex-col bg-sidebar">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Tasks</h2>
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-foreground-secondary ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {/* My Tasks */}
          <button
            onClick={() => selectProject(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              !selectedProject
                ? 'bg-primary/10 text-foreground'
                : 'text-foreground-secondary hover:bg-muted hover:text-foreground'
            }`}
          >
            <CheckSquare className="w-5 h-5" />
            <span className="font-medium">My Tasks</span>
          </button>

          {/* Projects */}
          <div className="mt-4">
            <div className="px-3 py-2 text-xs font-medium text-foreground-secondary uppercase tracking-wide">
              Projects
            </div>
            {projects.map((project) => (
              <button
                key={project.id}
                onClick={() => selectProject(project)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  selectedProject?.id === project.id
                    ? 'bg-primary/10 text-foreground'
                    : 'text-foreground-secondary hover:bg-muted hover:text-foreground'
                }`}
              >
                <FolderKanban className={`w-4 h-4 ${
                  project.color === 'red' ? 'text-red-500' :
                  project.color === 'blue' ? 'text-blue-500' :
                  project.color === 'green' ? 'text-green-500' :
                  project.color === 'yellow' ? 'text-yellow-500' :
                  'text-foreground-secondary'
                }`} />
                <span className="text-sm truncate">{project.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANE - Tasks List */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-medium text-foreground">
                {selectedProject ? selectedProject.name : 'My Tasks'}
              </h1>
              <span className="text-sm text-foreground-secondary">
                ({filteredTasks.filter(t => !t.completed).length} incomplete)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  showCompleted
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground-secondary hover:bg-muted'
                }`}
              >
                {showCompleted ? 'Hide completed' : 'Show completed'}
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full max-w-md pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="text-center py-16 text-foreground-secondary">
              <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">No tasks</h3>
              <p className="text-sm">
                {searchQuery ? 'No tasks match your search' : 'All caught up!'}
              </p>
            </div>
          ) : (
            <div className="max-w-4xl space-y-2">
              {sortedTasks.map((task) => {
                const dueInfo = formatDueDate(task.due_on)

                return (
                  <div
                    key={task.id}
                    className={`group flex items-start gap-3 p-4 bg-card rounded-lg border transition-colors ${
                      task.completed
                        ? 'border-border/50 opacity-60'
                        : 'border-border hover:border-border-strong'
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => !task.completed && handleCompleteTask(task.id)}
                      disabled={task.completed || completingTaskId === task.id}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {completingTaskId === task.id ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      ) : task.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-foreground-secondary hover:text-primary transition-colors" />
                      )}
                    </button>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`text-sm font-medium ${
                          task.completed ? 'text-foreground-secondary line-through' : 'text-foreground'
                        }`}>
                          {task.name}
                        </h3>
                        {task.permalink_url && (
                          <a
                            href={task.permalink_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-all"
                          >
                            <ExternalLink className="w-4 h-4 text-foreground-secondary" />
                          </a>
                        )}
                      </div>

                      {task.notes && (
                        <p className="mt-1 text-sm text-foreground-secondary line-clamp-2">
                          {task.notes}
                        </p>
                      )}

                      <div className="mt-2 flex items-center flex-wrap gap-2">
                        {/* Due Date */}
                        {task.due_on && (
                          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                            dueInfo.isOverdue
                              ? 'bg-red-500/20 text-red-500'
                              : dueInfo.isDueToday
                                ? 'bg-orange-500/20 text-orange-500'
                                : dueInfo.isDueSoon
                                  ? 'bg-yellow-500/20 text-yellow-500'
                                  : 'bg-muted text-foreground-secondary'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {dueInfo.text}
                          </div>
                        )}

                        {/* Tags */}
                        {task.tags?.map((tag) => (
                          <span
                            key={tag.gid}
                            className={`text-xs px-2 py-1 rounded-full ${getTagColor(tag.color)}`}
                          >
                            {tag.name}
                          </span>
                        ))}

                        {/* Project */}
                        {!selectedProject && task.projects?.[0] && (
                          <span className="text-xs text-foreground-secondary">
                            {task.projects[0].name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
