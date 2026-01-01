"use client"

import { useState } from "react"
import { useTTSPlayback } from "@/hooks/useTTSPlayback"

/**
 * TTSPlayButton Component
 * Button to play text-to-speech for a message.
 */

export function TTSPlayButton({ text }) {
  const { isPlaying, isLoading, playText, stop } = useTTSPlayback()

  const handleClick = () => {
    if (isPlaying) {
      stop()
    } else {
      playText(text)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
      title={isPlaying ? "Stop" : "Listen"}
      disabled={isLoading}
    >
      {isLoading ? (
        // Loading spinner
        <svg className="w-4 h-4 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : isPlaying ? (
        // Stop icon
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ) : (
        // Speaker icon
        <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      )}
    </button>
  )
}
