"use client"

import { useState } from "react"
import { X, Copy, ArrowRight } from "lucide-react"
import { agents } from "@/data/agent-data"
import { AgentModelIcon } from "./agent-model-icon"

export function CloneAgentModal({ agent, isOpen, onClose, onClone }) {
  const [newName, setNewName] = useState(agent ? `${agent.name} (Copy)` : "")
  const [includeConfig, setIncludeConfig] = useState(true)
  const [includePermissions, setIncludePermissions] = useState(true)
  const [includeScoring, setIncludeScoring] = useState(true)
  const [includeMonitoring, setIncludeMonitoring] = useState(false)

  if (!isOpen || !agent) return null

  const generateNewId = () => {
    const prefix = newName.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "") || "CLN"
    const num = String(agents.length + 1).padStart(3, "0")
    return `AGT-${prefix}-${num}`
  }

  const handleClone = () => {
    const clonedAgent = {
      ...agent,
      id: generateNewId(),
      name: newName,
      status: "offline",
      stats: { totalRequests: 0, successRate: 0, avgLatency: 0, errorsToday: 0, requestsPerMinute: 0 },
      lastActivity: new Date().toISOString(),
      currentAction: `Cloned from ${agent.id} - awaiting activation`,
      queueDepth: 0,

      // Conditionally include sections
      configFiles: includeConfig
        ? agent.configFiles
        : [{ name: "README.md", content: "# " + newName + "\n\nCloned from " + agent.id, type: "markdown" }],
      permissions: includePermissions
        ? agent.permissions
        : { readAccess: [], writeAccess: [], userSynteraction: [], agentSynteraction: [] },
      scoring: includeScoring
        ? { ...agent.scoring, overallScore: 0, accuracyScore: 0, latencyScore: 0, reliabilityScore: 0 }
        : { overallScore: 0, accuracyScore: 0, latencyScore: 0, reliabilityScore: 0, metrics: [] },
      monitoring: includeMonitoring
        ? agent.monitoring
        : { auditors: [], alerts: [], channels: [] },

      // Always reset history
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

    console.log("Cloning agent:", clonedAgent)
    onClone?.(clonedAgent)
    onClose?.()
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
            <X size={20} />
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={!newName}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Copy size={16} />
            Clone Agent
          </button>
        </div>
      </div>
    </div>
  )
}
