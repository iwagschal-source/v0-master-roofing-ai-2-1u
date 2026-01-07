/**
 * API Endpoints
 * Organized by feature domain for easy addition of new routes
 */

import { api } from './client';
import { DashboardsListResponse, OpenDashboardResponse, Session, SessionCreateResponse, SessionListResponse, SessionMessagesResponse } from './types';


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

  /**
   * Get CEO KPIs: velocity, stuck jobs, at-risk
   */
  getCeoKpis: async (): Promise<{
    velocity: {
      avg_days_rfp_to_proposal: number;
      avg_days_to_award: number;
      win_rate: number;
      total_awarded: number;
      total_decided: number;
    };
    stuck_jobs: {
      count_180_plus: number;
      count_90_180: number;
      count_30_90: number;
      active: number;
      total_stuck_value: number;
      scope_creep_risk: number;
    };
    at_risk: {
      critical: number;
      high: number;
      medium: number;
      total_alerts: number;
      high_value_at_risk: number;
    };
  }> => {
    return api.get('/powerbi/ceo-kpis');
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

export const sessionAPI = {
  /**
   * List all chat sessions
   */
  list: async (params?: {
    user_id?: string;
    limit?: number
  }): Promise<SessionListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.user_id) searchParams.set('user_id', params.user_id);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return api.get<SessionListResponse>(`/sessions${query ? `?${query}` : ''}`);
  },

  /**
   * Get a specific session with all messages
   */
  get: async (sessionId: string): Promise<Session> => {
    return api.get<Session>(`/sessions/${sessionId}`);
  },

  /**
   * Get messages from a specific session
   */
  getMessages: async (
    sessionId: string,
    limit?: number
  ): Promise<SessionMessagesResponse> => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<SessionMessagesResponse>(`/sessions/${sessionId}/messages${query}`);
  },

  /**
   * Create a new chat session
   */
  create: async (userId?: string): Promise<SessionCreateResponse> => {
    return api.post<SessionCreateResponse>('/sessions', {
      user_id: userId,
    });
  },

  /**
   * Delete a chat session
   */
  delete: async (sessionId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/sessions/${sessionId}`);
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
   * Get chat history (maps to /v1/sessions)
   * 
   * Note: Backend doesn't support pagination yet, but params are kept
   * for future compatibility. Currently uses 'limit' parameter.
   */
  getHistory: async (params?: {
    page?: number;
    page_size?: number;
    user_id?: string;
  }): Promise<SessionListResponse> => {
    const searchParams = new URLSearchParams();

    // Map page_size to limit for backend compatibility
    const limit = params?.page_size || (params?.page ? params.page * 20 : undefined);
    if (limit) searchParams.set('limit', limit.toString());
    if (params?.user_id) searchParams.set('user_id', params.user_id);

    const query = searchParams.toString();
    return api.get<SessionListResponse>(`/sessions${query ? `?${query}` : ''}`);
  },

  /**
   * Get specific conversation (maps to /v1/sessions/{session_id})
   */
  getConversation: async (conversationId: string): Promise<Session> => {
    return api.get<Session>(`/sessions/${conversationId}`);
  },

  /**
   * Delete conversation (maps to /v1/sessions/{session_id})
   */
  deleteConversation: async (conversationId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/sessions/${conversationId}`);
  },

  /**
   * Clear all history
   * 
   * Note: Backend doesn't have a "clear all" endpoint yet.
   * This method lists all sessions and deletes them individually.
   * Consider adding a bulk delete endpoint to the backend for better performance.
   */
  clearHistory: async (userId?: string): Promise<{ deleted_count: number }> => {
    // Get all sessions for the user
    const { sessions } = await api.get<SessionListResponse>(
      `/sessions${userId ? `?user_id=${userId}` : ''}`
    );

    // Delete each session
    const deletePromises = sessions.map(session =>
      api.delete(`/sessions/${session.session_id}`)
    );

    await Promise.all(deletePromises);

    return {
      deleted_count: sessions.length,
    };
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
  powerbi: powerbiAPI,
  history: historyAPI,
  auth: authAPI,
  sessions: sessionAPI,
};

// Re-export for convenience
export { APIError } from './client';