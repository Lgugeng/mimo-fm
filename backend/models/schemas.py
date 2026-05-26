"""Pydantic request / response schemas."""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


# ── Chat ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str = Field(..., description="system | user | assistant")
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: str = "mimo-v2.5-pro"
    temperature: float = 0.7
    max_tokens: int = 2048


class ChatResponse(BaseModel):
    content: str
    model: str
    usage: Optional[dict] = None


# ── TTS ─────────────────────────────────────────────────────────────────────

class TTSRequest(BaseModel):
    text: str
    voice_description: str = "A warm, friendly radio DJ"
    voice: str = "Chloe"
    audio_format: str = Field("wav", pattern="^(pcm16|wav)$")


class TTSResponse(BaseModel):
    audio_base64: str
    format: str
    duration_ms: Optional[int] = None


class VoiceCloneRequest(BaseModel):
    name: str
    reference_audio_base64: str
    description: Optional[str] = None


class VoiceDesignRequest(BaseModel):
    name: str
    description: str  # natural-language voice description


# ── Spotify ─────────────────────────────────────────────────────────────────

class SpotifyTrack(BaseModel):
    id: str
    name: str
    artists: List[str]
    album: str
    duration_ms: int
    preview_url: Optional[str] = None
    uri: Optional[str] = None


class PlaylistInfo(BaseModel):
    id: str
    name: str
    owner: str
    track_count: int
    image_url: Optional[str] = None


# ── Radio ───────────────────────────────────────────────────────────────────

class RadioCreateBody(BaseModel):
    """Request body for creating a radio episode."""
    playlist_id: str
    access_token: str
    voice_description: str = "A warm, friendly radio DJ host"
    voice: str = "Chloe"


class RadioSegment(BaseModel):
    type: str = Field(..., pattern="^(music|narration)$")
    title: str = ""
    script: Optional[str] = None
    audio_url: Optional[str] = None
    audio_base64: Optional[str] = None
    duration_ms: int = 0
    track: Optional[SpotifyTrack] = None


class RadioEpisode(BaseModel):
    id: str
    title: str
    playlist_name: str
    segments: List[RadioSegment]
    total_duration_ms: int = 0
    status: str = "ready"


class PlaylistAnalysis(BaseModel):
    playlist_name: str
    mood: str
    themes: List[str]
    dj_script: str
    transition_notes: List[str] = []
