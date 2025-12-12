"use client"

import { useState } from "react"
import { Paperclip, Mic, Send, Sparkles } from "lucide-react"
import { ThinkingIndicator } from "./thinking-indicator"
import { VoiceToggle } from "./voice-toggle"

interface Email {
  id: string
  sender: string
  subject: string
  preview: string
  timestamp: string
  read: boolean
  body: string
  attachments?: string[]
}

const MOCK_EMAILS: Email[] = [
  {
    id: "1",
    sender: "John Mitchell",
    subject: "Q4 Proposal Review Needed",
    preview: "Hi, I wanted to get your thoughts on the updated proposal for the downtown project...",
    timestamp: "2:45 PM",
    read: false,
    body: `Hi,

I wanted to get your thoughts on the updated proposal for the downtown project. We've made significant revisions based on the client feedback from last week.

The key changes include:
- Updated timeline to accommodate their schedule
- Revised budget breakdown with more detail
- Added 3 alternative material options

Can you review and provide your approval by EOD Thursday?

Best regards,
John Mitchell
Project Manager`,
    attachments: ["Downtown-Proposal-v3.pdf", "Budget-Breakdown.xlsx"],
  },
  {
    id: "2",
    sender: "Sarah Chen",
    subject: "Weekly Team Performance Summary",
    preview: "Here's the weekly summary of our team's metrics. Overall performance is up 15% from last week...",
    timestamp: "11:30 AM",
    read: false,
    body: `Hi Team,

Here's the weekly summary of our team's metrics. Overall performance is up 15% from last week.

Key Highlights:
- Sales calls: 247 (up 12%)
- Conversion rate: 18.5% (up 3.2%)
- Average deal size: $128K (up 8%)
- Customer satisfaction: 4.8/5

Great work everyone! Let's keep this momentum going.

Sarah Chen
Team Lead`,
  },
  {
    id: "3",
    sender: "Mike Rodriguez",
    subject: "Re: Installation Schedule Conflict",
    preview: "Thanks for flagging this. I've coordinated with the warehouse team and we can shift...",
    timestamp: "Yesterday",
    read: true,
    body: `Thanks for flagging this. I've coordinated with the warehouse team and we can shift the installation to the following week.

New proposed dates:
- Site prep: March 15-16
- Main installation: March 18-20
- Final inspection: March 22

Does this work better for your schedule?

Mike`,
  },
  {
    id: "4",
    sender: "Emily Watson",
    subject: "Customer Feedback - Johnson Residence",
    preview: "Just received amazing feedback from the Johnson project. They specifically mentioned...",
    timestamp: "Yesterday",
    read: true,
    body: `Hi,

Just received amazing feedback from the Johnson project. They specifically mentioned the professionalism of our crew and the quality of the work.

They've already referred us to two of their neighbors who are interested in roof replacements.

Great job team!

Emily Watson
Customer Success`,
  },
]

export function EmailScreen() {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(MOCK_EMAILS[0])
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false)
  const [isThinking, setIsThinking] = useState(false)

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

  const agentAssist = selectedEmail
    ? {
        summary:
          "John is requesting urgent review of the updated downtown project proposal with revised timeline, budget, and material options.",
        actionItems: [
          "Review the attached proposal document",
          "Check the revised timeline against current schedule",
          "Approve or provide feedback by Thursday EOD",
        ],
        strategy:
          "This is a time-sensitive request from a project manager. Respond promptly with specific feedback or approval to keep the project moving forward.",
        draftReply: `Hi John,

Thanks for the updated proposal. I've reviewed the changes and they look good. The revised timeline works well with our schedule, and the additional material options give the client good flexibility.

Approved to proceed. Let's schedule a quick call tomorrow to discuss next steps.

Best,`,
      }
    : null

  return (
    <div className="flex h-full bg-background">
      {/* LEFT PANE - Email List */}
      <div className="w-96 border-r border-border flex flex-col bg-background">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-[#ececec]">Inbox</h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {MOCK_EMAILS.map((email) => (
            <button
              key={email.id}
              onClick={() => setSelectedEmail(email)}
              className={`w-full text-left p-4 border-b border-border/50 hover:bg-card/30 transition-colors ${
                selectedEmail?.id === email.id ? "bg-card/50" : ""
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`font-medium ${email.read ? "text-[#9b9b9b]" : "text-[#ececec]"}`}>
                  {email.sender}
                </span>
                <span className="text-xs text-[#9b9b9b]">{email.timestamp}</span>
              </div>
              <div className={`text-sm mb-1 ${email.read ? "text-[#9b9b9b]" : "text-[#ececec]"}`}>{email.subject}</div>
              <div className="text-xs text-[#9b9b9b] line-clamp-1">{email.preview}</div>
              {selectedEmail?.id === email.id && <div className="mt-2 h-0.5 bg-primary rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT PANE - Email Content + Agent Assist */}
      <div className="flex-1 flex flex-col bg-muted/60">
        {selectedEmail ? (
          <>
            {/* Email Content Window (top section) */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <h1 className="text-2xl font-semibold text-[#ececec] mb-2">{selectedEmail.subject}</h1>
                  <div className="flex items-center gap-4 text-sm text-[#9b9b9b]">
                    <span className="font-medium text-[#ececec]">{selectedEmail.sender}</span>
                    <span>{selectedEmail.timestamp}</span>
                  </div>
                </div>

                <div className="text-[#ececec] whitespace-pre-line mb-6 leading-relaxed">{selectedEmail.body}</div>

                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedEmail.attachments.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 bg-card border border-input rounded-lg text-sm text-[#ececec]"
                      >
                        <Paperclip className="w-4 h-4 text-[#9b9b9b]" />
                        {attachment}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Agent Assist Window (bottom section) */}
            {agentAssist && (
              <div className="border-t border-border bg-card/30 p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-[#ececec]">KO Agent Assist</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-[#ececec] mb-2">Summary</h4>
                      <p className="text-sm text-[#9b9b9b] leading-relaxed">{agentAssist.summary}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-[#ececec] mb-2">Action Items</h4>
                      <ul className="text-sm text-[#9b9b9b] space-y-1">
                        {agentAssist.actionItems.map((item, index) => (
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
                    <p className="text-sm text-[#9b9b9b] leading-relaxed">{agentAssist.strategy}</p>
                  </div>

                  <div className="bg-background rounded-lg border border-input p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-[#ececec]">Draft Reply</h4>
                      <div className="flex gap-2">
                        <button className="text-xs px-3 py-1 bg-card border border-input rounded-md text-[#ececec] hover:bg-muted transition-colors">
                          Make it shorter
                        </button>
                        <button className="text-xs px-3 py-1 bg-card border border-input rounded-md text-[#ececec] hover:bg-muted transition-colors">
                          More formal
                        </button>
                        <button className="text-xs px-3 py-1 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">
                          Insert Reply
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-[#9b9b9b] whitespace-pre-line leading-relaxed">
                      {agentAssist.draftReply}
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                  placeholder="Ask KO…"
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
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#9b9b9b]">Select an email to view</div>
        )}
      </div>
    </div>
  )
}
