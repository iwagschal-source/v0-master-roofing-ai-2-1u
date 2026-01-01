"use client"

import { useEffect, useRef, useState } from "react"
import { HomeScreen } from "./home-screen"
import { ConversationPane } from "./conversation-pane"
import { useWebSocketChat } from "@/hooks/useWebSocketChat"
import apiClient from "@/lib/api"

export function ChatShell({ onOpenPowerBICustomView, initialContext, onClearContext, historyItem, activeMode, ...props }) {
  const [view, setView] = useState(activeMode) // "home" | "chat"
  const [messages, setMessages] = useState([])

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
  } = useWebSocketChat()

  const [isThinking, setIsThinking] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)

  const [followUpContext, setFollowUpContext] = useState(null)
  const [contextBanner, setContextBanner] = useState(null)

  const lastUserQuestionRef = useRef("")

  // Handle activeMode changes
  useEffect(() => {
    console.log("ChatShell view:", view, "activeMode:", activeMode)
    if (activeMode === "home") {
      setMessages([])
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

  // Connection status indicator (optional, for debugging)
  const connectionStatus = isConnected ? "connected" : "disconnected"

  return view === "home" ? (
    <HomeScreen
      {...props}
      onSubmit={submit}
    />
  ) : (
    <>
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
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2">
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            Reconnecting to server...
          </p>
        </div>
      )}

      <ConversationPane
        {...props}
        messages={messages}
        isThinking={isThinking}
        onSubmit={submit}
        showReasoning={showReasoning}
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
