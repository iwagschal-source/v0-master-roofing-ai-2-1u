import { NextResponse } from "next/server"
import { Storage } from "@google-cloud/storage"

const BUCKET_NAME = 'ko-platform-data'
const UPLOADS_PATH = 'chat-uploads'

// Lazy-load storage client to avoid initialization issues
let storageClient = null

function getStorageClient() {
  if (storageClient) return storageClient

  const projectId = 'master-roofing-intelligence'

  // Option 1: Full JSON key
  const keyJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (keyJson) {
    try {
      const credentials = JSON.parse(keyJson)
      storageClient = new Storage({ credentials, projectId })
      return storageClient
    } catch (e) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', e.message)
    }
  }

  // Option 2: Individual components (Vercel)
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (email && privateKey) {
    const credentials = {
      client_email: email,
      private_key: privateKey.replace(/\\n/g, '\n'),
    }
    storageClient = new Storage({ credentials, projectId })
    return storageClient
  }

  // Fallback to ADC
  storageClient = new Storage({ projectId })
  return storageClient
}

/**
 * POST /api/ko/chat/upload
 * Upload files for chat context
 */
export async function POST(request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files')
    const sessionId = formData.get('sessionId') || 'default'

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      )
    }

    const storage = getStorageClient()
    const bucket = storage.bucket(BUCKET_NAME)
    const uploadedFiles = []

    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `${UPLOADS_PATH}/${sessionId}/${fileName}`

      const gcsFile = bucket.file(filePath)

      await gcsFile.save(buffer, {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
          sessionId,
        }
      })

      // Generate signed URL for access
      const [signedUrl] = await gcsFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      })

      // Extract content for text files
      let content = null
      let preview = null
      if (file.type.startsWith('text/') ||
          file.name.endsWith('.csv') ||
          file.name.endsWith('.json') ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.txt')) {
        content = buffer.toString('utf-8')
        preview = content.substring(0, 1000) + (content.length > 1000 ? '...' : '')
      }

      uploadedFiles.push({
        id: fileName,
        name: file.name,
        type: file.type,
        size: buffer.length,
        path: `gs://${BUCKET_NAME}/${filePath}`,
        url: signedUrl,
        content,
        preview,
      })
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    })
  } catch (error) {
    console.error("Error uploading files:", error)
    return NextResponse.json(
      { error: "Failed to upload files", details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ko/chat/upload
 * Get a signed URL for a file
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const path = searchParams.get('path')

    if (!path) {
      return NextResponse.json(
        { error: "Path is required" },
        { status: 400 }
      )
    }

    const storage = getStorageClient()

    // Handle gs:// URLs
    let bucketName = BUCKET_NAME
    let filePath = path

    if (path.startsWith('gs://')) {
      const match = path.match(/gs:\/\/([^/]+)\/(.+)/)
      if (match) {
        bucketName = match[1]
        filePath = match[2]
      }
    }

    const bucket = storage.bucket(bucketName)
    const file = bucket.file(filePath)

    const [exists] = await file.exists()
    if (!exists) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      )
    }

    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    })

    const [metadata] = await file.getMetadata()

    return NextResponse.json({
      success: true,
      url: signedUrl,
      name: metadata.metadata?.originalName || filePath.split('/').pop(),
      type: metadata.contentType,
      size: metadata.size,
    })
  } catch (error) {
    console.error("Error getting file:", error)
    return NextResponse.json(
      { error: "Failed to get file", details: error.message },
      { status: 500 }
    )
  }
}
