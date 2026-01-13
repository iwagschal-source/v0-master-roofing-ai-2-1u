"use client"

import { useState, useEffect, useCallback } from 'react'
import { asanaAPI, AsanaTask, AsanaProject } from '@/lib/api/endpoints'

interface UseAsanaOptions {
  autoFetch?: boolean
}

interface AsanaUser {
  gid: string
  name: string
  email: string
  photo?: string
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
  // Connection status
  isConnected: boolean
  user: AsanaUser | null
  authUrl: string | null
  checkConnection: () => Promise<void>
  disconnect: () => Promise<void>
}

// Mock data for development/demo - matches Isaac's Asana pipelines
const MOCK_TASKS: AsanaTask[] = [
  {
    id: "task1",
    name: "Review Beach 67th St bid",
    notes: "John Mitchell sent updated pricing. Review timeline, budget breakdown, and material options.",
    completed: false,
    due_on: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal", email: "iwagschal@masterroofingus.com" },
    projects: [{ gid: "proj1", name: "Bids" }],
    tags: [{ gid: "tag1", name: "High Priority", color: "red" }],
    permalink_url: "https://app.asana.com/task1",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "task2",
    name: "Submit Turner Construction bid",
    notes: "Hospital project RFP due Friday. Final pricing review needed.",
    completed: false,
    due_on: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal" },
    projects: [{ gid: "proj1", name: "Bids" }],
    tags: [{ gid: "tag2", name: "RFP", color: "blue" }],
    permalink_url: "https://app.asana.com/task2",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "task3",
    name: "Manhattan Plaza - site inspection",
    notes: "Tishman Construction project. Schedule crew and equipment for next week.",
    completed: false,
    due_on: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal" },
    projects: [{ gid: "proj2", name: "Projects" }],
    tags: [{ gid: "tag3", name: "Site Visit", color: "green" }],
    permalink_url: "https://app.asana.com/task3",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "task4",
    name: "Lennar project - order materials",
    notes: "GAF EverGuard TPO - 15,000 sq ft. Confirm with supplier.",
    completed: false,
    due_on: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal" },
    projects: [{ gid: "proj2", name: "Projects" }],
    tags: [{ gid: "tag4", name: "Materials", color: "orange" }],
    permalink_url: "https://app.asana.com/task4",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "task5",
    name: "Invoice Skanska - Phase 2 complete",
    notes: "Phase 2 roof installation complete. Send invoice for $285,000.",
    completed: false,
    due_on: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal" },
    projects: [{ gid: "proj3", name: "Billing" }],
    tags: [{ gid: "tag5", name: "Invoice", color: "yellow" }],
    permalink_url: "https://app.asana.com/task5",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "task6",
    name: "Follow up on MJH payment",
    notes: "Invoice #4521 overdue by 15 days. Contact accounts payable.",
    completed: false,
    due_on: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignee: { gid: "user1", name: "Isaac Wagschal" },
    projects: [{ gid: "proj3", name: "Billing" }],
    tags: [{ gid: "tag6", name: "Overdue", color: "red" }],
    permalink_url: "https://app.asana.com/task6",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    modified_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  }
]

const MOCK_PROJECTS: AsanaProject[] = [
  { id: "proj1", name: "Bids", color: "blue", workspace: { gid: "ws1", name: "Master Roofing" } },
  { id: "proj2", name: "Projects", color: "green", workspace: { gid: "ws1", name: "Master Roofing" } },
  { id: "proj3", name: "Billing", color: "yellow", workspace: { gid: "ws1", name: "Master Roofing" } },
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

  // Connection status
  const [isConnected, setIsConnected] = useState(false)
  const [user, setUser] = useState<AsanaUser | null>(null)
  const [authUrl, setAuthUrl] = useState<string | null>(null)

  const checkConnection = useCallback(async () => {
    try {
      const status = await asanaAPI.getStatus()
      setIsConnected(status.connected)
      setUser(status.user || null)
      setAuthUrl(status.authUrl || '/api/auth/asana')

      if (!status.connected) {
        // Use mock data when not connected
        setUseMock(true)
        setTasks(MOCK_TASKS)
        setProjects(MOCK_PROJECTS)
      }
    } catch (err) {
      setUseMock(true)
      setTasks(MOCK_TASKS)
      setProjects(MOCK_PROJECTS)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      await asanaAPI.disconnect()
      setIsConnected(false)
      setUser(null)
      setUseMock(true)
      setTasks(MOCK_TASKS)
      setProjects(MOCK_PROJECTS)
    } catch (err) {
      console.error('Failed to disconnect:', err)
    }
  }, [])

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

  // Auto-fetch on mount - check connection first
  useEffect(() => {
    if (autoFetch) {
      checkConnection().then(() => {
        fetchTasks()
        fetchProjects()
      })
    }
  }, [autoFetch, checkConnection, fetchTasks, fetchProjects])

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
    fetchProjectTasks,
    // Connection status
    isConnected,
    user,
    authUrl,
    checkConnection,
    disconnect
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
