/**
 * Agent Permissions API
 * Manages agent access and permissions
 */

import { readJSON, writeJSON } from '@/lib/gcs-storage'
import { NextResponse } from 'next/server'

const AGENTS_PATH = 'admin/agent_permissions.json'

// Default agent registry based on ko_audit.agent_registry
const DEFAULT_AGENTS = {
  deterministic: [
    { id: 'DET-001', name: 'email_scanner', displayName: 'Email Scanner', description: 'Scans mr_brain for new emails, updates tables', category: 'email' },
    { id: 'DET-002', name: 'asana_sync', displayName: 'Asana Sync', description: 'Syncs Asana tasks to BigQuery and HubSpot', category: 'sync' },
    { id: 'DET-003', name: 'takeoff_parser', displayName: 'Takeoff Parser', description: 'Parses Bluebeam exports into structured data', category: 'takeoff' },
    { id: 'DET-004', name: 'proposal_matcher', displayName: 'Proposal Matcher', description: 'Matches proposals to takeoffs by total', category: 'proposal' },
    { id: 'DET-005', name: 'sage_sync', displayName: 'Sage Sync', description: 'Imports Sage accounting data', category: 'sync' },
    { id: 'DET-006', name: 'hubspot_sync', displayName: 'HubSpot Sync', description: 'Syncs data to HubSpot CRM', category: 'sync' },
    { id: 'DET-007', name: 'transcript_processor', displayName: 'Transcript Processor', description: 'Processes raw transcripts into structured sessions', category: 'audit' },
  ],
  interpretive: [
    { id: 'INT-001', name: 'email_analyzer', displayName: 'Email Analyzer', description: 'Analyzes emails for priority, sentiment, action needed', category: 'email' },
    { id: 'INT-002', name: 'email_drafter', displayName: 'Email Drafter', description: 'Drafts emails in employee voice based on history', category: 'email' },
    { id: 'INT-003', name: 'takeoff_generator', displayName: 'Takeoff Generator', description: 'Generates takeoff from Bluebeam + GC history', category: 'takeoff' },
    { id: 'INT-004', name: 'proposal_generator', displayName: 'Proposal Generator', description: 'Generates proposal from approved takeoff', category: 'proposal' },
    { id: 'INT-005', name: 'project_summarizer', displayName: 'Project Summarizer', description: 'Creates project intelligence summaries', category: 'intelligence' },
    { id: 'INT-006', name: 'gc_profiler', displayName: 'GC Profiler', description: 'Builds GC preference profiles from history', category: 'intelligence' },
    { id: 'INT-007', name: 'rfi_responder', displayName: 'RFI Responder', description: 'Suggests RFI answers from historical responses', category: 'communication' },
    { id: 'INT-008', name: 'session_summarizer', displayName: 'Session Summarizer', description: 'Summarizes user sessions and interactions', category: 'audit' },
    { id: 'INT-009', name: 'ko_orchestrator', displayName: 'KO Orchestrator', description: 'Main KO agent coordinating other agents', category: 'core' },
    { id: 'INT-010', name: 'estimator_assistant', displayName: 'Estimator Assistant', description: 'AI assistant for junior estimators with GC history and pricing guidance', category: 'intelligence' },
  ],
}

// GET - Get all agents with their permissions
export async function GET() {
  try {
    let permissions = await readJSON(AGENTS_PATH)

    if (!permissions) {
      // Initialize with defaults
      permissions = {
        agents: DEFAULT_AGENTS,
        rolePermissions: {
          admin: { allowedAgents: 'all', canModify: true },
          editor: { allowedAgents: ['email_analyzer', 'email_drafter', 'project_summarizer', 'gc_profiler', 'ko_orchestrator'], canModify: false },
          viewer: { allowedAgents: ['project_summarizer', 'ko_orchestrator'], canModify: false },
        },
        userOverrides: {},
        globalSettings: {
          requireApprovalFor: ['email_drafter', 'proposal_generator', 'hubspot_sync'],
          auditAll: true,
        },
        lastUpdated: new Date().toISOString(),
      }
      await writeJSON(AGENTS_PATH, permissions)
    }

    return NextResponse.json(permissions)
  } catch (error) {
    console.error('Failed to get agent permissions:', error)
    return NextResponse.json(
      { error: 'Failed to get agent permissions' },
      { status: 500 }
    )
  }
}

// POST - Update permissions
export async function POST(request) {
  try {
    const body = await request.json()
    const { type, data } = body

    let permissions = await readJSON(AGENTS_PATH)
    if (!permissions) {
      permissions = {
        agents: DEFAULT_AGENTS,
        rolePermissions: {},
        userOverrides: {},
        globalSettings: {},
      }
    }

    switch (type) {
      case 'rolePermissions':
        permissions.rolePermissions = { ...permissions.rolePermissions, ...data }
        break
      case 'userOverride':
        const { userId, allowedAgents } = data
        permissions.userOverrides[userId] = { allowedAgents }
        break
      case 'globalSettings':
        permissions.globalSettings = { ...permissions.globalSettings, ...data }
        break
      case 'toggleAgent':
        const { role, agentName, enabled } = data
        if (permissions.rolePermissions[role]) {
          const current = permissions.rolePermissions[role].allowedAgents
          if (enabled) {
            if (Array.isArray(current) && !current.includes(agentName)) {
              current.push(agentName)
            }
          } else {
            if (Array.isArray(current)) {
              permissions.rolePermissions[role].allowedAgents = current.filter(a => a !== agentName)
            }
          }
        }
        break
      default:
        return NextResponse.json(
          { error: 'Invalid update type' },
          { status: 400 }
        )
    }

    permissions.lastUpdated = new Date().toISOString()
    await writeJSON(AGENTS_PATH, permissions)

    return NextResponse.json({ success: true, permissions })
  } catch (error) {
    console.error('Failed to update permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    )
  }
}
