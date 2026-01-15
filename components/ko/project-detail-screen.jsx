"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Calendar, DollarSign, Building2, ExternalLink, Link as LinkIcon, Plus, Loader2, Mail, Paperclip, RefreshCw, Reply, Forward, ChevronRight, Upload, FolderOpen, File, FileText, Image, Trash2, Download, Eye, Send, Sparkles, Check } from "lucide-react"
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

  // Draft reply state
  const [draftReply, setDraftReply] = useState("")
  const [draftLoading, setDraftLoading] = useState(false)
  const [editedDraft, setEditedDraft] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  // Files state (G Folder)
  const [projectFiles, setProjectFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const fileInputRef = useState(null)

  // Load project emails and files when project changes
  useEffect(() => {
    if (project) {
      loadProjectEmails(project)
      loadProjectFiles(project)
    }
  }, [project?.id])

  // Load files from G Folder (GCS)
  const loadProjectFiles = async (proj) => {
    setFilesLoading(true)
    try {
      const res = await fetch(`/api/ko/projects/${proj.id}/files`)
      if (res.ok) {
        const data = await res.json()
        setProjectFiles(data.files || [])
      } else {
        // Mock files for development
        setProjectFiles(MOCK_PROJECT_FILES)
      }
    } catch (err) {
      console.error('Failed to load project files:', err)
      setProjectFiles(MOCK_PROJECT_FILES)
    } finally {
      setFilesLoading(false)
    }
  }

  // Upload file to G Folder
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', project.id)
      formData.append('projectName', project.name || project.address)

      const res = await fetch('/api/ko/projects/files/upload', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        // Reload files after upload
        loadProjectFiles(project)
      }
    } catch (err) {
      console.error('Failed to upload file:', err)
    } finally {
      setUploadingFile(false)
    }
  }

  // Get file icon based on type
  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return Image
    if (['pdf'].includes(ext)) return FileText
    return File
  }

  // Mock files for development
  const MOCK_PROJECT_FILES = [
    { id: 'f1', name: 'ITB Package.pdf', size: 2456000, type: 'application/pdf', uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), uploadedBy: 'John Smith' },
    { id: 'f2', name: 'Roof Plans.pdf', size: 8234000, type: 'application/pdf', uploadedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), uploadedBy: 'John Smith' },
    { id: 'f3', name: 'Site Photos.zip', size: 45000000, type: 'application/zip', uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), uploadedBy: 'Steve' },
    { id: 'f4', name: 'Bluebeam Takeoff.csv', size: 125000, type: 'text/csv', uploadedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), uploadedBy: 'Steve' },
  ]

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

  // Generate draft reply using Email Drafter agent
  const generateDraft = async (email, tone = 'professional') => {
    if (!email) return

    setDraftLoading(true)
    setDraftReply("")
    setEditedDraft("")

    try {
      const res = await fetch('/api/ko/email/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: email.id,
          subject: email.subject,
          from: email.from,
          body: email.snippet || email.body,
          projectName: project?.name || project?.address,
          gcName: project?.gc_name,
          tone,
        })
      })

      if (res.ok) {
        const data = await res.json()
        setDraftReply(data.draft || '')
      } else {
        // Mock draft for development
        const mockDraft = `Hi ${email.from?.name || 'there'},

Thank you for your email regarding ${email.subject || 'this project'}.

I've reviewed the information and will follow up with the details you requested. Please let me know if you need anything else in the meantime.

Best regards,
Master Roofing & Siding`
        setDraftReply(mockDraft)
      }
    } catch (err) {
      console.error('Failed to generate draft:', err)
      // Fallback mock
      setDraftReply(`Hi ${email.from?.name || 'there'},

Thank you for reaching out. I'll review this and get back to you shortly.

Best regards,
Master Roofing & Siding`)
    } finally {
      setDraftLoading(false)
    }
  }

  // Auto-generate draft when email is selected
  useEffect(() => {
    if (selectedEmail) {
      generateDraft(selectedEmail)
    }
  }, [selectedEmail?.id])

  // Send reply
  const handleSendReply = async () => {
    if (!selectedEmail || (!draftReply && !editedDraft)) return

    setSendingReply(true)
    try {
      const body = editedDraft || draftReply
      const to = selectedEmail.from?.email
      const subject = selectedEmail.subject?.startsWith('Re:')
        ? selectedEmail.subject
        : `Re: ${selectedEmail.subject}`

      const res = await fetch('/api/google/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [to],
          subject,
          message: body,
          threadId: selectedEmail.threadId,
          inReplyTo: selectedEmail.id
        })
      })

      if (res.ok) {
        setSendSuccess(true)
        setTimeout(() => {
          setSendSuccess(false)
          setDraftReply("")
          setEditedDraft("")
          loadProjectEmails(project)
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setSendingReply(false)
    }
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

  const handlePreviewProposal = (projectId, takeoffItems = null) => {
    if (onPreviewProposal) {
      onPreviewProposal(project, takeoffItems)
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
                    projectName={project.name || project.address}
                    onPreviewProposal={handlePreviewProposal}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "emails" && (
          <div className="h-full flex flex-col -m-6">
            {/* Email Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border">
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

            {/* Split Email View */}
            <div className="flex-1 flex min-h-0">
              {/* Left: Email List */}
              <div className="w-1/2 border-r border-border overflow-y-auto">
                {emailsLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-foreground-tertiary" />
                  </div>
                ) : projectEmails.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-foreground-tertiary">
                    <Mail className="w-10 h-10 mb-3 opacity-50" />
                    <p className="text-sm font-medium">No emails found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {projectEmails.map((email) => (
                      <button
                        key={email.id}
                        onClick={() => setSelectedEmail(email)}
                        className={cn(
                          "w-full p-4 text-left hover:bg-secondary/50 transition-colors",
                          email.isUnread && "bg-primary/5",
                          selectedEmail?.id === email.id && "bg-secondary"
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

              {/* Right: Email Preview / Attachments */}
              <div className="w-1/2 overflow-y-auto bg-card/50">
                {selectedEmail ? (
                  <div className="p-6">
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

                      {/* Attachments Section */}
                      {selectedEmail.hasAttachments && (
                        <div className="border-t border-border pt-4">
                          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                            <Paperclip className="w-4 h-4" />
                            Attachments
                          </h4>
                          <div className="space-y-2">
                            {/* Mock attachments - would be real from API */}
                            <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
                              <FileText className="w-8 h-8 text-red-500" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">Attachment.pdf</p>
                                <p className="text-xs text-foreground-tertiary">245 KB</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Suggested Draft Section */}
                      <div className="border-t border-border pt-4 mt-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <h4 className="text-sm font-medium">Suggested Draft</h4>
                          <span className="text-xs text-foreground-tertiary">by Email Drafter</span>
                        </div>

                        {draftLoading ? (
                          <div className="flex items-center gap-2 py-6 justify-center bg-secondary/30 rounded-lg">
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                            <span className="text-sm text-foreground-secondary">Generating draft...</span>
                          </div>
                        ) : draftReply ? (
                          <div className="space-y-3">
                            <textarea
                              value={editedDraft || draftReply}
                              onChange={(e) => setEditedDraft(e.target.value)}
                              className="w-full min-h-[120px] px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                              placeholder="Edit your reply..."
                            />
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => generateDraft(selectedEmail, 'brief')}
                                  disabled={draftLoading}
                                  className="px-2.5 py-1 text-xs bg-muted text-foreground rounded hover:bg-muted/80 transition-colors disabled:opacity-50"
                                >
                                  Shorter
                                </button>
                                <button
                                  onClick={() => generateDraft(selectedEmail, 'professional')}
                                  disabled={draftLoading}
                                  className="px-2.5 py-1 text-xs bg-muted text-foreground rounded hover:bg-muted/80 transition-colors disabled:opacity-50"
                                >
                                  More Formal
                                </button>
                                <button
                                  onClick={() => generateDraft(selectedEmail, 'friendly')}
                                  disabled={draftLoading}
                                  className="px-2.5 py-1 text-xs bg-muted text-foreground rounded hover:bg-muted/80 transition-colors disabled:opacity-50"
                                >
                                  Friendly
                                </button>
                              </div>
                              <button
                                onClick={handleSendReply}
                                disabled={!draftReply || sendingReply || sendSuccess}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                                  sendSuccess
                                    ? 'bg-green-600 text-white'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                }`}
                              >
                                {sendingReply ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending...
                                  </>
                                ) : sendSuccess ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Sent!
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4" />
                                    Send Reply
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="py-4 text-center text-sm text-foreground-tertiary bg-secondary/30 rounded-lg">
                            Draft will appear here
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-foreground-tertiary">
                    <Mail className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">Select an email to preview</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {activeTab === "files" && (
          <div className="h-full flex flex-col -m-6">
            {/* Files Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-yellow-500" />
                <span className="font-medium">G Folder</span>
                <span className="text-sm text-foreground-tertiary">
                  {filesLoading ? 'Loading...' : `${projectFiles.length} files`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => project && loadProjectFiles(project)}
                  disabled={filesLoading}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${filesLoading ? 'animate-spin' : ''}`} />
                </button>
                <label className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors cursor-pointer">
                  {uploadingFile ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploadingFile ? 'Uploading...' : 'Upload'}
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Split Files View */}
            <div className="flex-1 flex min-h-0">
              {/* Left: File List */}
              <div className="w-1/2 border-r border-border overflow-y-auto">
                {filesLoading ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 className="w-6 h-6 animate-spin text-foreground-tertiary" />
                  </div>
                ) : projectFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-foreground-tertiary">
                    <FolderOpen className="w-10 h-10 mb-3 opacity-50" />
                    <p className="text-sm font-medium">No files yet</p>
                    <p className="text-xs mt-1">Upload files to the G Folder</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {projectFiles.map((file) => {
                      const FileIcon = getFileIcon(file.name)
                      return (
                        <button
                          key={file.id}
                          onClick={() => setSelectedFile(file)}
                          className={cn(
                            "w-full p-4 text-left hover:bg-secondary/50 transition-colors",
                            selectedFile?.id === file.id && "bg-secondary"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <FileIcon className={cn(
                              "w-8 h-8",
                              file.name.endsWith('.pdf') ? "text-red-500" :
                              file.name.endsWith('.csv') ? "text-green-500" :
                              file.name.match(/\.(jpg|jpeg|png|gif)$/i) ? "text-blue-500" :
                              "text-foreground-tertiary"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{file.name}</p>
                              <p className="text-xs text-foreground-tertiary">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right: File Preview */}
              <div className="w-1/2 overflow-y-auto bg-card/50">
                {selectedFile ? (
                  <div className="p-6">
                    <div className="space-y-4">
                      {/* File Info */}
                      <div className="flex items-start gap-4">
                        {(() => {
                          const FileIcon = getFileIcon(selectedFile.name)
                          return <FileIcon className="w-12 h-12 text-foreground-tertiary" />
                        })()}
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-foreground">{selectedFile.name}</h3>
                          <p className="text-sm text-foreground-secondary mt-1">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      {/* File Details */}
                      <div className="border-t border-border pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground-tertiary">Uploaded by</span>
                          <span className="text-foreground">{selectedFile.uploadedBy}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground-tertiary">Date</span>
                          <span className="text-foreground">{new Date(selectedFile.uploadedAt).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground-tertiary">Type</span>
                          <span className="text-foreground">{selectedFile.type || 'Unknown'}</span>
                        </div>
                      </div>

                      {/* Preview Area */}
                      {selectedFile.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                        <div className="border-t border-border pt-4">
                          <div className="bg-secondary/50 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                            <p className="text-sm text-foreground-tertiary">Image preview</p>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-4 border-t border-border">
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors">
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg text-sm hover:bg-secondary/80 transition-colors">
                          <Eye className="w-4 h-4" />
                          Open
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg text-sm transition-colors ml-auto">
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-foreground-tertiary">
                    <File className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">Select a file to preview</p>
                  </div>
                )}
              </div>
            </div>
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
