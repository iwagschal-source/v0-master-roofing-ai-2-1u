"use client"

import { useState } from "react"
import { Circle, CheckCircle2, RefreshCw, Loader2, Calendar, ExternalLink, Plus, MoreHorizontal } from "lucide-react"
import Image from "next/image"
import { useAsana, formatDueDate } from "@/hooks/useAsana"

// Kanban columns configuration
const COLUMNS = [
  { id: "today", title: "Today", filter: (task) => {
    if (task.completed) return false
    if (!task.due_on) return false
    const today = new Date().toISOString().split('T')[0]
    return task.due_on === today
  }},
  { id: "upcoming", title: "Upcoming", filter: (task) => {
    if (task.completed) return false
    if (!task.due_on) return false
    const today = new Date().toISOString().split('T')[0]
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    return task.due_on > today && task.due_on <= nextWeek
  }},
  { id: "later", title: "Later", filter: (task) => {
    if (task.completed) return false
    if (!task.due_on) {
      return true // No due date goes to Later
    }
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    return task.due_on > nextWeek
  }},
  { id: "completed", title: "Completed", filter: (task) => task.completed },
]

function TaskCard({ task, onComplete, isCompleting }) {
  const dueInfo = task.due_on ? formatDueDate(task.due_on) : null

  return (
    <div className={`
      group bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700
      p-3 cursor-pointer hover:shadow-md transition-shadow
      ${task.completed ? 'opacity-60' : ''}
    `}>
      <div className="flex items-start gap-2">
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (!task.completed) onComplete(task.id)
          }}
          disabled={task.completed || isCompleting}
          className="mt-0.5 flex-shrink-0"
        >
          {isCompleting ? (
            <Loader2 className="w-4 h-4 text-pink-500 animate-spin" />
          ) : task.completed ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Circle className="w-4 h-4 text-zinc-300 hover:text-pink-500 transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${task.completed ? 'line-through text-zinc-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {task.name}
          </p>

          {/* Meta row */}
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {dueInfo && !task.completed && (
              <span className={`text-xs flex items-center gap-1 ${
                dueInfo.isOverdue ? 'text-red-500' :
                dueInfo.isDueToday ? 'text-orange-500' :
                'text-zinc-400'
              }`}>
                <Calendar className="w-3 h-3" />
                {dueInfo.text}
              </span>
            )}

            {task.assignee && (
              <span className="text-xs text-zinc-400">
                {task.assignee.name}
              </span>
            )}
          </div>
        </div>

        {/* External link */}
        {task.permalink_url && (
          <a
            href={task.permalink_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded transition-all"
          >
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>
        )}
      </div>
    </div>
  )
}

function KanbanColumn({ title, tasks, taskCount, onComplete, completingTaskId }) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[320px] flex flex-col">
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-zinc-700 dark:text-zinc-300">{title}</h3>
          <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded">
            {taskCount}
          </span>
        </div>
        <button className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Column Content */}
      <div className="flex-1 overflow-y-auto space-y-2 px-1 pb-4">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onComplete={onComplete}
            isCompleting={completingTaskId === task.id}
          />
        ))}

        {tasks.length === 0 && (
          <div className="py-8 text-center text-zinc-400 text-sm">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
}

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

  const [completingTaskId, setCompletingTaskId] = useState(null)

  const handleCompleteTask = async (taskId) => {
    setCompletingTaskId(taskId)
    await completeTask(taskId)
    setCompletingTaskId(null)
  }

  // Group tasks into columns
  const columnTasks = COLUMNS.map(col => ({
    ...col,
    tasks: tasks.filter(col.filter),
  }))

  // Not connected state
  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center">
          <Image
            src="/images/asana.svg"
            alt="Asana"
            width={48}
            height={48}
            className="mx-auto mb-4 opacity-60"
          />
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            Connect to Asana
          </h2>
          <p className="text-sm text-zinc-500 mb-6 max-w-sm">
            View and manage your Asana tasks directly from KO
          </p>
          <a
            href={authUrl || '/api/auth/asana'}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-orange-400 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Image src="/images/asana.svg" alt="" width={16} height={16} />
            Connect Asana
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-4">
          <Image
            src="/images/asana.svg"
            alt="Asana"
            width={24}
            height={24}
            className="opacity-80"
          />

          {/* Project Selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => selectProject(null)}
              className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                !selectedProject
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
              }`}
            >
              My Tasks
            </button>
            {projects.slice(0, 5).map((project) => (
              <button
                key={project.id}
                onClick={() => selectProject(project)}
                className={`px-3 py-1.5 text-sm rounded-full transition-colors flex items-center gap-1.5 ${
                  selectedProject?.id === project.id
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  project.color === 'red' ? 'bg-red-500' :
                  project.color === 'blue' ? 'bg-blue-500' :
                  project.color === 'green' ? 'bg-green-500' :
                  project.color === 'purple' ? 'bg-purple-500' :
                  'bg-zinc-400'
                }`} />
                {project.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* User */}
          <span className="text-xs text-zinc-500">
            {user?.name}
          </span>

          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={disconnect}
            className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>

      {/* Board Title */}
      <div className="px-6 py-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {selectedProject ? selectedProject.name : 'My Tasks'}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {tasks.filter(t => !t.completed).length} tasks remaining
        </p>
      </div>

      {/* Kanban Board */}
      {loading && tasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto px-4 pb-4">
          <div className="flex gap-4 h-full min-w-max">
            {columnTasks.map((column) => (
              <KanbanColumn
                key={column.id}
                title={column.title}
                tasks={column.tasks}
                taskCount={column.tasks.length}
                onComplete={handleCompleteTask}
                completingTaskId={completingTaskId}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
