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
  /** Milliseconds per character (default 25) */
  charDelay?: number
  /** Pause between events in ms (default 1500) */
  pauseBetween?: number
}

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  gmail:   { bg: "#fce8e7", text: "#c0352f" },
  whatsapp:{ bg: "#e8f5e9", text: "#25d366" },
  zoom:    { bg: "#e3f2fd", text: "#2d8cff" },
  system:  { bg: "#e8eaf6", text: "#5c6bc0" },
  manual:  { bg: "#f5f5f5", text: "#666" },
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

/**
 * Build the full text sequence for an event:
 * HEADLINE\n[SOURCE] timestamp\nbody
 */
function buildEventText(event: ActivityEvent): string {
  let text = event.headline
  const meta: string[] = []
  if (event.source) meta.push(`[${event.source.toUpperCase()}]`)
  meta.push(timeAgo(event.timestamp))
  text += "\n" + meta.join(" ")
  if (event.body) {
    text += "\n" + event.body
  }
  return text
}

export function ActivityFeed({
  events,
  charDelay = 25,
  pauseBetween = 1500,
}: ActivityFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [displayedBlocks, setDisplayedBlocks] = useState<
    { eventIndex: number; text: string; done: boolean }[]
  >([])
  const isPaused = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const stateRef = useRef({
    eventIdx: 0,
    charIdx: 0,
    fullText: "",
    phase: "idle" as "streaming" | "pausing" | "idle",
  })

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  // Main streaming engine
  useEffect(() => {
    if (events.length === 0) return

    // Initialize first event
    const s = stateRef.current
    s.eventIdx = 0
    s.charIdx = 0
    s.fullText = buildEventText(events[0])
    s.phase = "streaming"
    setDisplayedBlocks([{ eventIndex: 0, text: "", done: false }])

    const tick = () => {
      if (isPaused.current) return

      const st = stateRef.current

      if (st.phase === "streaming") {
        if (st.charIdx < st.fullText.length) {
          st.charIdx++
          const partial = st.fullText.slice(0, st.charIdx)

          setDisplayedBlocks((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last) {
              updated[updated.length - 1] = { ...last, text: partial }
            }
            return updated
          })

          // Auto-scroll to bottom
          requestAnimationFrame(() => {
            const el = containerRef.current
            if (el) el.scrollTop = el.scrollHeight
          })
        } else {
          // Event done streaming — mark done, start pause
          setDisplayedBlocks((prev) => {
            const updated = [...prev]
            const last = updated[updated.length - 1]
            if (last) updated[updated.length - 1] = { ...last, done: true }
            return updated
          })
          st.phase = "pausing"
          // Pause before next event
          if (timerRef.current) clearInterval(timerRef.current)
          timerRef.current = setTimeout(() => {
            const next = (st.eventIdx + 1) % events.length
            if (next === 0) {
              // Loop: clear screen and restart
              st.eventIdx = 0
              st.charIdx = 0
              st.fullText = buildEventText(events[0])
              st.phase = "streaming"
              setDisplayedBlocks([{ eventIndex: 0, text: "", done: false }])
            } else {
              st.eventIdx = next
              st.charIdx = 0
              st.fullText = buildEventText(events[next])
              st.phase = "streaming"
              setDisplayedBlocks((prev) => [
                ...prev,
                { eventIndex: next, text: "", done: false },
              ])
            }
            // Restart interval
            timerRef.current = setInterval(tick, charDelay)
          }, pauseBetween)
          return
        }
      }
    }

    timerRef.current = setInterval(tick, charDelay)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        clearTimeout(timerRef.current)
      }
    }
  }, [events, charDelay, pauseBetween])

  // Hover pause
  const handleMouseEnter = useCallback(() => {
    isPaused.current = true
  }, [])

  const handleMouseLeave = useCallback(() => {
    isPaused.current = false
  }, [])

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center flex-1">
        <span className="text-[10px] text-[#b0ada8]">No recent activity</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scroll-feed"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ scrollbarGutter: "stable" }}
    >
      {displayedBlocks.map((block, i) => {
        const event = events[block.eventIndex]
        if (!event) return null
        const sourceStyle =
          SOURCE_COLORS[event.source || ""] || SOURCE_COLORS.manual

        // Split the streamed text into lines
        const lines = block.text.split("\n")
        const headlineLine = lines[0] || ""
        const metaLine = lines[1] || ""
        const bodyLines = lines.slice(2).join("\n")

        return (
          <div key={`${block.eventIndex}-${i}`}>
            {i > 0 && (
              <div
                className="w-full my-2"
                style={{
                  height: "1px",
                  background:
                    "linear-gradient(90deg, transparent, #e0ddd8 30%, #e0ddd8 70%, transparent)",
                }}
              />
            )}
            <div className="flex flex-col gap-0.5 py-1">
              {/* Headline — streams in bold */}
              <span className="text-[10px] font-semibold leading-snug text-[#222]">
                {headlineLine}
                {!block.done && lines.length <= 1 && (
                  <span className="inline-block w-[1px] h-[10px] bg-[#d7403a] ml-[1px] animate-pulse" />
                )}
              </span>

              {/* Meta line: source badge + timestamp */}
              {metaLine && (
                <div className="flex items-center gap-1.5">
                  {event.source && metaLine.includes(`[${event.source.toUpperCase()}]`) && (
                    <span
                      className="text-[7px] font-bold uppercase tracking-wider rounded-full px-1.5 py-[1px] leading-none"
                      style={{
                        backgroundColor: sourceStyle.bg,
                        color: sourceStyle.text,
                      }}
                    >
                      {event.source}
                    </span>
                  )}
                  <span className="text-[8px] text-[#aaa]">
                    {timeAgo(event.timestamp)}
                  </span>
                  {!block.done && lines.length === 2 && (
                    <span className="inline-block w-[1px] h-[8px] bg-[#d7403a] ml-[1px] animate-pulse" />
                  )}
                </div>
              )}

              {/* Body — streams character by character */}
              {bodyLines && (
                <div className="text-[9px] leading-snug text-[#555] mt-0.5 whitespace-pre-wrap">
                  {bodyLines}
                  {!block.done && lines.length > 2 && (
                    <span className="inline-block w-[1px] h-[9px] bg-[#d7403a] ml-[1px] animate-pulse" />
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
