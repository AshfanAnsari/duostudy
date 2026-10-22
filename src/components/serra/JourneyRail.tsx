import { ArrowDown } from 'lucide-react';
import type { Chapter } from '../../types/serra';

interface JourneyRailProps {
  progress: number;
  chapters: Chapter[];
  activeChapterIndex: number;
  onNavigateChapter: (destinationP: number, id: string) => void;
  onScrollCueClick: () => void;
  hidden?: boolean;
}

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const smooth = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};

export default function JourneyRail({
  progress,
  chapters,
  activeChapterIndex,
  onNavigateChapter,
  onScrollCueClick,
  hidden = false,
}: JourneyRailProps) {
  if (hidden) return null;

  // Fading envelopes from Section 9
  const captionOpacity = 1 - smooth(0.12, 0.24, progress);
  const scrollCueOpacity = 1 - smooth(0.04, 0.12, progress);
  const railOpacity = 1 - smooth(0.7, 0.76, progress);
  const isRailDisabled = progress > 0.76;

  return (
    <>
      {/* 1. Small Top Caption */}
      <div
        className="pointer-events-none fixed left-[18px] sm:left-[28px] top-[94px] sm:top-[123px] z-40 flex items-center gap-2 font-sans-serra text-[8px] sm:text-[10px] font-medium uppercase tracking-[0.18em] text-[#fffdf8]/75 transition-opacity duration-300"
        style={{ opacity: captionOpacity }}
      >
        <span>✦</span>
        <span>A SANCTUARY WITHIN STONE</span>
      </div>

      {/* 2. Scroll to Discover Button (centered horizontally, 61% vh desktop) */}
      <div
        className="fixed left-1/2 -translate-x-1/2 top-[32%] sm:top-[39%] lg:top-[61%] z-40 flex flex-col items-center gap-2 transition-opacity duration-300 pointer-events-auto"
        style={{
          opacity: scrollCueOpacity,
          pointerEvents: scrollCueOpacity < 0.05 ? 'none' : 'auto',
        }}
      >
        <button
          type="button"
          onClick={onScrollCueClick}
          aria-label="Scroll to discover sanctuary"
          className="group flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none p-0 outline-none"
        >
          <span className="font-sans-serra text-[9px] font-medium uppercase tracking-[0.2em] text-[#fffdf8]/60 transition-colors group-hover:text-[#fffdf8]">
            Scroll to discover
          </span>
          <div className="flex h-[38px] w-[26px] items-center justify-center rounded-full border border-[#ffffff40] bg-[#ffffff0a] transition-all duration-200 group-hover:border-[#fffdf8] group-hover:bg-[#ffffff18] group-active:scale-95">
            <ArrowDown className="h-3.5 w-3.5 text-[#fffdf8] animate-bounce" />
          </div>
        </button>
      </div>

      {/* 3. Quiet Vertical Rail (Right side, top 41%) */}
      {!isRailDisabled && (
        <div
          role="navigation"
          aria-label="Journey timeline progress"
          className="fixed right-[18px] sm:right-[28px] top-[41%] z-40 flex flex-col items-end gap-3 transition-opacity duration-300"
          style={{
            opacity: railOpacity,
            pointerEvents: isRailDisabled ? 'none' : 'auto',
          }}
        >
          {chapters.map((ch, idx) => {
            const isActive = activeChapterIndex === idx;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => onNavigateChapter(ch.destinationP, ch.id)}
                aria-label={`Jump to chapter ${ch.number}: ${ch.name}`}
                className="group flex items-center gap-2 cursor-pointer p-1 bg-transparent border-none outline-none"
              >
                {isActive && (
                  <span className="font-sans-serra text-[10px] font-semibold tracking-wider text-[#fffdf8]">
                    {ch.number}
                  </span>
                )}
                <div
                  className={`transition-all duration-300 rounded-full ${
                    isActive
                      ? 'h-[19px] w-[4px] bg-[#fffdf8] shadow-[0_0_8px_rgba(255,253,248,0.4)]'
                      : 'h-[4px] w-[4px] bg-[#ffffff50] group-hover:bg-[#ffffff90]'
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Bottom 2px Warm-Ivory Progress Line */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 h-[2px] bg-[#ffffff15]">
        <div
          className="h-full bg-[#fffdf8] will-change-transform"
          style={{
            transformOrigin: 'left',
            transform: `scaleX(${clamp(progress)})`,
          }}
        />
      </div>
    </>
  );
}
