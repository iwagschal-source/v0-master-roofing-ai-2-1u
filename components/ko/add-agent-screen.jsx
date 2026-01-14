"use client"

import { useState } from "react"
import {
  ArrowLeft,
  Save,
  Bot,
  Brain,
  Shield,
  FileText,
  Calendar,
  Target,
  Plus,
  Trash2,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { agents, modelConfig } from "@/data/agent-data"
import { AgentModelIcon } from "./agent-model-icon"

const modelOptions = [
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", key: "gemini", backendModel: "gemini-2.0-flash" },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4", key: "claude", backendModel: "claude-sonnet-4" },
  { id: "claude-haiku-3.5", name: "Claude Haiku 3.5", key: "claude", backendModel: "claude-haiku-3.5" },
  { id: "gpt-4o", name: "GPT-4o", key: "gpt", backendModel: "gpt-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", key: "gpt", backendModel: "gpt-4o-mini" },
]

// Map read access selections to backend tool IDs
const readAccessToTools = {
  "BigQuery - mr_core": "bigquery_sql",
  "BigQuery - mr_raw": "bigquery_sql",
  "BigQuery - mr_agent": "bigquery_sql",
  "HubSpot CRM": "hubspot_query",
  "Google Drive": "read_gcs_file",
  "Gmail": "search_emails",
  "Asana": "bigquery_sql",
}

const scheduleOptions = [
  { id: "always-on", name: "Always On", description: "24/7 availability" },
  { id: "business-hours", name: "Business Hours", description: "8AM-6PM EST" },
  { id: "on-demand", name: "On Demand", description: "Only when called" },
  { id: "scheduled", name: "Scheduled", description: "Cron-based schedule" },
]

