"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Mail, Send, Plus, RefreshCw, Search, Loader2, X,
  AlertCircle, ExternalLink, LogOut, Check, Sparkles,
  MessageSquare, FileText, Paperclip
} from "lucide-react"
import { useGmail } from "@/hooks/useGmail"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"

// Panel width constraints
const LEFT_PANEL_MIN = 200
const LEFT_PANEL_MAX = 400
const LEFT_PANEL_DEFAULT = 320

const RIGHT_PANEL_MIN = 250
const RIGHT_PANEL_MAX = 450
const RIGHT_PANEL_DEFAULT = 320

// Horizontal split constraints
const CENTER_SPLIT_MIN = 100
const CENTER_SPLIT_DEFAULT = 200 // attachment preview height

const RIGHT_SPLIT_MIN = 150
const RIGHT_SPLIT_DEFAULT = 256 // AI chat section height (h-64 = 256px)

// localStorage keys
const STORAGE_LEFT_WIDTH = 'gmail-left-panel-width'
const STORAGE_RIGHT_WIDTH = 'gmail-right-panel-width'
const STORAGE_CENTER_SPLIT_HEIGHT = 'gmail-center-split-height'
const STORAGE_RIGHT_SPLIT_HEIGHT = 'gmail-right-split-height'

// Vertical Resizable Divider
function VerticalDivider({ onDrag, position }) {
  const [isDragging, setIsDragging] = useState(false)
  const dividerRef = useRef(null)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      onDrag(e.clientX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, onDrag])

  return (
    <div
      ref={dividerRef}
      onMouseDown={handleMouseDown}
      className={`w-1 flex-shrink-0 cursor-col-resize transition-colors ${
        isDragging ? 'bg-primary' : 'bg-border hover:bg-primary/50'
      }`}
      style={{ touchAction: 'none' }}
    />
  )
}

