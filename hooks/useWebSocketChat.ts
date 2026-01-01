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

// WebSocket URL - defaults to production, can be overridden
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://34.95.128.208:8000/ws/chat';

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

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    console.log('[WS] Connecting to:', WS_URL);

    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        setError(null);
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
        console.log('[WS] Disconnected, code:', event.code);
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect after 3 seconds (unless intentionally closed)
        if (event.code !== 1000) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WS] Attempting reconnect...');
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('[WS] Error:', error);
        setError('Connection error');
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('[WS] Failed to create WebSocket:', e);
      setError('Failed to connect');
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

  // Send message
  const sendMessage = useCallback((message: string, context?: Record<string, unknown>) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to server');
      return;
    }

    // Reset state for new message
    resetState();
    setIsStreaming(true);

    // Send message
    const payload = { message, context };
    console.log('[WS] Sending:', payload);
    wsRef.current.send(JSON.stringify(payload));
  }, [resetState]);

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

  // Reconnect
  const reconnect = useCallback(() => {
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
