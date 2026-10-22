import { useState } from 'react';
import { store } from '../lib/store';
import { WaveGrid } from './StartWaveGrid';
import { KineticLoader } from '../components/ui';
import mascotHero from '../assets/mascot_hero.jpg';

export default function Auth({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pairCode, setPairCode] = useState('');
  const [error, setError] = useState('');
  const [busyText, setBusyText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanUser = username.trim().toLowerCase();
    if (!cleanUser) {
      setError('Please provide a username.');
      return;
    }
    if (cleanUser.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }
    if (!password) {
      setError('Please provide your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      if (mode === 'in') {
        setBusyText('Verifying credentials...');
        const err = await store.signin(cleanUser, password);
        setBusyText('');
        if (err) {
          setError(err);
          return;
        }
      } else {
        setBusyText('Creating your desk...');
        const err = await store.signup(cleanUser, password, pairCode.trim() || undefined);
        setBusyText('');
        if (err) {
          setError(err);
          return;
        }
      }
      onDone();
    } catch {
      setBusyText('');
      setError('Connection error. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0D0914] text-white">
      {/* 3D Wave Grid Background */}
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-45">
        <WaveGrid />
      </div>

      {/* Ambient Radial Lights */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-[10vw] top-[10vh] h-[50vw] w-[50vw] rounded-full opacity-35 blur-[130px]"
        style={{ background: 'radial-gradient(circle, #FF2E79, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[10vw] bottom-[5vh] h-[45vw] w-[45vw] rounded-full opacity-30 blur-[130px]"
        style={{ background: 'radial-gradient(circle, #FFB340, transparent 70%)' }}
      />

      {/* Top Navbar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-[#FF2E79] to-[#FF758C] font-sans text-[18px] font-extrabold text-white shadow-[0_8px_20px_rgba(255,46,121,0.5)] border border-white/30">
            D
          </span>
          <span className="font-sans text-[15px] font-bold uppercase tracking-[0.16em] text-white">
            DuoStudy
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-100px)] max-w-[1240px] items-center justify-center px-6 pb-16 pt-4 sm:px-10 lg:justify-between">
        {/* Left Poster Stack (Desktop) */}
        <div className="hidden max-w-[540px] lg:flex flex-col gap-5">
          <div className="overflow-hidden rounded-[32px] border border-white/20 bg-white/5 p-2 shadow-2xl backdrop-blur-xl group">
            <img
              src={mascotHero}
              alt="DuoStudy Companion - Built For Two"
              className="aspect-[16/10.5] w-full rounded-[26px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
          </div>

          <div>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[12px] font-semibold text-[#FFD6E5] backdrop-blur-md shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF2E79] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF2E79]" />
              </span>
              <span>Two Desks · One Rhythm</span>
            </div>

            <p className="mt-3 text-[14.5px] font-medium leading-relaxed text-[#D6CFE2]">
              93 NEET UG chapters. Two revisions. Finished together. Connect desks with a 6-character code, inspect your
              partner’s progress in real-time, and cheer each other to medical school.
            </p>

            <div className="mt-4 flex flex-wrap gap-2.5 font-sans text-[12px] font-medium">
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-white/90 backdrop-blur-md">
                ✓ Synchronized Syllabus
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-white/90 backdrop-blur-md">
                ✓ Private 2-Person Wall
              </span>
              <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-white/90 backdrop-blur-md">
                ✓ Real-Time Desk Sync
              </span>
            </div>
          </div>
        </div>

        {/* Right: Masterpiece Glass Auth Card */}
        <div className="relative z-30 w-full max-w-[450px]">
          {busyText && <KineticLoader text={busyText} />}

          <div className="relative rounded-3xl border border-white/90 bg-white/95 p-8 sm:p-9 text-[#241830] shadow-[0_24px_70px_rgba(0,0,0,0.5),0_0_40px_rgba(255,46,121,0.22)] backdrop-blur-2xl">
            {/* Mode Switcher */}
            <div className="flex rounded-full border border-white/80 bg-white/60 p-1 shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setMode('in');
                  setError('');
                }}
                className={`flex-1 rounded-full py-2 font-sans text-[13px] font-bold transition-all cursor-pointer ${
                  mode === 'in'
                    ? 'bg-[#241830] text-white shadow-md'
                    : 'text-[#6B5588] hover:text-[#241830]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('up');
                  setError('');
                }}
                className={`flex-1 rounded-full py-2 font-sans text-[13px] font-bold transition-all cursor-pointer ${
                  mode === 'up'
                    ? 'bg-[#FF2E79] text-white shadow-md'
                    : 'text-[#6B5588] hover:text-[#241830]'
                }`}
              >
                Create Desk
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="auth-username" className="block font-sans text-[11.5px] font-bold uppercase tracking-wider text-[#6B5588]">
                  Desk Username
                </label>
                <input
                  id="auth-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username (min. 3 characters)"
                  autoComplete="username"
                  className="field mt-1.5 cursor-text relative z-10"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="block font-sans text-[11.5px] font-bold uppercase tracking-wider text-[#6B5588]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="font-sans text-[11px] font-bold text-[#FF2E79] hover:underline cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (min. 6 characters)"
                  autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
                  className="field mt-1.5 cursor-text relative z-10"
                />
              </div>

              {/* Pair code input for sign up */}
              {mode === 'up' && (
                <div className="rounded-2xl border border-white/80 bg-white/50 p-3.5">
                  <label htmlFor="auth-paircode" className="block font-sans text-[11.5px] font-bold uppercase tracking-wider text-[#6B5588]">
                    Partner's Pair Code <span className="font-normal text-[10px]">(Optional)</span>
                  </label>
                  <input
                    id="auth-paircode"
                    name="pairCode"
                    type="text"
                    value={pairCode}
                    onChange={(e) => setPairCode(e.target.value)}
                    placeholder="e.g. DUO-7842"
                    className="field mt-1.5 cursor-text relative z-10"
                  />
                  <p className="mt-1 text-[11px] font-medium text-[#76637E]">
                    Have your partner's code? Enter it to automatically link your study dashboards.
                  </p>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-rose-100 p-2.5 text-center font-sans text-[12px] font-bold text-rose-800 border border-rose-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-plum w-full py-3.5 font-sans text-[15px] font-bold tracking-wide shadow-xl cursor-pointer"
              >
                {mode === 'in' ? 'Sign In to Your Desk' : 'Create Your Desk & Start'}
              </button>
            </form>

            {/* Forgot password explainer */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setShowForgot(!showForgot)}
                className="font-sans text-[11.5px] font-semibold text-[#6B5588] hover:text-[#241830] underline cursor-pointer"
              >
                Forgot your password?
              </button>

              {showForgot && (
                <div className="mt-2.5 rounded-xl bg-amber-50 p-3 text-left font-sans text-[11.5px] font-medium text-amber-900 border border-amber-200">
                  💡 In DuoStudy, accounts stay private without external emails. Only your paired study partner can reset
                  your password from inside their own Profile settings.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
