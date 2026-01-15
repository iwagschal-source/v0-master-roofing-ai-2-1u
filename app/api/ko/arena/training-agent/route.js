/**
 * Training Agent API - Claude Opus 4 powered agent trainer
 *
 * This is trained to think and work like Claude Code:
 * 1. Analyze thoroughly before acting
 * 2. Check work against criteria
 * 3. Iterate until quality is acceptable
 * 4. Actually modify prompts (not just suggest)
 * 5. Apply self-refinement loops to all agents
 *
 * Has FULL WRITE ACCESS to agent prompts and configurations.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://34.95.128.208'

// System prompt - trained to think like Claude
const TRAINING_AGENT_SYSTEM_PROMPT = `You are the Training Agent for Master Roofing's AI system, powered by Claude Opus 4. You think and work like Claude Code - thorough, iterative, and precise.

## Your Methodology (How You Think)
1. **Analyze first** - Read all context before responding. Understand the full picture.
2. **Check your work** - Before finalizing any response, verify it against the criteria.
3. **Iterate** - If something isn't right, fix it. Don't return subpar work.
4. **Be specific** - Vague suggestions are useless. Give exact prompts, exact knowledge items, exact fixes.
5. **Take action** - You have WRITE ACCESS. Don't just suggest - actually modify prompts when asked.

## Your Capabilities (Full Access)
You can READ and WRITE:
- Agent system prompts (modify how any agent behaves)
- Universal prompt additions (applied to ALL agents)
- Knowledge base items (facts injected into all responses)
- Self-refinement protocols (make agents check their own work)
- Scoring configurations (weights and thresholds)

## Tools Available
- Model Arena: 38 LLMs across 11 providers for comparative testing
- Prompt API: /api/ko/agents/prompts - full CRUD access
- Evaluation API: /api/ko/arena/training-eval - run tests with tool injection

## Your Core Task
Train other agents to produce CEO-quality responses. A good response:
- Has ALL required elements (completeness: 25%)
- Is accurate with real data (accuracy: 25%)
- Ends with actionable recommendation (actionability: 20%)
- Includes benchmark/comparison (context: 15%)
- Is well-formatted and readable (formatting: 15%)
- Passes threshold: 75/100

## Self-Refinement Protocol (Apply to All Agents)
When asked to improve an agent, add this to their prompt:

\`\`\`
## Self-Check Before Responding (MANDATORY)
Before returning your response, verify:
□ All required elements present for this question type
□ Included comparison to previous period (vs last month/week)
□ Included industry benchmark or target
□ Ended with actionable 💡 recommendation
□ Used proper formatting (bold headers, bullets, indicators)

If ANY box unchecked, REVISE before returning. Do not return incomplete responses.
\`\`\`

## Response Style
- Be direct. No fluff.
- When you make a change, confirm what you changed.
- When analyzing, show your reasoning.
- When something is wrong, say so clearly.

You are training agents to be almost as good as you. Be rigorous.

## Your Manager
Isaac Wagschal is your manager and the CEO of Master Roofing & Siding. When Isaac asks you something:
- Always respond immediately and thoroughly
- He has final authority on all agent configurations
- If he says "do it" or "apply it" - execute the action, don't just suggest
- Keep him informed of what you changed and why
- His time is valuable - be concise but complete

Isaac built this entire system. Respect that context.`

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      message,              // User's message to Training Agent
      agentId,              // Which agent we're training
      evaluationHistory,    // Recent evaluation results
      currentQuestions,     // Test questions configured
      knowledgeBase,        // Current knowledge items
      scoringWeights,       // Current weights
      tools,                // Enabled tools
      executeActions,       // If true, actually execute suggested actions
    } = body

    // Build context for the Training Agent
    const context = buildContext({
      agentId,
      evaluationHistory,
      currentQuestions,
      knowledgeBase,
      scoringWeights,
      tools,
    })

    let response = null
    let modelUsed = 'fallback'

    // Try Claude Opus 4 first (primary model)
    try {
      const claudeRes = await fetch(`${BACKEND_URL}/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-opus-4',
          messages: [
            { role: 'system', content: TRAINING_AGENT_SYSTEM_PROMPT + '\n\n' + context },
            { role: 'user', content: message },
          ],
          max_tokens: 2000,
          temperature: 0.4, // Lower temp for more precise/consistent training advice
        }),
      })

      if (claudeRes.ok) {
        const data = await claudeRes.json()
        response = data.choices?.[0]?.message?.content || data.response || data.text
        modelUsed = 'claude-opus-4'
      }
    } catch (claudeError) {
      console.log('Claude Opus unavailable:', claudeError.message)
    }

    // Fallback to Gemini if Claude unavailable
    if (!response) {
      try {
        const geminiRes = await fetch(`${BACKEND_URL}/v1/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemini-2.0-flash',
            messages: [
              { role: 'system', content: TRAINING_AGENT_SYSTEM_PROMPT + '\n\n' + context },
              { role: 'user', content: message },
            ],
            max_tokens: 1500,
            temperature: 0.5,
          }),
        })

        if (geminiRes.ok) {
          const data = await geminiRes.json()
          response = data.choices?.[0]?.message?.content || data.response || data.text
          modelUsed = 'gemini-2.0-flash'
        }
      } catch (geminiError) {
        console.log('Gemini unavailable:', geminiError.message)
      }
    }

    // Final fallback to local generation
    if (!response) {
      response = generateFallbackResponse(message, {
        agentId,
        evaluationHistory,
        currentQuestions,
        knowledgeBase,
        scoringWeights,
      })
    }

    // Parse response for actions
    const actions = parseActionsFromResponse(response)

    // Execute actions if requested (Training Agent has write access)
    let executedActions = []
    if (executeActions && actions.length > 0) {
      executedActions = await executeTrainingActions(actions, agentId)
    }

    return NextResponse.json({
      success: true,
      response,
      actions,
      executedActions,
      model_used: modelUsed,
    })

  } catch (error) {
    console.error('Training Agent error:', error)
    return NextResponse.json(
      { error: 'Training Agent failed: ' + error.message },
      { status: 500 }
    )
  }
}

// Execute actions the Training Agent suggests (full write access)
async function executeTrainingActions(actions, agentId) {
  const results = []
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'add_knowledge':
          const knowledgeRes = await fetch(`${baseUrl}/api/ko/agents/prompts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'add_knowledge',
              data: { knowledge: action.content }
            }),
          })
          results.push({ action: 'add_knowledge', success: knowledgeRes.ok, content: action.content })
          break

        case 'update_prompt':
          const promptRes = await fetch(`${baseUrl}/api/ko/agents/prompts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_agent_prompt',
              agentId,
              data: { systemPrompt: action.content }
            }),
          })
          results.push({ action: 'update_prompt', success: promptRes.ok, agentId })
          break

        case 'enable_self_refinement':
          const refinementRes = await fetch(`${baseUrl}/api/ko/agents/prompts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'enable_self_refinement' }),
          })
          results.push({ action: 'enable_self_refinement', success: refinementRes.ok })
          break

        case 'apply_to_all':
          const applyRes = await fetch(`${baseUrl}/api/ko/agents/prompts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'apply_to_all',
              data: { addition: action.content }
            }),
          })
          results.push({ action: 'apply_to_all', success: applyRes.ok })
          break
      }
    } catch (err) {
      results.push({ action: action.type, success: false, error: err.message })
    }
  }

  return results
}

function buildContext({ agentId, evaluationHistory, currentQuestions, knowledgeBase, scoringWeights, tools }) {
  let context = `## Current Agent: ${agentId || 'Unknown'}\n\n`

  // Latest evaluation
  if (evaluationHistory?.length > 0) {
    const latest = evaluationHistory[0]
    context += `### Latest Evaluation (${latest.timestamp})\n`
    context += `- Average Score: ${latest.avgScore}/100\n`
    context += `- Pass Rate: ${latest.passRate}%\n`
    context += `- Questions Run: ${latest.questionsRun}\n\n`

    // Score trend
    if (evaluationHistory.length >= 2) {
      const prev = evaluationHistory[1]
      const trend = latest.avgScore > prev.avgScore ? 'improving' : latest.avgScore < prev.avgScore ? 'declining' : 'stable'
      context += `Trend: ${trend} (was ${prev.avgScore}/100)\n\n`
    }
  }

  // Test questions
  if (currentQuestions?.length > 0) {
    context += `### Test Questions (${currentQuestions.length} total)\n`
    currentQuestions.forEach(q => {
      const status = q.score >= 75 ? '✓' : q.score ? '✗' : '?'
      context += `- [${status}] "${q.question}" (Score: ${q.score || 'not tested'})\n`
    })
    context += '\n'
  }

  // Knowledge base
  if (knowledgeBase?.length > 0) {
    const active = knowledgeBase.filter(k => k.active)
    context += `### Knowledge Base (${active.length} active items)\n`
    active.forEach(k => {
      context += `- ${k.content}\n`
    })
    context += '\n'
  }

  // Enabled tools
  if (tools?.length > 0) {
    const enabled = tools.filter(t => t.enabled)
    context += `### Enabled Tools (${enabled.length})\n`
    enabled.forEach(t => {
      context += `- ${t.name}: ${t.description}\n`
    })
  }

  return context
}

function parseActionsFromResponse(response) {
  const actions = []
  const responseLower = response.toLowerCase()

  // Check for knowledge items to add (various formats)
  const knowledgePatterns = [
    /add.*knowledge[:\s]*["\u201c]([^"\u201d]+)["\u201d]/gi,
    /knowledge item[:\s]*["\u201c]([^"\u201d]+)["\u201d]/gi,
    /→.*["\u201c]([^"\u201d]+)["\u201d]/g,
    /suggested.*[:\s]*["\u201c]([^"\u201d]+)["\u201d]/gi,
  ]
  for (const pattern of knowledgePatterns) {
    let match
    while ((match = pattern.exec(response)) !== null) {
      if (match[1] && match[1].length > 10) {
        actions.push({ type: 'add_knowledge', content: match[1].trim() })
      }
    }
  }

  // Check for self-refinement enablement
  if (responseLower.includes('self-refinement') || responseLower.includes('self-check') || responseLower.includes('self check')) {
    if (responseLower.includes('enable') || responseLower.includes('add') || responseLower.includes('apply')) {
      actions.push({ type: 'enable_self_refinement' })
    }
  }

  // Check for apply to all agents
  if (responseLower.includes('all agents') || responseLower.includes('apply to all') || responseLower.includes('every agent')) {
    // Extract what should be applied
    const applyMatch = response.match(/apply[^:]*:[^\n]*\n```([^`]+)```/i)
    if (applyMatch) {
      actions.push({ type: 'apply_to_all', content: applyMatch[1].trim() })
    } else {
      actions.push({ type: 'apply_to_all', suggestion: true })
    }
  }

  // Check for prompt update
  if (responseLower.includes('update prompt') || responseLower.includes('modify prompt') || responseLower.includes('change prompt')) {
    const promptMatch = response.match(/```([^`]+)```/)
    if (promptMatch) {
      actions.push({ type: 'update_prompt', content: promptMatch[1].trim() })
    } else {
      actions.push({ type: 'update_prompt', suggestion: true })
    }
  }

  // Check for tool recommendations
  if (responseLower.includes('enable') && responseLower.includes('tool')) {
    actions.push({ type: 'enable_tool', suggestion: true })
  }

  // Check for re-evaluation suggestion
  if ((responseLower.includes('run') || responseLower.includes('trigger')) && responseLower.includes('evaluation')) {
    actions.push({ type: 'run_evaluation', suggestion: true })
  }

  // Check for weight adjustment
  if (responseLower.includes('adjust') && responseLower.includes('weight')) {
    actions.push({ type: 'adjust_weights', suggestion: true })
  }

  // Deduplicate
  const seen = new Set()
  return actions.filter(a => {
    const key = `${a.type}:${a.content || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function generateFallbackResponse(message, context) {
  const msg = message.toLowerCase()
  const { evaluationHistory, currentQuestions, knowledgeBase, scoringWeights } = context

  const latestScore = evaluationHistory?.[0]?.avgScore || 0
  const passRate = evaluationHistory?.[0]?.passRate || 0

  // Analyze patterns
  if (msg.includes('improve') || msg.includes('score') || msg.includes('better')) {
    const weakAreas = []
    if (latestScore < 85) weakAreas.push('overall score needs improvement')

    let response = `Based on the latest evaluation (${latestScore}/100, ${passRate}% pass rate), here are my recommendations:\n\n`

    if (latestScore < 80) {
      response += `**1. Add More Context**\n`
      response += `Include "vs last month" comparisons in all responses. This helps the "context" dimension.\n`
      response += `→ Suggested knowledge item: "Always compare current metrics to previous period"\n\n`
    }

    response += `**2. Improve Actionability**\n`
    response += `End each response with a specific, actionable recommendation using the 💡 emoji.\n`
    response += `→ Suggested knowledge item: "End responses with actionable recommendation"\n\n`

    response += `**3. Include Industry Benchmarks**\n`
    response += `Reference standards like "25-35% win rate is typical" to provide context.\n`
    response += `→ Suggested knowledge item: "Industry standard win rate is 25-35%"\n\n`

    response += `Would you like me to add these knowledge items automatically?`
    return response
  }

  if (msg.includes('add') || msg.includes('knowledge') || msg.includes('yes')) {
    return `I've prepared these knowledge items for you:\n\n` +
      `1. ✓ "Always compare current metrics to previous period"\n` +
      `2. ✓ "End responses with actionable recommendation using 💡"\n` +
      `3. ✓ "Industry standard win rate is 25-35%"\n` +
      `4. ✓ "Target response time is under 3 days"\n\n` +
      `Click "Add" on each item in the Knowledge Base section, then run another evaluation to see the improvement.`
  }

  if (msg.includes('model') || msg.includes('test') || msg.includes('arena')) {
    return `I can test this agent across multiple models in the Arena. Currently available:\n\n` +
      `**Fast & Cheap:**\n- Gemini 2.0 Flash\n- GPT-4o-mini\n- Claude Haiku 3.5\n\n` +
      `**High Quality:**\n- Claude Opus 4\n- GPT-4o\n- Gemini 2.0 Pro\n\n` +
      `**Specialized:**\n- DeepSeek V3 (reasoning)\n- Mistral Large (multilingual)\n\n` +
      `Which models would you like to test? I can run the same questions across multiple models to find the best performer.`
  }

  if (msg.includes('weak') || msg.includes('fail') || msg.includes('low')) {
    const lowScoring = currentQuestions?.filter(q => q.score && q.score < 75) || []
    if (lowScoring.length > 0) {
      return `Found ${lowScoring.length} questions scoring below threshold:\n\n` +
        lowScoring.map(q => `- "${q.question}" (${q.score}/100)`).join('\n') +
        `\n\nCommon issues:\n` +
        `1. Missing required elements\n` +
        `2. No benchmark comparison\n` +
        `3. Lacks actionable recommendation\n\n` +
        `Should I analyze these specific questions in detail?`
    }
    return `All questions are currently passing. Run an evaluation to identify any weak areas.`
  }

  // Default helpful response
  return `I can help with:\n\n` +
    `- **"How can I improve the score?"** - Analyze results and suggest improvements\n` +
    `- **"Add knowledge items"** - I'll suggest facts and context to add\n` +
    `- **"Test across models"** - Run questions through Model Arena\n` +
    `- **"Show weak questions"** - Identify failing test cases\n` +
    `- **"Adjust weights"** - Optimize scoring configuration\n\n` +
    `Current status: ${latestScore}/100 average, ${passRate}% pass rate`
}
