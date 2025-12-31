"use client"

import { useState, useEffect, useRef } from "react"
import { ChatMessage } from "./chat-message"
import { HistoryList } from "./history-list"
import { ReasoningIndicator } from "./reasoning-indicator"
import { MessageInput } from "./message-input"

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
  // historyItems,
  // onSelectHistoryItem,
//  selectedHistoryId,
  showReasoning
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [koState, setKoState] = useState("idle")
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
      // setShowReasoning(true)

      setTimeout(() => {
        setKoState("speaking")
        onKoStateChange("speaking")
        onExpandStage()

        setTimeout(() => {
          setKoState("idle")
          onKoStateChange("idle")
          // setShowReasoning(false)
        }, 2000)
      }, 1500)
    }
  }

  const handleSourceClick = (itemId) => {
/*     const item = historyItems.find((h) => h.id === itemId)
    if (item) {
      onSelectHistoryItem(item)
      onExpandStage()
    } */
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

        {showReasoning && isThinking && (
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
          isThinking={isRecording || koState === "thinking" || koState === "speaking"}
          placeholder="Ask KO…"
        />
      </div>
    </div>
  )
}