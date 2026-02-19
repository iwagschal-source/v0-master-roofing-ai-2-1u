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
} from "lucide-react"
import { agents, statusConfig, connectionTypes, getAllConnections, getBottlenecks } from "@/data/agent-data"
import { AgentModelIcon, StatusDot, QueueIndicator } from "./agent-model-icon"

const BACKEND_URL = process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || "http://136.111.252.120:8000"
const WS_BACKEND_URL = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://")

// Minimum spacing between nodes (node diameter + generous padding for readability)
const MIN_NODE_SPACING = 180

// Determine which ring an agent belongs to
function getAgentRing(agent) {
  // Orchestrators go in middle ring
  if (agent.role === 'orchestrator' || agent.role === 'super_agent') return 'middle'
  if (agent.id === 'CAO-GEM-001' || agent.id === 'CAO-PRIME-001') return 'middle'
  // Everyone else goes in outer ring
  return 'outer'
}

// Calculate dynamic ring radius based on node count
function calculateRingRadius(nodeCount, minRadius) {
  if (nodeCount <= 0) return minRadius
  // Circumference = 2*PI*r = nodeCount * minSpacing
  // r = (nodeCount * minSpacing) / (2 * PI)
  const requiredRadius = (nodeCount * MIN_NODE_SPACING) / (2 * Math.PI)
  return Math.max(minRadius, requiredRadius)
}

// Calculate node positions in concentric circles
function calculatePositions(agentList) {
  const positions = {}

  // Categorize agents into rings
  const rings = {
    middle: [],  // Orchestrators
    outer: [],   // All other agents
  }

  agentList.forEach((agent) => {
    const ring = getAgentRing(agent)
    rings[ring].push(agent.id)
  })

  // Calculate dynamic radii based on agent counts
  const middleRadius = calculateRingRadius(rings.middle.length, 120)
  const outerRadius = calculateRingRadius(rings.outer.length, middleRadius + 100)

  // Calculate center based on the largest radius needed
  const canvasSize = (outerRadius + 80) * 2  // Add padding for labels
  const center = { x: canvasSize / 2, y: canvasSize / 2 }

  // Store layout info for SVG viewBox
  positions._layout = {
    center,
    middleRadius,
    outerRadius,
    canvasSize,
    middleCount: rings.middle.length,
    outerCount: rings.outer.length,
  }

  // Position USER at center
  positions["USER"] = { x: center.x, y: center.y }

  // Position middle ring (orchestrators) - evenly spaced around circle
  const middleCount = rings.middle.length
  if (middleCount > 0) {
    const angleStep = (2 * Math.PI) / middleCount
    const startAngle = -Math.PI / 2  // Start from top
    rings.middle.forEach((nodeId, idx) => {
      const angle = startAngle + idx * angleStep
      positions[nodeId] = {
        x: center.x + middleRadius * Math.cos(angle),
        y: center.y + middleRadius * Math.sin(angle),
      }
    })
  }

  // Position outer ring (all other agents) - evenly spaced around circle
  const outerCount = rings.outer.length
  if (outerCount > 0) {
    const angleStep = (2 * Math.PI) / outerCount
    const startAngle = -Math.PI / 2  // Start from top
    rings.outer.forEach((nodeId, idx) => {
      const angle = startAngle + idx * angleStep
      positions[nodeId] = {
        x: center.x + outerRadius * Math.cos(angle),
        y: center.y + outerRadius * Math.sin(angle),
      }
    })
  }

  return positions
}

