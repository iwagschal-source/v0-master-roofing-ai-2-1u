/**
 * Chat Storage Utility
 *
 * Provides persistent local storage for KO chat conversations.
 * Saves conversations to localStorage as a backup and loads them on page refresh.
 */

const STORAGE_KEY = 'ko_conversations'
const ACTIVE_SESSION_KEY = 'ko_active_session'
const MAX_CONVERSATIONS = 100 // Limit to prevent storage overflow

/**
 * Generate a unique session ID
 */
export function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Get all stored conversations
 */
export function getConversations() {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return []

    const conversations = JSON.parse(data)

    // Convert date strings back to Date objects
    return conversations.map(conv => ({
      ...conv,
      created_at: new Date(conv.created_at),
      updated_at: new Date(conv.updated_at),
      messages: conv.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }))
    }))
  } catch (error) {
    console.error('Failed to load conversations from storage:', error)
    return []
  }
}

/**
 * Get a specific conversation by ID
 */
export function getConversation(sessionId) {
  const conversations = getConversations()
  return conversations.find(c => c.session_id === sessionId) || null
}

/**
 * Get the active session ID
 */
export function getActiveSessionId() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_SESSION_KEY)
}

/**
 * Set the active session ID
 */
export function setActiveSessionId(sessionId) {
  if (typeof window === 'undefined') return
  if (sessionId) {
    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId)
  } else {
    localStorage.removeItem(ACTIVE_SESSION_KEY)
  }
}

/**
 * Save all conversations to storage
 */
function saveConversations(conversations) {
  if (typeof window === 'undefined') return

  try {
    // Sort by updated_at desc and limit to MAX_CONVERSATIONS
    const sorted = [...conversations]
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, MAX_CONVERSATIONS)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted))
  } catch (error) {
    console.error('Failed to save conversations:', error)

    // If storage is full, try removing oldest conversations
    if (error.name === 'QuotaExceededError') {
      const reduced = conversations.slice(0, Math.floor(MAX_CONVERSATIONS / 2))
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced))
      } catch (e) {
        console.error('Failed to save even after reducing:', e)
      }
    }
  }
}

/**
 * Create a new conversation
 */
export function createConversation(sessionId = null) {
  const id = sessionId || generateSessionId()
  const now = new Date()

  const conversation = {
    session_id: id,
    preview: '',
    messages: [],
    created_at: now,
    updated_at: now,
  }

  const conversations = getConversations()
  conversations.unshift(conversation)
  saveConversations(conversations)
  setActiveSessionId(id)

  return conversation
}

/**
 * Add a message to a conversation
 */
export function addMessage(sessionId, message) {
  const conversations = getConversations()
  const index = conversations.findIndex(c => c.session_id === sessionId)

  if (index === -1) {
    // Create new conversation if doesn't exist
    const newConv = createConversation(sessionId)
    newConv.messages.push({
      ...message,
      timestamp: message.timestamp || new Date()
    })
    newConv.updated_at = new Date()

    // Set preview from first user message
    if (message.role === 'user') {
      newConv.preview = message.content.substring(0, 100)
    }

    const allConversations = getConversations()
    allConversations.unshift(newConv)
    saveConversations(allConversations)
    return
  }

  conversations[index].messages.push({
    ...message,
    timestamp: message.timestamp || new Date()
  })
  conversations[index].updated_at = new Date()

  // Update preview with first user message
  if (message.role === 'user' && !conversations[index].preview) {
    conversations[index].preview = message.content.substring(0, 100)
  }

  saveConversations(conversations)
}

/**
 * Update the last message in a conversation (for streaming updates)
 */
export function updateLastMessage(sessionId, content, metadata = {}) {
  const conversations = getConversations()
  const index = conversations.findIndex(c => c.session_id === sessionId)

  if (index === -1 || conversations[index].messages.length === 0) return

  const messages = conversations[index].messages
  const lastMessage = messages[messages.length - 1]

  if (lastMessage.role === 'assistant') {
    lastMessage.content = content
    lastMessage.sources = metadata.sources || lastMessage.sources
    lastMessage.reasoning = metadata.reasoning || lastMessage.reasoning
    conversations[index].updated_at = new Date()
    saveConversations(conversations)
  }
}

/**
 * Save entire messages array for a conversation
 */
export function saveMessages(sessionId, messages) {
  const conversations = getConversations()
  const index = conversations.findIndex(c => c.session_id === sessionId)

  if (index === -1) {
    // Create new conversation
    const newConv = {
      session_id: sessionId,
      preview: '',
      messages: messages.map(m => ({
        ...m,
        timestamp: m.timestamp || new Date()
      })),
      created_at: new Date(),
      updated_at: new Date(),
    }

    // Set preview
    const firstUserMsg = messages.find(m => m.role === 'user')
    if (firstUserMsg) {
      newConv.preview = firstUserMsg.content.substring(0, 100)
    }

    conversations.unshift(newConv)
  } else {
    conversations[index].messages = messages.map(m => ({
      ...m,
      timestamp: m.timestamp || new Date()
    }))
    conversations[index].updated_at = new Date()

    // Update preview if needed
    if (!conversations[index].preview) {
      const firstUserMsg = messages.find(m => m.role === 'user')
      if (firstUserMsg) {
        conversations[index].preview = firstUserMsg.content.substring(0, 100)
      }
    }
  }

  saveConversations(conversations)
}

/**
 * Delete a conversation
 */
export function deleteConversation(sessionId) {
  const conversations = getConversations()
  const filtered = conversations.filter(c => c.session_id !== sessionId)
  saveConversations(filtered)

  // Clear active session if it was the deleted one
  if (getActiveSessionId() === sessionId) {
    setActiveSessionId(null)
  }
}

/**
 * Clear all conversations
 */
export function clearAllConversations() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  setActiveSessionId(null)
}

/**
 * Export a conversation as JSON
 */
export function exportConversation(sessionId) {
  const conversation = getConversation(sessionId)
  if (!conversation) return null

  return {
    exported_at: new Date().toISOString(),
    session_id: conversation.session_id,
    preview: conversation.preview,
    created_at: conversation.created_at,
    updated_at: conversation.updated_at,
    messages: conversation.messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      sources: m.sources,
    }))
  }
}

/**
 * Export all conversations as JSON
 */
export function exportAllConversations() {
  const conversations = getConversations()

  return {
    exported_at: new Date().toISOString(),
    total_conversations: conversations.length,
    conversations: conversations.map(c => ({
      session_id: c.session_id,
      preview: c.preview,
      created_at: c.created_at,
      updated_at: c.updated_at,
      message_count: c.messages.length,
      messages: c.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        sources: m.sources,
      }))
    }))
  }
}

/**
 * Download export as file
 */
export function downloadExport(data, filename = 'ko-chat-export.json') {
  if (typeof window === 'undefined') return

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
