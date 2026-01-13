"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Play,
  Pause,
  Filter,
  AlertTriangle,
  Activity,
  X,
} from "lucide-react"
import { agents, statusConfig, connectionTypes, getAllConnections, getBottlenecks } from "@/data/agent-data"
import { AgentModelIcon, StatusDot, QueueIndicator } from "./agent-model-icon"

// Calculate node positions in a hierarchical layout
function calculatePositions(agentList) {
  const positions = {}
  const layers = {
    user: { y: 60, nodes: ["USER"] },
    orchestrator: { y: 160, nodes: [] },
    primary: { y: 290, nodes: [] },
    support: { y: 420, nodes: [] },
  }

  // Categorize agents by role
  agentList.forEach((agent) => {
    if (agent.id.includes("ORCH")) {
      layers.orchestrator.nodes.push(agent.id)
    } else if (agent.id.includes("AUDIT")) {
      layers.support.nodes.push(agent.id) // Audit at bottom to show it monitoring all
    } else if (["AGT-BQ-001", "AGT-HS-001", "AGT-EMAIL-001"].includes(agent.id)) {
      layers.primary.nodes.push(agent.id)
    } else {
      layers.support.nodes.push(agent.id)
    }
  })

  // Position nodes in each layer
  const canvasWidth = 1000
  Object.entries(layers).forEach(([layerName, layer]) => {
    const nodeCount = layer.nodes.length
    if (nodeCount === 0) return
    const spacing = Math.min(200, (canvasWidth - 100) / nodeCount)
    const startX = (canvasWidth - (nodeCount - 1) * spacing) / 2

    layer.nodes.forEach((nodeId, idx) => {
      positions[nodeId] = {
        x: startX + idx * spacing,
        y: layer.y,
      }
    })
  })

  // Add user node at top center
  positions["USER"] = { x: canvasWidth / 2, y: 60 }

  return positions
}

