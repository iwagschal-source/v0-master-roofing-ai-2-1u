/**
 * Asana History API
 * Fetches tasks from the last 6 months across all projects
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readJSON } from '@/lib/gcs-storage'

const ASANA_API = 'https://app.asana.com/api/1.0'

async function getAsanaToken(userId) {
  if (!userId) return null
  const tokenData = await readJSON(`auth/asana/${userId}.json`)
  return tokenData?.access_token
}

// Helper to fetch all pages of results
async function fetchAllPages(url, token, maxPages = 10) {
  let allData = []
  let nextPage = null
  let pageCount = 0

  do {
    const pageUrl = nextPage ? `${url}&offset=${nextPage}` : url
    const res = await fetch(pageUrl, {
      headers: { 'Authorization': `Bearer ${token}` }
    })

    if (!res.ok) {
      console.error('Asana API error:', res.status, await res.text())
      break
    }

    const data = await res.json()
    allData = allData.concat(data.data || [])
    nextPage = data.next_page?.offset
    pageCount++
  } while (nextPage && pageCount < maxPages)

  return allData
}

// GET - Fetch historical tasks (last 6 months)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '6', 10)
    const projectId = searchParams.get('project')

    const cookieStore = await cookies()
    const userId = cookieStore.get('asana_user_id')?.value

    if (!userId) {
      return NextResponse.json(
        { error: 'Not connected to Asana', needsAuth: true },
        { status: 401 }
      )
    }

    const token = await getAsanaToken(userId)
    if (!token) {
      return NextResponse.json(
        { error: 'Asana token expired', needsAuth: true },
        { status: 401 }
      )
    }

    // Calculate date range
    const now = new Date()
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - months, now.getDate())
    const completedSince = sixMonthsAgo.toISOString()

    // Get user info for workspace
    const userRes = await fetch(`${ASANA_API}/users/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const userData = await userRes.json()
    const userGid = userData.data?.gid
    const workspaceGid = userData.data?.workspaces?.[0]?.gid

    if (!workspaceGid) {
      return NextResponse.json({ tasks: [], summary: {} })
    }

    const fields = 'name,notes,completed,completed_at,due_on,assignee,assignee.name,assignee.email,projects,projects.name,tags,tags.name,tags.color,permalink_url,created_at,modified_at'

    let allTasks = []

    if (projectId) {
      // Fetch tasks from specific project
      const url = `${ASANA_API}/projects/${projectId}/tasks?opt_fields=${fields}&completed_since=${completedSince}`
      allTasks = await fetchAllPages(url, token)
    } else {
      // Fetch from all projects in workspace
      const projectsRes = await fetch(
        `${ASANA_API}/workspaces/${workspaceGid}/projects?opt_fields=gid,name,archived&limit=100`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      const projectsData = await projectsRes.json()
      const projects = (projectsData.data || []).filter(p => !p.archived)

      // Fetch tasks from each project (limit to avoid rate limits)
      const projectsToFetch = projects.slice(0, 20) // Limit to 20 projects

      for (const project of projectsToFetch) {
        const url = `${ASANA_API}/projects/${project.gid}/tasks?opt_fields=${fields}&completed_since=${completedSince}`
        try {
          const projectTasks = await fetchAllPages(url, token, 5)
          allTasks = allTasks.concat(projectTasks)
        } catch (err) {
          console.error(`Error fetching tasks for project ${project.name}:`, err)
        }
      }

      // Also fetch user's assigned tasks
      const userTasksUrl = `${ASANA_API}/tasks?assignee=${userGid}&workspace=${workspaceGid}&opt_fields=${fields}&completed_since=${completedSince}`
      const userTasks = await fetchAllPages(userTasksUrl, token, 5)
      allTasks = allTasks.concat(userTasks)
    }

    // Deduplicate tasks by ID
    const taskMap = new Map()
    allTasks.forEach(t => {
      if (!taskMap.has(t.gid)) {
        taskMap.set(t.gid, t)
      }
    })
    const uniqueTasks = Array.from(taskMap.values())

    // Filter to only include tasks modified/created in the date range
    const filteredTasks = uniqueTasks.filter(t => {
      const modifiedAt = new Date(t.modified_at || t.created_at)
      return modifiedAt >= sixMonthsAgo
    })

    // Map to our format
    const tasks = filteredTasks.map(t => ({
      id: t.gid,
      name: t.name,
      notes: t.notes,
      completed: t.completed,
      completed_at: t.completed_at,
      due_on: t.due_on,
      assignee: t.assignee ? {
        gid: t.assignee.gid,
        name: t.assignee.name,
        email: t.assignee.email
      } : null,
      projects: t.projects?.map(p => ({
        gid: p.gid,
        name: p.name
      })) || [],
      tags: t.tags?.map(tag => ({
        gid: tag.gid,
        name: tag.name,
        color: tag.color
      })) || [],
      permalink_url: t.permalink_url,
      created_at: t.created_at,
      modified_at: t.modified_at
    }))

    // Sort by date (most recent first)
    tasks.sort((a, b) => new Date(b.modified_at) - new Date(a.modified_at))

    // Generate summary stats
    const summary = {
      totalTasks: tasks.length,
      completedTasks: tasks.filter(t => t.completed).length,
      openTasks: tasks.filter(t => !t.completed).length,
      overdueTasks: tasks.filter(t => !t.completed && t.due_on && new Date(t.due_on) < now).length,
      tasksByMonth: {},
      tasksByProject: {},
      dateRange: {
        start: sixMonthsAgo.toISOString().split('T')[0],
        end: now.toISOString().split('T')[0]
      }
    }

    // Group by month
    tasks.forEach(t => {
      const date = new Date(t.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      summary.tasksByMonth[monthKey] = (summary.tasksByMonth[monthKey] || 0) + 1

      // Group by project
      t.projects.forEach(p => {
        summary.tasksByProject[p.name] = (summary.tasksByProject[p.name] || 0) + 1
      })
    })

    return NextResponse.json({ tasks, summary })
  } catch (err) {
    console.error('Asana history error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch task history' },
      { status: 500 }
    )
  }
}
