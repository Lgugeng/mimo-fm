import { useCallback, useRef, useState } from 'react';
import type { Message, ChatRequest } from '../types';
import { sendMessage } from '../api/chat';

export function useVoiceChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const controllerRef = useRef<AbortController | null>(null);

  const send = useCallback((request: ChatRequest) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: request.message,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingText('');

    let accumulated = '';
    controllerRef.current = sendMessage(
      request,
      (chunk) => {
        accumulated += chunk;
        setStreamingText(accumulated);
      },
      () => {
        const assistantMsg: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: accumulated,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setStreamingText('');
        setIsStreaming(false);
      },
      (err) => {
        console.error('Chat error:', err);
        setIsStreaming(false);
      }
    );
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setStreamingText('');
  }, []);

  return { messages, isStreaming, streamingText, send, stop, clear };
}
