"use client"

import { useState, useEffect, useCallback } from 'react'

interface GoogleUser {
  id: string
  email: string
  name: string
  picture?: string
}

interface UseGoogleAuthReturn {
  isConnected: boolean
  user: GoogleUser | null
  loading: boolean
  authUrl: string
  checkConnection: () => Promise<void>
  disconnect: () => Promise<void>
}

export function useGoogleAuth(): UseGoogleAuthReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [user, setUser] = useState<GoogleUser | null>(null)
  const [loading, setLoading] = useState(true)
  const authUrl = '/api/auth/google'

  const checkConnection = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/google/status')
      const data = await res.json()
      setIsConnected(data.connected)
      setUser(data.user || null)
    } catch (err) {
      console.warn('Failed to check Google connection:', err)
      setIsConnected(false)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const disconnect = useCallback(async () => {
    try {
      await fetch('/api/google/status', { method: 'POST' })
      setIsConnected(false)
      setUser(null)
    } catch (err) {
      console.error('Failed to disconnect:', err)
    }
  }, [])

  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  return {
    isConnected,
    user,
    loading,
    authUrl,
    checkConnection,
    disconnect,
  }
}