// Horizontal Resizable Divider (for attachment preview)
function HorizontalDivider({ onDrag }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e) => {
      onDrag(e.clientY)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'row-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, onDrag])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`h-1 flex-shrink-0 cursor-row-resize transition-colors ${
        isDragging ? 'bg-primary' : 'bg-border hover:bg-primary/50'
      }`}
      style={{ touchAction: 'none' }}
    />
  )
}

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function extractSenderName(from) {
  if (!from) return 'Unknown'
  const match = from.match(/^([^<]+)/)
  return match ? match[1].trim().replace(/"/g, '') : from
}

function extractSenderEmail(from) {
  if (!from) return ''
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}

// Left Panel - Email List
function EmailListPanel({
  messages,
  loading,
  error,
  selectedMessage,
  onSelectMessage,
  searchQuery,
  onSearchChange,
  onRefresh,
  onCompose,
  isConnected,
  authLoading,
  authUrl,
  onDisconnect,
  user,
  width
}) {
  const filteredMessages = messages.filter(email => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      email.subject?.toLowerCase().includes(q) ||
      email.from?.toLowerCase().includes(q) ||
      email.snippet?.toLowerCase().includes(q)
    )
  })

  return (
    <div
      className="flex flex-col bg-card flex-shrink-0"
      style={{ width: `${width}px` }}
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Inbox</h2>
          </div>
          <div className="flex items-center gap-1">
            {isConnected && user && (
              <button
                onClick={onDisconnect}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-destructive"
                title="Disconnect"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onRefresh}
              disabled={loading || !isConnected}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <button
          onClick={onCompose}
          disabled={!isConnected}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
        >
          <Plus className="w-4 h-4" />
          Compose
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emails..."
            className="w-full pl-9 pr-4 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-y-auto">
        {authLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : !isConnected ? (
          <div className="p-6 text-center">
            <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-2">Connect Gmail</h3>
            <p className="text-xs text-muted-foreground mb-4">Connect your Google account to access your inbox</p>
            <a
              href={authUrl}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <img src="/images/google.svg" alt="" className="w-4 h-4" />
              Connect
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <button onClick={onRefresh} className="mt-2 text-sm text-primary hover:underline">Try again</button>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground text-sm">
            {searchQuery ? 'No emails match your search' : 'No emails'}
          </div>
        ) : (
          filteredMessages.map((email) => (
            <button
              key={email.id}
              onClick={() => onSelectMessage(email)}
              className={`w-full text-left p-3 border-b border-border/50 hover:bg-muted/50 transition-colors ${
                selectedMessage?.id === email.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`font-medium truncate mr-2 text-sm ${email.read ? "text-muted-foreground" : "text-foreground"}`}>
                  {extractSenderName(email.from)}
                </span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(email.date)}</span>
              </div>
              <div className={`text-sm mb-1 truncate ${email.read ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                {email.subject || '(No Subject)'}
              </div>
              <div className="text-xs text-muted-foreground line-clamp-1">{email.snippet || ''}</div>
            </button>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
        {filteredMessages.length} email{filteredMessages.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

// Center Panel - Email Content & Reply
function EmailContentPanel({
  selectedMessage,
  isConnected,
  authUrl,
  draftReply,
  draftLoading,
  onSendReply,
  sendingReply,
  sendSuccess,
  replyText,
  onReplyTextChange
}) {
  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
            <Mail className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-3">Connect Your Gmail</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Connect your Google account to access your Gmail inbox and manage your emails.
          </p>
          <a
            href={authUrl}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <img src="/images/google.svg" alt="" className="w-5 h-5" />
            Connect to Google
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    )
  }

  if (!selectedMessage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">
        <div className="text-center">
          <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <h3 className="text-lg font-medium text-foreground mb-2">Select an email</h3>
          <p className="text-sm">Choose an email from the list to view and reply</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Email Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-foreground mb-3">{selectedMessage.subject || '(No Subject)'}</h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{extractSenderName(selectedMessage.from)}</span>
              <span className="text-xs">&lt;{extractSenderEmail(selectedMessage.from)}&gt;</span>
              <span>{formatDate(selectedMessage.date)}</span>
            </div>
          </div>

          {/* Body */}
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed">
            {selectedMessage.body || selectedMessage.snippet || 'No content'}
          </div>
        </div>
      </div>

      {/* Reply Section */}
      <div className="border-t border-border bg-card p-4">
        <div className="max-w-3xl">
          <div className="mb-3">
            <label className="text-sm font-medium text-foreground mb-2 block">Reply</label>
            <textarea
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              className="w-full min-h-[120px] px-4 py-3 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none transition-colors"
              placeholder={draftLoading ? "Generating draft..." : "Write your reply..."}
            />
          </div>
          <div className="flex items-center justify-end">
            <button
              onClick={onSendReply}
              disabled={!replyText.trim() || sendingReply || sendSuccess}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
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
      </div>

      {/* Attachment Preview Placeholder - hidden by default */}
      {/* Will be shown when attachment is clicked in future step */}
    </div>
  )
}

// Right Panel - Draft Options & AI Chat
function DraftPanel({ selectedMessage, draftReply, draftLoading, onSelectDraft, width, aiChatHeight, onAiChatHeightChange }) {
  const panelRef = useRef(null)
  const [drafts, setDrafts] = useState([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [draftsError, setDraftsError] = useState(null)
  const [selectedDraftId, setSelectedDraftId] = useState(null)
  const [regenerating, setRegenerating] = useState(false)

  // Fetch drafts when selected message changes
  useEffect(() => {
    if (!selectedMessage?.id) {
      setDrafts([])
      setSelectedDraftId(null)
      return
    }

    const fetchDrafts = async () => {
      setDraftsLoading(true)
      setDraftsError(null)

      try {
        const res = await fetch(`/api/ko/email-drafts?email_id=${encodeURIComponent(selectedMessage.id)}`)
        const data = await res.json()

        if (data.error) {
          setDraftsError(data.error)
          setDrafts([])
        } else {
          setDrafts(data.drafts || [])
          // Auto-select if there's a previously selected draft
          const selected = (data.drafts || []).find(d => d.status === 'selected')
          if (selected) {
            setSelectedDraftId(selected.id)
          } else {
            setSelectedDraftId(null)
          }
        }
      } catch (err) {
        console.error('Failed to fetch drafts:', err)
        setDraftsError('Failed to load drafts')
        setDrafts([])
      } finally {
        setDraftsLoading(false)
      }
    }

    fetchDrafts()
  }, [selectedMessage?.id])

  // Handle draft selection
  const handleDraftSelect = async (draft) => {
    setSelectedDraftId(draft.id)
    onSelectDraft(draft.draftText)

    // Update draft status in database
    try {
      await fetch('/api/ko/email-drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: draft.id, status: 'selected' }),
      })
    } catch (err) {
      console.error('Failed to update draft status:', err)
    }
  }

  // Handle regenerate drafts request
  const handleRegenerate = async () => {
    if (!selectedMessage) return

    setRegenerating(true)
    console.log('Regenerate drafts requested', {
      emailId: selectedMessage.id,
      threadId: selectedMessage.threadId,
      subject: selectedMessage.subject,
    })

    // Simulate delay for visual feedback (actual regeneration handled by agent)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setRegenerating(false)
  }

  const handleHorizontalDrag = useCallback((clientY) => {
    if (!panelRef.current) return

    const panelRect = panelRef.current.getBoundingClientRect()
    const newHeight = panelRect.bottom - clientY

    // Get total panel height and calculate max (panel height - min for top section - header heights ~88px)
    const maxHeight = panelRect.height - RIGHT_SPLIT_MIN - 88

    // Clamp to min/max
    const clampedHeight = Math.min(maxHeight, Math.max(RIGHT_SPLIT_MIN, newHeight))
    onAiChatHeightChange(clampedHeight)
  }, [onAiChatHeightChange])

  // Determine what to show based on loading states
  const isLoading = draftLoading || draftsLoading
  const hasDrafts = drafts.length > 0

  return (
    <div
      ref={panelRef}
      className="flex flex-col bg-card flex-shrink-0"
      style={{ width: `${width}px` }}
    >
      {/* Draft Options */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Draft Options</h3>
            {hasDrafts && (
              <span className="text-xs text-muted-foreground">({drafts.length})</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {!selectedMessage ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <FileText className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm text-center">Select an email to see draft options</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-primary animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Loading drafts...</p>
            </div>
          ) : draftsError ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <AlertCircle className="w-10 h-10 mb-3 opacity-30 text-destructive" />
              <p className="text-sm text-center text-destructive">{draftsError}</p>
            </div>
          ) : !hasDrafts ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Sparkles className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm text-center">No drafts available</p>
              <p className="text-xs text-center mt-1">Drafts will appear here when generated</p>
            </div>
          ) : (
            <div className="space-y-2">
              {drafts.map((draft, index) => {
                const isSelected = selectedDraftId === draft.id
                const label = `Option ${draft.draftNumber || index + 1}`
                const preview = draft.draftText?.substring(0, 100) + (draft.draftText?.length > 100 ? '...' : '')

                return (
                  <button
                    key={draft.id}
                    onClick={() => handleDraftSelect(draft)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-2 border-primary'
                        : 'bg-secondary/30 hover:bg-secondary/50 border border-border/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {label}
                      </span>
                      {isSelected && (
                        <Check className="w-3 h-3 text-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {preview || 'No preview available'}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Regenerate Drafts Button */}
        <div className="px-3 pb-3 flex-shrink-0">
          <button
            onClick={handleRegenerate}
            disabled={!selectedMessage || regenerating}
            className="w-full px-3 py-2 bg-secondary/50 hover:bg-secondary text-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {regenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Regenerate Drafts
              </>
            )}
          </button>
        </div>
      </div>

      {/* Horizontal Divider between Draft Options and AI Chat */}
      <HorizontalDivider onDrag={handleHorizontalDrag} />

      {/* AI Chat Placeholder */}
      <div
        className="flex flex-col flex-shrink-0"
        style={{ height: `${aiChatHeight}px` }}
      >
        <div className="px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">AI Assistant</h3>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-4 text-muted-foreground min-h-0 overflow-hidden">
          <MessageSquare className="w-8 h-8 mb-3 opacity-30" />
          <p className="text-sm text-center">Chat with AI to refine drafts</p>
          <p className="text-xs text-center mt-1 opacity-70">Coming soon</p>
        </div>

        {/* Chat Input Placeholder */}
        <div className="p-3 border-t border-border flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ask to modify draft..."
              disabled
              className="flex-1 px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 disabled:opacity-50"
            />
            <button
              disabled
              className="px-3 py-2 bg-primary/50 text-primary-foreground rounded-lg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Compose Modal
function ComposeModal({ isOpen, onClose, onSend, sending, error }) {
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [showCcBcc, setShowCcBcc] = useState(false)

  const handleSend = () => {
    onSend({ to, cc, bcc, subject, body })
  }

  const handleClose = () => {
    setTo("")
    setCc("")
    setBcc("")
    setSubject("")
    setBody("")
    setShowCcBcc(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">New Message</h2>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">To *</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowCcBcc(!showCcBcc)}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {showCcBcc ? 'Hide' : 'Show'} Cc/Bcc
          </button>

          {showCcBcc && (
            <>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Cc</label>
                <input
                  type="email"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Bcc</label>
                <input
                  type="email"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Message *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message..."
              rows={10}
              className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!to.trim() || !body.trim() || sending}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Gmail Screen
export function GmailScreen() {
  const { isConnected, user, loading: authLoading, authUrl, disconnect } = useGoogleAuth()
  const {
    messages,
    loading,
    error,
    selectedMessage,
    draftReply,
    draftLoading,
    selectMessage,
    generateDraft,
    sendReply,
    refresh
  } = useGmail({ autoFetch: isConnected, maxResults: 25 })

  const [searchQuery, setSearchQuery] = useState("")
  const [showCompose, setShowCompose] = useState(false)
  const [composeSending, setComposeSending] = useState(false)
  const [composeError, setComposeError] = useState("")
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  // Panel width state
  const [leftPanelWidth, setLeftPanelWidth] = useState(LEFT_PANEL_DEFAULT)
  const [rightPanelWidth, setRightPanelWidth] = useState(RIGHT_PANEL_DEFAULT)
  const [rightSplitHeight, setRightSplitHeight] = useState(RIGHT_SPLIT_DEFAULT)
  const containerRef = useRef(null)

  // Load saved dimensions from localStorage
  useEffect(() => {
    const savedLeftWidth = localStorage.getItem(STORAGE_LEFT_WIDTH)
    const savedRightWidth = localStorage.getItem(STORAGE_RIGHT_WIDTH)
    const savedRightSplitHeight = localStorage.getItem(STORAGE_RIGHT_SPLIT_HEIGHT)

    if (savedLeftWidth) {
      const width = parseInt(savedLeftWidth, 10)
      if (width >= LEFT_PANEL_MIN && width <= LEFT_PANEL_MAX) {
        setLeftPanelWidth(width)
      }
    }

    if (savedRightWidth) {
      const width = parseInt(savedRightWidth, 10)
      if (width >= RIGHT_PANEL_MIN && width <= RIGHT_PANEL_MAX) {
        setRightPanelWidth(width)
      }
    }

    if (savedRightSplitHeight) {
      const height = parseInt(savedRightSplitHeight, 10)
      if (height >= RIGHT_SPLIT_MIN) {
        setRightSplitHeight(height)
      }
    }
  }, [])

  // Handle left divider drag
  const handleLeftDividerDrag = useCallback((clientX) => {
    if (!containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = clientX - containerRect.left

    // Clamp to min/max
    const clampedWidth = Math.min(LEFT_PANEL_MAX, Math.max(LEFT_PANEL_MIN, newWidth))
    setLeftPanelWidth(clampedWidth)
    localStorage.setItem(STORAGE_LEFT_WIDTH, clampedWidth.toString())
  }, [])

  // Handle right divider drag
  const handleRightDividerDrag = useCallback((clientX) => {
    if (!containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newWidth = containerRect.right - clientX

    // Clamp to min/max
    const clampedWidth = Math.min(RIGHT_PANEL_MAX, Math.max(RIGHT_PANEL_MIN, newWidth))
    setRightPanelWidth(clampedWidth)
    localStorage.setItem(STORAGE_RIGHT_WIDTH, clampedWidth.toString())
  }, [])

  // Handle right panel horizontal split drag
  const handleRightSplitHeightChange = useCallback((height) => {
    setRightSplitHeight(height)
    localStorage.setItem(STORAGE_RIGHT_SPLIT_HEIGHT, height.toString())
  }, [])

  // Update reply text when draft is generated
  useEffect(() => {
    if (draftReply) {
      setReplyText(draftReply)
    }
  }, [draftReply])

  // Clear reply text when selecting new message
  useEffect(() => {
    setReplyText("")
    setSendSuccess(false)
  }, [selectedMessage?.id])

  const handleSelectDraft = (draftText) => {
    setReplyText(draftText)
  }

  const handleSendReply = async () => {
    if (!selectedMessage || !replyText.trim()) return

    setSendingReply(true)
    const to = [extractSenderEmail(selectedMessage.from)]
    const subject = selectedMessage.subject?.startsWith('Re:')
      ? selectedMessage.subject
      : `Re: ${selectedMessage.subject}`

    try {
      const success = await sendReply(to, subject, replyText, selectedMessage.threadId, selectedMessage.id)
      if (success) {
        setSendSuccess(true)
        setReplyText("")
        setTimeout(() => {
          setSendSuccess(false)
          refresh()
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setSendingReply(false)
    }
  }

  const handleComposeSend = async ({ to, cc, bcc, subject, body }) => {
    if (!to.trim() || !body.trim()) {
      setComposeError("Please enter a recipient and message")
      return
    }

    setComposeSending(true)
    setComposeError("")

    try {
      const recipients = to.split(',').map(e => e.trim()).filter(Boolean)
      const ccRecipients = cc.split(',').map(e => e.trim()).filter(Boolean)
      const bccRecipients = bcc.split(',').map(e => e.trim()).filter(Boolean)

      const res = await fetch('/api/google/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          cc: ccRecipients.length > 0 ? ccRecipients : undefined,
          bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
          subject: subject || '(No Subject)',
          message: body,
        }),
      })

      const data = await res.json()

      if (data.needsAuth) {
        setComposeError("Not connected to Google. Please reconnect.")
        setComposeSending(false)
        return
      }

      if (data.error) {
        setComposeError(data.error)
        setComposeSending(false)
        return
      }

      if (data.success) {
        setShowCompose(false)
        setComposeError("")
        refresh()
      } else {
        setComposeError("Failed to send email. Please try again.")
      }
    } catch (err) {
      setComposeError(err.message || "Network error. Please try again.")
    } finally {
      setComposeSending(false)
    }
  }

  return (
    <div ref={containerRef} className="flex h-full bg-background overflow-hidden">
      {/* Left Panel - Email List */}
      <EmailListPanel
        messages={messages}
        loading={loading}
        error={error}
        selectedMessage={selectedMessage}
        onSelectMessage={selectMessage}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onRefresh={refresh}
        onCompose={() => setShowCompose(true)}
        isConnected={isConnected}
        authLoading={authLoading}
        authUrl={authUrl}
        onDisconnect={disconnect}
        user={user}
        width={leftPanelWidth}
      />

      {/* Left/Center Divider */}
      <VerticalDivider onDrag={handleLeftDividerDrag} position="left" />

      {/* Center Panel - Email Content & Reply */}
      <EmailContentPanel
        selectedMessage={selectedMessage}
        isConnected={isConnected}
        authUrl={authUrl}
        draftReply={draftReply}
        draftLoading={draftLoading}
        onSendReply={handleSendReply}
        sendingReply={sendingReply}
        sendSuccess={sendSuccess}
        replyText={replyText}
        onReplyTextChange={setReplyText}
      />

      {/* Center/Right Divider */}
      <VerticalDivider onDrag={handleRightDividerDrag} position="right" />

      {/* Right Panel - Draft Options & AI Chat */}
      <DraftPanel
        selectedMessage={selectedMessage}
        draftReply={draftReply}
        draftLoading={draftLoading}
        onSelectDraft={handleSelectDraft}
        width={rightPanelWidth}
        aiChatHeight={rightSplitHeight}
        onAiChatHeightChange={handleRightSplitHeightChange}
      />

      {/* Compose Modal */}
      <ComposeModal
        isOpen={showCompose}
        onClose={() => {
          setShowCompose(false)
          setComposeError("")
        }}
        onSend={handleComposeSend}
        sending={composeSending}
        error={composeError}
      />
    </div>
  )
}
