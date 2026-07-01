"""Radio API routes – create, fetch, and stream radio episodes."""

from __future__ import annotations

import json
from typing import Dict, Optional

import httpx
from fastapi import APIRouter, Header, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from api.websocket import ws_manager
from config import settings
from models.db_models import User  # Import encrypted model functions
from models.schemas import RadioCreateBody, RadioEpisode
from services.radio_engine import radio_engine
from services.spotify import spotify_service

router = APIRouter(prefix="/api/radio", tags=["radio"])

# In-memory episode store (replace with DB in production)
_episodes: Dict[str, RadioEpisode] = {}


async def verify_user_token(token: str) -> Optional[User]:
    """Verify Spotify access token and return user if valid."""
    # TODO: Implement actual token validation against Spotify
    # For now, just do a basic check
    if not token or len(token) < 10:
        raise HTTPException(status_code=401, detail="Invalid or missing token")
    # In production: decode JWT or validate with Spotify introspection endpoint
    return None


@router.post("/create", response_model=RadioEpisode)
async def create_episode(
    body: RadioCreateBody,
    authorization: str = Header(...),  # Bearer token from header
):
    """Create a radio episode from a Spotify playlist."""
    # Extract token from Authorization header
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization format")
    
    access_token = authorization.replace("Bearer ", "", 1)
    
    try:
        tracks = spotify_service.get_playlist_tracks(access_token, body.playlist_id)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            raise HTTPException(status_code=401, detail="Invalid Spotify token")
        elif e.response.status_code == 403:
            raise HTTPException(status_code=403, detail="Playlist not accessible")
        else:
            raise HTTPException(status_code=502, detail=f"Spotify error: {e}")
    except Exception as exc:
        # Don't leak internal errors to client
        import logging
        logging.error(f"Unexpected Spotify error: {exc}")
        raise HTTPException(status_code=500, detail="Failed to fetch playlist")

    if not tracks:
        raise HTTPException(status_code=404, detail="Playlist has no tracks")

    # Derive playlist name (first track's album as fallback)
    playlist_name = f"Playlist-{body.playlist_id[:8]}"

    try:
        episode = await radio_engine.create_radio_episode(
            playlist_name=playlist_name,
            tracks=tracks,
            voice_description=body.voice_description,
            voice=body.voice,
        )
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid request: {e}")
    except Exception as exc:
        import logging
        logging.error(f"Unexpected error creating episode: {exc}")
        # Don't return 502 for all errors - use 500 with generic message
        raise HTTPException(status_code=500, detail="Failed to create episode")

    _episodes[episode.id] = episode
    return episode


@router.get("/{episode_id}")
async def get_episode(episode_id: str):
    """Fetch a previously created episode by ID."""
    ep = _episodes.get(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")
    return ep


@router.websocket("/{episode_id}/stream")
async def stream_episode(ws: WebSocket, episode_id: str, token: str = Query(...)):
    """WebSocket endpoint that streams audio segments of an episode in real time."""
    # 1. Verify token first
    if not token or len(token) < 10:
        await ws.close(code=4003, reason="Invalid token")
        return
    
    # 2. Check episode exists
    ep = _episodes.get(episode_id)
    if not ep:
        await ws.close(code=4004, reason="Episode not found")
        return
    
    # TODO: Add user ownership check when episodes are associated with users
    # user = await verify_user_token(token)
    # if not user or episode.user_id != user.id:
    #     await ws.close(code=4003, reason="Unauthorized")
    #     return

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
