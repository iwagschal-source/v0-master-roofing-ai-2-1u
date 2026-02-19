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
  /** Scroll speed in pixels per second (default 20) */
  speed?: number
}

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  gmail:   { bg: "#fce8e7", text: "#c0352f" },
  whatsapp:{ bg: "#e8f5e9", text: "#25d366" },
  zoom:    { bg: "#e3f2fd", text: "#2d8cff" },
  system:  { bg: "#e8eaf6", text: "#5c6bc0" },
  manual:  { bg: "#f5f5f5", text: "#666" },
}

/** Simple markdown -> HTML for small screen context */
function renderMarkdown(md: string): string {
  let html = md
    .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:10px;margin:4px 0 2px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-weight:700;font-size:11px;margin:4px 0 2px">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:8px">&bull; $1</div>')
    .replace(/\n/g, '<br/>')

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

/** Render a single event block */
function EventBlock({ event }: { event: ActivityEvent }) {
  const sourceStyle = SOURCE_COLORS[event.source || ""] || SOURCE_COLORS.manual

  return (
    <div className="flex flex-col gap-1 py-2">
      {/* Headline */}
      <span className="text-[10px] font-semibold leading-snug text-[#222]">
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
          dangerouslySetInnerHTML={{ __html: renderMarkdown(event.body) }}
        />
      )}
    </div>
  )
}

/** Divider between events */
function EventDivider() {
  return (
    <div
      className="w-full"
      style={{ height: "1px", background: "linear-gradient(90deg, transparent, #e0ddd8 30%, #e0ddd8 70%, transparent)" }}
    />
  )
}

export function ActivityFeed({ events, speed = 20 }: ActivityFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number>(0)
  const isPaused = useRef(false)
  const resumeTimer = useRef<NodeJS.Timeout | null>(null)
  const lastFrame = useRef<number>(0)
  const manualScrolling = useRef(false)
  const manualTimer = useRef<NodeJS.Timeout | null>(null)

  // Scroll animation loop
  const animate = useCallback((time: number) => {
    const container = containerRef.current
    const inner = innerRef.current
    if (!container || !inner) {
      animRef.current = requestAnimationFrame(animate)
      return
    }

    if (!isPaused.current && !manualScrolling.current) {
      const dt = lastFrame.current ? (time - lastFrame.current) / 1000 : 0
      const delta = speed * Math.min(dt, 0.1) // cap to avoid jumps on tab-switch

      container.scrollTop += delta

      // Seamless loop: content is duplicated, so when we scroll past the first copy, jump back
      const halfHeight = inner.scrollHeight / 2
      if (halfHeight > 0 && container.scrollTop >= halfHeight) {
        container.scrollTop -= halfHeight
      }
    }

    lastFrame.current = time
    animRef.current = requestAnimationFrame(animate)
  }, [speed])

  useEffect(() => {
    if (events.length === 0) return
    animRef.current = requestAnimationFrame(animate)
    return () => {
      cancelAnimationFrame(animRef.current)
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
      if (manualTimer.current) clearTimeout(manualTimer.current)
    }
  }, [events.length, animate])

  // Hover: pause / resume after 2s
  const handleMouseEnter = useCallback(() => {
    isPaused.current = true
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
  }, [])

  const handleMouseLeave = useCallback(() => {
    resumeTimer.current = setTimeout(() => {
      isPaused.current = false
      lastFrame.current = 0 // reset dt to avoid jump
    }, 2000)
  }, [])

  // Manual scroll detection: pause auto-scroll, resume after 2s of inactivity
  const handleScroll = useCallback(() => {
    if (isPaused.current) return // hovering, ignore
    manualScrolling.current = true
    if (manualTimer.current) clearTimeout(manualTimer.current)
    manualTimer.current = setTimeout(() => {
      manualScrolling.current = false
      lastFrame.current = 0
    }, 2000)
  }, [])

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1">
        <span className="text-[10px] text-[#b0ada8]">No recent activity</span>
      </div>
    )
  }

  // Render events twice for seamless infinite scroll
  const renderEvents = () =>
    events.map((event, i) => (
      <div key={event.id + "-" + i}>
        <EventBlock event={event} />
        {i < events.length - 1 && <EventDivider />}
      </div>
    ))

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scroll-feed"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onScroll={handleScroll}
      style={{ scrollbarGutter: "stable" }}
    >
      <div ref={innerRef}>
        {/* First copy */}
        {renderEvents()}
        {/* Spacer between copies */}
        <div style={{ height: "20px" }} />
        <EventDivider />
        <div style={{ height: "20px" }} />
        {/* Second copy for seamless loop */}
        {renderEvents()}
      </div>
    </div>
  )
}
