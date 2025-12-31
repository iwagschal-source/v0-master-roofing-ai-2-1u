"use client"

import * as React from "react"

import { useState } from "react"
import Image from "next/image"
import { MessageInput } from "./message-input"

/** @typedef {Object} HomeScreenProps */

/** @param {any} props */
/** @param {any} props */
export function HomeScreen({ onSubmit, onStartChat, onNavigateToFiles }) {
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
      //onStartChat()
    }
  }

  const handleMicToggle = () => {
    const newRecordingState = !isRecording
    setIsRecording(newRecordingState)

    if (!newRecordingState) {
      // Stop recording - automatically start chat
      //onStartChat()
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
        <div className="max-w-4xl mx-auto">
          <MessageInput
            onSubmit={onSubmit}
            isRecording={isRecording}
            onMicToggle={handleMicToggle}
            isVoiceEnabled={isVoiceEnabled}
            onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
            isThinking={isRecording}
            placeholder="Ask KO…"
          />
        </div>
      </div>
    </div>
  )
}