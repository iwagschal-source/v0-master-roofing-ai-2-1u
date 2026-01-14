"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  ArrowLeft,
  Activity,
  FileText,
  Shield,
  Target,
  Eye,
  History,
  Terminal,
  Brain,
  Map,
  Calendar,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Network,
  Users,
  Bot,
  Database,
  Pencil,
  Bell,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Save,
  Loader2,
  MessageSquare,
  Send,
  Paperclip,
  X,
  File,
  Image as ImageIcon,
} from "lucide-react"
import { statusConfig, agents, getAgentById } from "@/data/agent-data"
import { AgentModelIcon, StatusDot, QueueIndicator } from "./agent-model-icon"

export function AgentDetailScreen({ agent, onBack, onClone, onOpenNetwork }) {
  const [activeTab, setActiveTab] = useState("overview")
  const [agentConfig, setAgentConfig] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const status = statusConfig[agent.status]

  // Fetch agent config from backend
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`/api/ko/agents/config/${agent.id}`)
        if (res.ok) {
          const data = await res.json()
          setAgentConfig(data)
        }
      } catch (err) {
        console.error('Failed to fetch agent config:', err)
      }
    }
    fetchConfig()
  }, [agent.id])

  // Action handlers
  const handleRestart = async () => {
    setActionLoading('restart')
    try {
      const res = await fetch(`/api/ko/agents/${agent.id}/restart`, { method: 'POST' })
      if (res.ok) {
        alert('Agent restarted successfully')
      }
    } catch (err) {
      console.error('Failed to restart agent:', err)
    }
    setActionLoading(null)
  }

  const handleEnable = async () => {
    setActionLoading('enable')
    try {
      const res = await fetch(`/api/ko/agents/${agent.id}/enable`, { method: 'POST' })
      if (res.ok) {
        alert('Agent enabled')
      }
    } catch (err) {
      console.error('Failed to enable agent:', err)
    }
    setActionLoading(null)
  }

  const handleDisable = async () => {
    setActionLoading('disable')
    try {
      const res = await fetch(`/api/ko/agents/${agent.id}/disable`, { method: 'POST' })
      if (res.ok) {
        alert('Agent disabled')
      }
    } catch (err) {
      console.error('Failed to disable agent:', err)
    }
    setActionLoading(null)
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "chat", label: "Chat", icon: MessageSquare },
    { id: "readme", label: "README", icon: FileText },
    { id: "permissions", label: "Permissions", icon: Shield },
    { id: "scoring", label: "Scoring", icon: Target },
    { id: "monitoring", label: "Monitoring", icon: Eye },
    { id: "history", label: "History", icon: History },
    { id: "logs", label: "Live Logs", icon: Terminal },
    { id: "training", label: "Training", icon: Brain },
    { id: "mapping", label: "Mapping", icon: Map },
    { id: "schedule", label: "Schedule", icon: Calendar },
    { id: "settings", label: "Settings", icon: Settings },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        {/* Back link */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} />
          Back to agents
        </button>

        {/* Agent header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <div className="relative">
              <AgentModelIcon modelKey={agent.modelKey} size="lg" />
              <div
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card ${status.color} ${status.animation}`}
              />
            </div>

            {/* Info */}
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{agent.name}</h1>
                <span
                  className={`px-2.5 py-1 rounded text-xs font-bold tracking-wider ${status.color} text-white`}
                >
                  {status.label}
                </span>
                {agent.queueDepth > 0 && <QueueIndicator depth={agent.queueDepth} />}
              </div>
              <p className="text-muted-foreground mt-1">{agent.description}</p>
              <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                <span className="font-mono text-muted-foreground">{agent.id}</span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground">{agent.model}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {agent.status === "live" && (
              <button
                onClick={handleDisable}
                disabled={actionLoading === 'disable'}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg font-medium text-sm hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'disable' ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />}
                Pause
              </button>
            )}
            {(agent.status === "offline" || agent.status === "paused") && (
              <button
                onClick={handleEnable}
                disabled={actionLoading === 'enable'}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg font-medium text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                {actionLoading === 'enable' ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Start
              </button>
            )}
            <button
              onClick={handleRestart}
              disabled={actionLoading === 'restart'}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg font-medium text-sm hover:bg-accent transition-colors disabled:opacity-50"
            >
              {actionLoading === 'restart' ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />}
              Restart
            </button>
            <button
              onClick={() => onClone?.(agent)}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground rounded-lg font-medium text-sm hover:bg-accent transition-colors"
            >
              <Copy size={16} />
              Clone
            </button>
            <button
              onClick={onOpenNetwork}
              className="p-2 bg-secondary text-foreground rounded-lg hover:bg-accent transition-colors"
              title="View in Network"
            >
              <Network size={18} />
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-8 mt-6 pt-4 border-t border-border flex-wrap">
          <div>
            <p className="text-2xl font-bold text-foreground">
              {agent.stats.totalRequests.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total Requests</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{agent.stats.successRate}%</p>
            <p className="text-xs text-muted-foreground">Success Rate</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-400">{agent.stats.avgLatency}ms</p>
            <p className="text-xs text-muted-foreground">Avg Latency</p>
          </div>
          <div>
            <p
              className={`text-2xl font-bold ${
                agent.stats.errorsToday > 0 ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {agent.stats.errorsToday}
            </p>
            <p className="text-xs text-muted-foreground">Errors Today</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{agent.connections?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Connections</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">{agent.stats.requestsPerMinute || 0}</p>
            <p className="text-xs text-muted-foreground">Req/min</p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-card border-b border-border overflow-x-auto">
        <nav className="flex gap-1 px-6 min-w-max">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <main className="flex-1 overflow-auto p-6">
        {activeTab === "overview" && <OverviewTab agent={agent} />}
        {activeTab === "chat" && <ChatTab agent={agent} />}
        {activeTab === "readme" && <ReadmeTab agent={agent} agentConfig={agentConfig} setAgentConfig={setAgentConfig} />}
        {activeTab === "permissions" && <PermissionsTab agent={agent} />}
        {activeTab === "scoring" && <ScoringTab agent={agent} />}
        {activeTab === "monitoring" && <MonitoringTab agent={agent} />}
        {activeTab === "history" && <HistoryTab agent={agent} />}
        {activeTab === "logs" && <LogsTab agent={agent} />}
        {activeTab === "training" && <TrainingTab agent={agent} />}
        {activeTab === "mapping" && <MappingTab agent={agent} />}
        {activeTab === "schedule" && <ScheduleTab agent={agent} />}
        {activeTab === "settings" && <SettingsTab agent={agent} />}
      </main>
    </div>
  )
}

// Tab Components

function OverviewTab({ agent }) {
  const status = statusConfig[agent.status]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Current Activity */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity size={18} className={status.textColor} />
          Current Activity
        </h2>
        <div
          className={`p-4 rounded-lg ${
            agent.status === "error"
              ? "bg-red-500/10 border border-red-500/20"
              : "bg-secondary"
          }`}
        >
          <p
            className={`font-mono text-sm ${
              agent.status === "error" ? "text-red-400" : "text-foreground"
            }`}
          >
            {agent.currentAction}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Last activity: {new Date(agent.lastActivity).toLocaleString()}
        </p>
      </div>

      {/* Connections */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Network size={18} />
          Connected Agents ({agent.connections?.length || 0})
        </h2>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {agent.connections?.map((conn, idx) => {
            // Handle both string IDs and object connections { targetId, type, label }
            const targetId = typeof conn === 'string' ? conn : conn.targetId
            const connAgent = getAgentById(targetId)
            const connLabel = typeof conn === 'object' ? conn.label : null
            return (
              <div
                key={targetId || idx}
                className="flex items-center justify-between p-3 bg-secondary rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <StatusDot status={connAgent?.status || "offline"} size="md" />
                  <span className="font-mono text-sm">{targetId}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-muted-foreground block">
                    {connAgent?.name || "Unknown"}
                  </span>
                  {connLabel && (
                    <span className="text-xs text-primary/70">{connLabel}</span>
                  )}
                </div>
              </div>
            )
          })}
          {(!agent.connections || agent.connections.length === 0) && (
            <p className="text-sm text-muted-foreground">No connections configured</p>
          )}
        </div>
      </div>

      {/* Audited By */}
      {agent.auditedBy && agent.auditedBy.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Eye size={18} className="text-purple-400" />
            Audited By
          </h2>
          <div className="space-y-2">
            {agent.auditedBy.map((auditorId) => {
              const auditor = getAgentById(auditorId)
              return (
                <div
                  key={auditorId}
                  className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Eye size={16} className="text-purple-400" />
                    <span className="font-mono text-sm">{auditorId}</span>
                  </div>
                  <span className="text-xs text-purple-400">{auditor?.name || "Auditor"}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ReadmeTab({ agent, agentConfig, setAgentConfig }) {
  const [activePrompt, setActivePrompt] = useState(null)
  const [editedContent, setEditedContent] = useState("")
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [editMode, setEditMode] = useState("manual") // "manual", "designer", "koprime"

  // Get prompts from backend config or fallback to static
  const prompts = agentConfig?.prompts || {}
  const promptKeys = Object.keys(prompts)

  // Set initial prompt on load
  useEffect(() => {
    if (promptKeys.length > 0 && !activePrompt) {
      setActivePrompt(promptKeys[0])
      setEditedContent(prompts[promptKeys[0]] || "")
    }
  }, [prompts, promptKeys, activePrompt])

  const handlePromptChange = (key) => {
    setActivePrompt(key)
    setEditedContent(prompts[key] || "")
    setHasChanges(false)
  }

  const handleContentChange = (e) => {
    setEditedContent(e.target.value)
    setHasChanges(e.target.value !== prompts[activePrompt])
  }

  const handleSave = async () => {
    if (!activePrompt) return
    setSaving(true)
    try {
      const res = await fetch(`/api/ko/agents/config/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: { [activePrompt]: editedContent }
        })
      })
      if (res.ok) {
        const data = await res.json()
        setAgentConfig(data.config)
        setHasChanges(false)
        alert('Prompt saved successfully!')
      } else {
        alert('Failed to save prompt')
      }
    } catch (err) {
      console.error('Failed to save:', err)
      alert('Failed to save prompt')
    }
    setSaving(false)
  }

  if (!agentConfig) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading configuration...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setEditMode("manual")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            editMode === "manual"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil size={16} />
          Edit Manually
        </button>
        <button
          onClick={() => setEditMode("designer")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            editMode === "designer"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <Brain size={16} />
          Prompt Designer
        </button>
        <button
          onClick={() => setEditMode("koprime")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            editMode === "koprime"
              ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot size={16} />
          KO Prime Assistant
        </button>
      </div>

      {/* Manual Editor */}
      {editMode === "manual" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Prompt tabs */}
          <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 border-b border-border">
            <div className="flex items-center gap-1 overflow-x-auto">
              {promptKeys.map((key) => (
                <button
                  key={key}
                  onClick={() => handlePromptChange(key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors whitespace-nowrap ${
                    activePrompt === key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  {key}
                </button>
              ))}
            </div>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
          </div>

          {/* Editor */}
          <div className="p-4 bg-background/50">
            <textarea
              value={editedContent}
              onChange={handleContentChange}
              className="w-full h-96 bg-transparent text-foreground font-mono text-sm focus:outline-none resize-none border border-transparent focus:border-primary/50 rounded p-2"
              placeholder="Enter prompt content..."
            />
          </div>

          {/* Status bar */}
          <div className="px-4 py-2 bg-secondary/30 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {agentConfig.updated_at
                ? `Last updated: ${new Date(agentConfig.updated_at).toLocaleString()}`
                : "Not yet saved"}
            </span>
            {hasChanges && (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle size={12} />
                Unsaved changes
              </span>
            )}
          </div>
        </div>
      )}

      {/* Prompt Designer Chat */}
      {editMode === "designer" && (
        <PromptDesignerChat
          agentId={agent.id}
          agentName={agent.name}
          onPromptSaved={() => {
            // Refresh config after save
            fetch(`/api/ko/agents/config/${agent.id}`)
              .then(res => res.json())
              .then(data => setAgentConfig(data))
              .catch(err => console.error('Failed to refresh config:', err))
          }}
        />
      )}

      {/* KO Prime Assistant - Test & Iterate */}
      {editMode === "koprime" && (
        <KOPrimeAssistantChat
          agentId={agent.id}
          agentName={agent.name}
          onConfigUpdated={() => {
            // Refresh config after update
            fetch(`/api/ko/agents/config/${agent.id}`)
              .then(res => res.json())
              .then(data => setAgentConfig(data))
              .catch(err => console.error('Failed to refresh config:', err))
          }}
        />
      )}
    </div>
  )
}

