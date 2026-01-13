"use client"

import { Check, Loader2, Circle, Search, Brain, Combine, MessageSquare, Database, FileText, Users, BarChart3 } from "lucide-react"

/**
 * PhaseTracker - Shows real-time progress through the multi-agent pipeline
 *
 * Displays:
 * - Phase progress (project_resolution → routing → merge → response)
 * - Tool execution status (bigquery, vertex_search, hubspot, powerbi)
 */

const PHASE_CONFIG = {
  project_resolution: {
    icon: Search,
    label: "Identifying Projects"
  },
  routing: {
    icon: Brain,
    label: "Analyzing Question"
  },
  merge: {
    icon: Combine,
    label: "Synthesizing"
  },
  response: {
    icon: MessageSquare,
    label: "Composing Answer"
  }
}

const TOOL_CONFIG = {
  bigquery: {
    icon: Database,
    label: "Analytics"
  },
  vertex_search: {
    icon: FileText,
    label: "Documents"
  },
  hubspot: {
    icon: Users,
    label: "CRM"
  },
  powerbi: {
    icon: BarChart3,
    label: "Visualization"
  }
}

function StatusIcon({ status }) {
  if (status === 'complete') {
    return <Check className="w-4 h-4 text-green-500" />
  }
  if (status === 'active') {
    return <Loader2 className="w-4 h-4 text-primary animate-spin" />
  }
  return <Circle className="w-4 h-4 text-muted-foreground/30" />
}

function PhaseItem({ phase, isLast }) {
  const config = PHASE_CONFIG[phase.name] || { icon: Circle, label: phase.name }
  const Icon = config.icon

  return (
    <div className={`flex items-start gap-3 ${!isLast ? 'pb-3' : ''}`}>
      {/* Status indicator */}
      <div className="flex flex-col items-center">
        <StatusIcon status={phase.status} />
        {!isLast && (
          <div className={`w-0.5 h-full mt-1 ${
            phase.status === 'complete' ? 'bg-green-500/30' : 'bg-muted-foreground/20'
          }`} />
        )}
      </div>

      {/* Phase info */}
      <div className="flex-1 min-w-0 -mt-0.5">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${
            phase.status === 'active' ? 'text-primary' :
            phase.status === 'complete' ? 'text-foreground' :
            'text-muted-foreground/50'
          }`} />
          <span className={`text-sm font-medium ${
            phase.status === 'active' ? 'text-primary' :
            phase.status === 'complete' ? 'text-foreground' :
            'text-muted-foreground/50'
          }`}>
            {config.label}
          </span>
        </div>

        {/* Phase data summary */}
        {phase.status === 'complete' && phase.data && (
          <div className="mt-1 text-xs text-muted-foreground">
            {phase.name === 'project_resolution' && phase.data.projects?.length > 0 && (
              <span>Found: {phase.data.projects.join(', ')}</span>
            )}
            {phase.name === 'routing' && phase.data.tools?.length > 0 && (
              <span>Using: {phase.data.tools.join(', ')}</span>
            )}
            {phase.name === 'merge' && phase.data.insights_count > 0 && (
              <span>{phase.data.insights_count} insight(s) synthesized</span>
            )}
          </div>
        )}

        {/* Active phase message */}
        {phase.status === 'active' && phase.message && (
          <p className="mt-1 text-xs text-muted-foreground animate-pulse">
            {phase.message}
          </p>
        )}
      </div>
    </div>
  )
}

function ToolItem({ tool }) {
  const config = TOOL_CONFIG[tool.name] || { icon: Circle, label: tool.name }
  const Icon = config.icon

  return (
    <div className="flex items-center gap-2 py-1">
      {tool.status === 'complete' ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Loader2 className="w-3 h-3 text-primary animate-spin" />
      )}
      <Icon className="w-3 h-3 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">
        {config.label}
        {tool.summary && (
          <span className="text-muted-foreground/70"> — {tool.summary}</span>
        )}
      </span>
    </div>
  )
}

export function PhaseTracker({ phases = [], tools = [], currentPhase, compact = false }) {
  // Don't render if no phases
  if (!phases || phases.length === 0) return null

  // Only show phases that are active or complete
  const visiblePhases = phases.filter(p => p.status === 'active' || p.status === 'complete')

  if (visiblePhases.length === 0) return null

  // Find the routing phase to show tools under
  const routingPhase = phases.find(p => p.name === 'routing')
  const showTools = routingPhase?.status === 'complete' && tools.length > 0

  return (
    <div className="rounded-xl border border-border bg-card/50 p-4 backdrop-blur-sm">
      <div className="space-y-0">
        {visiblePhases.map((phase, index) => (
          <div key={phase.name}>
            <PhaseItem
              phase={phase}
              isLast={index === visiblePhases.length - 1 && !showTools}
            />

            {/* Show tools under routing phase */}
            {phase.name === 'routing' && showTools && (
              <div className="ml-7 mt-2 mb-3 pl-3 border-l-2 border-muted-foreground/20">
                {tools.map(tool => (
                  <ToolItem key={tool.name} tool={tool} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
