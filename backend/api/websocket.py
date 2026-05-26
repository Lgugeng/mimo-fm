"""WebSocket connection manager for real-time audio streaming."""

from __future__ import annotations

import asyncio
import json
from typing import Dict, Set

from fastapi import WebSocket, WebSocketDisconnect


class WebSocketManager:
    """Manages WebSocket connections keyed by episode ID."""

    def __init__(self) -> None:
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, episode_id: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._connections.setdefault(episode_id, set()).add(ws)

    async def disconnect(self, episode_id: str, ws: WebSocket) -> None:
        async with self._lock:
            conns = self._connections.get(episode_id)
            if conns:
                conns.discard(ws)
                if not conns:
                    del self._connections[episode_id]

    async def broadcast(self, episode_id: str, data: dict) -> None:
        """Send a JSON message to all clients listening to *episode_id*."""
        async with self._lock:
            conns = list(self._connections.get(episode_id, set()))
        for ws in conns:
            try:
                await ws.send_json(data)
            except Exception:
                await self.disconnect(episode_id, ws)

    async def send_audio_chunk(self, episode_id: str, chunk_b64: str, segment_index: int) -> None:
        """Send a raw audio chunk to listeners."""
        await self.broadcast(
            episode_id,
            {"type": "audio", "segment_index": segment_index, "data": chunk_b64},
        )

    async def send_event(self, episode_id: str, event: str, payload: dict | None = None) -> None:
        """Send a control event (segment_change, finished, …)."""
        await self.broadcast(episode_id, {"type": "event", "event": event, "payload": payload or {}})

    @property
    def active_episodes(self) -> list[str]:
        return list(self._connections.keys())


ws_manager = WebSocketManager()
