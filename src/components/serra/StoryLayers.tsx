import { ArrowUpRight, ArrowDown } from 'lucide-react';
import type { Chapter } from '../../types/serra';

interface StoryLayersProps {
  progress: number;
  introProgress: number; // 0 to 1 over 1100ms
  chapters: Chapter[];
  onNavigateChapter: (destinationP: number, id: string) => void;
}

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const smooth = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};

export default function StoryLayers({
  progress,
  introProgress,
  chapters,
  onNavigateChapter,
}: StoryLayersProps) {
  // Envelopes from Section 9
  const envelopes = [
    {
      // 01 The Place
      E: introProgress,
      X: smooth(0.07, 0.13, progress),
    },
    {
      // 02 The Stay
      E: smooth(0.19, 0.25, progress),
      X: smooth(0.34, 0.4, progress),
    },
    {
      // 03 Experiences
      E: smooth(0.49, 0.55, progress),
      X: smooth(0.66, 0.72, progress),
    },
    {
      // 04 The Horizon
      E: smooth(0.85, 0.91, progress),
      X: 0,
    },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 z-30 h-full w-full">
      {chapters.map((ch, idx) => {
        const { E, X } = envelopes[idx];
        const isActive = E > 0.01 && X < 0.99;
        if (!isActive) return null;

        const wordsL1 = ch.headlineFirst.split(' ');
        const wordsL2 = ch.headlineSecond.split(' ');

        // Eyebrow calculations
        const eyebrowOpacity = E * (1 - X);
        const eyebrowY = (1 - E) * 12 - X * 10;

        // Copy calculations
        const copyOpacity = clamp((E - 0.2) / 0.65) * (1 - X);
        const copyY = (1 - E) * 20 - X * 12;
        const copyBlur = (1 - E) * 3;

        const HeadlineTag = idx === 0 ? 'h1' : 'h2';

        return (
          <section
            key={ch.id}
            id={ch.id}
            aria-hidden={!isActive}
            className="absolute inset-0 flex h-full w-full flex-col justify-end p-[18px] sm:p-[28px] pb-[28px] sm:pb-[35px]"
          >
            {/* Desktop: Distributed Left Headlines & Right Copy Block */}
            {/* Mobile (<=900px): Bottom-aligned vertical stack */}
            <div className="flex w-full flex-col min-[901px]:flex-row min-[901px]:items-end min-[901px]:justify-between gap-6 sm:gap-8">
              {/* Left Headline Group */}
              <div className="max-w-[850px] pointer-events-auto">
                {/* Chapter Eyebrow */}
                <div
                  className="mb-[20px] sm:mb-[27px] flex items-center gap-3 font-sans-serra text-[10px] font-medium uppercase tracking-[0.2em] text-[#d9a588]"
                  style={{
                    opacity: eyebrowOpacity,
                    transform: `translate3d(0, ${eyebrowY}px, 0)`,
                  }}
                >
                  <span>{ch.number}</span>
                  <span className="inline-block h-[1px] w-[30px] bg-[#d9a588]/60" />
                  <span>{ch.eyebrow}</span>
                </div>

                {/* Main Headline */}
                <HeadlineTag className="m-0 leading-none">
                  {/* First Line (Inter 400) */}
                  <span className="block font-sans-serra font-normal leading-[0.98] tracking-[-0.055em] text-[#fffdf8] text-[clamp(40px,7vw,94px)] whitespace-nowrap">
                    {wordsL1.map((w, i) => {
                      const v = clamp(E * 1.35 - i * 0.09);
                      const op = v * (1 - X);
                      const bl = (1 - v) * 7;
                      const ty = (1 - v) * 26 - X * 16;
                      return (
                        <span
                          key={i}
                          className="inline-block mr-[0.25em]"
                          style={{
                            opacity: op,
                            filter: `blur(${bl}px)`,
                            transform: `translate3d(0, ${ty}px, 0)`,
                          }}
                        >
                          {w}
                        </span>
                      );
                    })}
                  </span>

                  {/* Second Line (Cormorant Garamond Italic) */}
                  <span className="block font-serif-serra font-normal leading-[0.92] tracking-[-0.045em] text-[#fffdf8] text-[clamp(44px,7.9vw,106px)] mt-[6px] whitespace-nowrap">
                    {wordsL2.map((w, i) => {
                      const E2 = Math.max(0, E - 0.07);
                      const v = clamp(E2 * 1.35 - i * 0.09);
                      const op = v * (1 - X);
                      const bl = (1 - v) * 7;
                      const ty = (1 - v) * 26 - X * 16;
                      return (
                        <span
                          key={i}
                          className="inline-block mr-[0.25em]"
                          style={{
                            opacity: op,
                            filter: `blur(${bl}px)`,
                            transform: `translate3d(0, ${ty}px, 0)`,
                          }}
                        >
                          {w}
                        </span>
                      );
                    })}
                  </span>
                </HeadlineTag>
              </div>

              {/* Right Supporting Copy & Actions */}
              <div
                className="w-full min-[901px]:w-[300px] min-[1500px]:w-[330px] shrink-0 pointer-events-auto"
                style={{
                  opacity: copyOpacity,
                  filter: `blur(${copyBlur}px)`,
                  transform: `translate3d(0, ${copyY}px, 0)`,
                }}
              >
                <p className="m-0 font-sans-serra text-[15px] sm:text-[16px] min-[1500px]:text-[18px] font-normal leading-[1.45] tracking-[-0.02em] text-[#d6c8bc]/90">
                  {ch.supportingCopy}
                </p>

                {/* Chapter 01: Explore Serra CTA */}
                {ch.ctaAction === 'explore' && (
                  <button
                    type="button"
                    data-cursor-enter="true"
                    onClick={() => onNavigateChapter(0.29, 'the-stay')}
                    className="group mt-[25px] inline-flex items-center gap-[33px] rounded-full bg-[#d6a486] px-[23px] py-[16px] font-sans-serra text-[13px] sm:text-[14px] font-medium text-[#23180f] shadow-lg transition-all duration-200 hover:bg-[#e4b79b] active:scale-[0.97] cursor-pointer"
                  >
                    <span>{ch.ctaText}</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]" />
                  </button>
                )}

                {/* Chapter 02: The journey continues link */}
                {ch.ctaAction === 'continue' && (
                  <button
                    type="button"
                    onClick={() => onNavigateChapter(0.59, 'experiences')}
                    className="group mt-[24px] inline-flex items-center gap-[25px] font-sans-serra text-[12px] text-[#fffdf8] underline underline-offset-4 opacity-90 transition-opacity hover:opacity-100 cursor-pointer bg-transparent border-none p-0"
                  >
                    <span>{ch.ctaText}</span>
                    <ArrowDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-y-[2px]" />
                  </button>
                )}

                {/* Chapter 04: Return to the beginning link */}
                {ch.ctaAction === 'return' && (
                  <button
                    type="button"
                    onClick={() => onNavigateChapter(0, 'the-place')}
                    className="group mt-[24px] inline-flex items-center gap-[30px] font-sans-serra text-[12px] text-[#fffdf8] underline underline-offset-4 opacity-90 transition-opacity hover:opacity-100 cursor-pointer bg-transparent border-none p-0"
                  >
                    <span>{ch.ctaText}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]" />
                  </button>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
