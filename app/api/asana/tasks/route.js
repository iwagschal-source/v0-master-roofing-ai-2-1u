/**
 * Asana Tasks API
 * Fetches user's tasks from Asana
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

// GET - Fetch tasks
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
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

    const fields = 'name,notes,completed,due_on,assignee,assignee.name,assignee.email,projects,projects.name,tags,tags.name,tags.color,permalink_url,created_at,modified_at'

    let url
    if (projectId) {
      // Fetch tasks for specific project
      url = `${ASANA_API}/projects/${projectId}/tasks?opt_fields=${fields}`
    } else {
      // Fetch user's assigned tasks
      const userRes = await fetch(`${ASANA_API}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const userData = await userRes.json()
      const userGid = userData.data?.gid

      // Get tasks from user's default workspace
      const workspaceGid = userData.data?.workspaces?.[0]?.gid
      if (!workspaceGid) {
        return NextResponse.json([])
      }

      url = `${ASANA_API}/tasks?assignee=${userGid}&workspace=${workspaceGid}&opt_fields=${fields}`
    }

    const tasksRes = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const tasksData = await tasksRes.json()

    // Map to our format
    const tasks = (tasksData.data || []).map(t => ({
      id: t.gid,
      name: t.name,
      notes: t.notes,
      completed: t.completed,
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

    return NextResponse.json(tasks)
  } catch (err) {
    console.error('Asana tasks error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

// POST - Complete a task
export async function POST(request) {
  try {
    const body = await request.json()
    const { taskId, completed = true } = body

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      )
    }

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

    // Update task in Asana
    const updateRes = await fetch(`${ASANA_API}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        data: { completed }
      })
    })

    if (!updateRes.ok) {
      const error = await updateRes.text()
      console.error('Failed to update task:', error)
      return NextResponse.json(
        { error: 'Failed to update task' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Asana task update error:', err)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}
