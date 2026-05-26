import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import RadioPage from './pages/RadioPage';
import VoiceStudioPage from './pages/VoiceStudioPage';
import PlaylistPage from './pages/PlaylistPage';
import SettingsPage from './pages/SettingsPage';
import CallbackPage from './pages/CallbackPage';

export default function App() {
  return (
    <AnimatePresence mode="wait">
      <Routes>
        <Route path="/callback" element={<CallbackPage />} />
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/radio" element={<RadioPage />} />
          <Route path="/radio/:id" element={<RadioPage />} />
          <Route path="/voice-studio" element={<VoiceStudioPage />} />
          <Route path="/playlists" element={<PlaylistPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
