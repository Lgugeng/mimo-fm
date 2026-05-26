import { useAudio } from '../contexts/AudioContext';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import WaveformVisualizer from './WaveformVisualizer';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function AudioPlayer() {
  const { state, togglePlay, seek, setVolume, next, prev } = useAudio();
  const progress = state.duration ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-24 bg-surface border-t border-white/5 flex items-center px-6 gap-6 z-50 backdrop-blur-xl">
      {/* Track info */}
      <div className="flex items-center gap-4 w-72">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-radio-500 flex items-center justify-center overflow-hidden">
          {state.currentTrack?.coverUrl ? (
            <img src={state.currentTrack.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <WaveformVisualizer small />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{state.currentTrack?.title}</p>
          <p className="text-xs text-gray-500 truncate">{state.currentTrack?.artist || 'MiMo FM'}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <button onClick={prev} className="p-1 text-gray-400 hover:text-white transition-colors">
            <SkipBack className="w-5 h-5" />
          </button>
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black hover:scale-105 transition-transform"
          >
            {state.isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
          <button onClick={next} className="p-1 text-gray-400 hover:text-white transition-colors">
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3 w-full max-w-xl">
          <span className="text-xs text-gray-500 w-10 text-right">{formatTime(state.currentTime)}</span>
          <div
            className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer group relative"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              seek(((e.clientX - rect.left) / rect.width) * state.duration);
            }}
          >
            <div className="h-full bg-gradient-to-r from-primary-500 to-radio-500 rounded-full relative" style={{ width: `${progress}%` }}>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
          <span className="text-xs text-gray-500 w-10">{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-2 w-36">
        <button onClick={() => setVolume(state.volume ? 0 : 0.8)} className="text-gray-400 hover:text-white">
          {state.volume ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={state.volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="flex-1 accent-primary-500"
        />
      </div>
    </div>
  );
}
