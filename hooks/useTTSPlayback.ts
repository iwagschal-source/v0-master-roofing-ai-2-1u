/**
 * useTTSPlayback Hook
 * Handles on-demand text-to-speech playback via REST API.
 *
 * Fetches audio from /v1/tts endpoint and plays it.
 * Supports streaming playback for lower latency.
 */

import { useState, useRef, useCallback } from 'react';

// API URL - auto-detect for same-origin deployment
const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://136.111.252.120';
};
const API_URL = typeof window !== 'undefined' ? getApiUrl() : (process.env.NEXT_PUBLIC_PYTHON_BACKEND_URL || 'https://136.111.252.120');

interface UseTTSPlaybackReturn {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  progress: number; // 0-1 playback progress
  playText: (text: string, voiceId?: string) => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function useTTSPlayback(): UseTTSPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setProgress(0);
  }, []);

  // Play text
  const playText = useCallback(async (text: string, voiceId?: string) => {
    // Cleanup previous audio
    cleanup();

    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Fetch audio from TTS endpoint
      const response = await fetch(`${API_URL}/v1/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice_id: voiceId
        })
      });

      if (!response.ok) {
        throw new Error(`TTS request failed: ${response.status}`);
      }

      // Get audio blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      blobUrlRef.current = audioUrl;

      // Create audio element
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      // Set up event handlers
      audio.onplay = () => {
        setIsPlaying(true);
        setIsLoading(false);
      };

      audio.onpause = () => {
        setIsPlaying(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setProgress(1);
        cleanup();
      };

      audio.onerror = (e) => {
        console.error('[TTS] Audio playback error:', e);
        setError('Audio playback failed');
        setIsPlaying(false);
        setIsLoading(false);
        cleanup();
      };

      audio.ontimeupdate = () => {
        if (audio.duration > 0) {
          setProgress(audio.currentTime / audio.duration);
        }
      };

      // Start playback
      await audio.play();

    } catch (err) {
      console.error('[TTS] Failed to play:', err);
      setError(err instanceof Error ? err.message : 'TTS failed');
      setIsLoading(false);
      cleanup();
    }
  }, [cleanup]);

  // Stop playback
  const stop = useCallback(() => {
    cleanup();
    setIsPlaying(false);
    setIsLoading(false);
  }, [cleanup]);

  // Pause playback
  const pause = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
    }
  }, []);

  // Resume playback
  const resume = useCallback(() => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(err => {
        console.error('[TTS] Resume failed:', err);
        setError('Resume failed');
      });
    }
  }, []);

  return {
    isPlaying,
    isLoading,
    error,
    progress,
    playText,
    stop,
    pause,
    resume
  };
}
