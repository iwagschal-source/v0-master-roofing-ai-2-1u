/**
 * Contacts API (BigQuery-backed)
 * GET: Fetch companies and/or people from mr_main
 * Query params:
 *   - type=companies: Return all companies
 *   - type=people&companyId=xxx: Return contacts for a company
 *   - (no params): Return both companies and people lists
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const companyId = searchParams.get('companyId')
    const search = searchParams.get('search')

    // Fetch companies only
    if (type === 'companies') {
      let query = `
        SELECT id, company_name, website, phone, email, address, city, state, zip
        FROM \`master-roofing-intelligence.mr_main.contacts_companies\`
      `
      
      if (search) {
        query += ' WHERE LOWER(company_name) LIKE LOWER(@search)'
      }
      query += ' ORDER BY company_name ASC LIMIT 200'

      const rows = await runQuery(
        query,
        search ? { search: '%' + search + '%' } : {},
        { location: 'US' }
      )

      const companies = rows.map(row => ({
        id: row.id,
        name: row.company_name,
        website: row.website,
        phone: row.phone,
        email: row.email,
        address: row.address,
        city: row.city,
        state: row.state,
        zip: row.zip,
      }))

      return NextResponse.json({ companies, count: companies.length })
    }

    // Fetch people for a specific company
    if (type === 'people') {
      let query = `
        SELECT id, company_id, first_name, last_name, title, phone, email
        FROM \`master-roofing-intelligence.mr_main.contacts_people\`
      `
      
      const params = {}
      const conditions = []
      
      if (companyId) {
        conditions.push('company_id = @companyId')
        params.companyId = companyId
      }
      
      if (search) {
        conditions.push('(LOWER(first_name) LIKE LOWER(@search) OR LOWER(last_name) LIKE LOWER(@search) OR LOWER(email) LIKE LOWER(@search))')
        params.search = '%' + search + '%'
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
      
      query += ' ORDER BY last_name ASC, first_name ASC LIMIT 200'

      const rows = await runQuery(query, params, { location: 'US' })

      const people = rows.map(row => ({
        id: row.id,
        companyId: row.company_id,
        firstName: row.first_name,
        lastName: row.last_name,
        name: ((row.first_name || '') + ' ' + (row.last_name || '')).trim(),
        title: row.title,
        phone: row.phone,
        email: row.email,
      }))

      return NextResponse.json({ people, count: people.length })
    }

    // Default: Return both companies and people
    const [companiesResult, peopleResult] = await Promise.all([
      runQuery(
        'SELECT id, company_name, website FROM \`master-roofing-intelligence.mr_main.contacts_companies\` ORDER BY company_name ASC LIMIT 200',
        {},
        { location: 'US' }
      ),
      runQuery(
        'SELECT id, company_id, first_name, last_name, email FROM \`master-roofing-intelligence.mr_main.contacts_people\` ORDER BY last_name ASC, first_name ASC LIMIT 500',
        {},
        { location: 'US' }
      ),
    ])

    const companies = companiesResult.map(row => ({
      id: row.id,
      name: row.company_name,
      website: row.website,
    }))

    const people = peopleResult.map(row => ({
      id: row.id,
      companyId: row.company_id,
      name: ((row.first_name || '') + ' ' + (row.last_name || '')).trim(),
      email: row.email,
    }))

    return NextResponse.json({
      companies,
      people,
      counts: { companies: companies.length, people: people.length },
    })
  } catch (error) {
    console.error('[API] GET /api/ko/contacts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/ko/contacts
 * Create new company or person
 * Body: { type: 'company' | 'person', ...data }
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    if (type === 'company') {
      const { name, website, phone, email, address, city, state, zip } = data

      if (!name?.trim()) {
        return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
      }

      const id = 'hub_' + Date.now() + Math.random().toString(36).substr(2, 9)

      await runQuery(`
        INSERT INTO \`master-roofing-intelligence.mr_main.contacts_companies\`
          (id, company_name, website, phone, email, address, city, state, zip)
        VALUES (@id, @name, @website, @phone, @email, @address, @city, @state, @zip)
      `, {
        id,
        name: name.trim(),
        website: website || '',
        phone: phone || '',
        email: email || '',
        address: address || '',
        city: city || '',
        state: state || '',
        zip: zip || '',
      }, { location: 'US' })

      return NextResponse.json({ success: true, id, type: 'company' })
    }

    if (type === 'person') {
      const { firstName, lastName, companyId, title, phone, email } = data

      if (!firstName?.trim() && !lastName?.trim()) {
        return NextResponse.json({ error: 'First or last name is required' }, { status: 400 })
      }

      const id = 'hub_' + Date.now() + Math.random().toString(36).substr(2, 9)

      await runQuery(`
        INSERT INTO \`master-roofing-intelligence.mr_main.contacts_people\`
          (id, company_id, first_name, last_name, title, phone, email)
        VALUES (@id, @companyId, @firstName, @lastName, @title, @phone, @email)
      `, {
        id,
        companyId: companyId || '',
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        title: title || '',
        phone: phone || '',
        email: email || '',
      }, { location: 'US' })

      return NextResponse.json({ success: true, id, type: 'person' })
    }

    return NextResponse.json({ error: 'Invalid type. Must be "company" or "person"' }, { status: 400 })
  } catch (error) {
    console.error('[API] POST /api/ko/contacts error:', error)
    return NextResponse.json({ error: 'Failed to create contact', details: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/ko/contacts
 * Update existing company or person
 * Body: { type: 'company' | 'person', id: string, ...data }
 */
