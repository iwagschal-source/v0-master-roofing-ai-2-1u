"use client"

import { useState, useEffect } from "react"
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
  Wrench,
  Database,
  Globe,
  Code,
  Eye,
} from "lucide-react"
import { agents, modelConfig } from "@/data/agent-data"
import { AgentModelIcon } from "./agent-model-icon"

// Fallback models if backend is unavailable
const fallbackModels = [
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", tier: "standard" },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4", provider: "anthropic", tier: "standard" },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", tier: "standard" },
]

// Fallback tools if backend is unavailable
const fallbackTools = [
  { id: "bigquery_sql", name: "BigQuery SQL", category: "data", description: "Execute SQL queries" },
  { id: "search_documents", name: "Document Search", category: "data", description: "Search documents" },
  { id: "hubspot_query", name: "HubSpot CRM", category: "data", description: "Query CRM data" },
]

const scheduleOptions = [
  { id: "always-on", name: "Always On", description: "24/7 availability" },
  { id: "business-hours", name: "Business Hours", description: "8AM-6PM EST" },
  { id: "on-demand", name: "On Demand", description: "Only when called" },
  { id: "scheduled", name: "Scheduled", description: "Cron-based schedule" },
]

// Helper to get model key for icons
function getModelKey(provider) {
  if (!provider) return 'unknown'
  const p = provider.toLowerCase()
  if (p.includes('anthropic') || p.includes('claude')) return 'claude'
  if (p.includes('openai') || p.includes('gpt')) return 'gpt'
  if (p.includes('google') || p.includes('gemini') || p.includes('vertex')) return 'gemini'
  if (p.includes('deepseek')) return 'deepseek'
  if (p.includes('mistral')) return 'mistral'
  if (p.includes('meta') || p.includes('llama')) return 'llama'
  if (p.includes('cohere')) return 'cohere'
  if (p.includes('xai') || p.includes('grok')) return 'grok'
  return 'unknown'
}

// Helper to get tool category icon
function getToolCategoryIcon(category) {
  switch (category) {
    case 'data': return Database
    case 'web': return Globe
    case 'execution': return Code
    case 'meta': return Eye
    default: return Wrench
  }
}

