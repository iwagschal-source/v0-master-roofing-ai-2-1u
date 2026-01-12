"use client"

import { ChevronRight } from "lucide-react"

const statusColors = {
  estimating: "bg-yellow-500",
  proposal_sent: "bg-blue-500",
  won: "bg-green-500",
  lost: "bg-red-500",
  pending: "bg-gray-500",
}

const statusLabels = {
  estimating: "Estimating",
  proposal_sent: "Proposal Sent",
  won: "Won",
  lost: "Lost",
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

  return (
    <button
      onClick={() => onClick?.(project)}
      className="w-full group relative bg-card rounded-xl p-5 text-left transition-all duration-200 hover:scale-[1.01] border border-border/50 hover:border-primary/20 hover:shadow-lg"
    >
      {/* Active indicator line on hover */}
      <div className="absolute left-0 top-4 bottom-4 w-[3px] bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Project Name/Address */}
          <h3 className="font-semibold text-foreground text-base truncate mb-1">
            {project.name || project.address}
          </h3>

          {/* GC Name */}
          <p className="text-foreground-secondary text-sm truncate mb-3">
            {project.gc_name || "No GC assigned"}
          </p>

          {/* Bottom row: Amount, Due Date, Status */}
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(project.amount)}
            </span>
            <span className="text-foreground-tertiary">|</span>
            <span className="text-foreground-tertiary">
              Due: {formatDate(project.due_date)}
            </span>
          </div>
        </div>

        {/* Right side: Status + Arrow */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColors[status] || statusColors.pending}`} />
            <span className="text-sm text-foreground-secondary">
              {statusLabels[status] || status}
            </span>
          </div>
          <ChevronRight className="w-5 h-5 text-foreground-tertiary group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  )
}
