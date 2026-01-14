/**
 * GCS-based Project Storage
 *
 * Stores projects as JSON files in gs://ko-platform-data/projects/
 * - projects.json: Array of all projects
 * - Individual project files: projects/{project_id}.json
 */

import { Storage } from '@google-cloud/storage'

const BUCKET_NAME = 'ko-platform-data'
const PROJECTS_PATH = 'projects/projects.json'

let storageClient = null

/**
 * Get authenticated GCS client
 */
function getStorageClient() {
  if (!storageClient) {
    // Try service account JSON from env
    const keyJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (keyJson) {
      const credentials = JSON.parse(keyJson)
      storageClient = new Storage({ credentials })
    } else {
      // Fall back to default credentials (ADC)
      storageClient = new Storage()
    }
  }
  return storageClient
}

/**
 * Load all projects from GCS
 * @returns {Promise<Array>} Array of project objects
 */
export async function loadProjects() {
  try {
    const storage = getStorageClient()
    const bucket = storage.bucket(BUCKET_NAME)
    const file = bucket.file(PROJECTS_PATH)

    const [exists] = await file.exists()
    if (!exists) {
      console.log('No projects file found, returning empty array')
      return []
    }

    const [content] = await file.download()
    const projects = JSON.parse(content.toString())

    console.log(`Loaded ${projects.length} projects from GCS`)
    return projects
  } catch (error) {
    console.error('Error loading projects from GCS:', error)
    throw error
  }
}

/**
 * Save all projects to GCS
 * @param {Array} projects - Array of project objects
 */
export async function saveProjects(projects) {
  try {
    const storage = getStorageClient()
    const bucket = storage.bucket(BUCKET_NAME)
    const file = bucket.file(PROJECTS_PATH)

    const content = JSON.stringify(projects, null, 2)
    await file.save(content, {
      contentType: 'application/json',
      metadata: {
        updated: new Date().toISOString(),
        count: projects.length.toString(),
      }
    })

    console.log(`Saved ${projects.length} projects to GCS`)
  } catch (error) {
    console.error('Error saving projects to GCS:', error)
    throw error
  }
}

/**
 * Add a single project
 * @param {Object} project - Project to add
 * @returns {Promise<Object>} The added project with generated ID
 */
export async function addProject(project) {
  const projects = await loadProjects()

  // Generate ID if not provided
  const newProject = {
    ...project,
    id: project.id || `proj-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  projects.push(newProject)
  await saveProjects(projects)

  return newProject
}

/**
 * Update a project by ID
 * @param {string} projectId - Project ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated project or null if not found
 */
export async function updateProject(projectId, updates) {
  const projects = await loadProjects()
  const index = projects.findIndex(p => p.id === projectId)

  if (index === -1) {
    return null
  }

  projects[index] = {
    ...projects[index],
    ...updates,
    updated_at: new Date().toISOString(),
  }

  await saveProjects(projects)
  return projects[index]
}

/**
 * Delete a project by ID
 * @param {string} projectId - Project ID
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
export async function deleteProject(projectId) {
  const projects = await loadProjects()
  const index = projects.findIndex(p => p.id === projectId)

  if (index === -1) {
    return false
  }

  projects.splice(index, 1)
  await saveProjects(projects)
  return true
}

/**
 * Import projects from CSV data
 * @param {Array<Object>} csvRows - Parsed CSV rows
 * @param {Object} options - Import options
 * @returns {Promise<{imported: number, skipped: number, errors: Array}>}
 */
export async function importProjectsFromCSV(csvRows, options = {}) {
  const { skipDuplicates = true, updateExisting = false } = options

  const existingProjects = await loadProjects()
  const existingNames = new Set(existingProjects.map(p => p.name?.toLowerCase()))

  const results = {
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  }

  const newProjects = []

  for (const row of csvRows) {
    try {
      // Map CSV columns to project fields
      const project = mapCSVRowToProject(row)

      if (!project.name) {
        results.errors.push({ row, error: 'Missing project name' })
        continue
      }

      const nameLower = project.name.toLowerCase()

      if (existingNames.has(nameLower)) {
        if (updateExisting) {
          // Find and update existing project
          const existingIndex = existingProjects.findIndex(
            p => p.name?.toLowerCase() === nameLower
          )
          if (existingIndex !== -1) {
            existingProjects[existingIndex] = {
              ...existingProjects[existingIndex],
              ...project,
              updated_at: new Date().toISOString(),
            }
            results.updated++
          }
        } else if (skipDuplicates) {
          results.skipped++
        }
        continue
      }

      // Add new project
      const newProject = {
        id: `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...project,
        status: project.status || 'estimating',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      newProjects.push(newProject)
      existingNames.add(nameLower)
      results.imported++

    } catch (error) {
      results.errors.push({ row, error: error.message })
    }
  }

  // Save all projects
  if (newProjects.length > 0 || results.updated > 0) {
    await saveProjects([...existingProjects, ...newProjects])
  }

  return results
}

