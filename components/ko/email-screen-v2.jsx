"use client"

import { useState, useEffect, useRef } from "react"
import {
  Mail, Send, RefreshCw, Search, Loader2, Check, X,
  AlertCircle, Clock, CheckCircle2, XCircle, Edit3,
  MessageSquare, Sparkles, ChevronDown, Filter, Inbox,
  FileText, ArrowRight
} from "lucide-react"
import { ResizablePanel } from "./resizable-panel"
import { cn } from "@/lib/utils"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://136.111.252.120"

// Tabs for the email list
const EMAIL_TABS = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "drafts", label: "AI Drafts", icon: Sparkles },
  { id: "sent", label: "Sent", icon: Send },
]

// Priority colors
const priorityColors = {
  HIGH: "bg-red-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500",
}

// Status colors for drafts
const draftStatusColors = {
  pending: "bg-yellow-500",
  pending_audit: "bg-blue-500",
  auto_approved: "bg-green-500",
  approved: "bg-green-600",
  edited: "bg-purple-500",
  rejected: "bg-red-500",
  sent: "bg-gray-500",
}

const draftStatusLabels = {
  pending: "Pending Review",
  pending_audit: "Auditing",
  auto_approved: "Auto-Approved",
  approved: "Approved",
  edited: "Edited",
  rejected: "Rejected",
  sent: "Sent",
}

function formatDate(dateString) {
  if (!dateString) return ""
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return "Yesterday"
  if (days < 7) return date.toLocaleDateString("en-US", { weekday: "short" })
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function truncate(str, len) {
  if (!str) return ""
  return str.length > len ? str.substring(0, len) + "..." : str
}

// Email list item
function EmailListItem({ email, isSelected, onClick, isDraft = false }) {
  const priority = email.priority || "MEDIUM"
  const status = email.status || email.draft_status || "pending"

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border hover:bg-secondary/50 transition-colors",
        isSelected && "bg-secondary"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Priority indicator */}
        <div className={cn("w-2 h-2 rounded-full mt-2 flex-shrink-0", priorityColors[priority])} />

        <div className="flex-1 min-w-0">
          {/* From / Subject line */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="font-medium text-foreground truncate">
              {email.from_name || email.from_address || "Unknown"}
            </span>
            <span className="text-xs text-foreground-tertiary flex-shrink-0">
              {formatDate(email.received_at || email.created_at)}
            </span>
          </div>

          {/* Subject */}
          <div className="text-sm text-foreground truncate mb-1">
            {email.subject || email.original_subject || "(No Subject)"}
          </div>

          {/* Snippet / Category */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-foreground-tertiary truncate flex-1">
              {truncate(email.body_snippet || email.draft_body, 60)}
            </span>

            {isDraft && (
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full text-white flex-shrink-0",
                draftStatusColors[status]
              )}>
                {draftStatusLabels[status] || status}
              </span>
            )}

            {!isDraft && email.category && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground-secondary flex-shrink-0">
                {email.category}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// Email viewer component
function EmailViewer({ email, isDraft = false }) {
  if (!email) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground-tertiary">
        <div className="text-center">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Select an email to view</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {/* Email header */}
      <div className="mb-4 pb-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground mb-2">
          {email.subject || email.original_subject || "(No Subject)"}
        </h2>
        <div className="flex items-center gap-4 text-sm text-foreground-secondary">
          <span>From: {email.from_name || email.from_address}</span>
          <span>{formatDate(email.received_at || email.created_at)}</span>
        </div>
        {email.priority && (
          <div className="mt-2 flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", priorityColors[email.priority])} />
            <span className="text-xs text-foreground-tertiary">{email.priority} Priority</span>
            {email.category && (
              <>
                <span className="text-foreground-tertiary">|</span>
                <span className="text-xs text-foreground-tertiary">{email.category}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Email body */}
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <pre className="whitespace-pre-wrap font-sans text-foreground text-sm leading-relaxed">
          {email.body_full || email.original_body || email.body_snippet || "No content"}
        </pre>
      </div>

      {/* Draft section */}
      {isDraft && email.draft_body && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-foreground">AI Generated Draft</span>
            {email.audit_score && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {Math.round(email.audit_score * 100)}% confidence
              </span>
            )}
          </div>
          <div className="bg-secondary/30 rounded-lg p-4">
            <p className="text-sm font-medium text-foreground mb-2">
              Re: {email.draft_subject || email.original_subject}
            </p>
            <pre className="whitespace-pre-wrap font-sans text-foreground text-sm leading-relaxed">
              {email.draft_body}
            </pre>
          </div>
          {email.reasoning && (
            <p className="mt-2 text-xs text-foreground-tertiary italic">
              {email.reasoning}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// Draft action panel
function DraftActions({ draft, onAction, loading }) {
  if (!draft) return null

  const canApprove = ["pending", "auto_approved", "edited"].includes(draft.status)
  const canEdit = ["pending", "auto_approved"].includes(draft.status)
  const canReject = ["pending", "auto_approved", "edited"].includes(draft.status)
  const canSend = ["approved", "edited"].includes(draft.status)

  return (
    <div className="p-4 border-t border-border bg-secondary/20">
      <div className="flex items-center gap-2 flex-wrap">
        {canApprove && (
          <button
            onClick={() => onAction("approve")}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Approve
          </button>
        )}

        {canEdit && (
          <button
            onClick={() => onAction("edit")}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Edit3 className="w-4 h-4" />
            Edit
          </button>
        )}

        {canReject && (
          <button
            onClick={() => onAction("reject")}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
        )}

        {canSend && (
          <button
            onClick={() => onAction("send")}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        )}

        {loading && <Loader2 className="w-4 h-4 animate-spin text-foreground-tertiary" />}
      </div>

      {draft.audit_issues && (
        <div className="mt-3 text-xs text-foreground-tertiary">
          <span className="font-medium">Audit notes: </span>
          {typeof draft.audit_issues === "string"
            ? JSON.parse(draft.audit_issues).join(", ")
            : draft.audit_issues?.join?.(", ") || "None"}
        </div>
      )}
    </div>
  )
}

// Agent chat for drafts
function DraftAgentChat({ draft, onDraftUpdated }) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!message.trim() || loading) return

    const userMessage = message.trim()
    setMessage("")
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setLoading(true)

    try {
      // For now, just acknowledge the message
      // TODO: Connect to actual agent chat endpoint
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "I understand you want to modify the draft. This chat feature is coming soon - for now, use the Edit button above to make changes directly."
        }])
        setLoading(false)
      }, 500)
    } catch (error) {
      console.error("Chat error:", error)
      setLoading(false)
    }
  }

  if (!draft) {
    return (
      <div className="flex-1 flex items-center justify-center text-foreground-tertiary p-4">
        <div className="text-center">
          <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Select a draft to chat about</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-foreground-tertiary text-sm py-4">
            <p>Chat with the AI to refine this draft</p>
            <p className="text-xs mt-1">Try: "Make it more formal" or "Add pricing details"</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm",
              msg.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "bg-secondary text-foreground"
            )}
          >
            {msg.content}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-foreground-tertiary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat input */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask to modify the draft..."
            className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground placeholder-foreground-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <button
            onClick={handleSend}
            disabled={!message.trim() || loading}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Email Screen V2
