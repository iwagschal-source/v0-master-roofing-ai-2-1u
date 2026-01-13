import { searchSheets, readSheetValues } from '@/lib/google-sheets'
import { NextResponse } from 'next/server'

/**
 * GET /api/ko/sheets/search?q=query&limit=10
 * Search for Google Sheets by name
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const includeData = searchParams.get('data') === 'true'
    const dataRange = searchParams.get('range') || 'Sheet1!A1:Z100'

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      )
    }

    const sheets = await searchSheets(query, limit)

    // If includeData is true, also fetch the data from the first matching sheet
    if (includeData && sheets.length > 0) {
      try {
        const data = await readSheetValues(sheets[0].id, dataRange)
        sheets[0].data = data
      } catch (dataError) {
        sheets[0].dataError = dataError.message
      }
    }

    return NextResponse.json({
      query,
      count: sheets.length,
      sheets,
    })
  } catch (error) {
    console.error('Error searching sheets:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