// Prompt Designer Chat Component
function PromptDesignerChat({ agentId, agentName, onPromptSaved }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `designer-${agentId}-${Date.now()}`)
  const messagesEndRef = useCallback((node) => {
    if (node) node.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input.trim(), timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch('/api/ko/prompt-designer/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage.content,
          target_agent_id: agentId
        })
      })

      const data = await res.json()

      if (res.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          saved: data.saved,
          savedTo: data.saved_to
        }])

        // If prompt was saved, trigger refresh
        if (data.saved && onPromptSaved) {
          onPromptSaved()
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.detail || 'Unknown error'}`,
          timestamp: new Date(),
          isError: true
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Connection Error: ${err.message}`,
        timestamp: new Date(),
        isError: true
      }])
    }

    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-border flex items-center gap-3">
        <Brain size={18} className="text-purple-400" />
        <span className="font-medium">Prompt Designer for {agentName}</span>
        <span className="text-xs text-muted-foreground ml-auto">Powered by Opus 4</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Brain size={40} className="mx-auto mb-3 opacity-50 text-purple-400" />
            <p className="font-medium">Design prompts with AI assistance</p>
            <p className="text-xs mt-2">Describe what you want this agent to do. I'll help you create a proper prompt.</p>
            <p className="text-xs mt-1">When you're happy, just say "save it" and I'll update the config.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : msg.isError
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : msg.saved
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-secondary text-foreground'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">
                {msg.content}
              </div>
              <div className={`text-xs mt-2 flex items-center gap-2 ${
                msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {new Date(msg.timestamp).toLocaleTimeString()}
                {msg.saved && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle size={12} />
                    Saved to {msg.savedTo?.field}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg p-3 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-purple-400" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want... e.g., 'I want a methodology that finds project contacts from emails'"
            rows={2}
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// KO Prime Assistant Chat Component - Test & Iterate on Prompts
function KOPrimeAssistantChat({ agentId, agentName, onConfigUpdated }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([])
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useCallback((node) => {
    if (node) node.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsUploading(true)
    const newFiles = []

    for (const file of files) {
      let content = null
      let preview = null

      if (file.type.startsWith('text/') ||
          file.name.endsWith('.csv') ||
          file.name.endsWith('.json') ||
          file.name.endsWith('.md')) {
        content = await file.text()
        preview = content.substring(0, 500) + (content.length > 500 ? '...' : '')
      } else if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      newFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        content,
        preview,
        file,
      })
    }

    setAttachedFiles(prev => [...prev, ...newFiles])
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const getFileIcon = (file) => {
    if (file.type?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (file.name?.endsWith('.csv') || file.name?.endsWith('.json')) return <FileText className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const sendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || loading) return

    // Build message with file content
    let messageContent = input.trim()
    const fileContext = attachedFiles.filter(f => f.content).map(f => ({
      name: f.name,
      content: f.content
    }))

    if (fileContext.length > 0) {
      messageContent += `\n\n[Attached files: ${fileContext.map(f => f.name).join(', ')}]\n\nFile contents:\n${fileContext.map(f => `--- ${f.name} ---\n${f.content.substring(0, 10000)}`).join('\n\n')}`
    }

    const userMessage = {
      role: 'user',
      content: input.trim() || `Uploaded ${attachedFiles.length} file(s)`,
      attachments: attachedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setAttachedFiles([])
    setLoading(true)

    try {
      const res = await fetch('/api/ko/ko-prime/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageContent,
          conversation_history: conversationHistory,
          target_agent_id: agentId  // This gives KO Prime context about the agent
        })
      })

      const data = await res.json()

      if (res.ok) {
        // Update conversation history for context
        setConversationHistory(prev => [
          ...prev,
          { role: "user", content: userMessage.content },
          { role: "assistant", content: data.response }
        ])

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          toolsUsed: data.tools_used || [],
          configUpdated: data.tools_used?.some(t => t.tool === 'update_agent_prompt')
        }])

        // If config was updated, refresh it
        if (data.tools_used?.some(t => t.tool === 'update_agent_prompt') && onConfigUpdated) {
          onConfigUpdated()
        }
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Error: ${data.error || 'Unknown error'}`,
          timestamp: new Date(),
          isError: true
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Connection Error: ${err.message}`,
        timestamp: new Date(),
        isError: true
      }])
    }

    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-b border-border flex items-center gap-3">
        <Bot size={18} className="text-purple-400" />
        <span className="font-medium">KO Prime Assistant for {agentName}</span>
        <span className="text-xs text-muted-foreground ml-auto">Test • Iterate • Save</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Bot size={40} className="mx-auto mb-3 opacity-50 text-purple-400" />
            <p className="font-medium">KO Prime can help you improve this agent</p>
            <p className="text-xs mt-2">I can test the agent, analyze results, and update prompts.</p>
            <div className="mt-4 text-left max-w-md mx-auto bg-secondary/50 rounded-lg p-3 text-xs">
              <p className="font-medium text-foreground mb-2">Try asking:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• "Test this agent with a query about project emails"</li>
                <li>• "Show me the current prompts for this agent"</li>
                <li>• "Make the methodology return shorter summaries"</li>
                <li>• "Test if the changes improved the output"</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : msg.isError
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : msg.configUpdated
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-foreground'
              }`}
            >
              {/* Attachments for user messages */}
              {msg.role === 'user' && msg.attachments?.length > 0 && (
                <div className="mb-2 pb-2 border-b border-primary-foreground/20 flex flex-wrap gap-1.5">
                  {msg.attachments.map((file, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-primary-foreground/10 rounded px-2 py-0.5">
                      <Paperclip size={10} />
                      {file.name}
                    </span>
                  ))}
                </div>
              )}
              {/* Tools used badge */}
              {msg.toolsUsed?.length > 0 && (
                <div className="mb-2 pb-2 border-b border-purple-500/30">
                  <span className="text-xs text-purple-400 font-medium">Tools: </span>
                  <span className="text-xs text-muted-foreground">
                    {msg.toolsUsed.map(t => t.tool).join(' → ')}
                  </span>
                </div>
              )}
              {msg.configUpdated && (
                <div className="mb-2 pb-2 border-b border-emerald-500/30 flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">Config Updated!</span>
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm">
                {msg.content}
              </div>
              <div className={`text-xs mt-2 ${
                msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-lg p-3 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-purple-400" />
              <span className="text-sm text-muted-foreground">KO Prime is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-secondary/30">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachedFiles.map(file => (
              <div
                key={file.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg text-sm"
              >
                {getFileIcon(file)}
                <span className="text-foreground max-w-[120px] truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".csv,.json,.txt,.md,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
            className="hidden"
          />

          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || loading}
            className="p-2 text-muted-foreground hover:text-purple-400 transition-colors disabled:opacity-50"
            title="Attach files"
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachedFiles.length > 0 ? "Add a message about these files..." : `Ask KO Prime to test or improve ${agentName}...`}
            rows={2}
            className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={(!input.trim() && attachedFiles.length === 0) || loading}
            className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}

function PermissionsTab({ agent }) {
  return (
    <div className="space-y-6">
      {/* Read Access */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Database size={18} className="text-blue-400" />
          Read Access
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agent.permissions?.readAccess?.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    item.enabled ? "bg-emerald-500" : "bg-gray-500"
                  }`}
                />
                <span className="text-sm font-medium">{item.resource}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.scope}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Write Access */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Pencil size={18} className="text-amber-400" />
          Write Access
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agent.permissions?.writeAccess?.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    item.enabled ? "bg-amber-500" : "bg-gray-500"
                  }`}
                />
                <span className="text-sm font-medium">{item.resource}</span>
              </div>
              <span className="text-xs text-muted-foreground">{item.scope}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User Synteraction */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Users size={18} className="text-purple-400" />
          User Synteraction
        </h2>
        <div className="space-y-2">
          {agent.permissions?.userSynteraction?.map((user, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <span className="text-purple-400 text-xs font-bold">{user.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {user.canInitiate && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                    Can Initiate
                  </span>
                )}
                {user.canReceive && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                    Can Receive
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Synteraction */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Bot size={18} className="text-cyan-400" />
          Agent Synteraction
        </h2>
        <div className="space-y-2">
          {agent.permissions?.agentSynteraction?.map((agentPerm, idx) => {
            const targetAgent = getAgentById(agentPerm.agentId)
            return (
              <div key={idx} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center">
                    <Bot size={14} className="text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{targetAgent?.name || agentPerm.agentId}</p>
                    <p className="text-xs text-muted-foreground font-mono">{agentPerm.agentId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {agentPerm.canCall && (
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                      Can Call
                    </span>
                  )}
                  {agentPerm.canReceiveFrom && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                      Receives From
                    </span>
                  )}
                  {agentPerm.priority && (
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                      P{agentPerm.priority}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ScoringTab({ agent }) {
  return (
    <div className="space-y-6">
      {/* Current Score */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target size={18} className="text-emerald-400" />
          Current Score
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-secondary rounded-lg text-center">
            <p className="text-3xl font-bold text-emerald-400">{agent.scoring?.overallScore || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Overall</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg text-center">
            <p className="text-3xl font-bold text-blue-400">{agent.scoring?.accuracyScore || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg text-center">
            <p className="text-3xl font-bold text-purple-400">{agent.scoring?.latencyScore || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Latency</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg text-center">
            <p className="text-3xl font-bold text-amber-400">{agent.scoring?.reliabilityScore || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Reliability</p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Scoring Metrics</h2>
        <div className="space-y-4">
          {agent.scoring?.metrics?.map((metric, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div>
                <p className="font-medium">{metric.name}</p>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm">Weight: {metric.weight}%</p>
                <p className="text-xs text-muted-foreground">Threshold: {metric.threshold}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation Schedule */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Evaluation Schedule</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Frequency</p>
            <p className="font-medium">{agent.scoring?.evaluationFrequency || "Not set"}</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Last Evaluation</p>
            <p className="font-medium">{agent.scoring?.lastEvaluation || "Never"}</p>
          </div>
          <div className="p-4 bg-secondary rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Next Evaluation</p>
            <p className="font-medium">{agent.scoring?.nextEvaluation || "N/A"}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MonitoringTab({ agent }) {
  return (
    <div className="space-y-6">
      {/* Auditors */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Eye size={18} className="text-purple-400" />
          Auditors & Monitors
        </h2>
        <div className="space-y-3">
          {agent.monitoring?.auditors?.map((auditor, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                {auditor.type === "user" ? (
                  <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <Users size={18} className="text-purple-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                    <Bot size={18} className="text-cyan-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{auditor.name}</p>
                  <p className="text-xs text-muted-foreground">{auditor.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Since</p>
                  <p className="text-sm">{auditor.since}</p>
                </div>
                <StatusDot status={auditor.active ? "live" : "offline"} size="md" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Bell size={18} />
          Alert Configuration
        </h2>
        <div className="space-y-3">
          {agent.monitoring?.alerts?.map((alert, idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div>
                <p className="font-medium">{alert.type}</p>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">{alert.threshold}</span>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    alert.enabled
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {alert.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Notification Channels</h2>
        <div className="flex flex-wrap gap-3">
          {agent.monitoring?.channels?.map((channel, idx) => (
            <div key={idx} className="flex items-center gap-2 px-4 py-2 bg-secondary rounded-lg">
              <div
                className={`w-2 h-2 rounded-full ${
                  channel.enabled ? "bg-emerald-500" : "bg-gray-500"
                }`}
              />
              <span className="text-sm font-medium">{channel.type}</span>
              <span className="text-xs text-muted-foreground">→ {channel.target}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function HistoryTab({ agent }) {
  const eventTypeIcon = {
    info: <Clock size={12} className="text-blue-400" />,
    success: <CheckCircle size={12} className="text-emerald-400" />,
    warning: <AlertTriangle size={12} className="text-amber-400" />,
    error: <XCircle size={12} className="text-red-400" />,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Executions</p>
          <p className="text-2xl font-bold">{agent.history?.totalExecutions?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">First Active</p>
          <p className="text-2xl font-bold">{agent.history?.firstActive || "N/A"}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Uptime</p>
          <p className="text-2xl font-bold text-emerald-400">{agent.history?.uptimePercent || 0}%</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Errors</p>
          <p className="text-2xl font-bold text-red-400">{agent.history?.totalErrors?.toLocaleString() || 0}</p>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <History size={18} />
          Recent Events
        </h2>
        <div className="space-y-2">
          {agent.history?.recentEvents?.map((event, idx) => (
            <div key={idx} className="flex items-start gap-4 p-3 bg-secondary rounded-lg">
              <div className="mt-0.5">{eventTypeIcon[event.type] || eventTypeIcon.info}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{event.message}</p>
                  <span className="text-xs text-muted-foreground">{event.timestamp}</span>
                </div>
                {event.details && (
                  <p className="text-xs text-muted-foreground mt-1">{event.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Version History */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4">Version History</h2>
        <div className="space-y-3">
          {agent.history?.versions?.map((version, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold">{version.version}</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    idx === 0
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}
                >
                  {idx === 0 ? "Current" : "Previous"}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm">{version.date}</p>
                <p className="text-xs text-muted-foreground">{version.changes}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LogsTab({ agent }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const logsEndRef = useCallback((node) => {
    if (node) node.scrollTop = node.scrollHeight
  }, [])

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/ko/agents/${agent.id}/logs?limit=100`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    }
    setLoading(false)
  }, [agent.id])

  // Initial fetch and polling
  useEffect(() => {
    fetchLogs()

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 3000) // Poll every 3 seconds
      return () => clearInterval(interval)
    }
  }, [fetchLogs, autoRefresh])

  // Format timestamp
  const formatTime = (ts) => {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', { hour12: false })
  }

  // Level colors
  const levelColors = {
    info: 'text-blue-400',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Terminal size={18} />
          Live Logs
        </h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchLogs}
            className="px-3 py-1 text-xs bg-secondary rounded hover:bg-accent transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div
        ref={logsEndRef}
        className="bg-gray-950 rounded-lg p-4 font-mono text-xs h-96 overflow-auto"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground">No logs yet. Activity will appear here when the agent processes requests.</p>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="flex gap-2 py-0.5">
              <span className="text-muted-foreground shrink-0">[{formatTime(log.timestamp)}]</span>
              <span className={`shrink-0 w-16 ${levelColors[log.level] || 'text-gray-400'}`}>
                {log.level.toUpperCase()}
              </span>
              <span className={levelColors[log.level] || 'text-gray-300'}>
                {log.message}
              </span>
            </div>
          ))
        )}
        {autoRefresh && logs.length > 0 && (
          <div className="mt-2 text-muted-foreground animate-pulse">
            --- Watching for new events ---
          </div>
        )}
      </div>
    </div>
  )
}

