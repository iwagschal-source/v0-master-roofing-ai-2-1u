/**
 * Asana BIDS Pipeline API
 * Fetches tasks from the BIDS project with section (status) information
 * and supports import to KO Projects
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { readJSON } from '@/lib/gcs-storage'
import { loadProjects, saveProjects } from '@/lib/project-storage'

const ASANA_API = 'https://app.asana.com/api/1.0'

// Status mapping: Asana Section Name → KO/HubSpot Status
// This will be populated dynamically from the BIDS project sections
const DEFAULT_STATUS_MAP = {
  // Common Asana section names → KO statuses
  'new': 'new_lead',
  'new leads': 'new_lead',
  'leads': 'new_lead',
  'rfp received': 'rfp_received',
  'rfp': 'rfp_received',
  'estimating': 'estimating',
  'in progress': 'estimating',
  'takeoff': 'estimating',
  'proposal': 'proposal_pending',
  'proposal pending': 'proposal_pending',
  'proposal sent': 'proposal_sent',
  'sent': 'proposal_sent',
  'submitted': 'proposal_sent',
  'negotiation': 'negotiation',
  'pending': 'negotiation',
  'won': 'won',
  'awarded': 'won',
  'closed won': 'won',
  'lost': 'lost',
  'closed lost': 'lost',
  'declined': 'lost',
  'on hold': 'on_hold',
  'hold': 'on_hold',
  // Default fallback
  '(no section)': 'new_lead',
}

async function getAsanaToken(userId) {
  if (!userId) return null
  const tokenData = await readJSON(`auth/asana/${userId}.json`)
  return tokenData?.access_token
}

async function findBidsProject(token) {
  // Get user's workspaces
  const workspacesRes = await fetch(`${ASANA_API}/users/me?opt_fields=workspaces,workspaces.name`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const workspacesData = await workspacesRes.json()
  const workspaces = workspacesData.data?.workspaces || []

  // Search for BIDS project
  for (const workspace of workspaces) {
    const projectsRes = await fetch(
      `${ASANA_API}/workspaces/${workspace.gid}/projects?opt_fields=name,gid`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    const projectsData = await projectsRes.json()
    const projects = projectsData.data || []

    const bidsProject = projects.find(p =>
      p.name.toLowerCase() === 'bids' ||
      p.name.toLowerCase().includes('bids')
    )

    if (bidsProject) {
      return { projectId: bidsProject.gid, projectName: bidsProject.name, workspace }
    }
  }

  return null
}

// GET - Fetch all tasks from BIDS with section info
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const includeCompleted = searchParams.get('includeCompleted') === 'true'

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

    // Find BIDS project
    const bidsProject = await findBidsProject(token)
    if (!bidsProject) {
      return NextResponse.json(
        { error: 'BIDS project not found in Asana' },
        { status: 404 }
      )
    }

    // Fetch sections
    const sectionsRes = await fetch(
      `${ASANA_API}/projects/${bidsProject.projectId}/sections?opt_fields=name,gid`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    const sectionsData = await sectionsRes.json()
    const sections = sectionsData.data || []

    // Build section map
    const sectionMap = {}
    sections.forEach(s => {
      sectionMap[s.gid] = s.name
    })

    // Fetch tasks with full details including memberships (for section info)
    const fields = 'name,notes,completed,due_on,assignee,assignee.name,assignee.email,memberships,memberships.section,memberships.section.name,tags,tags.name,permalink_url,created_at,modified_at,custom_fields,custom_fields.name,custom_fields.display_value'

    const tasksRes = await fetch(
      `${ASANA_API}/projects/${bidsProject.projectId}/tasks?opt_fields=${fields}&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    const tasksData = await tasksRes.json()
    let tasks = tasksData.data || []

    // Filter completed if needed
    if (!includeCompleted) {
      tasks = tasks.filter(t => !t.completed)
    }

    // Map tasks to our format with section/status info
    const mappedTasks = tasks.map(task => {
      // Get section from memberships
      const membership = task.memberships?.find(m => m.section)
      const sectionName = membership?.section?.name || '(No Section)'
      const sectionId = membership?.section?.gid

      // Map section to KO status
      const normalizedSection = sectionName.toLowerCase().trim()
      const koStatus = DEFAULT_STATUS_MAP[normalizedSection] || 'estimating'

      return {
        asana_id: task.gid,
        name: task.name,
        notes: task.notes || '',
        completed: task.completed,
        due_date: task.due_on,
        assignee: task.assignee ? {
          id: task.assignee.gid,
          name: task.assignee.name,
          email: task.assignee.email
        } : null,
        section: {
          id: sectionId,
          name: sectionName
        },
        status: koStatus,
        tags: task.tags?.map(t => t.name) || [],
        custom_fields: task.custom_fields?.reduce((acc, cf) => {
          if (cf.display_value) acc[cf.name] = cf.display_value
          return acc
        }, {}) || {},
        permalink_url: task.permalink_url,
        created_at: task.created_at,
        modified_at: task.modified_at
      }
    })

    // Get status mapping for reference
    const statusMapping = {}
    sections.forEach(s => {
      const normalizedName = s.name.toLowerCase().trim()
      statusMapping[s.name] = DEFAULT_STATUS_MAP[normalizedName] || 'estimating'
    })

    return NextResponse.json({
      project: {
        id: bidsProject.projectId,
        name: bidsProject.projectName
      },
      sections: sections.map(s => ({
        id: s.gid,
        name: s.name,
        koStatus: DEFAULT_STATUS_MAP[s.name.toLowerCase().trim()] || 'estimating'
      })),
      statusMapping,
      tasks: mappedTasks,
      totalCount: mappedTasks.length
    })

  } catch (err) {
    console.error('Asana BIDS fetch error:', err)
    return NextResponse.json(
      { error: 'Failed to fetch BIDS tasks' },
      { status: 500 }
    )
  }
}

// POST - Import BIDS tasks to KO Projects
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      tasks, // Array of Asana task IDs to import, or 'all'
      clearExisting = false, // Whether to clear existing projects first
      updateExisting = true, // Whether to update projects that already exist
      statusMap = {} // Custom status mapping overrides
    } = body

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

    // Find BIDS project
    const bidsProject = await findBidsProject(token)
    if (!bidsProject) {
      return NextResponse.json(
        { error: 'BIDS project not found in Asana' },
        { status: 404 }
      )
    }

    // Fetch all BIDS tasks
    const fields = 'name,notes,completed,due_on,assignee,assignee.name,assignee.email,memberships,memberships.section,memberships.section.name,tags,tags.name,permalink_url,created_at,custom_fields,custom_fields.name,custom_fields.display_value'

    const tasksRes = await fetch(
      `${ASANA_API}/projects/${bidsProject.projectId}/tasks?opt_fields=${fields}&limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    )
    const tasksData = await tasksRes.json()
    let asanaTasks = tasksData.data || []

    // Filter to non-completed tasks
    asanaTasks = asanaTasks.filter(t => !t.completed)

    // Filter to specific task IDs if provided
    if (tasks && tasks !== 'all' && Array.isArray(tasks)) {
      asanaTasks = asanaTasks.filter(t => tasks.includes(t.gid))
    }

    // Merge status maps
    const finalStatusMap = { ...DEFAULT_STATUS_MAP, ...statusMap }

    // Load existing projects
    let existingProjects = []
    try {
      existingProjects = await loadProjects()
    } catch (e) {
      console.log('No existing projects, starting fresh')
      existingProjects = []
    }

    // Build lookup by asana_id
    const existingByAsanaId = new Map()
    existingProjects.forEach(p => {
      if (p.asana_id) existingByAsanaId.set(p.asana_id, p)
    })

    // Process import
    const results = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: []
    }

    const newProjects = clearExisting ? [] : [...existingProjects]

    for (const task of asanaTasks) {
      try {
        // Get section info
        const membership = task.memberships?.find(m => m.section)
        const sectionName = membership?.section?.name || '(No Section)'
        const normalizedSection = sectionName.toLowerCase().trim()
        const koStatus = finalStatusMap[normalizedSection] || 'estimating'

        // Extract GC info from custom fields or notes
        let gcName = ''
        let gcEmail = ''
        let gcContact = ''

        if (task.custom_fields) {
          for (const cf of task.custom_fields) {
            const name = cf.name?.toLowerCase() || ''
            if (name.includes('gc') || name.includes('contractor') || name.includes('company')) {
              gcName = cf.display_value || ''
            }
            if (name.includes('email')) {
              gcEmail = cf.display_value || ''
            }
            if (name.includes('contact')) {
              gcContact = cf.display_value || ''
            }
          }
        }

        // Build project record
        const projectData = {
          name: task.name,
          notes: task.notes || '',
          due_date: task.due_on,
          status: koStatus,
          asana_id: task.gid,
          asana_section: sectionName,
          asana_url: task.permalink_url,
          assignee: task.assignee ? {
            id: task.assignee.gid,
            name: task.assignee.name,
            email: task.assignee.email
          } : null,
          gc_name: gcName,
          gc_email: gcEmail,
          gc_contact: gcContact,
          tags: task.tags?.map(t => t.name) || [],
          source: 'asana',
          updated_at: new Date().toISOString()
        }

        // Check if exists
        const existing = existingByAsanaId.get(task.gid)

        if (existing) {
          if (updateExisting) {
            // Update existing project
            const index = newProjects.findIndex(p => p.id === existing.id)
            if (index !== -1) {
              newProjects[index] = {
                ...existing,
                ...projectData,
                id: existing.id, // Keep original ID
                created_at: existing.created_at // Keep original create date
              }
              results.updated++
            }
          } else {
            results.skipped++
          }
        } else {
          // Create new project
          const newProject = {
            id: `proj-asana-${task.gid}`,
            ...projectData,
            created_at: new Date().toISOString()
          }
          newProjects.push(newProject)
          existingByAsanaId.set(task.gid, newProject)
          results.imported++
        }

      } catch (err) {
        results.errors.push({
          taskId: task.gid,
          taskName: task.name,
          error: err.message
        })
      }
    }

    // Save projects
    await saveProjects(newProjects)

    return NextResponse.json({
      success: true,
      ...results,
      totalProjects: newProjects.length
    })

  } catch (err) {
    console.error('BIDS import error:', err)
    return NextResponse.json(
      { error: 'Failed to import BIDS tasks' },
      { status: 500 }
    )
  }
}
