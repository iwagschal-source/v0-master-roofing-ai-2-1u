/**
 * Asana Sections API
 * Fetches sections (columns/stages) from Asana projects
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const projectName = searchParams.get('project') // e.g., "BIDS"
    const projectId = searchParams.get('projectId')

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

    let targetProjectId = projectId

    // If project name provided but not ID, find the project first
    if (!targetProjectId && projectName) {
      // Get user's workspaces
      const workspacesRes = await fetch(`${ASANA_API}/users/me?opt_fields=workspaces,workspaces.name`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const workspacesData = await workspacesRes.json()
      const workspaces = workspacesData.data?.workspaces || []

      // Search for the project by name across workspaces
      for (const workspace of workspaces) {
        const projectsRes = await fetch(
          `${ASANA_API}/workspaces/${workspace.gid}/projects?opt_fields=name,gid`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        )
        const projectsData = await projectsRes.json()
        const projects = projectsData.data || []

        const foundProject = projects.find(p =>
          p.name.toLowerCase() === projectName.toLowerCase() ||
          p.name.toLowerCase().includes(projectName.toLowerCase())
        )

        if (foundProject) {
          targetProjectId = foundProject.gid
          break
        }
      }

      if (!targetProjectId) {
        return NextResponse.json(
          { error: `Project "${projectName}" not found` },
          { status: 404 }
        )
      }
    }

    if (!targetProjectId) {
      return NextResponse.json(
        { error: 'Either projectId or project name is required' },
        { status: 400 }
      )
    }

    // Fetch sections for the project
    const sectionsRes = await fetch(
      `${ASANA_API}/projects/${targetProjectId}/sections?opt_fields=name,gid`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )

    if (!sectionsRes.ok) {
      const error = await sectionsRes.text()
      console.error('Asana sections API error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch sections' },
        { status: 500 }
      )
    }

    const sectionsData = await sectionsRes.json()
    const sections = sectionsData.data || []

    // Also get tasks count per section for context
    const sectionsWithCounts = await Promise.all(
      sections.map(async (section) => {
        try {
          const tasksRes = await fetch(
            `${ASANA_API}/sections/${section.gid}/tasks?opt_fields=gid&limit=100`, {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          )
          const tasksData = await tasksRes.json()
          return {
            id: section.gid,
            name: section.name,
            taskCount: (tasksData.data || []).length
          }
        } catch {
          return {
            id: section.gid,
            name: section.name,
            taskCount: 0
          }
        }
      })
    )

    return NextResponse.json({
      projectId: targetProjectId,
      projectName: projectName || 'Unknown',
      sections: sectionsWithCounts
    })

  } catch (err) {
    console.error('Asana sections error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    )
  }
}
