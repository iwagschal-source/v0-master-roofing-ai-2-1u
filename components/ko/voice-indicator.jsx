"use client"

/**
 * VoiceIndicator Component
 * Shows recording state with audio level visualization.
 */

export function VoiceIndicator({
  isRecording,
  audioLevel = 0,
  transcript = "",
  isTranscribing = false
}) {
  // Only show while actively recording
  if (!isRecording) {
    return null
  }

  return (
    <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-red-600 text-white px-5 py-2.5 rounded-full shadow-lg flex items-center gap-3">
        {/* Pulsing dot */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
        </span>

        {/* Audio level bars */}
        <div className="flex items-center gap-0.5 h-4">
          {[...Array(5)].map((_, i) => {
            const threshold = i * 0.15
            const isActive = audioLevel > threshold
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-75 ${
                  isActive ? 'bg-white' : 'bg-white/40'
                }`}
                style={{
                  height: isActive ? `${10 + (i * 3)}px` : '6px'
                }}
              />
            )
          })}
        </div>

        <span className="text-sm font-medium">Listening...</span>
      </div>

      {/* Hint */}
      <p className="text-center mt-2 text-xs text-white/70">
        Release to send
      </p>
    </div>
  )
}
