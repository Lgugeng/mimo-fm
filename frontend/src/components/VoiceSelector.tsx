import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Volume2 } from 'lucide-react';
import type { Voice } from '../types';

interface Props {
  voices: Voice[];
  selectedId?: string;
  onSelect: (voice: Voice) => void;
  onPreview?: (voice: Voice) => void;
}

const presetVoices: Voice[] = [
  { id: 'warm-dj', name: 'Warm DJ', description: 'Friendly, warm radio host voice', category: 'preset', tags: ['warm', 'friendly'] },
  { id: 'smooth-jazz', name: 'Smooth Jazz', description: 'Deep, smooth jazz announcer', category: 'preset', tags: ['smooth', 'deep'] },
  { id: 'energetic', name: 'Energetic', description: 'Upbeat, energetic presenter', category: 'preset', tags: ['energetic', 'upbeat'] },
  { id: 'calm-narrator', name: 'Calm Narrator', description: 'Soothing, calm narration voice', category: 'preset', tags: ['calm', 'soothing'] },
];

export default function VoiceSelector({ voices = [], selectedId, onSelect, onPreview }: Props) {
  const [tab, setTab] = useState<'preset' | 'custom'>('preset');
  const allVoices = tab === 'preset' ? presetVoices : voices.filter(v => v.category !== 'preset');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['preset', 'custom'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-primary-500 text-white' : 'bg-surface-light text-gray-400 hover:text-white'
            }`}
          >
            {t === 'preset' ? 'Preset Voices' : 'Custom Voices'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {allVoices.map(voice => (
          <motion.button
            key={voice.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(voice)}
            className={`p-4 rounded-xl text-left transition-all border ${
              selectedId === voice.id
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-white/5 bg-surface-light hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{voice.name}</span>
              {selectedId === voice.id && <Check className="w-4 h-4 text-primary-400" />}
            </div>
            <p className="text-xs text-gray-500 mb-2">{voice.description}</p>
            <div className="flex items-center gap-2">
              {voice.tags.map(tag => (
                <span key={tag} className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-gray-400">{tag}</span>
              ))}
              {onPreview && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPreview(voice); }}
                  className="ml-auto p-1 rounded hover:bg-white/10"
                >
                  <Volume2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
