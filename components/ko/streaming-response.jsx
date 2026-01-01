"use client"

import { useEffect, useRef } from "react"

/**
 * StreamingResponse - Displays text as it streams in with a cursor effect
 *
 * Features:
 * - Auto-scrolls as content grows
 * - Shows blinking cursor while streaming
 * - Smooth text appearance
 */
export function StreamingResponse({ text = "", isStreaming = false, isComplete = false }) {
  const containerRef = useRef(null)
  const textRef = useRef(null)

  // Auto-scroll as text streams in
  useEffect(() => {
    if (containerRef.current && isStreaming) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [text, isStreaming])

  // Don't render if no text and not streaming
  if (!text && !isStreaming) return null

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-border bg-card px-4 py-3 max-h-[400px] overflow-y-auto"
    >
      <div ref={textRef} className="prose prose-sm dark:prose-invert max-w-none">
        {/* Render text with markdown-like formatting */}
        <div className="whitespace-pre-wrap break-words text-foreground">
          {text}
          {/* Blinking cursor while streaming */}
          {isStreaming && !isComplete && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse" />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * StreamingResponseMinimal - Inline version without card wrapper
 */
export function StreamingResponseInline({ text = "", isStreaming = false }) {
  if (!text && !isStreaming) return null

  return (
    <span className="whitespace-pre-wrap">
      {text}
      {isStreaming && (
        <span className="inline-block w-1.5 h-3 ml-0.5 bg-primary/70 animate-pulse" />
      )}
    </span>
  )
}
