import { motion } from 'framer-motion';
import { Play, Music } from 'lucide-react';
import type { SpotifyPlaylist } from '../types';

interface Props {
  playlist: SpotifyPlaylist;
  onClick?: () => void;
}

export default function PlaylistCard({ playlist, onClick }: Props) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="glass-card cursor-pointer group hover:border-primary-500/30 transition-all duration-300"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden mb-4 bg-surface-lighter">
        {playlist.image_url ? (
          <img src={playlist.image_url} alt={playlist.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-12 h-12 text-gray-600" />
          </div>
        )}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-primary-500/30"
        >
          <Play className="w-5 h-5 text-white ml-0.5" />
        </motion.button>
      </div>
      <h3 className="font-semibold text-sm truncate">{playlist.name}</h3>
      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{playlist.description || `By ${playlist.owner}`}</p>
      <p className="text-xs text-gray-600 mt-2">{playlist.track_count} tracks</p>
    </motion.div>
  );
}
