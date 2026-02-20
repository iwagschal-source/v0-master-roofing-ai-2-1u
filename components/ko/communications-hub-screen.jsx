"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Mail, Send, Plus, RefreshCw, Search, Loader2, ArrowLeft,
  AlertCircle, ExternalLink, LogOut, Check, Sparkles,
  MessageSquare, FileText, Paperclip, FolderOpen, ChevronDown,
  ChevronRight, Download, File as FileIcon, Image as ImageIcon,
  Inbox, SendHorizontal, FilePen, AlertOctagon, Trash2, Star,
  Reply, ReplyAll, Forward, Hash, AlertTriangle, GripVertical
} from "lucide-react"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"
import { useGmail } from "@/hooks/useGmail"
import { useChatSpaces, formatMessageTime, getInitials } from "@/hooks/useChatSpaces"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"

// Gmail folder definitions
const GMAIL_FOLDERS = [
  { id: 'INBOX', label: 'Inbox', icon: Inbox },
  { id: 'SENT', label: 'Sent', icon: SendHorizontal },
  { id: 'DRAFT', label: 'Drafts', icon: FilePen },
  { id: 'SPAM', label: 'Spam', icon: AlertOctagon },
  { id: 'TRASH', label: 'Trash', icon: Trash2 },
  { id: 'STARRED', label: 'Starred', icon: Star },
]

// Helper functions
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' +
      date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
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

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(mimeType) {
  if (!mimeType) return FileIcon
  if (mimeType.startsWith('image/')) return ImageIcon
  if (mimeType === 'application/pdf') return FileText
  return FileIcon
}

// ─── Resize Handle ───────────────────────────────────────────
function ResizeHandle({ direction = 'vertical' }) {
  return (
    <PanelResizeHandle className={`group relative flex items-center justify-center ${
      direction === 'vertical' ? 'w-1.5 hover:w-2' : 'h-1.5 hover:h-2'
    } bg-border/30 hover:bg-primary/30 transition-all`}>
      <div className={`${
        direction === 'vertical' ? 'w-0.5 h-8' : 'h-0.5 w-8'
      } bg-muted-foreground/20 group-hover:bg-primary/50 rounded-full transition-colors`} />
    </PanelResizeHandle>
  )
}

// ─── Log to Project Dropdown ─────────────────────────────────
function LogToProjectDropdown({ type, sourceData }) {
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [loggingStatus, setLoggingStatus] = useState(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const fetchProjects = async () => {
      setProjectsLoading(true)
      try {
        const res = await fetch('/api/ko/project-folders')
        const data = await res.json()
        setProjects(data.projects || [])
      } catch (err) { console.error('Failed to fetch projects:', err) }
      finally { setProjectsLoading(false) }
    }
    fetchProjects()
  }, [])

  useEffect(() => {
    setSelectedProject(null)
    setLoggingStatus(null)
  }, [sourceData?.sourceId])

  useEffect(() => {
    if (!dropdownOpen) return
    const handleClickOutside = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

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
          type: type || 'email',
          sourceId: sourceData?.sourceId,
          threadId: sourceData?.threadId,
          from: sourceData?.from,
          to: sourceData?.to,
          subject: sourceData?.subject,
          snippet: sourceData?.snippet,
        }),
      })
      const data = await res.json()
      if (data.error) { setLoggingStatus('error'); setTimeout(() => setLoggingStatus(null), 3000) }
      else setLoggingStatus('success')
    } catch (err) {
      console.error('Failed to log:', err)
      setLoggingStatus('error')
      setTimeout(() => setLoggingStatus(null), 3000)
    }
  }

  const filteredProjects = projects.filter(p =>
    !projectSearch || p.name?.toLowerCase().includes(projectSearch.toLowerCase()) || p.companyName?.toLowerCase().includes(projectSearch.toLowerCase())
  )

  return (
    <div className="relative flex-shrink-0" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        disabled={loggingStatus === 'logging'}
        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
          loggingStatus === 'success' || selectedProject
            ? 'bg-green-500/10 text-green-600 border border-green-500/30'
            : loggingStatus === 'error'
            ? 'bg-red-500/10 text-red-600 border border-red-500/30'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'
        } disabled:opacity-50`}
      >
        {loggingStatus === 'logging' ? <Loader2 className="w-3 h-3 animate-spin" />
          : loggingStatus === 'error' ? <AlertCircle className="w-3 h-3" />
          : selectedProject ? <Check className="w-3 h-3" />
          : <FolderOpen className="w-3 h-3" />}
        <span>{loggingStatus === 'logging' ? 'Logging...' : loggingStatus === 'error' ? 'Failed' : selectedProject ? `Logged` : 'Log to Project'}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-1 w-60 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-1.5 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input type="text" value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)}
                placeholder="Search projects..." autoFocus
                className="w-full pl-6 pr-2 py-1 bg-secondary/30 border border-border/50 rounded text-[10px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {projectsLoading ? (
              <div className="flex items-center justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : filteredProjects.length === 0 ? (
              <div className="py-3 text-center text-[10px] text-muted-foreground">{projectSearch ? 'No matching projects' : 'No projects'}</div>
            ) : (
              filteredProjects.map((project) => (
                <button key={project.id} onClick={() => handleSelectProject(project)}
                  className={`w-full text-left px-2.5 py-1.5 hover:bg-muted/50 transition-colors text-[10px] ${selectedProject?.id === project.id ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-center gap-1.5">
                    <FolderOpen className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{project.name}</p>
                      {project.companyName && <p className="text-muted-foreground truncate">{project.companyName}</p>}
                    </div>
                    {selectedProject?.id === project.id && <Check className="w-3 h-3 text-primary ml-auto flex-shrink-0" />}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Attachment Preview Modal ────────────────────────────────
function AttachmentPreviewModal({ attachment, blobUrl, onClose }) {
  if (!attachment || !blobUrl) return null
  const isPdf = attachment.mimeType === 'application/pdf' || attachment.filename?.toLowerCase().endsWith('.pdf')
  const isImage = attachment.mimeType?.startsWith('image/')

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex flex-col" onClick={onClose}>
      <div className="flex items-center gap-3 px-4 py-3 bg-card/95 backdrop-blur border-b border-border" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          {isPdf ? <FileText className="w-4 h-4 text-red-500 flex-shrink-0" /> : <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />}
          <span className="text-sm font-medium text-foreground truncate">{attachment.filename}</span>
          {attachment.size && <span className="text-xs text-muted-foreground flex-shrink-0">{formatFileSize(attachment.size)}</span>}
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 overflow-auto" onClick={e => e.stopPropagation()}>
        {isPdf ? (
          <iframe src={blobUrl} className="w-full h-full bg-white rounded-lg" style={{ maxWidth: '900px', minHeight: '80vh' }} title={attachment.filename} />
        ) : isImage ? (
          <img src={blobUrl} alt={attachment.filename} className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-lg" />
        ) : null}
      </div>
    </div>
  )
}

