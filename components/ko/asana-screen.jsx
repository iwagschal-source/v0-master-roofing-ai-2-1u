"use client"

import { useState } from "react"
import { Circle, CheckCircle2, RefreshCw, Loader2, Calendar, ExternalLink, ChevronRight, Filter, Search, ListTodo } from "lucide-react"
import Image from "next/image"
import { useAsana, formatDueDate, getTagColor } from "@/hooks/useAsana"

export function AsanaScreen() {
  const {
    tasks,
    projects,
    loading,
    selectedProject,
    selectProject,
    completeTask,
    refresh,
    isConnected,
    user,
    authUrl,
    disconnect
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
      {/* LEFT SIDEBAR - Asana Pipelines */}
      <div className="w-64 border-r border-border flex flex-col bg-sidebar">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Image
                src="/images/asana.svg"
                alt="Asana"
                width={20}
                height={20}
                className="opacity-80"
              />
              <h2 className="text-lg font-semibold text-foreground">Asana</h2>
            </div>
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-foreground-secondary ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Connection Status */}
          <div className="mt-3 flex items-center justify-between">
            {isConnected && user ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <span className="text-xs text-foreground-secondary">
                  Connected as {user.name}
                </span>
                <button
                  onClick={disconnect}
                  className="text-xs text-red-500 hover:underline ml-2"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <a
                href={authUrl || '/api/auth/asana'}
                className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Image
                  src="/images/asana.svg"
                  alt=""
                  width={14}
                  height={14}
                />
                Connect to Asana
              </a>
            )}
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
            <ListTodo className="w-5 h-5" />
            <span className="font-medium">My Tasks</span>
          </button>

          {/* Pipelines */}
          <div className="mt-4">
            <div className="px-3 py-2 text-xs font-medium text-foreground-secondary uppercase tracking-wide">
              Pipelines
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
                {/* Asana-style colored dot */}
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  project.color === 'red' ? 'bg-red-500' :
                  project.color === 'blue' ? 'bg-blue-500' :
                  project.color === 'green' ? 'bg-green-500' :
                  project.color === 'yellow' ? 'bg-yellow-500' :
                  project.color === 'purple' ? 'bg-purple-500' :
                  project.color === 'orange' ? 'bg-orange-500' :
                  'bg-gray-400'
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
              <ListTodo className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
