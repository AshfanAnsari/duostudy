import studyHero from '../assets/study_hero.jpg';
import BorderBeam from '../components/BorderBeam';
import { daysToExam, examDate } from '../lib/store';

export default function StartPage({ onStart }: { onStart: () => void }) {
  const days = daysToExam();
  const exam = examDate();
  const examPretty = new Date(exam + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handleStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onStart();
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-8 orchid-wash text-[#1A1126] selection:bg-[#DDD6FE] selection:text-[#1A1126]">
      {/* Top Eyebrow directly matching screenshot */}
      <div className="mb-4 text-center font-sans text-[11px] font-bold uppercase tracking-[0.24em] text-[#7E699B]">
        OUR STUDY HOME
      </div>

      {/* Main Centerpiece Split Card */}
      <div className="w-full max-w-[1020px]">
        <div className="relative overflow-hidden rounded-[36px] border border-white/95 bg-white/85 p-6 sm:p-9 backdrop-blur-2xl shadow-[0_24px_64px_-16px_rgba(76,29,149,0.12)] transition-shadow duration-300 hover:shadow-[0_30px_72px_-16px_rgba(76,29,149,0.18)]">
          <BorderBeam size={260} duration={14} colorFrom="#8B5CF6" colorTo="#E03E2D" borderWidth={1.5} />

          <div className="grid items-center gap-8 md:grid-cols-[1fr_1.1fr]">
            {/* Left Column: Mascot Photo with Rounded Corners */}
            <div className="relative">
              <div className="relative aspect-[4/3.6] w-full overflow-hidden rounded-[26px] border border-white/90 bg-[#170E24] shadow-[0_16px_36px_-10px_rgba(26,17,38,0.18)]">
                <img
                  src={studyHero}
                  alt="Study Companion - DuoStudy"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Right Column: Clean Anti-Slop Content from Screenshot */}
            <div className="flex flex-col justify-center px-2 sm:px-4">
              <div className="font-sans text-[11.5px] font-bold uppercase tracking-[0.2em] text-[#7E699B]">
                DAYS TO NEET
              </div>

              <div className="mt-1 font-sans text-[80px] sm:text-[88px] font-extrabold leading-none tracking-tight text-[#1A1126] tabular-nums">
                {days}
              </div>

              <h1 className="mt-4 font-display text-[26px] sm:text-[30px] font-bold leading-snug text-[#1A1126]">
                Revise a little,{' '}
                <em className="italic text-[#E03E2D]">
                  every single day.
                </em>
              </h1>

              {/* Metrics Line */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5 font-sans text-[12.5px] sm:text-[13px] font-bold text-[#6B5B84]">
                <span className="inline-flex items-center gap-1.5 text-[#1A1126]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  93 NCERT Chapters
                </span>
                <span className="text-purple-300">·</span>
                <span>2 Scheduled Passes</span>
                <span className="text-purple-300">·</span>
                <span>Real-Time Desk Sync</span>
              </div>

              {/* Vermilion Start Button & Link from Screenshot */}
              <div className="mt-7 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleStart}
                  className="relative z-30 cursor-pointer rounded-full bg-[#E03E2D] px-9 py-3 font-sans text-[15.5px] font-bold text-white shadow-[0_10px_24px_-4px_rgba(224,62,45,0.45)] transition hover:bg-[#c93222] active:scale-95 pointer-events-auto select-none"
                >
                  Start
                </button>
                <button
                  type="button"
                  onClick={handleStart}
                  className="relative z-30 cursor-pointer font-sans text-[13.5px] font-bold text-[#7E699B] hover:text-[#1A1126] transition underline underline-offset-4 pointer-events-auto select-none"
                >
                  Explore the Platform →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Line directly matching Screenshot */}
        <div className="mt-5 text-center font-sans text-[11.5px] font-semibold tracking-wider text-[#7E699B]">
          Physics 33 · Chemistry 28 · Biology 32 · Exam: {examPretty}
        </div>
      </div>
    </div>
  );
}