// ─── LEFT PANEL: Email List ──────────────────────────────────
function EmailListPanel({
  messages, loading, error, selectedMessage, onSelectMessage,
  searchQuery, onSearchChange, onRefresh, onCompose,
  isConnected, authUrl, user, onDisconnect,
  activeFolder, onFolderChange
}) {
  const filteredMessages = messages.filter(email => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      email.subject?.toLowerCase().includes(query) ||
      email.from?.toLowerCase().includes(query) ||
      email.snippet?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {GMAIL_FOLDERS.find(f => f.id === activeFolder)?.label || 'Inbox'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {user && (
              <button onClick={onDisconnect} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-destructive" title="Disconnect">
                <LogOut className="w-3 h-3" />
              </button>
            )}
            <button onClick={onRefresh} disabled={loading} className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onCompose} disabled={!isConnected} className="p-1 hover:bg-muted rounded transition-colors disabled:opacity-50 text-primary" title="Compose">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Folder nav */}
        <div className="flex gap-1 mb-2 overflow-x-auto">
          {GMAIL_FOLDERS.map(folder => {
            const Icon = folder.icon
            const isActive = activeFolder === folder.id
            return (
              <button
                key={folder.id}
                onClick={() => onFolderChange(folder.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs whitespace-nowrap transition-colors ${
                  isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <Icon className="w-3 h-3" />
                {folder.label}
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emails..."
            className="w-full pl-7 pr-3 py-1.5 bg-secondary/30 border border-border/50 rounded text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
          />
        </div>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {!isConnected ? (
          <div className="p-4 text-center">
            <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs text-muted-foreground mb-2">Connect Google to view emails</p>
            <a href={authUrl} className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium">
              Connect
            </a>
          </div>
        ) : loading && messages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-3">
            <div className="flex items-center gap-2 text-destructive text-xs">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">No emails found</div>
        ) : (
          filteredMessages.map((email) => (
            <button
              key={email.id}
              onClick={() => onSelectMessage(email)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/30 transition-colors ${
                selectedMessage?.id === email.id ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-xs font-medium truncate mr-2 ${email.read ? 'text-muted-foreground' : 'text-foreground'}`}>
                  {extractSenderName(email.from)}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatDate(email.date)}</span>
              </div>
              <div className={`text-xs mb-0.5 truncate ${email.read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                {email.subject || '(No Subject)'}
              </div>
              <div className="text-[10px] text-muted-foreground truncate">{email.snippet}</div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

// ─── CENTER PANEL: Email Preview + Agent ─────────────────────
function EmailPreviewPanel({ selectedMessage, onReply, onReplyAll, onForward, user }) {
  const [threadMessages, setThreadMessages] = useState([])
  const [threadLoading, setThreadLoading] = useState(false)
  const [expandedMessages, setExpandedMessages] = useState(new Set())
  const [agentInput, setAgentInput] = useState('')
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null)
  const [attachmentLoading, setAttachmentLoading] = useState(null)
  const scrollRef = useRef(null)

  const fetchAttachmentBlob = async (attachment, messageId) => {
    const res = await fetch(`/api/google/gmail?attachmentId=${encodeURIComponent(attachment.attachmentId)}&attachmentMessageId=${encodeURIComponent(messageId)}`)
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    const base64 = data.data.replace(/-/g, '+').replace(/_/g, '/')
    const byteChars = atob(base64)
    const byteArrays = []
    for (let i = 0; i < byteChars.length; i += 512) {
      const slice = byteChars.slice(i, i + 512)
      const byteNumbers = new Array(slice.length)
      for (let j = 0; j < slice.length; j++) byteNumbers[j] = slice.charCodeAt(j)
      byteArrays.push(new Uint8Array(byteNumbers))
    }
    const blob = new Blob(byteArrays, { type: attachment.mimeType })
    return URL.createObjectURL(blob)
  }

  const handleAttachmentClick = async (attachment, messageId) => {
    const isPdf = attachment.mimeType === 'application/pdf' || attachment.filename?.toLowerCase().endsWith('.pdf')
    const isImage = attachment.mimeType?.startsWith('image/')
    if (isPdf || isImage) {
      setAttachmentLoading(attachment.attachmentId)
      try {
        const url = await fetchAttachmentBlob(attachment, messageId)
        setPreviewBlobUrl(url)
        setPreviewAttachment(attachment)
      } catch (err) { console.error('Failed to load attachment preview:', err) }
      finally { setAttachmentLoading(null) }
    } else {
      try {
        const url = await fetchAttachmentBlob(attachment, messageId)
        const a = document.createElement('a')
        a.href = url; a.download = attachment.filename
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } catch (err) { console.error('Failed to download attachment:', err) }
    }
  }

  useEffect(() => {
    if (!selectedMessage?.threadId) { setThreadMessages([]); return }
    const fetchThread = async () => {
      setThreadLoading(true)
      try {
        const res = await fetch(`/api/google/gmail?threadId=${selectedMessage.threadId}`)
        const data = await res.json()
        if (data.messages) {
          setThreadMessages(data.messages)
          const lastMsg = data.messages[data.messages.length - 1]
          if (lastMsg) setExpandedMessages(new Set([lastMsg.id]))
        }
      } catch (err) { setThreadMessages([]) }
      finally { setThreadLoading(false) }
    }
    fetchThread()
  }, [selectedMessage?.threadId])

  useEffect(() => {
    if (threadMessages.length > 0 && scrollRef.current) {
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100)
    }
  }, [threadMessages])

  const toggleMessage = (id) => {
    setExpandedMessages(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (!selectedMessage) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground h-full">
        <div className="text-center">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Select an email to view</p>
        </div>
      </div>
    )
  }

  return (
    <>
    <PanelGroup direction="vertical">
      {/* Upper: Email Preview */}
      <Panel defaultSize={75} minSize={30}>
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-3 pb-2 border-b border-border/50">
            <div className="flex items-center justify-between mb-0.5">
              <h2 className="text-sm font-semibold text-foreground truncate pr-3">
                {selectedMessage.subject || '(No Subject)'}
              </h2>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={() => onReply?.(selectedMessage, threadMessages)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="Reply">
                  <Reply className="w-3 h-3" /><span>Reply</span>
                </button>
                <button onClick={() => onReplyAll?.(selectedMessage, threadMessages)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="Reply All">
                  <ReplyAll className="w-3 h-3" /><span>All</span>
                </button>
                <button onClick={() => onForward?.(selectedMessage, threadMessages)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors" title="Forward">
                  <Forward className="w-3 h-3" /><span>Fwd</span>
                </button>
                <LogToProjectDropdown type="email" sourceData={{
                  sourceId: selectedMessage?.id, threadId: selectedMessage?.threadId,
                  from: selectedMessage?.from, to: Array.isArray(selectedMessage?.to) ? selectedMessage.to[0] : selectedMessage?.to,
                  subject: selectedMessage?.subject, snippet: selectedMessage?.snippet,
                }} />
              </div>
            </div>
            {threadMessages.length > 1 && (
              <p className="text-[10px] text-muted-foreground">{threadMessages.length} messages in thread</p>
            )}
          </div>

          {/* Thread messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {threadLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : threadMessages.length > 0 ? (
                threadMessages.map((msg, idx) => {
                  const isExpanded = expandedMessages.has(msg.id)
                  if (!isExpanded) {
                    return (
                      <button key={msg.id} onClick={() => toggleMessage(msg.id)} className="w-full flex items-center gap-2 px-3 py-2 bg-card hover:bg-muted/50 border border-border/50 rounded-lg text-left text-xs">
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium truncate">{extractSenderName(msg.from)}</span>
                        <span className="text-muted-foreground text-[10px]">{formatDate(msg.date)}</span>
                      </button>
                    )
                  }
                  return (
                    <div key={msg.id} className="border border-border/50 rounded-lg overflow-hidden bg-card">
                      <button onClick={() => toggleMessage(msg.id)} className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/30 text-left border-b border-border/30 text-xs">
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        <span className="font-medium">{extractSenderName(msg.from)}</span>
                        <span className="text-muted-foreground text-[10px] ml-auto">{formatDate(msg.date)}</span>
                      </button>
                      <div className="px-3 py-2 text-xs">
                        {msg.htmlBody ? (
                          <iframe
                            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,sans-serif;font-size:13px;line-height:1.4;color:#333;margin:0;padding:0;}img{max-width:100%;}a{color:#2563eb;}</style></head><body>${msg.htmlBody}</body></html>`}
                            className="w-full border-0 min-h-[80px]"
                            style={{ height: '150px' }}
                            sandbox="allow-same-origin"
                            title="Email"
                          />
                        ) : (
                          <div className="whitespace-pre-wrap text-foreground">{msg.body || msg.snippet || 'No content'}</div>
                        )}
                      </div>
                      {msg.attachments?.length > 0 && (
                        <div className="px-3 pb-2 border-t border-border/30 pt-2">
                          <div className="flex flex-wrap gap-1.5">
                            {msg.attachments.map((att, i) => {
                              const Icon = getFileIcon(att.mimeType)
                              const isPreviewable = att.mimeType === 'application/pdf' || att.filename?.toLowerCase().endsWith('.pdf') || att.mimeType?.startsWith('image/')
                              const isLoading = attachmentLoading === att.attachmentId
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleAttachmentClick(att, msg.id)}
                                  disabled={isLoading}
                                  className="flex items-center gap-1 px-2 py-1 bg-secondary/40 hover:bg-secondary/70 border border-border/50 rounded text-[10px] transition-colors group disabled:opacity-50"
                                >
                                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /> : <Icon className="w-3 h-3 text-muted-foreground" />}
                                  <span className="truncate max-w-[120px]">{att.filename}</span>
                                  {att.size && <span className="text-muted-foreground">{formatFileSize(att.size)}</span>}
                                  {isPreviewable
                                    ? <ExternalLink className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    : <Download className="w-2.5 h-2.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                  }
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="border border-border/50 rounded-lg bg-card p-3 text-xs">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{extractSenderName(selectedMessage.from)}</span>
                    <span className="text-muted-foreground text-[10px]">{formatDate(selectedMessage.date)}</span>
                  </div>
                  <div className="whitespace-pre-wrap text-foreground">{selectedMessage.body || selectedMessage.snippet || 'No content'}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel>

      <ResizeHandle direction="horizontal" />

      {/* Lower: AI Agent Placeholder */}
      <Panel defaultSize={25} minSize={10}>
        <div className="h-full m-2 rounded-[14px] border border-[rgba(215,64,58,0.4)] bg-card flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center overflow-y-auto p-2">
            <div className="text-center text-muted-foreground">
              <Sparkles className="w-4 h-4 mx-auto mb-1 opacity-40" />
              <span className="text-[10px] opacity-60">KO will help you with this email</span>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2 pb-2">
            <button className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors text-muted-foreground">
              <Plus className="w-3.5 h-3.5" />
            </button>
            <input
              type="text"
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              placeholder="Ask KO about this email..."
              className="flex-1 px-2.5 py-1.5 bg-secondary/30 border border-border/50 rounded-full text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
      </Panel>
    </PanelGroup>

    {/* Attachment Preview Modal */}
    <AttachmentPreviewModal
      attachment={previewAttachment}
      blobUrl={previewBlobUrl}
      onClose={() => { setPreviewAttachment(null); if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl); setPreviewBlobUrl(null) }}
    />
  </>
  )
}

// ─── Helper: format chat list timestamp ─────────────────────
function formatChatListTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Helper: format message timestamp ────────────────────────
function formatMsgTimestamp(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ', ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// ─── Helper: date separator label ────────────────────────────
function getDateLabel(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today - msgDate) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}

// ─── RIGHT PANEL: Chat ───────────────────────────────────────
function ChatPanel({ isConnected, authUrl, user }) {
  const { spaces, loading, selectedSpace, messages, messagesLoading, selectSpace, sendMessage, refresh } = useChatSpaces({ autoFetch: isConnected })
  const [inputValue, setInputValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sortedMessages = [...messages].sort((a, b) =>
    new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
  )

  // Per-sender colors
  const senderColorMap = useRef(new Map())
  const SENDER_COLORS = [
    'bg-blue-50 text-blue-900', 'bg-emerald-50 text-emerald-900',
    'bg-purple-50 text-purple-900', 'bg-amber-50 text-amber-900',
    'bg-rose-50 text-rose-900', 'bg-cyan-50 text-cyan-900',
  ]
  const SENDER_AVATAR = [
    'bg-blue-500 text-white', 'bg-emerald-500 text-white',
    'bg-purple-500 text-white', 'bg-amber-500 text-white',
    'bg-rose-500 text-white', 'bg-cyan-500 text-white',
  ]
  const getSenderColor = (email) => {
    if (!senderColorMap.current.has(email)) {
      senderColorMap.current.set(email, senderColorMap.current.size % SENDER_COLORS.length)
    }
    return senderColorMap.current.get(email)
  }

  const handleSend = async () => {
    if (!inputValue.trim() || sending || !selectedSpace) return
    setSending(true)
    const success = await sendMessage(inputValue)
    if (success) setInputValue("")
    setSending(false)
  }

  // Sort all spaces together by last activity (most recent first)
  const allSpaces = [...spaces].sort((a, b) => {
    const aTime = a.lastMessage?.createTime || a.lastActiveTime || ''
    const bTime = b.lastMessage?.createTime || b.lastActiveTime || ''
    return bTime.localeCompare(aTime)
  })

  const filteredSpaces = allSpaces.filter(s =>
    !searchQuery || s.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Check if two messages are in the same "group" (same sender, within 2 min)
  const isSameGroup = (prev, curr) => {
    if (!prev) return false
    const prevKey = prev.sender?.rawId || prev.sender?.email || prev.sender?.name
    const currKey = curr.sender?.rawId || curr.sender?.email || curr.sender?.name
    if (prevKey !== currKey) return false
    const diff = new Date(curr.createTime) - new Date(prev.createTime)
    return diff < 2 * 60 * 1000 // 2 minutes
  }

  // Check if date separator needed between two messages
  const needsDateSeparator = (prev, curr) => {
    if (!prev) return true
    const prevDate = new Date(prev.createTime).toDateString()
    const currDate = new Date(curr.createTime).toDateString()
    return prevDate !== currDate
  }

  return (
    <PanelGroup direction="vertical">
      {/* Upper: Chat Messages */}
      <Panel defaultSize={60} minSize={20}>
        <div className="flex flex-col h-full overflow-hidden">
          {selectedSpace ? (
            <>
              {/* Chat header */}
              <div className="px-3 py-2 border-b border-border/50 bg-card flex items-center gap-2">
                {selectedSpace.type === 'ROOM' ? (
                  <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Hash className="w-3.5 h-3.5 text-primary" />
                  </div>
                ) : (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium ${
                    SENDER_AVATAR[getSenderColor(selectedSpace.displayName || '')] || 'bg-muted text-foreground'
                  }`}>
                    {getInitials(selectedSpace.displayName || 'DM')}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-medium text-foreground truncate">{selectedSpace.displayName}</h3>
                  <p className="text-[10px] text-muted-foreground">{selectedSpace.type === 'ROOM' ? 'Space' : 'Direct message'}</p>
                </div>
                <button onClick={refresh} disabled={loading} className="p-1 hover:bg-muted rounded transition-colors">
                  <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
                </button>
                <LogToProjectDropdown type="chat" sourceData={{
                  sourceId: selectedSpace?.name || selectedSpace?.id,
                  subject: selectedSpace?.displayName,
                  snippet: messages?.[messages.length - 1]?.text?.slice(0, 200),
                }} />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-3 py-2">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : sortedMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-xs">No messages yet</div>
                ) : (
                  <div className="space-y-1">
                    {sortedMessages.map((message, index) => {
                      const prev = index > 0 ? sortedMessages[index - 1] : null
                      // Detect own messages by email OR raw user ID
                      const cookieUserId = typeof document !== 'undefined' ? document.cookie.match(/google_user_id=([^;]+)/)?.[1] : null
                      const isOwn = (message.sender.email && message.sender.email === user?.email) ||
                        (message.sender.rawId && cookieUserId && message.sender.rawId === `users/${cookieUserId}`)
                      const showDateSep = needsDateSeparator(prev, message)
                      const isGrouped = !showDateSep && isSameGroup(prev, message)
                      const colorIdx = isOwn ? -1 : getSenderColor(message.sender.email || message.sender.name)

                      return (
                        <div key={message.id}>
                          {/* Date separator */}
                          {showDateSep && (
                            <div className="flex items-center gap-2 my-3">
                              <div className="flex-1 h-px bg-border/50" />
                              <span className="text-[9px] text-muted-foreground font-medium px-2">
                                {getDateLabel(message.createTime)}
                              </span>
                              <div className="flex-1 h-px bg-border/50" />
                            </div>
                          )}

                          {/* Message */}
                          <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''} ${isGrouped ? 'mt-0.5' : 'mt-2'}`}>
                            {/* Avatar */}
                            {!isGrouped ? (
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-medium ${
                                isOwn ? 'bg-primary text-primary-foreground' : SENDER_AVATAR[colorIdx] || 'bg-muted'
                              }`}>{getInitials(message.sender.name)}</div>
                            ) : <div className="w-6" />}

                            <div className={`flex-1 min-w-0 ${isOwn ? 'text-right' : ''}`}>
                              {/* Sender name + timestamp (only on first in group) */}
                              {!isGrouped && (
                                <div className={`flex items-center gap-1.5 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                                  <span className="text-[10px] font-semibold text-foreground">{isOwn ? 'You' : message.sender.name}</span>
                                  <span className="text-[9px] text-muted-foreground">{formatMsgTimestamp(message.createTime)}</span>
                                </div>
                              )}

                              {/* Quoted message */}
                              {message.quotedMessageMetadata && (
                                <div className={`mb-1 ${isOwn ? 'ml-auto' : ''} max-w-[85%]`}>
                                  <div className="border-l-2 border-muted-foreground/30 pl-2 py-0.5 text-[10px] text-muted-foreground italic bg-muted/30 rounded-r">
                                    Quoted message
                                  </div>
                                </div>
                              )}

                              {/* Message bubble */}
                              <div className={`inline-block px-3 py-1.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : `${SENDER_COLORS[colorIdx] || 'bg-card border border-border'} rounded-bl-md`
                              }`}>
                                <p className="whitespace-pre-wrap break-words">{message.text}</p>
                              </div>

                              {/* Reactions */}
                              {message.emojiReactionSummaries?.length > 0 && (
                                <div className={`flex gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                                  {message.emojiReactionSummaries.map((r, ri) => (
                                    <span key={ri} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-muted/50 border border-border/50 rounded-full text-[10px]">
                                      {r.emoji?.unicode || '👍'} <span className="text-muted-foreground">{r.reactionCount || 1}</span>
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-2 border-t border-border/50 bg-card">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                    placeholder={`Message ${selectedSpace.displayName}...`}
                    disabled={sending}
                    className="flex-1 px-3 py-1.5 bg-background border border-border/50 rounded-lg text-xs placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                  />
                  <button onClick={handleSend} disabled={!inputValue.trim() || sending} className="p-1.5 bg-primary text-primary-foreground rounded-lg disabled:opacity-40">
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Select a conversation</p>
              </div>
            </div>
          )}
        </div>
      </Panel>

      <ResizeHandle direction="horizontal" />

      {/* Lower: Chat List (sorted by recency, unified) */}
      <Panel defaultSize={40} minSize={15}>
        <div className="flex flex-col h-full overflow-hidden bg-card">
          {/* Header */}
          <div className="px-3 pt-2 pb-1.5 border-b border-border/50">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-foreground">Chat</span>
              </div>
              <button onClick={refresh} disabled={loading} className="p-1 hover:bg-muted rounded transition-colors">
                <RefreshCw className={`w-3 h-3 text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-6 pr-2 py-1 bg-secondary/30 border border-border/50 rounded text-[10px] placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
            </div>
          </div>

          {/* Spaces list — unified, sorted by recency */}
          <div className="flex-1 overflow-y-auto">
            {!isConnected ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                <p className="mb-2">Connect Google to chat</p>
                <a href={authUrl} className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded text-[10px]">Connect</a>
              </div>
            ) : loading && spaces.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSpaces.length === 0 ? (
              <div className="p-3 text-center text-[10px] text-muted-foreground">No chats found</div>
            ) : (
              filteredSpaces.map(space => {
                const isDm = space.type === 'DM' || space.type === 'GROUP_DM' || space.type === 'DIRECT_MESSAGE'
                const isSelected = selectedSpace?.id === space.id
                const lastMsg = space.lastMessage
                const lastTime = lastMsg?.createTime || space.lastActiveTime
                // Determine if last message was from current user
                const isOwnLastMsg = lastMsg?.senderEmail === user?.email
                const previewText = lastMsg ? (isOwnLastMsg ? `You: ${lastMsg.text}` : lastMsg.text) : ''

                return (
                  <button
                    key={space.id}
                    onClick={() => selectSpace(space)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
                    }`}
                  >
                    {/* Avatar */}
                    {isDm ? (
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${
                        SENDER_AVATAR[getSenderColor(space.displayName || '')] || 'bg-muted text-foreground'
                      }`}>
                        {getInitials(space.displayName || 'DM')}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-3 h-3 text-primary" />
                      </div>
                    )}

                    {/* Name + preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium text-foreground truncate">{space.displayName}</span>
                        {lastTime && (
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                            {formatChatListTime(lastTime)}
                          </span>
                        )}
                      </div>
                      {previewText && (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{previewText}</p>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </Panel>
    </PanelGroup>
  )
}

// ─── MAIN: Communications Hub ────────────────────────────────
export function CommunicationsHubScreen() {
  const { isConnected, user, loading: authLoading, authUrl, disconnect } = useGoogleAuth()
  const [activeFolder, setActiveFolder] = useState('INBOX')

  const {
    messages, loading, error, selectedMessage, selectMessage, sendReply, refresh
  } = useGmail({ autoFetch: isConnected, maxResults: 25, labelIds: [activeFolder] })

  const [searchQuery, setSearchQuery] = useState("")
  const [showCompose, setShowCompose] = useState(false)
  const [composeSending, setComposeSending] = useState(false)
  const [composeError, setComposeError] = useState("")
  const [composeInitial, setComposeInitial] = useState(null)

  // Reply/Forward handlers
  const handleReply = (message, threadMessages) => {
    const lastMsg = threadMessages?.length > 0 ? threadMessages[threadMessages.length - 1] : message
    setComposeInitial({
      mode: 'reply',
      to: extractSenderEmail(lastMsg.from),
      subject: lastMsg.subject?.startsWith('Re:') ? lastMsg.subject : `Re: ${lastMsg.subject || ''}`,
      threadId: lastMsg.threadId,
      replyToMessageId: lastMsg.id,
    })
    setShowCompose(true)
  }

  const handleReplyAll = (message, threadMessages) => {
    const lastMsg = threadMessages?.length > 0 ? threadMessages[threadMessages.length - 1] : message
    const senderEmail = extractSenderEmail(lastMsg.from)
    const currentUserEmail = user?.email || ''
    const allOthers = [...(lastMsg.to || ''), ...(lastMsg.cc || '').split(',')].map(e => {
      const m = e.match(/<([^>]+)>/)
      return m ? m[1].trim() : e.trim()
    }).filter(e => e && e.toLowerCase() !== currentUserEmail.toLowerCase() && e.toLowerCase() !== senderEmail.toLowerCase())

    setComposeInitial({
      mode: 'replyAll',
      to: senderEmail,
      cc: allOthers.join(', '),
      subject: lastMsg.subject?.startsWith('Re:') ? lastMsg.subject : `Re: ${lastMsg.subject || ''}`,
      threadId: lastMsg.threadId,
      replyToMessageId: lastMsg.id,
    })
    setShowCompose(true)
  }

  const handleForward = (message, threadMessages) => {
    const lastMsg = threadMessages?.length > 0 ? threadMessages[threadMessages.length - 1] : message
    setComposeInitial({
      mode: 'forward',
      to: '',
      subject: lastMsg.subject?.startsWith('Fwd:') ? lastMsg.subject : `Fwd: ${lastMsg.subject || ''}`,
      threadId: lastMsg.threadId,
      replyToMessageId: lastMsg.id,
      forwardAttachments: lastMsg.attachments || [],
    })
    setShowCompose(true)
  }

  const handleComposeSend = async ({ to, cc, bcc, subject, body, attachments, threadId, replyToMessageId }) => {
    if (!to?.trim() || !body?.trim()) { setComposeError("Please enter a recipient and message"); return }
    setComposeSending(true)
    setComposeError("")
    try {
      const recipients = to.split(',').map(e => e.trim()).filter(Boolean)
      const ccList = cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : []
      const bccList = bcc ? bcc.split(',').map(e => e.trim()).filter(Boolean) : []

      let attachmentData
      if (attachments?.length > 0) {
        attachmentData = await Promise.all(attachments.map(async (file) => {
          const arrayBuffer = await file.arrayBuffer()
          const base64 = btoa(new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''))
          return { filename: file.name, mimeType: file.type || 'application/octet-stream', data: base64 }
        }))
      }

      const res = await fetch('/api/google/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          cc: ccList.length > 0 ? ccList : undefined,
          bcc: bccList.length > 0 ? bccList : undefined,
          subject: subject || '(No Subject)',
          message: body,
          attachments: attachmentData || undefined,
          threadId: threadId || undefined,
          replyToMessageId: replyToMessageId || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowCompose(false)
        setComposeInitial(null)
        setComposeError("")
        refresh()
      } else {
        setComposeError(data.error || "Failed to send")
      }
    } catch (err) {
      setComposeError(err.message || "Network error")
    } finally {
      setComposeSending(false)
    }
  }

  return (
    <div className="flex-1 h-full overflow-hidden">
      <PanelGroup direction="horizontal" autoSaveId="comms-hub-h">
        {/* LEFT: Email List */}
        <Panel defaultSize={22} minSize={15} maxSize={35}>
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
            authUrl={authUrl}
            user={user}
            onDisconnect={disconnect}
            activeFolder={activeFolder}
            onFolderChange={setActiveFolder}
          />
        </Panel>

        <ResizeHandle direction="vertical" />

        {/* CENTER: Email Preview + Agent */}
        <Panel defaultSize={48} minSize={25}>
          <EmailPreviewPanel
            selectedMessage={selectedMessage}
            onReply={handleReply}
            onReplyAll={handleReplyAll}
            onForward={handleForward}
            user={user}
          />
        </Panel>

        <ResizeHandle direction="vertical" />

        {/* RIGHT: Chat */}
        <Panel defaultSize={30} minSize={18} maxSize={45}>
          <ChatPanel isConnected={isConnected} authUrl={authUrl} user={user} />
        </Panel>
      </PanelGroup>

      {/* Compose Modal (shared) */}
      {showCompose && (
        <ComposeOverlay
          initialData={composeInitial}
          sending={composeSending}
          error={composeError}
          onSend={handleComposeSend}
          onClose={() => { setShowCompose(false); setComposeError(""); setComposeInitial(null) }}
        />
      )}
    </div>
  )
}

// ─── Compact Compose Overlay ─────────────────────────────────
function ComposeOverlay({ initialData, sending, error, onSend, onClose }) {
  const [to, setTo] = useState(initialData?.to || "")
  const [cc, setCc] = useState(initialData?.cc || "")
  const [bcc, setBcc] = useState(initialData?.bcc || "")
  const [subject, setSubject] = useState(initialData?.subject || "")
  const [body, setBody] = useState("")
  const [attachments, setAttachments] = useState([])
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
    e.target.value = ''
  }
  const removeAttachment = (index) => setAttachments(prev => prev.filter((_, i) => i !== index))

  const title = initialData?.mode === 'reply' ? 'Reply' : initialData?.mode === 'replyAll' ? 'Reply All' : initialData?.mode === 'forward' ? 'Forward' : 'New Message'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <div className="flex items-center gap-2 ml-auto">
            <LogToProjectDropdown type="email" sourceData={{
              sourceId: initialData?.replyToMessageId, threadId: initialData?.threadId,
              subject: subject, from: 'me', to: to, snippet: body?.slice(0, 200),
            }} />
            <button onClick={onClose} className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">To *</label>
            <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@example.com"
              className="w-full px-2.5 py-1.5 bg-secondary/30 border border-border/50 rounded text-xs focus:outline-none focus:border-primary/50" />
          </div>
          {(cc || initialData?.cc) && (
            <div>
              <label className="block text-[10px] text-muted-foreground mb-0.5">Cc</label>
              <input type="email" value={cc} onChange={(e) => setCc(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-secondary/30 border border-border/50 rounded text-xs focus:outline-none focus:border-primary/50" />
            </div>
          )}
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Subject</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-secondary/30 border border-border/50 rounded text-xs focus:outline-none focus:border-primary/50" />
          </div>
          <div>
            <label className="block text-[10px] text-muted-foreground mb-0.5">Message *</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message..." rows={8}
              className="w-full px-2.5 py-1.5 bg-secondary/30 border border-border/50 rounded text-xs focus:outline-none focus:border-primary/50 resize-none" />
          </div>
          <div>
            <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors">
              <Paperclip className="w-3 h-3" /> Attach files
            </button>
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-1 px-2 py-1 bg-secondary/40 border border-border/50 rounded text-[10px]">
                    <Paperclip className="w-3 h-3 text-muted-foreground" />
                    <span className="truncate max-w-[120px]">{file.name}</span>
                    <span className="text-muted-foreground">{formatFileSize(file.size)}</span>
                    <button onClick={() => removeAttachment(i)} className="text-muted-foreground hover:text-destructive ml-0.5">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          {error && (
            <div className="flex items-center gap-1 text-destructive text-xs">
              <AlertCircle className="w-3 h-3" />{error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 p-3 border-t border-border">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">Cancel</button>
          <button
            onClick={() => onSend({ to, cc, bcc, subject, body, attachments, threadId: initialData?.threadId, replyToMessageId: initialData?.replyToMessageId })}
            disabled={!to.trim() || !body.trim() || sending}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
