"""Core radio engine – orchestrates playlist analysis, narration, and TTS."""

from __future__ import annotations

import base64
import json
import uuid
from typing import List, Optional

from models.schemas import (
    PlaylistAnalysis,
    RadioEpisode,
    RadioSegment,
    SpotifyTrack,
)
from services.mimo_llm import llm_service
from services.mimo_tts import tts_service


class RadioEngine:
    """Orchestrates LLM analysis + TTS to produce a full radio episode."""

    async def create_radio_episode(
        self,
        playlist_name: str,
        tracks: List[dict],
        voice_description: str = "A warm, friendly radio DJ host",
        voice: str = "Chloe",
    ) -> RadioEpisode:
        """Generate a complete radio episode from a playlist.

        Steps:
        1. Analyse the playlist with MiMo LLM to get DJ script.
        2. Break the script into intro / transition / outro narration segments.
        3. Synthesise each narration segment with MiMo TTS.
        4. Interleave narration and music segments.
        """
        episode_id = uuid.uuid4().hex

        # 1 – Analyse playlist
        analysis: PlaylistAnalysis = await llm_service.analyze_playlist(
            playlist_name=playlist_name,
            tracks=tracks,
        )

        segments: List[RadioSegment] = []

        # 2 – Build narration segments from the DJ script and transitions
        intro_text = self._build_intro(analysis, tracks)
        outro_text = self._build_outro(analysis)
        transition_texts = analysis.transition_notes or []

        # 2a – Intro narration
        intro_audio = await tts_service.synthesize(
            intro_text, voice_description, voice, audio_format="wav",
        )
        segments.append(
            RadioSegment(
                type="narration",
                title="DJ Intro",
                script=intro_text,
                audio_base64=base64.b64encode(intro_audio).decode(),
                duration_ms=self._estimate_wav_duration_ms(intro_audio),
            )
        )

        # 2b – Interleave music + transitions
        for i, track in enumerate(tracks):
            seg_track = SpotifyTrack(
                id=track.get("id", ""),
                name=track.get("name", ""),
                artists=track.get("artists", []),
                album=track.get("album", ""),
                duration_ms=track.get("duration_ms", 0),
                preview_url=track.get("preview_url"),
                uri=track.get("uri"),
            )
            segments.append(
                RadioSegment(
                    type="music",
                    title=seg_track.name,
                    duration_ms=seg_track.duration_ms,
                    track=seg_track,
                )
            )

            # Transition after track (except last)
            if i < len(tracks) - 1 and i < len(transition_texts):
                tr_audio = await tts_service.synthesize(
                    transition_texts[i], voice_description, voice, audio_format="wav",
                )
                segments.append(
                    RadioSegment(
                        type="narration",
                        title=f"Transition {i+1}",
                        script=transition_texts[i],
                        audio_base64=base64.b64encode(tr_audio).decode(),
                        duration_ms=self._estimate_wav_duration_ms(tr_audio),
                    )
                )

        # 2c – Outro narration
        outro_audio = await tts_service.synthesize(
            outro_text, voice_description, voice, audio_format="wav",
        )
        segments.append(
            RadioSegment(
                type="narration",
                title="DJ Outro",
                script=outro_text,
                audio_base64=base64.b64encode(outro_audio).decode(),
                duration_ms=self._estimate_wav_duration_ms(outro_audio),
            )
        )

        total_duration = sum(s.duration_ms for s in segments)

        return RadioEpisode(
            id=episode_id,
            title=f"MiMo FM – {playlist_name}",
            playlist_name=playlist_name,
            segments=segments,
            total_duration_ms=total_duration,
            status="ready",
        )

    # ── private helpers ──────────────────────────────────────────────────

    @staticmethod
    def _build_intro(analysis: PlaylistAnalysis, tracks: list) -> str:
        first = tracks[0] if tracks else {"name": "this track", "artists": []}
        return (
            f"Welcome to MiMo FM! You're tuned in to {analysis.playlist_name}. "
            f"Expect {analysis.mood} vibes with themes like {', '.join(analysis.themes[:3])}. "
            f"We're kicking off with {first.get('name', '')} by {', '.join(first.get('artists', []))}. "
            "Let's get into it!"
        )

    @staticmethod
    def _build_outro(analysis: PlaylistAnalysis) -> str:
        return (
            "That's a wrap for this episode of MiMo FM! "
            "Thanks for listening. Stay tuned for more great music. "
            "This is your DJ signing off – catch you next time!"
        )

    @staticmethod
    def _estimate_wav_duration_ms(wav_bytes: bytes) -> int:
        """Rough estimate: WAV PCM16 @ 24 kHz mono."""
        try:
            data_size = len(wav_bytes) - 44  # skip header
            if data_size <= 0:
                return 0
            samples = data_size // 2  # 16-bit = 2 bytes per sample
            return int(samples / 24000 * 1000)
        except Exception:
            return 0


radio_engine = RadioEngine()
