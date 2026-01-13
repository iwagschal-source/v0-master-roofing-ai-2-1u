/**
 * API Endpoints
 * Organized by feature domain for easy addition of new routes
 */

import { api } from './client';
import { DashboardsListResponse, OpenDashboardResponse, Session, SessionCreateResponse, SessionListResponse, SessionMessagesResponse, TopCustomersResponse } from './types';


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
// Gmail Endpoints
// ============================================================================

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;
  body: string;
  date: string;
  read: boolean;
  labels: string[];
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId: string;
  }>;
}

export interface GmailListResponse {
  messages: GmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export const gmailAPI = {
  /**
   * List emails from inbox
   */
  listMessages: async (params?: {
    maxResults?: number;
    pageToken?: string;
    q?: string;
    labelIds?: string[];
  }): Promise<GmailListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.maxResults) searchParams.set('maxResults', params.maxResults.toString());
    if (params?.pageToken) searchParams.set('pageToken', params.pageToken);
    if (params?.q) searchParams.set('q', params.q);
    if (params?.labelIds) searchParams.set('labelIds', params.labelIds.join(','));

    const query = searchParams.toString();
    return api.get<GmailListResponse>(`/gmail/messages${query ? `?${query}` : ''}`);
  },

  /**
   * Get a specific email
   */
  getMessage: async (messageId: string): Promise<GmailMessage> => {
    return api.get<GmailMessage>(`/gmail/messages/${messageId}`);
  },

  /**
   * Send an email
   */
  sendMessage: async (data: {
    to: string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    replyTo?: string;
    threadId?: string;
  }): Promise<{ id: string; threadId: string }> => {
    return api.post('/gmail/send', data);
  },

  /**
   * Mark message as read/unread
   */
  modifyMessage: async (
    messageId: string,
    data: { addLabels?: string[]; removeLabels?: string[] }
  ): Promise<GmailMessage> => {
    return api.post(`/gmail/messages/${messageId}/modify`, data);
  },

  /**
   * Get thread (all messages in conversation)
   */
  getThread: async (threadId: string): Promise<{ messages: GmailMessage[] }> => {
    return api.get(`/gmail/threads/${threadId}`);
  },

  /**
   * Generate AI draft reply
   */
  generateDraft: async (data: {
    messageId: string;
    tone?: 'professional' | 'friendly' | 'brief' | 'detailed';
    instructions?: string;
  }): Promise<{ draft: string; suggestions: string[] }> => {
    return api.post('/gmail/draft', data);
  },

  /**
   * Get email summary and action items via KO
   */
  analyzeEmail: async (messageId: string): Promise<{
    summary: string;
    actionItems: string[];
    priority: 'high' | 'medium' | 'low';
    strategy: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  }> => {
    return api.get(`/gmail/analyze/${messageId}`);
  },
};

// ============================================================================
// Calendar/Meet Endpoints
// ============================================================================

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>;
  hangoutLink?: string;
  meetingLink?: string;
  location?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  organizer?: { email: string; displayName?: string };
}

export interface CalendarListResponse {
  events: CalendarEvent[];
  nextPageToken?: string;
}

export interface MeetRecording {
  id: string;
  name: string;
  meetingCode: string;
  startTime: string;
  endTime: string;
  duration: number;
  participants: string[];
  downloadUrl?: string;
  transcriptUrl?: string;
}

export const calendarAPI = {
  /**
   * List calendar events
   */
  listEvents: async (params?: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    pageToken?: string;
    calendarId?: string;
  }): Promise<CalendarListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.timeMin) searchParams.set('timeMin', params.timeMin);
    if (params?.timeMax) searchParams.set('timeMax', params.timeMax);
    if (params?.maxResults) searchParams.set('maxResults', params.maxResults.toString());
    if (params?.pageToken) searchParams.set('pageToken', params.pageToken);
    if (params?.calendarId) searchParams.set('calendarId', params.calendarId);

    const query = searchParams.toString();
    return api.get<CalendarListResponse>(`/calendar/events${query ? `?${query}` : ''}`);
  },

  /**
   * Get a specific event
   */
  getEvent: async (eventId: string, calendarId?: string): Promise<CalendarEvent> => {
    const query = calendarId ? `?calendarId=${calendarId}` : '';
    return api.get<CalendarEvent>(`/calendar/events/${eventId}${query}`);
  },

  /**
   * Get upcoming meetings (with Meet links)
   */
  getUpcomingMeetings: async (limit?: number): Promise<CalendarEvent[]> => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<CalendarEvent[]>(`/calendar/meetings${query}`);
  },

  /**
   * Get Meet recordings
   */
  getMeetRecordings: async (params?: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<MeetRecording[]> => {
    const searchParams = new URLSearchParams();
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);
    if (params?.limit) searchParams.set('limit', params.limit.toString());

    const query = searchParams.toString();
    return api.get<MeetRecording[]>(`/meet/recordings${query ? `?${query}` : ''}`);
  },
};

// ============================================================================
// Google Chat Endpoints
// ============================================================================

