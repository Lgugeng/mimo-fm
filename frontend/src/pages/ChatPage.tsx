import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { synthesizeSpeech } from '../api/tts';
import { useAudio } from '../contexts/AudioContext';
import ChatBubble from '../components/ChatBubble';
import ChatInput from '../components/chat/ChatInput';
import VoiceSelector from '../components/VoiceSelector';
import WaveformVisualizer from '../components/WaveformVisualizer';
import { Settings, Volume2 } from 'lucide-react';

export default function ChatPage() {
  const { messages, isStreaming, streamingText, send, stop, clear } = useVoiceChat();
  const { playAudioUrl } = useAudio();
  const [voiceId, setVoiceId] = useState('warm-dj');
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = async (text: string) => {
    send({ message: text });
  };

  const handleSpeak = async (text: string) => {
    try {
      const { audio_base64 } = await synthesizeSpeech({ text, voice: voiceId, audio_format: 'wav' });
      const audioUrl = `data:audio/wav;base64,${audio_base64}`;
      playAudioUrl(audioUrl, 'AI Response');
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && !isStreaming && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full text-center">
            <WaveformVisualizer isPlaying={false} />
            <h2 className="text-2xl font-bold mt-6 mb-2">Chat with MiMo</h2>
            <p className="text-gray-400 max-w-md">Your AI radio companion. Ask about music, request songs, or just have a conversation.</p>
          </motion.div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="group">
            <ChatBubble message={msg} />
            {msg.role === 'assistant' && (
              <button
                onClick={() => handleSpeak(msg.content)}
                className="ml-11 mt-1 text-xs text-gray-500 hover:text-primary-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Volume2 className="w-3 h-3" /> Speak
              </button>
            )}
          </div>
        ))}

        {isStreaming && streamingText && (
          <ChatBubble
            message={{ id: 'streaming', role: 'assistant', content: streamingText, timestamp: Date.now() }}
            isStreaming
          />
        )}
      </div>

      {/* Voice picker modal */}
      {showVoicePicker && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-6 mb-4 glass-card"
        >
          <VoiceSelector voices={[]} selectedId={voiceId} onSelect={(v) => { setVoiceId(v.id); setShowVoicePicker(false); }} />
        </motion.div>
      )}

      <div className="p-6 border-t border-white/5 bg-surface/80 backdrop-blur-xl space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowVoicePicker(!showVoicePicker)}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
          >
            <Settings className="w-3 h-3" /> Voice: {voiceId}
          </button>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoSpeak} onChange={(e) => setAutoSpeak(e.target.checked)} className="accent-primary-500" />
            Auto-speak responses
          </label>
        </div>
        <ChatInput onSend={handleSend} isStreaming={isStreaming} onStop={stop} />
      </div>
    </div>
  );
}
