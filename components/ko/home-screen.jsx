"use client"

import * as React from "react"

import { useState, useCallback, useEffect, useRef, useMemo } from "react"
import { MessageInput } from "./message-input"
import { VoiceIndicator } from "./voice-indicator"
import { useVoiceWebSocket } from "@/hooks/useVoiceWebSocket"
import { useSession } from "next-auth/react"
import { FOLDER_ICONS, FOLDER_ICON_COLORS } from "@/lib/brand-colors"
import { ArrowLeft } from "lucide-react"

const CATEGORIES = [
  { key: "drawings",  label: "Drawings",  bg: "#f0f0f0", border: "#333333" },
  { key: "bluebeam",  label: "Bluebeam",  bg: "#e8f0fa", border: "#277ed0" },
  { key: "takeoff",   label: "Takeoff",   bg: "#e8f5e9", border: "#00883e" },
  { key: "markups",   label: "Markups",   bg: "#fff3e0", border: "#c96500" },
  { key: "proposals", label: "Proposals", bg: "#fce8e7", border: "#c0352f" },
]

/** Generate a dynamic greeting based on time of day and day of week */
function getGreeting(firstName) {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay() // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const name = firstName || "there"

  // Friday always gets "Happy Friday"
  if (day === 5) return `Happy Friday, ${name}`
  // Monday always gets "Happy Monday"
  if (day === 1) return `Happy Monday, ${name}`

  // Time-based greetings
  if (hour >= 5 && hour < 12) {
    // Morning: sometimes "Good Morning", sometimes "Happy [Day]"
    if (Math.random() > 0.5) return `Happy ${dayNames[day]}, ${name}`
    return `Good Morning, ${name}`
  }
  if (hour >= 12 && hour < 17) {
    if (Math.random() > 0.5) return `Happy ${dayNames[day]}, ${name}`
    return `Good Afternoon, ${name}`
  }
  // Evening / Night
  if (Math.random() > 0.5) return `Happy ${dayNames[day]}, ${name}`
  return `Good Evening, ${name}`
}

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
  messages = [],
}) {
  const { data: session } = useSession()
  const firstName = session?.user?.name?.split(" ")[0] || ""

  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [screenMode, setScreenMode] = useState("chat") // "chat" | "category"
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [recentFiles, setRecentFiles] = useState({})
  const [loadingFiles, setLoadingFiles] = useState(null)

  // Stable greeting — only recompute on mount or when firstName changes
  const [greeting, setGreeting] = useState("")
  useEffect(() => {
    setGreeting(getGreeting(firstName))
  }, [firstName])

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

  const handleCategoryClick = async (key) => {
    if (screenMode === "category" && selectedCategory === key) {
      // Same icon clicked — back to chat
      setScreenMode("chat")
      setSelectedCategory(null)
      return
    }
    setScreenMode("category")
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
    setScreenMode("chat")
    setSelectedCategory(null)
  }

  const handleBackToChat = () => {
    setScreenMode("chat")
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

  // Screen border color based on mode
  const screenBorderColor = screenMode === "category" && activeCat
    ? activeCat.border
    : "rgba(0,0,0,0.08)"
  const screenBg = screenMode === "category" && activeCat
    ? activeCat.bg
    : "#fff"

  return (
    <div className="flex flex-col h-full bg-background">
      <VoiceIndicator
        isRecording={isRecording}
        audioLevel={audioLevel}
        transcript={transcript}
        isTranscribing={isTranscribing}
      />
      <div className="flex-1 flex flex-col items-center px-8 pt-8 pb-4 overflow-hidden">
        {/* Dynamic Greeting */}
        <div className="flex flex-col items-center mb-6">
          <h2 className="text-xl font-medium text-foreground text-center text-balance">
            {greeting}
          </h2>
        </div>

        {/* 5 Category Icon Buttons */}
        <div className="flex flex-wrap justify-center gap-4 max-w-2xl mb-6">
          {CATEGORIES.map((cat) => {
            const isActive = screenMode === "category" && selectedCategory === cat.key
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
        </div>

        {/* ===== MAIN INTERACTION SCREEN ===== */}
        <div
          className="flex-1 w-full max-w-3xl flex flex-col overflow-hidden transition-all duration-300"
          style={{
            borderRadius: "16px",
            border: `1.5px solid ${screenBorderColor}`,
            backgroundColor: screenBg,
            boxShadow: "0 4px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          {screenMode === "category" && activeCat ? (
            /* ===== MODE B: CATEGORY FILE BROWSER ===== */
            <div className="flex flex-col h-full">
              {/* Category header */}
              <div
                className="flex items-center gap-3 px-5 py-3"
                style={{ borderBottom: `1px solid ${activeCat.border}22` }}
              >
                <button
                  onClick={handleBackToChat}
                  className="p-1 rounded-lg hover:bg-black/[0.06] transition-colors"
                  title="Back to Chat"
                >
                  <ArrowLeft className="w-4 h-4 text-foreground" />
                </button>
                <img
                  src={FOLDER_ICONS[activeCat.key]}
                  alt=""
                  width={24}
                  height={24}
                  style={{ mixBlendMode: 'multiply' }}
                  draggable={false}
                />
                <span
                  className="text-sm font-bold tracking-wider uppercase"
                  style={{ color: activeCat.border }}
                >
                  Recent {activeCat.label}
                </span>
              </div>

              {/* File list */}
              <div className="flex-1 overflow-y-auto py-2 scroll-feed">
                {loadingFiles === selectedCategory ? (
                  <div className="px-5 py-8 text-center">
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                ) : (recentFiles[selectedCategory] || []).length > 0 ? (
                  (recentFiles[selectedCategory] || []).map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleFileClick(file)}
                      className="w-full flex flex-col gap-0.5 px-5 py-3 text-left transition-colors hover:bg-black/[0.04] cursor-pointer"
                    >
                      <span className="text-sm text-foreground truncate hover:underline">
                        {file.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground truncate">
                          {file.projectName}
                        </span>
                        {file.modifiedTime && (
                          <span className="text-[10px] text-muted-foreground/60">
                            {new Date(file.modifiedTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center">
                    <span className="text-sm text-muted-foreground">No recent files</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===== MODE A: AGENT CHAT ===== */
            <div className="flex flex-col h-full">
              {/* Chat messages area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 scroll-feed">
                {savedConversations.length > 0 && messages?.length === 0 ? (
                  /* Show recent conversation previews as starting point */
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <img
                      src="/images/logo-light.png"
                      alt="KO"
                      className="w-10 h-10 opacity-20"
                      draggable={false}
                    />
                    <span className="text-sm text-muted-foreground/60">Ask KO anything</span>
                  </div>
                ) : messages?.length > 0 ? (
                  /* Render chat messages */
                  <div className="space-y-3">
                    {messages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-foreground"
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <img
                      src="/images/logo-light.png"
                      alt="KO"
                      className="w-10 h-10 opacity-20"
                      draggable={false}
                    />
                    <span className="text-sm text-muted-foreground/60">Ask KO anything</span>
                  </div>
                )}
              </div>

              {/* Chat input — INSIDE the screen */}
              <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
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
          )}
        </div>
      </div>
    </div>
  )
}
