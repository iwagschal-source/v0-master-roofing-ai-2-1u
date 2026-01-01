"use client"

import { useState, useEffect, useRef } from "react"
import { ChatMessage } from "./chat-message"
import { HistoryList } from "./history-list"
import { ReasoningIndicator } from "./reasoning-indicator"
import { MessageInput } from "./message-input"
import { PhaseTracker } from "./phase-tracker"
import { StreamingResponse } from "./streaming-response"

/** @typedef {Object} ConversationPaneProps */

/** @param {any} props */
/** @param {any} props */
export function ConversationPane({
  messages,
  onSubmit,
  isThinking,
  activeMode,
  onExpandStage,
  onKoStateChange,
  showReasoning,
  // New streaming props
  phases = [],
  tools = [],
  currentPhase = null,
  streamingText = "",
  isStreaming = false,
  isStreamingComplete = false,
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [koState, setKoState] = useState("idle")
  const bottomRef = useRef(null)

  // Auto-scroll when messages change or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  const handleMicToggle = () => {
    const newRecordingState = !isRecording
    setIsRecording(newRecordingState)

    if (newRecordingState) {
      // Start recording - set listening state
      setKoState("listening")
      onKoStateChange?.("listening")
    } else {
      // Stop recording - automatically send message
      setKoState("thinking")
      onKoStateChange?.("thinking")

      setTimeout(() => {
        setKoState("speaking")
        onKoStateChange?.("speaking")
        onExpandStage?.()

        setTimeout(() => {
          setKoState("idle")
          onKoStateChange?.("idle")
        }, 2000)
      }, 1500)
    }
  }

  const handleSourceClick = (itemId) => {
    // Source click handling
  }

  // Check if we should show streaming UI
  const showStreamingUI = isStreaming || (phases.some(p => p.status === 'active' || p.status === 'complete') && !isStreamingComplete)

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Existing messages */}
        {messages.map((message) => (
          <div key={message.id}>
            <ChatMessage message={message} onSourceClick={handleSourceClick} />
            {message.role === "assistant" && message.reasoning && (
              <ReasoningIndicator reasoning={message.reasoning} isActive={false} />
            )}
          </div>
        ))}

        {/* Streaming Progress UI */}
        {showStreamingUI && (
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-3">
              {/* Phase Tracker */}
              <PhaseTracker
                phases={phases}
                tools={tools}
                currentPhase={currentPhase}
              />

              {/* Streaming Response Text */}
              {streamingText && (
                <StreamingResponse
                  text={streamingText}
                  isStreaming={isStreaming && currentPhase === 'response'}
                  isComplete={isStreamingComplete}
                />
              )}
            </div>
          </div>
        )}

        {/* Legacy reasoning indicator (fallback) */}
        {showReasoning && isThinking && !showStreamingUI && (
          <div className="flex justify-start">
            <div className="max-w-[80%]">
              <ReasoningIndicator isActive={true} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-border">
        <MessageInput
          onSubmit={onSubmit}
          isRecording={isRecording}
          onMicToggle={handleMicToggle}
          isVoiceEnabled={isVoiceEnabled}
          onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
          isThinking={isStreaming || isRecording || koState === "thinking" || koState === "speaking"}
          placeholder="Ask KO…"
          disabled={isStreaming}
        />
      </div>
    </div>
  )
}
