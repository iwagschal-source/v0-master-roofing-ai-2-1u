/**
 * Recent Files API — returns last 5 most recent files for a category across all projects
 * GET /api/ko/folders/recent/[category]
 * Uses in-memory cache (5 min TTL) to avoid querying every project's Drive folder
 */

import { NextResponse } from 'next/server'
import { runQuery } from '@/lib/bigquery'
import { getAccessToken } from '@/lib/google-sheets'
import { listFilesInFolder, getOrCreateSubfolder } from '@/lib/google-drive'

const VALID_CATEGORIES = ['drawings', 'bluebeam', 'takeoff', 'markups', 'proposals']

// Simple in-memory cache: { [category]: { data, timestamp } }
// TODO: Future — store file metadata in BigQuery for faster lookups
const cache = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET(request, { params }) {
  try {
    const { category } = await params
    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
    }

    // Check cache
    const cached = cache[category]
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ files: cached.data })
    }

    // Get all projects with Drive folders (limit to recent 30 for performance)
    const projects = await runQuery(`
      SELECT id, project_name, drive_folder_id
      FROM \`master-roofing-intelligence.mr_main.project_folders\`
      WHERE drive_folder_id IS NOT NULL AND status != 'deleted'
      ORDER BY updated_at DESC
      LIMIT 30
    `, {}, { location: 'US' })

    if (!projects?.length) {
      return NextResponse.json({ files: [] })
    }

    const accessToken = await getAccessToken()
    const allFiles = []

    // Query each project's subfolder for files (parallel, with error tolerance)
    const results = await Promise.allSettled(
      projects.map(async (project) => {
        try {
          const subfolderId = await getOrCreateSubfolder(
            accessToken,
            project.drive_folder_id,
            category.charAt(0).toUpperCase() + category.slice(1) // "Drawings", "Bluebeam", etc.
          )
          if (!subfolderId) return []

          const files = await listFilesInFolder(accessToken, subfolderId)
          return (files || []).map(f => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime,
            webViewLink: f.webViewLink,
            projectId: project.id,
            projectName: project.project_name,
          }))
        } catch {
          return []
        }
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        allFiles.push(...result.value)
      }
    }

    // Sort by most recently modified and take top 5
    allFiles.sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime))
    const top5 = allFiles.slice(0, 5)

    // Update cache
    cache[category] = { data: top5, timestamp: Date.now() }

    return NextResponse.json({ files: top5 })
  } catch (err) {
    console.error('Recent files error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
