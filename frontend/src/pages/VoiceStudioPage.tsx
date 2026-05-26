import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic2, Wand2, Volume2, Loader2, Upload } from 'lucide-react';
import { cloneVoice, designVoice, synthesizeSpeech } from '../api/tts';
import { useAudio } from '../contexts/AudioContext';
import VoiceSelector from '../components/VoiceSelector';

export default function VoiceStudioPage() {
  const { playAudioUrl } = useAudio();
  const [tab, setTab] = useState<'clone' | 'design'>('clone');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>('');

  // Clone state
  const [cloneName, setCloneName] = useState('');
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const [cloneDesc, setCloneDesc] = useState('');

  // Design state
  const [designName, setDesignName] = useState('');
  const [designDesc, setDesignDesc] = useState('');
  const [previewText, setPreviewText] = useState('Welcome to MiMo FM, your personal AI radio station. I\'ll be your DJ today!');

  const handleClone = async () => {
    if (!cloneFile || !cloneName) return;
    setIsLoading(true);
    try {
      const voice = await cloneVoice({ name: cloneName, audio_file: cloneFile, description: cloneDesc });
      setResult(`Voice "${voice.name}" created successfully! ID: ${voice.id}`);
    } catch (err) {
      setResult(`Error: ${err}`);
    }
    setIsLoading(false);
  };

  const handleDesign = async () => {
    if (!designName || !designDesc) return;
    setIsLoading(true);
    try {
      const voice = await designVoice({ name: designName, description: designDesc, preview_text: previewText });
      setResult(`Voice "${voice.name}" designed successfully! ID: ${voice.id}`);
    } catch (err) {
      setResult(`Error: ${err}`);
    }
    setIsLoading(false);
  };

  const handlePreview = async (voiceId: string) => {
    try {
      const { audio_base64 } = await synthesizeSpeech({ text: previewText, voice: voiceId, audio_format: 'wav' });
      const audioUrl = `data:audio/wav;base64,${audio_base64}`;
      playAudioUrl(audioUrl, 'Voice Preview');
    } catch (err) {
      console.error('Preview error:', err);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Voice Studio</h1>
        <p className="text-gray-400">Create custom AI voices by cloning or designing from text descriptions</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-3">
        {([['clone', 'Clone Voice', Mic2], ['design', 'Design Voice', Wand2]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key as 'clone' | 'design')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              tab === key ? 'bg-primary-500 text-white' : 'glass text-gray-400 hover:text-white'
            }`}
          >
            <Icon className="w-5 h-5" /> {label}
          </button>
        ))}
      </div>

      {/* Clone Voice */}
      {tab === 'clone' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Voice Name</label>
            <input value={cloneName} onChange={e => setCloneName(e.target.value)} className="input-field" placeholder="My Custom Voice" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Upload Audio Sample (30s+ recommended)</label>
            <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-primary-500/50 transition-colors">
              <Upload className="w-8 h-8 text-gray-500" />
              <span className="text-sm text-gray-400">{cloneFile ? cloneFile.name : 'Drop audio file or click to browse'}</span>
              <input type="file" accept="audio/*" onChange={e => setCloneFile(e.target.files?.[0] || null)} className="hidden" />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description (optional)</label>
            <textarea value={cloneDesc} onChange={e => setCloneDesc(e.target.value)} className="input-field" rows={3} placeholder="Describe the voice characteristics..." />
          </div>
          <button onClick={handleClone} disabled={isLoading || !cloneFile || !cloneName} className="btn-primary w-full flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic2 className="w-5 h-5" />} Clone Voice
          </button>
        </motion.div>
      )}

      {/* Design Voice */}
      {tab === 'design' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Voice Name</label>
            <input value={designName} onChange={e => setDesignName(e.target.value)} className="input-field" placeholder="Smooth Jazz DJ" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Voice Description</label>
            <textarea
              value={designDesc}
              onChange={e => setDesignDesc(e.target.value)}
              className="input-field"
              rows={4}
              placeholder="A deep, smooth voice with a slight British accent. Warm and inviting, perfect for late-night jazz radio..."
            />
            <p className="text-xs text-gray-500 mt-1">Describe the tone, accent, age, style, and any other characteristics</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Preview Text</label>
            <textarea value={previewText} onChange={e => setPreviewText(e.target.value)} className="input-field" rows={3} />
          </div>
          <button onClick={handleDesign} disabled={isLoading || !designName || !designDesc} className="btn-primary w-full flex items-center justify-center gap-2">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />} Design Voice
          </button>
        </motion.div>
      )}

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border-primary-500/30">
          <p className="text-sm">{result}</p>
        </motion.div>
      )}

      {/* Voice Gallery */}
      <div className="glass-card">
        <h3 className="text-lg font-semibold mb-4">Voice Gallery</h3>
        <VoiceSelector
          voices={[]}
          onSelect={(v) => handlePreview(v.id)}
          onPreview={(v) => handlePreview(v.id)}
        />
      </div>
    </div>
  );
}
