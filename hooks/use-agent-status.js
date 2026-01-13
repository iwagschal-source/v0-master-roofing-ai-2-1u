"use client"

import { useState, useEffect, useCallback } from 'react'

const POLL_INTERVAL = 10000 // 10 seconds

export function useAgentStatus(enabled = true) {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/ko/agents/status', {
        cache: 'no-store',
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()
      setStatus(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err) {
      console.error('Failed to fetch agent status:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    fetchStatus()

    // Set up polling
    const interval = setInterval(fetchStatus, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [enabled, fetchStatus])

  // Helper to get status for a specific agent
  const getAgentStatus = useCallback((agentId) => {
    if (!status?.agents) return null
    return status.agents[agentId] || null
  }, [status])

  // Check if backend is healthy
  const isBackendHealthy = status?.healthy ?? false

  // Get all agent statuses as array
  const agentStatuses = status?.agents || {}

  return {
    status,
    loading,
    error,
    lastUpdated,
    isBackendHealthy,
    agentStatuses,
    getAgentStatus,
    refetch: fetchStatus,
  }
}
