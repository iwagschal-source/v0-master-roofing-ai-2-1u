"use client"

import { useState, useEffect, useCallback } from "react"
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
  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings size={18} />
          Identity
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Agent Name</label>
            <input
              type="text"
              defaultValue={agent.name}
              className="w-full px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Description</label>
            <textarea
              defaultValue={agent.description}
              rows={3}
              className="w-full px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Model</label>
            <select className="w-full px-4 py-2 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Gemini 2.0 Flash</option>
              <option>Claude Sonnet</option>
              <option>GPT-4o-mini</option>
              <option>Vertex AI Search</option>
            </select>
          </div>
        </div>
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

      {/* Save Button */}
      <div className="flex justify-end">
        <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors">
          Save Changes
        </button>
      </div>
    </div>
  )
}
