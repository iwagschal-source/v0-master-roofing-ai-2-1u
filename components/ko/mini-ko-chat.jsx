"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Bot, ChevronDown, ChevronUp, Send, Loader2, X, Maximize2, Bell, BellOff, Sparkles } from "lucide-react"
import { useWebSocketChat } from "@/hooks/useKOPrimeChat"
import { PhaseTracker } from "./phase-tracker"

// Proactive message types
const PROACTIVE_ALERTS = [
  {
    id: "proposal-reminder",
    type: "reminder",
    title: "Proposal Deadline",
    message: "Beach 67th St proposal review due today. John Mitchell is waiting for approval.",
    action: "Review Now",
    priority: "high"
  },
  {
    id: "meeting-upcoming",
    type: "meeting",
    title: "Meeting in 30 min",
    message: "Project Kickoff with Blue Sky Builders. Have you prepared the site photos?",
    action: "Join Meeting",
    priority: "medium"
  },
  {
    id: "pipeline-insight",
    type: "insight",
    title: "Pipeline Update",
    message: "3 new RFPs received this week. Win rate trending up 5% vs last quarter.",
    action: "View Details",
    priority: "low"
  }
]

export function MiniKOChat({ onMaximize }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState("")
  const [proactiveAlerts, setProactiveAlerts] = useState([])
  const [showAlerts, setShowAlerts] = useState(false)  // Disabled proactive popup alerts
  const [hasUnread, setHasUnread] = useState(false)
  const messagesEndRef = useRef(null)

  const {
    isConnected,
    phases,
    tools,
    streamingText,
    isStreaming,
    isComplete,
    sources,
    sendMessage,
    reset,
  } = useWebSocketChat()

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingText, isOpen])

  // When response completes, add to messages
  useEffect(() => {
    if (isComplete && streamingText) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: streamingText,
          sources,
          timestamp: new Date(),
        }
      ])
      reset()
    }
  }, [isComplete, streamingText, sources, reset])

  // Proactive alerts disabled - uncomment to re-enable
  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     if (proactiveAlerts.length === 0) {
  //       setProactiveAlerts([PROACTIVE_ALERTS[0]])
  //       setHasUnread(true)
  //     }
  //   }, 5000)
  //   return () => clearTimeout(timer)
  // }, [proactiveAlerts])

  // useEffect(() => {
  //   if (proactiveAlerts.length === 1) {
  //     const timer = setTimeout(() => {
  //       setProactiveAlerts(prev => [...prev, PROACTIVE_ALERTS[1]])
  //       if (!isOpen) setHasUnread(true)
  //     }, 30000)
  //     return () => clearTimeout(timer)
  //   }
  // }, [proactiveAlerts, isOpen])

  const handleSubmit = useCallback((e) => {
    e?.preventDefault()
    const text = inputValue.trim()
    if (!text) return

    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }
    ])
    sendMessage(text)
    setInputValue("")
  }, [inputValue, sendMessage])

  const handleOpen = () => {
    setIsOpen(true)
    setHasUnread(false)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsExpanded(false)
  }

  const dismissAlert = (alertId) => {
    setProactiveAlerts(prev => prev.filter(a => a.id !== alertId))
  }

  const handleAlertAction = (alert) => {
    // Add the alert message to chat
    setMessages(prev => [
      ...prev,
      {
        id: `alert-${alert.id}`,
        role: 'assistant',
        content: `${alert.title}: ${alert.message}`,
        isProactive: true,
        timestamp: new Date()
      }
    ])
    dismissAlert(alert.id)
    setIsOpen(true)
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-red-500/50 bg-red-500/10'
      case 'medium': return 'border-yellow-500/50 bg-yellow-500/10'
      default: return 'border-primary/50 bg-primary/10'
    }
  }

  // Floating closed state
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
        {/* Proactive Alert Badges */}
        {showAlerts && proactiveAlerts.slice(0, 2).map((alert, index) => (
          <div
            key={alert.id}
            className={`max-w-xs p-3 rounded-lg border shadow-lg animate-in slide-in-from-right ${getPriorityColor(alert.priority)}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{alert.title}</p>
                <p className="text-xs text-foreground-secondary mt-0.5 line-clamp-2">{alert.message}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleAlertAction(alert)}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    {alert.action}
                  </button>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-xs text-foreground-secondary hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="p-1 hover:bg-muted rounded"
              >
                <X className="w-3 h-3 text-foreground-secondary" />
              </button>
            </div>
          </div>
        ))}

        {/* Main FAB Button */}
        <button
          onClick={handleOpen}
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
        >
          <Bot className="w-6 h-6" />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold animate-pulse">
              {proactiveAlerts.length}
            </span>
          )}
        </button>
      </div>
    )
  }

  // Open chat state
  return (
    <div
      className={`fixed z-50 bg-card border border-border rounded-xl shadow-2xl flex flex-col transition-all duration-300 ${
        isExpanded
          ? 'bottom-4 right-4 left-4 top-20 md:left-auto md:w-[600px] md:top-20'
          : 'bottom-4 right-4 w-96 h-[500px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <Bot size={16} className="text-primary-foreground" />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">KO Assistant</span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-[10px] text-foreground-secondary">
                {isConnected ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            title={showAlerts ? 'Mute alerts' : 'Enable alerts'}
          >
            {showAlerts ? <Bell size={14} className="text-foreground-secondary" /> : <BellOff size={14} className="text-foreground-secondary" />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown size={14} className="text-foreground-secondary" /> : <ChevronUp size={14} className="text-foreground-secondary" />}
          </button>
          {onMaximize && (
            <button
              onClick={onMaximize}
              className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              title="Open full chat"
            >
              <Maximize2 size={14} className="text-foreground-secondary" />
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            title="Close"
          >
            <X size={14} className="text-foreground-secondary" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !isStreaming && (
          <div className="text-center py-8">
            <Bot className="w-10 h-10 mx-auto mb-3 text-primary/50" />
            <p className="text-sm text-foreground-secondary">Ask me anything about your projects, proposals, or data.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                <Bot size={12} className="text-primary-foreground" />
              </div>
            )}
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-md'
                : msg.isProactive
                  ? 'bg-yellow-500/10 border border-yellow-500/30 text-foreground rounded-bl-md'
                  : 'bg-muted text-foreground rounded-bl-md'
            }`}>
              {msg.isProactive && (
                <span className="text-[10px] text-yellow-600 font-medium block mb-1">KO ALERT</span>
              )}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {/* Streaming */}
        {isStreaming && (
          <div className="space-y-2">
            {phases.some(p => p.status === 'active' || p.status === 'complete') && (
              <div className="scale-90 origin-left">
                <PhaseTracker phases={phases} tools={tools} compact />
              </div>
            )}
            {streamingText && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                  <Bot size={12} className="text-primary-foreground" />
                </div>
                <div className="max-w-[85%] px-3 py-2 rounded-xl rounded-bl-md bg-muted text-sm">
                  <p className="whitespace-pre-wrap text-foreground">
                    {streamingText}
                    <span className="inline-block w-1.5 h-3 ml-0.5 bg-primary animate-pulse" />
                  </p>
                </div>
              </div>
            )}
            {!streamingText && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center flex-shrink-0">
                  <Bot size={12} className="text-primary-foreground" />
                </div>
                <div className="px-3 py-2 rounded-xl rounded-bl-md bg-muted">
                  <Loader2 size={14} className="text-primary animate-spin" />
                </div>
              </div>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-border">
        <div className="flex items-center gap-2 bg-muted border border-input rounded-xl px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask KO..."
            disabled={!isConnected || isStreaming}
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-foreground-secondary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || !isConnected || isStreaming}
            className="p-1.5 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground rounded-lg transition-colors"
          >
            {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </form>
    </div>
  )
}
