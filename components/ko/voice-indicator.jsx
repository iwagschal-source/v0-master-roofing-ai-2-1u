"use client"

/**
 * VoiceIndicator Component
 * Shows recording state with audio level visualization and transcript.
 */

export function VoiceIndicator({
  isRecording,
  audioLevel = 0,
  transcript = "",
  isTranscribing = false
}) {
  if (!isRecording && !isTranscribing) {
    return null
  }

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-red-500/90 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-3 backdrop-blur-sm">
        {/* Recording indicator */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <span className="text-sm font-medium">
            {isRecording ? 'Recording...' : 'Processing...'}
          </span>
        </div>

        {/* Audio level bars */}
        {isRecording && (
          <div className="flex items-center gap-0.5 h-4">
            {[...Array(5)].map((_, i) => {
              const threshold = i * 0.2
              const isActive = audioLevel > threshold
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    isActive ? 'bg-white' : 'bg-white/30'
                  }`}
                  style={{
                    height: isActive ? `${12 + (i * 2)}px` : '4px'
                  }}
                />
              )
            })}
          </div>
        )}

        {/* Transcript preview */}
        {transcript && (
          <div className="max-w-xs truncate text-sm opacity-90">
            "{transcript}"
          </div>
        )}
      </div>

      {/* Spacebar hint */}
      <div className="text-center mt-2 text-xs text-muted-foreground">
        Release spacebar to send
      </div>
    </div>
  )
}
