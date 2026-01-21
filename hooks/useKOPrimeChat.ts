/**
 * useKOPrimeChat Hook
 * Drop-in replacement for useWebSocketChat that uses KO Prime REST API.
 * Same interface as useWebSocketChat for compatibility.
 */

import { useState, useCallback, useRef } from 'react';

export interface Phase {
  name: string;
  displayName: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message?: string;
  data?: Record<string, unknown>;
}

export interface Tool {
  name: string;
  status: 'active' | 'complete' | 'error';
  message?: string;
  summary?: string;
}

export interface Source {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  gcs_uri?: string;
}

interface UseWebSocketChatReturn {
  isConnected: boolean;
  sessionId: string | null;
  phases: Phase[];
  currentPhase: string | null;
  tools: Tool[];
  streamingText: string;
  isStreaming: boolean;
  isComplete: boolean;
  sources: Source[];
  error: string | null;
  sendMessage: (message: string, context?: Record<string, unknown>) => void;
  reset: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

const createInitialPhases = (): Phase[] => [
  { name: 'processing', displayName: 'Processing with KO Prime', status: 'pending' },
];

export function useWebSocketChat(): UseWebSocketChatReturn {
  const [phases, setPhases] = useState<Phase[]>(createInitialPhases());
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);

  const conversationHistoryRef = useRef<Array<{role: string, content: string}>>([]);

  const resetState = useCallback(() => {
    setPhases(createInitialPhases());
    setTools([]);
    setStreamingText('');
    setIsStreaming(false);
    setIsComplete(false);
    setSources([]);
    setError(null);
    setCurrentPhase(null);
  }, []);

  const sendMessage = useCallback(async (message: string, context?: Record<string, unknown>) => {
    resetState();
    setIsStreaming(true);
    setCurrentPhase('processing');
    setPhases([{ name: 'processing', displayName: 'Processing with KO Prime', status: 'active' }]);

    try {
      const res = await fetch('/api/ko/ko-prime/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversation_history: conversationHistoryRef.current,
          ...context
        })
      });

      const data = await res.json();

      if (res.ok && data.success !== false) {
        // Handle response - check multiple possible paths
        const responseContent = data.result?.response || data.response || data.result?.content || "No response received";

        // Update conversation history
        conversationHistoryRef.current = [
          ...conversationHistoryRef.current,
          { role: "user", content: message },
          { role: "assistant", content: responseContent }
        ];

        // Set tools if available
        if (data.tools_used && data.tools_used.length > 0) {
          setTools(data.tools_used.map((t: string) => ({
            name: t,
            status: 'complete' as const,
            summary: 'Completed'
          })));
        }

        setStreamingText(responseContent);
        setPhases([{ name: 'processing', displayName: 'Processing with KO Prime', status: 'complete' }]);
        setIsComplete(true);
      } else {
        setError(data.error || data.detail || 'Failed to get response');
        setPhases([{ name: 'processing', displayName: 'Processing with KO Prime', status: 'error' }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error');
      setPhases([{ name: 'processing', displayName: 'Processing with KO Prime', status: 'error' }]);
    }

    setIsStreaming(false);
    setCurrentPhase(null);
  }, [resetState]);

  const reset = useCallback(() => {
    resetState();
  }, [resetState]);

  // No-ops for REST API (no persistent connection)
  const disconnect = useCallback(() => {}, []);
  const reconnect = useCallback(() => {}, []);

  return {
    isConnected: true, // Always "connected" for REST
    sessionId: null,
    phases,
    currentPhase,
    tools,
    streamingText,
    isStreaming,
    isComplete,
    sources,
    error,
    sendMessage,
    reset,
    disconnect,
    reconnect
  };
}