export interface ChatSpace {
  id: string;
  name: string;
  type: 'ROOM' | 'DM' | 'GROUP_DM';
  displayName?: string;
  memberCount?: number;
  lastMessageTime?: string;
}

export interface ChatMessage {
  id: string;
  spaceId: string;
  sender: { name: string; email: string; avatarUrl?: string };
  text: string;
  createTime: string;
  threadId?: string;
  attachments?: Array<{ name: string; downloadUrl: string }>;
}

export const chatSpacesAPI = {
  /**
   * List chat spaces (rooms and DMs)
   */
  listSpaces: async (): Promise<ChatSpace[]> => {
    return api.get<ChatSpace[]>('/chat/spaces');
  },

  /**
   * Get messages in a space
   */
  getMessages: async (
    spaceId: string,
    params?: { pageSize?: number; pageToken?: string }
  ): Promise<{ messages: ChatMessage[]; nextPageToken?: string }> => {
    const searchParams = new URLSearchParams();
    if (params?.pageSize) searchParams.set('pageSize', params.pageSize.toString());
    if (params?.pageToken) searchParams.set('pageToken', params.pageToken);

    const query = searchParams.toString();
    return api.get(`/chat/spaces/${spaceId}/messages${query ? `?${query}` : ''}`);
  },

  /**
   * Send a message to a space
   */
  sendMessage: async (
    spaceId: string,
    data: { text: string; threadId?: string }
  ): Promise<ChatMessage> => {
    return api.post(`/chat/spaces/${spaceId}/messages`, data);
  },
};

// ============================================================================
// Asana Endpoints
// ============================================================================

export interface AsanaTask {
  id: string;
  name: string;
  notes?: string;
  completed: boolean;
  due_on?: string;
  due_at?: string;
  assignee?: { gid: string; name: string; email?: string };
  projects?: Array<{ gid: string; name: string }>;
  tags?: Array<{ gid: string; name: string; color?: string }>;
  custom_fields?: Array<{ gid: string; name: string; display_value?: string }>;
  permalink_url?: string;
  created_at: string;
  modified_at: string;
}

export interface AsanaProject {
  id: string;
  name: string;
  color?: string;
  notes?: string;
  workspace: { gid: string; name: string };
}

export const asanaAPI = {
  /**
   * List tasks assigned to current user
   */
  listMyTasks: async (params?: {
    completed_since?: string;
    workspace?: string;
  }): Promise<AsanaTask[]> => {
    const searchParams = new URLSearchParams();
    if (params?.completed_since) searchParams.set('completed_since', params.completed_since);
    if (params?.workspace) searchParams.set('workspace', params.workspace);

    const query = searchParams.toString();
    return api.get<AsanaTask[]>(`/asana/tasks/me${query ? `?${query}` : ''}`);
  },

  /**
   * List tasks in a project
   */
  listProjectTasks: async (
    projectId: string,
    params?: { completed?: boolean }
  ): Promise<AsanaTask[]> => {
    const query = params?.completed !== undefined ? `?completed=${params.completed}` : '';
    return api.get<AsanaTask[]>(`/asana/projects/${projectId}/tasks${query}`);
  },

  /**
   * Get a specific task
   */
  getTask: async (taskId: string): Promise<AsanaTask> => {
    return api.get<AsanaTask>(`/asana/tasks/${taskId}`);
  },

  /**
   * Update a task
   */
  updateTask: async (
    taskId: string,
    data: Partial<Pick<AsanaTask, 'name' | 'notes' | 'completed' | 'due_on'>>
  ): Promise<AsanaTask> => {
    return api.put(`/asana/tasks/${taskId}`, data);
  },

  /**
   * Complete a task
   */
  completeTask: async (taskId: string): Promise<AsanaTask> => {
    return api.post(`/asana/tasks/${taskId}/complete`);
  },

  /**
   * List projects
   */
  listProjects: async (workspaceId?: string): Promise<AsanaProject[]> => {
    const query = workspaceId ? `?workspace=${workspaceId}` : '';
    return api.get<AsanaProject[]>(`/asana/projects${query}`);
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
// Analytics Endpoints
// ============================================================================

export const analyticsAPI = {
  /**
   * Get top customers with systems and items breakdown
   */
  getTopCustomers: async (limit: number = 20): Promise<TopCustomersResponse> => {
    return api.get<TopCustomersResponse>(`/analytics/top-customers?limit=${limit}`);
  },

  /**
   * Get customer detail by name
   */
  getCustomerDetail: async (customerName: string): Promise<TopCustomersResponse['customers'][0]> => {
    return api.get(`/analytics/customer/${encodeURIComponent(customerName)}`);
  },

  /**
   * Get systems summary across all projects
   */
  getSystemsSummary: async (): Promise<TopCustomersResponse['systemsSummary']> => {
    return api.get('/analytics/systems-summary');
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
  analytics: analyticsAPI,
  gmail: gmailAPI,
  calendar: calendarAPI,
  chatSpaces: chatSpacesAPI,
  asana: asanaAPI,
};

// Re-export for convenience
export { APIError } from './client';