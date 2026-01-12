"use client"

import { useState } from "react"
import { ArrowLeft, Calendar, DollarSign, Building2, ExternalLink, Link as LinkIcon, Plus, Loader2 } from "lucide-react"
import { EmbeddedSheet } from "./embedded-sheet"
import { ActionButtons } from "./action-buttons"
import { GCIntelligence } from "./gc-intelligence"

const statusColors = {
  estimating: "bg-yellow-500",
  proposal_sent: "bg-blue-500",
  won: "bg-green-500",
  lost: "bg-red-500",
  pending: "bg-gray-500",
}

const statusLabels = {
  estimating: "Estimating",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
  pending: "Pending",
}

function formatCurrency(amount) {
  if (!amount) return "$0"
  return `$${amount.toLocaleString()}`
}

function formatDate(dateString) {
  if (!dateString) return "No due date"
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

const SHEET_TABS = [
  { id: "overview", label: "Overview" },
  { id: "estimate", label: "ESTIMATE" },
  { id: "descriptions", label: "Descriptions" },
  { id: "proposal", label: "Proposal" },
  { id: "files", label: "Files" },
]

export function ProjectDetailScreen({ project, onBack, onPreviewProposal, onProjectUpdate }) {
  const [activeTab, setActiveTab] = useState("estimate")
  const [sheetId, setSheetId] = useState(project?.sheet_id || null)
  const [sheetUrl, setSheetUrl] = useState(project?.sheet_url || null)
  const [isCreatingSheet, setIsCreatingSheet] = useState(false)
  const [sheetError, setSheetError] = useState(null)

  const status = project?.status || "pending"

  // Create a new sheet from template
  const handleCreateSheet = async () => {
    setIsCreatingSheet(true)
    setSheetError(null)

    try {
      const response = await fetch(`/api/ko/projects/${project.id}/create-sheet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name || project.address,
          gcName: project.gc_name,
          address: project.address,
          amount: project.amount,
          dueDate: project.due_date,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create sheet")
      }

      setSheetId(result.sheetId)
      setSheetUrl(result.sheetUrl)

      // Notify parent component of the update
      if (onProjectUpdate) {
        onProjectUpdate({
          ...project,
          sheet_id: result.sheetId,
          sheet_url: result.sheetUrl,
        })
      }

      if (result.mock) {
        setSheetError("Note: Using mock sheet (Google Sheets not configured)")
      }
    } catch (error) {
      console.error("Error creating sheet:", error)
      setSheetError(error.message)
    } finally {
      setIsCreatingSheet(false)
    }
  }

  // Connect an existing sheet by ID
  const handleConnectExisting = () => {
    const id = prompt("Enter Google Sheet ID:")
    if (id) {
      setSheetId(id)
      setSheetUrl(`https://docs.google.com/spreadsheets/d/${id}/edit`)
      if (onProjectUpdate) {
        onProjectUpdate({
          ...project,
          sheet_id: id,
          sheet_url: `https://docs.google.com/spreadsheets/d/${id}/edit`,
        })
      }
    }
  }

  const handlePreviewProposal = (projectId) => {
    if (onPreviewProposal) {
      onPreviewProposal(project)
    }
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <p className="text-foreground-secondary">No project selected</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-secondary transition-colors text-foreground-secondary hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-foreground">{project.name || project.address}</h1>
            <p className="text-foreground-secondary">{project.gc_name || "No GC assigned"}</p>
          </div>
        </div>

        {/* Project Stats Bar */}
        <div className="flex flex-wrap items-center gap-6 text-sm">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
            <span className="text-foreground">{statusLabels[status]}</span>
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-2 text-foreground-secondary">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(project.due_date)}</span>
          </div>

          {/* Amount */}
          <div className="flex items-center gap-2 text-foreground-secondary">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium text-foreground">{formatCurrency(project.amount)}</span>
          </div>

          {/* GC */}
          <div className="flex items-center gap-2 text-foreground-secondary">
            <Building2 className="w-4 h-4" />
            <span>{project.gc_name}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-border">
        <div className="flex items-center gap-1 -mb-px overflow-x-auto">
          {SHEET_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-foreground-secondary hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Project Summary */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-semibold text-foreground mb-4">Project Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-xs text-foreground-tertiary uppercase tracking-wider">Address</span>
                  <p className="text-foreground mt-1">{project.address || project.name}</p>
                </div>
                <div>
                  <span className="text-xs text-foreground-tertiary uppercase tracking-wider">Total Value</span>
                  <p className="text-foreground mt-1 font-medium">{formatCurrency(project.amount)}</p>
                </div>
                <div>
                  <span className="text-xs text-foreground-tertiary uppercase tracking-wider">Due Date</span>
                  <p className="text-foreground mt-1">{formatDate(project.due_date)}</p>
                </div>
                <div>
                  <span className="text-xs text-foreground-tertiary uppercase tracking-wider">Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
                    <span className="text-foreground">{statusLabels[status]}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* GC Intelligence */}
            <GCIntelligence gcId={project.gc_id} gcName={project.gc_name} />
          </div>
        )}

        {activeTab === "estimate" && (
          <div className="space-y-4">
            {/* Sheet Connection */}
            {!sheetId ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                  <LinkIcon className="w-8 h-8 text-foreground-tertiary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Project Estimate Sheet</h3>
                <p className="text-foreground-secondary text-sm mb-6">
                  Create a new estimate sheet from the KO template or connect an existing one
                </p>

                {sheetError && (
                  <div className="mb-4 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-600 dark:text-yellow-400 text-sm">
                    {sheetError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleCreateSheet}
                    disabled={isCreatingSheet}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {isCreatingSheet ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating Sheet...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create New Sheet
                      </>
                    )}
                  </button>

                  <span className="text-foreground-tertiary text-sm">or</span>

                  <button
                    onClick={handleConnectExisting}
                    disabled={isCreatingSheet}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Connect Existing
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Embedded Sheet */}
                <EmbeddedSheet sheetId={sheetId} tab="Systems" height={500} />

                {/* Action Buttons */}
                <div className="mt-4">
                  <ActionButtons
                    projectId={project.id}
                    sheetId={sheetId}
                    onPreviewProposal={handlePreviewProposal}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "descriptions" && (
          <div className="space-y-4">
            {sheetId ? (
              <EmbeddedSheet sheetId={sheetId} tab="Descriptions" height={600} />
            ) : (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <p className="text-foreground-secondary">Connect a Google Sheet to view descriptions</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "proposal" && (
          <div className="space-y-4">
            {sheetId ? (
              <>
                <EmbeddedSheet sheetId={sheetId} tab="Proposal" height={600} />
                <div className="flex gap-3">
                  <button
                    onClick={() => handlePreviewProposal(project.id)}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    Preview Full Proposal
                  </button>
                </div>
              </>
            ) : (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <p className="text-foreground-secondary">Connect a Google Sheet to view proposal</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "files" && (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-foreground-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14,2 14,8 20,8" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Project Files</h3>
            <p className="text-foreground-secondary text-sm">
              File management coming soon. Connect to Google Drive or upload files directly.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Bar - GC Intelligence (visible when not on overview) */}
      {activeTab !== "overview" && project.gc_id && (
        <div className="border-t border-border p-4 bg-card/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-foreground-tertiary" />
              <div>
                <span className="font-medium text-foreground">{project.gc_name}</span>
                <span className="text-foreground-tertiary text-sm ml-2">67% win rate</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab("overview")}
              className="text-primary text-sm hover:underline"
            >
              View GC Intelligence
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
