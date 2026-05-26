import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, Radio as RadioIcon, Loader2 } from 'lucide-react';
import { useRadioStream } from '../hooks/useRadioStream';
import { useAudio } from '../contexts/AudioContext';
import RadioHeader from '../components/radio/RadioHeader';
import TrackList from '../components/radio/TrackList';
import DJAvatar from '../components/radio/DJAvatar';
import WaveformVisualizer from '../components/WaveformVisualizer';
import type { RadioEpisode } from '../types';

// Mock data for demo
const mockEpisode: RadioEpisode = {
  id: 'demo-1',
  title: 'Chill Vibes Hour',
  description: 'A relaxing hour of lo-fi beats and smooth jazz, curated by your AI DJ',
  tracks: [
    { track: { id: '1', name: 'Midnight Rain', artist: 'Lo-Fi Collective', album: 'Dreams', album_art: '', duration_ms: 234000, uri: '' }, narration_before: 'Starting off with a beautiful track to set the mood...' },
    { track: { id: '2', name: 'Sunset Boulevard', artist: 'Jazz Cats', album: 'Evening', album_art: '', duration_ms: 198000, uri: '' }, narration_before: 'Now shifting gears with some smooth jazz...' },
    { track: { id: '3', name: 'Starlight', artist: 'Dream Wave', album: 'Cosmos', album_art: '', duration_ms: 267000, uri: '' } },
    { track: { id: '4', name: 'Ocean Breeze', artist: 'Chill Masters', album: 'Tides', album_art: '', duration_ms: 312000, uri: '' }, narration_before: 'And to close things out, a track that feels like a warm summer evening...' },
  ],
  dj_narration: [],
  duration_ms: 1011000,
  created_at: new Date().toISOString(),
  status: 'ready',
};

export default function RadioPage() {
  const { id } = useParams();
  const { isConnected, status, connect, disconnect } = useRadioStream();
  const { state, play, togglePlay } = useAudio();
  const [currentTrack, setCurrentTrack] = useState(-1);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartRadio = async () => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      setCurrentTrack(0);
      setIsSpeaking(true);
      setTimeout(() => setIsSpeaking(false), 3000);
    }, 2000);
  };

  const handlePlayTrack = (index: number) => {
    setCurrentTrack(index);
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 2000);
  };

  const episode = mockEpisode;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <RadioHeader
        title={episode.title}
        subtitle={episode.description}
        isLive={currentTrack >= 0}
      />

      <div className="grid grid-cols-3 gap-8">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Controls */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Now Playing</h3>
              <div className="flex items-center gap-2">
                {currentTrack >= 0 && (
                  <span className="text-xs text-radio-400 bg-radio-500/10 px-3 py-1 rounded-full">
                    Track {currentTrack + 1} of {episode.tracks.length}
                  </span>
                )}
              </div>
            </div>

            {currentTrack >= 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-radio-500 flex items-center justify-center">
                    <WaveformVisualizer isPlaying={state.isPlaying} small />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{episode.tracks[currentTrack]?.track.name}</p>
                    <p className="text-gray-400">{episode.tracks[currentTrack]?.track.artist}</p>
                  </div>
                </div>

                {episode.tracks[currentTrack]?.narration_before && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-radio-500/10 border border-radio-500/20"
                  >
                    <p className="text-sm text-radio-300 italic">
                      🎙️ "{episode.tracks[currentTrack]?.narration_before}"
                    </p>
                  </motion.div>
                )}

                <div className="flex items-center justify-center gap-6">
                  <button onClick={() => handlePlayTrack(Math.max(0, currentTrack - 1))} className="p-2 text-gray-400 hover:text-white">
                    <SkipBack className="w-6 h-6" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-radio-500 flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-primary-500/20"
                  >
                    {state.isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
                  </button>
                  <button onClick={() => handlePlayTrack(Math.min(episode.tracks.length - 1, currentTrack + 1))} className="p-2 text-gray-400 hover:text-white">
                    <SkipForward className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <button onClick={handleStartRadio} disabled={isLoading} className="btn-radio text-lg px-10 py-4">
                  {isLoading ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Creating your show...</span>
                  ) : (
                    <span className="flex items-center gap-2"><RadioIcon className="w-5 h-5" /> Start Radio Show</span>
                  )}
                </button>
                <p className="text-sm text-gray-500 mt-4">Your AI DJ will create a personalized radio experience</p>
              </div>
            )}
          </div>

          {/* Track List */}
          <div className="glass-card">
            <h3 className="text-lg font-semibold mb-4">Playlist</h3>
            <TrackList tracks={episode.tracks} currentIndex={currentTrack} onPlayTrack={handlePlayTrack} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass-card flex justify-center">
            <DJAvatar isSpeaking={isSpeaking} />
          </div>

          <div className="glass-card">
            <h4 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">Show Info</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Tracks</span>
                <span>{episode.tracks.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span>{Math.round(episode.duration_ms / 60000)} min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={currentTrack >= 0 ? 'text-radio-400' : 'text-gray-500'}>
                  {currentTrack >= 0 ? 'Playing' : 'Ready'}
                </span>
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h4 className="text-sm font-semibold mb-3 text-gray-400 uppercase tracking-wider">DJ Style</h4>
            <div className="flex flex-wrap gap-2">
              {['Chill', 'Conversational', 'Warm', 'Informative'].map(tag => (
                <span key={tag} className="text-xs bg-primary-500/10 text-primary-400 px-3 py-1 rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
