"use client"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  source?: {
    itemId: string
    label: string
  }
  reasoning?: string[]
}

interface ChatMessageProps {
  message: Message
  onSourceClick?: (itemId: string) => void
}

export function ChatMessage({ message, onSourceClick }: ChatMessageProps) {
  const isAssistant = message.role === "assistant"

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div className="max-w-[80%] rounded-lg px-4 py-3 bg-card border border-border" data-role={message.role}>
        <p className="text-sm leading-relaxed">
          {message.content}
          {message.source && (
            <>
              {" "}
              <button
                onClick={() => onSourceClick?.(message.source!.itemId)}
                className="text-primary hover:underline inline-flex items-center text-xs"
              >
                [{message.source.label}]
              </button>
            </>
          )}
        </p>
        {message.reasoning && (
          <ul className="list-disc pl-5 text-xs text-muted-foreground">
            {message.reasoning.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  )
}
