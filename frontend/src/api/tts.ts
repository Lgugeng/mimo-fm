import { apiFetch, apiUpload } from './client';
import type { TTSRequest, VoiceCloneRequest, VoiceDesignRequest, Voice } from '../types';

export async function synthesizeSpeech(request: TTSRequest): Promise<{ audio_url: string }> {
  return apiFetch('/tts/synthesize', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function cloneVoice(request: VoiceCloneRequest): Promise<Voice> {
  const form = new FormData();
  form.append('name', request.name);
  form.append('audio_file', request.audio_file);
  if (request.description) form.append('description', request.description);
  return apiUpload('/tts/clone', form);
}

export async function designVoice(request: VoiceDesignRequest): Promise<Voice> {
  return apiFetch('/tts/design', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function getVoices(): Promise<Voice[]> {
  return apiFetch('/tts/voices');
}
