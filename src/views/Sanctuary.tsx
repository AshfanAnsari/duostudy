import { useEffect, useRef, useState, useCallback } from 'react';
import { Waves, Sun } from 'lucide-react';
import { CHAPTERS, type FilmQuality } from '../types/serra';
import { SERRA_MEDIA } from '../lib/serraMedia';
import MineralLoader from '../components/serra/MineralLoader';
import CinematicScene from '../components/serra/CinematicScene';
import StoryLayers from '../components/serra/StoryLayers';
import GlassCard from '../components/serra/GlassCard';
import Header from '../components/serra/Header';
import JourneyRail from '../components/serra/JourneyRail';
import MenuModal from '../components/serra/MenuModal';
import CustomCursor from '../components/serra/CustomCursor';
import StillnessMode from '../components/serra/StillnessMode';
import CoupleOnTheEdge from '../components/serra/CoupleOnTheEdge';

const clamp = (v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v));
const smooth = (a: number, b: number, v: number) => {
  const x = clamp((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};

interface SanctuaryProps {
  onExit: () => void;
}

export default function Sanctuary({ onExit }: SanctuaryProps) {
  const mainRef = useRef<HTMLElement | null>(null);
  const [p, setP] = useState(0);
  const pRef = useRef(0);
  const [introProgress, setIntroProgress] = useState(0);
  const [introRevealed, setIntroRevealed] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [quality, setQuality] = useState<FilmQuality>('auto');
  const [isStillness, setIsStillness] = useState(false);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  // Readiness state for MineralLoader
  const [posterLoaded, setPosterLoaded] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [bufferedSecs, setBufferedSecs] = useState(0);
  const [loaderReady, setLoaderReady] = useState(false);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const media = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (media.matches) {
        setIsStillness(true);
        setLoaderReady(true);
      }
    }
  }, []);

  // Readiness Calculation: 30 poster + 10 fonts + 60 video frame (or 55 for 1.5s buffered)
  const calcProgress = () => {
    let score = 0;
    if (posterLoaded) score += 30;
    if (fontsLoaded) score += 10;
    if (videoReady) {
      score += 60;
    } else {
      score += Math.min(55, Math.round((bufferedSecs / 1.5) * 55));
    }
    return Math.min(100, score);
  };

  const readinessProgress = calcProgress();

  useEffect(() => {
    if (readinessProgress >= 100 && !loaderReady) {
      setLoaderReady(true);
    }
  }, [readinessProgress, loaderReady]);

  // Check fonts readiness
  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => setFontsLoaded(true)).catch(() => setFontsLoaded(true));
    } else {
      setFontsLoaded(true);
    }
  }, []);

  // 12-second bounded fallback deadline
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoaderReady(true);
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  // Handle intro reveal completion -> 1100ms headline entry
  const handleRevealComplete = useCallback(() => {
    setIntroRevealed(true);
    const start = performance.now();
    const tickIntro = (now: number) => {
      const elapsed = now - start;
      const progressVal = clamp(elapsed / 1100);
      setIntroProgress(progressVal);

      if (elapsed < 1100) {
        requestAnimationFrame(tickIntro);
      } else {
        // Honor initial chapter hash if present
        const hash = window.location.hash.replace('#', '');
        if (hash) {
          const targetCh = CHAPTERS.find((c) => c.id === hash);
          if (targetCh && mainRef.current) {
            const destY =
              mainRef.current.offsetTop +
              (mainRef.current.offsetHeight - window.innerHeight) * targetCh.destinationP;
            window.scrollTo({ top: destY, behavior: 'smooth' });
          }
        }
      }
    };

    requestAnimationFrame(tickIntro);
  }, []);

  // Native scroll tracking + RAF smoothing
  useEffect(() => {
    if (isStillness) return;

    let animId: number;
    let lastTime = performance.now();

    const updateScroll = (now: number) => {
      const main = mainRef.current;
      if (main) {
        const dt = Math.min(100, now - lastTime);
        lastTime = now;

        const scrollDist = main.offsetHeight - window.innerHeight;
        const target = scrollDist > 0 ? clamp(-main.getBoundingClientRect().top / scrollDist) : 0;

        // Easing: a = 1 - Math.pow(0.91, dt / 16.667)
        const a = 1 - Math.pow(0.91, dt / 16.667);
        const nextP = pRef.current + (target - pRef.current) * a;
        pRef.current = nextP;
        setP(nextP);
      }

      animId = requestAnimationFrame(updateScroll);
    };

    animId = requestAnimationFrame(updateScroll);
    return () => cancelAnimationFrame(animId);
  }, [isStillness]);

  // Determine active chapter based on exact thresholds
  const getActiveChapterIndex = (progressVal: number) => {
    if (progressVal < 0.18) return 0; // The Place
    if (progressVal < 0.45) return 1; // The Stay
    if (progressVal < 0.76) return 2; // Experiences
    return 3; // The Horizon
  };

  const activeIndex = getActiveChapterIndex(p);

  // Chapter navigation handler
  const handleNavigate = useCallback((destinationP: number, id: string) => {
    if (mainRef.current) {
      const scrollDist = mainRef.current.offsetHeight - window.innerHeight;
      const targetY = mainRef.current.offsetTop + scrollDist * destinationP;
      window.scrollTo({ top: targetY, behavior: 'smooth' });
      window.history.replaceState(null, '', `#${id}`);
    }
  }, []);

  // Esc key to return to study desk
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMenuOpen) {
          setIsMenuOpen(false);
        } else {
          onExit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen, onExit]);

  // Card 1 & Card 2 enter envelope: smooth(0.76, 0.84, p)
  const cardEnter = smooth(0.76, 0.84, p);
  const cardY = (1 - cardEnter) * 28;
  const showCards = cardEnter > 0.01;

  if (isStillness) {
    return (
      <div className="relative min-h-screen bg-[#100d0a] text-[#fffdf8]">
        {/* Floating Return Pill in Stillness Mode */}
        <div className="fixed top-5 left-5 z-[80]">
          <button
            type="button"
            onClick={onExit}
            className="group flex items-center gap-2 rounded-full border border-white/20 bg-[#19130ec0] px-4 py-2 text-[12px] font-medium tracking-wide text-[#fffdf8] shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:border-[#d9a588] hover:bg-[#231a14] active:scale-95 cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Return to Study Desk</span>
            <span className="rounded-sm bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#d6c8bc]">Esc</span>
          </button>
        </div>
        <StillnessMode
          chapters={CHAPTERS}
          onToggleStillness={() => setIsStillness(false)}
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#100d0a] text-[#fffdf8] font-sans-serra selection:bg-[#d9a58840] selection:text-[#fffdf8]">
      {/* Accessible Skip Link */}
      <a
        href="#the-place"
        onClick={(e) => {
          e.preventDefault();
          setIsStillness(true);
        }}
        className="serra-skip-link font-sans-serra"
      >
        Skip animation and read the story
      </a>

      {/* Floating Return Pill: Direct Return to Study Desk */}
      <div className="fixed top-5 left-5 z-[80]">
        <button
          type="button"
          onClick={onExit}
          className="group flex items-center gap-2 rounded-full border border-white/20 bg-[#19130ec0] px-4 py-2 text-[12px] font-medium tracking-wide text-[#fffdf8] shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl transition hover:border-[#d9a588] hover:bg-[#231a14] active:scale-95 cursor-pointer"
          title="Return to DuoStudy desk, timer, and planner (or press Esc)"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>Return to Study Desk</span>
          <span className="rounded-sm bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[#d6c8bc]">Esc</span>
        </button>
      </div>

      {/* Custom Cursor (Fine pointer only) */}
      <CustomCursor hidden={isMenuOpen || isStillness} />

      {/* Mineral Loader Veil */}
      {!introRevealed && (
        <MineralLoader
          progress={readinessProgress}
          isReady={loaderReady}
          onRevealComplete={handleRevealComplete}
        />
      )}

      {/* Persistent Fixed Header */}
      <Header
        chapters={CHAPTERS}
        activeChapterIndex={activeIndex}
        onNavigateChapter={handleNavigate}
        onOpenMenu={() => setIsMenuOpen(true)}
        introRevealed={introRevealed}
      />

      {/* Main 940svh Scroll Travel Container */}
      <main
        ref={mainRef}
        className="relative w-full"
        style={{ height: '940svh', minHeight: '940vh' }}
      >
        {/* Sticky 100svh Viewport Stage */}
        <div className="sticky top-0 left-0 h-[100svh] min-h-[100vh] w-full overflow-hidden isolate">
          {/* Full-screen Cinematic Video & WebGL Parallax Scene */}
          <CinematicScene
            progress={p}
            quality={quality}
            manifest={SERRA_MEDIA}
            onPosterLoaded={() => setPosterLoaded(true)}
            onVideoFrameReady={() => setVideoReady(true)}
            onBufferProgress={(secs) => setBufferedSecs(secs)}
            videoRefOut={(el) => setVideoEl(el)}
          />

          {/* Chapter Story Typography Layers */}
          <StoryLayers
            progress={p}
            introProgress={introProgress}
            chapters={CHAPTERS}
            onNavigateChapter={handleNavigate}
          />

          {/* Two Live Glass Cards (Chapter 4: The Horizon) */}
          {showCards && (
            <div
              className="pointer-events-none absolute inset-0 z-35"
              style={{
                opacity: cardEnter,
                transform: `translate3d(0, ${cardY}px, 0)`,
              }}
            >
              {/* Card 1: The Stay (Left 28px, Top 22% desktop; Left 18px, Top 96px mobile) */}
              <GlassCard
                kicker="THE STAY"
                icon={<Waves className="h-5 w-5" />}
                title="Stay within stone"
                copy="Private canyon suites, natural textures, and terraces opening onto the quiet of the desert."
                videoElement={videoEl}
                className="pointer-events-auto absolute left-[18px] sm:left-[28px] top-[96px] sm:top-[22%] w-[calc(100%-68px)] max-w-[300px] sm:max-w-[330px] p-[20px] sm:p-[24px_25px_28px]"
              />

              {/* Card 2: The Experience (Right 28px, Top 46% desktop; Right 18px, Top 259px mobile) */}
              <GlassCard
                kicker="THE EXPERIENCE"
                icon={<Sun className="h-5 w-5" />}
                title="Find your rhythm"
                copy="Sunrise walks, mineral bathing, and dinners beneath an uninterrupted sky."
                videoElement={videoEl}
                className="pointer-events-auto absolute right-[18px] sm:right-[28px] top-[259px] sm:top-[46%] w-[calc(100%-68px)] max-w-[300px] sm:max-w-[330px] p-[20px] sm:p-[24px_25px_28px]"
              />
            </div>
          )}

          {/* Couples Animation sitting at the cliff edge (End of Serra Journey) */}
          <CoupleOnTheEdge progress={p} />

          {/* Journey Navigation Elements (Rail, Caption, Scroll Button, Progress) */}
          <JourneyRail
            progress={p}
            chapters={CHAPTERS}
            activeChapterIndex={activeIndex}
            onNavigateChapter={handleNavigate}
            onScrollCueClick={() => handleNavigate(0.29, 'the-stay')}
          />
        </div>
      </main>

      {/* Full-screen Menu Navigation Modal */}
      <MenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        chapters={CHAPTERS}
        onSelectChapter={handleNavigate}
        quality={quality}
        onQualityChange={setQuality}
        isStillness={isStillness}
        onToggleStillness={() => setIsStillness((prev) => !prev)}
        onReturnToStudy={onExit}
      />
    </div>
  );
}
