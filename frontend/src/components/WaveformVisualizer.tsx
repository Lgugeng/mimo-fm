import { useRef, useEffect } from 'react';

interface Props {
  isPlaying?: boolean;
  small?: boolean;
  color?: string;
}

export default function WaveformVisualizer({ isPlaying = true, small, color = '#8B5CF6' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const bars = small ? 5 : 32;
    const phases = Array.from({ length: bars }, () => Math.random() * Math.PI * 2);

    const draw = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const barW = small ? 3 : 4;
      const gap = small ? 2 : 3;

      for (let i = 0; i < bars; i++) {
        const amp = isPlaying ? 0.3 + 0.7 * Math.abs(Math.sin(Date.now() / 400 + phases[i])) : 0.1;
        const barH = amp * height * 0.8;
        const x = i * (barW + gap);
        const y = (height - barH) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barH);
        grad.addColorStop(0, color);
        grad.addColorStop(1, '#F59E0B');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, barH, barW / 2);
        ctx.fill();
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [isPlaying, small, color]);

  return (
    <canvas
      ref={canvasRef}
      width={small ? 40 : 200}
      height={small ? 40 : 60}
      className={small ? '' : 'w-full'}
    />
  );
}
