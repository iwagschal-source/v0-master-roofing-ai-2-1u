/**
 * Asana Projects API
 * Fetches user's projects/pipelines from Asana
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

    // Get user's workspaces first
    const workspacesRes = await fetch(`${ASANA_API}/users/me?opt_fields=workspaces,workspaces.name`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const workspacesData = await workspacesRes.json()
    const workspaces = workspacesData.data?.workspaces || []

    // Fetch projects from all workspaces
    const allProjects = []
    for (const workspace of workspaces) {
      const projectsRes = await fetch(
        `${ASANA_API}/workspaces/${workspace.gid}/projects?opt_fields=name,color,archived,workspace,workspace.name`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      )
      const projectsData = await projectsRes.json()
      const projects = projectsData.data || []

      // Filter out archived projects and map to our format
      allProjects.push(...projects
        .filter(p => !p.archived)
        .map(p => ({
          id: p.gid,
          name: p.name,
          color: p.color || 'blue',
          workspace: {
            gid: workspace.gid,
            name: workspace.name
          }
        }))
      )
    }

    return NextResponse.json(allProjects)
  } catch (err) {
    console.error('Asana projects error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