export function AddAgentScreen({ onBack, onSave }) {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Dynamic data from backend
  const [availableModels, setAvailableModels] = useState(fallbackModels)
  const [availableTools, setAvailableTools] = useState(fallbackTools)
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Fetch models and tools from backend
  useEffect(() => {
    async function fetchFactoryData() {
      try {
        const [modelsRes, toolsRes] = await Promise.all([
          fetch('/api/ko/factory/models'),
          fetch('/api/ko/factory/tools'),
        ])

        if (modelsRes.ok) {
          const modelsData = await modelsRes.json()
          if (modelsData.models?.length > 0) {
            setAvailableModels(modelsData.models)
          }
        }

        if (toolsRes.ok) {
          const toolsData = await toolsRes.json()
          if (toolsData.tools?.length > 0) {
            setAvailableTools(toolsData.tools)
          }
        }
      } catch (error) {
        console.error('Failed to fetch factory data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }
    fetchFactoryData()
  }, [])

  const [formData, setFormData] = useState({
    // Step 1: Identity
    name: "",
    description: "",
    modelId: "",

    // Step 2: README / System Prompt
    readme: "# Agent Name\n\n## Purpose\nDescribe what this agent does.\n\n## Instructions\nStep by step instructions for the agent.\n\n## Constraints\nWhat the agent should NOT do.",

    // Step 3: Tools
    selectedTools: [],

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
      // Get selected model
      const selectedModel = availableModels.find((m) => m.id === formData.modelId)

      // Build payload for backend
      const payload = {
        name: formData.name,
        model: formData.modelId,
        tools: formData.selectedTools,
        system_prompt: formData.readme,
        description: formData.description,
        schedule: formData.schedule,
        cronExpression: formData.cronExpression,
        scoringMetrics: formData.scoringMetrics,
      }

      console.log("Creating agent with payload:", payload)

      const res = await fetch('/api/ko/factory/agents', {
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
        model: selectedModel?.name || formData.modelId,
        modelKey: getModelKey(selectedModel?.provider),
        provider: selectedModel?.provider,
        tools: formData.selectedTools,
        status: "offline",
        stats: { totalRequests: 0, successRate: 0, avgLatency: 0, errorsToday: 0, requestsPerMinute: 0 },
        lastActivity: new Date().toISOString(),
        currentAction: "Newly created - awaiting activation",
        queueDepth: 0,
        connections: [],
        auditedBy: [],
        schedule: scheduleOptions.find((s) => s.id === formData.schedule)?.name || "Always On",
        permissions: {
          readAccess: [],
          writeAccess: [],
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
    { num: 3, label: "Tools", icon: Wrench },
    { num: 4, label: "Schedule", icon: Calendar },
    { num: 5, label: "Scoring", icon: Target },
  ]

  // Group models by provider for display
  const modelsByProvider = availableModels.reduce((acc, model) => {
    const provider = model.provider || 'other'
    if (!acc[provider]) acc[provider] = []
    acc[provider].push(model)
    return acc
  }, {})

  // Group tools by category for display
  const toolsByCategory = availableTools.reduce((acc, tool) => {
    const category = tool.category || 'other'
    if (!acc[category]) acc[category] = []
    acc[category].push(tool)
    return acc
  }, {})

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
                    <label className="text-sm text-muted-foreground mb-2 block">
                      Model * {isLoadingData && <Loader2 className="inline w-4 h-4 animate-spin ml-2" />}
                    </label>
                    <p className="text-xs text-muted-foreground mb-3">
                      {availableModels.length} models available from {Object.keys(modelsByProvider).length} providers
                    </p>
                    <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                      {Object.entries(modelsByProvider).map(([provider, models]) => (
                        <div key={provider}>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                            {provider}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {models.map((model) => (
                              <button
                                key={model.id}
                                onClick={() => updateFormData("modelId", model.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors text-left ${
                                  formData.modelId === model.id
                                    ? "border-primary bg-primary/10"
                                    : "border-border bg-secondary hover:border-muted-foreground"
                                }`}
                              >
                                <AgentModelIcon modelKey={getModelKey(model.provider)} size="sm" />
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium text-sm block truncate">{model.name}</span>
                                  {model.tier && (
                                    <span className={`text-xs ${
                                      model.tier === 'premium' ? 'text-amber-400' :
                                      model.tier === 'economy' ? 'text-emerald-400' : 'text-muted-foreground'
                                    }`}>
                                      {model.tier}
                                    </span>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
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

          {/* Step 3: Tools */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Wrench size={20} className="text-blue-400" />
                  Available Tools
                  {isLoadingData && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the tools this agent can use. {availableTools.length} tools available across {Object.keys(toolsByCategory).length} categories.
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-muted-foreground">Selected:</span>
                  <span className="text-sm font-medium text-primary">{formData.selectedTools.length} tools</span>
                  {formData.selectedTools.length > 0 && (
                    <button
                      onClick={() => updateFormData("selectedTools", [])}
                      className="text-xs text-red-400 hover:text-red-300 ml-2"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => updateFormData("selectedTools", availableTools.map(t => t.id))}
                    className="text-xs text-emerald-400 hover:text-emerald-300 ml-auto"
                  >
                    Select all
                  </button>
                </div>

                <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                  {Object.entries(toolsByCategory).map(([category, tools]) => {
                    const CategoryIcon = getToolCategoryIcon(category)
                    return (
                      <div key={category}>
                        <div className="flex items-center gap-2 mb-3">
                          <CategoryIcon size={16} className="text-muted-foreground" />
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {category}
                          </p>
                          <span className="text-xs text-muted-foreground">({tools.length})</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {tools.map((tool) => (
                            <label
                              key={tool.id}
                              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                formData.selectedTools.includes(tool.id)
                                  ? "bg-primary/10 border border-primary"
                                  : "bg-secondary border border-transparent hover:bg-accent"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={formData.selectedTools.includes(tool.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateFormData("selectedTools", [...formData.selectedTools, tool.id])
                                  } else {
                                    updateFormData(
                                      "selectedTools",
                                      formData.selectedTools.filter((t) => t !== tool.id)
                                    )
                                  }
                                }}
                                className="w-4 h-4 mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">{tool.name}</span>
                                  {tool.risk_level === 'high' && (
                                    <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                                      high risk
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{tool.description}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )
                  })}
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
                      {availableModels.find((m) => m.id === formData.modelId)?.name || "(not set)"}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Schedule</span>
                    <span>{scheduleOptions.find((s) => s.id === formData.schedule)?.name}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Tools</span>
                    <span>{formData.selectedTools.length} selected</span>
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
                disabled={!formData.name || !formData.modelId || totalWeight !== 100 || isSubmitting}
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
