import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link2, Loader2, ListMusic, Radio } from 'lucide-react';
import { getPlaylists, getSpotifyAuthUrl } from '../api/spotify';
import { createRadio } from '../api/radio';
import PlaylistCard from '../components/PlaylistCard';
import VoiceSelector from '../components/VoiceSelector';
import { useNavigate } from 'react-router-dom';

export default function PlaylistPage() {
  const navigate = useNavigate();
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('warm-dj');
  const [isCreating, setIsCreating] = useState(false);
  const spotifyToken = localStorage.getItem('spotify_access_token') || '';

  const { data: playlists, isLoading, error } = useQuery({
    queryKey: ['playlists'],
    queryFn: () => getPlaylists(spotifyToken),
    retry: false,
    enabled: !!spotifyToken,
  });

  const handleConnect = async () => {
    try {
      const { url } = await getSpotifyAuthUrl();
      window.location.href = url;
    } catch (err) {
      console.error('Spotify auth error:', err);
    }
  };

  const handleCreateRadio = async () => {
    if (!selectedPlaylist) return;
    setIsCreating(true);
    try {
      const episode = await createRadio({
        playlist_id: selectedPlaylist,
        access_token: spotifyToken,
        voice_description: `A ${selectedVoice} radio DJ host`,
        voice: selectedVoice,
      });
      navigate(`/radio/${episode.id}`);
    } catch (err) {
      console.error('Create radio error:', err);
    }
    setIsCreating(false);
  };

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex flex-col items-center justify-center h-full">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card text-center max-w-md">
          <ListMusic className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Spotify</h2>
          <p className="text-gray-400 mb-6">Link your Spotify account to browse playlists and create AI radio shows</p>
          <button onClick={handleConnect} className="btn-primary flex items-center gap-2 mx-auto">
            <Link2 className="w-5 h-5" /> Connect Spotify
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Your Playlists</h1>
          <p className="text-gray-400 mt-1">Select a playlist to create an AI radio show</p>
        </div>
        <button onClick={handleConnect} className="glass flex items-center gap-2 px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition-colors">
          <Link2 className="w-4 h-4" /> Reconnect
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-72" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {playlists?.map((pl, i) => (
            <motion.div
              key={pl.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <PlaylistCard
                playlist={pl}
                onClick={() => setSelectedPlaylist(pl.id === selectedPlaylist ? null : pl.id)}
              />
              {selectedPlaylist === pl.id && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 p-2 rounded-lg bg-primary-500/10 border border-primary-500/20">
                  <p className="text-xs text-primary-400 text-center">Selected ✓</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Radio Panel */}
      {selectedPlaylist && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Create AI Radio Show</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-400">DJ Voice</label>
              <VoiceSelector voices={[]} selectedId={selectedVoice} onSelect={(v) => setSelectedVoice(v.id)} />
            </div>
            <button onClick={handleCreateRadio} disabled={isCreating} className="btn-radio w-full flex items-center justify-center gap-2">
              {isCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Radio className="w-5 h-5" />}
              Create Radio Show
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
