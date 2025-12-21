"use client"

import * as React from "react"

import { useState } from "react"
import Image from "next/image"
import { Paperclip, Mic, Send } from "lucide-react"
import { ThinkingIndicator } from "./thinking-indicator"
import { VoiceToggle } from "./voice-toggle"

/** @typedef {Object} HomeScreenProps */

/** @param {any} props */
/** @param {any} props */
export function HomeScreen({ onStartChat, onNavigateToFiles }) {
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)

  const quickActions = [
    {
      icon: "/images/whatsapp-1.png",
      label: "Messages",
      action: "messages",
    },
    {
      icon: "/images/new-power-bi-logo-svg.png",
      label: "Reports",
      action: "powerbi",
    },
    {
      icon: "/images/hubspot-1.png",
      label: "Pipeline",
      action: "hubspot",
    },
    {
      icon: "/images/folder.png",
      label: "Documents",
      action: "files",
    },
    {
      icon: "/images/icons8-email-apple-sf-regular-96.png",
      label: "Emails",
      action: "email",
    },
    {
      icon: "/images/zoom.png",
      label: "Zoom",
      action: "zoom",
    },
  ]

  const handleActionClick = (action) => {
    if (action === "files") {
      onNavigateToFiles()
    } else {
      onStartChat()
    }
  }

  const handleSend = () => {
    if (inputValue.trim()) {
      onStartChat()
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

    if (!newRecordingState) {
      // Stop recording - automatically start chat
      onStartChat()
    }
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Main content area */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Centered Welcome Section */}
        <div className="flex flex-col items-center mb-12">
          <h2 className="text-xl font-medium text-foreground text-center text-balance">
            What impact will you drive today?
          </h2>
        </div>

        {/* Small ChatGPT-style pill buttons with colored icons */}
        <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleActionClick(action.action)}
              className="flex items-center gap-2 px-4 py-2.5 bg-card/40 border border-input/40 rounded-full hover:bg-card/60 hover:border-input/60 hover:shadow-md transition-all duration-200"
            >
              <Image
                src={action.icon || "/placeholder.svg"}
                alt={action.label}
                width={20}
                height={20}
                className="object-contain"
              />
              <span className="text-sm text-foreground">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-input shadow-sm max-w-4xl mx-auto">
          {/* Attachment Button */}
          <button
            className="text-foreground-secondary hover:text-foreground transition-colors"
            aria-label="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Thinking Indicator */}
          <ThinkingIndicator isActive={isRecording} />

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