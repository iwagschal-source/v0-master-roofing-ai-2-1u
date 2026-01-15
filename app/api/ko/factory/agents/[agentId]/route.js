/**
 * Factory Agent API - Get, Update, Delete individual agent
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.116.243.70'

// GET - Get single agent
export async function GET(request, { params }) {
  try {
    const { agentId } = await params

    const res = await fetch(`${BACKEND_URL}/v1/factory/agents/${agentId}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to fetch agent:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 503 }
    )
  }
}

// PUT - Update agent
export async function PUT(request, { params }) {
  try {
    const { agentId } = await params
    const body = await request.json()

    const backendPayload = {
      name: body.name,
      description: body.description,
      model: body.model,
      tools: body.tools,
      communication_preset: body.communication_preset,
      settings: body.settings || {},
    }

    // Only include fields that were provided
    Object.keys(backendPayload).forEach(key => {
      if (backendPayload[key] === undefined) {
        delete backendPayload[key]
      }
    })

    const res = await fetch(`${BACKEND_URL}/v1/factory/agents/${agentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backendPayload),
    })

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json(
        { error: errorText || 'Failed to update agent' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to update agent:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend: ' + error.message },
      { status: 503 }
    )
  }
}

// DELETE - Delete agent
export async function DELETE(request, { params }) {
  try {
    const { agentId } = await params

    const res = await fetch(`${BACKEND_URL}/v1/factory/agents/${agentId}`, {
      method: 'DELETE',
    })

    if (!res.ok) {
      const errorText = await res.text()
      return NextResponse.json(
        { error: errorText || 'Failed to delete agent' },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to delete agent:', error)
    return NextResponse.json(
      { error: 'Failed to connect to backend: ' + error.message },
      { status: 503 }
    )
  }
}
