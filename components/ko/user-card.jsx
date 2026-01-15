"use client"

import { Mail, Building2, Bell, FileText } from "lucide-react"

export function UserCard({ user, roleColors, onClick }) {
  const initials = user.display_name
    ? user.display_name.slice(0, 2).toUpperCase()
    : user.user_name?.slice(0, 2).toUpperCase() || "??"

  const roleColorClass = roleColors[user.role] || roleColors.Estimator
  const isInactive = user.agent_status === "inactive"

  const priorityLabel = {
    1: "High",
    2: "Medium",
    3: "Low",
  }[user.priority_level] || "—"

  return (
    <div
      onClick={onClick}
      className={`
        bg-card border border-border rounded-xl p-4 cursor-pointer
        hover:border-primary/50 hover:bg-accent/50 transition-all
        ${isInactive ? "opacity-60" : ""}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold
          ${isInactive ? "bg-gray-500/20 text-gray-400" : "bg-primary/20 text-primary"}
        `}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-foreground truncate">
              {user.user_name}
            </h3>
            {isInactive && (
              <span className="px-1.5 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">
                Inactive
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Mail className="w-3.5 h-3.5" />
            <span className="truncate">{user.user_email}</span>
          </div>

          {/* Role & Department */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 text-xs rounded-full border ${roleColorClass}`}>
              {user.role}
            </span>
            {user.department && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="w-3 h-3" />
                {user.department}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Permissions indicators */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs">
          <Bell className={`w-3.5 h-3.5 ${user.can_receive_nudges ? "text-emerald-400" : "text-gray-500"}`} />
          <span className={user.can_receive_nudges ? "text-foreground" : "text-muted-foreground"}>
            Nudges
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <FileText className={`w-3.5 h-3.5 ${user.can_receive_drafts ? "text-emerald-400" : "text-gray-500"}`} />
          <span className={user.can_receive_drafts ? "text-foreground" : "text-muted-foreground"}>
            Drafts
          </span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">
          Priority: {priorityLabel}
        </span>
      </div>
    </div>
  )
}
