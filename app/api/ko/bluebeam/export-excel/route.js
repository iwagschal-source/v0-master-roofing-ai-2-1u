/**
 * Bluebeam Excel Export API Proxy
 *
 * Proxies requests to the backend Excel generator to avoid CORS issues.
 * The backend generates Excel files from Bluebeam CSV data using the MR template.
 */

import { NextResponse } from 'next/server'

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://136.111.252.120:8000'

/**
 * POST /api/ko/bluebeam/export-excel
 * Generate Excel takeoff from Bluebeam data
 *
 * Body params:
 * - csv_content: Original CSV content (optional if template_data provided)
 * - template_data: Pre-parsed template data from /convert endpoint
 * - project_name: Project name for the Excel file
 * - gc_name: GC name (optional)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const { csv_content, template_data, project_name, gc_name } = body

    if (!csv_content && !template_data) {
      return NextResponse.json(
        { detail: 'Either csv_content or template_data is required' },
        { status: 400 }
      )
    }

    // Call backend to generate Excel
    const backendRes = await fetch(`${BACKEND_URL}/v1/bluebeam/export-excel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv_content,
        template_data,
        project_name: project_name || 'Takeoff',
        gc_name
      }),
      signal: AbortSignal.timeout(30000) // 30s timeout for Excel generation
    })

    if (!backendRes.ok) {
      const errText = await backendRes.text()
      let errDetail = 'Backend error'
      try {
        const errJson = JSON.parse(errText)
        errDetail = errJson.detail || errText
      } catch {
        errDetail = errText
      }
      return NextResponse.json(
        { detail: errDetail },
        { status: backendRes.status }
      )
    }

    // Return Excel file as blob
    const excelBlob = await backendRes.blob()

    // Get filename from Content-Disposition header if present
    const contentDisposition = backendRes.headers.get('Content-Disposition')
    let filename = `${(project_name || 'Takeoff').replace(/[^a-zA-Z0-9]/g, '_')}_Takeoff.xlsx`
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="?([^";\n]+)"?/)
      if (match) {
        filename = match[1]
      }
    }

    // Return Excel with proper headers
    return new NextResponse(excelBlob, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (err) {
    console.error('Excel export proxy error:', err)

    // Handle timeout specifically
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return NextResponse.json(
        { detail: 'Backend timeout - Excel generation took too long' },
        { status: 504 }
      )
    }

    return NextResponse.json(
      { detail: 'Failed to generate Excel: ' + err.message },
      { status: 500 }
    )
  }
}
