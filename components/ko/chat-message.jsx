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
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  className="text-left text-xs text-primary hover:underline"
                >
                  {s.title}
                </a>
                /* <button
                  key={s.id}
                  onClick={() => onSourceClick?.(s)}
                  className="text-left text-xs text-primary hover:underline"
                  title={s.url}
                >
                  {s.title}
                </button> */
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