export async function PUT(request) {
  try {
    const body = await request.json()
    const { type, id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    if (type === 'company') {
      const { name, website, phone, email, address, city, state, zip } = data

      await runQuery(`
        UPDATE \`master-roofing-intelligence.mr_main.contacts_companies\`
        SET company_name = @name,
            website = @website,
            phone = @phone,
            email = @email,
            address = @address,
            city = @city,
            state = @state,
            zip = @zip
        WHERE id = @id
      `, {
        id,
        name: name?.trim() || '',
        website: website || '',
        phone: phone || '',
        email: email || '',
        address: address || '',
        city: city || '',
        state: state || '',
        zip: zip || '',
      }, { location: 'US' })

      return NextResponse.json({ success: true, id, type: 'company' })
    }

    if (type === 'person') {
      const { firstName, lastName, companyId, title, phone, email } = data

      await runQuery(`
        UPDATE \`master-roofing-intelligence.mr_main.contacts_people\`
        SET first_name = @firstName,
            last_name = @lastName,
            company_id = @companyId,
            title = @title,
            phone = @phone,
            email = @email
        WHERE id = @id
      `, {
        id,
        firstName: firstName?.trim() || '',
        lastName: lastName?.trim() || '',
        companyId: companyId || '',
        title: title || '',
        phone: phone || '',
        email: email || '',
      }, { location: 'US' })

      return NextResponse.json({ success: true, id, type: 'person' })
    }

    return NextResponse.json({ error: 'Invalid type. Must be "company" or "person"' }, { status: 400 })
  } catch (error) {
    console.error('[API] PUT /api/ko/contacts error:', error)
    return NextResponse.json({ error: 'Failed to update contact', details: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/ko/contacts?type=company|person&id=xxx
 * Delete company or person
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const id = searchParams.get('id')

    if (!type || !id) {
      return NextResponse.json({ error: 'Type and ID are required' }, { status: 400 })
    }

    if (type === 'company') {
      await runQuery(
        'DELETE FROM `master-roofing-intelligence.mr_main.contacts_companies` WHERE id = @id',
        { id },
        { location: 'US' }
      )
      return NextResponse.json({ success: true, id, type: 'company' })
    }

    if (type === 'person') {
      await runQuery(
        'DELETE FROM `master-roofing-intelligence.mr_main.contacts_people` WHERE id = @id',
        { id },
        { location: 'US' }
      )
      return NextResponse.json({ success: true, id, type: 'person' })
    }

    return NextResponse.json({ error: 'Invalid type. Must be "company" or "person"' }, { status: 400 })
  } catch (error) {
    console.error('[API] DELETE /api/ko/contacts error:', error)
    return NextResponse.json({ error: 'Failed to delete contact', details: error.message }, { status: 500 })
  }
}
