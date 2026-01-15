/**
 * Agent Prompts API - Manage agent system prompts and universal additions
 *
 * The Training Agent has full access to:
 * 1. Read/write individual agent prompts
 * 2. Add universal prompt additions (applied to ALL agents)
 * 3. Add self-refinement loops
 * 4. Manage knowledge injection
 */

import { NextResponse } from 'next/server'

// In production, this would be stored in BigQuery/database
// For now, we store in memory and sync to a config file
let agentPrompts = {
  // Universal additions - applied to ALL agents before their specific prompts
  universal: {
    prefix: `You are an AI agent for Master Roofing & Siding. Your responses must be accurate, actionable, and include relevant context.`,

    selfRefinement: `
## Self-Refinement Protocol (MANDATORY)
Before returning ANY response, you MUST:
1. Check: Does my response include all required elements for this question type?
2. Check: Did I include a comparison to previous period (vs last month/week)?
3. Check: Did I include an industry benchmark or target for context?
4. Check: Did I end with an actionable recommendation using 💡?
5. If ANY check fails, REVISE your response before returning.

Do NOT return a response that is missing required elements. Revise until complete.
`,

    suffix: `
## Response Format
- Use **bold** for headers and key numbers
- Use bullet points or numbered lists for multiple items
- Keep responses concise but complete
- End with 💡 actionable recommendation
`,

    knowledgeBase: [
      "Industry standard win rate for roofing subcontractors is 25-35%",
      "Target response time from RFP to proposal is under 3 days",
      "Company average bid size target is $100K-200K",
      "Always compare current metrics to previous period",
      "GCs with <15% win rate after 5+ bids should be reconsidered",
    ],
  },

  // Per-agent specific prompts
  agents: {
    "AGT-SALES-001": {
      name: "Sales Agent",
      systemPrompt: `You are the Sales Intelligence Agent. You answer CEO-level questions about sales performance, pipeline, and team metrics.

## Your 10 Core Questions:
1. How much did we bid this month? → Include: proposal count, total value, avg size, vs last month
2. Who's our top performer? → Include: ranked list, wins, proposals, $ won
3. Which GCs should we focus on? → Include: win rates, volume, ROI ranking
4. Are we responding fast enough? → Include: avg turnaround, fastest/slowest, benchmark
5. What's in the pipeline? → Include: pending count, value, project list
6. Who's been slow on turnaround? → Include: ranked by days, status indicators
7. How are we doing vs last month? → Include: RFPs, proposals, wins with trend arrows
8. Which GCs should we stop bidding? → Include: low win rate list with thresholds
9. What's our average job size? → Include: avg won, avg bid, largest job
10. How many RFPs this week? → Include: 7-day counts, recent list

## Required Elements Per Response:
- Specific numbers (not vague)
- Comparison to benchmark or previous period
- Visual indicators (🔴⚠️✅ or ↑↓→)
- Actionable recommendation at end
`,
      tools: ["bigquery_sql", "gc_metrics_calculator", "pipeline_analyzer"],
      temperature: 0.3,
      maxTokens: 800,
    },

    "AGT-ORCH-001": {
      name: "Gemini Router",
      systemPrompt: `You are the central orchestrator for KO (Chief Agent Officer). Route incoming queries to the appropriate specialist agents.`,
      tools: ["agent_router", "context_builder"],
      temperature: 0.2,
      maxTokens: 500,
    },

    "AGT-BQ-001": {
      name: "BigQuery Agent",
      systemPrompt: `You are the BigQuery specialist. Generate accurate SQL queries for Master Roofing's data warehouse.`,
      tools: ["bigquery_sql", "schema_lookup"],
      temperature: 0.1,
      maxTokens: 1000,
    },
  },
}

