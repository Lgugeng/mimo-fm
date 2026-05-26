import { motion } from 'framer-motion';
import { Radio, MessageCircle, Mic2, ListMusic, Sparkles, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import WaveformVisualizer from '../components/WaveformVisualizer';

const features = [
  { icon: Radio, title: 'AI Radio', desc: 'Your personal AI DJ creates custom radio shows from your playlists', link: '/radio', color: 'from-radio-500 to-orange-600' },
  { icon: MessageCircle, title: 'Voice Chat', desc: 'Talk with MiMo AI using natural voice conversation', link: '/chat', color: 'from-primary-500 to-purple-600' },
  { icon: Mic2, title: 'Voice Studio', desc: 'Clone voices or design custom AI voices from descriptions', link: '/voice-studio', color: 'from-emerald-500 to-teal-600' },
  { icon: ListMusic, title: 'Playlists', desc: 'Connect Spotify and let AI transform your music into radio shows', link: '/playlists', color: 'from-blue-500 to-indigo-600' },
];

export default function HomePage() {
  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-500/20 via-surface-light to-radio-500/20 p-12 border border-white/5"
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <WaveformVisualizer isPlaying />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-radio-400" />
            <span className="text-sm font-medium text-radio-400">Powered by Xiaomi MiMo</span>
          </div>
          <h1 className="text-5xl font-bold mb-4">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-primary-400 to-radio-400 bg-clip-text text-transparent">
              MiMo FM
            </span>
          </h1>
          <p className="text-xl text-gray-400 max-w-xl">
            Your AI private radio station. Personalized music, intelligent DJ narration, and voice-powered conversations.
          </p>
          <div className="flex gap-4 mt-8">
            <Link to="/radio" className="btn-radio flex items-center gap-2">
              <Radio className="w-5 h-5" /> Start Listening
            </Link>
            <Link to="/chat" className="btn-primary flex items-center gap-2">
              <MessageCircle className="w-5 h-5" /> Chat with AI
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={f.link} className="glass-card group block hover:border-white/20 transition-all">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4`}>
                <f.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2 group-hover:text-primary-400 transition-colors">{f.title}</h3>
              <p className="text-sm text-gray-400 mb-4">{f.desc}</p>
              <span className="text-sm text-primary-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                Get started <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {[
          { label: 'AI Voices', value: '50+' },
          { label: 'Radio Styles', value: '∞' },
          { label: 'Powered by', value: 'MiMo' },
        ].map((s) => (
          <div key={s.label} className="glass-card text-center">
            <p className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-radio-400 bg-clip-text text-transparent">{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
