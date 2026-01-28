/**
 * Project Folders API (BigQuery-backed)
 * GET: Fetch all project folders with company/contact names
 * POST: Create a new project folder
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'
import { v4 as uuidv4 } from 'uuid'

/**
 * GET /api/ko/project-folders
 * Returns all project folders joined with company and contact names
 */
export async function GET() {
  try {
    const query = `
      SELECT
        p.id,
        p.project_name,
        p.company_id,
        p.contact_id,
        p.address,
        p.city,
        p.state,
        p.zip,
        p.status,
        p.notes,
        p.created_at,
        p.updated_at,
        c.company_name,
        c.website as company_website,
        CONCAT(COALESCE(ct.first_name, ''), ' ', COALESCE(ct.last_name, '')) as contact_name,
        ct.email as contact_email,
        ct.title as contact_title
      FROM \`master-roofing-intelligence.mr_main.project_folders\` p
      LEFT JOIN \`master-roofing-intelligence.mr_main.contacts_companies\` c
        ON p.company_id = c.id
      LEFT JOIN \`master-roofing-intelligence.mr_main.contacts_people\` ct
        ON p.contact_id = ct.id
      ORDER BY p.updated_at DESC
    `

    const rows = await runQuery(query, {}, { location: 'US' })

    const projects = rows.map(row => ({
      id: row.id,
      name: row.project_name,
      companyId: row.company_id,
      companyName: row.company_name || 'Unknown Company',
      companyWebsite: row.company_website,
      contactId: row.contact_id,
      contactName: row.contact_name?.trim() || 'Unknown Contact',
      contactEmail: row.contact_email,
      contactTitle: row.contact_title,
      address: row.address,
      city: row.city,
      state: row.state,
      zip: row.zip,
      status: row.status || 'active',
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      healthStatus: 'green',
      summary: row.notes || 'Project with ' + (row.company_name || 'company'),
      isIngesting: false,
      tickerMessages: [],
    }))

    return NextResponse.json({ projects, count: projects.length })
  } catch (error) {
    console.error('[API] GET /api/ko/project-folders error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { projectName, companyId, contactId, address, city, state, zip, notes } = body

    if (!projectName || !companyId || !contactId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectName, companyId, contactId' },
        { status: 400 }
      )
    }

    const duplicateCheck = await runQuery(
      'SELECT id FROM \`master-roofing-intelligence.mr_main.project_folders\` WHERE LOWER(project_name) = LOWER(@projectName)',
      { projectName },
      { location: 'US' }
    )

    if (duplicateCheck.length > 0) {
      return NextResponse.json(
        { error: 'A project with this name already exists', duplicate: true },
        { status: 409 }
      )
    }

    const id = 'proj_' + uuidv4().replace(/-/g, '').substring(0, 16)

    const insertQuery = `
      INSERT INTO \`master-roofing-intelligence.mr_main.project_folders\`
        (id, project_name, company_id, contact_id, address, city, state, zip, status, notes, created_at, updated_at)
      VALUES
        (@id, @projectName, @companyId, @contactId, @address, @city, @state, @zip, 'active', @notes, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())
    `

    await runQuery(
      insertQuery,
      { id, projectName, companyId, contactId, address: address || '', city: city || '', state: state || '', zip: zip || '', notes: notes || '' },
      { location: 'US' }
    )

    const newProjectQuery = `
      SELECT p.*, c.company_name, CONCAT(COALESCE(ct.first_name, ''), ' ', COALESCE(ct.last_name, '')) as contact_name
      FROM \`master-roofing-intelligence.mr_main.project_folders\` p
      LEFT JOIN \`master-roofing-intelligence.mr_main.contacts_companies\` c ON p.company_id = c.id
      LEFT JOIN \`master-roofing-intelligence.mr_main.contacts_people\` ct ON p.contact_id = ct.id
      WHERE p.id = @id
    `

    const [newProject] = await runQuery(newProjectQuery, { id }, { location: 'US' })

    return NextResponse.json({
      success: true,
      project: {
        id: newProject.id,
        name: newProject.project_name,
        companyId: newProject.company_id,
        companyName: newProject.company_name,
        contactId: newProject.contact_id,
        contactName: newProject.contact_name?.trim(),
        address: newProject.address,
        city: newProject.city,
        state: newProject.state,
        zip: newProject.zip,
        status: newProject.status,
        notes: newProject.notes,
        createdAt: newProject.created_at,
        updatedAt: newProject.updated_at,
        healthStatus: 'green',
        summary: newProject.notes || 'New project with ' + newProject.company_name,
        isIngesting: false,
        tickerMessages: [],
      },
    })
  } catch (error) {
    console.error('[API] POST /api/ko/project-folders error:', error)
    return NextResponse.json(
      { error: 'Failed to create project', details: error.message },
      { status: 500 }
    )
  }
}
