import { useLocation } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';

const titles: Record<string, string> = {
  '/': 'Home',
  '/chat': 'AI Chat',
  '/radio': 'Radio',
  '/voice-studio': 'Voice Studio',
  '/playlists': 'Playlists',
  '/settings': 'Settings',
};

export default function Navbar() {
  const location = useLocation();
  const title = titles[location.pathname] || 'MiMo FM';

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-surface/80 backdrop-blur-xl z-10">
      <h1 className="text-xl font-semibold">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-surface-light border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary-500 w-64"
          />
        </div>
        <button className="p-2 rounded-lg hover:bg-surface-light transition-colors">
          <Bell className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </header>
  );
}
