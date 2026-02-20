/**
 * Google Auth Helpers — BigQuery-backed token queries
 *
 * GCS remains the primary live token store (used by lib/google-token.js).
 * BigQuery is the secondary queryable store for analytics, admin, and auditing.
 *
 * Phase 13A — Session 59
 */

import { runQuery } from '@/lib/bigquery'

/**
 * Get stored Google tokens for a user from BigQuery
 * @param {string} userId - Google user ID
 * @returns {Promise<object|null>} Token record or null
 */
export async function getGoogleTokensFromBQ(userId) {
  if (!userId) return null

  try {
    const rows = await runQuery(`
      SELECT user_id, email, access_token, refresh_token, token_expiry, scopes, connected_at, last_used_at, is_active
      FROM \`master-roofing-intelligence.mr_main.user_google_tokens\`
      WHERE user_id = @user_id AND is_active = TRUE
      LIMIT 1
    `, { user_id: userId })

    return rows.length > 0 ? rows[0] : null
  } catch (error) {
    console.error('[google-auth] Failed to get tokens from BigQuery:', error.message)
    return null
  }
}

/**
 * Get stored Google tokens by email from BigQuery
 * @param {string} email - User's Google email
 * @returns {Promise<object|null>} Token record or null
 */
export async function getGoogleTokensByEmail(email) {
  if (!email) return null

  try {
    const rows = await runQuery(`
      SELECT user_id, email, access_token, refresh_token, token_expiry, scopes, connected_at, last_used_at, is_active
      FROM \`master-roofing-intelligence.mr_main.user_google_tokens\`
      WHERE email = @email AND is_active = TRUE
      LIMIT 1
    `, { email })

    return rows.length > 0 ? rows[0] : null
  } catch (error) {
    console.error('[google-auth] Failed to get tokens by email from BigQuery:', error.message)
    return null
  }
}

/**
 * Mark a user's Google tokens as inactive (disconnected)
 * @param {string} userId - Google user ID
 */
export async function deactivateGoogleTokens(userId) {
  if (!userId) return

  try {
    await runQuery(`
      UPDATE \`master-roofing-intelligence.mr_main.user_google_tokens\`
      SET is_active = FALSE
      WHERE user_id = @user_id
    `, { user_id: userId })
    console.log('[google-auth] Deactivated tokens for user:', userId)
  } catch (error) {
    console.error('[google-auth] Failed to deactivate tokens:', error.message)
  }
}

/**
 * Update last_used_at timestamp for a user
 * @param {string} userId - Google user ID
 */
export async function touchGoogleTokenUsage(userId) {
  if (!userId) return

  try {
    await runQuery(`
      UPDATE \`master-roofing-intelligence.mr_main.user_google_tokens\`
      SET last_used_at = CURRENT_TIMESTAMP()
      WHERE user_id = @user_id
    `, { user_id: userId })
  } catch (error) {
    // Silent fail — this is just a usage tracker
  }
}

/**
 * List all active Google-connected users
 * @returns {Promise<Array>} List of connected users
 */
export async function listConnectedUsers() {
  try {
    const rows = await runQuery(`
      SELECT user_id, email, connected_at, last_used_at, scopes
      FROM \`master-roofing-intelligence.mr_main.user_google_tokens\`
      WHERE is_active = TRUE
      ORDER BY connected_at DESC
    `)
    return rows
  } catch (error) {
    console.error('[google-auth] Failed to list connected users:', error.message)
    return []
  }
}
