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

// POST /api/ko/projects/files/upload - Upload a file to project's G Folder
export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file")
    const projectId = formData.get("projectId")
    const projectName = formData.get("projectName")
    const uploadedBy = formData.get("uploadedBy") || "KO User"

    if (!file || !projectId) {
      return NextResponse.json(
        { error: "File and projectId are required" },
        { status: 400 }
      )
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Max size is 100MB" },
        { status: 400 }
      )
    }

    // Get file contents as buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Sanitize filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")

    const storage = getStorageClient()
    const bucket = storage.bucket(BUCKET_NAME)
    const destPath = `projects/${projectId}/files/${sanitizedName}`

    const gcsFile = bucket.file(destPath)

    await gcsFile.save(buffer, {
      contentType: file.type || "application/octet-stream",
      metadata: {
        uploadedBy,
        projectId,
        projectName: projectName || "",
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    })

    const [metadata] = await gcsFile.getMetadata()

    return NextResponse.json({
      success: true,
      file: {
        id: Buffer.from(destPath).toString("base64"),
        name: sanitizedName,
        path: destPath,
        size: file.size,
        type: file.type,
        uploadedAt: metadata.timeCreated,
        uploadedBy,
        url: `https://storage.googleapis.com/${BUCKET_NAME}/${destPath}`,
      },
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: "Failed to upload file", details: error.message },
      { status: 500 }
    )
  }
}
