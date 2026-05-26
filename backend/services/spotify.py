"""Spotify Web API service (via spotipy)."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import spotipy
from spotipy.oauth2 import SpotifyOAuth

from config import settings


class SpotifyService:
    """Light wrapper around Spotify OAuth and data endpoints."""

    SCOPE = "playlist-read-private playlist-read-collaborative user-read-email"

    def __init__(self) -> None:
        self._client_id = settings.SPOTIFY_CLIENT_ID
        self._client_secret = settings.SPOTIFY_CLIENT_SECRET
        self._redirect_uri = settings.SPOTIFY_REDIRECT_URI

    def _oauth(self) -> SpotifyOAuth:
        return SpotifyOAuth(
            client_id=self._client_id,
            client_secret=self._client_secret,
            redirect_uri=self._redirect_uri,
            scope=self.SCOPE,
        )

    # ── OAuth ────────────────────────────────────────────────────────────

    def get_auth_url(self) -> str:
        """Return the Spotify authorization URL."""
        return self._oauth().get_authorize_url()

    def get_token(self, code: str) -> Dict[str, Any]:
        """Exchange authorization *code* for an access token."""
        return self._oauth().get_access_token(code, as_dict=True)  # type: ignore[return-value]

    def _client(self, access_token: str) -> spotipy.Spotify:
        return spotipy.Spotify(auth=access_token)

    # ── Playlists ────────────────────────────────────────────────────────

    def get_user_playlists(self, access_token: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Fetch the current user's playlists."""
        sp = self._client(access_token)
        results = sp.current_user_playlists(limit=min(limit, 50))
        playlists: list[dict] = []
        for item in results.get("items", []):
            playlists.append(
                {
                    "id": item["id"],
                    "name": item["name"],
                    "owner": item["owner"].get("display_name", ""),
                    "track_count": item["tracks"]["total"],
                    "image_url": (item.get("images") or [{}])[0].get("url"),
                }
            )
        return playlists

    def get_playlist_tracks(self, access_token: str, playlist_id: str) -> List[Dict[str, Any]]:
        """Fetch all tracks of a playlist."""
        sp = self._client(access_token)
        results = sp.playlist_tracks(playlist_id)
        tracks: list[dict] = []
        for item in results.get("items", []):
            track = item.get("track")
            if not track:
                continue
            tracks.append(
                {
                    "id": track["id"],
                    "name": track["name"],
                    "artists": [a["name"] for a in track.get("artists", [])],
                    "album": track.get("album", {}).get("name", ""),
                    "duration_ms": track.get("duration_ms", 0),
                    "preview_url": track.get("preview_url"),
                    "uri": track.get("uri"),
                }
            )
        return tracks

    def get_audio_features(self, access_token: str, track_ids: List[str]) -> List[Dict[str, Any]]:
        """Fetch audio features for a list of track IDs."""
        sp = self._client(access_token)
        features = sp.audio_features(track_ids)
        return [f for f in features if f is not None]


spotify_service = SpotifyService()
