import { useEffect, useRef } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import type { Chapter, FilmQuality } from '../../types/serra';

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapters?: Chapter[];
  onNavigate?: (id: string) => void;
  onSelectChapter?: (destinationP: number, id: string) => void;
  activeChapterId?: string;
  quality: FilmQuality;
  onQualityChange: (q: FilmQuality) => void;
  isStillness: boolean;
  onToggleStillness: () => void;
  onReturnToStudy?: () => void;
}

const MENU_ITEMS = [
  { number: '01', title: 'The Place', subtitle: 'A sanctuary within stone', id: 'the-place', p: 0 },
  { number: '02', title: 'The Stay', subtitle: 'Space to simply be', id: 'the-stay', p: 0.29 },
  { number: '03', subtitle: 'Beyond the expected', title: 'Experiences', id: 'experiences', p: 0.59 },
  { number: '04', title: 'The Horizon', subtitle: 'A world opening up', id: 'the-horizon', p: 1.0 },
];

export default function MenuModal({
  isOpen,
  onClose,
  onNavigate,
  onSelectChapter,
  quality,
  onQualityChange,
  isStillness,
  onToggleStillness,
  onReturnToStudy,
}: MenuModalProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Focus management and scroll lock
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      dialog.showModal();
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    } else {
      if (dialog.open) {
        dialog.close();
      }
      document.body.style.overflow = '';
      if (previouslyFocusedRef.current) {
        previouslyFocusedRef.current.focus();
      }
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label="Site Navigation"
      className="serra-menu-bg fixed inset-0 m-0 h-full w-full max-h-none max-w-none border-none p-0 text-[#fffdf8] backdrop:bg-black/60 z-[150] overflow-y-auto"
      style={{
        padding: 'clamp(24px, 5vh, 48px) 7vw',
      }}
    >
      <div className="mx-auto flex min-h-full max-w-[1360px] flex-col justify-between">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-8">
          <div className="flex items-center gap-4">
            <span className="font-sans-serra text-[28px] sm:text-[34px] font-[450] tracking-[0.18em] uppercase text-[#fffdf8]">
              SERRA
            </span>
            {onReturnToStudy && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReturnToStudy();
                }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#d9a58880] bg-[#d9a58818] px-3.5 py-1 font-sans-serra text-[12px] font-semibold text-[#d9a588] transition hover:bg-[#d9a58830] active:scale-95 cursor-pointer"
              >
                ← Return to Study Desk
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex items-center gap-2 rounded-full border border-[#ffffff42] bg-[#ffffff0e] px-4 py-2 font-sans-serra text-[13px] font-medium text-[#fffdf8] transition-all hover:bg-[#ffffff20] active:scale-95 cursor-pointer"
          >
            <span>Close</span>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main 2-Column Content Area */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-[10%] py-6 sm:py-10">
          {/* Left Column: Editorial Statement */}
          <div className="flex flex-col justify-center">
            <span className="font-sans-serra text-[10px] font-medium uppercase tracking-[0.22em] text-[#d9a588] mb-4">
              AWAY FROM EVERYTHING.
            </span>

            <h2 className="text-[38px] sm:text-[54px] lg:text-[62px] leading-[0.98] tracking-[-0.04em] font-normal text-[#fffdf8]">
              <span className="font-sans-serra block">Come back</span>
              <span className="font-serif-serra block mt-1">to yourself.</span>
            </h2>

            <div className="mt-8 space-y-1.5 font-sans-serra text-[15px] sm:text-[16px] text-[#d6c8bc]/90 font-normal leading-relaxed">
              <p className="m-0">A quieter world awaits.</p>
              <p className="m-0">Take your time finding it.</p>
            </div>

            {onReturnToStudy && (
              <div className="mt-8 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReturnToStudy();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d9a588] bg-[#d9a58822] px-5 py-2.5 font-sans-serra text-[13px] font-medium text-[#fffdf8] transition-all hover:bg-[#d9a58840] active:scale-95 cursor-pointer"
                >
                  <span>← Open DuoStudy Planner & Desk</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: 4 Chapter Link Rows */}
          <nav aria-label="Menu Chapter Links" className="flex flex-col justify-center divide-y divide-[#ffffff20]">
            {MENU_ITEMS.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                  if (onNavigate) {
                    onNavigate(item.id);
                  } else if (onSelectChapter) {
                    onSelectChapter(item.p, item.id);
                  }
                }}
                className="group flex items-center justify-between py-[17px] pb-[21px] no-underline transition-all hover:translate-x-1"
              >
                <div className="flex items-baseline gap-4 sm:gap-6">
                  <span className="hidden sm:inline font-sans-serra text-[12px] font-medium tracking-[0.1em] text-[#d9a588]">
                    {item.number}
                  </span>
                  <div>
                    <h3 className="font-sans-serra text-[28px] sm:text-[39px] font-normal tracking-[-0.04em] text-[#fffdf8] transition-colors group-hover:text-[#d9a588]">
                      {item.title}
                    </h3>
                    <p className="font-sans-serra text-[11.5px] sm:text-[12px] text-[#d6c8bc]/70 m-0 mt-0.5 tracking-[0.01em]">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-transparent text-[#fffdf8]/60 transition-all group-hover:border-[#ffffff35] group-hover:text-[#fffdf8] group-hover:translate-x-1 group-hover:-translate-y-1">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </a>
            ))}
          </nav>
        </div>

        {/* Footer Controls in Normal Flex Layout */}
        <div className="mt-auto border-t border-[#ffffff20] pt-6 pb-2 flex flex-wrap items-center justify-between gap-4 text-[12px]">
          {/* Sanctuary Caption */}
          <span className="font-sans-serra text-[10px] uppercase tracking-[0.2em] text-[#d6c8bc]/70">
            ✦ A SANCTUARY WITHIN STONE
          </span>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Film Quality Select */}
            <div className="flex items-center gap-2">
              <label htmlFor="film-quality-select" className="text-[#d6c8bc]/80 text-[11px] uppercase tracking-wider">
                Film:
              </label>
              <select
                id="film-quality-select"
                value={quality}
                onChange={(e) => onQualityChange(e.target.value as FilmQuality)}
                className="cursor-pointer rounded-[24px] border border-[#ffffff35] bg-[#ffffff0e] px-3.5 py-1.5 font-sans-serra text-[12px] text-[#fffdf8] outline-none transition hover:bg-[#ffffff18] focus:border-[#d9a588]"
              >
                <option value="auto" className="bg-[#251e19] text-[#fffdf8]">
                  Auto · adaptive
                </option>
                <option value="1080p" className="bg-[#251e19] text-[#fffdf8]">
                  Full HD · 1080p
                </option>
                <option value="720p" className="bg-[#251e19] text-[#fffdf8]">
                  HD · 720p
                </option>
              </select>
            </div>

            {/* Stillness Mode Toggle */}
            <button
              type="button"
              onClick={() => {
                onToggleStillness();
                onClose();
              }}
              className="cursor-pointer text-[#d9a588] hover:text-[#fffdf8] transition-colors underline underline-offset-4 font-sans-serra text-[12px]"
            >
              {isStillness ? 'Enable cinematic journey' : 'Switch to stillness mode'}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
