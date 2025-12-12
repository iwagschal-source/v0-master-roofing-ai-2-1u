"use client"

import { useEffect, useState } from "react"

interface ThinkingIndicatorProps {
  isActive: boolean
  showReasoning?: boolean
}

export function ThinkingIndicator({ isActive, showReasoning = false }: ThinkingIndicatorProps) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % 16)
    }, 120) // 120ms for smooth wave motion

    return () => clearInterval(interval)
  }, [isActive])

  if (!isActive) return null

  // Brand color sequence (left → right): darkest to lightest
  const colors = ["#E2463D", "#EA7269", "#F1A4A0", "#F8DAD8"]

  // Wave animation: each slash pulses up and down in sequence
  const getSlashOpacity = (index: number) => {
    const offset = (frame - index * 3) % 16
    if (offset < 0 || offset > 8) return 0.3
    return 0.3 + Math.sin((offset / 8) * Math.PI) * 0.7
  }

  const getSlashTransform = (index: number) => {
    const offset = (frame - index * 3) % 16
    if (offset < 0 || offset > 8) return "translateY(0px)"
    const yOffset = Math.sin((offset / 8) * Math.PI) * -2
    return `translateY(${yOffset}px)`
  }

  return (
    <div className="flex items-center gap-2 px-1">
      {/* Animated 4-slash sequence with precise brand geometry */}
      <div className="flex items-center relative" style={{ height: "32px", gap: "7px" }}>
        {colors.map((color, index) => (
          <div
            key={index}
            className="transition-all duration-120 ease-out"
            style={{
              opacity: getSlashOpacity(index),
              transform: getSlashTransform(index),
            }}
          >
            {/* Each slash follows brand specs: 110x80px scaled to 44x32px, 19° angle */}
            <svg width="44" height="32" viewBox="0 0 110 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M32 0L0 80L78 80L110 0L32 0Z"
                fill={color}
                style={{
                  transform: "skewX(-19deg)",
                  transformOrigin: "center",
                }}
              />
            </svg>
          </div>
        ))}
      </div>

      {/* Optional reasoning label */}
      {showReasoning && <span className="text-xs text-muted-foreground">Reasoning...</span>}
    </div>
  )
}
