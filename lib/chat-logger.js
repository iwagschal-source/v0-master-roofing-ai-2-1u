/**
 * Chat Logger - Logs agent chat messages to BigQuery
 *
 * Table: ko_audit.agent_chat_history
 */

import { BigQuery } from '@google-cloud/bigquery'
import { v4 as uuidv4 } from 'uuid'

const bigquery = new BigQuery({
  projectId: 'master-roofing-intelligence',
})

const TABLE_ID = 'master-roofing-intelligence.ko_audit.agent_chat_history'

// Agent name mapping
const AGENT_NAMES = {
  'CAO-PRIME-001': 'KO Prime',
  'CAO-SQL-001': 'Claude Intelligence Agent',
  'CAO-GEM-001': 'Gemini Orchestrator',
  'CAO-CEO-001': 'CEO Response Agent',
  'CAO-HUB-001': 'HubSpot CRM Agent',
  'CAO-VTX-001': 'Vertex Search Agent',
  'CAO-PBI-001': 'Power BI Dashboard Agent',
  'CAO-AUD-001': 'Python Auditor',
}

// Model pricing (per 1M tokens)
const MODEL_PRICING = {
  'claude-opus-4': { input: 15.0, output: 75.0 },
  'claude-sonnet-4': { input: 3.0, output: 15.0 },
  'claude-haiku-3.5': { input: 0.25, output: 1.25 },
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gemini-2.0-flash': { input: 0.075, output: 0.3 },
  'gemini-2.0-pro': { input: 1.25, output: 5.0 },
}

/**
 * Estimate cost based on model and tokens
 */
function estimateCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model] || { input: 0.01, output: 0.03 }
  return ((inputTokens * pricing.input) + (outputTokens * pricing.output)) / 1000000
}

/**
 * Generate a new conversation ID
 */
export function newConversationId() {
  return `conv-${uuidv4()}`
}

/**
 * Generate a new message ID
 */
export function newMessageId() {
  return `msg-${uuidv4()}`
}

/**
 * Log a chat message to BigQuery
 *
 * @param {Object} params - Message parameters
 * @returns {Promise<string>} - The message_id
 */
export async function logChatMessage({
  // Required
  conversationId,
  agentId,
  senderType, // 'user' | 'agent' | 'system' | 'orchestrator'
  messageText,
  messageType = 'chat', // 'chat' | 'command' | 'tool_call' | 'tool_result' | 'error'

  // Optional identification
  sessionId = null,
  messageId = null, // Will generate if not provided

  // Optional participants
  senderId = null,
  senderName = null,
  targetAgentId = null,

  // Optional business context
  projectId = null,
  projectName = null,
  gcId = null,
  gcName = null,
  category = 'general',
  taskType = 'query',

  // Optional content
  attachments = null,

  // Optional tool tracking
  toolsCalled = null,
  toolsResults = null,
  modelUsed = null,

  // Optional timing
  responseStartedAt = null,
  responseEndedAt = null,
  latencyMs = null,

  // Optional audit
  sourceSystem = 'frontend_ui',
  sourceIp = null,
  requestId = null,
  parentMessageId = null,
  sequenceNum = null,

  // Optional status
  status = 'sent',

  // Optional tokens
  tokensInput = null,
  tokensOutput = null,
}) {
  const msgId = messageId || newMessageId()
  const now = new Date().toISOString()

  // Calculate cost if we have token info
  let estimatedCost = null
  if (tokensInput && tokensOutput && modelUsed) {
    estimatedCost = estimateCost(modelUsed, tokensInput, tokensOutput)
  }

  const row = {
    message_id: msgId,
    conversation_id: conversationId,
    session_id: sessionId,
    agent_id: agentId,
    agent_name: AGENT_NAMES[agentId] || agentId,

    sender_type: senderType,
    sender_id: senderId,
    sender_name: senderName,
    target_agent_id: targetAgentId,

    project_id: projectId,
    project_name: projectName,
    gc_id: gcId,
    gc_name: gcName,
    category: category,
    task_type: taskType,

    message_text: messageText,
    message_type: messageType,
    attachments: attachments ? JSON.stringify(attachments) : null,

    tools_called: toolsCalled ? JSON.stringify(toolsCalled) : null,
    tools_results: toolsResults ? JSON.stringify(toolsResults) : null,
    model_used: modelUsed,

    created_at: now,
    response_started_at: responseStartedAt,
    response_ended_at: responseEndedAt,
    latency_ms: latencyMs,

    source_system: sourceSystem,
    source_ip: sourceIp,
    request_id: requestId,
    parent_message_id: parentMessageId,
    sequence_num: sequenceNum,

    // Scoring - null by default, filled later
    accuracy_score: null,
    relevance_score: null,
    helpfulness_score: null,
    tool_efficiency: null,
    overall_score: null,
    scored_by: null,
    scored_at: null,
    score_notes: null,

    status: status,
    is_training_example: false,
    is_flagged: false,
    flag_reason: null,
    error_message: null,

    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    estimated_cost_usd: estimatedCost,
  }

  try {
    await bigquery.dataset('ko_audit').table('agent_chat_history').insert([row])
    console.log(`[ChatLogger] Logged message ${msgId} to BigQuery`)
    return msgId
  } catch (error) {
    console.error(`[ChatLogger] Failed to log message:`, error)
    // Don't throw - logging failure shouldn't break chat
    return msgId
  }
}

