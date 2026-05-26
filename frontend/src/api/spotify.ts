import { apiFetch } from './client';
import type { SpotifyPlaylist } from '../types';

export async function getSpotifyAuthUrl(): Promise<{ url: string }> {
  return apiFetch('/spotify/auth');
}

export async function getPlaylists(): Promise<SpotifyPlaylist[]> {
  return apiFetch('/spotify/playlists');
}

export async function getPlaylistTracks(playlistId: string) {
  return apiFetch(`/spotify/playlists/${playlistId}/tracks`);
}
