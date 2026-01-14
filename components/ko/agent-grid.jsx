"use client"

import { AgentCard } from "./agent-card"

export function AgentGrid({ agents, filter = "all", searchTerm = "", onSelectAgent }) {
  // Filter agents
  // Map backend status to display status for filtering:
  // - filter "live" should match agents with backend status "busy"
  // - filter "idle" should match agents with backend status "live" or "idle"
  const filteredAgents = agents.filter((agent) => {
    let matchesFilter = filter === "all"
    if (!matchesFilter) {
      if (filter === "live") {
        // "Live" filter matches agents that are actively transmitting (busy status)
        matchesFilter = agent.status === "busy"
      } else if (filter === "idle") {
        // "Idle" filter matches agents that are available (live or idle status)
        matchesFilter = agent.status === "live" || agent.status === "idle"
      } else {
        // Other filters (error, paused, offline) match directly
        matchesFilter = agent.status === filter
      }
    }
    const matchesSearch =
      searchTerm === "" ||
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Sort: live (busy) first, then idle (available), then error, then paused, then offline
  // Map backend status to display order
  const getDisplayOrder = (status) => {
    if (status === "busy") return 0  // Actively transmitting first
    if (status === "live" || status === "idle") return 1  // Available agents
    if (status === "error") return 2
    if (status === "paused") return 3
    if (status === "offline") return 4
    return 5
  }
  const sortedAgents = [...filteredAgents].sort(
    (a, b) => getDisplayOrder(a.status) - getDisplayOrder(b.status)
  )

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {sortedAgents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} onClick={onSelectAgent} />
      ))}

      {sortedAgents.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-muted-foreground">No agents found</p>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filter
            </p>
          )}
        </div>
      )}
    </div>
  )
}
