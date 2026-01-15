/**
 * useVoiceWebSocket Hook
 * Manages WebSocket connection for voice streaming with push-to-talk.
 *
 * Client sends:
 * - voice_start: Begin recording
 * - audio_chunk: PCM audio data (base64)
 * - voice_end: Stop recording
 *
 * Server sends:
 * - voice_ready: Ready to receive audio
 * - transcript_partial: Interim STT result
 * - transcript_final: Final transcript
 * - phase_start/complete: Agent phases
 * - text_chunk: Response text
 * - response_complete: Done
 * - error: Error message
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useAudioCapture } from './useAudioCapture';

// WebSocket URL - auto-detect for same-origin deployment
const getWsVoiceUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_VOICE_URL) {
    return process.env.NEXT_PUBLIC_WS_VOICE_URL;
  }
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/voice`;
  }
  return 'wss://136.116.243.70/ws/voice';
};
const WS_VOICE_URL = typeof window !== 'undefined' ? getWsVoiceUrl() : 'wss://136.116.243.70/ws/voice';

interface Phase {
  name: string;
  displayName: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  message?: string;
}

interface Source {
  id: string;
  title: string;
  url: string;
  snippet?: string;
}

interface UseVoiceWebSocketReturn {
  // Connection state
  isConnected: boolean;
  sessionId: string | null;

  // Recording state
  isRecording: boolean;
  audioLevel: number;

  // Transcription state
  transcript: string;
  isTranscribing: boolean;

  // Response state (reuses pattern from useWebSocketChat)
  phases: Phase[];
  currentPhase: string | null;
  streamingText: string;
  isStreaming: boolean;
  isComplete: boolean;
  sources: Source[];
  error: string | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  startVoice: () => Promise<void>;
  stopVoice: () => void;
  reset: () => void;
}

// Phase display names
const PHASE_DISPLAY_NAMES: Record<string, string> = {
  project_resolution: 'Identifying Projects',
  routing: 'Analyzing Question',
  merge: 'Synthesizing',
  response: 'Composing Answer'
};

// Initial phases
const createInitialPhases = (): Phase[] => [
  { name: 'project_resolution', displayName: 'Identifying Projects', status: 'pending' },
  { name: 'routing', displayName: 'Analyzing Question', status: 'pending' },
  { name: 'merge', displayName: 'Synthesizing', status: 'pending' },
  { name: 'response', displayName: 'Composing Answer', status: 'pending' }
];

export function useVoiceWebSocket(): UseVoiceWebSocketReturn {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Transcription state
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Response state
  const [phases, setPhases] = useState<Phase[]>(createInitialPhases());
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Audio capture hook
  const {
    isRecording,
    audioLevel,
    startRecording,
    stopRecording: stopAudioCapture
  } = useAudioCapture();

  // Reset state
  const resetState = useCallback(() => {
    setTranscript('');
    setIsTranscribing(false);
    setPhases(createInitialPhases());
    setCurrentPhase(null);
    setStreamingText('');
    setIsStreaming(false);
    setIsComplete(false);
    setSources([]);
    setError(null);
  }, []);

  // Handle WebSocket events
  const handleEvent = useCallback((data: Record<string, unknown>) => {
    const eventType = data.type as string;
    console.log('[Voice WS] Event:', eventType, data);

    switch (eventType) {
      case 'voice_ready':
        setSessionId(data.session_id as string);
        console.log('[Voice WS] Session ready:', data.session_id);
        break;

      case 'transcript_partial':
        setTranscript(data.text as string || '');
        break;

      case 'transcript_final':
        setTranscript(data.text as string || '');
        setIsTranscribing(false);
        break;

      case 'phase_start':
        if (data.phase) {
          setCurrentPhase(data.phase as string);
          setIsStreaming(true);
          setPhases(prev => prev.map(p =>
            p.name === data.phase
              ? { ...p, status: 'active', message: data.message as string }
              : p
          ));
        }
        break;

      case 'phase_complete':
        if (data.phase) {
          setPhases(prev => prev.map(p =>
            p.name === data.phase
              ? { ...p, status: 'complete' }
              : p
          ));
        }
        break;

      case 'text_chunk':
        if (data.content) {
          setStreamingText(prev => prev + (data.content as string));
        }
        break;

      case 'response_complete':
        setIsComplete(true);
        setIsStreaming(false);
        setSources((data.sources as Source[]) || []);
        setCurrentPhase(null);
        break;

      case 'error':
        setError(data.message as string || 'Unknown error');
        setIsStreaming(false);
        setIsTranscribing(false);
        break;
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN ||
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    console.log('[Voice WS] Connecting to:', WS_VOICE_URL);

    try {
      const ws = new WebSocket(WS_VOICE_URL);

      ws.onopen = () => {
        console.log('[Voice WS] Connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleEvent(data);
        } catch (e) {
          console.error('[Voice WS] Failed to parse message:', e);
        }
      };

      ws.onclose = (event) => {
        console.log('[Voice WS] Disconnected, code:', event.code);
        setIsConnected(false);
        wsRef.current = null;
      };

      ws.onerror = (error) => {
        console.error('[Voice WS] Error:', error);
        setError('Connection error');
      };

      wsRef.current = ws;
    } catch (e) {
      console.error('[Voice WS] Failed to create WebSocket:', e);
      setError('Failed to connect');
    }
  }, [handleEvent]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Start voice recording
  const startVoice = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setError('Not connected to server');
      return;
    }

    // Reset state for new recording
    resetState();
    setIsTranscribing(true);

    // Send voice_start message
    wsRef.current.send(JSON.stringify({ type: 'voice_start' }));

    // Start audio capture and stream chunks
    try {
      await startRecording((chunk: ArrayBuffer) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          // Convert ArrayBuffer to base64
          const uint8Array = new Uint8Array(chunk);
          let binary = '';
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64 = btoa(binary);

          // Send audio chunk
          wsRef.current.send(JSON.stringify({
            type: 'audio_chunk',
            data: base64
          }));
        }
      });
    } catch (err) {
      console.error('[Voice] Failed to start audio capture:', err);
      setError('Failed to access microphone');
    }
  }, [resetState, startRecording]);

  // Stop voice recording
  const stopVoice = useCallback(() => {
    // Stop audio capture
    stopAudioCapture();

    // Send voice_end message
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'voice_end' }));
    }
  }, [stopAudioCapture]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
      }
    };
  }, []);

  return {
    // Connection state
    isConnected,
    sessionId,

    // Recording state
    isRecording,
    audioLevel,

    // Transcription state
    transcript,
    isTranscribing,

    // Response state
    phases,
    currentPhase,
    streamingText,
    isStreaming,
    isComplete,
    sources,
    error,

    // Actions
    connect,
    disconnect,
    startVoice,
    stopVoice,
    reset: resetState
  };
}
