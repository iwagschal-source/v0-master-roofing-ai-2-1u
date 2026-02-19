"use client"

import * as React from "react"

import { useState, useCallback, useEffect, useRef } from "react"
import { MessageInput } from "./message-input"
import { VoiceIndicator } from "./voice-indicator"
import { useVoiceWebSocket } from "@/hooks/useVoiceWebSocket"
import { ConversationList } from "./conversation-list"
import { FOLDER_ICONS, FOLDER_ICON_COLORS } from "@/lib/brand-colors"

const CATEGORIES = [
  { key: "drawings",  label: "Drawings",  bg: "#f0f0f0", border: "#333333" },
  { key: "bluebeam",  label: "Bluebeam",  bg: "#e8f0fa", border: "#277ed0" },
  { key: "takeoff",   label: "Takeoff",   bg: "#e8f5e9", border: "#00883e" },
  { key: "markups",   label: "Markups",   bg: "#fff3e0", border: "#c96500" },
  { key: "proposals", label: "Proposals", bg: "#fce8e7", border: "#c0352f" },
]

export function HomeScreen({
  onSubmit,
  onStartChat,
  savedConversations = [],
  currentSessionId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onExportConversation,
  onNavigateToProject,
}) {
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [recentFiles, setRecentFiles] = useState({}) // category → files[]
  const [loadingFiles, setLoadingFiles] = useState(null)
  const popupRef = useRef(null)

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

  useEffect(() => {
    if (transcript && !isTranscribing && !isRecording) {
      onSubmit?.(transcript)
    }
  }, [transcript, isTranscribing, isRecording, onSubmit])

  // Click away to close popup
  useEffect(() => {
    if (!selectedCategory) return
    function handleClickOutside(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setSelectedCategory(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [selectedCategory])

  const handleCategoryClick = async (key) => {
    if (selectedCategory === key) {
      setSelectedCategory(null)
      return
    }
    setSelectedCategory(key)

    // Load recent files if not cached
    if (!recentFiles[key]) {
      setLoadingFiles(key)
      try {
        const res = await fetch(`/api/ko/folders/recent/${key}`)
        if (res.ok) {
          const data = await res.json()
          setRecentFiles(prev => ({ ...prev, [key]: data.files || [] }))
        }
      } catch (err) {
        console.error('Failed to load recent files:', err)
      } finally {
        setLoadingFiles(null)
      }
    }
  }

  const handleFileClick = (file) => {
    onNavigateToProject?.({
      id: file.projectId,
      name: file.projectName,
      folder: selectedCategory,
      fileName: file.name,
    })
    setSelectedCategory(null)
  }

  const handleMicToggle = useCallback(async () => {
    try {
      if (isRecording) {
        stopVoice()
      } else {
        if (!isVoiceEnabled) {
          setIsVoiceEnabled(true)
        }
        if (!isVoiceConnected) {
          connectVoice()
          await new Promise(resolve => setTimeout(resolve, 500))
        }
        await startVoice()
      }
    } catch (err) {
      console.error('[Voice] Mic error:', err)
    }
  }, [isRecording, isVoiceEnabled, isVoiceConnected, connectVoice, startVoice, stopVoice])

  const activeCat = selectedCategory
    ? CATEGORIES.find(c => c.key === selectedCategory)
    : null

  return (
    <div className="flex flex-col h-full bg-background">
      <VoiceIndicator
        isRecording={isRecording}
        audioLevel={audioLevel}
        transcript={transcript}
        isTranscribing={isTranscribing}
      />
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="flex flex-col items-center mb-12">
          <h2 className="text-xl font-medium text-foreground text-center text-balance">
            What impact will you drive today?
          </h2>
        </div>

        {/* 5 Category Icon Buttons */}
        <div className="relative flex flex-wrap justify-center gap-4 max-w-2xl" ref={popupRef}>
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => handleCategoryClick(cat.key)}
                className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border transition-all duration-200 hover:shadow-md hover:scale-105"
                style={{
                  backgroundColor: isActive ? cat.bg : "transparent",
                  borderColor: isActive ? cat.border : "rgba(0,0,0,0.1)",
                  boxShadow: isActive ? `0 0 0 2px ${cat.border}40` : "none",
                }}
              >
                <img
                  src={FOLDER_ICONS[cat.key]}
                  alt={cat.label}
                  width={32}
                  height={32}
                  className="block"
                  style={{ mixBlendMode: 'multiply' }}
                  draggable={false}
                />
                <span className="text-[11px] font-medium text-foreground tracking-wide">
                  {cat.label}
                </span>
              </button>
            )
          })}

          {/* Recent Files Popup */}
          {selectedCategory && activeCat && (
            <div
              className="absolute top-full mt-3 left-1/2 -translate-x-1/2 z-50 w-[320px] rounded-xl overflow-hidden"
              style={{
                backgroundColor: activeCat.bg,
                border: `1.5px solid ${activeCat.border}`,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2 px-4 py-2.5"
                style={{ borderBottom: `1px solid ${activeCat.border}33` }}
              >
                <img
                  src={FOLDER_ICONS[activeCat.key]}
                  alt=""
                  width={20}
                  height={20}
                  style={{ mixBlendMode: 'multiply' }}
                  draggable={false}
                />
                <span
                  className="text-xs font-bold tracking-wider uppercase"
                  style={{ color: activeCat.border }}
                >
                  Recent {activeCat.label}
                </span>
              </div>

              {/* File list */}
              <div className="py-1.5">
                {loadingFiles === selectedCategory ? (
                  <div className="px-4 py-3 text-center">
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  </div>
                ) : (recentFiles[selectedCategory] || []).length > 0 ? (
                  recentFiles[selectedCategory].map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleFileClick(file)}
                      className="w-full flex flex-col gap-0.5 px-4 py-2 text-left transition-colors hover:bg-black/[0.04] cursor-pointer"
                    >
                      <span className="text-[13px] text-foreground truncate hover:underline">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {file.projectName}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-center">
                    <span className="text-xs text-muted-foreground">No recent files</span>
                  </div>
                )}
              </div>
            </div>
          )}
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
            placeholder="Ask KO..."
          />
        </div>
      </div>
    </div>
  )
}
