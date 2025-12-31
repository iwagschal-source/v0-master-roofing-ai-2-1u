/**
 * useChat Hook
 * React hook for managing chat interactions with the Chief Agent
 * Now includes automatic session management for conversation history
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { apiClient } from '@/lib/api/endpoints'; // Update import path
import { APIError } from '@/lib/api/client';
import type { ChatRequest, ChatResponse, SessionSummary } from '@/lib/api/types';

interface UseChatOptions {
  onSuccess?: (response: ChatResponse) => void;
  onError?: (error: APIError) => void;
  persistSession?: boolean; // Whether to persist session to localStorage
  sessionKey?: string; // Custom key for localStorage (default: 'chat_session_id')
}

interface UseChatReturn {
  // State
  isLoading: boolean;
  error: APIError | null;
  response: ChatResponse | null;
  sessionId: string | null;

  // Actions
  sendMessage: (message: string, context?: Record<string, any>) => Promise<void>;
  clearError: () => void;
  reset: () => void;
  startNewSession: () => void;
  setSessionId: (sessionId: string | null) => void;
  // Computed
  hasResponse: boolean;
  isStubMode: boolean;
  hasActiveSession: boolean;
}

export function useChat(options?: UseChatOptions): UseChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIError | null>(null);
  const [response, setResponse] = useState<ChatResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Use ref to track if we're already loading to prevent duplicate requests
  const isLoadingRef = useRef(false);

  const persistSession = options?.persistSession ?? true;
  const sessionKey = options?.sessionKey ?? 'chat_session_id';

  // Load session from localStorage on mount
  useEffect(() => {
    if (persistSession) {
      const savedSessionId = localStorage.getItem(sessionKey);
      if (savedSessionId) {
        setSessionId(savedSessionId);
        console.log('[useChat] Restored session:', savedSessionId);
      }
    }
  }, [persistSession, sessionKey]);

  // Save session to localStorage whenever it changes
  useEffect(() => {
    if (persistSession && sessionId) {
      localStorage.setItem(sessionKey, sessionId);
      console.log('[useChat] Persisted session:', sessionId);
    }
  }, [sessionId, persistSession, sessionKey]);

  const sendMessage = useCallback(
    async (message: string, context?: Record<string, any>) => {
      if (!message.trim()) {
        setError(new APIError('Message cannot be empty', 400, 'Bad Request'));
        return;
      }

      // Prevent duplicate requests
      if (isLoadingRef.current) {
        console.warn('[useChat] Request already in progress, skipping...');
        return;
      }

      setIsLoading(true);
      isLoadingRef.current = true;
      setError(null);

      try {
        const request: ChatRequest = {
          message: message.trim(),
          ...(context && { context }),
          ...(sessionId && { session_id: sessionId }), // Include session_id if available
        };

        console.log('[useChat] Sending message:', {
          message: message.trim(),
          hasContext: !!context,
          sessionId: sessionId || 'new',
        });

        // Import from your endpoints file
        const result = await apiClient.chat.sendMessage(request);

        // Extract and store session_id from response
        if (result.session_id) {
          if (!sessionId) {
            console.log('[useChat] New session created:', result.session_id);
          }
          setSessionId(result.session_id);
        }

        setError(null);
        setResponse(result);
        options?.onSuccess?.(result);
      } catch (err) {
        console.error('[useChat] Error:', err);
        const apiError = err instanceof APIError
          ? err
          : new APIError(
            err instanceof Error ? err.message : 'Unknown error',
            500,
            'Internal Error'
          );
        setResponse(null);
        setError(apiError);
        options?.onError?.(apiError);
      } finally {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
    },
    [sessionId, options]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResponse(null);
    // Note: session is NOT reset - use startNewSession() for that
  }, []);

  const startNewSession = useCallback(() => {
    console.log('[useChat] Starting new session, clearing old session:', sessionId);
    setSessionId(null);
    setResponse(null);
    setError(null);

    if (persistSession) {
      localStorage.removeItem(sessionKey);
    }
  }, [sessionId, persistSession, sessionKey]);

  const hasResponse = response !== null;
  const isStubMode = response?.stub_mode
    ? Object.values(response.stub_mode).some(v => v === true)
    : false;
  const hasActiveSession = sessionId !== null;

  return {
    isLoading,
    error,
    response,
    sessionId,
    sendMessage,
    clearError,
    reset,
    startNewSession,
    setSessionId,
    hasResponse,
    isStubMode,
    hasActiveSession,
  };
}

/**
 * Hook for managing multiple chat sessions
 * Useful for sidebar with multiple conversations
 */
export function useChatSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIError | null>(null);

  const loadSessions = useCallback(async (limit?: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await apiClient.sessions.list({ limit });
      setSessions(result.sessions);
    } catch (err) {
      const apiError = err instanceof APIError
        ? err
        : new APIError(
          err instanceof Error ? err.message : 'Failed to load sessions',
          500,
          'Internal Error'
        );
      setError(apiError);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await apiClient.sessions.delete(sessionId);
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
    } catch (err) {
      const apiError = err instanceof APIError
        ? err
        : new APIError(
          err instanceof Error ? err.message : 'Failed to delete session',
          500,
          'Internal Error'
        );
      setError(apiError);
      throw apiError;
    }
  }, []);

  return {
    sessions,
    isLoading,
    error,
    loadSessions,
    deleteSession,
  };
}