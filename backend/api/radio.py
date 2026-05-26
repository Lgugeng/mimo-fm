"""Radio API routes – create, fetch, and stream radio episodes."""

from __future__ import annotations

import json
import uuid
from typing import Dict

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect

from api.websocket import ws_manager
from models.schemas import RadioEpisode
from services.radio_engine import radio_engine
from services.spotify import spotify_service

router = APIRouter(prefix="/api/radio", tags=["radio"])

# In-memory episode store (replace with DB in production)
_episodes: Dict[str, RadioEpisode] = {}


@router.post("/create")
async def create_episode(
    playlist_id: str,
    access_token: str,
    voice_description: str = "A warm, friendly radio DJ host",
    voice: str = "Chloe",
) -> RadioEpisode:
    """Create a radio episode from a Spotify playlist."""
    try:
        tracks = spotify_service.get_playlist_tracks(access_token, playlist_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Spotify error: {exc}")

    if not tracks:
        raise HTTPException(status_code=404, detail="Playlist has no tracks")

    # Derive playlist name (first track's album as fallback)
    playlist_name = f"Playlist-{playlist_id[:8]}"

    try:
        episode = await radio_engine.create_radio_episode(
            playlist_name=playlist_name,
            tracks=tracks,
            voice_description=voice_description,
            voice=voice,
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Radio engine error: {exc}")

    _episodes[episode.id] = episode
    return episode


@router.get("/{episode_id}")
async def get_episode(episode_id: str) -> RadioEpisode:
    """Fetch a previously created episode by ID."""
    ep = _episodes.get(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")
    return ep


@router.websocket("/{episode_id}/stream")
async def stream_episode(ws: WebSocket, episode_id: str):
    """WebSocket endpoint that streams audio segments of an episode in real time."""
    ep = _episodes.get(episode_id)
    if not ep:
        await ws.close(code=4004, reason="Episode not found")
        return

    await ws_manager.connect(episode_id, ws)
    try:
        # Stream each segment to the client
        for idx, segment in enumerate(ep.segments):
            await ws_manager.send_event(
                episode_id,
                "segment_start",
                {"index": idx, "type": segment.type, "title": segment.title},
            )
            if segment.audio_base64:
                # Send in chunks for large audio
                chunk_size = 32 * 1024  # 32 KB
                data = segment.audio_base64
                for i in range(0, len(data), chunk_size):
                    await ws.send_json({
                        "type": "audio_chunk",
                        "segment_index": idx,
                        "data": data[i : i + chunk_size],
                        "final": i + chunk_size >= len(data),
                    })
            await ws_manager.send_event(
                episode_id,
                "segment_end",
                {"index": idx},
            )

        await ws_manager.send_event(episode_id, "finished")
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(episode_id, ws)
