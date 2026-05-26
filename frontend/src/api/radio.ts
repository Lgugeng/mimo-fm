import { apiFetch } from './client';
import type { RadioCreateRequest, RadioEpisode } from '../types';

export async function createRadio(request: RadioCreateRequest): Promise<RadioEpisode> {
  return apiFetch('/radio/create', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getEpisode(id: string): Promise<RadioEpisode> {
  return apiFetch(`/radio/${id}`);
}

export async function getEpisodes(): Promise<RadioEpisode[]> {
  return apiFetch('/radio/episodes');
}

export function connectRadioStream(
  episodeId: string,
  onAudio: (data: ArrayBuffer) => void,
  onMessage: (msg: string) => void
): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/api/radio/${episodeId}/stream`);
  ws.binaryType = 'arraybuffer';
  ws.onmessage = (event) => {
    if (typeof event.data === 'string') onMessage(event.data);
    else onAudio(event.data);
  };
  return ws;
}
