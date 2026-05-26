import { Radio, Wifi } from 'lucide-react';
import WaveformVisualizer from '../WaveformVisualizer';

interface Props {
  title: string;
  subtitle?: string;
  isLive?: boolean;
}

export default function RadioHeader({ title, subtitle, isLive }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-500/20 via-surface-light to-radio-500/20 p-8 border border-white/5">
      <div className="absolute inset-0 opacity-20">
        <WaveformVisualizer isPlaying={isLive} color="#F59E0B" />
      </div>
      <div className="relative flex items-center gap-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-radio-500 to-primary-500 flex items-center justify-center shadow-lg shadow-radio-500/20">
          <Radio className="w-12 h-12 text-white" />
        </div>
        <div>
          {isLive && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-radio-400 mb-2">
              <Wifi className="w-3 h-3" /> LIVE
            </span>
          )}
          <h2 className="text-3xl font-bold">{title}</h2>
          {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
