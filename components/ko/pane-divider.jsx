"use client"

import { useState, useCallback } from "react"

/** @typedef {Object} PaneDividerProps */

/** @param {any} props */
/** @param {any} props */
export function PaneDivider({ topPaneHeight, onHeightChange }) {
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return

      const windowHeight = window.innerHeight
      const newHeight = (e.clientY / windowHeight) * 100

      // Constrain between 30% and 70%
      const constrainedHeight = Math.min(Math.max(newHeight, 30), 70)
      onHeightChange(constrainedHeight)
    },
    [isDragging, onHeightChange],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add global mouse listeners when dragging
  if (typeof window !== "undefined") {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    } else {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }

  return (
    <div
      className={`relative h-1 cursor-ns-resize transition-colors ${
        isDragging ? "bg-primary" : "bg-border hover:bg-primary/50"
      }`}
      onMouseDown={handleMouseDown}
    >
      {/* Drag Handle Indicator */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1 rounded-full transition-colors ${
          isDragging ? "bg-primary" : "bg-muted-foreground/50"
        }`}
      />
    </div>
  )
}