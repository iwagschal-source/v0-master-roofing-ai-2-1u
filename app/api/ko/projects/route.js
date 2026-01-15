import { NextResponse } from "next/server"
import { createProjectSheet, shareSheet, batchUpdateSheet } from "@/lib/google-sheets"
import { loadProjects, addProject, saveProjects } from "@/lib/project-storage"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    let projects = []

    // Load from GCS
    try {
      projects = await loadProjects()
      console.log(`Loaded ${projects.length} projects from GCS`)
    } catch (gcsError) {
      console.warn("GCS load failed:", gcsError.message)
      projects = []
    }

    // Filter by status if provided
    if (status && status !== "all") {
      projects = projects.filter(p => p.status === status)
    }

    // Filter by search query if provided
    if (search) {
      const query = search.toLowerCase()
      projects = projects.filter(p =>
        p.name?.toLowerCase().includes(query) ||
        p.address?.toLowerCase().includes(query) ||
        p.gc_name?.toLowerCase().includes(query)
      )
    }

    // Sort by created_at desc, then by name
    projects.sort((a, b) => {
      if (a.created_at && b.created_at) {
        return new Date(b.created_at) - new Date(a.created_at)
      }
      return (a.name || '').localeCompare(b.name || '')
    })

    return NextResponse.json({
      projects,
      total: projects.length,
      source: 'gcs',
    })
  } catch (error) {
    console.error("Error fetching projects:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects", details: error.message },
      { status: 500 }
    )
  }
}

// Create a new project with auto-generated Google Sheet
export async function POST(request) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      )
    }

    let sheetId = null
    let sheetUrl = null
    let sheetError = null

    // Auto-create Google Sheet if configured
    const isGoogleConfigured = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SHEET_TEMPLATE_ID

    if (isGoogleConfigured && body.createSheet !== false) {
      try {
        const sheetResult = await createProjectSheet(body.name, body.gc_name)
        sheetId = sheetResult.sheetId
        sheetUrl = sheetResult.sheetUrl

        // Make the sheet publicly viewable
        try {
          await shareSheet(sheetId, 'reader')
        } catch (shareError) {
          console.warn("Failed to share sheet:", shareError)
        }

        // Populate the Setup tab with project info
        const setupData = []
        if (body.name) {
          setupData.push({ range: "Setup!B2", values: [[body.name]] })
        }
        if (body.address) {
          setupData.push({ range: "Setup!B3", values: [[body.address]] })
        }
        if (body.gc_name) {
          setupData.push({ range: "Setup!B4", values: [[body.gc_name]] })
        }
        if (body.amount) {
          setupData.push({ range: "Setup!B5", values: [[body.amount]] })
        }
        if (body.due_date) {
          setupData.push({ range: "Setup!B6", values: [[body.due_date]] })
        }

        if (setupData.length > 0) {
          try {
            await batchUpdateSheet(sheetId, setupData)
          } catch (updateError) {
            console.warn("Failed to populate Setup tab:", updateError)
          }
        }
      } catch (error) {
        console.error("Error creating Google Sheet:", error)
        sheetError = error.message
        // Don't fail project creation if sheet creation fails
      }
    }

    // Create the project record
    const newProject = {
      name: body.name,
      address: body.address || body.name,
      gc_id: body.gc_id || null,
      gc_name: body.gc_name || null,
      amount: body.amount || 0,
      due_date: body.due_date || null,
      status: body.status || "estimating",
      notes: body.notes || null,
      borough: body.borough || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      gc_contact: body.gc_contact || null,
      gc_email: body.gc_email || null,
      gc_phone: body.gc_phone || null,
      sheet_id: sheetId,
      sheet_url: sheetUrl,
    }

    // Save to GCS
    try {
      const savedProject = await addProject(newProject)

      return NextResponse.json({
        success: true,
        project: savedProject,
        ...(sheetError && { sheetError }),
      })
    } catch (gcsError) {
      console.error("Error saving project to GCS:", gcsError)
      return NextResponse.json(
        { error: "Failed to save project", details: gcsError.message },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error("Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project", details: error.message },
      { status: 500 }
    )
  }
}

// Update a project
export async function PUT(request) {
  try {
    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      )
    }

    // Load, update, and save
    const projects = await loadProjects()
    const index = projects.findIndex(p => p.id === body.id)

    if (index === -1) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    projects[index] = {
      ...projects[index],
      ...body,
      updated_at: new Date().toISOString(),
    }

    await saveProjects(projects)

    return NextResponse.json({
      success: true,
      project: projects[index],
    })

  } catch (error) {
    console.error("Error updating project:", error)
    return NextResponse.json(
      { error: "Failed to update project", details: error.message },
      { status: 500 }
    )
  }
}

// Delete a project
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      )
    }

    const projects = await loadProjects()
    const index = projects.findIndex(p => p.id === id)

    if (index === -1) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      )
    }

    const deleted = projects.splice(index, 1)[0]
    await saveProjects(projects)

    return NextResponse.json({
      success: true,
      deleted: deleted,
    })

  } catch (error) {
    console.error("Error deleting project:", error)
    return NextResponse.json(
      { error: "Failed to delete project", details: error.message },
      { status: 500 }
    )
  }
}
