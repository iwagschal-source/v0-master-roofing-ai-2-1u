"use client"

import * as React from "react"

import { useState, useCallback, useEffect } from "react"
import Image from "next/image"
import { MessageInput } from "./message-input"
import { VoiceIndicator } from "./voice-indicator"
import { useVoiceWebSocket } from "@/hooks/useVoiceWebSocket"
import { ConversationList } from "./conversation-list"

/** @typedef {Object} HomeScreenProps */

/** @param {any} props */
/** @param {any} props */
export function HomeScreen({
  onSubmit,
  onStartChat,
  savedConversations = [],
  currentSessionId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onExportConversation,
}) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)

  // Voice WebSocket hook - same as ConversationPane
  const {
    isConnected: isVoiceConnected,
    isRecording,
    audioLevel,
    transcript,
    isTranscribing,
    streamingText: voiceStreamingText,
    isStreaming: isVoiceStreaming,
    isComplete: isVoiceComplete,
    error: voiceError,
    connect: connectVoice,
    startVoice,
    stopVoice,
  } = useVoiceWebSocket()

  // Submit transcript as a message when voice ends
  useEffect(() => {
    if (transcript && !isTranscribing && !isRecording) {
      onSubmit?.(transcript)
    }
  }, [transcript, isTranscribing, isRecording, onSubmit])

  const quickActions = [
    {
      icon: "/images/whatsapp-1.png",
      label: "Messages",
      action: "messages",
    },
    {
      icon: "/images/hubspot-1.png",
      label: "Pipeline",
      action: "hubspot",
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
    // Handle quick action clicks
    //onStartChat()
  }

  const handleMicToggle = useCallback(async () => {
    try {
      if (isRecording) {
        stopVoice()
      } else {
        // Auto-enable voice mode and connect if needed
        if (!isVoiceEnabled) {
          setIsVoiceEnabled(true)
        }
        if (!isVoiceConnected) {
          connectVoice()
          // Wait a bit for connection
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        await startVoice()
      }
    } catch (err) {
      console.error('[Voice] Mic error:', err)
    }
  }, [isRecording, isVoiceEnabled, isVoiceConnected, connectVoice, startVoice, stopVoice])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Voice Recording Indicator */}
      <VoiceIndicator
        isRecording={isRecording}
        audioLevel={audioLevel}
        transcript={transcript}
        isTranscribing={isTranscribing}
      />
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

        {/* Recent Conversations */}
        {savedConversations.length > 0 && (
          <div className="mt-8 w-full max-w-md">
            <div className="bg-card/30 border border-border/50 rounded-xl">
              <ConversationList
                conversations={savedConversations}
                currentSessionId={currentSessionId}
                onSelectConversation={onSelectConversation}
                onNewConversation={onNewConversation}
                onDeleteConversation={onDeleteConversation}
                onExportConversation={onExportConversation}
              />
            </div>
          </div>
        )}
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