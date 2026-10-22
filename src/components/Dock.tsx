import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export type View =
  | 'home'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'stats'
  | 'planner'
  | 'wall'
  | 'profile'
  | 'completed'
  | 'pending'
  | 'all'
  | 'sanctuary';

const I = ({ d, extra }: { d: string; extra?: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    className="h-[22px] w-[22px]"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
    {extra}
  </svg>
);

const ICONS: Record<string, React.ReactNode> = {
  home: <I d="M4 11 L12 4 L20 11 M6 9.5 V20 H18 V9.5" />,
  book: <I d="M5 4 h11 a3 3 0 0 1 3 3 v13 H8 a3 3 0 0 1 -3 -3 Z M5 17 a3 3 0 0 1 3 -3 h11" />,
  stats: <I d="M4 20 V10 M10 20 V4 M16 20 v-8 M21 20 H3" />,
  planner: (
    <I
      d=""
      extra={
        <>
          <rect x="4" y="5" width="16" height="16" rx="3" />
          <path d="M4 10 h16 M8 3 v4 M16 3 v4 M9 16 l2 2 4 -4" />
        </>
      }
    />
  ),
  wall: <I d="M4 5 h16 v11 H9 l-5 4 Z" />,
  grid: (
    <I
      d=""
      extra={
        <>
          <rect x="4" y="4" width="7" height="7" rx="2" />
          <rect x="13" y="4" width="7" height="7" rx="2" />
          <rect x="4" y="13" width="7" height="7" rx="2" />
          <rect x="13" y="13" width="7" height="7" rx="2" />
        </>
      }
    />
  ),
  check: <I d="M4 12.5 L9.5 18 L20 6.5" />,
  clock: (
    <I
      d=""
      extra={
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5 V12 l3 2" />
        </>
      }
    />
  ),
  sanctuary: (
    <I
      d="M12 2.5 L3.5 9.5 v11.5 h17 V9.5 Z M9 21 V12.5 h6 V21"
    />
  ),
};

const INK = '#1A1126';
const BALL_BG = 'linear-gradient(165deg, #E03E2D, #C0392B)';
const BALL_SHADOW =
  '0 6px 20px -3px rgba(224,62,45,0.45), inset 0 1px 0 rgba(255,255,255,0.4)';

const Ball = ({ id, radius }: { id: string; radius: string }) => (
  <motion.span
    layoutId={id}
    aria-hidden
    className={`absolute inset-0 ${radius}`}
    style={{ background: BALL_BG, boxShadow: BALL_SHADOW }}
    transition={{ type: 'spring', stiffness: 520, damping: 36 }}
  />
);

const SUBJECTS: { v: View; label: string; color: string }[] = [
  { v: 'physics', label: 'Physics', color: '#8B5CF6' },
  { v: 'chemistry', label: 'Chemistry', color: '#F59E0B' },
  { v: 'biology', label: 'Biology', color: '#E03E2D' },
];

const MORE_LISTS: { v: View; label: string; icon: string }[] = [
  { v: 'completed', label: 'Completed', icon: 'check' },
  { v: 'pending', label: 'Pending', icon: 'clock' },
  { v: 'all', label: 'All 93 Chapters', icon: 'grid' },
  { v: 'sanctuary', label: 'Stone Sanctuary', icon: 'sanctuary' },
];

const MOBILE_LISTS: { v: View; label: string }[] = [
  { v: 'stats', label: 'Stats & Revisions' },
  { v: 'sanctuary', label: '✦ Stone Sanctuary · Stillness' },
  { v: 'completed', label: 'Completed Chapters' },
  { v: 'pending', label: 'Pending Chapters' },
  { v: 'all', label: 'All 93 Chapters' },
];

// ── Static Helper Components (Declared outside of render to prevent remount glitches) ──
function DesktopItem({
  v,
  icon,
  label,
  active,
  onClick,
}: {
  v: View;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: (v: View) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(v)}
      title={label}
      className="group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer"
    >
      {active && <Ball id="dock-ball" radius="rounded-2xl" />}
      <span
        className="relative z-[1] transition-colors duration-200"
        style={{ color: active ? '#FFFFFF' : INK }}
      >
        {icon}
      </span>
      <span
        className="pointer-events-none absolute left-[56px] z-[90] origin-left scale-90 whitespace-nowrap rounded-full px-3 py-1.5 font-sans text-[11.5px] font-bold text-white opacity-0 shadow-xl transition-all duration-150 group-hover:scale-100 group-hover:opacity-100"
        style={{ background: INK }}
      >
        {label}
      </span>
    </button>
  );
}

