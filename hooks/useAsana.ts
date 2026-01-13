"use client"

import { useState, useEffect, useCallback } from 'react'
import { asanaAPI, AsanaTask, AsanaProject } from '@/lib/api/endpoints'

interface UseAsanaOptions {
  autoFetch?: boolean
}

interface UseAsanaReturn {
  tasks: AsanaTask[]
  projects: AsanaProject[]
  loading: boolean
  projectsLoading: boolean
  error: string | null
  selectedProject: AsanaProject | null
  selectProject: (project: AsanaProject | null) => void
  completeTask: (taskId: string) => Promise<boolean>
  refresh: () => Promise<void>
  fetchProjectTasks: (projectId: string) => Promise<void>
}

// Mock data for development/demo
const MOCK_TASKS: AsanaTask[] = [
  {
    id: "task1",
    name: "Review Beach 67th St proposal",
    notes: "John Mitchell sent updated proposal. Review timeline, budget breakdown, and material options.",
    completed: false,
    due_on: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal", email: "iwagschal@masterroofingus.com" },
    projects: [{ gid: "proj1", name: "Active Proposals" }],
    tags: [{ gid: "tag1", name: "High Priority", color: "red" }],
    permalink_url: "https://app.asana.com/task1",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "task2",
    name: "Prepare site visit checklist - Manhattan Plaza",
    notes: "Tishman Construction site visit on Feb 15. Prepare measurement equipment and safety gear.",
    completed: false,
    due_on: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal" },
    projects: [{ gid: "proj2", name: "Estimating" }],
    tags: [{ gid: "tag2", name: "Site Visit", color: "blue" }],
    permalink_url: "https://app.asana.com/task2",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "task3",
    name: "Follow up with Turner Construction",
    notes: "Hospital project inspection passed. Send thank you note and discuss next steps.",
    completed: false,
    due_on: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal" },
    projects: [{ gid: "proj3", name: "Client Relations" }],
    tags: [{ gid: "tag3", name: "Follow Up", color: "green" }],
    permalink_url: "https://app.asana.com/task3",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "task4",
    name: "Update Q1 pipeline report",
    notes: "Add new opportunities from RFPs received this week.",
    completed: false,
    due_on: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal" },
    projects: [{ gid: "proj1", name: "Active Proposals" }],
    permalink_url: "https://app.asana.com/task4",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "task5",
    name: "Review crew schedule for next week",
    notes: "Queens and Brooklyn crews. Ensure adequate coverage for Lennar project.",
    completed: true,
    due_on: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal" },
    projects: [{ gid: "proj4", name: "Operations" }],
    permalink_url: "https://app.asana.com/task5",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "task6",
    name: "Finalize material order for Skanska project",
    notes: "GAF EverGuard TPO - 15,000 sq ft. Confirm with supplier.",
    completed: false,
    due_on: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal" },
    projects: [{ gid: "proj4", name: "Operations" }],
    tags: [{ gid: "tag4", name: "Materials", color: "yellow" }],
    permalink_url: "https://app.asana.com/task6",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  }
]

const MOCK_PROJECTS: AsanaProject[] = [
  { id: "proj1", name: "Active Proposals", color: "red", workspace: { gid: "ws1", name: "Master Roofing" } },
  { id: "proj2", name: "Estimating", color: "blue", workspace: { gid: "ws1", name: "Master Roofing" } },
  { id: "proj3", name: "Client Relations", color: "green", workspace: { gid: "ws1", name: "Master Roofing" } },
  { id: "proj4", name: "Operations", color: "yellow", workspace: { gid: "ws1", name: "Master Roofing" } },
]

export function useAsana(options: UseAsanaOptions = {}): UseAsanaReturn {
  const { autoFetch = true } = options

  const [tasks, setTasks] = useState<AsanaTask[]>([])
  const [projects, setProjects] = useState<AsanaProject[]>([])
  const [loading, setLoading] = useState(false)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<AsanaProject | null>(null)
  const [useMock, setUseMock] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await asanaAPI.listMyTasks()
      setTasks(response)
      setUseMock(false)
    } catch (err) {
      console.warn('Asana API unavailable, using mock data:', err)
      setTasks(MOCK_TASKS)
      setUseMock(true)
      setError(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true)

    try {
      if (useMock) {
        setProjects(MOCK_PROJECTS)
      } else {
        const response = await asanaAPI.listProjects()
        setProjects(response)
      }
    } catch (err) {
      console.warn('Projects API unavailable, using mock:', err)
      setProjects(MOCK_PROJECTS)
    } finally {
      setProjectsLoading(false)
    }
  }, [useMock])

  const fetchProjectTasks = useCallback(async (projectId: string) => {
    setLoading(true)

    try {
      if (useMock) {
        await new Promise(resolve => setTimeout(resolve, 300))
        setTasks(MOCK_TASKS.filter(t => t.projects?.some(p => p.gid === projectId)))
      } else {
        const response = await asanaAPI.listProjectTasks(projectId)
        setTasks(response)
      }
    } catch (err) {
      console.warn('Project tasks API unavailable:', err)
    } finally {
      setLoading(false)
    }
  }, [useMock])

  const selectProject = useCallback((project: AsanaProject | null) => {
    setSelectedProject(project)
    if (project) {
      fetchProjectTasks(project.id)
    } else {
      fetchTasks() // Go back to my tasks
    }
  }, [fetchProjectTasks, fetchTasks])

  const completeTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      if (useMock) {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, completed: true } : t
        ))
        return true
      }
      await asanaAPI.completeTask(taskId)
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, completed: true } : t
      ))
      return true
    } catch (err) {
      console.error('Failed to complete task:', err)
      return false
    }
  }, [useMock])

  const refresh = useCallback(async () => {
    await Promise.all([fetchTasks(), fetchProjects()])
  }, [fetchTasks, fetchProjects])

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchTasks()
      fetchProjects()
    }
  }, [autoFetch, fetchTasks, fetchProjects])

  return {
    tasks,
    projects,
    loading,
    projectsLoading,
    error,
    selectedProject,
    selectProject,
    completeTask,
    refresh,
    fetchProjectTasks
  }
}

export function formatDueDate(dueOn: string | undefined): { text: string; isOverdue: boolean; isDueToday: boolean; isDueSoon: boolean } {
  if (!dueOn) return { text: 'No due date', isOverdue: false, isDueToday: false, isDueSoon: false }

  const due = new Date(dueOn + 'T23:59:59')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const isOverdue = due < today
  const isDueToday = due.toDateString() === today.toDateString()
  const isDueSoon = due < nextWeek && !isOverdue && !isDueToday

  let text: string
  if (isOverdue) {
    const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
    text = daysOverdue === 1 ? 'Yesterday' : `${daysOverdue} days overdue`
  } else if (isDueToday) {
    text = 'Today'
  } else if (due.toDateString() === tomorrow.toDateString()) {
    text = 'Tomorrow'
  } else {
    text = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return { text, isOverdue, isDueToday, isDueSoon }
}

export function getTagColor(color?: string): string {
  const colors: Record<string, string> = {
    red: 'bg-red-500/20 text-red-500',
    orange: 'bg-orange-500/20 text-orange-500',
    yellow: 'bg-yellow-500/20 text-yellow-500',
    green: 'bg-green-500/20 text-green-500',
    blue: 'bg-blue-500/20 text-blue-500',
    purple: 'bg-purple-500/20 text-purple-500',
    pink: 'bg-pink-500/20 text-pink-500',
  }
  return colors[color || 'blue'] || colors.blue
}
