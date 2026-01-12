"use client"

import { useState } from "react"
import { ArrowLeft, Calendar, DollarSign, Building2, ExternalLink, Link as LinkIcon } from "lucide-react"
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

export function ProjectDetailScreen({ project, onBack, onPreviewProposal }) {
  const [activeTab, setActiveTab] = useState("estimate")
  const [sheetId, setSheetId] = useState(project?.sheet_id || null)
  const [isConnectingSheet, setIsConnectingSheet] = useState(false)

  const status = project?.status || "pending"

  const handleConnectSheet = () => {
    // For MVP, prompt for sheet ID
    const id = prompt("Enter Google Sheet ID:")
    if (id) {
      setSheetId(id)
      // In production, would save to backend
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
                <h3 className="font-semibold text-foreground mb-2">Connect Google Sheet</h3>
                <p className="text-foreground-secondary text-sm mb-4">
                  Connect a Google Sheet to view and edit estimate data
                </p>
                <button
                  onClick={handleConnectSheet}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  Connect Sheet
                </button>
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