export function AddAgentScreen({ onBack, onSave }) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    // Step 1: Identity
    name: "",
    description: "",
    modelKey: "",

    // Step 2: README / System Prompt
    readme: "# Agent Name\n\n## Purpose\nDescribe what this agent does.\n\n## Instructions\nStep by step instructions for the agent.\n\n## Constraints\nWhat the agent should NOT do.",

    // Step 3: Permissions
    readAccess: [],
    writeAccess: [],
    userSynteraction: [],
    agentSynteraction: [],

    // Step 4: Schedule
    schedule: "always-on",
    cronExpression: "",

    // Step 5: Scoring
    scoringMetrics: [
      { name: "Response Accuracy", weight: 40, threshold: "95%" },
      { name: "Latency P95", weight: 30, threshold: "<300ms" },
      { name: "Error Rate", weight: 30, threshold: "<1%" },
    ],
  })

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const generateAgentId = () => {
    const prefix = formData.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, "") || "NEW"
    const num = String(agents.length + 1).padStart(3, "0")
    return `AGT-${prefix}-${num}`
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Get unique tools from read access selections
      const tools = [...new Set(
        formData.readAccess
          .map(access => readAccessToTools[access])
          .filter(Boolean)
      )]

      // Add search_documents and resolve_project as defaults
      if (!tools.includes('search_documents')) tools.push('search_documents')
      if (!tools.includes('resolve_project')) tools.push('resolve_project')

      // Get backend model ID
      const selectedModel = modelOptions.find((m) => m.id === formData.modelKey)
      const backendModel = selectedModel?.backendModel || formData.modelKey

      // Build payload for backend
      const payload = {
        name: formData.name,
        model: backendModel,
        tools: tools,
        system_prompt: formData.readme,
        description: formData.description,
        schedule: formData.schedule,
        cronExpression: formData.cronExpression,
        readAccess: formData.readAccess,
        writeAccess: formData.writeAccess,
        agentSynteraction: formData.agentSynteraction,
        scoringMetrics: formData.scoringMetrics,
      }

      console.log("Creating agent with payload:", payload)

      const res = await fetch('/api/ko/agents/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create agent')
      }

      console.log("Agent created successfully:", data)

      // Build local agent object for UI update
      const newAgent = {
        id: data.agent?.id || generateAgentId(),
        name: formData.name,
        description: formData.description,
        model: selectedModel?.name || "Unknown",
        modelKey: selectedModel?.key || formData.modelKey,
        status: "offline",
        stats: { totalRequests: 0, successRate: 0, avgLatency: 0, errorsToday: 0, requestsPerMinute: 0 },
        lastActivity: new Date().toISOString(),
        currentAction: "Newly created - awaiting activation",
        queueDepth: 0,
        connections: formData.agentSynteraction.map((a) => a.agentId),
        auditedBy: [],
        schedule: scheduleOptions.find((s) => s.id === formData.schedule)?.name || "Always On",
        permissions: {
          readAccess: formData.readAccess.map((r) => ({ resource: r, scope: "All", enabled: true })),
          writeAccess: formData.writeAccess.map((w) => ({ resource: w, scope: "All", enabled: true })),
          userSynteraction: formData.userSynteraction,
          agentSynteraction: formData.agentSynteraction,
        },
        scoring: {
          overallScore: 0,
          accuracyScore: 0,
          latencyScore: 0,
          reliabilityScore: 0,
          evaluationFrequency: "Every 6 hours",
          lastEvaluation: "Never",
          nextEvaluation: "After activation",
          metrics: formData.scoringMetrics,
        },
        configFiles: [{ name: "README.md", content: formData.readme, type: "markdown" }],
      }

      onSave?.(newAgent)
      onBack?.()
    } catch (err) {
      console.error("Failed to create agent:", err)
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const steps = [
    { num: 1, label: "Identity", icon: Bot },
    { num: 2, label: "README", icon: FileText },
    { num: 3, label: "Permissions", icon: Shield },
    { num: 4, label: "Schedule", icon: Calendar },
    { num: 5, label: "Scoring", icon: Target },
  ]

  const totalWeight = formData.scoringMetrics.reduce((sum, m) => sum + (m.weight || 0), 0)

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Add New Agent</h1>
              <p className="text-sm text-muted-foreground">
                {formData.name ? `Creating: ${formData.name}` : "Configure your new agent"}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Progress steps */}
      <div className="bg-card border-b border-border px-6 py-4 overflow-x-auto">
        <div className="flex items-center justify-center gap-2 min-w-max">
          {steps.map((s, idx) => (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  step === s.num
                    ? "bg-primary text-primary-foreground"
                    : step > s.num
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {step > s.num ? <CheckCircle size={18} /> : <s.icon size={18} />}
                <span className="hidden sm:inline">{s.label}</span>
              </button>
              {idx < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${step > s.num ? "bg-emerald-500" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl mx-auto">
          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Bot size={20} />
                  Agent Identity
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Agent Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData("name", e.target.value)}
                      placeholder="e.g., BigQuery Analytics, Email Drafter"
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => updateFormData("description", e.target.value)}
                      placeholder="What does this agent do? What is its purpose?"
                      rows={3}
                      className="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Model *</label>
                    <div className="grid grid-cols-2 gap-3">
                      {modelOptions.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => updateFormData("modelKey", model.id)}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                            formData.modelKey === model.id
                              ? "border-primary bg-primary/10"
                              : "border-border bg-secondary hover:border-muted-foreground"
                          }`}
                        >
                          <AgentModelIcon modelKey={model.key} size="sm" />
                          <span className="font-medium">{model.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Generated ID:{" "}
                      <span className="font-mono text-foreground">{generateAgentId()}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: README */}
          {step === 2 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-secondary/50 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText size={20} />
                  System Prompt & Configuration
                </h2>
                <span className="text-xs text-muted-foreground">README.md</span>
              </div>

              <div className="p-4 bg-background/50">
                <textarea
                  value={formData.readme}
                  onChange={(e) => updateFormData("readme", e.target.value)}
                  placeholder="Enter your agent's system prompt, instructions, and configuration..."
                  rows={20}
                  className="w-full bg-transparent text-foreground font-mono text-sm focus:outline-none resize-none"
                  style={{ lineHeight: "1.6" }}
                />
              </div>
            </div>
          )}

          {/* Step 3: Permissions */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Read Access */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield size={20} className="text-blue-400" />
                  Read Access
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  What data sources can this agent read from?
                </p>

                <div className="space-y-2">
                  {[
                    "BigQuery - mr_core",
                    "BigQuery - mr_raw",
                    "BigQuery - mr_agent",
                    "HubSpot CRM",
                    "Google Drive",
                    "Gmail",
                    "Asana",
                  ].map((resource) => (
                    <label
                      key={resource}
                      className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={formData.readAccess.includes(resource)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFormData("readAccess", [...formData.readAccess, resource])
                          } else {
                            updateFormData(
                              "readAccess",
                              formData.readAccess.filter((r) => r !== resource)
                            )
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span>{resource}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Write Access */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield size={20} className="text-amber-400" />
                  Write Access
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  What data sources can this agent modify?
                </p>

                <div className="space-y-2">
                  {["BigQuery - mr_agent", "HubSpot CRM", "Gmail Drafts", "Asana Tasks"].map(
                    (resource) => (
                      <label
                        key={resource}
                        className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent"
                      >
                        <input
                          type="checkbox"
                          checked={formData.writeAccess.includes(resource)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateFormData("writeAccess", [...formData.writeAccess, resource])
                            } else {
                              updateFormData(
                                "writeAccess",
                                formData.writeAccess.filter((r) => r !== resource)
                              )
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <span>{resource}</span>
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Agent Synteraction */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Bot size={20} className="text-cyan-400" />
                  Agent Connections
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Which other agents can this agent communicate with?
                </p>

                <div className="space-y-2">
                  {agents.map((agent) => (
                    <label
                      key={agent.id}
                      className="flex items-center gap-3 p-3 bg-secondary rounded-lg cursor-pointer hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={formData.agentSynteraction.some((a) => a.agentId === agent.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateFormData("agentSynteraction", [
                              ...formData.agentSynteraction,
                              { agentId: agent.id, canCall: true, canReceiveFrom: true, priority: 5 },
                            ])
                          } else {
                            updateFormData(
                              "agentSynteraction",
                              formData.agentSynteraction.filter((a) => a.agentId !== agent.id)
                            )
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <AgentModelIcon modelKey={agent.modelKey} size="sm" />
                      <div>
                        <span className="font-medium">{agent.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">({agent.id})</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Schedule */}
          {step === 4 && (
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar size={20} />
                Schedule
              </h2>

              <div className="grid grid-cols-2 gap-3">
                {scheduleOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => updateFormData("schedule", option.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      formData.schedule === option.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary hover:border-muted-foreground"
                    }`}
                  >
                    <p className="font-medium">{option.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                  </button>
                ))}
              </div>

              {formData.schedule === "scheduled" && (
                <div className="mt-4">
                  <label className="text-sm text-muted-foreground mb-2 block">Cron Expression</label>
                  <input
                    type="text"
                    value={formData.cronExpression}
                    onChange={(e) => updateFormData("cronExpression", e.target.value)}
                    placeholder="*/15 * * * * (every 15 minutes)"
                    className="w-full px-4 py-3 bg-secondary border border-border rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 5: Scoring */}
          {step === 5 && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Target size={20} />
                  Scoring Configuration
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Define how this agent&apos;s performance will be measured. Weights must total 100%.
                </p>

                <div className="space-y-4">
                  {formData.scoringMetrics.map((metric, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={metric.name}
                          onChange={(e) => {
                            const newMetrics = [...formData.scoringMetrics]
                            newMetrics[idx].name = e.target.value
                            updateFormData("scoringMetrics", newMetrics)
                          }}
                          placeholder="Metric name"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        />
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          value={metric.weight}
                          onChange={(e) => {
                            const newMetrics = [...formData.scoringMetrics]
                            newMetrics[idx].weight = parseInt(e.target.value) || 0
                            updateFormData("scoringMetrics", newMetrics)
                          }}
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg text-center"
                        />
                        <p className="text-xs text-muted-foreground text-center mt-1">Weight %</p>
                      </div>
                      <div className="w-32">
                        <input
                          type="text"
                          value={metric.threshold}
                          onChange={(e) => {
                            const newMetrics = [...formData.scoringMetrics]
                            newMetrics[idx].threshold = e.target.value
                            updateFormData("scoringMetrics", newMetrics)
                          }}
                          placeholder="Threshold"
                          className="w-full px-3 py-2 bg-background border border-border rounded-lg"
                        />
                        <p className="text-xs text-muted-foreground text-center mt-1">Threshold</p>
                      </div>
                      <button
                        onClick={() => {
                          const newMetrics = formData.scoringMetrics.filter((_, i) => i !== idx)
                          updateFormData("scoringMetrics", newMetrics)
                        }}
                        className="p-2 text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => {
                      updateFormData("scoringMetrics", [
                        ...formData.scoringMetrics,
                        { name: "", weight: 0, threshold: "" },
                      ])
                    }}
                    className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-muted-foreground w-full justify-center"
                  >
                    <Plus size={18} />
                    Add Metric
                  </button>

                  <div className="pt-4 border-t border-border">
                    <p className="text-sm">
                      Total Weight:{" "}
                      <span
                        className={`ml-2 font-bold ${
                          totalWeight === 100 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {totalWeight}%
                      </span>
                      {totalWeight !== 100 && (
                        <span className="text-red-400 ml-2">(must equal 100%)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold text-foreground mb-4">Review & Create</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Agent ID</span>
                    <span className="font-mono">{generateAgentId()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Name</span>
                    <span>{formData.name || "(not set)"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Model</span>
                    <span>
                      {modelOptions.find((m) => m.id === formData.modelKey)?.name || "(not set)"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Schedule</span>
                    <span>{scheduleOptions.find((s) => s.id === formData.schedule)?.name}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Connections</span>
                    <span>{formData.agentSynteraction.length} agents</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-400">Failed to create agent</p>
                <p className="text-sm text-red-400/80 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1 || isSubmitting}
              className="px-6 py-2 bg-secondary text-foreground rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent transition-colors"
            >
              Previous
            </button>

            {step < 5 ? (
              <button
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!formData.name || !formData.modelKey || totalWeight !== 100 || isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Create Agent
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
