/**
 * useWebSocketChat Hook
 * Manages WebSocket connection for streaming chat with progressive disclosure.
 *
 * Events from server:
 * - connected: { session_id }
 * - phase_start: { phase, message }
 * - phase_complete: { phase, data }
 * - tool_start: { tool, message }
 * - tool_complete: { tool, summary }
 * - text_chunk: { content }
 * - response_complete: { sources }
 * - error: { message }
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// WebSocket URL - use env var or hardcoded backend URL
const getWsUrl = () => {
  // Always prefer the environment variable
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  // Fallback to hardcoded backend URL (not localhost)
  return 'wss://34.95.128.208/ws/chat';
};
const WS_URL = getWsUrl();

// Event types from backend
type WSEventType =
  | 'connected'
  | 'phase_start'
  | 'phase_complete'
  | 'tool_start'
  | 'tool_complete'
  | 'text_chunk'
  | 'response_complete'
  | 'error';

interface WSEvent {
  type: WSEventType;
  phase?: string;
  message?: string;
  data?: Record<string, unknown>;
  tool?: string;
  summary?: string;
  content?: string;
  sources?: Array<{ id: string; title: string; url: string; snippet?: string }>;
  session_id?: string;
}

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
}

interface UseWebSocketChatReturn {
  // Connection state
  isConnected: boolean;
  sessionId: string | null;

  // Progress state
  phases: Phase[];
  currentPhase: string | null;
  tools: Tool[];

  // Response state
  streamingText: string;
  isStreaming: boolean;
  isComplete: boolean;
  sources: Source[];
  error: string | null;

  // Actions
  sendMessage: (message: string, context?: Record<string, unknown>) => void;
  reset: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

// Phase display names
const PHASE_DISPLAY_NAMES: Record<string, string> = {
  project_resolution: 'Identifying Projects',
  routing: 'Analyzing Question',
  merge: 'Synthesizing',
  response: 'Composing Answer'
};

// Initial phases state
const createInitialPhases = (): Phase[] => [
  { name: 'project_resolution', displayName: 'Identifying Projects', status: 'pending' },
  { name: 'routing', displayName: 'Analyzing Question', status: 'pending' },
  { name: 'merge', displayName: 'Synthesizing', status: 'pending' },
  { name: 'response', displayName: 'Composing Answer', status: 'pending' }
];

export function useWebSocketChat(): UseWebSocketChatReturn {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Progress state
  const [phases, setPhases] = useState<Phase[]>(createInitialPhases());
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);

  // Response state
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reset state for new message
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

  // Handle incoming WebSocket events
  const handleEvent = useCallback((event: WSEvent) => {
    console.log('[WS] Event:', event.type, event);

    switch (event.type) {
      case 'connected':
        setSessionId(event.session_id || null);
        console.log('[WS] Session established:', event.session_id);
        break;

      case 'phase_start':
        if (event.phase) {
          setCurrentPhase(event.phase);
          setIsStreaming(true);
          setPhases(prev => prev.map(p =>
            p.name === event.phase
              ? { ...p, status: 'active', message: event.message || p.message }
              : p
          ));
        }
        break;

      case 'phase_complete':
        if (event.phase) {
          setPhases(prev => prev.map(p =>
            p.name === event.phase
              ? { ...p, status: 'complete', data: event.data }
              : p
          ));
        }
        break;

      case 'tool_start':
        if (event.tool) {
          setTools(prev => [...prev, {
            name: event.tool!,
            status: 'active',
            message: event.message
          }]);
        }
        break;

      case 'tool_complete':
        if (event.tool) {
          setTools(prev => prev.map(t =>
            t.name === event.tool
              ? { ...t, status: 'complete', summary: event.summary }
              : t
          ));
        }
        break;

      case 'text_chunk':
        if (event.content) {
          setStreamingText(prev => prev + event.content);
        }
        break;

      case 'response_complete':
        setIsComplete(true);
        setIsStreaming(false);
        setSources(event.sources || []);
        setCurrentPhase(null);
        console.log('[WS] Response complete, sources:', event.sources?.length || 0);
        break;

      case 'error':
        setError(event.message || 'Unknown error');
        setIsStreaming(false);
        setCurrentPhase(null);
        console.error('[WS] Error:', event.message);
        break;
    }
  }, []);

  // Reconnect attempt counter
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('[WS] Already connected or connecting, skipping');
      return;
    }

    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    console.log('[WS] Connecting to:', WS_URL, '(attempt', reconnectAttemptsRef.current + 1, ')');

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WS] Connected successfully');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent;
          handleEvent(data);
        } catch (e) {
          console.error('[WS] Failed to parse message:', e);
        }
      };

      ws.onclose = (event) => {
        console.log('[WS] Disconnected, code:', event.code, 'reason:', event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect (unless intentionally closed with code 1000)
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(1000 * reconnectAttemptsRef.current, 5000); // Exponential backoff, max 5s
          console.log('[WS] Will reconnect in', delay, 'ms');
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WS] Attempting reconnect...');
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          console.error('[WS] Max reconnect attempts reached');
          setError('Unable to connect. Please click Reconnect or refresh the page.');
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Connection error - this often means SSL certificate was rejected');
        console.error('[WS] Try visiting https://34.95.128.208/health in a new tab and accepting the certificate');
        // Don't set error here - onclose will be called next
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('[WS] Failed to create WebSocket:', e);
      setError('Failed to connect - check console for details');
    }
  }, [handleEvent]);

  // Initialize connection on mount
  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, [connect]);

  // Send message - with auto-reconnect attempt
  const sendMessage = useCallback((message: string, context?: Record<string, unknown>) => {
    // If not connected, try to reconnect first
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('[WS] Not connected, attempting reconnect before send...');

      // Try to connect
      connect();

      // Wait a bit for connection, then retry
      const retryTimeout = setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Connection succeeded, send the message
          resetState();
          setIsStreaming(true);
          const payload = { message, context };
          console.log('[WS] Sending after reconnect:', payload);
          wsRef.current.send(JSON.stringify(payload));
        } else {
          setError('Unable to connect to server. Please check your connection and try again.');
        }
      }, 2000);

      return;
    }

    // Reset state for new message
    resetState();
    setIsStreaming(true);

    // Send message
    const payload = { message, context };
    console.log('[WS] Sending:', payload);
    wsRef.current.send(JSON.stringify(payload));
  }, [resetState, connect]);

  // Public reset (for external use)
  const reset = useCallback(() => {
    resetState();
  }, [resetState]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Reconnect (manual - reset attempts counter)
  const reconnect = useCallback(() => {
    console.log('[WS] Manual reconnect triggered');
    reconnectAttemptsRef.current = 0; // Reset attempts on manual reconnect
    disconnect();
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  return {
    // Connection state
    isConnected,
    sessionId,

    // Progress state
    phases,
    currentPhase,
    tools,

    // Response state
    streamingText,
    isStreaming,
    isComplete,
    sources,
    error,

    // Actions
    sendMessage,
    reset,
    disconnect,
    reconnect
  };
}
