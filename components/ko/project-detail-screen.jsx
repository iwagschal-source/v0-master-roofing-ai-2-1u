"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Calendar, DollarSign, Building2, ExternalLink, Link as LinkIcon, Plus, Loader2, Mail, Paperclip, RefreshCw, Reply, Forward, ChevronRight } from "lucide-react"
import { EmbeddedSheet } from "./embedded-sheet"
import { ActionButtons } from "./action-buttons"
import { GCBriefWithChat } from "./gc-brief-with-chat"
import { ResizablePanel } from "./resizable-panel"
import { cn } from "@/lib/utils"

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
  { id: "estimate", label: "ESTIMATE" },
  { id: "emails", label: "Emails" },
  { id: "proposal", label: "Proposal" },
  { id: "files", label: "Files" },
]

// Mock emails for development
const MOCK_PROJECT_EMAILS = [
  {
    id: 'email-1',
    from: { name: 'John Smith', email: 'john@gccompany.com' },
    subject: 'RE: Takeoff Request',
    snippet: 'Thanks for the quick turnaround on the estimate. Can you include the alternate pricing for the TPO system as well?',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isUnread: true,
    hasAttachments: true
  },
  {
    id: 'email-2',
    from: { name: 'Steve', email: 'steve@masterroofing.com' },
    subject: 'Takeoff Complete',
    snippet: 'Hi John, I have completed the takeoff. Please find the attached spreadsheet with all measurements.',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isUnread: false,
    hasAttachments: true
  },
  {
    id: 'email-3',
    from: { name: 'John Smith', email: 'john@gccompany.com' },
    subject: 'Bid Due Date Extension',
    snippet: 'The owner has granted us an extension. New bid due date is January 25th.',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    isUnread: false,
    hasAttachments: false
  },
  {
    id: 'email-4',
    from: { name: 'John Smith', email: 'john@gccompany.com' },
    subject: 'Original ITB Package',
    snippet: 'Please find attached the invitation to bid package for the roofing replacement...',
    date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    isUnread: false,
    hasAttachments: true
  }
]

