import { useState, useRef } from 'react';
import { Send, Mic, Square, Loader2 } from 'lucide-react';

interface Props {
  onSend: (message: string) => void;
  onVoiceRecord?: (blob: Blob) => void;
  isStreaming?: boolean;
  onStop?: () => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, onVoiceRecord, isStreaming, onStop, disabled }: Props) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        onVoiceRecord?.(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <div className="flex-1 relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
          placeholder="Ask MiMo anything..."
          rows={1}
          disabled={disabled}
          className="input-field resize-none min-h-[48px] max-h-32 pr-12"
        />
      </div>
      {onVoiceRecord && (
        <button
          type="button"
          onClick={toggleRecording}
          className={`p-3 rounded-xl transition-all ${
            isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-surface-light text-gray-400 hover:text-white'
          }`}
        >
          {isRecording ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      )}
      {isStreaming ? (
        <button type="button" onClick={onStop} className="btn-primary p-3">
          <Square className="w-5 h-5" />
        </button>
      ) : (
        <button type="submit" disabled={!text.trim() || disabled} className="btn-primary p-3 disabled:opacity-50">
          {disabled ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      )}
    </form>
  );
}