function SubItem({
  v,
  label,
  color,
  active,
  onClick,
}: {
  v: View;
  label: string;
  color: string;
  active: boolean;
  onClick: (v: View) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(v)}
      className={`flex h-10 w-full items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 font-sans text-[13px] font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
        active ? 'text-white shadow-md' : 'hover:bg-white/70'
      }`}
      style={active ? { background: BALL_BG, color: '#FFFFFF' } : { color: INK }}
    >
      <span
        className="h-2.5 w-2.5 flex-none rounded-full"
        style={{ background: active ? '#FFFFFF' : color }}
      />
      <span>{label}</span>
    </button>
  );
}

function MobileItem({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 transition-transform duration-150 active:scale-90 cursor-pointer"
      aria-label={label}
    >
      {active && <Ball id="dock-ball-m" radius="rounded-2xl" />}
      <span
        className="relative z-[1] transition-colors duration-200"
        style={{ color: active ? '#FFFFFF' : INK }}
      >
        {icon}
      </span>
      <span
        className="relative z-[1] font-sans text-[10px] font-bold tracking-tight transition-colors duration-200"
        style={{ color: active ? '#FFFFFF' : INK }}
      >
        {label}
      </span>
    </button>
  );
}

export default function Dock({
  view,
  go,
  username,
  partnerView,
  exitPartner,
}: {
  view: View;
  go: (v: View) => void;
  username: string;
  partnerView: boolean;
  exitPartner: () => void;
}) {
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const dockRef = useRef<HTMLElement | null>(null);
  const mobileDockRef = useRef<HTMLElement | null>(null);

  // Mutually exclusive active key calculation for desktop
  const desktopActiveKey =
    view === 'home'
      ? 'home'
      : ['physics', 'chemistry', 'biology'].includes(view)
      ? 'subjects'
      : view === 'planner'
      ? 'planner'
      : view === 'wall'
      ? 'wall'
      : view === 'stats'
      ? 'stats'
      : view === 'sanctuary'
      ? 'sanctuary'
      : ['completed', 'pending', 'all'].includes(view)
      ? 'more'
      : view === 'profile'
      ? 'profile'
      : 'home';

  // Mutually exclusive active key calculation for mobile
  const mobileActiveKey =
    view === 'home'
      ? 'home'
      : ['physics', 'chemistry', 'biology'].includes(view)
      ? 'subjects'
      : ['completed', 'pending', 'all', 'stats'].includes(view)
      ? 'lists'
      : view === 'planner'
      ? 'planner'
      : view === 'wall'
      ? 'wall'
      : view === 'sanctuary'
      ? 'sanctuary'
      : view === 'profile'
      ? 'profile'
      : 'home';

  // Click outside listener to dismiss flyouts reliably
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      const insideDesktop = dockRef.current && dockRef.current.contains(target);
      const insideMobile = mobileDockRef.current && mobileDockRef.current.contains(target);
      if (!insideDesktop && !insideMobile) {
        setSubjectsOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  const pick = (v: View) => {
    go(v);
    setSubjectsOpen(false);
    setMoreOpen(false);
  };

  return (
    <>
      {/* Desktop: Vertical Rose Quartz Dock */}
      <nav
        ref={dockRef}
        className="rq-panel fixed left-4 top-1/2 z-[60] flex -translate-y-1/2 flex-col items-center gap-1.5 p-2 max-sm:hidden"
        style={{
          borderRadius: 24,
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          boxShadow: '0 20px 48px -16px rgba(71, 28, 43, 0.22), inset 0 1.5px 0 rgba(255,255,255,0.95)',
        }}
        aria-label="Sidebar Navigation"
      >
        <DesktopItem v="home" icon={ICONS.home} label="Home Dashboard" active={desktopActiveKey === 'home'} onClick={pick} />

        {/* Subjects Popover Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setSubjectsOpen((prev) => !prev);
              setMoreOpen(false);
            }}
            title="Syllabus Subjects"
            aria-expanded={subjectsOpen}
            className="group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer"
          >
            {desktopActiveKey === 'subjects' && <Ball id="dock-ball" radius="rounded-2xl" />}
            <span
              className="relative z-[1] transition-colors duration-200"
              style={{ color: desktopActiveKey === 'subjects' ? '#FFFFFF' : INK }}
            >
              {ICONS.book}
            </span>
            {subjectsOpen && desktopActiveKey !== 'subjects' && (
              <span aria-hidden className="absolute inset-0 rounded-2xl bg-white/70 shadow-sm" />
            )}
            {!subjectsOpen && (
              <span
                className="pointer-events-none absolute left-[56px] z-[90] origin-left scale-90 whitespace-nowrap rounded-full px-3 py-1.5 font-sans text-[11.5px] font-bold text-white opacity-0 shadow-xl transition-all duration-150 group-hover:scale-100 group-hover:opacity-100"
                style={{ background: INK }}
              >
                Subjects
              </span>
            )}
          </button>

          <AnimatePresence>
            {subjectsOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="rq-panel absolute left-[56px] top-0 z-[100] flex flex-col gap-1.5 p-2 shadow-2xl"
                style={{
                  borderRadius: 20,
                  minWidth: 165,
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#7E699B]">
                  Syllabus
                </div>
                {SUBJECTS.map((s) => (
                  <SubItem
                    key={s.v}
                    v={s.v}
                    label={s.label}
                    color={s.color}
                    active={view === s.v}
                    onClick={pick}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DesktopItem v="planner" icon={ICONS.planner} label="Today's Planner" active={desktopActiveKey === 'planner'} onClick={pick} />
        <DesktopItem v="wall" icon={ICONS.wall} label="The Wall" active={desktopActiveKey === 'wall'} onClick={pick} />
        <DesktopItem v="stats" icon={ICONS.stats} label="Stats & Revisions" active={desktopActiveKey === 'stats'} onClick={pick} />
        <DesktopItem v="sanctuary" icon={ICONS.sanctuary} label="Stone Sanctuary · Stillness" active={desktopActiveKey === 'sanctuary'} onClick={pick} />

        {/* More Lists Trigger */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setMoreOpen((prev) => !prev);
              setSubjectsOpen(false);
            }}
            title="Chapter Lists"
            aria-expanded={moreOpen}
            className="group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 active:scale-95 cursor-pointer"
          >
            {desktopActiveKey === 'more' && <Ball id="dock-ball" radius="rounded-2xl" />}
            <span
              className="relative z-[1] transition-colors duration-200"
              style={{ color: desktopActiveKey === 'more' ? '#FFFFFF' : INK }}
            >
              {ICONS.grid}
            </span>
            {moreOpen && desktopActiveKey !== 'more' && (
              <span aria-hidden className="absolute inset-0 rounded-2xl bg-white/70 shadow-sm" />
            )}
            {!moreOpen && (
              <span
                className="pointer-events-none absolute left-[56px] z-[90] origin-left scale-90 whitespace-nowrap rounded-full px-3 py-1.5 font-sans text-[11.5px] font-bold text-white opacity-0 shadow-xl transition-all duration-150 group-hover:scale-100 group-hover:opacity-100"
                style={{ background: INK }}
              >
                Chapter Lists
              </span>
            )}
          </button>

          <AnimatePresence>
            {moreOpen && (
              <motion.div
                initial={{ opacity: 0, x: -8, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="rq-panel absolute left-[56px] bottom-0 z-[100] flex flex-col gap-1 p-2 shadow-2xl"
                style={{
                  borderRadius: 20,
                  minWidth: 175,
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#7E699B]">
                  Navigation
                </div>
                {MORE_LISTS.map((m) => (
                  <button
                    key={m.v}
                    type="button"
                    onClick={() => pick(m.v)}
                    className={`flex h-10 w-full items-center gap-2.5 rounded-xl px-3 font-sans text-[13px] font-bold transition-all duration-150 active:scale-95 cursor-pointer ${
                      view === m.v ? 'bg-[#E03E2D] text-white shadow-md' : 'text-[#1A1126] hover:bg-white/70'
                    }`}
                  >
                    <span>{ICONS[m.icon]}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile Avatar Button */}
        <div className="mt-1.5 border-t border-purple-200/50 pt-2">
          <button
            type="button"
            onClick={() => pick('profile')}
            title="Profile & Settings"
            className="group relative flex h-10 w-10 items-center justify-center rounded-2xl font-sans text-[15px] font-extrabold text-white shadow-md transition-transform duration-200 active:scale-90 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #E03E2D)',
              boxShadow:
                desktopActiveKey === 'profile'
                  ? '0 0 0 3px #E03E2D, 0 8px 20px rgba(224,62,45,0.4)'
                  : '0 4px 12px rgba(139,92,246,0.25)',
            }}
          >
            {username.slice(0, 1).toUpperCase()}
            <span
              className="pointer-events-none absolute left-[56px] z-[90] origin-left scale-90 whitespace-nowrap rounded-full px-3 py-1.5 font-sans text-[11.5px] font-bold text-white opacity-0 shadow-xl transition-all duration-150 group-hover:scale-100 group-hover:opacity-100"
              style={{ background: INK }}
            >
              Profile Settings
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile: Bottom Dock */}
      <nav
        ref={mobileDockRef}
        className="rq-panel fixed inset-x-3 bottom-3 z-[60] flex items-stretch gap-1 px-1.5 py-1 sm:hidden"
        style={{
          borderRadius: 22,
          background: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(20px) saturate(1.8)',
          boxShadow: '0 16px 36px -10px rgba(71, 28, 43, 0.25)',
        }}
        aria-label="Mobile Navigation"
      >
        <MobileItem icon={ICONS.home} label="Home" active={mobileActiveKey === 'home'} onClick={() => pick('home')} />
        <MobileItem
          icon={ICONS.book}
          label="Subjects"
          active={mobileActiveKey === 'subjects'}
          onClick={() => {
            setSubjectsOpen(!subjectsOpen);
            setMoreOpen(false);
          }}
        />
        <MobileItem
          icon={ICONS.grid}
          label="Lists"
          active={mobileActiveKey === 'lists'}
          onClick={() => {
            setMoreOpen(!moreOpen);
            setSubjectsOpen(false);
          }}
        />
        <MobileItem
          icon={ICONS.planner}
          label="Planner"
          active={mobileActiveKey === 'planner'}
          onClick={() => pick('planner')}
        />
        <MobileItem icon={ICONS.wall} label="Wall" active={mobileActiveKey === 'wall'} onClick={() => pick('wall')} />
        <MobileItem
          label="Profile"
          active={mobileActiveKey === 'profile'}
          onClick={() => pick('profile')}
          icon={
            <span
              className="flex h-[20px] w-[20px] items-center justify-center rounded-full font-sans text-[11px] font-bold text-white shadow-xs"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #E03E2D)' }}
            >
              {username.slice(0, 1).toUpperCase()}
            </span>
          }
        />

        {/* Mobile Subjects popover */}
        <AnimatePresence>
          {subjectsOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="rq-panel absolute bottom-[calc(100%+10px)] left-1/2 flex -translate-x-1/2 gap-2 p-2 shadow-2xl"
              style={{ borderRadius: 20, background: 'rgba(255, 255, 255, 0.95)' }}
            >
              {SUBJECTS.map((s) => (
                <button
                  key={s.v}
                  type="button"
                  onClick={() => pick(s.v)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-[12px] font-bold transition active:scale-95 ${
                    view === s.v ? 'bg-[#E03E2D] text-white shadow-md' : 'bg-white/80 text-[#1A1126]'
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: view === s.v ? '#FFFFFF' : s.color }}
                  />
                  {s.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Lists popover */}
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="rq-panel absolute bottom-[calc(100%+10px)] left-1/2 flex -translate-x-1/2 flex-col gap-1.5 p-2 shadow-2xl min-w-[190px]"
              style={{ borderRadius: 20, background: 'rgba(255, 255, 255, 0.95)' }}
            >
              {MOBILE_LISTS.map((m) => (
                <button
                  key={m.v}
                  type="button"
                  onClick={() => pick(m.v)}
                  className={`rounded-xl px-3 py-2 text-left font-sans text-[12px] font-bold transition active:scale-95 ${
                    view === m.v ? 'bg-[#E03E2D] text-white shadow-md' : 'bg-white/80 text-[#1A1126] hover:bg-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Persistent Read-Only Partner Exit Banner */}
      {partnerView && (
        <button
          type="button"
          onClick={exitPartner}
          className="rq-rosebtn fixed right-5 top-5 z-[70] rounded-full px-5 py-2.5 font-sans text-[13px] font-bold shadow-2xl transition-transform duration-200 active:scale-95 cursor-pointer"
        >
          ← Return to My Desk
        </button>
      )}
    </>
  );
}
