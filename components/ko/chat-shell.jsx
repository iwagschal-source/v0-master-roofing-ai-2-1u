"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { HomeScreen } from "./home-screen"
import { ConversationPane } from "./conversation-pane"
import { useWebSocketChat } from "@/hooks/useWebSocketChat"
import apiClient from "@/lib/api"
import { Plus, Download } from "lucide-react"
import {
  getConversations,
  getConversation,
  getActiveSessionId,
  setActiveSessionId,
  saveMessages,
  deleteConversation,
  exportConversation,
  downloadExport,
  generateSessionId,
} from "@/lib/chat-storage"

export function ChatShell({ initialContext, onClearContext, historyItem, activeMode, onSourceClick, ...props }) {
  const [view, setView] = useState(activeMode) // "home" | "chat"
  const [messages, setMessages] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [savedConversations, setSavedConversations] = useState([])

  // WebSocket streaming hook
  const {
    isConnected,
    phases,
    currentPhase,
    tools,
    streamingText,
    isStreaming,
    isComplete: isStreamingComplete,
    sources: streamingSources,
    error: wsError,
    sendMessage: wsSendMessage,
    reset: wsReset,
    reconnect: wsReconnect,
  } = useWebSocketChat()

  const [isThinking, setIsThinking] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)

  const [followUpContext, setFollowUpContext] = useState(null)
  const [contextBanner, setContextBanner] = useState(null)

  const lastUserQuestionRef = useRef("")

  // Load saved conversations on mount
  useEffect(() => {
    const loadedConversations = getConversations()
    setSavedConversations(loadedConversations)

    // Check for active session or last session
    const activeId = getActiveSessionId()
    if (activeId) {
      const activeConv = loadedConversations.find(c => c.session_id === activeId)
      if (activeConv && activeConv.messages.length > 0) {
        setCurrentSessionId(activeId)
        setMessages(activeConv.messages)
        setView("chat")
      }
    }
  }, [])

  // Auto-save messages whenever they change
  useEffect(() => {
    if (currentSessionId && messages.length > 0) {
      saveMessages(currentSessionId, messages)
      // Update saved conversations list
      setSavedConversations(getConversations())
    }
  }, [messages, currentSessionId])

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    const newId = generateSessionId()
    setCurrentSessionId(newId)
    setMessages([])
    setActiveSessionId(newId)
    setView("home")
    wsReset()
  }, [wsReset])

  // Load a saved conversation
  const loadConversation = useCallback((sessionId) => {
    const conv = getConversation(sessionId)
    if (conv) {
      setCurrentSessionId(sessionId)
      setMessages(conv.messages)
      setActiveSessionId(sessionId)
      setView("chat")
    }
  }, [])

  // Delete a conversation
  const handleDeleteConversation = useCallback((sessionId) => {
    deleteConversation(sessionId)
    setSavedConversations(getConversations())

    // If we deleted the current conversation, start fresh
    if (sessionId === currentSessionId) {
      startNewConversation()
    }
  }, [currentSessionId, startNewConversation])

  // Export a conversation
  const handleExportConversation = useCallback((sessionId) => {
    const data = exportConversation(sessionId)
    if (data) {
      const filename = `ko-chat-${data.preview?.substring(0, 30).replace(/[^a-z0-9]/gi, '-') || sessionId}.json`
      downloadExport(data, filename)
    }
  }, [])

  // Handle activeMode changes
  useEffect(() => {
    console.log("ChatShell view:", view, "activeMode:", activeMode)
    if (activeMode === "home") {
      // Don't clear messages when going home - they're saved
      // Only reset streaming state
      wsReset()
    }
    setView(activeMode)
  }, [activeMode, wsReset])

  // Load history item
  useEffect(() => {
    const loadSession = async () => {
      try {
        const session = await apiClient.history.getConversation(historyItem.session_id)
        if (session.messages) {
          setMessages(session.messages.map(msg => ({
            ...msg,
            id: msg.message_id,
            timestamp: new Date(msg.timestamp),
            sources: msg.metadata?.sources || [],
            reasoning: msg.metadata?.reasoning || null,
          })))
        }
      } catch (e) {
        console.error("Failed to load session:", e)
      }
    }
    if (historyItem) {
      loadSession()
    }
  }, [historyItem])

  // Handle initial context
  useEffect(() => {
    if (initialContext) {
      setView("chat")
      setFollowUpContext(initialContext)
      setContextBanner({
        message: `Continuing from: ${initialContext.originalQuestion}`,
        chartTitle: initialContext.chartData?.title,
      })
    }
  }, [initialContext])

  // When streaming completes, add the response to messages
  useEffect(() => {
    if (isStreamingComplete && streamingText) {
      console.log("Streaming complete, adding message to history")

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID?.() ?? String(Date.now() + 1),
          role: "assistant",
          content: streamingText,
          sources: streamingSources ?? [],
          reasoning: null,
          timestamp: new Date(),
        },
      ])

      setIsThinking(false)
      setShowReasoning(false)

      // Reset streaming state after adding message
      setTimeout(() => {
        wsReset()
      }, 100)
    }
  }, [isStreamingComplete, streamingText, streamingSources, wsReset])

  // Handle WebSocket errors
  useEffect(() => {
    if (wsError) {
      console.error("WebSocket error:", wsError)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID?.() ?? String(Date.now() + 1),
          role: "assistant",
          content: `Error: ${wsError}`,
          timestamp: new Date(),
        },
      ])
      setIsThinking(false)
      wsReset()
    }
  }, [wsError, wsReset])

  // Submit handler
  const submit = async (text) => {
    if (!text.trim()) return

    lastUserQuestionRef.current = text

    // 0) Ensure we have a session ID
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = generateSessionId()
      setCurrentSessionId(sessionId)
      setActiveSessionId(sessionId)
    }

    // 1) Add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        role: "user",
        content: text,
        timestamp: new Date(),
      },
    ])

    // 2) Switch view to chat
    setView("chat")

    // 3) Start thinking state
    setIsThinking(true)
    setShowReasoning(true)

    // 4) Send via WebSocket
    const context = followUpContext
      ? {
          previous_visualization: {
            type: followUpContext.type,
            data: followUpContext.chartData,
            original_question: followUpContext.originalQuestion,
          },
        }
      : undefined

    wsSendMessage(text, context)

    // 5) Clear follow-up context after sending
    if (followUpContext) {
      setFollowUpContext(null)
      setContextBanner(null)
      onClearContext?.()
    }
  }

  // Submit handler with file attachments
  const submitWithFiles = async (text, files) => {
    if (!text.trim() && files.length === 0) return

    lastUserQuestionRef.current = text

    // 0) Ensure we have a session ID
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = generateSessionId()
      setCurrentSessionId(sessionId)
      setActiveSessionId(sessionId)
    }

    // 1) Upload files to GCS if they have file objects
    let uploadedFiles = []
    const filesToUpload = files.filter(f => f.file)

    if (filesToUpload.length > 0) {
      try {
        const formData = new FormData()
        formData.append('sessionId', sessionId)
        for (const f of filesToUpload) {
          formData.append('files', f.file)
        }

        const uploadResponse = await fetch('/api/ko/chat/upload', {
          method: 'POST',
          body: formData,
        })

        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json()
          uploadedFiles = uploadResult.files || []
        }
      } catch (e) {
        console.error('File upload failed:', e)
      }
    }

    // Merge uploaded info with original file data
    const attachments = files.map((f, idx) => {
      const uploaded = uploadedFiles.find(u => u.name === f.name) || {}
      return {
        id: f.id,
        name: f.name,
        type: f.type,
        size: f.size,
        content: f.content || uploaded.content,
        preview: f.preview || uploaded.preview,
        path: uploaded.path,
        url: uploaded.url,
      }
    })

    // 2) Add user message with attachments
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        role: "user",
        content: text || `Uploaded ${files.length} file(s)`,
        attachments,
        timestamp: new Date(),
      },
    ])

    // 3) Switch view to chat
    setView("chat")

    // 4) Start thinking state
    setIsThinking(true)
    setShowReasoning(true)

    // 5) Build context with file content for the AI
    const fileContext = attachments.map(f => ({
      name: f.name,
      type: f.type,
      content: f.content,
      path: f.path,
    })).filter(f => f.content || f.path)

    const context = {
      ...(followUpContext ? {
        previous_visualization: {
          type: followUpContext.type,
          data: followUpContext.chartData,
          original_question: followUpContext.originalQuestion,
        },
      } : {}),
      attached_files: fileContext,
    }

    // 6) Send via WebSocket with file context
    const messageWithFiles = fileContext.length > 0
      ? `${text}\n\n[Attached files: ${fileContext.map(f => f.name).join(', ')}]\n\nFile contents:\n${fileContext.filter(f => f.content).map(f => `--- ${f.name} ---\n${f.content.substring(0, 5000)}`).join('\n\n')}`
      : text

    wsSendMessage(messageWithFiles, context)

    // 7) Clear follow-up context after sending
    if (followUpContext) {
      setFollowUpContext(null)
      setContextBanner(null)
      onClearContext?.()
    }
  }

  // Handle document link clicks
  const handleDocumentClick = async (path) => {
    if (!path) return

    // For gs:// URLs, fetch a signed URL from the API
    if (path.startsWith('gs://')) {
      try {
        const response = await fetch(`/api/ko/chat/upload?path=${encodeURIComponent(path)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.url) {
            window.open(data.url, '_blank')
            return
          }
        }
      } catch (e) {
        console.error('Failed to get document URL:', e)
      }
    }

    // For http/https URLs, open directly
    if (path.startsWith('http://') || path.startsWith('https://')) {
      window.open(path, '_blank')
      return
    }

    // For local paths, try to fetch through API
    try {
      const response = await fetch(`/api/ko/chat/upload?path=${encodeURIComponent(path)}`)
      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.open(data.url, '_blank')
        }
      }
    } catch (e) {
      console.error('Failed to get document:', e)
    }
  }

  // Connection status indicator (optional, for debugging)
  const connectionStatus = isConnected ? "connected" : "disconnected"

  return view === "home" ? (
    <HomeScreen
      {...props}
      onSubmit={submit}
      messages={messages}
      savedConversations={savedConversations}
      currentSessionId={currentSessionId}
      onSelectConversation={loadConversation}
      onNewConversation={startNewConversation}
      onDeleteConversation={handleDeleteConversation}
      onExportConversation={handleExportConversation}
    />
  ) : (
    <>
      {/* Chat header with New Chat and Export buttons */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div className="text-sm text-foreground-secondary">
          {messages.length > 0 ? `${messages.length} messages` : 'New conversation'}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => currentSessionId && handleExportConversation(currentSessionId)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-secondary/50 hover:bg-secondary text-foreground-secondary hover:text-foreground transition-colors"
            title="Export this conversation"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={startNewConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
            title="Start a new conversation"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      </div>

      {/* Context banner */}
      {contextBanner && (
        <div className="bg-primary/5 border-b border-primary/10 px-4 py-3">
          <p className="text-sm font-medium">{contextBanner.message}</p>
          {contextBanner.chartTitle && (
            <p className="text-xs text-muted-foreground mt-1">
              Analyzing: {contextBanner.chartTitle}
            </p>
          )}
        </div>
      )}

      {/* Connection status (only show when disconnected) */}
      {!isConnected && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-between">
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Disconnected from server
          </p>
          <button
            onClick={wsReconnect}
            className="text-xs px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-700 dark:text-yellow-300 rounded transition-colors"
          >
            Reconnect
          </button>
        </div>
      )}

      <ConversationPane
        {...props}
        messages={messages}
        isThinking={isThinking}
        onSubmit={submit}
        onSubmitWithFiles={submitWithFiles}
        showReasoning={showReasoning}
        onSourceClick={onSourceClick}
        onDocumentClick={handleDocumentClick}
        // Streaming props
        phases={phases}
        tools={tools}
        currentPhase={currentPhase}
        streamingText={streamingText}
        isStreaming={isStreaming}
        isStreamingComplete={isStreamingComplete}
      />
    </>
  )
}
