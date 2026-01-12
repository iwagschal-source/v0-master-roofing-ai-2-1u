import { NextResponse } from "next/server"
import { createProjectSheet, shareSheet, batchUpdateSheet } from "@/lib/google-sheets"

/**
 * POST /api/ko/projects/[id]/create-sheet
 *
 * Creates a new Google Sheet from the KO template for a project.
 * Optionally populates the Setup tab with project info.
 *
 * Request body:
 * {
 *   projectName: string,      // Required: Name of the project
 *   gcName?: string,          // Optional: GC name
 *   address?: string,         // Optional: Project address
 *   amount?: number,          // Optional: Project amount
 *   dueDate?: string,         // Optional: Due date
 *   makePublic?: boolean,     // Optional: Share with anyone (default: true)
 * }
 *
 * Returns:
 * {
 *   success: boolean,
 *   sheetId: string,
 *   sheetUrl: string,
 *   projectId: string,
 * }
 */
export async function POST(request, { params }) {
  try {
    const { id: projectId } = await params
    const body = await request.json()
    const { projectName, gcName, address, amount, dueDate, makePublic = true } = body

    if (!projectName) {
      return NextResponse.json(
        { error: "projectName is required" },
        { status: 400 }
      )
    }

    // Check if Google Sheets is configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_SHEET_TEMPLATE_ID) {
      // Return mock response for development/demo
      console.log("Google Sheets not configured, returning mock response")
      const mockSheetId = `mock-sheet-${Date.now()}`
      return NextResponse.json({
        success: true,
        sheetId: mockSheetId,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${mockSheetId}/edit`,
        projectId,
        mock: true,
        message: "Mock sheet created (Google Sheets not configured)",
      })
    }

    // Create the sheet from template
    const { sheetId, sheetUrl } = await createProjectSheet(projectName, gcName)

    // Make the sheet publicly viewable if requested
    if (makePublic) {
      try {
        await shareSheet(sheetId, 'reader')
      } catch (shareError) {
        console.warn("Failed to share sheet:", shareError)
        // Don't fail the whole request if sharing fails
      }
    }

    // Populate the Setup tab with project info
    if (address || amount || dueDate || gcName) {
      try {
        const setupData = []

        // These cell references assume the Setup tab has these fields
        // Adjust based on your actual template structure
        if (projectName) {
          setupData.push({ range: "Setup!B2", values: [[projectName]] })
        }
        if (address) {
          setupData.push({ range: "Setup!B3", values: [[address]] })
        }
        if (gcName) {
          setupData.push({ range: "Setup!B4", values: [[gcName]] })
        }
        if (amount) {
          setupData.push({ range: "Setup!B5", values: [[amount]] })
        }
        if (dueDate) {
          setupData.push({ range: "Setup!B6", values: [[dueDate]] })
        }

        if (setupData.length > 0) {
          await batchUpdateSheet(sheetId, setupData)
        }
      } catch (updateError) {
        console.warn("Failed to populate Setup tab:", updateError)
        // Don't fail if we can't populate - sheet is still created
      }
    }

    return NextResponse.json({
      success: true,
      sheetId,
      sheetUrl,
      projectId,
    })
  } catch (error) {
    console.error("Error creating project sheet:", error)
    return NextResponse.json(
      {
        error: "Failed to create project sheet",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
