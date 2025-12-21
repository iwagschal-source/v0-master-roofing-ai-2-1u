"use client"

import * as React from "react"

import { FileText, BarChart3, Users, Mail, FileJson, File } from "lucide-react"
import { Badge } from "@/components/ui/badge"

/** @typedef {Object} HistoryListProps */

const iconMap = {
  pdf: <FileText className="w-4 h-4" />,
  chart: <BarChart3 className="w-4 h-4" />,
  hubspot: <Users className="w-4 h-4" />,
  powerbi: <BarChart3 className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  document: <FileJson className="w-4 h-4" />,
}

const sourceBadgeColors = {
  "Vertex AI": "bg-blue-500/10 text-blue-400 border-blue-500/30",
  "Power BI": "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  HubSpot: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  "Google Drive": "bg-green-500/10 text-green-400 border-green-500/30",
  "Local File": "bg-gray-500/10 text-gray-400 border-gray-500/30",
}

/**
 * HistoryList props
 * @param {{items:any[], selectedId?:string, onSelectItem:function}} props
 */
export function HistoryList({ items, selectedId, onSelectItem }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[#9b9b9b] text-sm">
            No history items yet. Sources cited by KO will appear here.
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectItem(item)}
              className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-accent ${
                selectedId === item.id ? "border-l-4 border-l-primary bg-accent" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Type Icon */}
                <div className="flex-shrink-0 mt-1 text-[#9b9b9b]">
                  {iconMap[item.type] || <File className="w-4 h-4" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-[#ececec] truncate">{item.label}</p>
                    <Badge variant="outline" className={`text-xs px-2 py-0 ${sourceBadgeColors[item.source] || ""}`}>
                      {item.source}
                    </Badge>
                  </div>
                  {item.preview && <p className="text-xs text-[#9b9b9b] line-clamp-2">{item.preview}</p>}
                  <p className="text-xs text-[#9b9b9b] mt-1">
                    {item.timestamp.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}