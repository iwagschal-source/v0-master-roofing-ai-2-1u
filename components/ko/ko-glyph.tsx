"use client"

import { useEffect, useState } from "react"

interface KOGlyphProps {
  size?: "small" | "medium" | "large"
  state?: "idle" | "listening" | "thinking" | "speaking"
}

export function KOGlyph({ size = "medium", state = "idle" }: KOGlyphProps) {
  const [pulseOpacity, setPulseOpacity] = useState(1)

  const sizeMap = {
    small: "w-8 h-8",
    medium: "w-16 h-16",
    large: "w-24 h-24",
  }

  useEffect(() => {
    if (state === "idle") {
      const interval = setInterval(() => {
        setPulseOpacity((prev) => (prev === 1 ? 0.5 : 1))
      }, 2000)
      return () => clearInterval(interval)
    } else {
      setPulseOpacity(1)
    }
  }, [state])

  return (
    <div className={`relative ${sizeMap[size]} flex items-center justify-center`}>
      {/* Main Glyph - Double Bar "//" in Master Roofing Red */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{
          opacity: state === "idle" ? pulseOpacity : 1,
          transition: "opacity 2s ease-in-out",
        }}
      >
        {/* First Bar */}
        <rect
          x="32"
          y="15"
          width="6"
          height="70"
          rx="3"
          fill="#E63232"
          transform="rotate(20 35 50)"
          className={state === "listening" ? "animate-pulse" : ""}
        />

        {/* Second Bar */}
        <rect
          x="58"
          y="15"
          width="6"
          height="70"
          rx="3"
          fill="#E63232"
          transform="rotate(20 61 50)"
          className={state === "listening" ? "animate-pulse" : ""}
        />

        {state === "thinking" && (
          <rect x="0" y="48" width="100" height="4" fill="#E63232" opacity="0.4" className="animate-pulse" />
        )}

        {state === "speaking" && (
          <>
            <circle
              cx="50"
              cy="50"
              r="35"
              fill="none"
              stroke="#E63232"
              strokeWidth="1.5"
              opacity="0.3"
              className="animate-ping"
            />
            <circle
              cx="50"
              cy="50"
              r="28"
              fill="none"
              stroke="#E63232"
              strokeWidth="1.5"
              opacity="0.5"
              className="animate-pulse"
            />
          </>
        )}
      </svg>
    </div>
  )
}
