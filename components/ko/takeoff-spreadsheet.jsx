"use client"

import { useState, useEffect, useRef } from "react"
import {
  X,
  Loader2,
  FileSpreadsheet,
  Upload,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Check,
  Plus
} from "lucide-react"

/**
 * TakeoffSpreadsheet - Embeds a Google Sheet for takeoff data entry
 *
 * Uses the Google Sheet template from the Truth Source spreadsheet.
 * Each project gets its own tab that can be edited directly in the browser.
 */
export function TakeoffSpreadsheet({
  projectId,
  projectName,
  onClose,
  onSave
}) {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)
  const [sheetInfo, setSheetInfo] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const fileInputRef = useRef(null)

  // Load or create takeoff sheet on mount
  useEffect(() => {
    loadOrCreateSheet()
  }, [projectId])

  const loadOrCreateSheet = async () => {
    setLoading(true)
    setError(null)

    try {
      // First try to get existing sheet
      const getRes = await fetch(`/api/ko/takeoff/${projectId}?format=sheet`)

      if (getRes.ok) {
        const data = await getRes.json()
        if (data.gid && data.embedUrl) {
          setSheetInfo(data)
          setLoading(false)
          return
        }
      }

      // No existing sheet, create one
      await createSheet()

    } catch (err) {
      console.error('Load sheet error:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  const createSheet = async () => {
    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/ko/takeoff/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          project_name: projectName
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create takeoff sheet')
      }

      const data = await res.json()
      setSheetInfo(data)

    } catch (err) {
      console.error('Create sheet error:', err)
      setError(err.message)
    } finally {
      setCreating(false)
      setLoading(false)
    }
  }

  // Upload Bluebeam CSV and fill sheet
  const handleUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const content = await file.text()

      const res = await fetch(`/api/ko/takeoff/${projectId}/bluebeam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csv_content: content,
          tab_name: sheetInfo?.tabName
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to import Bluebeam data')
      }

      const data = await res.json()

      // Refresh the iframe to show updated data
      if (data.success) {
        setSheetInfo(prev => ({ ...prev, _refresh: Date.now() }))
      }

      setShowUpload(false)

    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const refreshSheet = () => {
    setSheetInfo(prev => ({ ...prev, _refresh: Date.now() }))
  }

  // Loading state
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {creating ? 'Creating takeoff sheet...' : 'Loading takeoff sheet...'}
          </p>
        </div>
      </div>
    )
  }

  // Error state - offer to create sheet
  if (error && !sheetInfo) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Sheet</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={createSheet}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Sheet
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main view with embedded Google Sheet
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 bg-gray-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-lg">{projectName || 'Takeoff Sheet'}</h1>
            <p className="text-xs text-gray-500">Google Sheets - Auto-saves</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
          >
            <Upload className="w-4 h-4" />
            Import Bluebeam
          </button>

          <button
            onClick={refreshSheet}
            className="p-2 hover:bg-gray-200 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {sheetInfo?.editUrl && (
            <a
              href={sheetInfo.editUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Sheets
            </a>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-100 border-b border-red-300 text-red-600 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Embedded Google Sheet */}
      <div className="flex-1 bg-gray-100">
        {sheetInfo?.embedUrl ? (
          <iframe
            key={sheetInfo._refresh || 'initial'}
            src={sheetInfo.embedUrl}
            className="w-full h-full border-0"
            allow="clipboard-read; clipboard-write"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No sheet available</p>
              <button
                onClick={createSheet}
                disabled={creating}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg mx-auto disabled:opacity-50"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create Takeoff Sheet
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="font-semibold text-lg mb-4">Import Bluebeam CSV</h2>

            <p className="text-sm text-gray-500 mb-4">
              Upload a Bluebeam CSV export to automatically fill in the takeoff quantities.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-blue-600" />
              ) : (
                <Upload className="w-8 h-8 mx-auto mb-3 text-gray-400" />
              )}
              <p className="text-sm font-medium">
                {uploading ? 'Processing...' : 'Click to upload CSV'}
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleUpload}
              className="hidden"
            />

            <div className="flex justify-end mt-4 gap-2">
              <button
                onClick={() => setShowUpload(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
