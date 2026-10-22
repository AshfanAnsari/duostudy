import { ArrowUpRight } from 'lucide-react';
import type { Chapter } from '../../types/serra';

interface HeaderProps {
  chapters: Chapter[];
  activeChapterIndex: number;
  onNavigateChapter: (destinationP: number, id: string) => void;
  onOpenMenu: () => void;
  introRevealed: boolean;
}

export default function Header({
  chapters,
  activeChapterIndex,
  onNavigateChapter,
  onOpenMenu,
  introRevealed,
}: HeaderProps) {
  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-[18px] sm:px-[28px] pt-[20px] sm:pt-[22px] transition-all duration-[850ms] ${
        introRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[12px] pointer-events-none'
      }`}
    >
      {/* Top Left: SERRA Wordmark */}
      <a
        href="#the-place"
        onClick={(e) => {
          e.preventDefault();
          onNavigateChapter(0, 'the-place');
        }}
        className="block font-sans-serra font-[450] tracking-[0.18em] uppercase text-[#fffdf8] no-underline transition-opacity hover:opacity-80"
        style={{
          fontSize: 'clamp(28px, 2.7vw, 39px)',
          width: 'clamp(140px, 13vw, 186px)',
        }}
        aria-label="SERRA — A Sanctuary Within Stone"
      >
        SERRA
      </a>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Desktop Frosted Chapter Capsule (hidden on <= 900px) */}
        <nav
          aria-label="Chapter navigation"
          className="hidden min-[901px]:flex items-center gap-[2px] rounded-[50px] border border-[#ffffff42] bg-[#ffffff0e] p-[4px] backdrop-blur-[20px]"
        >
          {chapters.map((ch, idx) => {
            const isActive = activeChapterIndex === idx;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => onNavigateChapter(ch.destinationP, ch.id)}
                aria-current={isActive ? 'true' : undefined}
                className={`cursor-pointer rounded-[40px] px-[18px] py-[8px] font-sans-serra text-[14px] font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-[#fffdf8] text-[#100d0a] shadow-sm'
                    : 'bg-transparent text-[#fffdf8]/85 hover:text-[#fffdf8] hover:bg-[#ffffff12]'
                }`}
              >
                {ch.name}
              </button>
            );
          })}
        </nav>

        {/* Ivory Menu Pill (hidden on <= 560px) */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="hidden min-[561px]:inline-flex h-[43px] cursor-pointer items-center justify-center rounded-full bg-[#fffdf8] px-5 font-sans-serra text-[14px] font-medium text-[#100d0a] shadow-sm transition-transform duration-200 hover:bg-[#f5ede4] active:scale-95"
        >
          Menu
        </button>

        {/* Ivory Circular Northeast-Arrow Button (always visible, opens menu) */}
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="flex h-[43px] w-[43px] cursor-pointer items-center justify-center rounded-full bg-[#fffdf8] text-[#100d0a] shadow-sm transition-transform duration-200 hover:bg-[#f5ede4] active:scale-95"
        >
          <ArrowUpRight className="h-5 w-5 transition-transform duration-200 hover:translate-x-[2px] hover:-translate-y-[2px]" />
        </button>
      </div>
    </header>
  );
}
