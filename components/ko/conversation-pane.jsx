"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChatMessage } from "./chat-message"
import { HistoryList } from "./history-list"
import { ReasoningIndicator } from "./reasoning-indicator"
import { MessageInput } from "./message-input"
import { PhaseTracker } from "./phase-tracker"
import { StreamingResponse } from "./streaming-response"
import { VoiceIndicator } from "./voice-indicator"
import { useVoiceWebSocket } from "@/hooks/useVoiceWebSocket"

/** @typedef {Object} ConversationPaneProps */

/** @param {any} props */
/** @param {any} props */
export function ConversationPane({
  messages,
  onSubmit,
  onSubmitWithFiles,
  isThinking,
  activeMode,
  onExpandStage,
  onKoStateChange,
  showReasoning,
  onSourceClick,
  onDocumentClick,
  // New streaming props
  phases = [],
  tools = [],
  currentPhase = null,
  streamingText = "",
  isStreaming = false,
  isStreamingComplete = false,
}) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [koState, setKoState] = useState("idle")
  const bottomRef = useRef(null)

  // Voice WebSocket hook
  const {
    isConnected: isVoiceConnected,
    isRecording,
    audioLevel,
    transcript,
    isTranscribing,
    phases: voicePhases,
    currentPhase: voiceCurrentPhase,
    streamingText: voiceStreamingText,
    isStreaming: isVoiceStreaming,
    isComplete: isVoiceComplete,
    error: voiceError,
    connect: connectVoice,
    startVoice,
    stopVoice,
  } = useVoiceWebSocket()

  // Connect to voice WebSocket when voice is enabled
  useEffect(() => {
    if (isVoiceEnabled && !isVoiceConnected) {
      connectVoice()
    }
  }, [isVoiceEnabled, isVoiceConnected, connectVoice])

  // Auto-scroll when messages change or streaming updates
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText, voiceStreamingText])

  // Spacebar push-to-talk
  useEffect(() => {
    if (!isVoiceEnabled) return

    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      // Ignore if already recording or key repeat
      if (e.code === 'Space' && !e.repeat && !isRecording) {
        e.preventDefault()
        setKoState("listening")
        onKoStateChange?.("listening")
        startVoice()
      }
    }

    const handleKeyUp = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.code === 'Space' && isRecording) {
        e.preventDefault()
        setKoState("thinking")
        onKoStateChange?.("thinking")
        stopVoice()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isVoiceEnabled, isRecording, startVoice, stopVoice, onKoStateChange])

  // Update KO state based on voice streaming
  useEffect(() => {
    if (isVoiceStreaming) {
      setKoState("speaking")
      onKoStateChange?.("speaking")
    } else if (isVoiceComplete) {
      setKoState("idle")
      onKoStateChange?.("idle")
    }
  }, [isVoiceStreaming, isVoiceComplete, onKoStateChange])

  const handleMicToggle = useCallback(async () => {
    console.log('[MIC] Toggle clicked, isRecording:', isRecording)
    try {
      if (isRecording) {
        setKoState("thinking")
        onKoStateChange?.("thinking")
        stopVoice()
      } else {
        // Auto-enable voice mode and connect if needed
        if (!isVoiceEnabled) {
          setIsVoiceEnabled(true)
        }
        if (!isVoiceConnected) {
          console.log('[MIC] Connecting to voice WebSocket...')
          connectVoice()
          // Wait a bit for connection
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        console.log('[MIC] Starting voice recording...')
        setKoState("listening")
        onKoStateChange?.("listening")
        await startVoice()
        console.log('[MIC] Voice recording started')
      }
    } catch (err) {
      console.error('[MIC] Error:', err)
      alert('Mic error: ' + (err?.message || err))
    }
  }, [isRecording, isVoiceEnabled, isVoiceConnected, connectVoice, startVoice, stopVoice, onKoStateChange])

  
  // Check if we should show streaming UI (text or voice)
  const showStreamingUI = isStreaming || isVoiceStreaming ||
    (phases.some(p => p.status === 'active' || p.status === 'complete') && !isStreamingComplete) ||
    (voicePhases.some(p => p.status === 'active' || p.status === 'complete') && !isVoiceComplete)

  // Merge phases - prefer voice phases if voice streaming
  const displayPhases = isVoiceStreaming ? voicePhases : phases
  const displayCurrentPhase = isVoiceStreaming ? voiceCurrentPhase : currentPhase
  const displayStreamingText = isVoiceStreaming ? voiceStreamingText : streamingText
  const displayIsComplete = isVoiceStreaming ? isVoiceComplete : isStreamingComplete

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Voice Recording Indicator */}
      <VoiceIndicator
        isRecording={isRecording}
        audioLevel={audioLevel}
        transcript={transcript}
        isTranscribing={isTranscribing}
      />
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Existing messages */}
        {messages.map((message) => (
          <div key={message.id}>
            <ChatMessage message={message} onSourceClick={onSourceClick} onDocumentClick={onDocumentClick} />
            {message.role === "assistant" && message.reasoning && (
              <ReasoningIndicator reasoning={message.reasoning} isActive={false} />
            )}
          </div>
        ))}

        {/* Voice transcript as user message - show when we have a transcript and voice is processing */}
        {transcript && (isTranscribing || isVoiceStreaming || voicePhases.some(p => p.status === 'active' || p.status === 'complete') || voiceStreamingText) && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-lg px-4 py-3 bg-primary text-primary-foreground">
              <p className="text-sm leading-relaxed">{transcript}</p>
              <p className="text-xs opacity-70 mt-2">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        )}

        {/* Streaming Progress UI */}
        {showStreamingUI && (
          <div className="flex justify-start">
            <div className="max-w-[85%] space-y-3">
              {/* Phase Tracker */}
              <PhaseTracker
                phases={displayPhases}
                tools={tools}
                currentPhase={displayCurrentPhase}
              />

              {/* Streaming Response Text */}
              {displayStreamingText && (
                <StreamingResponse
                  text={displayStreamingText}
                  isStreaming={(isStreaming || isVoiceStreaming) && displayCurrentPhase === 'response'}
                  isComplete={displayIsComplete}
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
          onSubmitWithFiles={onSubmitWithFiles}
          isRecording={isRecording}
          onMicToggle={handleMicToggle}
          isVoiceEnabled={isVoiceEnabled}
          onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
          isThinking={isStreaming || isVoiceStreaming || isRecording || koState === "thinking" || koState === "speaking"}
          placeholder={isVoiceEnabled ? "Ask KO… (or hold Spacebar to talk)" : "Ask KO…"}
          disabled={isStreaming || isVoiceStreaming}
        />
        {/* Voice hint when enabled */}
        {isVoiceEnabled && !isRecording && !isVoiceStreaming && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Hold <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Space</kbd> to talk
          </p>
        )}
      </div>
    </div>
  )
}