function ChatTab({ agent }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [conversationHistory, setConversationHistory] = useState([])
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const messagesEndRef = useCallback((node) => {
    if (node) node.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Determine if this is KO Prime for special handling
  const isKOPrime = agent.id === "CAO-PRIME-001"

  // Handle file selection
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setIsUploading(true)
    const newFiles = []

    for (const file of files) {
      let content = null
      let preview = null

      if (file.type.startsWith('text/') ||
          file.name.endsWith('.csv') ||
          file.name.endsWith('.json') ||
          file.name.endsWith('.md')) {
        content = await file.text()
        preview = content.substring(0, 500) + (content.length > 500 ? '...' : '')
      } else if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      newFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        content,
        preview,
        file,
      })
    }

    setAttachedFiles(prev => [...prev, ...newFiles])
    setIsUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const getFileIcon = (file) => {
    if (file.type?.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (file.name?.endsWith('.csv') || file.name?.endsWith('.json')) return <FileText className="w-4 h-4" />
    return <File className="w-4 h-4" />
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const sendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || loading) return

    // Build message with file content
    let messageContent = input.trim()
    const fileContext = attachedFiles.filter(f => f.content).map(f => ({
      name: f.name,
      content: f.content
    }))

    if (fileContext.length > 0) {
      messageContent += `\n\n[Attached files: ${fileContext.map(f => f.name).join(', ')}]\n\nFile contents:\n${fileContext.map(f => `--- ${f.name} ---\n${f.content.substring(0, 10000)}`).join('\n\n')}`
    }

    const userMessage = {
      role: 'user',
      content: input.trim() || `Uploaded ${attachedFiles.length} file(s)`,
      attachments: attachedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setAttachedFiles([])
    setLoading(true)

    try {
      // Use KO Prime endpoint for super agent, otherwise generic endpoint
      const endpoint = isKOPrime
        ? '/api/ko/ko-prime/chat'
        : `/api/ko/agents/${agent.id}/chat`

      const body = isKOPrime
        ? { message: messageContent, conversation_history: conversationHistory }
        : { message: messageContent }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()

      if (res.ok) {
        let responseContent = ""
        let toolsUsed = []

        // Handle KO Prime response format
        if (isKOPrime) {
          responseContent = data.response || "No response"
          toolsUsed = data.tools_used || []

          // Update conversation history for context
          setConversationHistory(prev => [
            ...prev,
            { role: "user", content: userMessage.content },
            { role: "assistant", content: responseContent }
          ])
        } else {
          // Format the response based on result type (non-KO Prime agents)
          const result = data.result

          if (result?.type === "sql") {
            responseContent = `**SQL Query:**\n\`\`\`sql\n${result.sql}\n\`\`\`\n\n**Results:** ${result.rows?.length || 0} rows returned`
            if (result.rows?.length > 0) {
              responseContent += `\n\n\`\`\`json\n${JSON.stringify(result.rows.slice(0, 5), null, 2)}\n\`\`\``
            }
          } else if (result?.type === "documents") {
            responseContent = `**Found ${result.documents?.length || 0} documents**\n\n${result.summary || ""}`
            if (result.documents?.length > 0) {
              responseContent += "\n\n" + result.documents.slice(0, 3).map(d => `- ${d.file_name || d.title || 'Document'}`).join("\n")
            }
          } else if (result?.type === "crm") {
            const crm = result.crm_data
            responseContent = `**CRM Query Results**\n\nTotal: ${crm?.total || 0} records\nObject: ${crm?.object_type || 'deals'}`
            if (crm?.results?.length > 0) {
              responseContent += "\n\n" + crm.results.slice(0, 5).map(r => `- ${r.properties?.dealname || r.properties?.name || r.id}`).join("\n")
            }
            if (crm?.error) {
              responseContent = `**Error:** ${crm.error}\n\n${crm.details || ''}`
            }
          } else if (result?.type === "routing") {
            const r = result.routing
            responseContent = `**Routing Decision**\n\nTools: ${r?.tools?.join(", ") || 'none'}\nConfidence: ${r?.confidence || 0}\nReasoning: ${r?.reasoning || 'N/A'}`
          } else if (result?.type === "ceo_response") {
            responseContent = result.response || "No response generated"
          } else if (result?.type === "dashboard") {
            responseContent = `**Dashboards Available:** ${result.dashboards?.length || 0}`
          } else {
            responseContent = JSON.stringify(result, null, 2)
          }
        }

        setMessages(prev => [...prev, {
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          type: isKOPrime ? 'ko_prime' : data.result?.type,
          toolsUsed: toolsUsed
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `**Error:** ${data.error || 'Unknown error'}`,
          timestamp: new Date(),
          isError: true
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `**Connection Error:** ${err.message}`,
        timestamp: new Date(),
        isError: true
      }])
    }

    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className={`px-4 py-3 border-b border-border flex items-center gap-3 ${
        isKOPrime
          ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20'
          : 'bg-secondary/50'
      }`}>
        <MessageSquare size={18} className={isKOPrime ? "text-purple-400" : "text-primary"} />
        <span className="font-medium">
          {isKOPrime ? 'KO Prime - Super Agent' : `Direct Chat with ${agent.name}`}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {isKOPrime ? 'Full tool access • Powered by Opus 4' : 'Bypasses orchestrator'}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            {isKOPrime ? (
              <>
                <Brain size={40} className="mx-auto mb-3 opacity-50 text-purple-400" />
                <p className="font-medium">KO Prime - Chief Intelligence Agent</p>
                <p className="text-xs mt-2">Ask anything about your business data.</p>
                <p className="text-xs mt-1 text-purple-400/70">
                  I can query BigQuery, search documents, access HubSpot, and read emails.
                </p>
              </>
            ) : (
              <>
                <Bot size={40} className="mx-auto mb-3 opacity-50" />
                <p>Send a message to chat directly with this agent</p>
                <p className="text-xs mt-2">Try asking a question related to this agent's specialty</p>
              </>
            )}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : msg.isError
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : msg.type === 'ko_prime'
                      ? 'bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-foreground'
                      : 'bg-secondary text-foreground'
              }`}
            >
              {/* Attachments for user messages */}
              {msg.role === 'user' && msg.attachments?.length > 0 && (
                <div className="mb-2 pb-2 border-b border-primary-foreground/20 flex flex-wrap gap-1.5">
                  {msg.attachments.map((file, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-primary-foreground/10 rounded px-2 py-0.5">
                      <Paperclip size={10} />
                      {file.name}
                    </span>
                  ))}
                </div>
              )}
              {/* Tools used badge for KO Prime */}
              {msg.toolsUsed?.length > 0 && (
                <div className="mb-2 pb-2 border-b border-purple-500/30">
                  <span className="text-xs text-purple-400 font-medium">Tools used: </span>
                  <span className="text-xs text-muted-foreground">
                    {msg.toolsUsed.map(t => t.tool).join(' → ')}
                  </span>
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm font-mono">
                {msg.content}
              </div>
              <div className={`text-xs mt-2 ${
                msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
              }`}>
                {new Date(msg.timestamp).toLocaleTimeString()}
                {msg.type && <span className="ml-2 opacity-70">({msg.type})</span>}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-lg p-3 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm text-muted-foreground">Processing...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border bg-secondary/30">
        {/* Attached Files Preview */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {attachedFiles.map(file => (
              <div
                key={file.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  isKOPrime
                    ? 'bg-purple-500/20 border border-purple-500/30'
                    : 'bg-primary/20 border border-primary/30'
                }`}
              >
                {getFileIcon(file)}
                <span className="text-foreground max-w-[120px] truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-muted-foreground hover:text-foreground ml-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".csv,.json,.txt,.md,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
            className="hidden"
          />

          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || loading}
            className={`p-2 transition-colors disabled:opacity-50 ${
              isKOPrime
                ? 'text-muted-foreground hover:text-purple-400'
                : 'text-muted-foreground hover:text-primary'
            }`}
            title="Attach files"
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={attachedFiles.length > 0 ? "Add a message about these files..." : `Ask ${agent.name} something...`}
            rows={1}
            className={`flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 resize-none ${
              isKOPrime ? 'focus:ring-purple-500' : 'focus:ring-primary'
            }`}
          />
          <button
            onClick={sendMessage}
            disabled={(!input.trim() && attachedFiles.length === 0) || loading}
            className={`p-3 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isKOPrime
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}

function TrainingTab({ agent }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-semibold text-foreground mb-6 flex items-center gap-2">
        <Brain size={18} />
        Training Configuration
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Last Trained</p>
          <p className="text-lg font-semibold text-foreground">{agent.training?.lastTrained || "Never"}</p>
        </div>
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Dataset Version</p>
          <p className="text-lg font-semibold text-foreground">{agent.training?.datasetVersion || "N/A"}</p>
        </div>
        <div className="p-4 bg-secondary rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Accuracy</p>
          <p className="text-lg font-semibold text-emerald-400">{agent.training?.accuracy || 0}%</p>
        </div>
      </div>
      <button className="mt-6 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors">
        <RotateCcw size={16} />
        Retrain Agent
      </button>
    </div>
  )
}

function MappingTab({ agent }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-semibold text-foreground mb-6 flex items-center gap-2">
        <Map size={18} />
        Input/Output Mapping
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Input Sources</h3>
          <div className="space-y-2">
            {agent.mapping?.inputSources?.map((source, idx) => (
              <div key={idx} className="p-3 bg-secondary rounded-lg text-sm">
                {source}
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">Output Targets</h3>
          <div className="space-y-2">
            {agent.mapping?.outputTargets?.map((target, idx) => (
              <div key={idx} className="p-3 bg-secondary rounded-lg text-sm">
                {target}
              </div>
            ))}
          </div>
        </div>
      </div>
      {agent.mapping?.routingRules > 0 && (
        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <p className="text-sm text-primary">
            This agent has <strong>{agent.mapping.routingRules}</strong> active routing rules
          </p>
        </div>
      )}
    </div>
  )
}

function ScheduleTab({ agent }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-semibold text-foreground mb-6 flex items-center gap-2">
        <Calendar size={18} />
        Schedule
      </h2>
      <div className="p-4 bg-secondary rounded-lg">
        <p className="text-lg font-semibold text-foreground">{agent.schedule || "Not configured"}</p>
      </div>
    </div>
  )
}

function SettingsTab({ agent }) {
  // Edit state for each section
  const [editingSections, setEditingSections] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Helper to find model ID from display name or return as-is
  const findModelId = (modelValue) => {
    if (!modelValue) return ''
    // If it's already a valid model ID format (lowercase with dashes), return it
    if (modelValue.match(/^[a-z0-9-]+$/)) return modelValue
    // Otherwise try to find matching model by name (will be resolved when models load)
    return modelValue
  }

  // Form data state - use agent.model (the actual model ID), not modelKey (icon key)
  const [formData, setFormData] = useState({
    name: agent.name || '',
    description: agent.description || '',
    model: findModelId(agent.model) || '',  // This should be the model ID like "gemini-2.0-flash"
    tools: agent.tools || [],
    communicationPreset: agent.communicationPreset || 'worker',
    schedule: agent.schedule || 'always-on',
  })

  // Available options from backend
  const [availableModels, setAvailableModels] = useState([])
  const [availableTools, setAvailableTools] = useState([])
  const [communicationPresets, setCommunicationPresets] = useState([
    { id: "worker", name: "Worker", description: "Can be called by KO Prime and orchestrators" },
    { id: "peer", name: "Peer", description: "Can call and be called by any agent" },
    { id: "orchestrator", name: "Orchestrator", description: "Can call all agents, not called by others" },
    { id: "isolated", name: "Isolated", description: "Cannot communicate with other agents" },
  ])

  const scheduleOptions = [
    { id: "always-on", name: "Always On", description: "24/7 availability" },
    { id: "business-hours", name: "Business Hours", description: "8AM-6PM EST" },
    { id: "on-demand", name: "On Demand", description: "Only when called" },
  ]

  // Fetch available options
  useEffect(() => {
    async function fetchOptions() {
      try {
        const [modelsRes, toolsRes, presetsRes] = await Promise.all([
          fetch('/api/ko/factory/models'),
          fetch('/api/ko/factory/tools'),
          fetch('/api/ko/factory/communication-presets'),
        ])

        if (modelsRes.ok) {
          const data = await modelsRes.json()
          setAvailableModels(data.models || [])
        }
        if (toolsRes.ok) {
          const data = await toolsRes.json()
          setAvailableTools(data.tools || [])
        }
        if (presetsRes.ok) {
          const data = await presetsRes.json()
          if (data.presets?.length > 0) {
            setCommunicationPresets(data.presets)
          }
        }
      } catch (err) {
        console.error('Failed to fetch options:', err)
      }
    }
    fetchOptions()
  }, [])

  const toggleEdit = (section) => {
    setEditingSections(prev => ({ ...prev, [section]: !prev[section] }))
    setSaveSuccess(false)
  }

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setSaveSuccess(false)
  }

  const hasChanges = () => {
    return (
      formData.name !== (agent.name || '') ||
      formData.description !== (agent.description || '') ||
      formData.model !== (agent.model || '') ||
      JSON.stringify(formData.tools) !== JSON.stringify(agent.tools || []) ||
      formData.communicationPreset !== (agent.communicationPreset || 'worker') ||
      formData.schedule !== (agent.schedule || 'always-on')
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const res = await fetch(`/api/ko/factory/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          model: formData.model,
          tools: formData.tools,
          communication_preset: formData.communicationPreset,
          settings: { schedule: formData.schedule },
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || 'Failed to save')
      }

      setSaveSuccess(true)
      setEditingSections({})
    } catch (err) {
      console.error('Failed to save:', err)
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Group models by provider
  const modelsByProvider = availableModels.reduce((acc, model) => {
    const provider = model.provider || 'other'
    if (!acc[provider]) acc[provider] = []
    acc[provider].push(model)
    return acc
  }, {})

  // Group tools by category
  const toolsByCategory = availableTools.reduce((acc, tool) => {
    const category = tool.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(tool)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Identity Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Bot size={18} />
            Identity
          </h2>
          <button
            onClick={() => toggleEdit('identity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              editingSections.identity
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pencil size={14} />
            {editingSections.identity ? 'Editing' : 'Edit'}
          </button>
        </div>

        {editingSections.identity ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Agent Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData('name', e.target.value)}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormData('description', e.target.value)}
                rows={3}
                className="w-full px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{formData.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Description</span>
              <span className="text-sm text-right max-w-md">{formData.description}</span>
            </div>
          </div>
        )}
      </div>

      {/* Model Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Brain size={18} className="text-purple-400" />
            Model
          </h2>
          <button
            onClick={() => toggleEdit('model')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              editingSections.model
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pencil size={14} />
            {editingSections.model ? 'Editing' : 'Edit'}
          </button>
        </div>

        {editingSections.model ? (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {Object.entries(modelsByProvider).map(([provider, models]) => (
              <div key={provider}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{provider}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => updateFormData('model', model.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-colors ${
                        formData.model === model.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-secondary hover:border-muted-foreground'
                      }`}
                    >
                      <span className="font-medium text-sm">{model.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <AgentModelIcon modelKey={agent.modelKey} size="sm" />
            <span className="font-medium">{availableModels.find(m => m.id === formData.model)?.name || formData.model}</span>
            {availableModels.length > 0 && !availableModels.find(m => m.id === formData.model) && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                Unknown model - click Edit to select valid model
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tools Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Database size={18} className="text-blue-400" />
            Tools
            <span className="text-xs text-muted-foreground">({formData.tools.length} selected)</span>
          </h2>
          <button
            onClick={() => toggleEdit('tools')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              editingSections.tools
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pencil size={14} />
            {editingSections.tools ? 'Editing' : 'Edit'}
          </button>
        </div>

        {editingSections.tools ? (
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {Object.entries(toolsByCategory).map(([category, tools]) => (
              <div key={category}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{category}</p>
                <div className="space-y-2">
                  {tools.map((tool) => (
                    <label
                      key={tool.id}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        formData.tools.includes(tool.id)
                          ? 'bg-primary/10 border border-primary'
                          : 'bg-secondary border border-transparent hover:bg-accent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.tools.includes(tool.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFormData('tools', [...formData.tools, tool.id])
                          } else {
                            updateFormData('tools', formData.tools.filter(t => t !== tool.id))
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <div>
                        <span className="font-medium text-sm">{tool.name}</span>
                        <p className="text-xs text-muted-foreground">{tool.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {formData.tools.length > 0 ? formData.tools.map((toolId) => {
              const tool = availableTools.find(t => t.id === toolId)
              return (
                <span key={toolId} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                  {tool?.name || toolId}
                </span>
              )
            }) : (
              <span className="text-muted-foreground text-sm">No tools selected</span>
            )}
          </div>
        )}
      </div>

      {/* Communication Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Network size={18} className="text-purple-400" />
            Communication
          </h2>
          <button
            onClick={() => toggleEdit('communication')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              editingSections.communication
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pencil size={14} />
            {editingSections.communication ? 'Editing' : 'Edit'}
          </button>
        </div>

        {editingSections.communication ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {communicationPresets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => updateFormData('communicationPreset', preset.id)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  formData.communicationPreset === preset.id
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-border bg-secondary hover:border-muted-foreground'
                }`}
              >
                <p className="font-medium">{preset.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium">
              {communicationPresets.find(p => p.id === formData.communicationPreset)?.name || formData.communicationPreset}
            </span>
            <span className="text-sm text-muted-foreground">
              {communicationPresets.find(p => p.id === formData.communicationPreset)?.description}
            </span>
          </div>
        )}
      </div>

      {/* Schedule Section */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Calendar size={18} className="text-amber-400" />
            Schedule
          </h2>
          <button
            onClick={() => toggleEdit('schedule')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              editingSections.schedule
                ? 'bg-primary/20 text-primary'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            <Pencil size={14} />
            {editingSections.schedule ? 'Editing' : 'Edit'}
          </button>
        </div>

        {editingSections.schedule ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {scheduleOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => updateFormData('schedule', option.id)}
                className={`p-4 rounded-lg border-2 text-left transition-colors ${
                  formData.schedule === option.id
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-border bg-secondary hover:border-muted-foreground'
                }`}
              >
                <p className="font-medium">{option.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium">
              {scheduleOptions.find(s => s.id === formData.schedule)?.name || formData.schedule}
            </span>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-card border border-red-500/30 rounded-xl p-6">
        <h2 className="font-semibold text-red-400 mb-4">Danger Zone</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Disable Agent</p>
              <p className="text-xs text-muted-foreground">Agent will stop processing all requests</p>
            </div>
            <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors">
              Disable
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-500/10 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Delete Agent</p>
              <p className="text-xs text-muted-foreground">Permanently remove this agent</p>
            </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2">
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Save Button - Fixed at bottom when there are changes */}
      {hasChanges() && (
        <div className="sticky bottom-4 flex justify-end">
          <div className="bg-card border border-border rounded-xl p-4 shadow-lg flex items-center gap-4">
            {saveError && (
              <span className="text-red-400 text-sm">{saveError}</span>
            )}
            {saveSuccess && (
              <span className="text-emerald-400 text-sm flex items-center gap-1">
                <CheckCircle size={14} />
                Saved successfully
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