// Network Node Component
function NetworkNode({ agent, position, isSelected, onClick, isAnimating, showQueueBadge, isBusy, isBottleneck, isInLoop, isPaused, wasRecentlyActive }) {
  const status = agent ? statusConfig[agent.status] : { color: "bg-blue-500", label: "USER" }
  const isUser = !agent
  const hasBacklog = agent?.queueDepth >= 5

  // Determine actual status for indicator: transmitting (green), recently active (fading green), or idle (orange)
  const isTransmitting = isBusy && !isPaused
  const showRecentlyActive = wasRecentlyActive && !isBusy && !isPaused

  return (
    <g
      transform={`translate(${position.x}, ${position.y})`}
      onClick={() => onClick(agent?.id || "USER")}
      className="cursor-pointer"
    >
      {/* Loop indicator - flashing red dashed ring */}
      {isInLoop && (
        <circle r="60" fill="none" stroke="#ef4444" strokeWidth="4" strokeDasharray="10,5" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.3;0.9" dur="0.5s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="-360 0 0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Bottleneck indicator - pulsing orange ring */}
      {isBottleneck && !isInLoop && (
        <circle r="58" fill="none" stroke="#f97316" strokeWidth="4" opacity="0.8">
          <animate attributeName="r" values="56;62;56" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.8;0.4;0.8" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Paused indicator - gray overlay with pause icon lines */}
      {isPaused && (
        <>
          <circle r="56" fill="none" stroke="#6b7280" strokeWidth="4" opacity="0.8" />
          {/* Pause bars */}
          <rect x="-12" y="-15" width="8" height="30" fill="#6b7280" opacity="0.9" rx="2" />
          <rect x="4" y="-15" width="8" height="30" fill="#6b7280" opacity="0.9" rx="2" />
        </>
      )}

      {/* Busy processing indicator - bright cyan spinning ring */}
      {isBusy && !isInLoop && !isBottleneck && !isPaused && (
        <circle r="54" fill="none" stroke="#00f5ff" strokeWidth="3" strokeDasharray="20,10" opacity="0.8">
          <animateTransform attributeName="transform" type="rotate" from="0 0 0" to="360 0 0" dur="1s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Outer glow for live/error agents */}
      {isAnimating && agent?.status === "live" && !isBusy && (
        <circle r="52" fill="none" stroke="#10b981" strokeWidth="2" opacity="0.4">
          <animate attributeName="r" values="48;56;48" dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Backlog warning ring */}
      {hasBacklog && !isBusy && (
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

      {/* Status indicator - shows transmission state, not just status */}
      {agent && (
        <g>
          {/* Outer glow for transmitting state */}
          {isTransmitting && (
            <circle
              cx="30"
              cy="-30"
              r="14"
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              opacity="0.5"
            >
              <animate attributeName="r" values="12;16;12" dur="0.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0.2;0.5" dur="0.6s" repeatCount="indefinite" />
            </circle>
          )}
          {/* Fading glow for recently active */}
          {showRecentlyActive && (
            <circle
              cx="30"
              cy="-30"
              r="13"
              fill="none"
              stroke="#059669"
              strokeWidth="1.5"
              opacity="0.4"
            >
              <animate attributeName="r" values="11;14;11" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1s" repeatCount="indefinite" />
            </circle>
          )}
          {/* Main indicator dot */}
          <circle
            cx="30"
            cy="-30"
            r={isTransmitting ? "7" : showRecentlyActive ? "8" : "9"}
            fill={
              isTransmitting ? "#10b981" : // Bright green when transmitting
              showRecentlyActive ? "#059669" : // Darker green when recently active
              agent.status === "error" ? "#ef4444" : // Red for error
              agent.status === "paused" ? "#a855f7" : // Purple for paused
              agent.status === "offline" ? "#6b7280" : // Gray for offline
              "#f59e0b" // Amber/orange for idle (default)
            }
            stroke="#0f172a"
            strokeWidth="2"
          >
            {/* Throb animation for transmitting */}
            {isTransmitting && (
              <>
                <animate attributeName="r" values="6;8;6" dur="0.6s" repeatCount="indefinite" />
              </>
            )}
            {/* Slower throb for recently active */}
            {showRecentlyActive && (
              <animate attributeName="r" values="7;9;7" dur="1s" repeatCount="indefinite" />
            )}
            {/* Pulse for error */}
            {agent.status === "error" && !isTransmitting && !showRecentlyActive && (
              <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />
            )}
          </circle>
        </g>
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
function ConnectionLine({ from, to, type, isActive, isAnimating, bidirectional, isReturning }) {
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

  // Forward path (source -> target)
  const pathD = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
  // Reverse path (target -> source) for return animation
  const reversePath = `M ${endX} ${endY} Q ${controlX} ${controlY} ${startX} ${startY}`

  // Use green color for returning data
  const returnColor = '#22c55e'

  return (
    <g className="pointer-events-none">
      {/* Base line */}
      <path
        d={pathD}
        fill="none"
        stroke={isReturning ? returnColor : config.color}
        strokeWidth={isActive || isReturning ? 3 : 2}
        strokeDasharray={config.dash ? "8,4" : "none"}
        opacity={isActive || isReturning ? 0.9 : 0.3}
        className="transition-all duration-300"
      />

      {/* Animated flow particles - forward direction */}
      {isAnimating && isActive && !isReturning && (
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

      {/* Animated flow particles - return direction (green, faster) */}
      {isReturning && (
        <>
          <circle r="6" fill={returnColor}>
            <animateMotion dur="0.8s" repeatCount="indefinite" path={reversePath} />
          </circle>
          <circle r="6" fill={returnColor}>
            <animateMotion dur="0.8s" repeatCount="indefinite" path={reversePath} begin="0.25s" />
          </circle>
          <circle r="6" fill={returnColor}>
            <animateMotion dur="0.8s" repeatCount="indefinite" path={reversePath} begin="0.5s" />
          </circle>
        </>
      )}
    </g>
  )
}

// Zoom configuration: 0.5 scale = 100% display (comfortable default view)
const ZOOM_BASE = 0.5  // This scale = 100% in UI
const ZOOM_MIN = 0.1   // Allows zooming out to see everything
const ZOOM_MAX = 1.5   // Allows zooming in for detail
const ZOOM_STEP = 0.1  // Finer zoom control

export function AgentNetworkMapScreen({ onBack, onSelectAgent }) {
  const [zoom, setZoom] = useState(ZOOM_BASE)
  const [selectedNode, setSelectedNode] = useState(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [filter, setFilter] = useState("all")
  const svgRef = useRef(null)

  // Live data state
  const [liveAgents, setLiveAgents] = useState(null)
  const [liveConnections, setLiveConnections] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  // Fetch live agents from backend
  const fetchNetworkData = async () => {
    try {
      const res = await fetch('/api/ko/network/agents')
      if (res.ok) {
        const data = await res.json()
        setLiveAgents(data.agents)
        setLiveConnections(data.connections)
        setLastUpdate(new Date())
        setError(null)
      } else {
        throw new Error('Failed to fetch network data')
      }
    } catch (err) {
      console.error('Network fetch error:', err)
      setError(err.message)
      // Keep using static data as fallback
    } finally {
      setLoading(false)
    }
  }

  // Real-time WebSocket state for live call tracking
  const [activeCalls, setActiveCalls] = useState(new Map())
  const [returningCalls, setReturningCalls] = useState(new Map()) // Calls returning data
  const [busyAgents, setBusyAgents] = useState(new Set())
  const [recentlyActiveAgents, setRecentlyActiveAgents] = useState(new Map()) // Track agents that were recently transmitting
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef(null)

  // When an agent stops being busy, add it to recently active with a timestamp
  // It will stay in "recently active" for 7 seconds (post-transmission glow)
  const RECENTLY_ACTIVE_DURATION = 7000 // 7 seconds

  // Phase 4: Loop and bottleneck detection
  const [detectedLoops, setDetectedLoops] = useState([])
  const [bottleneckAgents, setBottleneckAgents] = useState(new Set())
  const callHistoryRef = useRef([]) // Track recent call patterns

  // Phase 5: Pause/Resume state
  const [networkPaused, setNetworkPaused] = useState(false)
  const [pausedAgents, setPausedAgents] = useState(new Set())
  const [pausePending, setPausePending] = useState(false)

  // Pause/Resume handlers
  const toggleNetworkPause = async () => {
    setPausePending(true)
    const agentList = liveAgents || agents
    try {
      const action = networkPaused ? 'resume' : 'pause'
      const res = await fetch(`${BACKEND_URL}/v1/network/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok) {
        setNetworkPaused(!networkPaused)
        if (!networkPaused) {
          // When pausing network, pause all agents
          setPausedAgents(new Set(agentList?.map(a => a.id) || []))
        } else {
          // When resuming network, resume all agents
          setPausedAgents(new Set())
        }
      }
    } catch (err) {
      console.error('Failed to toggle network pause:', err)
      // Still update local state even if backend fails
      setNetworkPaused(!networkPaused)
      if (!networkPaused) {
        setPausedAgents(new Set(agentList?.map(a => a.id) || []))
      } else {
        setPausedAgents(new Set())
      }
    } finally {
      setPausePending(false)
    }
  }

  const toggleAgentPause = async (agentId) => {
    const isPaused = pausedAgents.has(agentId)
    const action = isPaused ? 'resume' : 'pause'

    try {
      const res = await fetch(`${BACKEND_URL}/v1/agents/${agentId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.ok || true) { // Update local state even if backend not ready
        setPausedAgents(prev => {
          const next = new Set(prev)
          if (isPaused) {
            next.delete(agentId)
          } else {
            next.add(agentId)
          }
          return next
        })
      }
    } catch (err) {
      console.error(`Failed to ${action} agent ${agentId}:`, err)
      // Still update local state
      setPausedAgents(prev => {
        const next = new Set(prev)
        if (isPaused) {
          next.delete(agentId)
        } else {
          next.add(agentId)
        }
        return next
      })
    }
  }

  // Auto-pause on loop detection
  useEffect(() => {
    if (detectedLoops.length > 0 && !networkPaused) {
      // Auto-pause agents involved in the loop
      const loopAgents = new Set()
      detectedLoops.forEach(loop => loop.forEach(id => loopAgents.add(id)))
      setPausedAgents(prev => new Set([...prev, ...loopAgents]))
    }
  }, [detectedLoops])

  // Loop detection: Track call chains and detect cycles
  const detectLoop = (newCall) => {
    // Add to history
    const call = { source: newCall.source, target: newCall.target, timestamp: Date.now() }
    callHistoryRef.current = [...callHistoryRef.current.slice(-50), call] // Keep last 50 calls

    // Build call graph from recent history (last 30 seconds)
    const recentCalls = callHistoryRef.current.filter(c => Date.now() - c.timestamp < 30000)

    // DFS to detect cycles
    const findCycles = () => {
      const graph = new Map()
      recentCalls.forEach(c => {
        if (!graph.has(c.source)) graph.set(c.source, new Set())
        graph.get(c.source).add(c.target)
      })

      const cycles = []
      const visited = new Set()
      const recStack = new Set()
      const path = []

      const dfs = (node) => {
        visited.add(node)
        recStack.add(node)
        path.push(node)

        const neighbors = graph.get(node) || new Set()
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            const result = dfs(neighbor)
            if (result) return result
          } else if (recStack.has(neighbor)) {
            // Found a cycle
            const cycleStart = path.indexOf(neighbor)
            return [...path.slice(cycleStart), neighbor]
          }
        }

        recStack.delete(node)
        path.pop()
        return null
      }

      for (const node of graph.keys()) {
        if (!visited.has(node)) {
          const cycle = dfs(node)
          if (cycle) cycles.push(cycle)
        }
      }

      return cycles
    }

    const cycles = findCycles()
    if (cycles.length > 0) {
      setDetectedLoops(prev => {
        const newLoops = cycles.filter(cycle =>
          !prev.some(existing => JSON.stringify(existing) === JSON.stringify(cycle))
        )
        return [...prev, ...newLoops].slice(-5) // Keep last 5 detected loops
      })
    }
  }

  // Bottleneck detection: Identify overloaded agents
  const updateBottlenecks = (agents, activeCalls) => {
    const bottlenecks = new Set()

    // Count incoming calls per agent
    const incomingCallCounts = new Map()
    for (const call of activeCalls.values()) {
      const count = incomingCallCounts.get(call.target) || 0
      incomingCallCounts.set(call.target, count + 1)
    }

    agents.forEach(agent => {
      // High queue depth (>= 5 is a bottleneck)
      if (agent.queueDepth >= 5) {
        bottlenecks.add(agent.id)
      }

      // Many concurrent incoming calls (>= 3 is concerning)
      const incomingCalls = incomingCallCounts.get(agent.id) || 0
      if (incomingCalls >= 3) {
        bottlenecks.add(agent.id)
      }

      // High latency agent (> 2000ms average)
      if (agent.stats?.avgLatency > 2000) {
        bottlenecks.add(agent.id)
      }
    })

    setBottleneckAgents(bottlenecks)
  }

  // Update bottlenecks when active calls or agents change
  useEffect(() => {
    const agentList = liveAgents || agents
    if (agentList) {
      updateBottlenecks(agentList, activeCalls)
    }
  }, [activeCalls, liveAgents])

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchNetworkData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchNetworkData, 30000)
    return () => clearInterval(interval)
  }, [])

  // Clean up recently active agents after duration expires
  useEffect(() => {
    if (recentlyActiveAgents.size === 0) return

    const cleanupInterval = setInterval(() => {
      const now = Date.now()
      setRecentlyActiveAgents(prev => {
        const next = new Map()
        for (const [agentId, timestamp] of prev) {
          if (now - timestamp < RECENTLY_ACTIVE_DURATION) {
            next.set(agentId, timestamp)
          }
        }
        return next
      })
    }, 1000) // Check every second

    return () => clearInterval(cleanupInterval)
  }, [recentlyActiveAgents.size])

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(`${WS_BACKEND_URL}/ws/network`)
        wsRef.current = ws

        ws.onopen = () => {
          console.log('Network WebSocket connected')
          setWsConnected(true)
        }

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            switch (data.type) {
              case 'connected':
                // Initialize with current active calls
                if (data.active_calls) {
                  const callMap = new Map()
                  data.active_calls.forEach(call => {
                    callMap.set(call.call_id, call)
                  })
                  setActiveCalls(callMap)
                }
                break

              case 'call_start':
                setActiveCalls(prev => {
                  const next = new Map(prev)
                  next.set(data.call_id, {
                    source: data.source,
                    target: data.target,
                    type: data.call_type,
                    started_at: data.timestamp
                  })
                  return next
                })
                setBusyAgents(prev => new Set([...prev, data.target]))
                // Phase 4: Detect potential loops
                detectLoop({ source: data.source, target: data.target })
                break

              case 'call_end':
                // Move call to returning state for animation
                setActiveCalls(prev => {
                  const next = new Map(prev)
                  const call = next.get(data.call_id)
                  if (call) {
                    // Add to returning calls for reverse animation
                    setReturningCalls(rc => {
                      const rcNext = new Map(rc)
                      rcNext.set(data.call_id, { ...call, success: data.success })
                      return rcNext
                    })
                    // Remove from returning after animation completes
                    setTimeout(() => {
                      setReturningCalls(rc => {
                        const rcNext = new Map(rc)
                        rcNext.delete(data.call_id)
                        return rcNext
                      })
                    }, 1500) // 1.5s for return animation
                  }
                  next.delete(data.call_id)
                  // Check if target agent has other active calls
                  if (call) {
                    const hasOtherCalls = [...next.values()].some(c => c.target === call.target)
                    if (!hasOtherCalls) {
                      // Mark as recently active before removing from busy
                      setRecentlyActiveAgents(ra => {
                        const raNext = new Map(ra)
                        raNext.set(call.target, Date.now())
                        return raNext
                      })
                      setBusyAgents(prev => {
                        const next = new Set(prev)
                        next.delete(call.target)
                        return next
                      })
                    }
                  }
                  return next
                })
                break

              case 'agent_status':
                if (data.status === 'busy') {
                  setBusyAgents(prev => new Set([...prev, data.agent_id]))
                } else {
                  setBusyAgents(prev => {
                    const next = new Set(prev)
                    next.delete(data.agent_id)
                    return next
                  })
                }
                break
            }
          } catch (e) {
            console.error('WebSocket message parse error:', e)
          }
        }

        ws.onclose = () => {
          console.log('Network WebSocket disconnected')
          setWsConnected(false)
          // Attempt reconnect after 5 seconds
          setTimeout(connectWebSocket, 5000)
        }

        ws.onerror = (error) => {
          console.error('Network WebSocket error:', error)
        }
      } catch (e) {
        console.error('WebSocket connection error:', e)
        setTimeout(connectWebSocket, 5000)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // Use live data if available, otherwise fall back to static
  const currentAgents = liveAgents || agents
  const currentConnections = liveConnections || getAllConnections()

  const positions = useMemo(() => calculatePositions(currentAgents), [currentAgents])
  const bottlenecks = useMemo(() => currentAgents.filter(a => a.queueDepth >= 5), [currentAgents])

  // Filter connections
  const filteredConnections = useMemo(() => {
    if (filter === "all") return currentConnections
    return currentConnections.filter((c) => c.type === filter)
  }, [currentConnections, filter])

  // Get active agents (live status)
  const activeAgentIds = useMemo(
    () => new Set(currentAgents.filter((a) => a.status === "live").map((a) => a.id)),
    [currentAgents]
  )

  // Get agents involved in detected loops
  const agentsInLoops = useMemo(() => {
    const inLoop = new Set()
    detectedLoops.forEach(loop => {
      loop.forEach(agentId => inLoop.add(agentId))
    })
    return inLoop
  }, [detectedLoops])

  const handleZoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX))
  const handleZoomOut = () => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN))
  const handleReset = () => setZoom(ZOOM_BASE)

  // Display percentage relative to base (0.5 scale = 100%)
  const displayZoomPercent = Math.round((zoom / ZOOM_BASE) * 100)

  const handleNodeClick = (nodeId) => {
    if (nodeId === "USER") {
      setSelectedNode(null)
      return
    }
    setSelectedNode(nodeId)
  }

  const handleRefresh = () => {
    setLoading(true)
    fetchNetworkData()
  }

  const selectedAgent = selectedNode ? currentAgents.find((a) => a.id === selectedNode) : null

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
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                Agent Network Map
                {liveAgents && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full font-normal">
                    LIVE
                  </span>
                )}
                {wsConnected && (
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-normal flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                    REALTIME
                  </span>
                )}
                {loading && (
                  <RefreshCw size={16} className="animate-spin text-muted-foreground" />
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentAgents.length} agents | {currentConnections.length} connections |{" "}
                {activeAgentIds.size} active
                {activeCalls.size > 0 && (
                  <span className="ml-2 text-blue-400">
                    | {activeCalls.size} call{activeCalls.size > 1 ? 's' : ''} in progress
                  </span>
                )}
                {pausedAgents.size > 0 && (
                  <span className="ml-2 text-gray-400">
                    | {pausedAgents.size} paused
                  </span>
                )}
                {lastUpdate && (
                  <span className="ml-2 text-xs">
                    • Updated {lastUpdate.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Alerts */}
          <div className="flex flex-wrap gap-2">
            {error && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertTriangle size={16} className="text-red-400" />
                <span className="text-sm text-red-400">
                  Using fallback data: {error}
                </span>
              </div>
            )}
            {/* Loop detection warning */}
            {detectedLoops.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg animate-pulse">
                <AlertTriangle size={16} className="text-red-400" />
                <span className="text-sm text-red-400">
                  ⚠️ Loop detected: {detectedLoops[detectedLoops.length - 1].join(' → ')}
                </span>
                <button
                  onClick={() => setDetectedLoops([])}
                  className="ml-2 text-red-400 hover:text-red-300"
                  title="Dismiss"
                >
                  <ArrowLeft size={14} />
                </button>
              </div>
            )}
            {/* Bottleneck warning */}
            {bottleneckAgents.size > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <Activity size={16} className="text-orange-400" />
                <span className="text-sm text-orange-400">
                  {bottleneckAgents.size} bottleneck{bottleneckAgents.size > 1 ? "s" : ""}: {[...bottleneckAgents].join(', ')}
                </span>
              </div>
            )}
            {/* Queue backlog warning (original) */}
            {bottlenecks.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <AlertTriangle size={16} className="text-amber-400" />
                <span className="text-sm text-amber-400">
                  {bottlenecks.length} agent{bottlenecks.length > 1 ? "s" : ""} with queue backlog
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Connection type filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm"
            >
              <option value="all">All Connections</option>
              <option value="control">Control Flow</option>
              <option value="data">Data Flow</option>
              <option value="audit">Audit Flow</option>
            </select>

            {/* Network Pause/Resume (Emergency Stop) */}
            <button
              onClick={toggleNetworkPause}
              disabled={pausePending}
              className={`px-3 py-2 border rounded-lg font-medium transition-colors flex items-center gap-2 ${
                networkPaused
                  ? "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
                  : "bg-secondary border-border hover:bg-accent"
              }`}
              title={networkPaused ? "Resume all agents" : "Pause all agents (Emergency Stop)"}
            >
              {pausePending ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : networkPaused ? (
                <Play size={16} />
              ) : (
                <Pause size={16} />
              )}
              <span className="text-sm">{networkPaused ? "Resume" : "Pause All"}</span>
            </button>

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
              <button onClick={handleZoomOut} className="p-2 bg-secondary hover:bg-accent" title="Zoom out (min 20%)">
                <ZoomOut size={18} />
              </button>
              <span className="px-3 text-sm bg-secondary min-w-[60px] text-center">
                {displayZoomPercent}%
              </span>
              <button onClick={handleZoomIn} className="p-2 bg-secondary hover:bg-accent" title="Zoom in (max 300%)">
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
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 bg-secondary border border-border rounded-lg hover:bg-accent disabled:opacity-50"
              title="Refresh network data"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
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
              viewBox={`0 0 ${positions._layout?.canvasSize || 700} ${positions._layout?.canvasSize || 700}`}
              className="w-full h-full"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "center",
                minHeight: `${Math.min(positions._layout?.canvasSize || 700, 800)}px`,
              }}
            >
              {/* Background grid */}
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Concentric ring guides */}
              {positions._layout && (
              <g className="ring-guides">
                {/* Middle ring (orchestrators) */}
                <circle
                  cx={positions._layout.center.x}
                  cy={positions._layout.center.y}
                  r={positions._layout.middleRadius}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.5"
                />
                {/* Outer ring (agents) */}
                <circle
                  cx={positions._layout.center.x}
                  cy={positions._layout.center.y}
                  r={positions._layout.outerRadius}
                  fill="none"
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.5"
                />
                {/* Ring labels */}
                <text
                  x={positions._layout.center.x}
                  y={positions._layout.center.y - positions._layout.middleRadius - 8}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontWeight="500"
                >
                  ORCHESTRATORS ({positions._layout.middleCount})
                </text>
                <text
                  x={positions._layout.center.x}
                  y={positions._layout.center.y - positions._layout.outerRadius - 8}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontWeight="500"
                >
                  AGENTS ({positions._layout.outerCount})
                </text>
              </g>
              )}

              {/* Connection lines (rendered first, behind nodes) */}
              {filteredConnections.map((conn, idx) => {
                // Support both old (from/to) and new (sourceId/targetId) formats
                const sourceId = conn.sourceId || conn.from
                const targetId = conn.targetId || conn.to
                const fromPos = positions[sourceId]
                const toPos = positions[targetId]
                if (!fromPos || !toPos) return null

                // Check if this connection has an active call (real-time from WebSocket)
                const hasActiveCall = [...activeCalls.values()].some(
                  call => (call.source === sourceId && call.target === targetId) ||
                          (call.source === targetId && call.target === sourceId)
                )

                // Check if this connection has a returning call
                const hasReturningCall = [...returningCalls.values()].some(
                  call => (call.source === sourceId && call.target === targetId) ||
                          (call.source === targetId && call.target === sourceId)
                )

                // Only animate if there's a REAL active call - not just because agents are "live"
                const isActive = hasActiveCall || hasReturningCall

                return (
                  <ConnectionLine
                    key={`${sourceId}-${targetId}-${idx}`}
                    from={fromPos}
                    to={toPos}
                    type={hasActiveCall || hasReturningCall ? 'active' : conn.type}
                    isActive={isActive}
                    isAnimating={hasActiveCall || hasReturningCall} // Only animate on real calls
                    isReturning={hasReturningCall && !hasActiveCall}
                    bidirectional={conn.bidirectional}
                  />
                )
              })}

              {/* Render active calls that may not have static connections */}
              {[...activeCalls.values()].map((call, idx) => {
                const fromPos = positions[call.source]
                const toPos = positions[call.target]
                if (!fromPos || !toPos) return null

                // Check if already rendered in static connections
                const existsInStatic = filteredConnections.some(conn => {
                  const sourceId = conn.sourceId || conn.from
                  const targetId = conn.targetId || conn.to
                  return (sourceId === call.source && targetId === call.target) ||
                         (sourceId === call.target && targetId === call.source)
                })

                if (existsInStatic) return null

                return (
                  <ConnectionLine
                    key={`active-${call.source}-${call.target}-${idx}`}
                    from={fromPos}
                    to={toPos}
                    type="active"
                    isActive={true}
                    isAnimating={true}
                    bidirectional={false}
                  />
                )
              })}

              {/* Render returning calls (data flowing back) */}
              {[...returningCalls.values()].map((call, idx) => {
                const fromPos = positions[call.source]
                const toPos = positions[call.target]
                if (!fromPos || !toPos) return null

                return (
                  <ConnectionLine
                    key={`returning-${call.source}-${call.target}-${idx}`}
                    from={fromPos}
                    to={toPos}
                    type="active"
                    isActive={true}
                    isAnimating={true}
                    isReturning={true}
                    bidirectional={false}
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
                isBusy={false}
              />

              {/* Agent nodes */}
              {currentAgents.map((agent) => (
                <NetworkNode
                  key={agent.id}
                  agent={agent}
                  position={positions[agent.id]}
                  isSelected={selectedNode === agent.id}
                  onClick={handleNodeClick}
                  isBusy={busyAgents.has(agent.id)}
                  wasRecentlyActive={recentlyActiveAgents.has(agent.id)}
                  isBottleneck={bottleneckAgents.has(agent.id)}
                  isInLoop={agentsInLoops.has(agent.id)}
                  isPaused={pausedAgents.has(agent.id)}
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
                <ArrowLeft size={16} />
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
              <div className="space-y-2">
                {/* Pause/Resume Agent */}
                <button
                  onClick={() => toggleAgentPause(selectedAgent.id)}
                  className={`w-full py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                    pausedAgents.has(selectedAgent.id)
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                  }`}
                >
                  {pausedAgents.has(selectedAgent.id) ? (
                    <>
                      <Play size={16} />
                      Resume Agent
                    </>
                  ) : (
                    <>
                      <Pause size={16} />
                      Pause Agent
                    </>
                  )}
                </button>

                <button
                  onClick={() => onSelectAgent?.(selectedAgent)}
                  className="w-full py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Open Agent Details
                </button>
              </div>
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
            {/* Only show primary statuses, not aliases like "busy" */}
            {Object.entries(statusConfig)
              .filter(([key]) => key !== 'busy') // Skip alias
              .map(([key, config]) => (
              <div key={key} className="flex items-center gap-2">
                <StatusDot status={key} size="sm" />
                <span className="text-xs text-muted-foreground">{config.label}</span>
              </div>
            ))}
          </div>

          {/* Detection indicators */}
          <div className="flex items-center gap-6">
            <span className="text-xs text-muted-foreground font-medium">Alerts:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-red-500 border-dashed" />
              <span className="text-xs text-muted-foreground">Loop Detected</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-orange-500" />
              <span className="text-xs text-muted-foreground">Bottleneck</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-cyan-400" />
              <span className="text-xs text-muted-foreground">Active Call</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-gray-500 flex items-center justify-center">
                <div className="w-0.5 h-2 bg-gray-500 mr-0.5" />
                <div className="w-0.5 h-2 bg-gray-500" />
              </div>
              <span className="text-xs text-muted-foreground">Paused</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
