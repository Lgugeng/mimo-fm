import { NavLink } from 'react-router-dom';
import { Home, MessageCircle, Radio, Mic2, ListMusic, Settings, Zap } from 'lucide-react';

const links = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/chat', icon: MessageCircle, label: 'AI Chat' },
  { to: '/radio', icon: Radio, label: 'Radio' },
  { to: '/voice-studio', icon: Mic2, label: 'Voice Studio' },
  { to: '/playlists', icon: ListMusic, label: 'Playlists' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 bg-surface border-r border-white/5 flex flex-col">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-radio-500 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-primary-400 to-radio-400 bg-clip-text text-transparent">
          MiMo FM
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-500/15 text-primary-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 mx-3 mb-4 rounded-xl bg-gradient-to-br from-primary-500/20 to-radio-500/20 border border-white/5">
        <p className="text-xs text-gray-400">Powered by</p>
        <p className="text-sm font-semibold bg-gradient-to-r from-primary-400 to-radio-400 bg-clip-text text-transparent">
          Xiaomi MiMo
        </p>
      </div>
    </aside>
  );
}
