"use client"

import { useState, useEffect } from "react"
import { Mail, Send, Plus, RefreshCw, Search, Loader2, X, Paperclip, AlertCircle, ExternalLink, LogOut, Check } from "lucide-react"
import { useGmail } from "@/hooks/useGmail"
import { useGoogleAuth } from "@/hooks/useGoogleAuth"

function formatDate(dateString) {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return date.toLocaleDateString('en-US', { weekday: 'short' })
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function extractSenderName(from) {
  if (!from) return 'Unknown'
  const match = from.match(/^([^<]+)/)
  return match ? match[1].trim().replace(/"/g, '') : from
}

function extractSenderEmail(from) {
  if (!from) return ''
  const match = from.match(/<([^>]+)>/)
  return match ? match[1] : from
}

export function EmailScreen() {
  const { isConnected, user, loading: authLoading, authUrl, disconnect } = useGoogleAuth()
  const { messages, loading, error, selectedMessage, draftReply, draftLoading, selectMessage, generateDraft, sendReply, refresh } = useGmail({ autoFetch: isConnected, maxResults: 25 })

  const [searchQuery, setSearchQuery] = useState("")
  const [showCompose, setShowCompose] = useState(false)
  const [composeTo, setComposeTo] = useState("")
  const [composeCc, setComposeCc] = useState("")
  const [composeBcc, setComposeBcc] = useState("")
  const [composeSubject, setComposeSubject] = useState("")
  const [composeBody, setComposeBody] = useState("")
  const [composeSending, setComposeSending] = useState(false)
  const [composeError, setComposeError] = useState("")
  const [showCcBcc, setShowCcBcc] = useState(false)
  const [editedDraft, setEditedDraft] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)

  const filteredMessages = messages.filter(email => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      email.subject?.toLowerCase().includes(q) ||
      email.from?.toLowerCase().includes(q) ||
      email.snippet?.toLowerCase().includes(q)
    )
  })

  const handleComposeSend = async () => {
    if (!composeTo.trim() || !composeBody.trim()) {
      setComposeError("Please enter a recipient and message")
      return
    }

    setComposeSending(true)
    setComposeError("")

    try {
      const recipients = composeTo.split(',').map(e => e.trim()).filter(Boolean)
      const ccRecipients = composeCc.split(',').map(e => e.trim()).filter(Boolean)
      const bccRecipients = composeBcc.split(',').map(e => e.trim()).filter(Boolean)

      const res = await fetch('/api/google/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          cc: ccRecipients.length > 0 ? ccRecipients : undefined,
          bcc: bccRecipients.length > 0 ? bccRecipients : undefined,
          subject: composeSubject || '(No Subject)',
          message: composeBody,
        }),
      })

      const data = await res.json()

      if (data.needsAuth) {
        setComposeError("Not connected to Google. Please reconnect.")
        setComposeSending(false)
        return
      }

      if (data.error) {
        setComposeError(data.error)
        setComposeSending(false)
        return
      }

      if (data.success) {
        setShowCompose(false)
        setComposeTo("")
        setComposeCc("")
        setComposeBcc("")
        setComposeSubject("")
        setComposeBody("")
        setShowCcBcc(false)
        refresh()
      } else {
        setComposeError("Failed to send email. Please try again.")
        setComposeSending(false)
      }
    } catch (err) {
      setComposeError(err.message || "Network error. Please try again.")
      setComposeSending(false)
    }
  }

  const handleSendReply = async () => {
    if (!selectedMessage || !draftReply) return

    setSendingReply(true)
    const to = [extractSenderEmail(selectedMessage.from)]
    const subject = selectedMessage.subject?.startsWith('Re:') ? selectedMessage.subject : `Re: ${selectedMessage.subject}`
    const body = editedDraft || draftReply

    try {
      const success = await sendReply(to, subject, body, selectedMessage.threadId, selectedMessage.id)
      if (success) {
        setSendSuccess(true)
        setEditedDraft("")
        setTimeout(() => {
          setSendSuccess(false)
          refresh()
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to send reply:', err)
    } finally {
      setSendingReply(false)
    }
  }

  return (
    <div className="flex h-full bg-background">
      {/* Left Sidebar - Email List */}
      <div className="w-96 border-r border-border flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Inbox</h2>
            </div>
            <div className="flex items-center gap-2">
              {isConnected && user && (
                <button
                  onClick={disconnect}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors text-foreground-secondary hover:text-destructive"
                  title="Disconnect"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={refresh}
                disabled={loading || !isConnected}
                className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-foreground-secondary ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowCompose(true)}
            disabled={!isConnected}
            className="w-full px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
          >
            <Plus className="w-4 h-4" />
            Compose Email
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails..."
              className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-foreground-secondary" />
              </div>
              <h3 className="text-base font-medium text-foreground mb-2">Connect Gmail</h3>
              <p className="text-sm text-foreground-secondary mb-4">Connect your Google account to access your inbox</p>
              <a
                href={authUrl}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
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
              <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-foreground-secondary">{error}</p>
              <button onClick={refresh} className="mt-2 text-sm text-primary hover:underline">Try again</button>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-4 text-center text-foreground-secondary text-sm">
              {searchQuery ? 'No emails match your search' : 'No emails'}
            </div>
          ) : (
            filteredMessages.map((email) => (
              <button
                key={email.id}
                onClick={() => selectMessage(email)}
                className={`w-full text-left p-4 border-b border-border hover:bg-muted/50 transition-colors ${
                  selectedMessage?.id === email.id ? "bg-primary/5 border-l-2 border-l-primary" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-medium truncate mr-2 text-sm ${email.read ? "text-foreground-secondary" : "text-foreground"}`}>
                    {extractSenderName(email.from)}
                  </span>
                  <span className="text-xs text-foreground-tertiary whitespace-nowrap">{formatDate(email.date)}</span>
                </div>
                <div className={`text-sm mb-1 truncate ${email.read ? "text-foreground-secondary" : "text-foreground font-medium"}`}>
                  {email.subject || '(No Subject)'}
                </div>
                <div className="text-xs text-foreground-tertiary line-clamp-1">{email.snippet || ''}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Pane - Email Content */}
      <div className="flex-1 flex flex-col bg-background">
        {selectedMessage ? (
          <>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold text-foreground mb-3">{selectedMessage.subject || '(No Subject)'}</h1>
                  <div className="flex items-center gap-4 text-sm text-foreground-secondary">
                    <span className="font-medium text-foreground">{extractSenderName(selectedMessage.from)}</span>
                    <span className="text-xs">&lt;{extractSenderEmail(selectedMessage.from)}&gt;</span>
                    <span>{formatDate(selectedMessage.date)}</span>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap leading-relaxed mb-6">
                  {selectedMessage.body || selectedMessage.snippet || 'No content'}
                </div>
              </div>
            </div>

            <div className="border-t border-border bg-card p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-foreground mb-2">Reply</h3>
                  {draftLoading ? (
                    <div className="flex items-center gap-2 py-4">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      <span className="text-sm text-foreground-secondary">Generating draft...</span>
                    </div>
                  ) : draftReply ? (
                    <textarea
                      value={editedDraft || draftReply}
                      onChange={(e) => setEditedDraft(e.target.value)}
                      className="w-full min-h-[150px] px-4 py-3 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      placeholder="Edit your reply..."
                    />
                  ) : (
                    <p className="text-sm text-foreground-secondary italic">Generating draft reply...</p>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => generateDraft(selectedMessage.id, 'brief')}
                    disabled={draftLoading}
                    className="px-3 py-1.5 text-xs bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    Make shorter
                  </button>
                  <button
                    onClick={() => generateDraft(selectedMessage.id, 'professional')}
                    disabled={draftLoading}
                    className="px-3 py-1.5 text-xs bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors disabled:opacity-50"
                  >
                    More formal
                  </button>
                  <button
                    onClick={handleSendReply}
                    disabled={!draftReply || sendingReply || sendSuccess}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 ${
                      sendSuccess
                        ? 'bg-green-600 text-white'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {sendingReply ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : sendSuccess ? (
                      <>
                        <Check className="w-4 h-4" />
                        Sent!
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Reply
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : !isConnected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center mx-auto mb-6 border border-border">
                <Mail className="w-10 h-10 text-foreground-secondary" />
              </div>
              <h3 className="text-xl font-medium text-foreground mb-3">Connect Your Gmail</h3>
              <p className="text-sm text-foreground-secondary mb-6">
                Connect your Google account to access your Gmail inbox and manage your emails.
              </p>
              <a
                href={authUrl}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <img src="/images/google.svg" alt="" className="w-5 h-5" />
                Connect to Google
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-foreground-secondary">
            <div className="text-center">
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-foreground mb-2">Select an email</h3>
              <p className="text-sm">Choose an email from the list to view and reply</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">New Message</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-foreground-secondary hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs text-foreground-secondary mb-1">To *</label>
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-xs text-primary hover:text-primary/80 transition-colors"
              >
                {showCcBcc ? 'Hide' : 'Show'} Cc/Bcc
              </button>

              {showCcBcc && (
                <>
                  <div>
                    <label className="block text-xs text-foreground-secondary mb-1">Cc</label>
                    <input
                      type="email"
                      value={composeCc}
                      onChange={(e) => setComposeCc(e.target.value)}
                      placeholder="cc@example.com"
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-foreground-secondary mb-1">Bcc</label>
                    <input
                      type="email"
                      value={composeBcc}
                      onChange={(e) => setComposeBcc(e.target.value)}
                      placeholder="bcc@example.com"
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs text-foreground-secondary mb-1">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-foreground-secondary mb-1">Message *</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={12}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-foreground-secondary outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                />
              </div>

              {composeError && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {composeError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
              <button
                onClick={() => setShowCompose(false)}
                className="px-4 py-2 text-sm text-foreground-secondary hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleComposeSend}
                disabled={!composeTo.trim() || !composeBody.trim() || composeSending}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {composeSending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
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
