"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, Send, RefreshCw, Loader2, Search, Hash, User, ExternalLink, LogOut, AlertTriangle, AlertCircle, FolderOpen, ChevronDown, Check, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react"
import { useChatSpaces, formatMessageTime, getInitials } from "@/hooks/useChatSpaces"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"

export function ChatScreen() {
  const { isConnected, user, loading: authLoading, authUrl, disconnect } = useGoogleAuth()
  const { spaces, loading, selectedSpace, messages, messagesLoading, selectSpace, sendMessage, refresh } = useChatSpaces({ autoFetch: isConnected })

  const [inputValue, setInputValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const [attachedFiles, setAttachedFiles] = useState([])

  // Project logging state
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')
  const [loggingStatus, setLoggingStatus] = useState(null) // null | 'logging' | 'success' | 'error'
  const dropdownRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  // Reset selected project when space changes
  useEffect(() => {
    setSelectedProject(null)
    setDropdownOpen(false)
    setProjectSearch('')
    setLoggingStatus(null)
  }, [selectedSpace?.id])

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

  // Handle project selection - save to BigQuery via API
  const handleSelectProject = async (project) => {
    setSelectedProject(project)
    setDropdownOpen(false)
    setProjectSearch('')
    setLoggingStatus('logging')

    try {
      // Get last message snippet if available
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null
      const contentSnippet = lastMessage?.text?.substring(0, 200) || ''

      const res = await fetch('/api/ko/project-communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          type: 'chat',
          sourceId: selectedSpace?.id,
          subject: selectedSpace?.displayName || 'Chat Conversation',
          content: contentSnippet,
          loggedBy: user?.email || 'unknown',
        }),
      })

      const data = await res.json()

      if (data.error) {
        console.error('Failed to log chat:', data.error)
        setLoggingStatus('error')
        setTimeout(() => setLoggingStatus(null), 3000)
      } else {
        console.log('Chat conversation logged to project:', {
          spaceId: selectedSpace?.id,
          spaceName: selectedSpace?.displayName,
          projectId: project.id,
          projectName: project.name,
          communicationId: data.id,
        })
        setLoggingStatus('success')
      }
    } catch (err) {
      console.error('Failed to log chat:', err)
      setLoggingStatus('error')
      setTimeout(() => setLoggingStatus(null), 3000)
    }
  }

  // Filter projects by search
  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
    p.companyName?.toLowerCase().includes(projectSearch.toLowerCase())
  )

  const handleSend = async () => {
    if ((!inputValue.trim() && attachedFiles.length === 0) || sending || !selectedSpace) return

    setSending(true)

    if (attachedFiles.length > 0) {
      // Send with attachments via FormData
      const normalizedSpaceId = selectedSpace.id.startsWith('spaces/')
        ? selectedSpace.id : `spaces/${selectedSpace.id}`
      const formData = new FormData()
      formData.append('spaceId', normalizedSpaceId)
      if (inputValue.trim()) formData.append('text', inputValue.trim())
      attachedFiles.forEach(f => formData.append('files', f))

      try {
        const res = await fetch('/api/google/chat', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (!data.error && !data.needsAuth) {
          setInputValue("")
          setAttachedFiles([])
          if (textareaRef.current) textareaRef.current.style.height = 'auto'
          // Refresh messages
          const { fetchMessages } = await import('@/hooks/useChatSpaces').then(() => ({}))
          // Simple refresh via selectSpace re-trigger
          selectSpace(selectedSpace)
        }
      } catch (err) {
        console.error('Failed to send with attachment:', err)
      }
    } else {
      const success = await sendMessage(inputValue)
      if (success) {
        setInputValue("")
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
      }
    }

    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setAttachedFiles(prev => [...prev, ...files])
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileIcon = (file) => {
    if (file.type?.startsWith('image/')) return ImageIcon
    return FileText
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // Sort messages chronologically (oldest first, newest at bottom)
  const sortedMessages = [...messages].sort((a, b) =>
    new Date(a.createTime).getTime() - new Date(b.createTime).getTime()
  )

  // Auto-resize textarea
  const handleInputChange = (e) => {
    setInputValue(e.target.value)
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px'
    }
  }

  // Sort all spaces by last activity (most recent first)
  const allSpaces = [...spaces].sort((a, b) => {
    const aTime = a.lastMessage?.createTime || a.lastActiveTime || a.lastMessageTime || ''
    const bTime = b.lastMessage?.createTime || b.lastActiveTime || b.lastMessageTime || ''
    return bTime.localeCompare(aTime)
  })

  const filteredSpaces = allSpaces.filter(s =>
    !searchQuery || s.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const rooms = spaces.filter(s => s.type === 'ROOM')
  const dms = spaces.filter(s => s.type === 'DM' || s.type === 'GROUP_DM' || s.type === 'DIRECT_MESSAGE')

  const filteredRooms = rooms.filter(s =>
    !searchQuery || s.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredDms = dms.filter(s =>
    !searchQuery || s.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* Left Sidebar - Spaces List */}
      <div className="w-72 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Chat</h2>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && user && (
                <button
                  onClick={disconnect}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors text-foreground-secondary hover:text-destructive"
                  title="Disconnect"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={refresh}
                disabled={loading || !isConnected}
                className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-foreground-secondary ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search spaces..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {authLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : !isConnected ? (
            <div className="p-4 text-center">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-foreground-secondary" />
              </div>
              <h3 className="text-sm font-medium text-foreground mb-2">Connect Google Chat</h3>
              <p className="text-xs text-foreground-secondary mb-3">Connect your Google account to access Chat</p>
              <a
                href={authUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                <img src="/images/google.svg" alt="" className="w-3.5 h-3.5" />
                Connect
              </a>
            </div>
          ) : loading && spaces.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <>
              {filteredRooms.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-medium text-foreground-secondary uppercase tracking-wide">
                    Spaces
                  </div>
                  {filteredRooms.map((space) => (
                    <button
                      key={space.id}
                      onClick={() => selectSpace(space)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        selectedSpace?.id === space.id
                          ? 'bg-primary/10 text-foreground'
                          : 'text-foreground-secondary hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 text-left overflow-hidden">
                        <div className="text-sm font-medium truncate">{space.displayName}</div>
                        {space.memberCount > 0 && (
                          <div className="text-xs text-foreground-secondary">
                            {space.memberCount} members
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredDms.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-foreground-secondary uppercase tracking-wide">
                    Direct Messages
                  </div>
                  {filteredDms.map((space) => {
                    const lastMsg = space.lastMessage
                    const lastTime = lastMsg?.createTime || space.lastMessageTime || space.lastActiveTime
                    const isOwnLastMsg = lastMsg?.senderEmail === user?.email
                    const previewText = lastMsg ? (isOwnLastMsg ? `You: ${lastMsg.text}` : lastMsg.text) : ''

                    return (
                      <button
                        key={space.id}
                        onClick={() => selectSpace(space)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          selectedSpace?.id === space.id
                            ? 'bg-primary/10 text-foreground'
                            : 'text-foreground-secondary hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                          {getInitials(space.displayName || 'DM')}
                        </div>
                        <div className="flex-1 text-left overflow-hidden">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-sm font-medium truncate">{space.displayName}</span>
                            {lastTime && (
                              <span className="text-[10px] text-foreground-secondary whitespace-nowrap flex-shrink-0">
                                {formatMessageTime(lastTime)}
                              </span>
                            )}
                          </div>
                          {previewText && (
                            <div className="text-xs text-foreground-secondary truncate mt-0.5">{previewText}</div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {filteredRooms.length === 0 && filteredDms.length === 0 && (
                <div className="p-4 text-center text-foreground-secondary text-sm">
                  No spaces found
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Right Pane - Chat Messages */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedSpace ? (
          <>
            <div className="px-6 py-4 border-b border-border bg-card">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedSpace.type === 'ROOM' ? (
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Hash className="w-5 h-5 text-primary" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                      {getInitials(selectedSpace.displayName || 'DM')}
                    </div>
                  )}
                  <div>
                    <h3 className="font-medium text-foreground">{selectedSpace.displayName}</h3>
                    <p className="text-xs text-foreground-secondary">
                      {selectedSpace.type === 'ROOM'
                        ? `${selectedSpace.memberCount || 0} members`
                        : 'Direct message'}
                    </p>
                  </div>
                </div>

                {/* Log to Project Dropdown */}
                <div className="relative" ref={dropdownRef}>
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
                        : 'bg-secondary/50 hover:bg-secondary text-foreground-secondary hover:text-foreground border border-border/50'
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

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-72 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                      {/* Search */}
                      <div className="p-2 border-b border-border">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                          <input
                            type="text"
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            placeholder="Search projects..."
                            className="w-full pl-8 pr-3 py-1.5 bg-secondary/30 border border-border/50 rounded text-sm placeholder:text-foreground-secondary/50 focus:outline-none focus:border-primary/50"
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Project List */}
                      <div className="max-h-64 overflow-y-auto">
                        {projectsLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-foreground-secondary" />
                          </div>
                        ) : filteredProjects.length === 0 ? (
                          <div className="py-4 text-center text-sm text-foreground-secondary">
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
                                <FolderOpen className="w-4 h-4 text-foreground-secondary flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                                  <p className="text-xs text-foreground-secondary truncate">{project.companyName}</p>
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

            <div className="flex-1 overflow-y-auto p-6">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-foreground-secondary">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-0">
                  {sortedMessages.map((message, index) => {
                    const prev = index > 0 ? sortedMessages[index - 1] : null
                    // Detect own messages by email OR by raw user ID
                    const cookieUserId = document.cookie.match(/google_user_id=([^;]+)/)?.[1]
                    const isOwn = (message.sender.email && message.sender.email === user?.email) ||
                      message.sender.email === 'iwagschal@masterroofingus.com' ||
                      (message.sender.rawId && cookieUserId && message.sender.rawId === `users/${cookieUserId}`)

                    // Date separator check
                    const prevDate = prev ? new Date(prev.createTime).toDateString() : null
                    const currDate = new Date(message.createTime).toDateString()
                    const showDateSep = !prev || prevDate !== currDate

                    // Group messages from same sender within 2 min
                    const senderKey = message.sender?.rawId || message.sender?.email || message.sender?.name
                    const prevSenderKey = prev?.sender?.rawId || prev?.sender?.email || prev?.sender?.name
                    const isGrouped = !showDateSep && prev &&
                      prevSenderKey === senderKey &&
                      (new Date(message.createTime) - new Date(prev.createTime)) < 2 * 60 * 1000

                    // Date label
                    const getDateLabel = () => {
                      const date = new Date(message.createTime)
                      const now = new Date()
                      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                      const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                      const diffDays = Math.round((today - msgDate) / (1000 * 60 * 60 * 24))
                      if (diffDays === 0) return 'Today'
                      if (diffDays === 1) return 'Yesterday'
                      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
                    }

                    const timeOnly = new Date(message.createTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

                    return (
                      <div key={message.id}>
                        {/* Date separator */}
                        {showDateSep && (
                          <div className="flex items-center gap-3 my-4 first:mt-0">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-foreground-secondary font-medium px-2">{getDateLabel()}</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        )}

                        <div className={`group flex gap-3 px-2 py-0.5 rounded transition-colors ${isGrouped ? '' : 'mt-3 pt-1'} ${isOwn ? 'hover:bg-muted/30' : 'bg-muted/20 hover:bg-muted/35 dark:bg-muted/10 dark:hover:bg-muted/20'}`}>
                          {/* Avatar or spacer */}
                          {!isGrouped ? (
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-medium mt-0.5 ${
                              isOwn ? 'bg-primary text-primary-foreground' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'
                            }`}>
                              {getInitials(message.sender.name)}
                            </div>
                          ) : (
                            <div className="w-9 flex-shrink-0 flex items-center justify-center">
                              <span className="text-[10px] text-foreground-secondary/0 group-hover:text-foreground-secondary/60 transition-colors">
                                {timeOnly}
                              </span>
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            {/* Sender name + timestamp header (only on first message in group) */}
                            {!isGrouped && (
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className={`text-sm font-semibold ${isOwn ? 'text-primary' : 'text-foreground'}`}>
                                  {isOwn ? 'You' : message.sender.name}
                                </span>
                                <span className="text-xs text-foreground-secondary">
                                  {timeOnly}
                                </span>
                              </div>
                            )}

                            {/* Quoted message */}
                            {message.quotedMessageMetadata && (
                              <div className="mb-1 max-w-[80%]">
                                <div className="border-l-2 border-foreground-secondary/30 pl-2 py-0.5 text-xs text-foreground-secondary italic">
                                  Quoted message
                                </div>
                              </div>
                            )}

                            {/* Message text — clean, no bubble */}
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">{message.text}</p>

                            {/* Reactions */}
                            {message.emojiReactionSummaries?.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {message.emojiReactionSummaries.map((r, ri) => (
                                  <span key={ri} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted/50 border border-border/50 rounded-full text-xs">
                                    {r.emoji?.unicode} <span className="text-foreground-secondary">{r.reactionCount || 1}</span>
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

            <div className="px-4 py-3 border-t border-border bg-card">
              {/* Attached files preview */}
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachedFiles.map((file, i) => {
                    const Icon = getFileIcon(file)
                    return (
                      <div key={i} className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-sm">
                        <Icon className="w-4 h-4 text-foreground-secondary flex-shrink-0" />
                        <span className="truncate max-w-[150px] text-foreground">{file.name}</span>
                        <span className="text-xs text-foreground-secondary">{formatFileSize(file.size)}</span>
                        <button onClick={() => removeFile(i)} className="p-0.5 hover:bg-muted rounded text-foreground-secondary hover:text-foreground">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="flex items-end gap-2 bg-background border border-input rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-colors">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  className="p-1.5 text-foreground-secondary hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-30 flex-shrink-0"
                  title="Attach file"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedSpace.displayName}...`}
                  disabled={sending}
                  rows={1}
                  className="flex-1 bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-foreground-secondary py-1.5 max-h-40 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={(!inputValue.trim() && attachedFiles.length === 0) || sending}
                  className="p-1.5 text-primary hover:bg-primary/10 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-foreground-secondary/50 mt-1 text-center">Enter to send, Shift+Enter for new line</p>
            </div>
          </>
        ) : !isConnected ? (
          <div className="flex-1 flex items-center justify-center text-foreground-secondary">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                <MessageSquare className="w-10 h-10 text-foreground-secondary" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-3">Connect Google Chat</h3>
              <p className="text-sm mb-4">
                Connect your Google account to access your Google Chat spaces and direct messages.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-500">Google Workspace Required</h4>
                    <p className="text-xs text-yellow-500/80 mt-1">
                      Google Chat API requires a Google Workspace account. Personal Gmail accounts may not have access.
                    </p>
                  </div>
                </div>
              </div>
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
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground-secondary">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a space or direct message to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
