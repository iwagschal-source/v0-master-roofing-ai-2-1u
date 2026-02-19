"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Copy, ArrowRight, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { AgentModelIcon } from "./agent-model-icon"

export function CloneAgentModal({ agent, isOpen, onClose, onClone }) {
  const [newName, setNewName] = useState("")
  const [includeConfig, setIncludeConfig] = useState(true)
  const [includePermissions, setIncludePermissions] = useState(true)
  const [includeScoring, setIncludeScoring] = useState(true)
  const [includeMonitoring, setIncludeMonitoring] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Reset state when modal opens with new agent
  useEffect(() => {
    if (agent && isOpen) {
      setNewName(`${agent.name} (Copy)`)
      setError(null)
      setSuccess(false)
      setIsLoading(false)
    }
  }, [agent, isOpen])

  if (!isOpen || !agent) return null

  const generateNewId = () => {
    // Generate a unique ID with random suffix to avoid collisions
    const prefix = newName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "") || "CLN"
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase()
    return `CAO-${prefix}-${randomSuffix}`
  }

  const handleClone = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(false)

    try {
      // Extract system prompt from config files
      const systemPrompt = includeConfig && agent.configFiles
        ? agent.configFiles.find(f => f.name === 'system_prompt.txt' || f.name === 'system.md')?.content ||
          agent.configFiles.find(f => f.name === 'README.md')?.content || ''
        : `# ${newName}\n\nCloned from ${agent.id}`

      // Build the payload for the backend
      const backendPayload = {
        name: newName,
        description: agent.description || `Cloned from ${agent.name}`,
        model: agent.model || 'claude-sonnet-4',
        tools: agent.tools || [],
        system_prompt: systemPrompt,
        cloned_from: agent.id,
        // Include permissions if selected
        settings: {
          schedule: agent.schedule || 'always-on',
          read_access: includePermissions && agent.permissions?.readAccess
            ? agent.permissions.readAccess.filter(r => r.enabled).map(r => r.resource)
            : [],
          write_access: includePermissions && agent.permissions?.writeAccess
            ? agent.permissions.writeAccess.filter(r => r.enabled).map(r => r.resource)
            : [],
          agent_connections: includePermissions && agent.permissions?.agentSynteraction
            ? agent.permissions.agentSynteraction.map(a => a.agentId)
            : [],
          scoring_metrics: includeScoring && agent.scoring?.metrics
            ? agent.scoring.metrics.map(m => ({ name: m.name, weight: m.weight, threshold: m.threshold }))
            : [],
          monitoring: includeMonitoring && agent.monitoring
            ? {
                alerts: agent.monitoring.alerts || [],
                channels: agent.monitoring.channels || [],
              }
            : null,
        },
      }

      console.log("Creating agent in backend:", backendPayload)

      // POST to backend API to persist the agent
      const res = await fetch('/api/ko/factory/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendPayload),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || errorData.detail || `Failed to create agent (${res.status})`)
      }

      const data = await res.json()
      console.log("Agent created successfully:", data)

      // Build the full agent object for frontend state
      const clonedAgent = {
        ...agent,
        id: data.agent_id || data.id || generateNewId(),
        name: newName,
        status: "idle", // New agents start as idle (ready)
        stats: { totalRequests: 0, successRate: 0, avgLatency: 0, errorsToday: 0, requestsPerMinute: 0 },
        lastActivity: new Date().toISOString(),
        currentAction: "Ready",
        queueDepth: 0,
        configFiles: includeConfig
          ? agent.configFiles
          : [{ name: "README.md", content: `# ${newName}\n\nCloned from ${agent.id}`, type: "markdown" }],
        permissions: includePermissions
          ? agent.permissions
          : { readAccess: [], writeAccess: [], userSynteraction: [], agentSynteraction: [] },
        scoring: includeScoring
          ? { ...agent.scoring, overallScore: 0, accuracyScore: 0, latencyScore: 0, reliabilityScore: 0 }
          : { overallScore: 0, accuracyScore: 0, latencyScore: 0, reliabilityScore: 0, metrics: [] },
        monitoring: includeMonitoring
          ? agent.monitoring
          : { auditors: [], alerts: [], channels: [] },
        history: {
          totalExecutions: 0,
          firstActive: new Date().toISOString().split("T")[0],
          uptimePercent: 0,
          totalErrors: 0,
          recentEvents: [
            {
              type: "info",
              message: `Agent created by cloning ${agent.id}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ],
          versions: [
            {
              version: "v1.0.0",
              date: new Date().toISOString().split("T")[0],
              changes: `Initial clone from ${agent.id}`,
            },
          ],
        },
      }

      setSuccess(true)

      // Wait a moment to show success, then close
      setTimeout(() => {
        onClone?.(clonedAgent)
        onClose?.()
      }, 1000)

    } catch (err) {
      console.error("Failed to clone agent:", err)
      setError(err.message || "Failed to create agent. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl w-full max-w-lg mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Copy size={20} />
            Clone Agent
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded">
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Source info */}
          <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
            <AgentModelIcon modelKey={agent.modelKey} size="md" />
            <div className="flex-1">
              <p className="font-medium">{agent.name}</p>
              <p className="text-sm text-muted-foreground font-mono">{agent.id}</p>
            </div>
            <ArrowRight size={20} className="text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium text-primary">{newName || "New Agent"}</p>
              <p className="text-sm text-muted-foreground font-mono">{generateNewId()}</p>
            </div>
          </div>

          {/* New name */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">New Agent Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* What to include */}
          <div>
            <label className="text-sm text-muted-foreground mb-3 block">Include in Clone</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent">
                <input
                  type="checkbox"
                  checked={includeConfig}
                  onChange={(e) => setIncludeConfig(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-medium">README & Config Files</p>
                  <p className="text-xs text-muted-foreground">System prompt and configuration</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent">
                <input
                  type="checkbox"
                  checked={includePermissions}
                  onChange={(e) => setIncludePermissions(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-medium">Permissions</p>
                  <p className="text-xs text-muted-foreground">Read/write access and synteraction rules</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent">
                <input
                  type="checkbox"
                  checked={includeScoring}
                  onChange={(e) => setIncludeScoring(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-medium">Scoring Configuration</p>
                  <p className="text-xs text-muted-foreground">Metrics and evaluation settings (scores reset to 0)</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent">
                <input
                  type="checkbox"
                  checked={includeMonitoring}
                  onChange={(e) => setIncludeMonitoring(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <p className="font-medium">Monitoring Setup</p>
                  <p className="text-xs text-muted-foreground">Auditors and alert configuration</p>
                </div>
              </label>
            </div>
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground">
            Note: History, stats, and execution data are never cloned. The new agent will start fresh.
          </p>

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              <AlertCircle size={16} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
              <CheckCircle size={16} />
              <p className="text-sm">Agent created successfully!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={!newName || isLoading || success}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating...
              </>
            ) : success ? (
              <>
                <CheckCircle size={16} />
                Created!
              </>
            ) : (
              <>
                <Copy size={16} />
                Clone Agent
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
