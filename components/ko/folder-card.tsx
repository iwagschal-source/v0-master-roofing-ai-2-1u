"use client"

import { useEffect, useRef, useState } from "react"
import { StatusIcon, type CategoryKey } from "./folder-status-icon"

const CATEGORY_ORDER: CategoryKey[] = [
  "drawings",
  "bluebeam",
  "takeoff",
  "markups",
  "proposals",
]

export interface FolderCategory {
  category: CategoryKey
  files: string[]
}

export interface ActivityItem {
  text: string
  time: string
}

export interface FolderCardProps {
  projectName: string
  clientName: string
  folders: FolderCategory[]
  activity?: ActivityItem[]
  lastActivityTime?: string
  onFileClick?: (fileName: string) => void
  onClick?: () => void
}

const FOLDER_BG = "#faf8f6"
const BORDER_COLOR = "rgba(215,64,58,0.28)"

export function FolderCard({
  projectName,
  clientName,
  folders,
  activity = [],
  lastActivityTime = "2h ago",
  onFileClick,
  onClick,
}: FolderCardProps) {
  const sortedFolders = CATEGORY_ORDER.filter((cat) =>
    folders.some((f) => f.category === cat)
  ).map((cat) => folders.find((f) => f.category === cat)!)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [shouldScroll, setShouldScroll] = useState(false)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    setShouldScroll(el.scrollHeight > el.clientHeight)
  }, [activity])

  return (
    <div className="relative group cursor-pointer select-none" onClick={onClick}>
      {/* ===== FOLDER TAB ===== */}
      <div className="relative w-[45%] max-w-[200px]">
        <svg
          viewBox="0 0 200 30"
          className="block w-full h-auto"
          preserveAspectRatio="none"
          style={{ filter: "drop-shadow(0 -1px 1px rgba(0,0,0,0.03))" }}
        >
          <path
            d="M8 30 L8 8 Q8 1 15 1 L165 1 Q170 1 175 8 L195 30 Z"
            fill={FOLDER_BG}
            stroke={BORDER_COLOR}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Cover the bottom edge so it blends into the body */}
          <rect x="7" y="28" width="189" height="4" fill={FOLDER_BG} />
        </svg>

        {/* Project name positioned over the tab SVG */}
        <div className="absolute inset-0 flex items-center px-4 pb-[2px]">
          <span className="text-[12px] font-bold tracking-widest text-[#1a1a1a] font-mono uppercase truncate leading-none">
            {projectName}
          </span>
        </div>
      </div>

      {/* ===== FOLDER BODY ===== */}
      <div
        className="relative -mt-[1px] flex transition-shadow duration-200 group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]"
        style={{
          background: FOLDER_BG,
          border: `1.5px solid ${BORDER_COLOR}`,
          borderRadius: "0 10px 10px 10px",
          minHeight: "140px",
        }}
      >
        {/* Left section: status + client + icons */}
        <div className="flex-1 flex flex-col p-4 pr-2 min-w-0">
          <div className="mb-auto">
            <p className="text-[11px] text-[#777] leading-snug">
              {clientName}
            </p>
          </div>

          {/* Category icon row */}
          <div className="flex items-center gap-[6px] mt-auto pt-3">
            {sortedFolders.length > 0 ? (
              sortedFolders.map((folder) => (
                <StatusIcon
                  key={folder.category}
                  category={folder.category}
                  files={folder.files}
                  onFileClick={onFileClick}
                />
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground/60 italic">Click to set up</span>
            )}
          </div>
        </div>

        {/* Right section: embedded mini "screen" */}
        <div
          className="w-[150px] shrink-0 flex flex-col m-3 ml-0 rounded-md overflow-hidden"
          style={{
            background: "#eae8e5",
            border: "1px solid #d8d4cf",
            boxShadow:
              "inset 0 1px 3px rgba(0,0,0,0.07), inset 0 0 0 0.5px rgba(0,0,0,0.03)",
          }}
        >
          {/* Screen title bar with dots */}
          <div
            className="flex items-center gap-[3px] px-2 py-[3px]"
            style={{
              background: "linear-gradient(to bottom, #e5e2de, #ddd9d5)",
              borderBottom: "1px solid #d0ccc7",
            }}
          >
            <span className="w-[4px] h-[4px] rounded-full bg-[#c9c5c0]" />
            <span className="w-[4px] h-[4px] rounded-full bg-[#c9c5c0]" />
            <span className="w-[4px] h-[4px] rounded-full bg-[#c9c5c0]" />
            <span className="text-[7px] text-[#aaa] ml-auto font-mono uppercase tracking-widest">
              Live
            </span>
          </div>

          {/* Scrollable feed area */}
          <div
            ref={scrollRef}
            className={`flex-1 overflow-y-auto p-2 flex flex-col gap-1.5 min-h-[70px] max-h-[88px] ${
              shouldScroll ? "scroll-feed" : ""
            }`}
          >
            {activity.length > 0 ? (
              activity.map((item, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-[9px] leading-snug text-[#444]">
                    {item.text}
                  </span>
                  <span className="text-[8px] text-[#aaa] mt-px">{item.time}</span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center flex-1">
                <span className="text-[10px] text-[#b0ada8]">No recent activity</span>
              </div>
            )}
          </div>

          {/* Screen footer */}
          <div
            className="px-2 py-[3px] text-center"
            style={{
              background: "linear-gradient(to bottom, #ddd9d5, #e5e2de)",
              borderTop: "1px solid #d0ccc7",
            }}
          >
            <span className="text-[8px] text-[#aaa] font-mono tracking-wide">
              {lastActivityTime}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
