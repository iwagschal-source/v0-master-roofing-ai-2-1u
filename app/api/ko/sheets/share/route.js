/**
 * Share a Google Sheet with anyone who has the link
 */
import { NextResponse } from 'next/server'
import { shareSheet } from '@/lib/google-sheets'

export async function POST(request) {
  try {
    const { spreadsheetId } = await request.json()

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'spreadsheetId required' }, { status: 400 })
    }

    await shareSheet(spreadsheetId, 'writer')

    return NextResponse.json({
      success: true,
      spreadsheetId,
      message: 'Sheet shared with anyone who has link'
    })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
