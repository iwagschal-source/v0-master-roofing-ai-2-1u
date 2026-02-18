"use client"

import { useState, useRef, useCallback } from "react"
import { FOLDER_ICON_COLORS, ICON_FILES } from "@/lib/brand-colors"

export type CategoryKey = "drawings" | "bluebeam" | "takeoff" | "markups" | "proposals"

interface CategoryConfig {
  label: string
  icon: string
  color: string
  bgLight: string
  borderColor: string
}

const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  drawings: {
    label: "Drawings",
    icon: ICON_FILES.drawingsIcon,   // /icons/11.svg — working numbered icon
    color: FOLDER_ICON_COLORS.drawings.primary,
    bgLight: FOLDER_ICON_COLORS.drawings.light,
    borderColor: "#444",
  },
  bluebeam: {
    label: "Bluebeam",
    icon: ICON_FILES.bluebeamIcon,   // /icons/8.svg
    color: FOLDER_ICON_COLORS.bluebeam.primary,
    bgLight: FOLDER_ICON_COLORS.bluebeam.light,
    borderColor: FOLDER_ICON_COLORS.bluebeam.primary,
  },
  takeoff: {
    label: "Takeoff",
    icon: ICON_FILES.takeoffIcon,    // /icons/9.svg
    color: FOLDER_ICON_COLORS.takeoff.primary,
    bgLight: FOLDER_ICON_COLORS.takeoff.light,
    borderColor: "#00aa50",
  },
  markups: {
    label: "Markups",
    icon: ICON_FILES.markupIcon,     // /icons/10.svg
    color: FOLDER_ICON_COLORS.markups.primary,
    bgLight: FOLDER_ICON_COLORS.markups.light,
    borderColor: "#f57c00",
  },
  proposals: {
    label: "Proposals",
    icon: ICON_FILES.proposalIcon,   // /icons/13.svg
    color: FOLDER_ICON_COLORS.proposals.primary,
    bgLight: FOLDER_ICON_COLORS.proposals.light,
    borderColor: "#d7403a",
  },
}

/** Determine file-type icon based on extension */
function getFileIcon(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? ""
  switch (ext) {
    case "pdf":
      return "PDF"
    case "xlsx":
    case "xls":
    case "csv":
      return "XLS"
    case "bfx":
    case "btx":
      return "BTX"
    case "sto":
      return "STO"
    default:
      return "FILE"
  }
}

function getFileIconColor(tag: string): string {
  switch (tag) {
    case "PDF":
      return "#c0352f"
    case "XLS":
      return "#217346"
    case "BTX":
      return "#277ed0"
    case "STO":
      return "#00883e"
    default:
      return "#888"
  }
}

interface StatusIconProps {
  category: CategoryKey
  files: string[]
  onFileClick?: (fileName: string) => void
}

export function StatusIcon({ category, files, onFileClick }: StatusIconProps) {
  const [isOpen, setIsOpen] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const config = CATEGORY_CONFIG[category]

  const handleMouseEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false)
    }, 200)
  }, [])

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Icon badge */}
      <div className="w-[30px] h-[30px] cursor-pointer transition-transform duration-150 hover:scale-110">
        <img
          src={config.icon}
          alt={config.label}
          width={30}
          height={30}
          className="block h-[30px] w-auto mix-blend-multiply"
          draggable={false}
        />
      </div>

      {/* File list popup */}
      {isOpen && files.length > 0 && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-50 min-w-[220px] max-w-[280px] rounded-lg overflow-hidden"
          style={{
            backgroundColor: config.bgLight,
            border: `1.5px solid ${config.borderColor}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{
              borderBottom: `1px solid ${config.borderColor}33`,
            }}
          >
            <img
              src={config.icon}
              alt=""
              width={18}
              height={18}
              className="shrink-0 mix-blend-multiply"
              draggable={false}
            />
            <span
              className="text-[11px] font-bold tracking-wider uppercase"
              style={{ color: config.color }}
            >
              {config.label}
            </span>
            <span className="text-[10px] text-[#999] ml-auto font-mono">
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
          </div>

          {/* File list */}
          <div className="flex flex-col py-1 max-h-[200px] overflow-y-auto scroll-feed">
            {files.map((file) => {
              const tag = getFileIcon(file)
              const tagColor = getFileIconColor(tag)
              return (
                <button
                  key={file}
                  onClick={() => onFileClick?.(file)}
                  className="flex items-center gap-2.5 px-3 py-[6px] text-left transition-colors duration-100 hover:bg-black/[0.04] cursor-pointer group/file"
                >
                  {/* File type tag */}
                  <span
                    className="shrink-0 text-[8px] font-bold tracking-wider rounded px-1 py-[2px] font-mono leading-none"
                    style={{
                      color: tagColor,
                      backgroundColor: `${tagColor}15`,
                      border: `1px solid ${tagColor}30`,
                    }}
                  >
                    {tag}
                  </span>
                  {/* File name */}
                  <span className="text-[12px] text-[#333] truncate group-hover/file:text-[#111] group-hover/file:underline leading-tight">
                    {file}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Arrow pointing down */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-[10px] h-[10px] rotate-45 -mt-[6px]"
            style={{
              backgroundColor: config.bgLight,
              borderRight: `1.5px solid ${config.borderColor}`,
              borderBottom: `1.5px solid ${config.borderColor}`,
            }}
          />
        </div>
      )}
    </div>
  )
}
