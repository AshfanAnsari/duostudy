import { useEffect, useRef, type ReactNode } from 'react';

interface GlassCardProps {
  kicker: string;
  icon: ReactNode;
  title: string;
  copy: string;
  videoElement: HTMLVideoElement | null;
  className?: string;
  style?: React.CSSProperties;
  isStillness?: boolean;
}

export default function GlassCard({
  kicker,
  icon,
  title,
  copy,
  videoElement,
  className = '',
  style = {},
  isStillness = false,
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Synchronized live video crop blur
  useEffect(() => {
    if (isStillness || !videoElement) return;

    const card = cardRef.current;
    const canvas = canvasRef.current;
    if (!card || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderCrop = () => {
      if (videoElement.readyState >= 2 && !videoElement.seeking) {
        const rect = card.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Size canvas oversized by 24px on all edges for clean blur edges
        const padding = 24;
        const cw = Math.round(rect.width + padding * 2);
        const ch = Math.round(rect.height + padding * 2);

        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw;
          canvas.height = ch;
        }

        // Calculate video cover scale
        const videoW = videoElement.videoWidth || 1920;
        const videoH = videoElement.videoHeight || 1080;
        const scale = Math.max(vw / videoW, vh / videoH) * 1.031;

        const renderedW = videoW * scale;
        const renderedH = videoH * scale;
        const offsetX = (vw - renderedW) / 2;
        const offsetY = (vh - renderedH) / 2;

        // Offset the full-frame draw by the card's viewport coordinate
        const drawX = offsetX - rect.left + padding;
        const drawY = offsetY - rect.top + padding;

        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(videoElement, drawX, drawY, renderedW, renderedH);
      }

      animId = requestAnimationFrame(renderCrop);
    };

    animId = requestAnimationFrame(renderCrop);
    return () => cancelAnimationFrame(animId);
  }, [videoElement, isStillness]);

  return (
    <div
      ref={cardRef}
      className={`relative isolate overflow-hidden rounded-[26px] border border-[#ffffff40] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-[24px] ${className}`}
      style={{
        ...style,
      }}
    >
      {/* Synchronized 2D canvas cropped to live scene with blur */}
      {!isStillness && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[24px] h-[calc(100%+48px)] w-[calc(100%+48px)] object-cover"
          style={{ filter: 'blur(24px)', zIndex: -2 }}
        />
      )}

      {/* Warm mineral glass tint overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(125deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.03) 100%), rgba(33,23,14,0.40)',
        }}
      />

      {/* Card Content */}
      <div className="relative z-10 flex flex-col justify-between">
        <div className="flex items-center justify-between pb-3">
          <span className="font-sans-serra text-[10px] sm:text-[10.5px] font-medium uppercase tracking-[0.2em] text-[#d9a588]">
            {kicker}
          </span>
          <div className="text-[#fffdf8]/70">{icon}</div>
        </div>

        <h3 className="font-sans-serra text-[23px] sm:text-[27px] font-normal leading-tight tracking-[-0.03em] text-[#fffdf8]">
          {title}
        </h3>

        <p className="mt-2 text-[14px] sm:text-[16px] font-normal leading-[1.38] tracking-[-0.01em] text-[#d6c8bc]/90">
          {copy}
        </p>
      </div>
    </div>
  );
}
