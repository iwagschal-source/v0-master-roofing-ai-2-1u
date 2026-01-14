"use client"

import { useState } from "react"
import { MessageSquare, Trash2, Download, MoreVertical, Plus, Clock } from "lucide-react"

function formatRelativeTime(date) {
  if (!date) return ''

  const now = new Date()
  const d = new Date(date)
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return d.toLocaleDateString()
}

export function ConversationList({
  conversations = [],
  currentSessionId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onExportConversation,
  className = ""
}) {
  const [menuOpen, setMenuOpen] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleDelete = (sessionId, e) => {
    e?.stopPropagation()
    if (confirmDelete === sessionId) {
      onDeleteConversation?.(sessionId)
      setConfirmDelete(null)
      setMenuOpen(null)
    } else {
      setConfirmDelete(sessionId)
      setTimeout(() => setConfirmDelete(null), 3000) // Reset after 3 seconds
    }
  }

  const handleExport = (sessionId, e) => {
    e?.stopPropagation()
    onExportConversation?.(sessionId)
    setMenuOpen(null)
  }

  if (conversations.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground-secondary">Recent Chats</h3>
          <button
            onClick={onNewConversation}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="New Chat"
          >
            <Plus className="w-4 h-4 text-foreground-secondary" />
          </button>
        </div>
        <div className="text-center py-6">
          <MessageSquare className="w-8 h-8 text-foreground-tertiary mx-auto mb-2" />
          <p className="text-sm text-foreground-tertiary">No conversations yet</p>
          <p className="text-xs text-foreground-tertiary mt-1">Start chatting with KO</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground-secondary">Recent Chats</h3>
        <button
          onClick={onNewConversation}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          title="New Chat"
        >
          <Plus className="w-4 h-4 text-foreground-secondary" />
        </button>
      </div>

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {conversations.slice(0, 10).map((conv) => {
          const isActive = conv.session_id === currentSessionId
          const isMenuOpen = menuOpen === conv.session_id
          const isConfirmingDelete = confirmDelete === conv.session_id

          return (
            <div
              key={conv.session_id}
              className={`group relative flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                isActive
                  ? 'bg-primary/10 text-foreground'
                  : 'hover:bg-muted text-foreground-secondary hover:text-foreground'
              }`}
              onClick={() => onSelectConversation?.(conv.session_id)}
            >
              <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm truncate font-medium">
                  {conv.preview || 'New conversation'}
                </p>
                <div className="flex items-center gap-1 text-xs text-foreground-tertiary mt-0.5">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(conv.updated_at)}</span>
                  <span>·</span>
                  <span>{conv.messages?.length || 0} msgs</span>
                </div>
              </div>

              {/* Menu button */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(isMenuOpen ? null : conv.session_id)
                  }}
                  className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-background transition-all ${
                    isMenuOpen ? 'opacity-100' : ''
                  }`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown menu */}
                {isMenuOpen && (
                  <div className="absolute right-0 top-6 z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-32">
                    <button
                      onClick={(e) => handleExport(conv.session_id, e)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                    <button
                      onClick={(e) => handleDelete(conv.session_id, e)}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors ${
                        isConfirmingDelete ? 'text-red-500' : 'text-foreground'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isConfirmingDelete ? 'Confirm?' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {conversations.length > 10 && (
        <p className="text-xs text-foreground-tertiary mt-2 text-center">
          +{conversations.length - 10} more conversations
        </p>
      )}
    </div>
  )
}
