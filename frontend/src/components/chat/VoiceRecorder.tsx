import { useState, useRef, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface Props {
  onRecordingComplete: (blob: Blob) => void;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecordingComplete, disabled }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number>();
  const chunksRef = useRef<BlobPart[]>([]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);
      timerRef.current = window.setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error('Mic error:', err);
    }
  }, [onRecordingComplete]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    clearInterval(timerRef.current);
    setIsRecording(false);
  }, []);

  const formatDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={isRecording ? stop : start}
        disabled={disabled}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isRecording
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
            : 'bg-surface-light text-gray-400 hover:text-white hover:bg-surface-lighter'
        }`}
      >
        {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
      {isRecording && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-gray-400 font-mono">{formatDur(duration)}</span>
        </div>
      )}
    </div>
  );
}
