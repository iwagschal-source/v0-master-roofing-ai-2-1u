/**
 * Training Agent API - AI assistant for agent improvement
 *
 * This is the brain behind the Training Agent chat. It:
 * 1. Analyzes evaluation results
 * 2. Suggests prompt improvements
 * 3. Recommends knowledge items to add
 * 4. Identifies weak areas and patterns
 * 5. Can trigger new evaluations across Model Arena
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://34.95.128.208'

// System prompt for the Training Agent
const TRAINING_AGENT_SYSTEM_PROMPT = `You are a Training Agent for Master Roofing's AI system. Your job is to help improve other agents by analyzing their performance and suggesting improvements.

You have access to:
1. Model Arena - 38 LLMs across 11 providers that can be tested
2. Evaluation results - scores across 5 dimensions (completeness, accuracy, actionability, context, formatting)
3. Knowledge base - facts and context the agent uses
4. Tools - BigQuery SQL, GC Metrics Calculator, Pipeline Analyzer, Report Generator

When analyzing results:
- Identify patterns in low scores (which dimensions are consistently weak?)
- Suggest specific knowledge items that would help (e.g., "Add industry benchmark: 25-35% win rate is typical")
- Recommend prompt adjustments (e.g., "Always include 'vs last month' comparisons")
- Consider if different models might perform better for specific question types

Be concise, actionable, and specific. Focus on improvements that will raise scores.

Current scoring weights:
- Completeness: 25% (all required elements present)
- Accuracy: 25% (data correctness)
- Actionability: 20% (provides actionable insights)
- Context: 15% (includes benchmarks/comparisons)
- Formatting: 15% (clear, readable output)

Pass threshold: 75/100`

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
    } = body

    // Build context for the Training Agent
    const context = buildContext({
      evaluationHistory,
      currentQuestions,
      knowledgeBase,
      scoringWeights,
      tools,
    })

    // Try to call backend Gemini first
    try {
      const res = await fetch(`${BACKEND_URL}/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.0-flash',
          messages: [
            { role: 'system', content: TRAINING_AGENT_SYSTEM_PROMPT + '\n\n' + context },
            { role: 'user', content: message },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const response = data.choices?.[0]?.message?.content || data.response || data.text

        // Parse response for actions
        const actions = parseActionsFromResponse(response)

        return NextResponse.json({
          success: true,
          response,
          actions,
          model_used: 'gemini-2.0-flash',
        })
      }
    } catch (backendError) {
      console.log('Backend unavailable, using fallback:', backendError.message)
    }

    // Fallback: generate intelligent response based on context
    const response = generateFallbackResponse(message, {
      evaluationHistory,
      currentQuestions,
      knowledgeBase,
      scoringWeights,
    })

    return NextResponse.json({
      success: true,
      response,
      actions: parseActionsFromResponse(response),
      model_used: 'fallback',
    })

  } catch (error) {
    console.error('Training Agent error:', error)
    return NextResponse.json(
      { error: 'Training Agent failed: ' + error.message },
      { status: 500 }
    )
  }
}

function buildContext({ evaluationHistory, currentQuestions, knowledgeBase, scoringWeights, tools }) {
  let context = '## Current Agent State\n\n'

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

  // Check for knowledge suggestions
  const knowledgeMatch = response.match(/add.*knowledge.*[:\"]([^"]+)[\"]/i)
  if (knowledgeMatch) {
    actions.push({ type: 'add_knowledge', content: knowledgeMatch[1] })
  }

  // Check for tool recommendations
  if (response.toLowerCase().includes('enable') && response.toLowerCase().includes('tool')) {
    actions.push({ type: 'enable_tool', suggestion: true })
  }

  // Check for re-evaluation suggestion
  if (response.toLowerCase().includes('run') && response.toLowerCase().includes('evaluation')) {
    actions.push({ type: 'run_evaluation', suggestion: true })
  }

  // Check for weight adjustment
  if (response.toLowerCase().includes('adjust') && response.toLowerCase().includes('weight')) {
    actions.push({ type: 'adjust_weights', suggestion: true })
  }

  return actions
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
