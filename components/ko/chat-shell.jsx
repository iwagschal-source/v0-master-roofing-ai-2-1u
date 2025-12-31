"use client"

import { act, useEffect, useRef, useState } from "react"
import { HomeScreen } from "./home-screen"
import { ConversationPane } from "./conversation-pane"
import { useChat } from "@/hooks/useChat"
import apiClient from "@/lib/api"
import { set } from "zod"

export function ChatShell({ onOpenPowerBICustomView, initialContext, onClearContext, historyItem, activeMode, ...props }) {
  const [view, setView] = useState(activeMode) // "home" | "chat"
  console.log("ChatShell current view:", view)
  const [messages, setMessages] = useState([])

  const { sendMessage, sessionId, response, error, setSessionId, startNewSession } = useChat()
  const [isThinking, setIsThinking] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)

  const [followUpContext, setFollowUpContext] = useState(null)
  const [contextBanner, setContextBanner] = useState(null)

  const lastUserQuestionRef = useRef("")


  useEffect(() => {
    console.log("checking view",view)
    if (activeMode === "home") {
      startNewSession()
      setMessages([])
    }
    setView(activeMode)
  }, [activeMode])

  useEffect(() => {
    const loadSession = async () => {
      setSessionId(historyItem.session_id);
      const session = await apiClient.history.getConversation(historyItem.session_id);
      if (session.messages) {
        setMessages(session.messages.map(msg => ({
          ...msg,
          id: msg.message_id,
          timestamp: new Date(msg.timestamp),
          sources: msg.metadata.sources || [],
          reasoning: msg.metadata.reasoning || null,
        })))
      }
    }
    if (historyItem) {
      loadSession();
    }
  }, [historyItem])

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

  useEffect(() => {
    if (response?.answer) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID?.() ?? String(Date.now() + 1),
          role: "assistant",
          content: response.answer,
          sources: response.sources ?? [],
          reasoning: response.reasoning
            ? [response.reasoning]
            : null,                            // keep your existing UI
          timestamp: new Date(),
        },
      ])

      const pbiTrace = Array.isArray(response.traces)
        ? response.traces.find(
          (t) => t?.tool === "powerbi" && t?.output?.action === "open_custom_view"
        )
        : null

      if (pbiTrace?.output && onOpenPowerBICustomView) {
        onOpenPowerBICustomView(pbiTrace.output, lastUserQuestionRef.current)
      }
    }
    else if (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID?.() ?? String(Date.now() + 1),
          role: "assistant",
          content: error.message,
          timestamp: new Date(),
        },
      ])
    }
  }, [response, error, onOpenPowerBICustomView])

  const submit = async (text) => {

    lastUserQuestionRef.current = text

    // 1) add user message immediately
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        role: "user",
        content: text,
        timestamp: new Date(),
      },
    ])

    // 2) switch view to chat
    setView("chat")

    // 3) fetch assistant response
    setIsThinking(true)
    setShowReasoning(true)

    await sendMessage(
      text,
      followUpContext
        ? {
          previous_visualization: {
            type: followUpContext.type,
            data: followUpContext.chartData,
            original_question: followUpContext.originalQuestion,
          },
        }
        : undefined
    )
    // 4) clear follow-up context after sending
    if (followUpContext) {
      setFollowUpContext(null)
      setContextBanner(null)
      onClearContext?.()
    }
    setShowReasoning(false)
    setIsThinking(false)

  }

  return view === "home" ? (
    <HomeScreen
      {...props}
      onSubmit={submit}              // ✅ same submit function
    />
  ) : (
    <>
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
      <ConversationPane
        {...props}
        messages={messages}            // ✅ conversation renders from parent state
        isThinking={isThinking}
        onSubmit={submit}              // ✅ same submit function
        showReasoning={showReasoning}
      />
    </>

  )
}
