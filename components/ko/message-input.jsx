"use client"

import { Paperclip, Mic, Send } from "lucide-react"
import { ThinkingIndicator } from "./thinking-indicator"
import { VoiceToggle } from "./voice-toggle"
import { useEffect, useState } from "react"

/** @typedef {Object} MessageInputProps */

/** @param {Object} props */
export function MessageInput({
  onSubmit,
  isRecording = false,
  onMicToggle,
  isVoiceEnabled = false,
  onToggleVoice,
  isThinking = false,
  onAttach,
  placeholder = "Ask KO…",
  disabled = false,
}) {

  const [inputValue, setInputValue] = useState("")

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      console.log("Enter pressed")
      e.preventDefault()
      handleSubmit()
    }
  }

  /* const handleSubmit = () => {
    const text = inputValue.trim()
    if (!text) return

    // 1) render the user message immediately
    const userMessage = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      role: "user",
      content: text,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // 2) trigger any "thinking" UI
    onSend && onSend()

    // 3) call API
    sendMessage(text)

    // 4) clear input
    setInputValue("")
  } */

  const handleSubmit = () => {
    const text = inputValue.trim()
    if (!text) return
    onSubmit?.(text)
    setInputValue("")
  }

  const canSend = !disabled && inputValue && inputValue.trim().length > 0

  return (
    <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-input hover:border-input-hover focus-within:border-input-hover transition-colors shadow-sm">
      {/* Attachment Button */}
      <button
        onClick={() => onAttach && onAttach()}
        className="text-foreground-secondary hover:text-foreground transition-colors"
        aria-label="Attach file"
      >
        <Paperclip className="w-5 h-5" />
      </button>

      {/* Thinking Indicator */}
      <ThinkingIndicator isActive={isThinking} />

      {/* Text Input */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-foreground placeholder:text-foreground-secondary"
      />

      {/* Voice Toggle */}
      <VoiceToggle isActive={isVoiceEnabled} onToggle={onToggleVoice} />

      {/* Microphone Button */}
      <button
        onClick={() => onMicToggle && onMicToggle()}
        className={`transition-colors ${isRecording ? "text-primary" : "text-foreground-secondary hover:text-foreground"}`}
        aria-label={isRecording ? "Stop recording and send" : "Start recording"}
      >
        <Mic className="w-5 h-5" />
      </button>

      {/* Send Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSend}
        className="text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        aria-label="Send message"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  )
}
