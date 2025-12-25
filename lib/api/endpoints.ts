/**
 * API Endpoints
 * Organized by feature domain for easy addition of new routes
 */

import { api } from './client';
import { DashboardsListResponse, OpenDashboardResponse } from './types';


// ============================================================================
// Power BI Endpoints
// ============================================================================

export const powerbiAPI = {
  /**
   * Get list of pre-built dashboards for gallery view
   */
  listDashboards: async (): Promise<DashboardsListResponse> => {
    return api.get<DashboardsListResponse>('/powerbi/dashboards');
  },

  /**
   * Open a specific pre-built dashboard
   */
  openDashboard: async (
    dashboardId: string,
    filters?: Record<string, any>
  ): Promise<OpenDashboardResponse> => {
    return api.post<OpenDashboardResponse>(
      `/powerbi/dashboard/${dashboardId}`,
      { filters }
    );
  },
};

// ============================================================================
// Chat Endpoints
// ============================================================================

export const chatAPI = {
  /**
   * Send a chat message to the Chief Agent
   */
  sendMessage: async (data) => {
    return api.post('/chat', data);
  },

  /**
   * Send a streaming chat message (future implementation)
   */
  sendMessageStream: async (
    data,
    onChunk) => {
    // TODO: Implement SSE or WebSocket streaming
    throw new Error('Streaming not yet implemented');
  },
};

// ============================================================================
// System Endpoints
// ============================================================================

export const systemAPI = {
  /**
   * Health check
   */
  health: async () => {
    // Health endpoint is outside /v1 namespace
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${baseUrl}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  },

  /**
   * Get system configuration
   */
  config: async () => {
    return api.get('/config');
  },
};

// ============================================================================
// History Endpoints (Placeholder)
// ============================================================================

export const historyAPI = {
  /**
   * Get chat history
   */
  getHistory: async (params) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.page_size) searchParams.set('page_size', params.page_size.toString());
    if (params?.user_id) searchParams.set('user_id', params.user_id);

    const query = searchParams.toString();
    return api.get(`/history${query ? `?${query}` : ''}`);
  },

  /**
   * Get specific conversation
   */
  getConversation: async (conversationId) => {
    return api.get(`/history/${conversationId}`);
  },

  /**
   * Delete conversation
   */
  deleteConversation: async (conversationId) => {
    return api.delete(`/history/${conversationId}`);
  },

  /**
   * Clear all history
   */
  clearHistory: async (userId) => {
    return api.delete(`/history${userId ? `?user_id=${userId}` : ''}`);
  },
};

// ============================================================================
// Auth Endpoints (Placeholder)
// ============================================================================

export const authAPI = {
  /**
   * Login
   */
  login: async (credentials) => {
    return api.post('/auth/login', credentials);
  },

  /**
   * Logout
   */
  logout: async () => {
    return api.post('/auth/logout');
  },

  /**
   * Refresh token
   */
  refreshToken: async (refreshToken) => {
    return api.post('/auth/refresh', { refresh_token: refreshToken });
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    return api.get('/auth/me');
  },

  /**
   * Verify token
   */
  verifyToken: async (token) => {
    return api.post('/auth/verify', { token });
  },
};

// ============================================================================
// Main API Export (Aggregated)
// ============================================================================

export const apiClient = {
  chat: chatAPI,
  system: systemAPI,
  history: historyAPI,
  auth: authAPI,
};

// Re-export for convenience
export { APIError } from './client';