import { useEffect, useRef, useState } from 'react';

interface MineralLoaderProps {
  progress: number; // 0 to 100
  isReady: boolean;
  onRevealComplete: () => void;
  reducedMotion?: boolean;
}

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));

export default function MineralLoader({
  progress,
  isReady,
  onRevealComplete,
  reducedMotion = false,
}: MineralLoaderProps) {
  const [revealing, setRevealing] = useState(false);
  const [fadedLabels, setFadedLabels] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // If reduced motion, complete immediately without animation
  useEffect(() => {
    if (reducedMotion && isReady) {
      onRevealComplete();
    }
  }, [reducedMotion, isReady, onRevealComplete]);

  // Trigger reveal when ready
  useEffect(() => {
    if (isReady && !revealing && !reducedMotion) {
      setRevealing(true);
      setFadedLabels(true);

      const canvas = canvasRef.current;
      if (!canvas) {
        onRevealComplete();
        return;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        onRevealComplete();
        return;
      }

      const w = 300;
      const h = Math.round((w * window.innerHeight) / window.innerWidth) || 169;
      canvas.width = w;
      canvas.height = h;

      const imgData = ctx.createImageData(w, h);
      const data = imgData.data;
      const startTime = performance.now();
      let animId: number;

      const renderReveal = (now: number) => {
        const elapsed = now - startTime;
        const t = clamp(elapsed / 1150);
        const radius = t * 1.25 - 0.08;

        for (let y = 0; y < h; y++) {
          const yTerm1 = y * 0.018;
          const yTerm2 = y * 0.095;
          const yTerm3 = y * 0.16;
          const yRatio = ((y / h - 0.43) * 0.83);

          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;

            const noise =
              Math.sin(x * 0.041 + yTerm1) * 0.035 +
              Math.sin(yTerm2 - x * 0.067) * 0.025 +
              Math.sin(x * 0.27 + yTerm3) * 0.012;

            const xRatio = x / w - 0.51;
            const d = Math.hypot(xRatio, yRatio) + noise;
            const edge = d - radius;
            const alpha = clamp(edge / 0.065);
            const rim = 1 - clamp(Math.abs(edge) / 0.085);

            data[idx] = Math.min(255, Math.max(0, Math.round(169 + rim * 55)));
            data[idx + 1] = Math.min(255, Math.max(0, Math.round(132 + rim * 51)));
            data[idx + 2] = Math.min(255, Math.max(0, Math.round(107 + rim * 44)));
            data[idx + 3] = Math.min(255, Math.max(0, Math.round(alpha * 255)));
          }
        }

        ctx.putImageData(imgData, 0, 0);

        if (elapsed < 1150) {
          animId = requestAnimationFrame(renderReveal);
        } else {
          onRevealComplete();
        }
      };

      animId = requestAnimationFrame(renderReveal);
      return () => cancelAnimationFrame(animId);
    }
  }, [isReady, revealing, reducedMotion, onRevealComplete]);

  if (reducedMotion && isReady) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading sanctuary experience"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed inset-0 z-[200] pointer-events-none select-none overflow-hidden"
    >
      {/* Expanding Irregular Veil Canvas */}
      {revealing && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ imageRendering: 'auto' }}
        />
      )}

      {/* Solid Mineral Backdrop (fades out when reveal canvas starts) */}
      {!revealing && (
        <div className="absolute inset-0 bg-[#a9846b] transition-opacity duration-300" />
      )}

      {/* Loader UI Overlays */}
      <div
        className={`relative z-10 flex h-full w-full flex-col justify-between p-7 sm:p-9 transition-opacity duration-250 ${
          fadedLabels ? 'opacity-0' : 'opacity-100'
        }`}
      >
        {/* Top Row */}
        <div className="flex items-center justify-between text-[#fffdf8]">
          <span className="font-sans-serra text-[16px] font-medium tracking-[0.18em]">
            SERRA
          </span>
          <span className="font-sans-serra text-[10px] font-medium uppercase tracking-[0.2em] opacity-90">
            A Sanctuary Within Stone
          </span>
        </div>

        {/* Bottom Row */}
        <div className="flex items-end justify-between text-[#fffdf8]">
          <div className="flex items-baseline gap-1">
            <span className="font-serif-serra text-[68px] sm:text-[96px] font-normal leading-none tracking-tight">
              {Math.round(progress)}
            </span>
            <span className="font-serif-serra text-[28px] sm:text-[38px] opacity-70">%</span>
          </div>
          <span className="font-sans-serra text-[12px] sm:text-[13px] font-normal tracking-[0.02em] opacity-85 pb-2">
            Good things take a moment.
          </span>
        </div>
      </div>

      {/* 4px Ivory Bottom Progress Line */}
      <div className="absolute bottom-0 left-0 h-[4px] w-full bg-[#100d0a]/20">
        <div
          className="h-full bg-[#fffdf8] transition-all duration-300 ease-out"
          style={{ width: `${clamp(progress / 100) * 100}%` }}
        />
      </div>
    </div>
  );
}
