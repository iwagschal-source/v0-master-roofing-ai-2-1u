import { NextResponse } from "next/server"
import { Storage } from "@google-cloud/storage"

const BUCKET_NAME = "ko-platform-data"
const PROJECT_ID = "master-roofing-intelligence"

let storageClient = null

function getStorageClient() {
  if (!storageClient) {
    const keyJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
    if (keyJson) {
      try {
        const credentials = JSON.parse(keyJson)
        storageClient = new Storage({ credentials, projectId: PROJECT_ID })
        return storageClient
      } catch (e) {
        console.error("Failed to parse credentials:", e.message)
      }
    }

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const privateKey = process.env.GOOGLE_PRIVATE_KEY
    if (email && privateKey) {
      const credentials = {
        client_email: email,
        private_key: privateKey.replace(/\\n/g, "\n"),
      }
      storageClient = new Storage({ credentials, projectId: PROJECT_ID })
      return storageClient
    }

    storageClient = new Storage({ projectId: PROJECT_ID })
  }
  return storageClient
}

// GET /api/ko/projects/[id]/files - List files in G Folder for a project
export async function GET(request, { params }) {
  try {
    const { id: projectId } = await params

    if (!projectId) {
      return NextResponse.json({ error: "Project ID required" }, { status: 400 })
    }

    const storage = getStorageClient()
    const bucket = storage.bucket(BUCKET_NAME)
    const prefix = `projects/${projectId}/files/`

    const [gcsFiles] = await bucket.getFiles({ prefix })

    const files = await Promise.all(
      gcsFiles
        .filter((f) => f.name !== prefix) // Filter out the folder itself
        .map(async (file) => {
          const [metadata] = await file.getMetadata()
          const name = file.name.replace(prefix, "")

          return {
            id: Buffer.from(file.name).toString("base64"),
            name,
            path: file.name,
            size: parseInt(metadata.size) || 0,
            type: metadata.contentType || "application/octet-stream",
            uploadedAt: metadata.timeCreated || metadata.updated,
            uploadedBy: metadata.metadata?.uploadedBy || "Unknown",
            url: `https://storage.googleapis.com/${BUCKET_NAME}/${file.name}`,
          }
        })
    )

    // Sort by upload date, newest first
    files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))

    return NextResponse.json({ files, projectId, count: files.length })
  } catch (error) {
    console.error("Error listing project files:", error)
    return NextResponse.json(
      { error: "Failed to list files", details: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/ko/projects/[id]/files - Delete a file
export async function DELETE(request, { params }) {
  try {
    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("fileId")

    if (!projectId || !fileId) {
      return NextResponse.json(
        { error: "Project ID and File ID required" },
        { status: 400 }
      )
    }

    const filePath = Buffer.from(fileId, "base64").toString("utf-8")
    const storage = getStorageClient()
    const bucket = storage.bucket(BUCKET_NAME)

    // Verify the file is in the correct project folder
    if (!filePath.startsWith(`projects/${projectId}/files/`)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 403 })
    }

    await bucket.file(filePath).delete()

    return NextResponse.json({ success: true, deleted: filePath })
  } catch (error) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      { error: "Failed to delete file", details: error.message },
      { status: 500 }
    )
  }
}
