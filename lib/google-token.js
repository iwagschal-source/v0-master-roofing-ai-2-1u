/**
 * Google OAuth Token Management
 * Handles token refresh and expiration checking
 */

import { readJSON, writeJSON } from '@/lib/gcs-storage'
import { runQuery } from '@/lib/bigquery'

const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000 // Refresh 5 minutes before expiration

/**
 * Check if token is expired or about to expire
 */
function isTokenExpired(tokenData) {
  if (!tokenData || !tokenData.access_token) {
    return true
  }

  if (!tokenData.created_at || !tokenData.expires_in) {
    // If we don't have expiration info, assume expired
    return true
  }

  const expiresAt = tokenData.created_at + (tokenData.expires_in * 1000)
  const now = Date.now()
  
  // Consider expired if within 5 minutes of expiration
  return now >= (expiresAt - TOKEN_REFRESH_BUFFER)
}

/**
 * Refresh an expired access token using the refresh token
 */
async function refreshAccessToken(userId, tokenData) {
  if (!tokenData.refresh_token) {
    throw new Error('No refresh token available. Please reconnect your Google account.')
  }

  const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenData.refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  })

  if (!refreshResponse.ok) {
    const errorData = await refreshResponse.text()
    console.error('Token refresh failed:', errorData)
    throw new Error('Failed to refresh Google token. Please reconnect your account.')
  }

  const newTokenData = await refreshResponse.json()

  // Update stored token data
  const updatedTokenData = {
    ...tokenData,
    access_token: newTokenData.access_token,
    expires_in: newTokenData.expires_in || 3600,
    created_at: Date.now(),
    // Keep the refresh token (it doesn't change)
    refresh_token: tokenData.refresh_token,
  }

  // Save updated token to GCS (primary store)
  const tokenPath = `auth/google/${userId}.json`
  await writeJSON(tokenPath, updatedTokenData)

  // Update BigQuery (secondary store) — non-fatal
  try {
    const tokenExpiry = new Date(Date.now() + (updatedTokenData.expires_in || 3600) * 1000).toISOString()
    await runQuery(`
      UPDATE \`master-roofing-intelligence.mr_main.user_google_tokens\`
      SET access_token = @access_token,
          token_expiry = @token_expiry,
          last_used_at = CURRENT_TIMESTAMP()
      WHERE user_id = @user_id
    `, {
      user_id: userId,
      access_token: updatedTokenData.access_token,
      token_expiry: tokenExpiry,
    })
  } catch (bqErr) {
    console.error('[TokenRefresh] BigQuery update failed (non-fatal):', bqErr.message)
  }

  return updatedTokenData.access_token
}

/**
 * Get a valid Google access token, refreshing if necessary
 * 
 * @param {string} userId - Google user ID
 * @param {boolean} forceRefresh - Force refresh even if not expired
 * @returns {Promise<string|null>} - Valid access token or null if not connected
 */
export async function getValidGoogleToken(userId, forceRefresh = false) {
  if (!userId) {
    return null
  }

  try {
    const tokenPath = `auth/google/${userId}.json`
    let tokenData = await readJSON(tokenPath)

    // Fallback: if GCS is unavailable, try BigQuery for the token + refresh_token
    if (!tokenData || !tokenData.access_token) {
      try {
        const rows = await runQuery(`
          SELECT access_token, refresh_token, token_expiry
          FROM \`master-roofing-intelligence.mr_main.user_google_tokens\`
          WHERE user_id = @user_id LIMIT 1
        `, { user_id: userId })
        if (rows?.[0]?.access_token) {
          const expiry = rows[0].token_expiry ? new Date(rows[0].token_expiry.value || rows[0].token_expiry).getTime() : 0
          tokenData = {
            access_token: rows[0].access_token,
            refresh_token: rows[0].refresh_token || null,
            created_at: expiry ? expiry - 3600000 : Date.now() - 7200000, // estimate
            expires_in: 3600,
          }
        }
      } catch (bqErr) {
        console.warn('[Token] BigQuery fallback failed:', bqErr.message)
      }
    }

    if (!tokenData || !tokenData.access_token) {
      return null
    }

    // Check if token needs refresh
    if (forceRefresh || isTokenExpired(tokenData)) {
      console.log('Token expired or force refresh requested, refreshing...')
      const newAccessToken = await refreshAccessToken(userId, tokenData)
      return newAccessToken
    }

    return tokenData.access_token
  } catch (error) {
    console.error('Error getting Google token:', error)
    return null
  }
}

/**
 * Make a Google API request with automatic token refresh on 401 errors
 * 
 * @param {string} userId - Google user ID
 * @param {string} url - API endpoint URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export async function makeGoogleApiRequest(userId, url, options = {}) {
  let token = await getValidGoogleToken(userId)
  
  if (!token) {
    throw new Error('Not connected to Google')
  }

  // Make initial request
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  })

  // If 401, try refreshing token and retry once
  if (response.status === 401) {
    console.log('Got 401, refreshing token and retrying...')
    token = await getValidGoogleToken(userId, true) // Force refresh
    
    if (!token) {
      return response // Return original 401 if refresh failed
    }

    // Retry with new token
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
      },
    })
  }

  return response
}
