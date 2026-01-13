"use client"

import { AgentCard } from "./agent-card"

export function AgentGrid({ agents, filter = "all", searchTerm = "", onSelectAgent }) {
  // Filter agents
  const filteredAgents = agents.filter((agent) => {
    const matchesFilter = filter === "all" || agent.status === filter
    const matchesSearch =
      searchTerm === "" ||
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Sort: live first, then idle, then error, then paused, then offline
  const statusOrder = { live: 0, idle: 1, error: 2, paused: 3, offline: 4 }
  const sortedAgents = [...filteredAgents].sort(
    (a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5)
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
