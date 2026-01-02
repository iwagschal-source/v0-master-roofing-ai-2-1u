/**
 * useAudioCapture Hook
 * Captures microphone audio and converts to PCM chunks for streaming.
 *
 * Audio specs for Deepgram:
 * - Sample rate: 16000 Hz
 * - Channels: 1 (mono)
 * - Format: Int16 PCM
 */

import { useState, useRef, useCallback } from 'react';

interface UseAudioCaptureReturn {
  isRecording: boolean;
  audioLevel: number;
  error: string | null;
  startRecording: (onAudioChunk: (chunk: ArrayBuffer) => void) => Promise<void>;
  stopRecording: () => void;
}

export function useAudioCapture(): UseAudioCaptureReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const startRecording = useCallback(async (
    onAudioChunk: (chunk: ArrayBuffer) => void
  ) => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });

      mediaStreamRef.current = stream;

      // Create audio context - browser will resample as needed
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // Resume audio context if suspended (required by browser autoplay policy)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // Create source from microphone stream
      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Create script processor for audio processing
      // Buffer size of 4096 gives ~256ms of audio per chunk at 16kHz
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const float32Data = e.inputBuffer.getChannelData(0);

        // Convert Float32 [-1, 1] to Int16 [-32768, 32767]
        const int16Data = new Int16Array(float32Data.length);
        for (let i = 0; i < float32Data.length; i++) {
          const s = Math.max(-1, Math.min(1, float32Data[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Calculate audio level for visualization (RMS)
        let sum = 0;
        for (let i = 0; i < float32Data.length; i++) {
          sum += float32Data[i] * float32Data[i];
        }
        const rms = Math.sqrt(sum / float32Data.length);
        setAudioLevel(Math.min(1, rms * 5)); // Scale for visualization

        // Send chunk to callback
        onAudioChunk(int16Data.buffer);
      };

      // Connect nodes
      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);

    } catch (err) {
      console.error('[Audio] Failed to start recording:', err);
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
      throw err;
    }
  }, []);

  const stopRecording = useCallback(() => {
    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop all tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  return {
    isRecording,
    audioLevel,
    error,
    startRecording,
    stopRecording
  };
}