/**
 * Map a CSV row to project fields
 * Handles various column name formats
 */
function mapCSVRowToProject(row) {
  // Normalize keys to lowercase for matching
  const normalizedRow = {}
  for (const [key, value] of Object.entries(row)) {
    normalizedRow[key.toLowerCase().trim()] = value?.toString().trim() || ''
  }

  // Helper to get value with multiple possible column names
  const getValue = (...keys) => {
    for (const key of keys) {
      if (normalizedRow[key]) return normalizedRow[key]
    }
    return ''
  }

  // Parse amount - remove $, commas, etc.
  const parseAmount = (val) => {
    if (!val) return 0
    const cleaned = val.replace(/[$,\s]/g, '')
    return parseFloat(cleaned) || 0
  }

  // Parse date - handle various formats
  const parseDate = (val) => {
    if (!val) return null
    try {
      const date = new Date(val)
      if (isNaN(date.getTime())) return null
      return date.toISOString().split('T')[0]
    } catch {
      return null
    }
  }

  return {
    name: getValue('name', 'project_name', 'project name', 'projectname', 'project'),
    address: getValue('address', 'project_address', 'location', 'site_address', 'site address'),
    gc_name: getValue('gc_name', 'gc name', 'gcname', 'general_contractor', 'general contractor', 'gc', 'contractor'),
    gc_id: getValue('gc_id', 'gc id', 'gcid'),
    amount: parseAmount(getValue('amount', 'value', 'contract_value', 'contract value', 'price', 'total')),
    due_date: parseDate(getValue('due_date', 'due date', 'duedate', 'deadline', 'bid_date', 'bid date')),
    status: getValue('status', 'project_status', 'state')?.toLowerCase() || 'estimating',
    notes: getValue('notes', 'description', 'comments'),
    // Additional fields
    borough: getValue('borough', 'boro'),
    city: getValue('city'),
    state: getValue('state'),
    zip: getValue('zip', 'zipcode', 'zip_code'),
    gc_contact: getValue('gc_contact', 'contact', 'contact_name'),
    gc_email: getValue('gc_email', 'email', 'contact_email'),
    gc_phone: getValue('gc_phone', 'phone', 'contact_phone'),
  }
}

/**
 * Get CSV template headers for download
 */
export function getCSVTemplateHeaders() {
  return [
    'name',
    'address',
    'gc_name',
    'gc_id',
    'amount',
    'due_date',
    'status',
    'notes',
    'borough',
    'city',
    'state',
    'zip',
    'gc_contact',
    'gc_email',
    'gc_phone',
  ]
}

/**
 * Export projects to CSV format
 * @param {Array} projects - Projects to export
 * @returns {string} CSV content
 */
export function exportProjectsToCSV(projects) {
  const headers = getCSVTemplateHeaders()

  const rows = projects.map(project => {
    return headers.map(header => {
      const value = project[header] || ''
      // Escape quotes and wrap in quotes if contains comma or quote
      if (value.toString().includes(',') || value.toString().includes('"')) {
        return `"${value.toString().replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}
// trigger 1768348831
