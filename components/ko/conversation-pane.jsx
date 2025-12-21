"use client"

import * as React from "react"
import { useState } from "react"
import { Paperclip, Mic, Send } from "lucide-react"
import { ChatMessage } from "./chat-message"
import { HistoryList } from "./history-list"
import { ThinkingIndicator } from "./thinking-indicator"
import { ReasoningIndicator } from "./reasoning-indicator"
import { VoiceToggle } from "./voice-toggle"
import { HistoryItem } from "@/types/history"

/** @typedef {Object} ConversationPaneProps */

/** @param {any} props */
/** @param {any} props */
export function ConversationPane({
  activeMode,
  onExpandStage,
  onKoStateChange,
  historyItems,
  onSelectHistoryItem,
  selectedHistoryId,
}) {
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [koState, setKoState] = useState("idle")
  const [showReasoning, setShowReasoning] = useState(false)

  // Mock conversation history with source citations
  const messages = [
    {
      id: "1",
      role: "assistant",
      content: "Good morning! I'm KO, your Chief Agent Officer. How can I assist you today?",
      timestamp: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      role: "user",
      content: "What's our Win Rate for the last 30 days?",
      timestamp: new Date(Date.now() - 3000000),
    },
    {
      id: "3",
      role: "assistant",
      content: "I've reviewed the Q3 report and your Win Rate for the last 30 days is 18%.",
      timestamp: new Date(Date.now() - 2900000),
      source: {
        itemId: "q3-2025-report",
        label: "Q3-2025-Report",
      },
      reasoning: [
        "Retrieved Q3-2025-Report from document storage",
        "Parsed sales data for last 30 days",
        "Calculated win rate: 18 wins / 100 opportunities = 18%",
      ],
    },
  ]

  const handleSend = () => {
    if (inputValue.trim()) {
      setKoState("thinking")
      onKoStateChange("thinking")
      setShowReasoning(true)

      setTimeout(() => {
        setKoState("speaking")
        onKoStateChange("speaking")
        onExpandStage()

        setTimeout(() => {
          setKoState("idle")
          onKoStateChange("idle")
          setShowReasoning(false)
        }, 2000)
      }, 1500)

      setInputValue("")
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMicToggle = () => {
    const newRecordingState = !isRecording
    setIsRecording(newRecordingState)

    if (newRecordingState) {
      // Start recording - set listening state
      setKoState("listening")
      onKoStateChange("listening")
    } else {
      // Stop recording - automatically send message
      setKoState("thinking")
      onKoStateChange("thinking")
      setShowReasoning(true)

      setTimeout(() => {
        setKoState("speaking")
        onKoStateChange("speaking")
        onExpandStage()

        setTimeout(() => {
          setKoState("idle")
          onKoStateChange("idle")
          setShowReasoning(false)
        }, 2000)
      }, 1500)
    }
  }

  const handleSourceClick = (itemId) => {
    const item = historyItems.find((h) => h.id === itemId)
    if (item) {
      onSelectHistoryItem(item)
      onExpandStage()
    }
  }

  if (activeMode === "history") {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-medium text-foreground">History</h2>
          <p className="text-xs text-muted-foreground mt-1">All sources cited by KO</p>
        </div>
        <HistoryList items={historyItems} selectedId={selectedHistoryId} onSelectItem={onSelectHistoryItem} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            <ChatMessage message={message} onSourceClick={handleSourceClick} />
            {message.role === "assistant" && message.reasoning && (
              <ReasoningIndicator reasoning={message.reasoning} isActive={false} />
            )}
          </div>
        ))}

        {showReasoning && koState === "thinking" && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <ReasoningIndicator isActive={true} />
            </div>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-input hover:border-input-hover focus-within:border-input-hover transition-colors shadow-sm">
          {/* Attachment Button */}
          <button
            className="text-foreground-secondary hover:text-foreground transition-colors"
            aria-label="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Thinking Indicator */}
          <ThinkingIndicator isActive={isRecording || koState === "thinking" || koState === "speaking"} />

          {/* Text Input */}
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask KO…"
            className="flex-1 bg-transparent outline-none text-foreground placeholder:text-foreground-secondary"
          />

          {/* Voice Toggle */}
          <VoiceToggle isActive={isVoiceEnabled} onToggle={() => setIsVoiceEnabled(!isVoiceEnabled)} />

          {/* Microphone Button */}
          <button
            onClick={handleMicToggle}
            className={`transition-colors ${isRecording ? "text-primary" : "text-foreground-secondary hover:text-foreground"}`}
            aria-label={isRecording ? "Stop recording and send" : "Start recording"}
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}