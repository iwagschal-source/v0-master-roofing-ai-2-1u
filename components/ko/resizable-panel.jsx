"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { GripVertical, PanelRightClose, PanelRightOpen } from "lucide-react"

/**
 * Resizable split panel with draggable divider
 *
 * @param {{
 *   children: React.ReactNode,
 *   panel: React.ReactNode,
 *   panelTitle?: string,
 *   defaultPanelWidth?: number,
 *   minPanelWidth?: number,
 *   maxPanelWidth?: number,
 *   defaultOpen?: boolean,
 *   className?: string
 * }} props
 */
export function ResizablePanel({
  children,
  panel,
  panelTitle = "Panel",
  defaultPanelWidth = 380,
  minPanelWidth = 280,
  maxPanelWidth = 600,
  defaultOpen = true,
  className
}) {
  const [isPanelOpen, setIsPanelOpen] = useState(defaultOpen)
  const [panelWidth, setPanelWidth] = useState(defaultPanelWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
    startXRef.current = e.clientX
    startWidthRef.current = panelWidth
  }, [panelWidth])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return

    const delta = startXRef.current - e.clientX
    const newWidth = Math.min(maxPanelWidth, Math.max(minPanelWidth, startWidthRef.current + delta))
    setPanelWidth(newWidth)
  }, [isDragging, minPanelWidth, maxPanelWidth])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div ref={containerRef} className={cn("flex h-full overflow-hidden", className)}>
      {/* Main Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {children}
      </div>

      {/* Panel */}
      {isPanelOpen && (
        <>
          {/* Draggable Divider */}
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "w-1 flex-shrink-0 bg-border hover:bg-primary/50 cursor-col-resize transition-colors relative group",
              isDragging && "bg-primary"
            )}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <GripVertical className="w-4 h-4 text-foreground-tertiary" />
            </div>
          </div>

          {/* Panel Content */}
          <div
            style={{ width: panelWidth }}
            className="flex-shrink-0 bg-background border-l border-border overflow-hidden flex flex-col"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/30">
              <span className="text-sm font-medium text-foreground">{panelTitle}</span>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="p-1 rounded hover:bg-secondary transition-colors"
                title="Close panel"
              >
                <PanelRightClose className="w-4 h-4 text-foreground-tertiary" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto">
              {panel}
            </div>
          </div>
        </>
      )}

      {/* Toggle Button (when closed) */}
      {!isPanelOpen && (
        <button
          onClick={() => setIsPanelOpen(true)}
          className="flex-shrink-0 w-10 bg-secondary/50 hover:bg-secondary border-l border-border flex items-center justify-center transition-colors"
          title={`Open ${panelTitle}`}
        >
          <PanelRightOpen className="w-5 h-5 text-foreground-tertiary" />
        </button>
      )}
    </div>
  )
}
