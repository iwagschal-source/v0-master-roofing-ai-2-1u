"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Mail, Send, Plus, RefreshCw, Search, Loader2, ArrowLeft,
  AlertCircle, ExternalLink, LogOut, Check, Sparkles,
  MessageSquare, FileText, Paperclip, FolderOpen, ChevronDown,
  ChevronRight, Download, File as FileIcon, Image as ImageIcon,
  Inbox, SendHorizontal, FilePen, AlertOctagon, Trash2, Star,
  Reply, ReplyAll, Forward
} from "lucide-react"

// Gmail folder definitions
const GMAIL_FOLDERS = [
  { id: 'INBOX', label: 'Inbox', icon: Inbox },
  { id: 'SENT', label: 'Sent', icon: SendHorizontal },
  { id: 'DRAFT', label: 'Drafts', icon: FilePen },
  { id: 'SPAM', label: 'Spam', icon: AlertOctagon },
  { id: 'TRASH', label: 'Trash', icon: Trash2 },
  { id: 'STARRED', label: 'Starred', icon: Star },
]
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
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const emailDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today - emailDay) / (1000 * 60 * 60 * 24))
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  if (diffDays === 0) return timeStr
  if (diffDays > 0 && diffDays < 7) {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
    return `${dayName} ${timeStr}`
  }
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
  width,
  activeFolder,
  onFolderChange
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
            <h2 className="text-lg font-semibold text-foreground">
              {GMAIL_FOLDERS.find(f => f.id === activeFolder)?.label || 'Inbox'}
            </h2>
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

        {/* Folder Navigation */}
        {isConnected && (
          <div className="flex flex-wrap gap-1 mb-3">
            {GMAIL_FOLDERS.map((folder) => {
              const Icon = folder.icon
              const isActive = activeFolder === folder.id
              return (
                <button
                  key={folder.id}
                  onClick={() => onFolderChange(folder.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {folder.label}
                </button>
              )
            })}
          </div>
        )}

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

// Format file size for display
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Get file type icon based on mime type
function getFileIcon(mimeType) {
  if (mimeType?.startsWith('image/')) return ImageIcon
  if (mimeType?.includes('pdf')) return FileText
  return FileIcon
}

// Attachment Preview Modal — PDF viewer or image lightbox
function AttachmentPreviewModal({ attachment, blobUrl, onClose }) {
  if (!attachment || !blobUrl) return null

  const isPdf = attachment.mimeType === 'application/pdf' || attachment.filename?.toLowerCase().endsWith('.pdf')
  const isImage = attachment.mimeType?.startsWith('image/')

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col" onClick={onClose}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-card/95 backdrop-blur border-b border-border" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {isPdf ? <FileText className="w-4 h-4 text-red-500 flex-shrink-0" /> : <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />}
          <span className="text-sm font-medium text-foreground truncate">{attachment.filename}</span>
          {attachment.size && <span className="text-xs text-muted-foreground flex-shrink-0">{formatFileSize(attachment.size)}</span>}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto" onClick={e => e.stopPropagation()}>
        {isPdf ? (
          <iframe
            src={blobUrl}
            className="w-full h-full bg-white rounded-lg"
            style={{ maxWidth: '900px', minHeight: '80vh' }}
            title={attachment.filename}
          />
        ) : isImage ? (
          <img
            src={blobUrl}
            alt={attachment.filename}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-lg"
          />
        ) : null}
      </div>
    </div>
  )
}

// Single message in a thread
function ThreadMessage({ message, isExpanded, onToggle, isLast }) {
  const iframeRef = useRef(null)
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null)
  const [attachmentLoading, setAttachmentLoading] = useState(null)

  // Clean up blob URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
    }
  }, [previewBlobUrl])

  // Auto-resize iframe when HTML content loads
  useEffect(() => {
    if (!isExpanded || !message.htmlBody || !iframeRef.current) return
    const iframe = iframeRef.current
    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (doc) {
          const height = doc.documentElement.scrollHeight || doc.body.scrollHeight
          iframe.style.height = Math.min(height + 20, 800) + 'px'
        }
      } catch (e) { /* cross-origin, ignore */ }
    }
    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [isExpanded, message.htmlBody])

  // Fetch attachment data and create blob
  const fetchAttachmentBlob = async (attachment) => {
    const res = await fetch(
      `/api/google/gmail?attachmentId=${encodeURIComponent(attachment.attachmentId)}&attachmentMessageId=${encodeURIComponent(message.id)}`
    )
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/')
    const byteChars = atob(base64)
    const byteArrays = []
    for (let i = 0; i < byteChars.length; i += 512) {
      const slice = byteChars.slice(i, i + 512)
      const byteNumbers = new Array(slice.length)
      for (let j = 0; j < slice.length; j++) {
        byteNumbers[j] = slice.charCodeAt(j)
      }
      byteArrays.push(new Uint8Array(byteNumbers))
    }
    const blob = new Blob(byteArrays, { type: attachment.mimeType })
    return URL.createObjectURL(blob)
  }

  const handleAttachmentClick = async (attachment) => {
    const isPdf = attachment.mimeType === 'application/pdf' || attachment.filename?.toLowerCase().endsWith('.pdf')
    const isImage = attachment.mimeType?.startsWith('image/')

    if (isPdf || isImage) {
      // Preview in modal
      setAttachmentLoading(attachment.attachmentId)
      try {
        const url = await fetchAttachmentBlob(attachment)
        setPreviewBlobUrl(url)
        setPreviewAttachment(attachment)
      } catch (err) {
        console.error('Failed to load attachment preview:', err)
      } finally {
        setAttachmentLoading(null)
      }
    } else {
      // Download fallback for other types
      try {
        const url = await fetchAttachmentBlob(attachment)
        const a = document.createElement('a')
        a.href = url
        a.download = attachment.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Failed to download attachment:', err)
      }
    }
  }

  const closePreview = () => {
    if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl)
    setPreviewBlobUrl(null)
    setPreviewAttachment(null)
  }

  if (!isExpanded) {
    // Collapsed message — just sender bar
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/50 border border-border/50 rounded-lg transition-colors text-left"
      >
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="font-medium text-sm text-foreground truncate">{extractSenderName(message.from)}</span>
        <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(message.date)}</span>
        {message.attachments?.length > 0 && (
          <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        )}
        <span className="text-xs text-muted-foreground truncate flex-1">{message.snippet}</span>
      </button>
    )
  }

  // Expanded message — full content
  return (
    <div className={`border border-border/50 rounded-lg overflow-hidden ${isLast ? 'bg-card' : 'bg-card'}`}>
      {/* Message header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left border-b border-border/30"
      >
        <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-foreground">{extractSenderName(message.from)}</span>
            <span className="text-xs text-muted-foreground">&lt;{extractSenderEmail(message.from)}&gt;</span>
          </div>
          {message.to && (
            <div className="text-xs text-muted-foreground mt-0.5">
              to {message.to?.length > 60 ? message.to.substring(0, 60) + '...' : message.to}
              {message.cc && <span> cc {message.cc}</span>}
            </div>
          )}
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(message.date)}</span>
      </button>

      {/* Message body */}
      <div className="px-4 py-4">
        {message.htmlBody ? (
          <iframe
            ref={iframeRef}
            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;line-height:1.5;color:#333;margin:0;padding:0;overflow-x:hidden;}img{max-width:100%;height:auto;}a{color:#2563eb;}blockquote{border-left:3px solid #ddd;margin:0.5em 0;padding-left:1em;color:#666;}</style></head><body>${message.htmlBody}</body></html>`}
            className="w-full border-0 min-h-[100px]"
            style={{ height: '200px' }}
            sandbox="allow-same-origin"
            title="Email content"
          />
        ) : (
          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {message.body || message.snippet || 'No content'}
          </div>
        )}
      </div>

      {/* Attachments */}
      {message.attachments?.length > 0 && (
        <div className="px-4 pb-4 border-t border-border/30 pt-3">
          <div className="flex items-center gap-2 mb-2">
            <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {message.attachments.length} attachment{message.attachments.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {message.attachments.map((att, i) => {
              const Icon = getFileIcon(att.mimeType)
              const isPreviewable = att.mimeType === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf') || att.mimeType?.startsWith('image/')
              const isLoading = attachmentLoading === att.attachmentId
              return (
                <button
                  key={i}
                  onClick={() => handleAttachmentClick(att)}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary/40 hover:bg-secondary/70 border border-border/50 rounded-lg text-sm transition-colors group disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-foreground truncate max-w-[200px]">{att.filename}</span>
                  <span className="text-xs text-muted-foreground">{formatFileSize(att.size)}</span>
                  {isPreviewable ? (
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && previewBlobUrl && (
        <AttachmentPreviewModal
          attachment={previewAttachment}
          blobUrl={previewBlobUrl}
          onClose={closePreview}
        />
      )}
    </div>
  )
}

// Center Panel - Email Content (Thread View)
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
  onReplyTextChange,
  onReply,
  onReplyAll,
  onForward,
}) {
  // Thread state
  const [threadMessages, setThreadMessages] = useState([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [expandedMessages, setExpandedMessages] = useState(new Set())
  const scrollRef = useRef(null)

  // Project logging state
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [loggingStatus, setLoggingStatus] = useState(null)
  const dropdownRef = useRef(null)

  // Fetch thread when message is selected
  useEffect(() => {
    if (!selectedMessage?.threadId) {
      setThreadMessages([])
      return
    }

    const fetchThread = async () => {
      setThreadLoading(true)
      try {
        const res = await fetch(`/api/google/gmail?threadId=${selectedMessage.threadId}`)
        const data = await res.json()
        if (data.messages) {
          setThreadMessages(data.messages)
          // Expand only the last message by default
          const lastMsg = data.messages[data.messages.length - 1]
          if (lastMsg) {
            setExpandedMessages(new Set([lastMsg.id]))
          }
        }
      } catch (err) {
        console.error('Failed to fetch thread:', err)
        setThreadMessages([])
      } finally {
        setThreadLoading(false)
      }
    }
    fetchThread()
  }, [selectedMessage?.threadId])

  // Scroll to bottom (latest message) when thread loads
  useEffect(() => {
    if (threadMessages.length > 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 100)
    }
  }, [threadMessages])

  // Fetch projects on mount
  useEffect(() => {
    const fetchProjects = async () => {
      setProjectsLoading(true)
      try {
        const res = await fetch('/api/ko/project-folders')
        const data = await res.json()
        setProjects(data.projects || [])
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      } finally {
        setProjectsLoading(false)
      }
    }
    fetchProjects()
  }, [])

  // Reset state when email changes
  useEffect(() => {
    setSelectedProject(null)
    setDropdownOpen(false)
    setProjectSearch('')
    setLoggingStatus(null)
  }, [selectedMessage?.id])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleMessage = (msgId) => {
    setExpandedMessages(prev => {
      const next = new Set(prev)
      if (next.has(msgId)) next.delete(msgId)
      else next.add(msgId)
      return next
    })
  }

  // Handle project selection
  const handleSelectProject = async (project) => {
    setSelectedProject(project)
    setDropdownOpen(false)
    setProjectSearch('')
    setLoggingStatus('logging')

    try {
      const res = await fetch('/api/ko/project-communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          type: 'email',
          sourceId: selectedMessage?.id,
          threadId: selectedMessage?.threadId,
          from: selectedMessage?.from,
          to: Array.isArray(selectedMessage?.to) ? selectedMessage.to[0] : selectedMessage?.to,
          subject: selectedMessage?.subject,
          snippet: selectedMessage?.snippet,
        }),
      })

      const data = await res.json()

      if (data.error) {
        console.error('Failed to log email:', data.error)
        setLoggingStatus('error')
        setTimeout(() => setLoggingStatus(null), 3000)
      } else {
        setLoggingStatus('success')
      }
    } catch (err) {
      console.error('Failed to log email:', err)
      setLoggingStatus('error')
      setTimeout(() => setLoggingStatus(null), 3000)
    }
  }

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.companyName?.toLowerCase().includes(projectSearch.toLowerCase())
  )

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
      {/* Thread Header */}
      <div className="px-6 pt-5 pb-3 border-b border-border/50">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-semibold text-foreground truncate pr-4">
            {selectedMessage.subject || '(No Subject)'}
          </h1>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Reply / Reply All / Forward */}
            <button
              onClick={() => onReply?.(selectedMessage, threadMessages)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Reply"
            >
              <Reply className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>
            <button
              onClick={() => onReplyAll?.(selectedMessage, threadMessages)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Reply All"
            >
              <ReplyAll className="w-3.5 h-3.5" />
              <span>All</span>
            </button>
            <button
              onClick={() => onForward?.(selectedMessage, threadMessages)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Forward"
            >
              <Forward className="w-3.5 h-3.5" />
              <span>Fwd</span>
            </button>

            <div className="w-px h-5 bg-border/50 mx-1" />

          {/* Log to Project Dropdown */}
          <div className="relative flex-shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              disabled={loggingStatus === 'logging'}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                loggingStatus === 'success'
                  ? 'bg-green-500/10 text-green-600 border border-green-500/30'
                  : loggingStatus === 'error'
                  ? 'bg-red-500/10 text-red-600 border border-red-500/30'
                  : selectedProject
                  ? 'bg-green-500/10 text-green-600 border border-green-500/30'
                  : 'bg-secondary/50 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50'
              } disabled:opacity-50`}
            >
              {loggingStatus === 'logging' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Logging...</span>
                </>
              ) : loggingStatus === 'error' ? (
                <>
                  <AlertCircle className="w-4 h-4" />
                  <span>Failed to log</span>
                </>
              ) : selectedProject ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="max-w-[150px] truncate">Logged to {selectedProject.name}</span>
                </>
              ) : (
                <>
                  <FolderOpen className="w-4 h-4" />
                  <span>Log to Project</span>
                </>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      placeholder="Search projects..."
                      className="w-full pl-8 pr-3 py-1.5 bg-secondary/30 border border-border/50 rounded text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {projectsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredProjects.length === 0 ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      {projectSearch ? 'No matching projects' : 'No projects found'}
                    </div>
                  ) : (
                    filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleSelectProject(project)}
                        className={`w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors ${
                          selectedProject?.id === project.id ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{project.companyName}</p>
                          </div>
                          {selectedProject?.id === project.id && (
                            <Check className="w-4 h-4 text-primary ml-auto flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
        {threadMessages.length > 1 && (
          <p className="text-xs text-muted-foreground">{threadMessages.length} messages in thread</p>
        )}
      </div>

      {/* Thread Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl space-y-2">
          {threadLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Loading thread...</span>
            </div>
          ) : threadMessages.length > 0 ? (
            threadMessages.map((msg, idx) => (
              <ThreadMessage
                key={msg.id}
                message={msg}
                isExpanded={expandedMessages.has(msg.id)}
                onToggle={() => toggleMessage(msg.id)}
                isLast={idx === threadMessages.length - 1}
              />
            ))
          ) : (
            // Fallback: show single message if thread fetch failed
            <div className="border border-border/50 rounded-lg bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-medium text-sm text-foreground">{extractSenderName(selectedMessage.from)}</span>
                <span className="text-xs text-muted-foreground">&lt;{extractSenderEmail(selectedMessage.from)}&gt;</span>
                <span className="text-xs text-muted-foreground ml-auto">{formatDate(selectedMessage.date)}</span>
              </div>
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {selectedMessage.body || selectedMessage.snippet || 'No content'}
              </div>
            </div>
          )}
        </div>
      </div>
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

  // Chat state
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const chatEndRef = useRef(null)

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

  // Clear chat when email changes
  useEffect(() => {
    setChatMessages([])
    setChatInput('')
  }, [selectedMessage?.id])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Handle chat send
  const handleSendChat = async () => {
    if (!chatInput.trim() || !selectedMessage || chatSending) return

    const userMessage = chatInput.trim()
    setChatInput('')
    setChatSending(true)

    // Add user message
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }])

    // Simulate AI response delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Add simulated assistant response
    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: "I'll help you refine that draft. This feature will be connected to the AI agent soon."
    }])

    setChatSending(false)
  }

  // Handle Enter key in chat input
  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendChat()
    }
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

      {/* AI Assistant Chat */}
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

        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {!selectedMessage ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm text-center">Select an email to chat</p>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm text-center">Ask me to refine drafts</p>
              <p className="text-xs text-center mt-1 opacity-70">e.g., "Make it more formal"</p>
            </div>
          ) : (
            <div className="space-y-3">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary/50 text-foreground'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatSending && (
                <div className="flex justify-start">
                  <div className="bg-secondary/50 px-3 py-2 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-3 border-t border-border flex-shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Ask to modify draft..."
              disabled={!selectedMessage || chatSending}
              className="flex-1 px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 disabled:opacity-50 transition-colors"
            />
            <button
              onClick={handleSendChat}
              disabled={!selectedMessage || !chatInput.trim() || chatSending}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
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
function ComposeModal({ isOpen, onClose, onSend, sending, error, initialData }) {
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [attachments, setAttachments] = useState([])
  const fileInputRef = useRef(null)

  // Pre-fill fields when initialData changes (for reply/replyAll/forward)
  useEffect(() => {
    if (!isOpen || !initialData) return
    setTo(initialData.to || "")
    setCc(initialData.cc || "")
    setBcc(initialData.bcc || "")
    setSubject(initialData.subject || "")
    setBody("") // Always blank per spec — AI agent will fill later
    setShowCcBcc(!!(initialData.cc || initialData.bcc))
    setAttachments([])
  }, [isOpen, initialData])

  // Log to Project state
  const [projects, setProjects] = useState([])
  const [logProject, setLogProject] = useState(null)
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const [projectFilter, setProjectFilter] = useState('')
  const projectDropdownRef = useRef(null)

  // Fetch projects when modal opens
  useEffect(() => {
    if (!isOpen) return
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/ko/project-folders')
        const data = await res.json()
        setProjects(data.projects || [])
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      }
    }
    fetchProjects()
  }, [isOpen])

  // Close project dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target)) {
        setProjectDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredComposeProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(projectFilter.toLowerCase()) ||
    p.companyName?.toLowerCase().includes(projectFilter.toLowerCase())
  )

  const handleSend = () => {
    onSend({
      to, cc, bcc, subject, body, attachments, logProject,
      threadId: initialData?.threadId,
      replyToMessageId: initialData?.replyToMessageId,
      forwardAttachments: initialData?.forwardAttachments,
    })
  }

  const handleClose = () => {
    setTo("")
    setCc("")
    setBcc("")
    setSubject("")
    setBody("")
    setShowCcBcc(false)
    setAttachments([])
    setLogProject(null)
    setProjectDropdownOpen(false)
    setProjectFilter('')
    onClose()
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
    e.target.value = '' // Reset input so same file can be re-selected
  }

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {initialData?.mode === 'reply' ? 'Reply' : initialData?.mode === 'replyAll' ? 'Reply All' : initialData?.mode === 'forward' ? 'Forward' : 'New Message'}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Log to Project */}
          <div className="relative" ref={projectDropdownRef}>
            {logProject ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Logging to: {logProject.name}</span>
                <button
                  onClick={() => setLogProject(null)}
                  className="ml-auto text-green-600 hover:text-red-500 transition-colors text-sm"
                >
                  &times;
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors border border-border/50"
              >
                <FolderOpen className="w-4 h-4" />
                Log to Project
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            )}
            {projectDropdownOpen && (
              <div className="absolute left-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                <div className="p-2 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={projectFilter}
                      onChange={(e) => setProjectFilter(e.target.value)}
                      placeholder="Search projects..."
                      className="w-full pl-8 pr-3 py-1.5 bg-secondary/30 border border-border/50 rounded text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredComposeProjects.length === 0 ? (
                    <div className="py-3 text-center text-sm text-muted-foreground">No projects found</div>
                  ) : (
                    filteredComposeProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setLogProject(project)
                          setProjectDropdownOpen(false)
                          setProjectFilter('')
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{project.companyName}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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

          {/* Attachments */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
            >
              <Paperclip className="w-4 h-4" />
              Attach files
            </button>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1.5 bg-secondary/40 border border-border/50 rounded-lg text-sm"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="truncate max-w-[150px]">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
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
  const [activeFolder, setActiveFolder] = useState('INBOX')

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
  } = useGmail({ autoFetch: isConnected, maxResults: 25, labelIds: [activeFolder] })

  const [searchQuery, setSearchQuery] = useState("")
  const [showCompose, setShowCompose] = useState(false)
  const [composeSending, setComposeSending] = useState(false)
  const [composeError, setComposeError] = useState("")
  const [composeInitial, setComposeInitial] = useState(null)
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

  // Reply: To = sender, Subject = "Re: ...", body = BLANK
  const handleReply = (message, threadMessages) => {
    const lastMsg = threadMessages?.length > 0 ? threadMessages[threadMessages.length - 1] : message
    setComposeInitial({
      mode: 'reply',
      to: extractSenderEmail(lastMsg.from),
      cc: '',
      bcc: '',
      subject: lastMsg.subject?.startsWith('Re:') ? lastMsg.subject : `Re: ${lastMsg.subject || ''}`,
      threadId: lastMsg.threadId,
      replyToMessageId: lastMsg.id,
    })
    setShowCompose(true)
  }

  // Reply All: To = sender, CC = other recipients (excluding current user)
  const handleReplyAll = (message, threadMessages) => {
    const lastMsg = threadMessages?.length > 0 ? threadMessages[threadMessages.length - 1] : message
    const senderEmail = extractSenderEmail(lastMsg.from)
    const currentUserEmail = user?.email || ''

    // Collect all To and CC recipients, remove sender and current user
    const allToEmails = (lastMsg.to || '').split(',').map(e => {
      const match = e.match(/<([^>]+)>/)
      return match ? match[1].trim() : e.trim()
    }).filter(e => e && e.toLowerCase() !== currentUserEmail.toLowerCase() && e.toLowerCase() !== senderEmail.toLowerCase())

    const allCcEmails = (lastMsg.cc || '').split(',').map(e => {
      const match = e.match(/<([^>]+)>/)
      return match ? match[1].trim() : e.trim()
    }).filter(e => e && e.toLowerCase() !== currentUserEmail.toLowerCase() && e.toLowerCase() !== senderEmail.toLowerCase())

    setComposeInitial({
      mode: 'replyAll',
      to: senderEmail,
      cc: [...allToEmails, ...allCcEmails].join(', '),
      bcc: '',
      subject: lastMsg.subject?.startsWith('Re:') ? lastMsg.subject : `Re: ${lastMsg.subject || ''}`,
      threadId: lastMsg.threadId,
      replyToMessageId: lastMsg.id,
    })
    setShowCompose(true)
  }

  // Forward: To = EMPTY, Subject = "Fwd: ...", carry attachments
  const handleForward = (message, threadMessages) => {
    const lastMsg = threadMessages?.length > 0 ? threadMessages[threadMessages.length - 1] : message
    setComposeInitial({
      mode: 'forward',
      to: '',
      cc: '',
      bcc: '',
      subject: lastMsg.subject?.startsWith('Fwd:') ? lastMsg.subject : `Fwd: ${lastMsg.subject || ''}`,
      threadId: lastMsg.threadId,
      replyToMessageId: lastMsg.id,
      forwardAttachments: lastMsg.attachments || [],
    })
    setShowCompose(true)
  }

  const handleComposeSend = async ({ to, cc, bcc, subject, body, attachments = [], logProject = null, threadId, replyToMessageId, forwardAttachments }) => {
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

      // Convert file attachments to base64
      const attachmentData = await Promise.all(
        attachments.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          return {
            filename: file.name,
            mimeType: file.type || 'application/octet-stream',
            data: base64,
          }
        })
      )

      // For forwards, fetch original attachments and include them
      let allAttachments = [...attachmentData]
      if (forwardAttachments?.length > 0 && replyToMessageId) {
        const fwdData = await Promise.all(
          forwardAttachments.map(async (att) => {
            try {
              const res = await fetch(
                `/api/google/gmail?attachmentId=${encodeURIComponent(att.attachmentId)}&attachmentMessageId=${encodeURIComponent(replyToMessageId)}`
              )
              const data = await res.json()
              if (data.data) {
                return {
                  filename: att.filename,
                  mimeType: att.mimeType || 'application/octet-stream',
                  data: data.data.replace(/-/g, '+').replace(/_/g, '/'),
                }
              }
            } catch (err) {
              console.error('Failed to fetch forwarded attachment:', err)
            }
            return null
          })
        )
        allAttachments = [...allAttachments, ...fwdData.filter(Boolean)]
      }

      const res = await fetch('/api/google/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          cc: ccRecipients.length > 0 ? ccRecipients : undefined,
          bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
          subject: subject || '(No Subject)',
          message: body,
          attachments: allAttachments.length > 0 ? allAttachments : undefined,
          threadId: threadId || undefined,
          replyToMessageId: replyToMessageId || undefined,
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
        // Log to project if selected
        if (logProject) {
          try {
            await fetch('/api/ko/project-communications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: logProject.id,
                type: 'email',
                sourceId: data.messageId,
                threadId: data.threadId,
                from: 'me',
                to: to,
                subject: subject || '(No Subject)',
                snippet: body.substring(0, 200),
              }),
            })
          } catch (logErr) {
            console.error('Failed to log sent email to project:', logErr)
          }
        }
        setShowCompose(false)
        setComposeError("")
        setComposeInitial(null)
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
        onCompose={() => { setComposeInitial(null); setShowCompose(true) }}
        isConnected={isConnected}
        authLoading={authLoading}
        authUrl={authUrl}
        onDisconnect={disconnect}
        user={user}
        width={leftPanelWidth}
        activeFolder={activeFolder}
        onFolderChange={setActiveFolder}
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
        onReply={handleReply}
        onReplyAll={handleReplyAll}
        onForward={handleForward}
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
          setComposeInitial(null)
        }}
        onSend={handleComposeSend}
        sending={composeSending}
        error={composeError}
        initialData={composeInitial}
      />
    </div>
  )
}
