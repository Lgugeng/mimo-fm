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
  description: string;
  tracks: RadioTrack[];
  dj_narration: NarrationSegment[];
  duration_ms: number;
  created_at: string;
  status: 'creating' | 'ready' | 'playing';
}

export interface RadioTrack {
  track: SpotifyTrack;
  narration_before?: string;
  narration_after?: string;
  narration_audio_url?: string;
}

export interface NarrationSegment {
  id: string;
  text: string;
  audio_url?: string;
  position: 'intro' | 'before_track' | 'after_track' | 'outro';
  track_id?: string;
  timestamp_ms: number;
}

export interface RadioCreateRequest {
  playlist_id: string;
  dj_voice_id: string;
  style?: string;
  greeting?: string;
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