export function ProjectDetailScreen({ project, onBack, onPreviewProposal, onProjectUpdate }) {
  const [activeTab, setActiveTab] = useState("estimate")
  const [sheetId, setSheetId] = useState(project?.sheet_id || null)
  const [sheetUrl, setSheetUrl] = useState(project?.sheet_url || null)
  const [isCreatingSheet, setIsCreatingSheet] = useState(false)
  const [sheetError, setSheetError] = useState(null)

  // Email state
  const [projectEmails, setProjectEmails] = useState([])
  const [emailsLoading, setEmailsLoading] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState(null)

  // Load project emails when project changes
  useEffect(() => {
    if (project) {
      loadProjectEmails(project)
    }
  }, [project?.id])

  const loadProjectEmails = async (proj) => {
    setEmailsLoading(true)
    setSelectedEmail(null)
    try {
      const searchQueries = [proj.name, proj.address, proj.gc_name].filter(Boolean)
      const query = searchQueries.join(' OR ')

      const res = await fetch(`/api/google/gmail/search?q=${encodeURIComponent(query)}&maxResults=20`)
      if (res.ok) {
        const data = await res.json()
        setProjectEmails(data.emails || [])
      } else {
        // Use mock data for development
        setProjectEmails(MOCK_PROJECT_EMAILS)
      }
    } catch (err) {
      console.error('Failed to load project emails:', err)
      setProjectEmails(MOCK_PROJECT_EMAILS)
    } finally {
      setEmailsLoading(false)
    }
  }

  const formatEmailDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now - date
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

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

  // Main content (left side)
  const mainContent = (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
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
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
            <span className="text-foreground">{statusLabels[status]}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground-secondary">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(project.due_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground-secondary">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium text-foreground">{formatCurrency(project.amount)}</span>
          </div>
          <div className="flex items-center gap-2 text-foreground-secondary">
            <Building2 className="w-4 h-4" />
            <span>{project.gc_name}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-border flex-shrink-0">
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
        {activeTab === "estimate" && (
          <div className="space-y-4">
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
                <EmbeddedSheet sheetId={sheetId} tab="Systems" height={500} />
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

        {activeTab === "emails" && (
          <div className="space-y-4">
            {/* Email Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                <span className="font-medium">Project Emails</span>
                <span className="text-sm text-foreground-tertiary">
                  {emailsLoading ? 'Loading...' : `${projectEmails.length} messages`}
                </span>
              </div>
              <button
                onClick={() => project && loadProjectEmails(project)}
                disabled={emailsLoading}
                className="p-2 hover:bg-secondary rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${emailsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Email Content */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {emailsLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-6 h-6 animate-spin text-foreground-tertiary" />
                </div>
              ) : selectedEmail ? (
                // Email Detail View
                <div className="p-6">
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="flex items-center gap-1 text-sm text-primary hover:underline mb-4"
                  >
                    <ChevronRight className="w-4 h-4 rotate-180" />
                    Back to list
                  </button>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{selectedEmail.subject}</h3>
                      <div className="flex items-center gap-3 mt-2 text-sm text-foreground-secondary">
                        <span className="font-medium text-foreground">{selectedEmail.from?.name}</span>
                        <span>&lt;{selectedEmail.from?.email}&gt;</span>
                      </div>
                      <div className="text-xs text-foreground-tertiary mt-1">
                        {new Date(selectedEmail.date).toLocaleString()}
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {selectedEmail.snippet || selectedEmail.body || 'No content available'}
                      </p>
                    </div>

                    {selectedEmail.hasAttachments && (
                      <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                        <Paperclip className="w-4 h-4" />
                        <span>Attachments available</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-4 border-t border-border">
                      <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors">
                        <Reply className="w-4 h-4" />
                        Reply
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors">
                        <Forward className="w-4 h-4" />
                        Forward
                      </button>
                    </div>
                  </div>
                </div>
              ) : projectEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-foreground-tertiary">
                  <Mail className="w-10 h-10 mb-3 opacity-50" />
                  <p className="text-sm font-medium">No emails found for this project</p>
                  <p className="text-xs mt-1">
                    Emails mentioning "{project?.name || project?.address}" or "{project?.gc_name}" will appear here
                  </p>
                </div>
              ) : (
                // Email List View
                <div className="divide-y divide-border">
                  {projectEmails.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => setSelectedEmail(email)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-secondary/50 transition-colors",
                        email.isUnread && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={cn(
                              "text-sm truncate",
                              email.isUnread ? "font-semibold text-foreground" : "text-foreground"
                            )}>
                              {email.from?.name || email.from?.email}
                            </span>
                            <span className="text-xs text-foreground-tertiary whitespace-nowrap">
                              {formatEmailDate(email.date)}
                            </span>
                          </div>
                          <p className={cn(
                            "text-sm truncate mb-1",
                            email.isUnread ? "font-medium text-foreground" : "text-foreground"
                          )}>
                            {email.subject}
                          </p>
                          <p className="text-xs text-foreground-tertiary truncate">
                            {email.snippet}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {email.hasAttachments && (
                            <Paperclip className="w-4 h-4 text-foreground-tertiary" />
                          )}
                          {email.isUnread && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
    </div>
  )

  // GC Brief panel with integrated chat (right side)
  const gcBriefPanel = project.gc_name ? (
    <GCBriefWithChat
      gcName={project.gc_name}
      projectName={project.name || project.address}
      className="h-full"
    />
  ) : (
    <div className="p-6 text-center text-foreground-tertiary">
      <Building2 className="w-8 h-8 mx-auto mb-3 opacity-50" />
      <p>No GC assigned to this project</p>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <ResizablePanel
        panel={gcBriefPanel}
        panelTitle="GC Brief"
        defaultPanelWidth={400}
        minPanelWidth={320}
        maxPanelWidth={550}
        defaultOpen={true}
        className="flex-1"
      >
        {mainContent}
      </ResizablePanel>
    </div>
  )
}
