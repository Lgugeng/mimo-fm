"""MiMo LLM service – chat, streaming, and playlist analysis."""

from __future__ import annotations

import json
from typing import AsyncGenerator, List, Optional

from openai import AsyncOpenAI

from config import settings
from models.schemas import ChatMessage, PlaylistAnalysis


class MiMoLLMService:
    """Wrapper around the MiMo chat-completions API (OpenAI-compatible)."""

    def __init__(self) -> None:
        self.client = AsyncOpenAI(
            api_key=settings.MIMO_API_KEY,
            base_url=settings.MIMO_BASE_URL,
        )

    # ── helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _to_dicts(messages: List[ChatMessage]) -> list[dict]:
        return [{"role": m.role, "content": m.content} for m in messages]

    # ── public API ───────────────────────────────────────────────────────

    async def chat(
        self,
        messages: List[ChatMessage],
        model: str = "mimo-v2.5-pro",
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> dict:
        """Single-shot chat completion (non-streaming).

        Returns ``{"content": str, "model": str, "usage": dict}``.
        """
        resp = await self.client.chat.completions.create(
            model=model,
            messages=self._to_dicts(messages),
            temperature=temperature,
            max_tokens=max_tokens,
            stream=False,
        )
        choice = resp.choices[0]
        return {
            "content": choice.message.content or "",
            "model": resp.model,
            "usage": resp.usage.model_dump() if resp.usage else None,
        }

    async def chat_stream(
        self,
        messages: List[ChatMessage],
        model: str = "mimo-v2.5-pro",
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """Streaming chat – yields token strings."""
        stream = await self.client.chat.completions.create(
            model=model,
            messages=self._to_dicts(messages),
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    async def analyze_playlist(
        self,
        playlist_name: str,
        tracks: list[dict],
    ) -> PlaylistAnalysis:
        """Analyze a playlist and return a DJ narration script.

        *tracks* is a list of dicts with at least ``name`` and ``artists`` keys.
        """
        track_list = "\n".join(
            f"  {i+1}. {t['name']} — {', '.join(t.get('artists', []))}"
            for i, t in enumerate(tracks)
        )

        system_prompt = (
            "You are a creative radio DJ script writer. Given a playlist, produce:\n"
            "1. A short mood description\n"
            "2. Key themes\n"
            "3. A DJ narration script that introduces the playlist, adds transitions "
            "between songs, and wraps up. Keep it conversational and engaging.\n"
            "4. Transition notes between each track pair\n\n"
            "Respond in *strict JSON* with keys: mood, themes, dj_script, "
            "transition_notes (list)."
        )

        messages = [
            ChatMessage(role="system", content=system_prompt),
            ChatMessage(
                role="user",
                content=f"Playlist: {playlist_name}\nTracks:\n{track_list}",
            ),
        ]

        result = await self.chat(messages, model="mimo-v2.5-pro", temperature=0.8)
        try:
            data = json.loads(result["content"])
        except json.JSONDecodeError:
            data = {
                "mood": "eclectic",
                "themes": ["music discovery"],
                "dj_script": result["content"],
                "transition_notes": [],
            }

        return PlaylistAnalysis(
            playlist_name=playlist_name,
            mood=data.get("mood", ""),
            themes=data.get("themes", []),
            dj_script=data.get("dj_script", ""),
            transition_notes=data.get("transition_notes", []),
        )


llm_service = MiMoLLMService()
