"use client"

import { ChevronRight, User, ExternalLink } from "lucide-react"

// HubSpot/Asana aligned status colors
const statusColors = {
  new_lead: "bg-blue-500",
  rfp_received: "bg-indigo-500",
  estimating: "bg-yellow-500",
  proposal_pending: "bg-orange-500",
  proposal_sent: "bg-purple-500",
  negotiation: "bg-pink-500",
  won: "bg-green-500",
  lost: "bg-red-500",
  on_hold: "bg-gray-500",
  pending: "bg-gray-400",
}

const statusLabels = {
  new_lead: "New Lead",
  rfp_received: "RFP Received",
  estimating: "Estimating",
  proposal_pending: "Proposal Pending",
  proposal_sent: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
  on_hold: "On Hold",
  pending: "Pending",
}

function formatCurrency(amount) {
  if (!amount) return "$0"
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`
  return `$${amount.toLocaleString()}`
}

function formatDate(dateString) {
  if (!dateString) return "No due date"
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export function ProjectCard({ project, onClick }) {
  const status = project.status || "pending"
  const assignee = project.assignee

  return (
    <button
      onClick={() => onClick?.(project)}
      className="w-full group relative bg-card rounded-xl p-5 text-left transition-all duration-200 hover:scale-[1.01] border border-border/50 hover:border-primary/20 hover:shadow-lg"
    >
      {/* Active indicator line on hover */}
      <div className="absolute left-0 top-4 bottom-4 w-[3px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* Source badge */}
      {project.source === 'asana' && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-500 text-[10px] font-medium">
          Asana
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Project Name/Address */}
          <h3 className="font-semibold text-foreground text-base truncate mb-1 pr-16">
            {project.name || project.address}
          </h3>

          {/* GC Name */}
          <p className="text-foreground-secondary text-sm truncate mb-2">
            {project.gc_name || "No GC assigned"}
          </p>

          {/* Assignee row */}
          {assignee && (
            <div className="flex items-center gap-1.5 mb-2">
              <User className="w-3 h-3 text-foreground-tertiary" />
              <span className="text-xs text-foreground-secondary truncate">
                {assignee.name}
              </span>
            </div>
          )}

          {/* Bottom row: Amount, Due Date */}
          <div className="flex items-center gap-4 text-sm">
            {project.amount > 0 && (
              <>
                <span className="font-medium text-foreground tabular-nums">
                  {formatCurrency(project.amount)}
                </span>
                <span className="text-foreground-tertiary">|</span>
              </>
            )}
            <span className="text-foreground-tertiary">
              Due: {formatDate(project.due_date)}
            </span>
          </div>
        </div>

        {/* Right side: Status + Arrow */}
        <div className="flex items-center gap-3 shrink-0 mt-6">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColors[status] || statusColors.pending}`} />
            <span className="text-sm text-foreground-secondary whitespace-nowrap">
              {statusLabels[status] || status}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-foreground-tertiary group-hover:text-primary transition-colors" />
        </div>
      </div>

      {/* Asana link */}
      {project.asana_url && (
        <a
          href={project.asana_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-3 right-3 p-1 rounded hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
        >
          <ExternalLink className="w-3.5 h-3.5 text-foreground-tertiary" />
        </a>
      )}
    </button>
  )
}
