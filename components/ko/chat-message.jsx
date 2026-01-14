import { TTSPlayButton } from "./tts-play-button"
import { Download, FileText, ExternalLink, File, Image as ImageIcon } from "lucide-react"

// Parse markdown-style links and document references from content
function parseContentWithLinks(content) {
  if (!content) return []

  const parts = []
  let lastIndex = 0

  // Match markdown links [text](url) and document references like gs://bucket/path or /path/to/file
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)|(?:gs:\/\/[^\s]+)|(?:https?:\/\/[^\s]+)|(?:\/[a-zA-Z0-9_\-./]+\.[a-zA-Z0-9]+)/g

  let match
  while ((match = linkRegex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: content.substring(lastIndex, match.index) })
    }

    if (match[1] && match[2]) {
      // Markdown link [text](url)
      parts.push({ type: 'link', text: match[1], url: match[2] })
    } else {
      // Plain URL or path
      parts.push({ type: 'link', text: match[0], url: match[0] })
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({ type: 'text', content: content.substring(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content }]
}

// Download a generated file
function downloadFile(file) {
  const blob = new Blob([file.content], { type: file.mimeType || 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  URL.revokeObjectURL(url)
}

function getFileIcon(fileName) {
  if (fileName.endsWith('.csv')) return <FileText className="w-4 h-4" />
  if (fileName.endsWith('.json')) return <FileText className="w-4 h-4" />
  if (/\.(png|jpg|jpeg|gif|webp)$/i.test(fileName)) return <ImageIcon className="w-4 h-4" />
  return <File className="w-4 h-4" />
}

export function ChatMessage({ message, onSourceClick, onDocumentClick }) {
  const isAssistant = message.role === "assistant"
  const sources = Array.isArray(message.sources) ? message.sources : []
  const attachments = Array.isArray(message.attachments) ? message.attachments : []
  const generatedFiles = Array.isArray(message.generatedFiles) ? message.generatedFiles : []
  const documents = Array.isArray(message.documents) ? message.documents : []

  // Parse content for links
  const contentParts = parseContentWithLinks(message.content)

  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"} group`}>
      <div className="max-w-[80%] rounded-lg px-4 py-3 bg-card border border-border relative" data-role={message.role}>
        {/* TTS Play Button for assistant messages */}
        {isAssistant && message.content && (
          <div className="absolute -right-8 top-2">
            <TTSPlayButton text={message.content} />
          </div>
        )}

        {/* User Attachments (files they uploaded) */}
        {!isAssistant && attachments.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2 py-1 bg-secondary/50 rounded text-xs"
              >
                {getFileIcon(file.name)}
                <span className="text-foreground">{file.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Message Content with parsed links */}
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {contentParts.map((part, idx) => {
            if (part.type === 'link') {
              return (
                <a
                  key={idx}
                  href={part.url.startsWith('gs://') ? '#' : part.url}
                  onClick={(e) => {
                    if (part.url.startsWith('gs://') || part.url.startsWith('/')) {
                      e.preventDefault()
                      onDocumentClick?.(part.url)
                    }
                  }}
                  target={part.url.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1"
                >
                  {part.text}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )
            }
            return <span key={idx}>{part.content}</span>
          })}
        </div>

        {/* Generated Files (CSV, JSON that KO created) */}
        {generatedFiles.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Generated Files</p>
            <div className="flex flex-wrap gap-2">
              {generatedFiles.map((file, idx) => (
                <button
                  key={idx}
                  onClick={() => downloadFile(file)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  {file.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Document References */}
        {documents.length > 0 && (
          <div className="mt-3 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground mb-2">Documents</p>
            <div className="flex flex-col gap-2">
              {documents.map((doc, idx) => (
                <button
                  key={idx}
                  onClick={() => onDocumentClick?.(doc.path || doc.url)}
                  className="text-left text-xs text-primary hover:underline flex items-center gap-2 px-2 py-1 bg-secondary/30 rounded"
                >
                  {getFileIcon(doc.name || doc.path)}
                  <span className="truncate flex-1">{doc.name || doc.path}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
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

        <p className="text-xs text-muted-foreground mt-2">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  )
}
