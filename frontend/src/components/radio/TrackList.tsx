import { motion } from 'framer-motion';
import { Play, MessageSquare, Clock } from 'lucide-react';
import type { RadioTrack } from '../../types';

interface Props {
  tracks: RadioTrack[];
  currentIndex?: number;
  onPlayTrack?: (index: number) => void;
}

function formatMs(ms: number) {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackList({ tracks, currentIndex = -1, onPlayTrack }: Props) {
  return (
    <div className="space-y-1">
      {tracks.map((rt, i) => (
        <motion.div
          key={rt.track.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`group flex items-center gap-4 p-3 rounded-xl transition-all cursor-pointer ${
            i === currentIndex ? 'bg-primary-500/10 border border-primary-500/20' : 'hover:bg-white/5'
          }`}
          onClick={() => onPlayTrack?.(i)}
        >
          <div className="w-8 text-center">
            <span className="text-sm text-gray-500 group-hover:hidden">{i + 1}</span>
            <Play className="w-4 h-4 text-white hidden group-hover:block mx-auto" />
          </div>
          <img src={rt.track.album_art} alt="" className="w-10 h-10 rounded-lg object-cover" />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium truncate ${i === currentIndex ? 'text-primary-400' : ''}`}>
              {rt.track.name}
            </p>
            <p className="text-xs text-gray-500 truncate">{rt.track.artist}</p>
          </div>
          {rt.narration_before && (
            <MessageSquare className="w-4 h-4 text-radio-400 flex-shrink-0" />
          )}
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatMs(rt.track.duration_ms)}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
