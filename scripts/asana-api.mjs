#!/usr/bin/env node
/**
 * Direct Asana API access
 *
 * Usage:
 *   node scripts/asana-api.mjs projects
 *   node scripts/asana-api.mjs tasks <project_gid>
 *   node scripts/asana-api.mjs task <task_gid>
 *   node scripts/asana-api.mjs search <query>
 */

const PAT = '2/1210265196196335/1212775865924391:725275789145e9e8e1946d3737a9e8b9'
const WORKSPACE = '510750453879446'
const BIDS_PROJECT = '1160614300237021'

async function asanaFetch(endpoint) {
  const response = await fetch(`https://app.asana.com/api/1.0${endpoint}`, {
    headers: { 'Authorization': `Bearer ${PAT}` }
  })
  return response.json()
}

async function listProjects() {
  const result = await asanaFetch(`/workspaces/${WORKSPACE}/projects`)
  console.log('Projects:\n')
  for (const p of result.data) {
    console.log(`  ${p.gid}  ${p.name}`)
  }
}

async function listTasks(projectGid) {
  const result = await asanaFetch(`/projects/${projectGid}/tasks?opt_fields=name,created_at,completed,due_on,assignee.name&limit=100`)
  console.log(`Tasks in project ${projectGid}:\n`)
  for (const t of result.data) {
    const status = t.completed ? '✓' : ' '
    const assignee = t.assignee?.name || 'Unassigned'
    console.log(`  [${status}] ${t.name}`)
    console.log(`      GID: ${t.gid} | Created: ${t.created_at?.split('T')[0]} | Assignee: ${assignee}`)
  }
  console.log(`\nTotal: ${result.data.length} tasks`)
}

async function getTask(taskGid) {
  const result = await asanaFetch(`/tasks/${taskGid}?opt_fields=name,created_at,completed,completed_at,due_on,assignee.name,notes,projects.name`)
  const t = result.data
  console.log(`Task: ${t.name}`)
  console.log(`GID: ${t.gid}`)
  console.log(`Created: ${t.created_at}`)
  console.log(`Completed: ${t.completed ? t.completed_at : 'No'}`)
  console.log(`Due: ${t.due_on || 'None'}`)
  console.log(`Assignee: ${t.assignee?.name || 'Unassigned'}`)
  console.log(`Projects: ${t.projects?.map(p => p.name).join(', ') || 'None'}`)
  console.log(`\nNotes:\n${t.notes || '(empty)'}`)
}

async function searchTasks(query) {
  // Search in Bids project
  const result = await asanaFetch(`/projects/${BIDS_PROJECT}/tasks?opt_fields=name,created_at,completed&limit=100`)
  const matches = result.data.filter(t => t.name.toLowerCase().includes(query.toLowerCase()))

  console.log(`Search results for "${query}":\n`)
  for (const t of matches) {
    const status = t.completed ? '✓' : ' '
    console.log(`  [${status}] ${t.name}`)
    console.log(`      GID: ${t.gid} | Created: ${t.created_at?.split('T')[0]}`)
  }
  console.log(`\nFound: ${matches.length} tasks`)
}

const [,, command, arg] = process.argv

switch (command) {
  case 'projects':
    listProjects()
    break
  case 'tasks':
    listTasks(arg || BIDS_PROJECT)
    break
  case 'task':
    if (!arg) { console.log('Usage: node scripts/asana-api.mjs task <task_gid>'); process.exit(1) }
    getTask(arg)
    break
  case 'search':
    if (!arg) { console.log('Usage: node scripts/asana-api.mjs search <query>'); process.exit(1) }
    searchTasks(arg)
    break
  default:
    console.log(`Asana API

Usage:
  node scripts/asana-api.mjs projects          List all projects
  node scripts/asana-api.mjs tasks [gid]       List tasks (default: Bids)
  node scripts/asana-api.mjs task <gid>        Get task details
  node scripts/asana-api.mjs search <query>    Search tasks by name

Project GIDs:
  Bids:              1160614300237021
  Projects:          916647532526133
  Billing:           916647532526131
  Lease:             1199602992929879
  Private Customers: 1208148163977293
`)
}
