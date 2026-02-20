"use client"

import * as React from "react"

import { useState, useCallback, useEffect, useRef } from "react"
import { useVoiceWebSocket } from "@/hooks/useVoiceWebSocket"
import { useSession } from "next-auth/react"
import { FOLDER_ICONS } from "@/lib/brand-colors"
import { ArrowLeft, Plus, Send } from "lucide-react"

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
  const day = now.getDay()
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const name = firstName || "there"

  if (day === 5) return `Happy Friday, ${name}`
  if (day === 1) return `Happy Monday, ${name}`

  if (hour >= 5 && hour < 12) {
    if (Math.random() > 0.5) return `Happy ${dayNames[day]}, ${name}`
    return `Good Morning, ${name}`
  }
  if (hour >= 12 && hour < 17) {
    if (Math.random() > 0.5) return `Happy ${dayNames[day]}, ${name}`
    return `Good Afternoon, ${name}`
  }
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

  const [screenMode, setScreenMode] = useState("chat")
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [recentFiles, setRecentFiles] = useState({})
  const [loadingFiles, setLoadingFiles] = useState(null)
  const [inputValue, setInputValue] = useState("")
  const iconsRowRef = useRef(null)

  const [greeting, setGreeting] = useState("")
  useEffect(() => {
    setGreeting(getGreeting(firstName))
  }, [firstName])

  const handleCategoryClick = async (key) => {
    if (screenMode === "category" && selectedCategory === key) {
      setScreenMode("chat")
      setSelectedCategory(null)
      return
    }
    setScreenMode("category")
    setSelectedCategory(key)

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

  const handleSubmit = () => {
    const text = inputValue.trim()
    if (!text) return
    setInputValue("")
    onSubmit?.(text)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const activeCat = selectedCategory
    ? CATEGORIES.find(c => c.key === selectedCategory)
    : null

  // Screen border/bg based on mode
  const screenBorderColor = screenMode === "category" && activeCat
    ? activeCat.border
    : "rgba(0,0,0,0.1)"
  const screenBg = screenMode === "category" && activeCat
    ? activeCat.bg
    : "transparent"

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Dynamic Greeting with MR logo stripes */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-end gap-0">
            <img
              src="/images/mr-stripes.svg"
              alt=""
              className="h-[48px] w-auto -mr-1 select-none pointer-events-none"
              draggable={false}
            />
            <h2 className="text-xl font-medium text-foreground text-center text-balance">
              {greeting}
            </h2>
          </div>
        </div>

        {/* 5 Category Icon Buttons — same width as main screen below */}
        <div ref={iconsRowRef} className="flex justify-between mb-4" style={{ width: "100%", maxWidth: "calc(5 * 96px + 4 * 16px)" }}>
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

        {/* ===== MAIN INTERACTION SCREEN =====
            Matches icon row: same width, same border style, same border-radius */}
        <div
          className="transition-all duration-300 overflow-hidden"
          style={{
            /* Match the icon row width — uses the same inline-flex parent width */
            width: "100%",
            maxWidth: "calc(5 * 96px + 4 * 16px)", /* 5 icon boxes (~96px each) + 4 gaps (16px) */
            minHeight: "68px",
            borderRadius: "16px",
            border: `1px solid ${screenBorderColor}`,
            backgroundColor: "transparent",
          }}
        >
          {screenMode === "category" && activeCat ? (
            /* ===== MODE B: CATEGORY FILE BROWSER ===== */
            <div className="flex flex-col">
              {/* Category header — colored bg */}
              <div
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ backgroundColor: activeCat.bg, borderBottom: `1px solid ${activeCat.border}33` }}
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

              {/* File list — neutral white bg */}
              <div className="max-h-[260px] overflow-y-auto py-1 scroll-feed" style={{ backgroundColor: "#fff" }}>
                {loadingFiles === selectedCategory ? (
                  <div className="px-4 py-6 text-center">
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  </div>
                ) : (recentFiles[selectedCategory] || []).length > 0 ? (
                  (recentFiles[selectedCategory] || []).map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleFileClick(file)}
                      className="w-full flex flex-col gap-0.5 px-4 py-2 text-left transition-colors hover:bg-black/[0.04] cursor-pointer"
                    >
                      <span className="text-sm text-foreground truncate hover:underline">
                        {file.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground truncate">
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
                  <div className="px-4 py-6 text-center">
                    <span className="text-xs text-muted-foreground">No recent files</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===== MODE A: CHAT INPUT ===== */
            <div className="flex items-center gap-2 px-3 py-3">
              {/* + button */}
              <button
                onClick={() => onNewConversation?.()}
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                title="New conversation"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Text input */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask KO..."
                className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
              />

              {/* Send button — only visible when there's input */}
              {inputValue.trim() && (
                <button
                  onClick={handleSubmit}
                  className="shrink-0 p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
