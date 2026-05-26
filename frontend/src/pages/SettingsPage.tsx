import { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Volume2, Palette, Save, Check } from 'lucide-react';

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('mimo_api_key') || '');
  const [defaultVoice, setDefaultVoice] = useState(localStorage.getItem('default_voice') || 'warm-dj');
  const [ttsSpeed, setTtsSpeed] = useState(parseFloat(localStorage.getItem('tts_speed') || '1.0'));
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('mimo_api_key', apiKey);
    localStorage.setItem('default_voice', defaultVoice);
    localStorage.setItem('tts_speed', ttsSpeed.toString());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-400">Configure your MiMo FM experience</p>
      </motion.div>

      {/* API Key */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card space-y-4">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-primary-400" />
          <h3 className="text-lg font-semibold">API Configuration</h3>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">MiMo API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="input-field"
            placeholder="sk-..."
          />
          <p className="text-xs text-gray-500 mt-1">Your API key is stored locally and never sent to our servers</p>
        </div>
      </motion.div>

      {/* Voice Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card space-y-4">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-radio-400" />
          <h3 className="text-lg font-semibold">Voice Settings</h3>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">Default Voice</label>
          <select value={defaultVoice} onChange={e => setDefaultVoice(e.target.value)} className="input-field">
            <option value="warm-dj">Warm DJ</option>
            <option value="smooth-jazz">Smooth Jazz</option>
            <option value="energetic">Energetic</option>
            <option value="calm-narrator">Calm Narrator</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-400">TTS Speed: {ttsSpeed.toFixed(1)}x</label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.1}
            value={ttsSpeed}
            onChange={e => setTtsSpeed(parseFloat(e.target.value))}
            className="w-full accent-primary-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
        </div>
      </motion.div>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card space-y-4">
        <div className="flex items-center gap-3">
          <Palette className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold">Appearance</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Dark Theme</p>
            <p className="text-xs text-gray-500">Always enabled for the best radio experience</p>
          </div>
          <div className="w-12 h-6 rounded-full bg-primary-500 flex items-center px-1">
            <div className="w-5 h-5 rounded-full bg-white ml-auto" />
          </div>
        </div>
      </motion.div>

      {/* Save */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={handleSave}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {saved ? <><Check className="w-5 h-5" /> Saved!</> : <><Save className="w-5 h-5" /> Save Settings</>}
      </motion.button>
    </div>
  );
}
