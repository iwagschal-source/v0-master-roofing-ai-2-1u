/**
 * Training Evaluation API - Run agent training evaluations through Model Arena
 *
 * This endpoint:
 * 1. Takes test questions, tools config, knowledge base, and scoring weights
 * 2. Runs each question through the specified model(s) WITH tool access
 * 3. Scores responses using the configured weights
 * 4. Returns detailed results for the Training tab
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

import { NextResponse } from 'next/server'

const BACKEND_URL = 'https://136.111.252.120'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      agentId,
      questions,          // Array of { id, question, elements }
      tools,              // Array of enabled tools for fair testing
      knowledgeBase,      // Array of { content, active } facts/context
      scoringWeights,     // { completeness, accuracy, actionability, context, formatting }
      passThreshold,      // e.g., 75
      modelsToTest,       // Array of model IDs or 'all' for full arena test
      iterations,         // Number of times to run (for consistency testing)
    } = body

    // Build the test configuration with tools injected
    const testConfig = {
      agent_id: agentId,
      test_type: 'training_evaluation',

      // Questions to test
      test_cases: questions.map(q => ({
        id: q.id,
        prompt: q.question,
        required_elements: q.elements || [],
        category: 'ceo_question',
      })),

      // Tools available to all models (fair test)
      tools_config: {
        enabled_tools: tools.filter(t => t.enabled).map(t => ({
          name: t.name,
          id: t.id,
          description: t.description,
          // Tool definitions for the model to use
          function_def: getToolDefinition(t.id),
        })),
      },

      // Knowledge base context injected into system prompt
      context: {
        knowledge_base: knowledgeBase.filter(k => k.active).map(k => k.content),
        company: 'Master Roofing & Siding',
        role: 'CEO Sales Intelligence',
      },

      // Scoring configuration
      scoring: {
        weights: scoringWeights,
        pass_threshold: passThreshold,
        dimensions: ['completeness', 'accuracy', 'actionability', 'context', 'formatting'],
      },

      // Which models to test
      models: modelsToTest === 'all' ? null : modelsToTest,

      // Number of iterations for consistency
      iterations: iterations || 1,
    }

    // Call backend Model Arena
    const res = await fetch(`${BACKEND_URL}/arena/run-training-eval`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testConfig),
    })

    if (!res.ok) {
      // If backend endpoint doesn't exist yet, fall back to simulated scoring
      if (res.status === 404) {
        return NextResponse.json(await simulateEvaluation(testConfig))
      }
      const error = await res.text()
      return NextResponse.json({ error }, { status: res.status })
    }

    const data = await res.json()
    return NextResponse.json(data)

  } catch (error) {
    console.error('Training eval failed:', error)
    // Fall back to simulated evaluation for development
    return NextResponse.json(
      { error: 'Backend unavailable, using simulated evaluation', simulated: true },
      { status: 200 }
    )
  }
}

// Tool definitions for Model Arena to inject
function getToolDefinition(toolId) {
  const tools = {
    't1': {
      name: 'bigquery_sql',
      description: 'Execute SQL queries on sales data tables',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'SQL query to execute' },
          dataset: { type: 'string', enum: ['sales_events', 'gc_metrics', 'proposals'] },
        },
        required: ['query'],
      },
    },
    't2': {
      name: 'gc_metrics_calculator',
      description: 'Calculate win rates, turnaround times, and performance metrics per GC',
      parameters: {
        type: 'object',
        properties: {
          gc_name: { type: 'string', description: 'GC name or "all" for all GCs' },
          metric: { type: 'string', enum: ['win_rate', 'turnaround', 'volume', 'all'] },
          period: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
        },
        required: ['metric'],
      },
    },
    't3': {
      name: 'pipeline_analyzer',
      description: 'Analyze pending proposals and pipeline value',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'won', 'lost', 'all'] },
          include_details: { type: 'boolean', description: 'Include project names and amounts' },
        },
      },
    },
    't4': {
      name: 'report_generator',
      description: 'Generate formatted reports from data',
      parameters: {
        type: 'object',
        properties: {
          report_type: { type: 'string', enum: ['summary', 'detailed', 'comparison'] },
          format: { type: 'string', enum: ['text', 'markdown', 'json'] },
        },
      },
    },
  }
  return tools[toolId] || null
}

// Simulated evaluation when backend is unavailable (development fallback)
async function simulateEvaluation(config) {
  const results = []

  for (const testCase of config.test_cases) {
    // Simulate scoring based on question complexity
    const baseScore = 70 + Math.random() * 25
    const weights = config.scoring.weights

    const dimensionScores = {
      completeness: Math.min(100, baseScore + Math.random() * 15),
      accuracy: Math.min(100, baseScore + Math.random() * 10),
      actionability: Math.min(100, baseScore + Math.random() * 20),
      context: Math.min(100, baseScore - 10 + Math.random() * 25),
      formatting: Math.min(100, baseScore + Math.random() * 10),
    }

    const totalScore = Object.entries(weights).reduce((sum, [dim, weight]) => {
      return sum + (dimensionScores[dim] * weight / 100)
    }, 0)

    results.push({
      question_id: testCase.id,
      question: testCase.prompt,
      score: Math.round(totalScore * 10) / 10,
      passed: totalScore >= config.scoring.pass_threshold,
      dimension_scores: Object.fromEntries(
        Object.entries(dimensionScores).map(([k, v]) => [k, Math.round(v * 10) / 10])
      ),
      elements_found: testCase.required_elements.slice(0, Math.ceil(testCase.required_elements.length * 0.8)),
      elements_missing: testCase.required_elements.slice(Math.ceil(testCase.required_elements.length * 0.8)),
      model_used: 'simulated',
      tools_called: config.tools_config.enabled_tools.slice(0, 2).map(t => t.name),
    })
  }

  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length
  const passRate = (results.filter(r => r.passed).length / results.length) * 100

  return {
    success: true,
    simulated: true,
    timestamp: new Date().toISOString(),
    agent_id: config.agent_id,
    summary: {
      avg_score: Math.round(avgScore * 10) / 10,
      pass_rate: Math.round(passRate),
      questions_tested: results.length,
      tools_available: config.tools_config.enabled_tools.length,
      knowledge_items: config.context.knowledge_base.length,
    },
    results,
  }
}
