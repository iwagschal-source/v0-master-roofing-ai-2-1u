"use client"

import { useState, useRef, useEffect } from "react"
import { MessageSquare, Users, Send, RefreshCw, Loader2, Search, Hash, User } from "lucide-react"
import { useChatSpaces, formatMessageTime, getInitials } from "@/hooks/useChatSpaces"

export function ChatScreen() {
  const {
    spaces,
    loading,
    selectedSpace,
    messages,
    messagesLoading,
    selectSpace,
    sendMessage,
    refresh
  } = useChatSpaces({ autoFetch: true })

  const [inputValue, setInputValue] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return

    setSending(true)
    const success = await sendMessage(inputValue)
    if (success) {
      setInputValue("")
    }
    setSending(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Separate rooms and DMs
  const rooms = spaces.filter(s => s.type === 'ROOM')
  const dms = spaces.filter(s => s.type === 'DM' || s.type === 'GROUP_DM')

  // Filter by search
  const filteredRooms = rooms.filter(s =>
    !searchQuery || s.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredDms = dms.filter(s =>
    !searchQuery || s.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full bg-background overflow-hidden">
      {/* LEFT SIDEBAR - Spaces List */}
      <div className="w-72 border-r border-border flex flex-col bg-sidebar">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Messages</h2>
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-foreground-secondary ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search spaces..."
              className="w-full pl-10 pr-4 py-2 bg-card border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Spaces List */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading && spaces.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <>
              {/* Rooms Section */}
              {filteredRooms.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-medium text-foreground-secondary uppercase tracking-wide">
                    Spaces
                  </div>
                  {filteredRooms.map((space) => (
                    <button
                      key={space.id}
                      onClick={() => selectSpace(space)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        selectedSpace?.id === space.id
                          ? 'bg-primary/10 text-foreground'
                          : 'text-foreground-secondary hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Hash className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 text-left overflow-hidden">
                        <div className="text-sm font-medium truncate">{space.displayName}</div>
                        <div className="text-xs text-foreground-secondary">
                          {space.memberCount} members
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* DMs Section */}
              {filteredDms.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-foreground-secondary uppercase tracking-wide">
                    Direct Messages
                  </div>
                  {filteredDms.map((space) => (
                    <button
                      key={space.id}
                      onClick={() => selectSpace(space)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        selectedSpace?.id === space.id
                          ? 'bg-primary/10 text-foreground'
                          : 'text-foreground-secondary hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-xs font-medium">
                        {getInitials(space.displayName || 'DM')}
                      </div>
                      <div className="flex-1 text-left overflow-hidden">
                        <div className="text-sm font-medium truncate">{space.displayName}</div>
                        {space.lastMessageTime && (
                          <div className="text-xs text-foreground-secondary">
                            {formatMessageTime(space.lastMessageTime)}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* RIGHT PANE - Chat Messages */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedSpace ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-border bg-card">
              <div className="flex items-center gap-3">
                {selectedSpace.type === 'ROOM' ? (
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-primary" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {getInitials(selectedSpace.displayName || 'DM')}
                  </div>
                )}
                <div>
                  <h3 className="font-medium text-foreground">{selectedSpace.displayName}</h3>
                  <p className="text-xs text-foreground-secondary">
                    {selectedSpace.type === 'ROOM'
                      ? `${selectedSpace.memberCount || 0} members`
                      : 'Direct message'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-foreground-secondary">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl">
                  {messages.map((message, index) => {
                    const isOwn = message.sender.email === 'iwagschal@masterroofingus.com'
                    const showAvatar = index === 0 ||
                      messages[index - 1].sender.email !== message.sender.email

                    return (
                      <div key={message.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        {showAvatar ? (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium ${
                            isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                          }`}>
                            {getInitials(message.sender.name)}
                          </div>
                        ) : (
                          <div className="w-8 flex-shrink-0" />
                        )}

                        <div className={`flex-1 ${isOwn ? 'text-right' : ''}`}>
                          {showAvatar && (
                            <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                              <span className="text-sm font-medium text-foreground">
                                {message.sender.name}
                              </span>
                              <span className="text-xs text-foreground-secondary">
                                {formatMessageTime(message.createTime)}
                              </span>
                            </div>
                          )}
                          <div className={`inline-block px-4 py-2 rounded-2xl max-w-[80%] ${
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-card border border-border text-foreground rounded-bl-md'
                          }`}>
                            <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-card">
              <div className="flex items-center gap-3 max-w-3xl">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedSpace.displayName}...`}
                  disabled={sending}
                  className="flex-1 px-4 py-3 bg-background border border-input rounded-xl text-foreground placeholder:text-foreground-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || sending}
                  className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground-secondary">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">Select a conversation</h3>
              <p className="text-sm">Choose a space or direct message to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
