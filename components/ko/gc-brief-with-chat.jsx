"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { GripHorizontal, Send, Loader2, Bot, Sparkles } from "lucide-react"
import { GCBrief } from "./gc-brief"

/**
 * GC Brief with integrated chat - horizontal split with draggable divider
 */
export function GCBriefWithChat({ gcName, projectName, className }) {
  const [chatHeight, setChatHeight] = useState(280)
  const [isDragging, setIsDragging] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef(null)
  const messagesEndRef = useRef(null)
  const startYRef = useRef(0)
  const startHeightRef = useRef(0)

  const minChatHeight = 150
  const maxChatHeight = 500

  // Suggested questions
  const suggestions = [
    "What's their typical VE?",
    "Preferred coping material?",
    "Any payment issues?",
    "Best pricing strategy?",
  ]

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    startYRef.current = e.clientY
    startHeightRef.current = chatHeight
  }, [chatHeight])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    const delta = startYRef.current - e.clientY
    const newHeight = Math.min(maxChatHeight, Math.max(minChatHeight, startHeightRef.current + delta))
    setChatHeight(newHeight)
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'row-resize'
      document.body.style.userSelect = 'none'
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    try {
      // Call the estimator assistant API
      const response = await fetch('/api/ko/estimator-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          gcName: gcName,
          projectName: projectName,
          history: messages.slice(-6) // Last 6 messages for context
        })
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (error) {
      console.error('Chat error:', error)
      // Fallback response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Based on the data for ${gcName}, I can help answer questions about their pricing history, bundling preferences, negotiation patterns, and more. What would you like to know?`
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestion = (suggestion) => {
    setInput(suggestion)
  }

  return (
    <div ref={containerRef} className={cn("flex flex-col h-full overflow-hidden", className)}>
      {/* GC Brief - Top Section (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <GCBrief
          gcName={gcName}
          projectName={projectName}
          className="border-0 rounded-none"
        />
      </div>

      {/* Draggable Divider */}
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          "h-1.5 flex-shrink-0 bg-border hover:bg-primary/50 cursor-row-resize transition-colors relative group flex items-center justify-center",
          isDragging && "bg-primary"
        )}
      >
        <div className="absolute -top-2 -bottom-2 left-0 right-0" />
        <GripHorizontal className="w-6 h-4 text-foreground-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Chat Section - Bottom */}
      <div
        style={{ height: chatHeight }}
        className="flex-shrink-0 flex flex-col bg-background border-t border-border"
      >
        {/* Chat Header */}
        <div className="px-4 py-2 border-b border-border bg-primary/5 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">Estimator Assistant</span>
          <span className="text-xs text-foreground-tertiary">• Ask about {gcName}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-4">
              <Bot className="w-8 h-8 mx-auto mb-2 text-foreground-tertiary opacity-50" />
              <p className="text-sm text-foreground-tertiary mb-3">
                Ask me anything about {gcName}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestion(s)}
                    className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 text-foreground rounded-full transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-2",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] px-3 py-2 rounded-lg text-sm",
                      msg.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 items-center">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <Loader2 className="w-3 h-3 text-primary animate-spin" />
                  </div>
                  <div className="bg-secondary px-3 py-2 rounded-lg">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-foreground-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-foreground-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-foreground-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="px-3 py-2 border-t border-border bg-card/50">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`Ask about ${gcName}...`}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
