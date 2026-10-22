import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CHAPTERS, TOTAL } from '../data/chapters';
import { store, daysToExam, examDate, todayISO, type UserData } from '../lib/store';
import { Toggle, SearchModal, TopicsChips, topicCount } from '../components/ui';
import Card3D from '../components/Card3D';
import PartnerSwitch from '../components/PartnerSwitch';
import mascotHero from '../assets/mascot_hero.jpg';
import { copyToClipboard } from '../lib/clipboard';

const byId = (id: string) => CHAPTERS.find((c) => c.id === id)!;

// ── Rose Quartz home elevated with 21st.dev 3D depth & Electric Accent Palette ──
const INK = '#1A1126', MUTED = '#7E699B', ROSE = '#E03E2D';
const RING_C = 295.3; // 2π × r47

function Ring({ pct, colorFrom, colorTo, id, cap }: { pct: number; colorFrom: string; colorTo: string; id: string; cap: string }) {
  return (
    <div className="text-center group">
      <svg width="104" height="104" viewBox="0 0 112 112" className="mx-auto block">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
          <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor={colorFrom} floodOpacity="0.45" />
          </filter>
        </defs>
        <circle cx="56" cy="56" r="47" fill="none" stroke="rgba(36,24,48,.07)" strokeWidth="10" />
        <motion.circle
          cx="56"
          cy="56"
          r="47"
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          initial={{ strokeDashoffset: RING_C }}
          animate={{ strokeDashoffset: RING_C * (1 - pct / 100) }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          transform="rotate(-90 56 56)"
          filter={`url(#glow-${id})`}
        />
        <motion.text
          key={pct}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          x="56"
          y="64"
          textAnchor="middle"
          fontFamily="var(--font-body)"
          fontWeight="800"
          fontSize="24"
          fill={INK}
          letterSpacing="-0.03em"
        >
          {pct}%
        </motion.text>
      </svg>
      <div className="mt-2.5 font-sans text-[11px] font-bold tracking-[0.16em] uppercase text-[#9A6D84]">
        {cap}
      </div>
    </div>
  );
}

export default function Home({
  me,
  data,
  viewUser,
  onSwitch,
  onGoSanctuary,
}: {
  me: string;
  data: UserData;
  viewUser: string;
  onSwitch?: (username: string) => void;
  onGoSanctuary?: () => void;
}) {
  const [search, setSearch] = useState(false);
  const [copyPairSuccess, setCopyPairSuccess] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const readOnly = viewUser !== me;
  const t = todayISO();
  const todays = store.todaysChapters(data, t);
  const doneSet = new Set(data.todayDone[t] ?? []);

  const [sayHiToast, setSayHiToast] = useState<string | null>(null);

  // Live timer interval to update running stopwatch and daily counters in real time
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // both profiles, for the rings — the store already holds the partner's data
  const partner = store.accountOf(me)?.partner ?? null;
  const partnerAccount = partner ? store.accountOf(partner) : null;
  const myData = store.dataOf(me) ?? data;
  const partnerData = partner ? store.dataOf(partner) : null;
  const syllabusPct = (d: UserData) => Math.round((store.completedCount(d) / TOTAL) * 100);
  const stagesDone = CHAPTERS.reduce((s, c) => s + (data.completions[c.id] ?? 0), 0);

  // Study timer calculations
  const isViewingUserStudying = store.isTimerRunning(viewUser);
  const isMeStudying = store.isTimerRunning(me);
  const viewingTodaySecs = store.getTodayStudySeconds(viewUser);
  const viewingTotalSecs = store.getTotalStudySeconds(viewUser);
  const partnerTodaySecs = partner ? store.getTodayStudySeconds(partner) : 0;
  const isPartnerStudying = partner ? store.isTimerRunning(partner) : false;

  const liveTargetData = store.dataOf(viewUser) ?? data;
  const currentSessionSecs =
    liveTargetData.activeTimer?.isRunning && liveTargetData.activeTimer.startedAt > 0
      ? Math.max(0, Math.floor((Date.now() - liveTargetData.activeTimer.startedAt) / 1000))
      : 0;

  const handleSayHi = async () => {
    if (partner) {
      const partnerName = partnerAccount?.displayName || 'Her';
      await store.postWallMessage(`👋 Hi ${partnerName}! Sending you study focus energy! Keep going ❤️`, '👋', me);
      setSayHiToast(`✓ Said Hi to ${partnerName}! Sent to The Wall 💌`);
    } else {
      const code = store.accountOf(me)?.pairCode;
      if (code) {
        await copyToClipboard(code);
        setSayHiToast(`📋 Pair code copied (${code})! Share with your partner to Say Hi live.`);
      } else {
        await store.postWallMessage(`👋 Sending study focus energy! Ready to study today! 🌸`, '👋', me);
        setSayHiToast(`✓ Hi note posted to The Wall! 💌`);
      }
    }
    setTimeout(() => setSayHiToast(null), 3500);
  };

  const formatHMS = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatHMShort = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // countdown + journey (plan start → exam day)
  const exam = examDate();
  const examPretty = new Date(exam + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const examShort = new Date(exam + 'T12:00:00')
    .toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    .toUpperCase();
  const startMs = new Date(data.planStart + 'T12:00:00').getTime();
  const todayMs = new Date(t + 'T12:00:00').getTime();
  const examMs = new Date(exam + 'T12:00:00').getTime();
  const dayN = Math.max(1, Math.round((todayMs - startMs) / 86400000) + 1);
  const journey = Math.min(100, Math.max(2, ((todayMs - startMs) / Math.max(1, examMs - startMs)) * 100));
  const dateLine = new Date(t + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning.' : hour < 17 ? 'Good afternoon.' : 'Good evening.';

  const subjects = (['Physics', 'Chemistry', 'Biology'] as const).map((s) => {
    const all = CHAPTERS.filter((c) => c.subject === s);
    const done = all.filter((c) => (data.completions[c.id] ?? 0) >= 1).length;
    return { s, total: all.length, done };
  });

  return (
    <div className="relative" style={{ color: INK }}>
      <div className="relative mx-auto max-w-[1140px] px-5 pb-24 pt-6 sm:px-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-[40px] font-bold leading-[1.08] max-sm:text-[30px] text-[#1A1126]">
              {greeting}{' '}
              <em className="font-semibold italic text-[#E03E2D]">
                Let's revise.
              </em>
            </h1>
            <p className="mt-1.5 text-[14px] font-medium" style={{ color: MUTED }}>
              {dateLine} · Day {dayN} of the plan{readOnly ? ` · viewing ${viewUser}'s home` : ''}
            </p>
          </div>
          {partner && onSwitch && (
            <PartnerSwitch
              me={me}
              partner={partner}
              partnerName={partnerAccount?.displayName || 'Her'}
              viewUser={viewUser}
              onSwitch={onSwitch}
            />
          )}
        </div>

        {/* Animated Desk Viewport: Smooth directional slide & blur between You and Her */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={viewUser}
            initial={{ opacity: 0, x: readOnly ? 28 : -28, filter: 'blur(3px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: readOnly ? -28 : 28, filter: 'blur(3px)' }}
            transition={{ type: 'spring', stiffness: 290, damping: 28 }}
            className="w-full"
          >
            {/* Countdown + Rings: Wrapped in 3D Perspective Tilt Panels */}
            <div className="mt-6 grid gap-5 lg:grid-cols-[1.22fr_1fr]">
          <Card3D maxTilt={5} scale={1.01} className="rounded-[28px]">
            <section className="rq-panel h-full px-7 py-6 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="rq-eyebrow">DAYS TO NEET · UG {exam.slice(0, 4)}</div>
                    <div className="mt-2 flex items-baseline gap-3">
                      <span className="font-sans text-[74px] font-extrabold leading-[0.95] tracking-tight max-sm:text-[56px] text-[#1A1126] tabular-nums">
                        {daysToExam()}
                      </span>
                      <span className="font-sans text-[22px] font-bold text-[#7E699B]">days left</span>
                    </div>
                    <p className="mt-2 text-[14px] font-medium text-[#1A1126]">
                      <span style={{ color: MUTED }}>Exam day:</span> {examPretty}
                    </p>
                  </div>
                  <div className="hidden sm:block w-36 h-28 flex-none overflow-hidden rounded-2xl border border-white/90 shadow-md group">
                    <img
                      src={mascotHero}
                      alt="DuoStudy Mascot - Built For Two"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5">
                <div className="rq-track">
                  <div
                    className="rq-fill"
                    style={{
                      width: journey + '%',
                      background: 'linear-gradient(90deg, #8B5CF6, #E03E2D)',
                      boxShadow: '0 2px 10px rgba(224, 62, 45, 0.4)',
                    }}
                  />
                  <div className="rq-knob" style={{ left: journey + '%' }} />
                </div>
                <div className="mt-2.5 flex justify-between font-sans text-[11px] font-bold tracking-[0.14em] text-[#9A6D84]">
                  <span>TODAY</span>
                  <span>{examShort}</span>
                </div>
              </div>
            </section>
          </Card3D>

          <Card3D maxTilt={5} scale={1.01} className="rounded-[28px]">
            <section className="rq-panel h-full px-7 py-6 flex flex-col justify-between">
              <div>
                <div className="rq-eyebrow">
                  {partner && partnerData ? 'SYLLABUS PROGRESS · BOTH PROFILES' : 'SYLLABUS PROGRESS · YOUR DESK'}
                </div>

                {partner && partnerData ? (
                  <div className="mt-4 flex items-center justify-around">
                    <Ring
                      pct={syllabusPct(myData)}
                      colorFrom="#8B5CF6"
                      colorTo="#A855F7"
                      id="grad-gold"
                      cap="YOU"
                    />
                    <Ring
                      pct={syllabusPct(partnerData)}
                      colorFrom="#E03E2D"
                      colorTo="#D63031"
                      id="grad-rose"
                      cap={partnerAccount?.displayName?.toUpperCase() || 'PARTNER'}
                    />
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex-none">
                      <Ring
                        pct={syllabusPct(myData)}
                        colorFrom="#8B5CF6"
                        colorTo="#A855F7"
                        id="grad-gold"
                        cap="YOU"
                      />
                    </div>
                    <div className="flex-1 rounded-2xl border border-purple-200/70 bg-purple-50/60 p-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-[#8B5CF6]">
                          Connect Partner Desk
                        </span>
                      </div>
                      <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-[#6B5B84]">
                        Dual progress rings and real-time co-study metrics unlock after synchronizing both accounts.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="rounded-lg border border-purple-200 bg-white px-2.5 py-1 font-mono text-[12.5px] font-extrabold text-[#1A1126] shadow-2xs">
                          {store.accountOf(me)?.pairCode || 'PAIR CODE'}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            const code = store.accountOf(me)?.pairCode;
                            if (code) {
                              const ok = await copyToClipboard(code);
                              if (ok) {
                                setCopyPairSuccess(true);
                                setTimeout(() => setCopyPairSuccess(false), 2000);
                              }
                            }
                          }}
                          className="cursor-pointer rounded-lg bg-[#8B5CF6] px-3 py-1 font-sans text-[11.5px] font-bold text-white shadow-2xs hover:bg-[#7C3AED] transition"
                        >
                          {copyPairSuccess ? '✓ Copied' : 'Copy Code'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5 flex flex-col items-center">
                <button
                  type="button"
                  onClick={handleSayHi}
                  className="group relative cursor-pointer rounded-full border border-rose-300/80 bg-gradient-to-r from-white via-rose-50 to-white px-6 py-2.5 font-sans text-[13px] font-extrabold text-[#241830] shadow-sm transition hover:border-[#FF2E79] hover:shadow-md active:scale-95"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[16px]">👋</span>
                    <span>
                      {sayHiToast
                        ? sayHiToast
                        : partner
                        ? `Say Hi to ${partnerAccount?.displayName || 'Partner'}!`
                        : '👋 Say Hi (Pair Partner)'}
                    </span>
                  </span>
                </button>
              </div>
            </section>
          </Card3D>
        </div>

        {/* Real-time Study Tracker & Session Stopwatch */}
        <section className="rq-panel mt-5 p-6 sm:p-7 relative overflow-hidden rounded-[28px] border border-white/90 shadow-[0_8px_32px_rgba(36,24,48,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/60 pb-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 text-[22px] shadow-sm">
                ⏱️
              </span>
              <div>
                <div className="rq-eyebrow">NEET STUDY SESSION TRACKER</div>
                <h2 className="font-display text-[22px] font-bold text-[#1A1126]">
                  {readOnly
                    ? `${partnerAccount?.displayName || viewUser}'s Study Desk`
                    : 'Live Study Stopwatch'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-sans text-[11.5px] font-bold ${
                  isViewingUserStudying
                    ? 'bg-emerald-500 text-white shadow-[0_0_14px_rgba(16,185,129,0.45)]'
                    : 'bg-white/80 text-[#7E699B] border border-white/80'
                }`}
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    isViewingUserStudying ? 'bg-white animate-ping' : 'bg-slate-400'
                  }`}
                />
                {isViewingUserStudying ? 'STUDYING RIGHT NOW' : 'DESK IDLE / RESTING'}
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-[1.25fr_1fr] items-center">
            {/* Left: Stopwatch Display & Main Button */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="text-center sm:text-left">
                <div className="font-mono text-[52px] sm:text-[62px] font-black tracking-tight leading-none text-[#1A1126] tabular-nums">
                  {isViewingUserStudying
                    ? formatHMS(currentSessionSecs)
                    : formatHMS(viewingTodaySecs)}
                </div>
                <div className="mt-2 font-sans text-[11.5px] font-bold tracking-wider text-[#9A6D84] uppercase">
                  {isViewingUserStudying
                    ? 'Current Active Session'
                    : "Today's Total Studied Time"}
                </div>
              </div>

              <div className="sm:ml-auto flex flex-col gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (isMeStudying) {
                      store.stopStudyTimer(me);
                    } else {
                      store.startStudyTimer(me);
                    }
                    setTick((prev) => prev + 1);
                  }}
                  className={`cursor-pointer rounded-2xl px-7 py-3.5 font-sans text-[14px] font-extrabold shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center gap-2.5 select-none ${
                    isMeStudying
                      ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white hover:brightness-110 shadow-rose-500/25 ring-2 ring-rose-400/50'
                      : 'bg-gradient-to-r from-[#E03E2D] to-[#FF2E79] text-white hover:brightness-110 shadow-red-500/30'
                  }`}
                >
                  <span className="text-[17px]">{isMeStudying ? '⏸' : '▶'}</span>
                  <span>
                    {isMeStudying
                      ? readOnly
                        ? 'Stop Your Timer'
                        : 'Stop & Log Session'
                      : readOnly
                      ? 'Start Your Timer'
                      : 'Start Studying'}
                  </span>
                </button>
                <span className="text-center font-sans text-[11px] font-semibold text-[#8C6C82]">
                  {isMeStudying
                    ? 'Timer counting up live. Stop when taking a break!'
                    : 'Click when you begin studying a chapter.'}
                </span>
              </div>
            </div>

              {/* Right: Metrics & Partner Co-study stats */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/80 bg-white/60 p-4">
                <div className="rounded-xl bg-white/80 p-3.5 text-center border border-purple-100/80 shadow-2xs">
                  <div className="font-sans text-[22px] font-black text-[#1A1126] tabular-nums">
                    {formatHMShort(viewingTodaySecs)}
                  </div>
                  <div className="mt-1 font-sans text-[10.5px] font-bold text-[#8C6C82] tracking-wider uppercase">
                    Today's Hours
                  </div>
                </div>

                <div className="rounded-xl bg-white/80 p-3.5 text-center border border-purple-100/80 shadow-2xs">
                  <div className="font-sans text-[22px] font-black text-[#E03E2D] tabular-nums">
                    {formatHMShort(viewingTotalSecs)}
                  </div>
                  <div className="mt-1 font-sans text-[10.5px] font-bold text-[#8C6C82] tracking-wider uppercase">
                    All-Time Hours
                  </div>
                </div>

                {partner && partnerAccount && (
                  <div className="col-span-2 mt-1 rounded-xl bg-purple-50/70 p-2.5 flex items-center justify-between border border-purple-100/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full flex-none ${isPartnerStudying ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
                      <span className="truncate text-[12px] font-bold text-[#38254A]">
                        {partnerAccount.displayName}'s Today:
                      </span>
                    </div>
                    <span className="font-sans text-[13px] font-black text-[#1A1126] tabular-nums flex-none">
                      {formatHMShort(partnerTodaySecs)}
                      {isPartnerStudying && (
                        <span className="ml-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-100/80 px-1.5 py-0.5 rounded-md">● Live</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>

        {/* Sanctuary Focus Portal Banner */}
        {onGoSanctuary && (
          <div className="mt-5 overflow-hidden rounded-[26px] border border-[#d9a58855] bg-gradient-to-r from-[#17120e] via-[#261c16] to-[#120e0b] p-5 sm:p-6 text-[#fffdf8] shadow-[0_12px_36px_rgba(26,17,38,0.18)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d9a58825] border border-[#d9a58860] text-[#d9a588] text-[20px] shadow-inner">
                  ✦
                </div>
                <div>
                  <div className="font-sans text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-[#d9a588]">
                    FOCUS SANCTUARY & STILLNESS
                  </div>
                  <h3 className="font-serif text-[20px] font-normal tracking-tight text-[#fffdf8]">
                    SERRA — A Sanctuary Within Stone
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-[#d6c8bc]/85">
                    Continuous scroll-controlled architectural camera journey & stillness retreat for deep revision.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoSanctuary}
                className="cursor-pointer rounded-full bg-gradient-to-r from-[#d9a588] to-[#e6b69b] px-5 py-2.5 font-sans text-[12.5px] font-bold text-[#1a110b] shadow-[0_4px_16px_rgba(217,165,136,0.35)] transition hover:brightness-105 active:scale-95"
              >
                Enter Stone Sanctuary →
              </button>
            </div>
          </div>
        )}

        {/* 4-Tile Stat Strip with 3D Hover Polish */}
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card3D maxTilt={4} scale={1.015} className="rounded-[22px]">
            <div className="rq-panel px-6 py-4">
              <div className="font-sans text-[30px] font-bold leading-none tracking-tight text-[#241830] tabular-nums">
                {TOTAL}
              </div>
              <div className="rq-stat-label mt-2">TOTAL CHAPTERS</div>
            </div>
          </Card3D>

          <Card3D maxTilt={4} scale={1.015} className="rounded-[22px]">
            <div className="rq-panel px-6 py-4">
              <div className="grid grid-cols-3">
                {subjects.map(({ s, total }) => (
                  <div key={s} className="text-center">
                    <div className="font-sans text-[22px] font-bold leading-none tracking-tight text-[#241830] tabular-nums">
                      {total}
                    </div>
                    <div
                      className="mt-1.5 font-sans text-[10px] font-bold uppercase tracking-[0.1em]"
                      style={{ color: MUTED }}
                    >
                      {s === 'Chemistry' ? 'Chem' : s}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card3D>

          <Card3D maxTilt={4} scale={1.015} className="rounded-[22px]">
            <div className="rq-panel px-6 py-4">
              <div
                className="font-sans text-[30px] font-bold leading-none tracking-tight tabular-nums"
                style={{ color: ROSE }}
              >
                {stagesDone}
              </div>
              <div className="rq-stat-label mt-2">
                STAGES DONE ({readOnly ? (partnerAccount?.displayName?.toUpperCase() || 'PARTNER') : 'YOU'})
              </div>
            </div>
          </Card3D>

          <Card3D maxTilt={4} scale={1.015} className="rounded-[22px]">
            <div className="rq-panel px-6 py-4">
              <div className="font-sans text-[30px] font-bold leading-none tracking-tight text-[#241830] tabular-nums">
                {TOTAL * 2}
              </div>
              <div className="rq-stat-label mt-2">TOTAL STAGES</div>
            </div>
          </Card3D>
        </div>

        {/* Due Today + Subjects: Elevated Glass Panels */}
        <div className="mt-5 grid items-stretch gap-5 lg:grid-cols-[1.22fr_1fr]">
          <section className="rq-panel h-full px-7 py-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-[22px] font-bold text-[#241830]">
                Due today, in the plan's order
              </h2>
              <span className="rounded-full bg-white/80 px-3 py-1 text-[12px] font-bold text-[#8C6C82] shadow-sm border border-white/60">
                {doneSet.size} of {todays.length} done
              </span>
              {!readOnly && (
                <button
                  onClick={() => setSearch(true)}
                  className="rq-rosebtn ml-auto rounded-full px-4 py-2 text-[12.5px] font-bold"
                >
                  ＋ Add a chapter
                </button>
              )}
            </div>
            <div className="mt-4">
              {todays.length === 0 && (
                <p className="py-4 text-[14px] font-medium" style={{ color: MUTED }}>
                  Nothing assigned today. The first pass is complete, or the plan starts tomorrow. Add any chapter
                  to revise it again.
                </p>
              )}
              {todays.map((id, i) => {
                const c = byId(id);
                const done = doneSet.has(id);
                const open = openId === id;
                const assigned =
                  store.assignedListOn(data, t).includes(id) || (done && !(data.todayAdds[t] ?? []).includes(id));
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="mt-2.5 rounded-2xl border border-white/85 bg-white/75 p-3.5 shadow-[0_2px_8px_-2px_rgba(36,24,48,0.04)] transition hover:bg-white/95 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <span className="rq-tag flex-none max-sm:hidden">{c.subject.toUpperCase()}</span>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setOpenId(open ? null : id)}
                          className="block w-full cursor-pointer truncate text-left text-[14.5px] font-semibold text-[#241830]"
                          aria-expanded={open}
                          title="See subtopics"
                        >
                          <span className={done ? 'line-through opacity-50' : ''}>{c.name}</span>
                        </button>
                        <div className="text-[10.5px] font-semibold tracking-[0.06em] text-[#8C6C82]">
                          <span className="sm:hidden">{c.subject.toUpperCase()} · </span>
                          {assigned ? "TODAY'S CHAPTER" : 'ADDED BY YOU'} · {topicCount(id)} TOPICS
                          {(data.completions[id] ?? 0) >= 1 && !done ? ' · REVISION 2' : ''}
                        </div>
                      </div>
                      {readOnly ? (
                        <span
                          className={`flex-none rounded-full px-3 py-1 text-[12px] font-bold ${
                            done ? 'text-white' : ''
                          }`}
                          style={
                            done
                              ? { background: ROSE }
                              : { background: 'rgba(255,255,255,.85)', color: MUTED }
                          }
                        >
                          {done ? 'Done' : 'Pending'}
                        </span>
                      ) : (
                        <>
                          <Toggle small on={done} onClick={() => store.toggleDone(me, id)} />
                          <button
                            type="button"
                            title="Remove from today"
                            aria-label={`Remove ${c.name} from today's planner`}
                            onClick={() => store.removeFromToday(me, id)}
                            className="shrink-0 rounded-full px-2 text-[14px] font-bold leading-none transition hover:text-[#FF2E79] text-[#8C6C82]"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </div>
                    {open && <TopicsChips id={id} />}
                  </motion.div>
                );
              })}
            </div>
          </section>

          <section className="rq-panel h-full px-7 py-6">
            <h2 className="font-display text-[22px] font-bold text-[#241830]">Subjects</h2>
            {subjects.map(({ s, total, done }) => (
              <div
                key={s}
                className="mt-3.5 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-[0_2px_8px_-2px_rgba(36,24,48,0.03)] transition hover:bg-white/90"
              >
                <div className="font-display text-[17px] font-bold text-[#241830]">{s}</div>
                <div className="mt-0.5 text-[12.5px] font-medium text-[#8C6C82]">
                  {done} of {total} chapters complete
                </div>
                <div className="rq-bar mt-2.5">
                  <i
                    style={{
                      width: Math.max(2, (done / total) * 100) + '%',
                      background: 'linear-gradient(90deg, #FFB340, #FF2E79)',
                    }}
                  />
                </div>
              </div>
            ))}
          </section>
        </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <SearchModal
        open={search}
        onClose={() => setSearch(false)}
        exclude={todays}
        onAdd={(id) => store.addToToday(me, id)}
      />
    </div>
  );
}