export function EmailScreenV2() {
  const [activeTab, setActiveTab] = useState("drafts")
  const [emails, setEmails] = useState([])
  const [drafts, setDrafts] = useState([])
  const [selectedEmail, setSelectedEmail] = useState(null)
  const [selectedDraft, setSelectedDraft] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [userFilter, setUserFilter] = useState("")
  const [error, setError] = useState(null)

  // Fetch pending drafts
  const fetchDrafts = async () => {
    setLoading(true)
    try {
      const url = new URL(`${BACKEND_URL}/api/email/delivery/drafts`)
      if (userFilter) url.searchParams.set("user_email", userFilter)

      const res = await fetch(url.toString())
      const data = await res.json()
      setDrafts(data.drafts || [])
    } catch (err) {
      console.error("Error fetching drafts:", err)
      setError("Failed to load drafts")
    } finally {
      setLoading(false)
    }
  }

  // Fetch scanned emails (inbox)
  const fetchEmails = async () => {
    setLoading(true)
    try {
      const url = new URL(`${BACKEND_URL}/api/email/scan/pending`)
      if (userFilter) url.searchParams.set("user_email", userFilter)

      const res = await fetch(url.toString())
      const data = await res.json()
      setEmails(data.emails || [])
    } catch (err) {
      console.error("Error fetching emails:", err)
      setError("Failed to load emails")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === "drafts") {
      fetchDrafts()
    } else if (activeTab === "inbox") {
      fetchEmails()
    }
  }, [activeTab, userFilter])

  // Handle draft actions
  const handleDraftAction = async (action) => {
    if (!selectedDraft) return

    setActionLoading(true)
    try {
      const res = await fetch(
        `${BACKEND_URL}/api/email/delivery/drafts/${selectedDraft.draft_id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [`${action}d_by`]: "user" }),
        }
      )

      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        // Refresh drafts
        fetchDrafts()
        setSelectedDraft(null)
      }
    } catch (err) {
      console.error(`Error ${action}ing draft:`, err)
      setError(`Failed to ${action} draft`)
    } finally {
      setActionLoading(false)
    }
  }

  // Trigger scan
  const triggerScan = async () => {
    setLoading(true)
    try {
      await fetch(`${BACKEND_URL}/api/email/scan/all`, { method: "POST" })
      // After triggering, refresh the list
      setTimeout(() => {
        fetchEmails()
      }, 2000)
    } catch (err) {
      console.error("Error triggering scan:", err)
    }
  }

  // Filter items by search
  const filteredItems = (activeTab === "drafts" ? drafts : emails).filter(item => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      item.subject?.toLowerCase().includes(q) ||
      item.original_subject?.toLowerCase().includes(q) ||
      item.from_name?.toLowerCase().includes(q) ||
      item.from_address?.toLowerCase().includes(q)
    )
  })

  // Selected item based on tab
  const selectedItem = activeTab === "drafts" ? selectedDraft : selectedEmail

  // Right panel content
  const rightPanelContent = (
    <div className="h-full flex flex-col">
      {/* Email viewer (top) */}
      <div className="flex-1 overflow-hidden border-b border-border">
        <EmailViewer
          email={selectedItem}
          isDraft={activeTab === "drafts"}
        />
      </div>

      {/* Draft actions or Agent chat (bottom) */}
      {activeTab === "drafts" && selectedDraft && (
        <>
          <DraftActions
            draft={selectedDraft}
            onAction={handleDraftAction}
            loading={actionLoading}
          />
          <div className="h-64 border-t border-border">
            <DraftAgentChat draft={selectedDraft} />
          </div>
        </>
      )}
    </div>
  )

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <ResizablePanel
        panel={rightPanelContent}
        panelTitle={activeTab === "drafts" ? "Draft Preview" : "Email Preview"}
        defaultPanelWidth={500}
        minPanelWidth={400}
        maxPanelWidth={700}
        defaultOpen={true}
        className="flex-1"
      >
        {/* Left panel - Email list */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Assistant
              </h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={activeTab === "drafts" ? fetchDrafts : fetchEmails}
                  disabled={loading}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={cn("w-4 h-4 text-foreground-secondary", loading && "animate-spin")} />
                </button>
                {activeTab === "inbox" && (
                  <button
                    onClick={triggerScan}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    Scan New
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-tertiary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search emails..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary text-foreground placeholder-foreground-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-1 -mb-px">
              {EMAIL_TABS.map(tab => {
                const Icon = tab.icon
                const count = tab.id === "drafts" ? drafts.length : tab.id === "inbox" ? emails.length : 0
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id)
                      setSelectedEmail(null)
                      setSelectedDraft(null)
                    }}
                    className={cn(
                      "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                      activeTab === tab.id
                        ? "border-primary text-foreground"
                        : "border-transparent text-foreground-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mx-4 mt-3 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
              <button onClick={() => setError(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Email list */}
          <div className="flex-1 overflow-y-auto">
            {loading && filteredItems.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-foreground-tertiary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-foreground-tertiary">
                <FileText className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">
                  {activeTab === "drafts"
                    ? "No pending drafts"
                    : "No emails to process"}
                </p>
                {activeTab === "inbox" && (
                  <button
                    onClick={triggerScan}
                    className="mt-3 text-primary text-sm hover:underline"
                  >
                    Scan for new emails
                  </button>
                )}
              </div>
            ) : (
              filteredItems.map(item => (
                <EmailListItem
                  key={item.draft_id || item.scan_id || item.message_id}
                  email={item}
                  isSelected={
                    activeTab === "drafts"
                      ? selectedDraft?.draft_id === item.draft_id
                      : selectedEmail?.scan_id === item.scan_id
                  }
                  onClick={() => {
                    if (activeTab === "drafts") {
                      setSelectedDraft(item)
                    } else {
                      setSelectedEmail(item)
                    }
                  }}
                  isDraft={activeTab === "drafts"}
                />
              ))
            )}
          </div>

          {/* Stats footer */}
          <div className="px-4 py-2 border-t border-border text-xs text-foreground-tertiary flex-shrink-0">
            {activeTab === "drafts" ? (
              <span>{drafts.length} draft{drafts.length !== 1 ? "s" : ""} pending review</span>
            ) : (
              <span>{emails.length} email{emails.length !== 1 ? "s" : ""} awaiting response</span>
            )}
          </div>
        </div>
      </ResizablePanel>
    </div>
  )
}
