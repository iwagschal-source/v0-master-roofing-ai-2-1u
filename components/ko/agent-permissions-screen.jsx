"use client"

import { useState, useEffect } from "react"
import {
  Bot,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  Eye,
  Edit3,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Settings,
  Database,
  Mail,
  FileText,
  Briefcase,
  MessageSquare,
  Brain,
  Zap
} from "lucide-react"

const CATEGORY_ICONS = {
  email: Mail,
  sync: Database,
  takeoff: FileText,
  proposal: Briefcase,
  intelligence: Brain,
  communication: MessageSquare,
  audit: Eye,
  core: Zap,
}

const CATEGORY_COLORS = {
  email: "text-blue-500",
  sync: "text-green-500",
  takeoff: "text-orange-500",
  proposal: "text-purple-500",
  intelligence: "text-cyan-500",
  communication: "text-yellow-500",
  audit: "text-gray-500",
  core: "text-primary",
}

export function AgentPermissionsScreen({ onBack }) {
  const [permissions, setPermissions] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [selectedRole, setSelectedRole] = useState("viewer")
  const [activeTab, setActiveTab] = useState("roles") // roles | agents | settings

  useEffect(() => {
    fetchPermissions()
  }, [])

  const fetchPermissions = async () => {
    try {
      const res = await fetch('/api/admin/agents')
      const data = await res.json()
      setPermissions(data)

      // Expand all categories by default
      const categories = new Set()
      if (data.agents) {
        ;[...data.agents.deterministic, ...data.agents.interpretive].forEach(a => {
          categories.add(a.category)
        })
      }
      const expanded = {}
      categories.forEach(c => expanded[c] = true)
      setExpandedCategories(expanded)
    } catch (err) {
      console.error('Failed to fetch permissions:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }))
  }

  const isAgentEnabled = (agentName, role) => {
    if (!permissions?.rolePermissions?.[role]) return false
    const allowed = permissions.rolePermissions[role].allowedAgents
    return allowed === 'all' || (Array.isArray(allowed) && allowed.includes(agentName))
  }

  const toggleAgentForRole = async (agentName, role, currentEnabled) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'toggleAgent',
          data: { role, agentName, enabled: !currentEnabled }
        })
      })
      const data = await res.json()
      if (data.permissions) {
        setPermissions(data.permissions)
      }
    } catch (err) {
      console.error('Failed to toggle agent:', err)
    } finally {
      setSaving(false)
    }
  }

  const requiresApproval = (agentName) => {
    return permissions?.globalSettings?.requireApprovalFor?.includes(agentName)
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const allAgents = permissions?.agents
    ? [...permissions.agents.deterministic, ...permissions.agents.interpretive]
    : []

  // Group agents by category
  const agentsByCategory = allAgents.reduce((acc, agent) => {
    if (!acc[agent.category]) acc[agent.category] = []
    acc[agent.category].push(agent)
    return acc
  }, {})

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Agent Permissions</h1>
            <p className="text-sm text-muted-foreground">Configure which agents can be used by each role</p>
          </div>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Settings
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-border bg-muted/30">
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "roles"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Role Permissions
        </button>
        <button
          onClick={() => setActiveTab("agents")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "agents"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot className="w-4 h-4 inline mr-2" />
          Agent Registry
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "settings"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Global Settings
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "roles" && (
          <div className="space-y-6">
            {/* Role Selector */}
            <div className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border">
              <span className="text-sm font-medium">Select Role:</span>
              <div className="flex gap-2">
                {["admin", "editor", "viewer"].map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedRole === role
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {role === "admin" && <ShieldCheck className="w-4 h-4" />}
                    {role === "editor" && <Edit3 className="w-4 h-4" />}
                    {role === "viewer" && <Eye className="w-4 h-4" />}
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Info */}
            <div className={`p-4 rounded-xl border ${
              selectedRole === "admin"
                ? "bg-red-500/10 border-red-500/30"
                : selectedRole === "editor"
                  ? "bg-blue-500/10 border-blue-500/30"
                  : "bg-muted/50 border-border"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {selectedRole === "admin" && <ShieldAlert className="w-5 h-5 text-red-500" />}
                {selectedRole === "editor" && <Edit3 className="w-5 h-5 text-blue-500" />}
                {selectedRole === "viewer" && <Eye className="w-5 h-5 text-muted-foreground" />}
                <span className="font-medium capitalize">{selectedRole} Role</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedRole === "admin" && "Full access to all agents. Can execute any agent and modify permissions."}
                {selectedRole === "editor" && "Can use email and intelligence agents. Cannot modify system settings."}
                {selectedRole === "viewer" && "Read-only access. Can only view summaries and basic KO interactions."}
              </p>
            </div>

            {/* Agent List by Category */}
            <div className="space-y-4">
              {Object.entries(agentsByCategory).map(([category, agents]) => {
                const CategoryIcon = CATEGORY_ICONS[category] || Bot
                const isExpanded = expandedCategories[category]

                return (
                  <div key={category} className="border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon className={`w-5 h-5 ${CATEGORY_COLORS[category]}`} />
                        <span className="font-medium capitalize">{category}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {agents.length} agents
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="divide-y divide-border">
                        {agents.map((agent) => {
                          const enabled = isAgentEnabled(agent.name, selectedRole)
                          const needsApproval = requiresApproval(agent.name)
                          const isAdmin = selectedRole === "admin"
                          const isDeterministic = permissions.agents.deterministic.some(a => a.id === agent.id)

                          return (
                            <div
                              key={agent.id}
                              className="flex items-center justify-between p-4 bg-background"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                  enabled ? "bg-green-500/10" : "bg-muted"
                                }`}>
                                  {enabled ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{agent.displayName}</span>
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      {agent.id}
                                    </span>
                                    {isDeterministic ? (
                                      <span className="text-[10px] text-green-600 bg-green-500/10 px-1.5 py-0.5 rounded">
                                        Deterministic
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded">
                                        Interpretive
                                      </span>
                                    )}
                                    {needsApproval && (
                                      <span className="text-[10px] text-yellow-600 bg-yellow-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Requires Approval
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {agent.description}
                                  </p>
                                </div>
                              </div>

                              {/* Toggle */}
                              {isAdmin ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Lock className="w-3 h-3" />
                                  <span>Always On</span>
                                </div>
                              ) : (
                                <button
                                  onClick={() => toggleAgentForRole(agent.name, selectedRole, enabled)}
                                  disabled={saving}
                                  className={`relative w-12 h-6 rounded-full transition-colors ${
                                    enabled ? "bg-green-500" : "bg-muted"
                                  }`}
                                >
                                  <div className={`absolute w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                                    enabled ? "translate-x-6" : "translate-x-0.5"
                                  } top-0.5`} />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeTab === "agents" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Deterministic Agents */}
              <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-green-500" />
                  <h3 className="font-medium">Deterministic Agents</h3>
                  <span className="text-xs text-muted-foreground">
                    ({permissions?.agents?.deterministic?.length || 0})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Python/SQL based agents with predictable outputs
                </p>
                <div className="space-y-2">
                  {permissions?.agents?.deterministic?.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-2 p-2 bg-background rounded-lg">
                      <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
                        {(() => {
                          const Icon = CATEGORY_ICONS[agent.category] || Bot
                          return <Icon className="w-3 h-3 text-green-600" />
                        })()}
                      </div>
                      <span className="text-sm">{agent.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interpretive Agents */}
              <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="w-5 h-5 text-purple-500" />
                  <h3 className="font-medium">Interpretive Agents</h3>
                  <span className="text-xs text-muted-foreground">
                    ({permissions?.agents?.interpretive?.length || 0})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  LLM-based agents with creative/analytical outputs
                </p>
                <div className="space-y-2">
                  {permissions?.agents?.interpretive?.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-2 p-2 bg-background rounded-lg">
                      <div className="w-6 h-6 rounded bg-purple-500/20 flex items-center justify-center">
                        {(() => {
                          const Icon = CATEGORY_ICONS[agent.category] || Bot
                          return <Icon className="w-3 h-3 text-purple-600" />
                        })()}
                      </div>
                      <span className="text-sm">{agent.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6 max-w-2xl">
            {/* Require Approval Settings */}
            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h3 className="font-medium">Agents Requiring Approval</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                These agents will ask for explicit user confirmation before executing
              </p>
              <div className="space-y-2">
                {permissions?.globalSettings?.requireApprovalFor?.map((agentName) => {
                  const agent = allAgents.find(a => a.name === agentName)
                  return (
                    <div key={agentName} className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-yellow-600" />
                        <span className="text-sm font-medium">{agent?.displayName || agentName}</span>
                      </div>
                      <span className="text-xs text-yellow-600">Requires Approval</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Audit Settings */}
            <div className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-muted-foreground" />
                <h3 className="font-medium">Audit Settings</h3>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Audit All Agent Actions</p>
                  <p className="text-xs text-muted-foreground">Log all agent executions for compliance</p>
                </div>
                <div className={`w-12 h-6 rounded-full ${permissions?.globalSettings?.auditAll ? 'bg-green-500' : 'bg-muted'} relative`}>
                  <div className={`absolute w-5 h-5 rounded-full bg-white shadow-sm ${
                    permissions?.globalSettings?.auditAll ? 'translate-x-6' : 'translate-x-0.5'
                  } top-0.5 transition-transform`} />
                </div>
              </div>
            </div>

            {/* Last Updated */}
            {permissions?.lastUpdated && (
              <p className="text-xs text-muted-foreground text-center">
                Last updated: {new Date(permissions.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
