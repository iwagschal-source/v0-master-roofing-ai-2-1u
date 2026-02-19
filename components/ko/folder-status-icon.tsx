"use client"

import { FOLDER_ICON_COLORS } from "@/lib/brand-colors"

export type CategoryKey = "drawings" | "bluebeam" | "takeoff" | "markups" | "proposals"

interface CategoryConfig {
  label: string
  icon: string
  color: string
  bgLight: string
  borderColor: string
}

export const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  drawings: {
    label: "Drawings",
    icon: "/icons/drawings.png",
    color: FOLDER_ICON_COLORS.drawings.primary,
    bgLight: "#f0f0f0",
    borderColor: "#333333",
  },
  bluebeam: {
    label: "Bluebeam",
    icon: "/icons/bluebeam.png",
    color: FOLDER_ICON_COLORS.bluebeam.primary,
    bgLight: "#e8f0fa",
    borderColor: "#277ed0",
  },
  takeoff: {
    label: "Takeoff",
    icon: "/icons/takeoff.png",
    color: FOLDER_ICON_COLORS.takeoff.primary,
    bgLight: "#e8f5e9",
    borderColor: "#00883e",
  },
  markups: {
    label: "Markups",
    icon: "/icons/markups.png",
    color: FOLDER_ICON_COLORS.markups.primary,
    bgLight: "#fff3e0",
    borderColor: "#c96500",
  },
  proposals: {
    label: "Proposals",
    icon: "/icons/proposals.png",
    color: FOLDER_ICON_COLORS.proposals.primary,
    bgLight: "#fce8e7",
    borderColor: "#c0352f",
  },
}

/** Determine file-type tag based on extension */
export function getFileTag(fileName: string): string {
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
    case "docx":
    case "doc":
      return "DOC"
    default:
      return "FILE"
  }
}

export function getFileTagColor(tag: string): string {
  switch (tag) {
    case "PDF":
      return "#c0352f"
    case "XLS":
      return "#217346"
    case "BTX":
      return "#277ed0"
    case "STO":
      return "#00883e"
    case "DOC":
      return "#2b579a"
    default:
      return "#888"
  }
}

interface StatusIconProps {
  category: CategoryKey
  files: string[]
  isSelected?: boolean
  onClick?: (category: CategoryKey) => void
}

export function StatusIcon({ category, isSelected, onClick }: StatusIconProps) {
  const config = CATEGORY_CONFIG[category]

  return (
    <div
      className="relative cursor-pointer transition-transform duration-150 hover:scale-110"
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(category)
      }}
    >
      <div
        className="w-[24px] h-[24px] rounded-md flex items-center justify-center transition-all duration-200"
        style={{
          boxShadow: isSelected ? `0 0 0 2px ${config.borderColor}` : "none",
        }}
      >
        <img
          src={config.icon}
          alt={config.label}
          width={24}
          height={24}
          className="block w-[24px] h-[24px]"
          draggable={false}
        />
      </div>
    </div>
  )
}
