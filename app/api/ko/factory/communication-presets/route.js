/**
 * Factory Communication Presets API - Get all available communication presets
 * Uses the /v1/factory/presets endpoint and extracts communication_presets
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.111.252.120'

const FALLBACK_PRESETS = [
  { id: "worker", name: "Worker", description: "Can be called by KO Prime and orchestrators", can_call: [], can_be_called_by: ["CAO-GEM-001", "CAO-PRIME-001"] },
  { id: "peer", name: "Peer", description: "Can call and be called by any agent", can_call: ["*"], can_be_called_by: ["*"] },
  { id: "orchestrator", name: "Orchestrator", description: "Can call all agents, not called by others", can_call: ["*"], can_be_called_by: [] },
  { id: "isolated", name: "Isolated", description: "Cannot communicate with other agents", can_call: [], can_be_called_by: [] },
  { id: "caller_only", name: "Caller Only", description: "Can call agents but not be called", can_call: ["*"], can_be_called_by: [] },
]

export async function GET(request) {
  try {
    const res = await fetch(`${BACKEND_URL}/v1/factory/presets`, {
      cache: 'no-store'
    })

    if (!res.ok) {
      console.error('Backend presets endpoint failed:', res.status)
      return NextResponse.json({ presets: FALLBACK_PRESETS })
    }

    const data = await res.json()
    // Extract communication_presets from the combined response
    const presets = data.communication_presets || FALLBACK_PRESETS
    return NextResponse.json({ presets })
  } catch (error) {
    console.error('Failed to fetch communication presets:', error)
    return NextResponse.json({ presets: FALLBACK_PRESETS })
  }
}
