import { Waves, Sun, ArrowUpRight } from 'lucide-react';
import type { Chapter } from '../../types/serra';
import { SERRA_MEDIA } from '../../lib/serraMedia';
import CoupleOnTheEdge from './CoupleOnTheEdge';

interface StillnessModeProps {
  chapters: Chapter[];
  onToggleStillness: () => void;
}

export default function StillnessMode({
  chapters,
  onToggleStillness,
}: StillnessModeProps) {
  const handleNav = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      window.history.replaceState(null, '', `#${id}`);
    }
  };
  return (
    <div className="relative min-h-screen w-full bg-[#100d0a] text-[#fffdf8]">
      {/* Fixed Horizon Poster Background with Strong Dark Shading */}
      <div className="fixed inset-0 z-0">
        <img
          src={SERRA_MEDIA.horizonPoster}
          alt="SERRA desert sanctuary horizon"
          className="h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#100d0a]/90 via-[#100d0a]/75 to-[#100d0a]/95" />
      </div>

      {/* Main Document Flow Content */}
      <main id="story-content" className="relative z-10 mx-auto max-w-[1080px] px-6 sm:px-12 py-20">
        {/* Stillness Note Banner */}
        <div className="mb-16 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#ffffff20] bg-[#ffffff08] p-4 backdrop-blur-md">
          <span className="font-sans-serra text-[12px] font-medium tracking-[0.05em] text-[#d6c8bc]">
            Stillness mode · Take the journey at your own pace.
          </span>
          <button
            type="button"
            onClick={onToggleStillness}
            className="cursor-pointer rounded-full bg-[#fffdf8] px-4 py-1.5 font-sans-serra text-[12px] font-medium text-[#100d0a] transition hover:bg-[#d9a588] active:scale-95"
          >
            Enable cinematic journey
          </button>
        </div>

        {/* Chapters 1, 2, 3 in Document Flow */}
        {chapters.slice(0, 3).map((ch, idx) => {
          const HeadlineTag = idx === 0 ? 'h1' : 'h2';
          return (
            <article key={ch.id} id={ch.id} className="mb-32">
              <div className="mb-4 flex items-center gap-3 font-sans-serra text-[10px] font-medium uppercase tracking-[0.2em] text-[#d9a588]">
                <span>{ch.number}</span>
                <span className="inline-block h-[1px] w-[30px] bg-[#d9a588]/60" />
                <span>{ch.eyebrow}</span>
              </div>

              <HeadlineTag className="m-0 leading-tight">
                <span className="block font-sans-serra font-normal text-[clamp(44px,6vw,72px)] tracking-[-0.05em] text-[#fffdf8]">
                  {ch.headlineFirst}
                </span>
                <span className="block font-serif-serra font-normal text-[clamp(48px,6.8vw,82px)] tracking-[-0.04em] text-[#fffdf8] mt-1">
                  {ch.headlineSecond}
                </span>
              </HeadlineTag>

              <p className="mt-6 max-w-[540px] font-sans-serra text-[17px] leading-[1.55] text-[#d6c8bc]/90">
                {ch.supportingCopy}
              </p>

              {ch.ctaAction === 'explore' && (
                <button
                  type="button"
                  onClick={() => handleNav('the-stay')}
                  className="mt-8 inline-flex items-center gap-6 rounded-full bg-[#d6a486] px-6 py-3.5 font-sans-serra text-[14px] font-medium text-[#23180f] no-underline shadow-lg transition hover:bg-[#e4b79b] cursor-pointer border-none"
                >
                  <span>{ch.ctaText}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              )}
            </article>
          );
        })}

        {/* Two Glass Cards (Placed before closing chapter in stillness mode per spec) */}
        <section aria-label="Sanctuary Highlights" className="mb-32 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: The Stay */}
          <div className="rounded-[26px] border border-[#ffffff40] bg-[#ffffff0a] p-8 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between pb-3">
              <span className="font-sans-serra text-[11px] font-medium uppercase tracking-[0.2em] text-[#d9a588]">
                THE STAY
              </span>
              <Waves className="h-5 w-5 text-[#fffdf8]/70" />
            </div>
            <h3 className="font-sans-serra text-[26px] font-normal tracking-[-0.03em] text-[#fffdf8] mt-2">
              Stay within stone
            </h3>
            <p className="mt-3 font-sans-serra text-[15px] leading-relaxed text-[#d6c8bc]/90">
              Private canyon suites, natural textures, and terraces opening onto the quiet of the desert.
            </p>
          </div>

          {/* Card 2: The Experience */}
          <div className="rounded-[26px] border border-[#ffffff40] bg-[#ffffff0a] p-8 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between pb-3">
              <span className="font-sans-serra text-[11px] font-medium uppercase tracking-[0.2em] text-[#d9a588]">
                THE EXPERIENCE
              </span>
              <Sun className="h-5 w-5 text-[#fffdf8]/70" />
            </div>
            <h3 className="font-sans-serra text-[26px] font-normal tracking-[-0.03em] text-[#fffdf8] mt-2">
              Find your rhythm
            </h3>
            <p className="mt-3 font-sans-serra text-[15px] leading-relaxed text-[#d6c8bc]/90">
              Sunrise walks, mineral bathing, and dinners beneath an uninterrupted sky.
            </p>
          </div>
        </section>

        {/* Chapter 4 — The Horizon */}
        {chapters.slice(3, 4).map((ch) => (
          <article key={ch.id} id={ch.id} className="mb-24">
            <div className="mb-4 flex items-center gap-3 font-sans-serra text-[10px] font-medium uppercase tracking-[0.2em] text-[#d9a588]">
              <span>{ch.number}</span>
              <span className="inline-block h-[1px] w-[30px] bg-[#d9a588]/60" />
              <span>{ch.eyebrow}</span>
            </div>

            <h2 className="m-0 leading-tight">
              <span className="block font-sans-serra font-normal text-[clamp(44px,6vw,72px)] tracking-[-0.05em] text-[#fffdf8]">
                {ch.headlineFirst}
              </span>
              <span className="block font-serif-serra font-normal text-[clamp(48px,6.8vw,82px)] tracking-[-0.04em] text-[#fffdf8] mt-1">
                {ch.headlineSecond}
              </span>
            </h2>

            <p className="mt-6 max-w-[540px] font-sans-serra text-[17px] leading-[1.55] text-[#d6c8bc]/90">
              {ch.supportingCopy}
            </p>

            <button
              type="button"
              onClick={() => handleNav('the-place')}
              className="mt-8 inline-flex items-center gap-4 font-sans-serra text-[13px] text-[#fffdf8] underline underline-offset-4 opacity-90 transition hover:opacity-100 cursor-pointer bg-transparent border-none p-0"
            >
              <span>Return to the beginning</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </article>
        ))}

        {/* Couple sitting on the canyon stone ledge animation at the end */}
        <div className="relative mt-20 pt-16">
          <CoupleOnTheEdge alwaysVisible={true} />
        </div>
      </main>
    </div>
  );
}
