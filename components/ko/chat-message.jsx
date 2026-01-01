export function ChatMessage({ message, onSourceClick }) {
  const isAssistant = message.role === "assistant"
  const sources = Array.isArray(message.sources) ? message.sources : []

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"}`}>
      <div className="max-w-[80%] rounded-lg px-4 py-3 bg-card border border-border" data-role={message.role}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>

        {sources.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Sources</p>
            <div className="flex flex-col gap-2">
              {sources.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSourceClick?.(s)}
                  className="text-left text-xs text-primary hover:underline flex items-center gap-1"
                  title={s.url}
                >
                  <span className="truncate">{s.title}</span>
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* {message.reasoning && (
          <ul className="list-disc pl-5 text-xs text-muted-foreground mt-3">
            {message.reasoning.map((reason, index) => (
              <li key={index}>{reason}</li>
            ))}
          </ul>
        )} */}

        <p className="text-xs text-muted-foreground mt-2">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  )
}
