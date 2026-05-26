import React, { createContext, useContext, useReducer, useCallback, useRef } from 'react';
import { Howl } from 'howler';

interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  url: string;
  coverUrl?: string;
}

interface State {
  currentTrack: AudioTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: AudioTrack[];
}

type Action =
  | { type: 'SET_TRACK'; track: AudioTrack }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_PLAYING'; playing: boolean }
  | { type: 'SET_TIME'; time: number }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_QUEUE'; queue: AudioTrack[] }
  | { type: 'NEXT' }
  | { type: 'PREV' };

const initialState: State = {
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  queue: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_TRACK': return { ...state, currentTrack: action.track, isPlaying: true, currentTime: 0 };
    case 'TOGGLE_PLAY': return { ...state, isPlaying: !state.isPlaying };
    case 'SET_PLAYING': return { ...state, isPlaying: action.playing };
    case 'SET_TIME': return { ...state, currentTime: action.time };
    case 'SET_DURATION': return { ...state, duration: action.duration };
    case 'SET_VOLUME': return { ...state, volume: action.volume };
    case 'SET_QUEUE': return { ...state, queue: action.queue };
    case 'NEXT': {
      if (!state.queue.length || !state.currentTrack) return state;
      const idx = state.queue.findIndex(t => t.id === state.currentTrack!.id);
      const next = state.queue[(idx + 1) % state.queue.length];
      return { ...state, currentTrack: next, isPlaying: true, currentTime: 0 };
    }
    case 'PREV': {
      if (!state.queue.length || !state.currentTrack) return state;
      const idx = state.queue.findIndex(t => t.id === state.currentTrack!.id);
      const prev = state.queue[(idx - 1 + state.queue.length) % state.queue.length];
      return { ...state, currentTrack: prev, isPlaying: true, currentTime: 0 };
    }
    default: return state;
  }
}

interface AudioContextType {
  state: State;
  play: (track: AudioTrack) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  next: () => void;
  prev: () => void;
  setQueue: (tracks: AudioTrack[]) => void;
  playAudioUrl: (url: string, title?: string) => void;
}

const AudioCtx = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const howlRef = useRef<Howl | null>(null);
  const intervalRef = useRef<number>();

  const cleanup = useCallback(() => {
    if (howlRef.current) { howlRef.current.stop(); howlRef.current.unload(); }
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const startTimeUpdate = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      if (howlRef.current && howlRef.current.playing()) {
        dispatch({ type: 'SET_TIME', time: howlRef.current.seek() as number });
      }
    }, 250);
  }, []);

  const play = useCallback((track: AudioTrack) => {
    cleanup();
    dispatch({ type: 'SET_TRACK', track });
    const howl = new Howl({
      src: [track.url],
      html5: true,
      volume: 0.8, // default, volume set via setVolume
      onload: () => dispatch({ type: 'SET_DURATION', duration: howl.duration() }),
      onend: () => dispatch({ type: 'NEXT' }),
      onplay: () => startTimeUpdate(),
    });
    howlRef.current = howl;
    howl.play();
  }, [cleanup, startTimeUpdate]);

  const togglePlay = useCallback(() => {
    if (!howlRef.current) return;
    if (state.isPlaying) { howlRef.current.pause(); dispatch({ type: 'SET_PLAYING', playing: false }); }
    else { howlRef.current.play(); dispatch({ type: 'SET_PLAYING', playing: true }); startTimeUpdate(); }
  }, [state.isPlaying, startTimeUpdate]);

  const seek = useCallback((time: number) => {
    if (howlRef.current) { howlRef.current.seek(time); dispatch({ type: 'SET_TIME', time }); }
  }, []);

  const setVolume = useCallback((vol: number) => {
    if (howlRef.current) howlRef.current.volume(vol);
    dispatch({ type: 'SET_VOLUME', volume: vol });
  }, []);

  const next = useCallback(() => dispatch({ type: 'NEXT' }), []);
  const prev = useCallback(() => dispatch({ type: 'PREV' }), []);
  const setQueue = useCallback((tracks: AudioTrack[]) => dispatch({ type: 'SET_QUEUE', queue: tracks }), []);

  const playAudioUrl = useCallback((url: string, title = 'Audio') => {
    play({ id: url, title, url });
  }, [play]);

  return (
    <AudioCtx.Provider value={{ state, play, togglePlay, seek, setVolume, next, prev, setQueue, playAudioUrl }}>
      {children}
    </AudioCtx.Provider>
  );
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error('useAudio must be used within AudioProvider');
  return ctx;
}
