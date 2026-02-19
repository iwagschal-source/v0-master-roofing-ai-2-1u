"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export interface ActivityEvent {
  id: string
  headline: string
  body?: string | null
  event_type?: string
  source?: string
  source_user?: string
  priority?: string
  timestamp: string
}

interface ActivityFeedProps {
  events: ActivityEvent[]
  /** Seconds to display each event (default 6) */
  interval?: number
}

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  gmail:   { bg: "#fce8e7", text: "#c0352f" },
  whatsapp:{ bg: "#e8f5e9", text: "#25d366" },
  zoom:    { bg: "#e3f2fd", text: "#2d8cff" },
  system:  { bg: "#e8eaf6", text: "#5c6bc0" },
  manual:  { bg: "#f5f5f5", text: "#666" },
}

/** Simple markdown → HTML for small screen context */
function renderMarkdown(md: string): string {
  let html = md
    // Headers
    .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:10px;margin:4px 0 2px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-weight:700;font-size:11px;margin:4px 0 2px">$1</div>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet lists
    .replace(/^- (.+)$/gm, '<div style="padding-left:8px">• $1</div>')
    // Line breaks
    .replace(/\n/g, '<br/>')

  // Simple table support
  if (html.includes('|')) {
    html = html.replace(
      /(<br\/>)?\|(.+)\|(<br\/>)\|[-| ]+\|(<br\/>)((?:\|.+\|(?:<br\/>)?)+)/g,
      (_match, _br1, headerRow, _br2, _sep, bodyRows) => {
        const headers = headerRow.split('|').map((h: string) => h.trim()).filter(Boolean)
        const rows = bodyRows.split('<br/>').filter((r: string) => r.includes('|'))
        let table = '<table style="font-size:8px;border-collapse:collapse;width:100%;margin:4px 0">'
        table += '<tr>' + headers.map((h: string) => `<th style="text-align:left;padding:1px 4px;border-bottom:1px solid #ddd;font-weight:600">${h}</th>`).join('') + '</tr>'
        for (const row of rows) {
          const cells = row.split('|').map((c: string) => c.trim()).filter(Boolean)
          table += '<tr>' + cells.map((c: string) => `<td style="padding:1px 4px;border-bottom:1px solid #eee">${c}</td>`).join('') + '</tr>'
        }
        table += '</table>'
        return table
      }
    )
  }

  return html
}

/** Relative time display */
function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function ActivityFeed({ events, interval = 6 }: ActivityFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isHovered, setIsHovered] = useState(false)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (events.length <= 1) return

    timerRef.current = setTimeout(() => {
      setFading(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % events.length)
        setFading(false)
      }, 300)
    }, interval * 1000)
  }, [events.length, interval])

  useEffect(() => {
    if (!isHovered && events.length > 1) {
      startTimer()
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentIndex, isHovered, startTimer, events.length])

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1">
        <span className="text-[10px] text-[#b0ada8]">No recent activity</span>
      </div>
    )
  }

  const event = events[currentIndex]
  const sourceStyle = SOURCE_COLORS[event.source || ""] || SOURCE_COLORS.manual

  return (
    <div
      className="flex flex-col gap-1 flex-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        startTimer()
      }}
    >
      <div
        className="flex flex-col gap-1 transition-opacity duration-300"
        style={{ opacity: fading ? 0 : 1 }}
      >
        {/* Headline */}
        <span className="text-[10px] font-semibold leading-snug text-[#222] line-clamp-2">
          {event.headline}
        </span>

        {/* Meta row: source badge + timestamp */}
        <div className="flex items-center gap-1.5">
          {event.source && (
            <span
              className="text-[7px] font-bold uppercase tracking-wider rounded-full px-1.5 py-[1px] leading-none"
              style={{ backgroundColor: sourceStyle.bg, color: sourceStyle.text }}
            >
              {event.source}
            </span>
          )}
          <span className="text-[8px] text-[#aaa]">
            {timeAgo(event.timestamp)}
          </span>
        </div>

        {/* Body (markdown rendered) */}
        {event.body && (
          <div
            className="text-[9px] leading-snug text-[#555] mt-0.5 overflow-hidden"
            style={{ maxHeight: "60px" }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(event.body) }}
          />
        )}
      </div>

      {/* Dot indicators */}
      {events.length > 1 && (
        <div className="flex items-center justify-center gap-1 mt-auto pt-1">
          {events.map((_, i) => (
            <span
              key={i}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === currentIndex ? 6 : 4,
                height: 4,
                backgroundColor: i === currentIndex ? "#d7403a" : "#ddd",
                borderRadius: i === currentIndex ? 2 : "50%",
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
