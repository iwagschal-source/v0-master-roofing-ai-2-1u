/**
 * useChat Hook
 * React hook for managing chat interactions with the Chief Agent
 */

import { useState, useCallback } from 'react';
import { apiClient, APIError } from '@/lib/api';
import type { ChatRequest, ChatResponse, ToolTrace } from '@/lib/api/types';

interface UseChatOptions {
  onSuccess?: (response: ChatResponse) => void;
  onError?: (error: APIError) => void;
}

interface UseChatReturn {
  // State
  isLoading: boolean;
  error: APIError | null;
  response: ChatResponse | null;
  
  // Actions
  sendMessage: (message: string, context?: Record<string, any>) => Promise<void>;
  clearError: () => void;
  reset: () => void;
  
  // Computed
  hasResponse: boolean;
  isStubMode: boolean;
}

export function useChat(options?: UseChatOptions): UseChatReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIError | null>(null);
  const [response, setResponse] = useState<ChatResponse | null>(null);

  const sendMessage = useCallback(
    async (message: string, context?: Record<string, any>) => {
      if (!message.trim()) {
        setError(new APIError('Message cannot be empty', 400, 'Bad Request'));
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const request: ChatRequest = {
          message: message.trim(),
          ...(context && { context }),
        };

        const result = await apiClient.chat.sendMessage(request);
        setError(null);
        setResponse(result);
        options?.onSuccess?.(result);
      } catch (err) {
        console.log(err)
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
      }
    },
    [options]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setResponse(null);
  }, []);

  const hasResponse = response !== null;
  const isStubMode = response?.stub_mode 
    ? Object.values(response.stub_mode).some(v => v === true)
    : false;

  return {
    isLoading,
    error,
    response,
    sendMessage,
    clearError,
    reset,
    hasResponse,
    isStubMode,
  };
}