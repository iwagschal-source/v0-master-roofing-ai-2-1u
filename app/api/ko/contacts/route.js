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
        { location: 'us-east4' }
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

      const rows = await runQuery(query, params, { location: 'us-east4' })

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
        { location: 'us-east4' }
      ),
      runQuery(
        'SELECT id, company_id, first_name, last_name, email FROM \`master-roofing-intelligence.mr_main.contacts_people\` ORDER BY last_name ASC, first_name ASC LIMIT 500',
        {},
        { location: 'us-east4' }
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
