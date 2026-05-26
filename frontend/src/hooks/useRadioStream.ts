import { useCallback, useRef, useState } from 'react';
import { connectRadioStream } from '../api/radio';

export function useRadioStream() {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const connect = useCallback((episodeId: string) => {
    disconnect();
    audioCtxRef.current = new AudioContext();

    const ws = connectRadioStream(
      episodeId,
      async (data) => {
        if (!audioCtxRef.current) return;
        try {
          const buffer = await audioCtxRef.current.decodeAudioData(data);
          const source = audioCtxRef.current.createBufferSource();
          source.buffer = buffer;
          source.connect(audioCtxRef.current.destination);
          source.start();
          sourceRef.current = source;
        } catch (e) {
          console.error('Audio decode error:', e);
        }
      },
      (msg) => {
        try {
          const parsed = JSON.parse(msg);
          if (parsed.status) setStatus(parsed.status);
          if (parsed.track) setStatus(`Now playing: ${parsed.track}`);
        } catch {
          setStatus(msg);
        }
      }
    );

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);
    ws.onerror = () => setIsConnected(false);
    wsRef.current = ws;
  }, []);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    sourceRef.current?.stop();
    audioCtxRef.current?.close();
    wsRef.current = null;
    audioCtxRef.current = null;
    setIsConnected(false);
    setStatus('');
  }, []);

  return { isConnected, status, connect, disconnect };
}