// GET - Retrieve prompts (for an agent or all)
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const includeUniversal = searchParams.get('includeUniversal') !== 'false'

  if (agentId) {
    const agentConfig = agentPrompts.agents[agentId]
    if (!agentConfig) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    // Build complete prompt with universal additions
    const completePrompt = includeUniversal
      ? buildCompletePrompt(agentId)
      : agentConfig.systemPrompt

    return NextResponse.json({
      agentId,
      config: agentConfig,
      completePrompt,
      universal: includeUniversal ? agentPrompts.universal : null,
    })
  }

  // Return all
  return NextResponse.json({
    universal: agentPrompts.universal,
    agents: Object.entries(agentPrompts.agents).map(([id, config]) => ({
      id,
      name: config.name,
      promptLength: config.systemPrompt.length,
      tools: config.tools,
    })),
  })
}

// POST - Update prompts (Training Agent uses this)
export async function POST(request) {
  try {
    const body = await request.json()
    const { action, agentId, data } = body

    switch (action) {
      case 'update_agent_prompt':
        if (!agentId || !data?.systemPrompt) {
          return NextResponse.json({ error: 'Missing agentId or systemPrompt' }, { status: 400 })
        }
        if (!agentPrompts.agents[agentId]) {
          agentPrompts.agents[agentId] = { name: agentId, tools: [] }
        }
        agentPrompts.agents[agentId].systemPrompt = data.systemPrompt
        if (data.tools) agentPrompts.agents[agentId].tools = data.tools
        if (data.temperature) agentPrompts.agents[agentId].temperature = data.temperature
        return NextResponse.json({ success: true, message: `Updated prompt for ${agentId}` })

      case 'update_universal_prefix':
        agentPrompts.universal.prefix = data.prefix
        return NextResponse.json({ success: true, message: 'Updated universal prefix' })

      case 'update_universal_suffix':
        agentPrompts.universal.suffix = data.suffix
        return NextResponse.json({ success: true, message: 'Updated universal suffix' })

      case 'update_self_refinement':
        agentPrompts.universal.selfRefinement = data.selfRefinement
        return NextResponse.json({ success: true, message: 'Updated self-refinement protocol' })

      case 'add_knowledge':
        if (!data.knowledge) {
          return NextResponse.json({ error: 'Missing knowledge item' }, { status: 400 })
        }
        if (!agentPrompts.universal.knowledgeBase.includes(data.knowledge)) {
          agentPrompts.universal.knowledgeBase.push(data.knowledge)
        }
        return NextResponse.json({
          success: true,
          message: 'Added knowledge item',
          knowledgeBase: agentPrompts.universal.knowledgeBase
        })

      case 'remove_knowledge':
        agentPrompts.universal.knowledgeBase = agentPrompts.universal.knowledgeBase
          .filter(k => k !== data.knowledge)
        return NextResponse.json({ success: true, message: 'Removed knowledge item' })

      case 'enable_self_refinement':
        // This is already in the universal config, just confirming it's active
        return NextResponse.json({
          success: true,
          message: 'Self-refinement is enabled for all agents',
          selfRefinement: agentPrompts.universal.selfRefinement
        })

      case 'apply_to_all':
        // Apply a prompt addition to all agents
        const addition = data.addition
        Object.keys(agentPrompts.agents).forEach(id => {
          if (!agentPrompts.agents[id].systemPrompt.includes(addition)) {
            agentPrompts.agents[id].systemPrompt += '\n\n' + addition
          }
        })
        return NextResponse.json({
          success: true,
          message: `Applied to ${Object.keys(agentPrompts.agents).length} agents`
        })

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Prompt update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Helper: Build complete prompt for an agent (universal + specific)
function buildCompletePrompt(agentId) {
  const agent = agentPrompts.agents[agentId]
  if (!agent) return null

  const universal = agentPrompts.universal
  const knowledgeSection = universal.knowledgeBase.length > 0
    ? `\n## Knowledge Base\n${universal.knowledgeBase.map(k => `- ${k}`).join('\n')}\n`
    : ''

  return `${universal.prefix}

${universal.selfRefinement}

${knowledgeSection}

## Agent-Specific Instructions
${agent.systemPrompt}

${universal.suffix}`
}