// Network Node Component
function NetworkNode({ agent, position, isSelected, onClick, isAnimating, showQueueBadge }) {
  const status = agent ? statusConfig[agent.status] : { color: "bg-blue-500", label: "USER" }
  const isUser = !agent
  const hasBacklog = agent?.queueDepth >= 5

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onClick={() => onClick(agent?.id || "USER")}
      className="cursor-pointer"
    >
      {/* Outer glow for live/error agents */}
      {isAnimating && agent?.status === "live" && (
        <circle r="52" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.4">
          <animate attributeName="r" values="48;56;48" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Backlog warning ring */}
      {hasBacklog && (
        <circle r="50" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="8,4">
          <animate attributeName="stroke-dashoffset" values="0;24" dur="1s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Main circle */}
      <circle
        r="44"
        fill={isSelected ? "#1e3a5f" : "#0f172a"}
        stroke={isSelected ? "#3b82f6" : hasBacklog ? "#f59e0b" : "#334155"}
        strokeWidth={isSelected ? 3 : 2}
        className="transition-all duration-200"
      />

      {/* Inner content */}
      {isUser ? (
        <text textAnchor="middle" dy="8" fill="#3b82f6" fontSize="28" fontWeight="bold">
          U
        </text>
      ) : (
        <>
          {/* Model icon background */}
          <circle r="28" fill={agent.modelKey === "gemini" ? "#4285F4" : agent.modelKey === "claude" ? "#D4A574" : agent.modelKey === "gpt" ? "#10A37F" : "#6366F1"} />
          <text textAnchor="middle" dy="8" fill="white" fontSize="20" fontWeight="bold">
            {agent.modelKey === "gemini" ? "G" : agent.modelKey === "claude" ? "C" : agent.modelKey === "gpt" ? "O" : "?"}
          </text>
        </>
      )}

      {/* Status indicator */}
      {agent && (
        <circle
          cx="30"
          cy="-30"
          r="10"
          fill={status.color?.includes("emerald") ? "#10b981" : status.color?.includes("amber") ? "#f59e0b" : status.color?.includes("red") ? "#ef4444" : status.color?.includes("purple") ? "#a855f7" : "#6b7280"}
          stroke="#0f172a"
          strokeWidth="2"
        >
          {(agent.status === "live" || agent.status === "error") && (
            <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
          )}
        </circle>
      )}

      {/* Queue depth badge */}
      {showQueueBadge && agent?.queueDepth > 0 && (
        <g transform="translate(-30, -30)">
          <rect x="-12" y="-10" width="24" height="20" rx="4" fill={agent.queueDepth >= 5 ? "#ef4444" : "#f59e0b"} />
          <text textAnchor="middle" dy="5" fill="white" fontSize="11" fontWeight="bold">
            {agent.queueDepth}
          </text>
        </g>
      )}

      {/* Label */}
      <text textAnchor="middle" y="65" fill="#e2e8f0" fontSize="12" fontWeight="600">
        {isUser ? "USER" : agent.name}
      </text>
      {!isUser && (
        <text textAnchor="middle" y="80" fill="#64748b" fontSize="10" fontFamily="monospace">
          {agent.id}
        </text>
      )}
    </g>
  )
}

// Connection Line Component
function ConnectionLine({ from, to, type, isActive, isAnimating, bidirectional }) {
  const config = connectionTypes[type] || connectionTypes.query

  // Calculate path
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Start/end points (offset from center of circles)
  const offsetRatio = 44 / distance
  const startX = from.x + dx * offsetRatio
  const startY = from.y + dy * offsetRatio
  const endX = to.x - dx * offsetRatio
  const endY = to.y - dy * offsetRatio

  // Control point for curve
  const midX = (startX + endX) / 2
  const midY = (startY + endY) / 2
  const perpX = -(endY - startY) * 0.15
  const perpY = (endX - startX) * 0.15
  const controlX = midX + perpX
  const controlY = midY + perpY

  const pathD = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`

  return (
    <g className="pointer-events-none">
      {/* Base line */}
      <path
        d={pathD}
        fill="none"
        stroke={config.color}
        strokeWidth={isActive ? 3 : 2}
        strokeDasharray={config.dash ? "8,4" : "none"}
        opacity={isActive ? 0.9 : 0.3}
        className="transition-all duration-300"
      />

      {/* Animated flow particles */}
      {isAnimating && isActive && (
        <>
          <circle r="5" fill={config.color}>
            <animateMotion dur="1.5s" repeatCount="indefinite" path={pathD} />
          </circle>
          <circle r="5" fill={config.color}>
            <animateMotion dur="1.5s" repeatCount="indefinite" path={pathD} begin="0.5s" />
          </circle>
          <circle r="5" fill={config.color}>
            <animateMotion dur="1.5s" repeatCount="indefinite" path={pathD} begin="1s" />
          </circle>
        </>
      )}
    </g>
  )
}

export function AgentNetworkMapScreen({ onBack, onSelectAgent }) {
  const [zoom, setZoom] = useState(1)
  const [selectedNode, setSelectedNode] = useState(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [filter, setFilter] = useState("all")
  const svgRef = useRef(null)

  const positions = useMemo(() => calculatePositions(agents), [])
  const connections = useMemo(() => getAllConnections(), [])
  const bottlenecks = useMemo(() => getBottlenecks(5), [])

  // Filter connections
  const filteredConnections = useMemo(() => {
    if (filter === "all") return connections
    return connections.filter((c) => c.type === filter)
  }, [connections, filter])

  // Get active agents (live status)
  const activeAgentIds = useMemo(
    () => new Set(agents.filter((a) => a.status === "live").map((a) => a.id)),
    []
  )

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.2, 2))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.2, 0.5))
  const handleReset = () => setZoom(1)

  const handleNodeClick = (nodeId) => {
    if (nodeId === "USER") {
      setSelectedNode(null)
      return
    }
    setSelectedNode(nodeId)
  }

  const selectedAgent = selectedNode ? agents.find((a) => a.id === selectedNode) : null

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-secondary rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Agent Network Map</h1>
              <p className="text-sm text-muted-foreground">
                {agents.length} agents | {connections.length} connections |{" "}
                {activeAgentIds.size} active
              </p>
            </div>
          </div>

          {/* Alerts */}
          {bottlenecks.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <AlertTriangle size={16} className="text-amber-400" />
              <span className="text-sm text-amber-400">
                {bottlenecks.length} agent{bottlenecks.length > 1 ? "s" : ""} with queue backlog
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Connection type filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm"
            >
              <option value="all">All Connections</option>
              <option value="query">Query Flow</option>
              <option value="data">Data Flow</option>
              <option value="audit">Audit Flow</option>
              <option value="alert">Alert Flow</option>
            </select>

            {/* Play/Pause animations */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-secondary border border-border rounded-lg hover:bg-accent transition-colors"
              title={isPlaying ? "Pause animations" : "Play animations"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {/* Zoom controls */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button onClick={handleZoomOut} className="p-2 bg-secondary hover:bg-accent">
                <ZoomOut size={18} />
              </button>
              <span className="px-3 text-sm bg-secondary min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button onClick={handleZoomIn} className="p-2 bg-secondary hover:bg-accent">
                <ZoomIn size={18} />
              </button>
            </div>

            <button
              onClick={handleReset}
              className="p-2 bg-secondary border border-border rounded-lg hover:bg-accent"
              title="Reset zoom"
            >
              <Maximize2 size={18} />
            </button>

            <button
              className="p-2 bg-secondary border border-border rounded-lg hover:bg-accent"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Network visualization */}
        <div className="flex-1 overflow-auto p-6">
          <div
            className="bg-card border border-border rounded-xl overflow-hidden"
            style={{ minHeight: "500px" }}
          >
            <svg
              ref={svgRef}
              viewBox="0 0 1000 520"
              className="w-full h-full"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center",
                minHeight: "500px",
              }}
            >
              {/* Background grid */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Connection lines (rendered first, behind nodes) */}
              {filteredConnections.map((conn, idx) => {
                const fromPos = positions[conn.from]
                const toPos = positions[conn.to]
                if (!fromPos || !toPos) return null

                const isActive =
                  activeAgentIds.has(conn.from) || activeAgentIds.has(conn.to)

                return (
                  <ConnectionLine
                    key={`${conn.from}-${conn.to}-${idx}`}
                    from={fromPos}
                    to={toPos}
                    type={conn.type}
                    isActive={isActive}
                    isAnimating={isPlaying}
                    bidirectional={conn.bidirectional}
                  />
                )
              })}

              {/* User node */}
              <NetworkNode
                agent={null}
                position={positions["USER"]}
                isSelected={selectedNode === "USER"}
                onClick={handleNodeClick}
                isAnimating={isPlaying}
                showQueueBadge={true}
              />

              {/* Agent nodes */}
              {agents.map((agent) => (
                <NetworkNode
                  key={agent.id}
                  agent={agent}
                  position={positions[agent.id]}
                  isSelected={selectedNode === agent.id}
                  onClick={handleNodeClick}
                  isAnimating={isPlaying}
                  showQueueBadge={true}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Side panel - shows details when node selected */}
        {selectedAgent && (
          <aside className="w-80 bg-card border-l border-border p-4 overflow-y-auto flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Agent Details</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 hover:bg-secondary rounded"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <AgentModelIcon modelKey={selectedAgent.modelKey} size="md" />
                <div>
                  <p className="font-semibold">{selectedAgent.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedAgent.id}</p>
                </div>
              </div>

              {/* Status */}
              <div
                className={`px-3 py-2 rounded-lg ${
                  selectedAgent.status === "error"
                    ? "bg-red-500/10 border border-red-500/20"
                    : selectedAgent.status === "live"
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-secondary"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <StatusDot status={selectedAgent.status} size="sm" />
                  <span className="text-sm font-medium capitalize">{selectedAgent.status}</span>
                </div>
                <p className="text-xs text-muted-foreground">{selectedAgent.currentAction}</p>
              </div>

              {/* Queue warning */}
              {selectedAgent.queueDepth > 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-400" />
                    <span className="text-sm text-amber-400 font-medium">
                      {selectedAgent.queueDepth} requests in queue
                    </span>
                  </div>
                  {selectedAgent.queueDepth >= 5 && (
                    <p className="text-xs text-amber-400/80 mt-1">
                      Consider scaling this agent
                    </p>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Success Rate</span>
                  <span className="text-emerald-400">{selectedAgent.stats.successRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg Latency</span>
                  <span>{selectedAgent.stats.avgLatency}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Req/min</span>
                  <span>{selectedAgent.stats.requestsPerMinute}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Errors Today</span>
                  <span className={selectedAgent.stats.errorsToday > 0 ? "text-red-400" : ""}>
                    {selectedAgent.stats.errorsToday}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connections</span>
                  <span>{selectedAgent.connections?.length || 0}</span>
                </div>
              </div>

              {/* Score */}
              <div className="p-3 bg-secondary rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overall Score</span>
                  <span
                    className={`text-lg font-bold ${
                      selectedAgent.scoring?.overallScore >= 90
                        ? "text-emerald-400"
                        : selectedAgent.scoring?.overallScore >= 70
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {selectedAgent.scoring?.overallScore || 0}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => onSelectAgent?.(selectedAgent)}
                className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
              >
                Open Agent Details
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Legend */}
      <div className="bg-card border-t border-border px-6 py-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Connection types */}
          <div className="flex items-center gap-6">
            <span className="text-xs text-muted-foreground font-medium">Connections:</span>
            {Object.entries(connectionTypes).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-6 h-0.5"
                  style={{
                    backgroundColor: config.color,
                    borderStyle: config.dash ? "dashed" : "solid",
                  }}
                />
                <span className="text-xs text-muted-foreground">{config.label}</span>
              </div>
            ))}
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-6">
            <span className="text-xs text-muted-foreground font-medium">Status:</span>
            {Object.entries(statusConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <StatusDot status={key} size="sm" />
                <span className="text-xs text-muted-foreground">{config.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
