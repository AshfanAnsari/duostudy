import { useEffect, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'motion/react';
import { store } from './lib/store';
import { sound } from './lib/audio';
import { KineticLoader, SearchModal } from './components/ui';
import Auth from './views/Auth';
import Home from './views/Home';
import Subject from './views/Subject';
import { Stats, ChapterList } from './views/Stats';
import Planner from './views/Planner';
import Wall from './views/Wall';
import Profile from './views/Profile';
import Sanctuary from './views/Sanctuary';
import Dock, { type View } from './components/Dock';

function Shell() {
  useSyncExternalStore(store.subscribe, store.getSnapshot);
  const me = store.me();
  const [screen, setScreen] = useState<'auth' | 'app'>(() => (store.me() ? 'app' : 'auth'));
  const [booted, setBooted] = useState(false);
  const [view, setView] = useState<View>('home');
  const [viewUser, setViewUser] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState(false);

  useEffect(() => {
    if (store.ready && !booted) {
      setBooted(true);
      setScreen(store.me() ? 'app' : 'auth');
    }
  }, [booted, store.ready]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearch((prev) => !prev);
      } else if (
        e.key === '/' &&
        (e.target as HTMLElement).tagName !== 'INPUT' &&
        (e.target as HTMLElement).tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setGlobalSearch(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  if (!store.ready) return <KineticLoader text="Loading DuoStudy..." />;

  if (screen === 'auth' || !me) {
    return (
      <Auth
        onDone={() => {
          store.ensureActiveAccount('ashfan');
          setScreen('app');
        }}
      />
    );
  }

  // ✦ Dedicated Sanctuary Experience (Continuous Scroll Focus Retreat)
  if (view === 'sanctuary') {
    return <Sanctuary onExit={() => setView('home')} />;
  }

  const viewing = viewUser ?? me.username;
  const data = store.dataOf(viewing)!;
  const partnerView = viewing !== me.username;
  const partner = store.accountOf(me.username)?.partner;
  const partnerAccount = partner ? store.accountOf(partner) : null;
  const go = (v: View) => setView(v);

  return (
    <div className="relative min-h-screen">
      {/* Rose Quartz wash app-wide */}
      <div aria-hidden className="rq-wash fixed inset-0 pointer-events-none" />

      {/* Persistent Dock navigation */}
      <Dock
        view={view}
        go={go}
        username={me.username}
        partnerView={partnerView}
        exitPartner={() => {
          setViewUser(null);
          setView('home');
        }}
      />

      <main className="relative z-[1] sm:pl-[92px]">
        {/* Animated Partner Desk Inspection Floating Capsule */}
        <AnimatePresence>
          {partnerView && (
            <motion.div
              initial={{ y: -24, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -24, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 420, damping: 28 }}
              className="mx-auto max-w-[1060px] px-5 pt-6 sm:px-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-300/80 bg-white/90 px-4 py-2.5 text-[13px] font-bold text-[#241830] shadow-[0_8px_28px_rgba(255,46,121,0.2)] backdrop-blur-xl">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF2E79] opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FF2E79]" />
                  </span>
                  <span>
                    Viewing <strong>{partnerAccount?.displayName || viewing}</strong>'s study desk{' '}
                    <span className="font-normal text-[#7E699B]">(Live synchronized · Read-only)</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.playSwitchDesk(false);
                    setViewUser(null);
                  }}
                  className="cursor-pointer rounded-full bg-gradient-to-r from-[#241830] to-[#3B2050] px-4 py-1.5 text-[11.5px] font-bold text-white shadow-sm transition hover:shadow-md active:scale-95"
                >
                  ← Return to Your Desk
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {view === 'home' && (
          <Home
            me={me.username}
            data={data}
            viewUser={viewing}
            onSwitch={(u) => setViewUser(u === me.username ? null : u)}
            onGoSanctuary={() => setView('sanctuary')}
          />
        )}
        {view === 'physics' && (
          <Subject me={me.username} data={data} subject="Physics" viewUser={viewing} />
        )}
        {view === 'chemistry' && (
          <Subject me={me.username} data={data} subject="Chemistry" viewUser={viewing} />
        )}
        {view === 'biology' && (
          <Subject me={me.username} data={data} subject="Biology" viewUser={viewing} />
        )}
        {view === 'stats' && <Stats data={data} />}
        {view === 'completed' && (
          <ChapterList me={me.username} data={data} kind="completed" viewUser={viewing} />
        )}
        {view === 'pending' && (
          <ChapterList me={me.username} data={data} kind="pending" viewUser={viewing} />
        )}
        {view === 'all' && (
          <ChapterList me={me.username} data={data} kind="all" viewUser={viewing} />
        )}
        {view === 'planner' && (
          <Planner
            me={me.username}
            data={data}
            viewUser={viewing}
            onSwitch={(u) => setViewUser(u === me.username ? null : u)}
          />
        )}
        {view === 'wall' && <Wall me={me.username} />}
        {view === 'profile' && !partnerView && (
          <Profile
            me={me.username}
            onViewPartner={() => {
              const p = store.accountOf(me.username)?.partner;
              if (p) {
                setViewUser(p);
                setView('home');
              }
            }}
            onSignOut={() => {
              store.signout();
              setViewUser(null);
              setView('home');
              setScreen('auth');
            }}
          />
        )}
        {view === 'profile' && partnerView && (
          <div className="mx-auto max-w-[760px] px-5 pt-10 font-bold text-mauve sm:px-8">
            Profiles stay private, even from partners.
          </div>
        )}
      </main>

      <SearchModal
        open={globalSearch}
        onClose={() => setGlobalSearch(false)}
        exclude={store.todaysChapters(data)}
        onAdd={(id) => {
          store.addToToday(me.username, id);
          setGlobalSearch(false);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Shell />
    </MotionConfig>
  );
}