/**
 * Log a user message and agent response pair
 */
export async function logChatExchange({
  conversationId,
  agentId,
  userMessage,
  agentResponse,
  sessionId = null,
  senderId = null,
  senderName = null,
  sourceSystem = 'frontend_ui',
  sourceIp = null,
  category = 'general',
  taskType = 'query',
  projectId = null,
  projectName = null,
  gcId = null,
  gcName = null,
  modelUsed = null,
  toolsCalled = null,
  toolsResults = null,
  latencyMs = null,
  tokensInput = null,
  tokensOutput = null,
  sequenceNum = null,
}) {
  const requestId = `req-${uuidv4()}`

  // Log user message
  const userMsgId = await logChatMessage({
    conversationId,
    agentId,
    senderType: 'user',
    messageText: userMessage,
    messageType: 'chat',
    sessionId,
    senderId,
    senderName,
    category,
    taskType,
    projectId,
    projectName,
    gcId,
    gcName,
    sourceSystem,
    sourceIp,
    requestId,
    sequenceNum: sequenceNum ? sequenceNum * 2 - 1 : null,
    status: 'delivered',
  })

  // Log agent response
  const agentMsgId = await logChatMessage({
    conversationId,
    agentId,
    senderType: 'agent',
    messageText: agentResponse,
    messageType: 'chat',
    sessionId,
    senderId: agentId,
    senderName: AGENT_NAMES[agentId] || agentId,
    targetAgentId: senderId,
    category,
    taskType,
    projectId,
    projectName,
    gcId,
    gcName,
    modelUsed,
    toolsCalled,
    toolsResults,
    latencyMs,
    sourceSystem,
    sourceIp,
    requestId,
    parentMessageId: userMsgId,
    sequenceNum: sequenceNum ? sequenceNum * 2 : null,
    status: 'sent',
    tokensInput,
    tokensOutput,
  })

  return { userMsgId, agentMsgId, requestId }
}

/**
 * Update message scores
 */
export async function updateMessageScores(messageId, scores, scoredBy = 'auto') {
  const query = `
    UPDATE \`${TABLE_ID}\`
    SET
      accuracy_score = @accuracy,
      relevance_score = @relevance,
      helpfulness_score = @helpfulness,
      tool_efficiency = @toolEfficiency,
      overall_score = @overall,
      scored_by = @scoredBy,
      scored_at = CURRENT_TIMESTAMP()
    WHERE message_id = @messageId
  `

  try {
    await bigquery.query({
      query,
      params: {
        messageId,
        accuracy: scores.accuracy || null,
        relevance: scores.relevance || null,
        helpfulness: scores.helpfulness || null,
        toolEfficiency: scores.toolEfficiency || null,
        overall: scores.overall || null,
        scoredBy,
      },
    })
    console.log(`[ChatLogger] Updated scores for message ${messageId}`)
  } catch (error) {
    console.error(`[ChatLogger] Failed to update scores:`, error)
  }
}

/**
 * Flag a message for review
 */
export async function flagMessage(messageId, reason) {
  const query = `
    UPDATE \`${TABLE_ID}\`
    SET
      is_flagged = true,
      flag_reason = @reason
    WHERE message_id = @messageId
  `

  try {
    await bigquery.query({
      query,
      params: { messageId, reason },
    })
    console.log(`[ChatLogger] Flagged message ${messageId}`)
  } catch (error) {
    console.error(`[ChatLogger] Failed to flag message:`, error)
  }
}

/**
 * Mark message as training example
 */
export async function markAsTrainingExample(messageId, isExample = true) {
  const query = `
    UPDATE \`${TABLE_ID}\`
    SET is_training_example = @isExample
    WHERE message_id = @messageId
  `

  try {
    await bigquery.query({
      query,
      params: { messageId, isExample },
    })
    console.log(`[ChatLogger] Marked message ${messageId} as training example: ${isExample}`)
  } catch (error) {
    console.error(`[ChatLogger] Failed to mark training example:`, error)
  }
}
