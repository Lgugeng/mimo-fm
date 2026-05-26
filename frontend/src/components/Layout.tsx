import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import AudioPlayer from './AudioPlayer';
import { useAudio } from '../contexts/AudioContext';

export default function Layout() {
  const { state } = useAudio();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto pb-24">
          <Outlet />
        </main>
      </div>
      {state.currentTrack && <AudioPlayer />}
    </div>
  );
}
