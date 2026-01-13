import { NextResponse } from "next/server"
import { importProjectsFromCSV, getCSVTemplateHeaders } from "@/lib/project-storage"

/**
 * POST /api/ko/projects/import
 * Import projects from CSV content
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { csvContent, options = {} } = body

    if (!csvContent) {
      return NextResponse.json(
        { error: "CSV content is required" },
        { status: 400 }
      )
    }

    // Parse CSV
    const rows = parseCSV(csvContent)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "No data rows found in CSV" },
        { status: 400 }
      )
    }

    console.log(`Importing ${rows.length} projects from CSV`)

    // Import projects
    const results = await importProjectsFromCSV(rows, options)

    return NextResponse.json({
      success: true,
      ...results,
      message: `Imported ${results.imported} projects, updated ${results.updated}, skipped ${results.skipped} duplicates`,
    })

  } catch (error) {
    console.error("Error importing projects:", error)
    return NextResponse.json(
      { error: error.message || "Failed to import projects" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ko/projects/import
 * Get CSV template for download
 */
export async function GET() {
  const headers = getCSVTemplateHeaders()

  // Create example row
  const exampleRow = {
    name: '123 Main Street',
    address: '123 Main Street, Brooklyn, NY 11201',
    gc_name: 'ABC Construction',
    gc_id: 'gc-abc',
    amount: '250000',
    due_date: '2025-03-15',
    status: 'estimating',
    notes: 'New construction project',
    borough: 'Brooklyn',
    city: 'New York',
    state: 'NY',
    zip: '11201',
    gc_contact: 'John Smith',
    gc_email: 'john@abcconstruction.com',
    gc_phone: '555-123-4567',
  }

  const csvContent = [
    headers.join(','),
    headers.map(h => exampleRow[h] || '').join(','),
  ].join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename=projects_template.csv',
    },
  })
}

/**
 * Parse CSV content into array of objects
 */
function parseCSV(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim())

  if (lines.length < 2) {
    return []
  }

  // Parse header row
  const headers = parseCSVLine(lines[0])

  // Parse data rows
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])

    // Skip empty rows
    if (values.every(v => !v.trim())) {
      continue
    }

    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    rows.push(row)
  }

  return rows
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i++
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Don't forget the last field
  result.push(current.trim())

  return result
}
