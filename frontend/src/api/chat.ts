import { apiFetch, streamSSE } from './client';
import type { ChatRequest, Message } from '../types';

export function sendMessage(
  request: { messages: { role: string; content: string }[]; model?: string; temperature?: number; max_tokens?: number },
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void
) {
  return streamSSE('/chat', request as Record<string, unknown>, onChunk, onDone, onError);
}

export async function getConversations(): Promise<Message[]> {
  return apiFetch('/chat/history');
}

export async function deleteConversation(id: string): Promise<void> {
  await apiFetch(`/chat/${id}`, { method: 'DELETE' });
}
