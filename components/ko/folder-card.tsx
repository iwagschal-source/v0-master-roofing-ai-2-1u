"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  StatusIcon,
  CATEGORY_CONFIG,
  getFileTag,
  getFileTagColor,
  type CategoryKey,
} from "./folder-status-icon"
import { ActivityFeed, type ActivityEvent } from "./activity-feed"

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

export interface FolderCardProps {
  projectName: string
  clientName: string
  folders: FolderCategory[]
  activityEvents?: ActivityEvent[]
  onFileClick?: (category: CategoryKey, fileName: string) => void
  onClick?: () => void
  onDoubleClickScreen?: () => void
}

const FOLDER_BG = "#faf8f6"
const BORDER_COLOR = "rgba(215,64,58,0.28)"

export function FolderCard({
  projectName,
  clientName,
  folders,
  activityEvents = [],
  onFileClick,
  onClick,
  onDoubleClickScreen,
}: FolderCardProps) {
  const sortedFolders = CATEGORY_ORDER.filter((cat) =>
    folders.some((f) => f.category === cat)
  ).map((cat) => folders.find((f) => f.category === cat)!)

  const [selectedCategory, setSelectedCategory] = useState<CategoryKey | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Get files for the selected category
  const selectedFolder = selectedCategory
    ? folders.find((f) => f.category === selectedCategory)
    : null
  const selectedConfig = selectedCategory
    ? CATEGORY_CONFIG[selectedCategory]
    : null

  // Click away to deselect
  useEffect(() => {
    if (!selectedCategory) return
    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setSelectedCategory(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [selectedCategory])

  const handleIconClick = useCallback((category: CategoryKey) => {
    setSelectedCategory((prev) => (prev === category ? null : category))
  }, [])

  // Determine screen styles based on selected category
  const screenBg = selectedConfig ? selectedConfig.bgLight : "#fff"
  const screenBorder = selectedConfig
    ? `1px solid ${selectedConfig.borderColor}`
    : "1px solid rgba(215, 64, 58, 0.4)"

  return (
    <div ref={cardRef} className="relative group cursor-pointer select-none" onClick={onClick}>
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
          <rect x="7" y="28" width="189" height="4" fill={FOLDER_BG} />
        </svg>

        <div
          className="absolute flex items-center overflow-hidden"
          style={{ top: "2px", bottom: "4px", left: "14px", right: "18px" }}
        >
          <span
            className="text-[12px] font-medium tracking-widest text-[#1a1a1a] font-mono uppercase whitespace-nowrap leading-none group-hover:animate-marquee"
            style={{ display: "inline-block" }}
          >
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
          minHeight: "115px",
        }}
      >
        {/* Left section: client + icons */}
        <div className="flex-1 flex flex-col p-3 pr-1 min-w-0">
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
                  isSelected={selectedCategory === folder.category}
                  onClick={handleIconClick}
                />
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground/60 italic">Click to set up</span>
            )}
          </div>
        </div>

        {/* Right section: mini screen */}
        <div
          className="shrink-0 flex flex-col my-2 mr-2 ml-1 overflow-hidden"
          style={{
            width: "48%",
            background: screenBg,
            border: screenBorder,
            borderRadius: "14px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            transition: "background-color 250ms ease, border-color 250ms ease",
          }}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onDoubleClickScreen?.()
          }}
        >
          {/* Content area — fixed height, scrollbar flush right */}
          <div
            className="flex flex-col gap-1 overflow-y-scroll scroll-feed"
            style={{ height: "100px", paddingLeft: "12px", paddingTop: "12px", paddingBottom: "12px", paddingRight: 0, marginRight: 0 }}
          >
            {selectedCategory && selectedFolder ? (
              /* ===== CATEGORY FILE LIST VIEW ===== */
              <>
                {/* Category header */}
                <div className="flex items-center gap-1.5 mb-1">
                  <img
                    src={selectedConfig!.icon}
                    alt=""
                    width={14}
                    height={14}
                    className="shrink-0"
                    draggable={false}
                  />
                  <span
                    className="text-[10px] font-bold tracking-wider uppercase"
                    style={{ color: selectedConfig!.color }}
                  >
                    {selectedConfig!.label}
                  </span>
                  <span className="text-[9px] text-[#999] ml-auto font-mono">
                    {selectedFolder.files.length}
                  </span>
                </div>

                {/* File list */}
                {selectedFolder.files.length > 0 ? (
                  selectedFolder.files.map((file) => {
                    const tag = getFileTag(file)
                    const tagColor = getFileTagColor(tag)
                    return (
                      <button
                        key={file}
                        onClick={(e) => {
                          e.stopPropagation()
                          onFileClick?.(selectedCategory, file)
                        }}
                        className="flex items-center gap-1.5 py-[3px] text-left transition-colors duration-100 hover:bg-black/[0.04] rounded cursor-pointer px-1 -mx-1"
                      >
                        <span
                          className="shrink-0 text-[7px] font-bold tracking-wider rounded px-1 py-[1px] font-mono leading-none"
                          style={{
                            color: tagColor,
                            backgroundColor: `${tagColor}15`,
                            border: `1px solid ${tagColor}30`,
                          }}
                        >
                          {tag}
                        </span>
                        <span className="text-[10px] text-[#333] truncate hover:underline leading-tight">
                          {file}
                        </span>
                      </button>
                    )
                  })
                ) : (
                  <span className="text-[9px] text-[#999] italic">No files yet</span>
                )}
              </>
            ) : (
              /* ===== DEFAULT: ACTIVITY FEED ===== */
              <ActivityFeed events={activityEvents} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
