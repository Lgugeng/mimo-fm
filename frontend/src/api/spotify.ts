import { apiFetch } from './client';
import type { SpotifyPlaylist } from '../types';

export async function getSpotifyAuthUrl(): Promise<{ url: string }> {
  return apiFetch('/spotify/auth');
}

export async function getPlaylists(accessToken: string): Promise<SpotifyPlaylist[]> {
  return apiFetch(`/spotify/playlists?access_token=${encodeURIComponent(accessToken)}`);
}

export async function getPlaylistTracks(playlistId: string, accessToken: string) {
  return apiFetch(`/spotify/playlist/${playlistId}/tracks?access_token=${encodeURIComponent(accessToken)}`);
}
