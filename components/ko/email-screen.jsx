"use client"

import { useState } from "react"
import { Paperclip, Mic, Send, Sparkles, RefreshCw, Search, Loader2, Check, AlertCircle, ExternalLink, LogOut, Plus, X } from "lucide-react"
import { ThinkingIndicator } from "./thinking-indicator"
import { VoiceToggle } from "./voice-toggle"
import { useGmail } from "@/hooks/useGmail"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } else if (days === 1) {
    return 'Yesterday'
  } else if (days < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
}

function extractSenderName(from) {
  const match = from.match(/^([^<]+)/)
  return match ? match[1].trim() : from
}

function extractSenderEmail(from) {
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}

export function EmailScreen() {
  const {
    isConnected,
    user,
    loading: authLoading,
    authUrl,
    disconnect
  } = useGoogleAuth()

  const {
    messages,
    loading,
    error,
    selectedMessage,
    analysis,
    analysisLoading,
    draftReply,
    draftLoading,
    selectMessage,
    generateDraft,
    sendReply,
    refresh
  } = useGmail({ autoFetch: isConnected, maxResults: 25 })

  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [editedDraft, setEditedDraft] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  // Compose modal state
  const [showCompose, setShowCompose] = useState(false)
  const [composeTo, setComposeTo] = useState("")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [composeSending, setComposeSending] = useState(false)
  const [composeSuccess, setComposeSuccess] = useState(false)
  const [composeError, setComposeError] = useState("")

  const handleSend = () => {
    if (inputValue.trim()) {
      setIsThinking(true)
      setTimeout(() => setIsThinking(false), 2000)
      setInputValue("")
    }
  }

  const handleMicToggle = () => {
    const newRecordingState = !isRecording
    setIsRecording(newRecordingState)

    if (!newRecordingState) {
      handleSend()
    }
  }

  const handleRegenerateDraft = (tone) => {
    if (selectedMessage) {
      generateDraft(selectedMessage.id, tone)
    }
  }

  const handleInsertReply = async () => {
    if (!selectedMessage || !draftReply) return

    setSendingReply(true)
    const to = [extractSenderEmail(selectedMessage.from)]
    const subject = selectedMessage.subject.startsWith('Re:')
      ? selectedMessage.subject
      : `Re: ${selectedMessage.subject}`
    const body = editedDraft || draftReply

    const success = await sendReply(to, subject, body, selectedMessage.threadId)
    setSendingReply(false)

    if (success) {
      setSendSuccess(true)
      setTimeout(() => setSendSuccess(false), 3000)
    }
  }

  const handleComposeSend = async () => {
    if (!composeTo.trim() || !composeBody.trim()) {
      setComposeError("Please enter a recipient and message")
      return
    }

    setComposeSending(true)
    setComposeError("")

    // Parse multiple recipients (comma-separated)
    const recipients = composeTo.split(',').map(email => email.trim()).filter(Boolean)

    const success = await sendReply(recipients, composeSubject, composeBody)
    setComposeSending(false)

    if (success) {
      setComposeSuccess(true)
      setTimeout(() => {
        setComposeSuccess(false)
        setShowCompose(false)
        setComposeTo("")
        setComposeSubject("")
        setComposeBody("")
        refresh() // Refresh to see sent email
      }, 1500)
    } else {
      setComposeError("Failed to send email. Please try again.")
    }
  }

  const handleCloseCompose = () => {
    if (composeTo || composeSubject || composeBody) {
      if (window.confirm("Discard this draft?")) {
        setShowCompose(false)
        setComposeTo("")
        setComposeSubject("")
        setComposeBody("")
        setComposeError("")
      }
    } else {
      setShowCompose(false)
    }
  }

  // Filter messages by search query
  const filteredMessages = messages.filter(email => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      email.subject.toLowerCase().includes(q) ||
      email.from.toLowerCase().includes(q) ||
      email.snippet.toLowerCase().includes(q)
    )
  })

  return (
    <div className="flex h-full bg-background">
      {/* LEFT PANE - Email List */}
      <div className="w-96 border-r border-border flex flex-col bg-background">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <img src="/images/gmail.svg" alt="Gmail" className="w-5 h-5" />
              <h2 className="text-lg font-semibold text-[#ececec]">Inbox</h2>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && (
                <button
                  onClick={() => setShowCompose(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                  title="Compose new email"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Compose</span>
                </button>
              )}
              {isConnected && user && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#9b9b9b] hidden sm:inline">{user.email}</span>
                  <button
                    onClick={disconnect}
                    className="p-1.5 hover:bg-muted rounded-lg transition-colors text-[#9b9b9b] hover:text-red-400"
                    title="Disconnect Google"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <button
                onClick={refresh}
                disabled={loading || !isConnected}
                className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-[#9b9b9b] ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9b9b9b]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails..."
              className="w-full pl-10 pr-4 py-2 bg-card border border-input rounded-lg text-sm text-foreground placeholder:text-[#9b9b9b] outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {authLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : !isConnected ? (
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
                <img src="/images/gmail.svg" alt="Gmail" className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-[#ececec] mb-2">Connect Gmail</h3>
              <p className="text-sm text-[#9b9b9b] mb-4">
                Connect your Google account to access your Gmail inbox
              </p>
              <a
                href={authUrl}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <img src="/images/google.svg" alt="" className="w-4 h-4" />
                Connect to Google
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : loading && messages.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-[#9b9b9b]">{error}</p>
              <button
                onClick={refresh}
                className="mt-2 text-sm text-primary hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-4 text-center text-[#9b9b9b]">
              {searchQuery ? 'No emails match your search' : 'No emails'}
            </div>
          ) : (
            filteredMessages.map((email) => (
              <button
                key={email.id}
                onClick={() => selectMessage(email)}
                className={`w-full text-left p-4 border-b border-border/50 hover:bg-card/30 transition-colors ${
                  selectedMessage?.id === email.id ? "bg-card/50" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-medium truncate mr-2 ${email.read ? "text-[#9b9b9b]" : "text-[#ececec]"}`}>
                    {extractSenderName(email.from)}
                  </span>
                  <span className="text-xs text-[#9b9b9b] whitespace-nowrap">{formatDate(email.date)}</span>
                </div>
                <div className={`text-sm mb-1 truncate ${email.read ? "text-[#9b9b9b]" : "text-[#ececec] font-medium"}`}>
                  {email.subject}
                </div>
                <div className="text-xs text-[#9b9b9b] line-clamp-1">{email.snippet}</div>
                {email.attachments && email.attachments.length > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-[#9b9b9b]">
                    <Paperclip className="w-3 h-3" />
                    <span>{email.attachments.length} attachment{email.attachments.length > 1 ? 's' : ''}</span>
                  </div>
                )}
                {selectedMessage?.id === email.id && <div className="mt-2 h-0.5 bg-primary rounded-full" />}
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANE - Email Content + Agent Assist */}
      <div className="flex-1 flex flex-col bg-muted/60">
        {selectedMessage ? (
          <>
            {/* Email Content Window (top section) */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold text-[#ececec] mb-2">{selectedMessage.subject}</h1>
                  <div className="flex items-center gap-4 text-sm text-[#9b9b9b]">
                    <span className="font-medium text-[#ececec]">{extractSenderName(selectedMessage.from)}</span>
                    <span className="text-xs">&lt;{extractSenderEmail(selectedMessage.from)}&gt;</span>
                    <span>{formatDate(selectedMessage.date)}</span>
                  </div>
                </div>

                <div className="text-[#ececec] whitespace-pre-line mb-6 leading-relaxed">{selectedMessage.body}</div>

                {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedMessage.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 bg-card border border-input rounded-lg text-sm text-[#ececec] hover:bg-muted cursor-pointer transition-colors"
                      >
                        <Paperclip className="w-4 h-4 text-[#9b9b9b]" />
                        <span>{attachment.filename}</span>
                        <span className="text-xs text-[#9b9b9b]">
                          ({Math.round(attachment.size / 1024)}KB)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Agent Assist Window (bottom section) */}
            <div className="border-t border-border bg-card/30 p-6">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-[#ececec]">KO Agent Assist</h3>
                  {analysisLoading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                </div>

                {analysis ? (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-sm font-medium text-[#ececec]">Summary</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            analysis.priority === 'high'
                              ? 'bg-red-500/20 text-red-400'
                              : analysis.priority === 'medium'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-green-500/20 text-green-400'
                          }`}>
                            {analysis.priority} priority
                          </span>
                        </div>
                        <p className="text-sm text-[#9b9b9b] leading-relaxed">{analysis.summary}</p>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-[#ececec] mb-2">Action Items</h4>
                        <ul className="text-sm text-[#9b9b9b] space-y-1">
                          {analysis.actionItems.map((item, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-[#ececec] mb-2">Recommended Strategy</h4>
                      <p className="text-sm text-[#9b9b9b] leading-relaxed">{analysis.strategy}</p>
                    </div>
                  </>
                ) : analysisLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
                      <p className="text-sm text-[#9b9b9b]">Analyzing email...</p>
                    </div>
                  </div>
                ) : null}

                {/* Draft Reply Section */}
                <div className="bg-background rounded-lg border border-input p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-[#ececec]">Draft Reply</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRegenerateDraft('brief')}
                        disabled={draftLoading}
                        className="text-xs px-3 py-1 bg-card border border-input rounded-md text-[#ececec] hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        Make it shorter
                      </button>
                      <button
                        onClick={() => handleRegenerateDraft('professional')}
                        disabled={draftLoading}
                        className="text-xs px-3 py-1 bg-card border border-input rounded-md text-[#ececec] hover:bg-muted transition-colors disabled:opacity-50"
                      >
                        More formal
                      </button>
                      <button
                        onClick={handleInsertReply}
                        disabled={!draftReply || sendingReply || sendSuccess}
                        className="text-xs px-3 py-1 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                      >
                        {sendingReply ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Sending...
                          </>
                        ) : sendSuccess ? (
                          <>
                            <Check className="w-3 h-3" />
                            Sent!
                          </>
                        ) : (
                          'Send Reply'
                        )}
                      </button>
                    </div>
                  </div>
                  {draftLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-sm text-[#9b9b9b]">Generating draft...</span>
                    </div>
                  ) : draftReply ? (
                    <textarea
                      value={editedDraft || draftReply}
                      onChange={(e) => setEditedDraft(e.target.value)}
                      className="w-full min-h-[150px] text-sm text-[#ececec] bg-transparent outline-none resize-none leading-relaxed"
                    />
                  ) : (
                    <p className="text-sm text-[#9b9b9b] italic">Select an email to generate a draft reply</p>
                  )}
                </div>
              </div>
            </div>

            {/* Chat/Mic Input Bar */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-3 bg-card rounded-xl px-4 py-3 border border-input shadow-sm max-w-4xl mx-auto">
                <button className="text-[#9b9b9b] hover:text-foreground transition-colors" aria-label="Attach file">
                  <Paperclip className="w-5 h-5" />
                </button>

                <ThinkingIndicator isActive={isRecording || isThinking} />

                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Ask KO about this email..."
                  className="flex-1 bg-transparent outline-none text-foreground placeholder:text-[#9b9b9b]"
                />

                <VoiceToggle isActive={isVoiceEnabled} onToggle={() => setIsVoiceEnabled(!isVoiceEnabled)} />

                <button
                  onClick={handleMicToggle}
                  className={`transition-colors ${isRecording ? "text-primary" : "text-[#9b9b9b] hover:text-foreground"}`}
                  aria-label={isRecording ? "Stop recording and send" : "Start recording"}
                >
                  <Mic className="w-5 h-5" />
                </button>

                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  aria-label="Send message"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : !isConnected ? (
          <div className="flex-1 flex items-center justify-center text-[#9b9b9b]">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                <img src="/images/gmail.svg" alt="Gmail" className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-medium text-[#ececec] mb-3">Connect Your Gmail</h3>
              <p className="text-sm mb-6">
                Connect your Google account to access your Gmail inbox. KO will help you analyze emails, suggest responses, and manage your communications.
              </p>
              <a
                href={authUrl}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <img src="/images/google.svg" alt="" className="w-5 h-5" />
                Connect to Google
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#9b9b9b]">
            <div className="text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary/50" />
              <h3 className="text-lg font-medium text-[#ececec] mb-2">Select an email</h3>
              <p className="text-sm">KO will analyze it and help you respond</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Email Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-[#ececec]">New Message</h2>
              <button
                onClick={handleCloseCompose}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-[#9b9b9b] hover:text-[#ececec]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* To Field */}
              <div>
                <label className="block text-xs text-[#9b9b9b] mb-1">To</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com (comma-separate multiple)"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-[#ececec] placeholder:text-[#9b9b9b] outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Subject Field */}
              <div>
                <label className="block text-xs text-[#9b9b9b] mb-1">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-[#ececec] placeholder:text-[#9b9b9b] outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Body Field */}
              <div className="flex-1">
                <label className="block text-xs text-[#9b9b9b] mb-1">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={12}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-[#ececec] placeholder:text-[#9b9b9b] outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Error Message */}
              {composeError && (
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {composeError}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border">
              <button
                onClick={handleCloseCompose}
                className="px-4 py-2 text-sm text-[#9b9b9b] hover:text-[#ececec] transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleComposeSend}
                disabled={!composeTo.trim() || !composeBody.trim() || composeSending || composeSuccess}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {composeSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : composeSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Sent!
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
