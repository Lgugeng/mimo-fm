"""Spotify API routes – OAuth flow and data retrieval."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from models.schemas import PlaylistInfo, SpotifyTrack
from services.spotify import spotify_service

router = APIRouter(prefix="/api/spotify", tags=["spotify"])


@router.get("/auth")
async def spotify_auth() -> dict:
    """Return the Spotify OAuth authorization URL."""
    url = spotify_service.get_auth_url()
    return {"auth_url": url}


@router.get("/callback")
async def spotify_callback(code: str = Query(...)) -> dict:
    """OAuth callback – exchange *code* for tokens."""
    try:
        token_data = spotify_service.get_token(code)
        return {
            "access_token": token_data.get("access_token"),
            "refresh_token": token_data.get("refresh_token"),
            "expires_in": token_data.get("expires_in"),
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/playlists")
async def get_playlists(access_token: str = Query(...)) -> list[dict]:
    """Fetch the user's playlists (requires access_token query param)."""
    try:
        return spotify_service.get_user_playlists(access_token)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.get("/playlist/{playlist_id}/tracks")
async def get_playlist_tracks(playlist_id: str, access_token: str = Query(...)) -> list[dict]:
    """Fetch tracks of a specific playlist."""
    try:
        return spotify_service.get_playlist_tracks(access_token, playlist_id)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
