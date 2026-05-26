import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import type { Message } from '../types';

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-primary-500' : 'bg-radio-500'
      }`}>
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${
        isUser
          ? 'bg-primary-500 text-white rounded-br-sm'
          : 'bg-surface-light text-gray-100 rounded-bl-sm'
      }`}>
        <p className="text-sm whitespace-pre-wrap">
          {message.content}
          {isStreaming && <span className="inline-block w-2 h-4 bg-primary-400 ml-1 animate-pulse" />}
        </p>
        {message.audioUrl && (
          <audio controls src={message.audioUrl} className="mt-2 w-full h-8" />
        )}
      </div>
    </motion.div>
  );
}
