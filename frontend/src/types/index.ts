export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  audioUrl?: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  voice_id?: string;
  stream?: boolean;
}

export interface TTSRequest {
  text: string;
  voice_id?: string;
  speed?: number;
  pitch?: number;
}

export interface VoiceCloneRequest {
  name: string;
  audio_file: File;
  description?: string;
}

export interface VoiceDesignRequest {
  name: string;
  description: string;
  preview_text?: string;
}

export interface Voice {
  id: string;
  name: string;
  description: string;
  preview_url?: string;
  category: 'preset' | 'custom' | 'cloned';
  tags: string[];
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  album_art: string;
  duration_ms: number;
  preview_url?: string;
  uri: string;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  image_url: string;
  track_count: number;
  owner: string;
}

export interface RadioEpisode {
  id: string;
  title: string;
  playlist_name: string;  // Aligned with backend
  segments: RadioSegment[];  // Replaced tracks/dj_narration to match backend
  total_duration_ms: number;  // Matched field name
  status: 'ready' | 'generating' | 'pending';  // Aligned with backend
}

export interface RadioSegment {
  type: 'music' | 'narration';  // From backend schema
  title?: string;
  script?: string;
  audio_base64?: string;  // Backend uses base64 directly
  duration_ms: number;
  track?: SpotifyTrack;  // Only for music segments
}

export interface RadioTrack {
  // Deprecated - use RadioSegment with type='music' instead
  track: SpotifyTrack;
  narration_before?: string;
  narration_after?: string;
  narration_audio_url?: string;
}

export interface RadioCreateRequest {
  playlist_id: string;
  // access_token removed - now passed via Authorization header in fetch
  voice_description?: string;
  voice?: string;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTrack: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  queue: string[];
}

export interface AppSettings {
  mimo_api_key: string;
  spotify_connected: boolean;
  default_voice_id: string;
  tts_speed: number;
  theme: 'dark' | 'light';
}
