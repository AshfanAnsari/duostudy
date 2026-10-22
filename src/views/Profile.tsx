import { useState, useEffect } from 'react';
import { store, examDate } from '../lib/store';
import { sound } from '../lib/audio';
import { copyToClipboard } from '../lib/clipboard';

const INK = '#471C2B', MUTED = '#A06A80', ROSE = '#E5487C';

export default function Profile({
  me,
  onViewPartner,
  onSignOut,
}: {
  me: string;
  onViewPartner: () => void;
  onSignOut: () => void;
}) {
  const account = store.accountOf(me);
  const partner = account?.partner ? store.accountOf(account.partner) : null;
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');
  const [examInput, setExamInput] = useState(examDate());
  const [soundEnabled, setSoundEnabled] = useState(sound.enabled);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [, setTick] = useState(0);

  // Live real-time study timer synchronization
  useEffect(() => {
    const isMeRunning = store.isTimerRunning(me);
    const isPartnerRunning = partner ? store.isTimerRunning(partner.username) : false;
    if (isMeRunning || isPartnerRunning) {
      const timer = setInterval(() => setTick((t) => t + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [me, partner]);

  if (!account) return null;

  const myTodaySecs = store.getTodayStudySeconds(me);
  const myTotalSecs = store.getTotalStudySeconds(me);
  const isMeStudying = store.isTimerRunning(me);

  const partnerTodaySecs = partner ? store.getTodayStudySeconds(partner.username) : 0;
  const partnerTotalSecs = partner ? store.getTotalStudySeconds(partner.username) : 0;
  const isPartnerStudying = partner ? store.isTimerRunning(partner.username) : false;

  const formatHM = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const copyCode = async () => {
    if (account.pairCode) {
      const ok = await copyToClipboard(account.pairCode);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError('');
    setLinkSuccess('');
    const ok = await store.linkWithCode(partnerCodeInput);
    if (ok) {
      setLinkSuccess('Successfully connected to partner desk! ❤️');
      setPartnerCodeInput('');
    } else {
      setLinkError('Invalid pair code. Make sure your partner gave you their exact code.');
    }
  };

  const handleUpdateExam = (e: React.FormEvent) => {
    e.preventDefault();
    store.setExamDate(examInput);
  };

  return (
    <div className="mx-auto max-w-[860px] px-5 pb-28 pt-8 sm:px-8" style={{ color: INK }}>
      {/* Header */}
      <div>
        <div className="rq-eyebrow">STUDENT DESK & COUPLE PAIRING</div>
        <h1 className="mt-1 font-display text-[44px] font-extrabold leading-none max-sm:text-[34px]">
          Profile <em className="font-semibold" style={{ color: ROSE }}>Settings</em>
        </h1>
        <p className="mt-2 text-[14.5px] font-bold" style={{ color: MUTED }}>
          Manage your desk identity, connect with your study partner, and configure your NEET timeline.
        </p>
      </div>

      <div className="mt-7 grid gap-6 md:grid-cols-2">
        {/* Your Profile Card */}
        <section className="rq-panel p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#F06292] to-[#E5487C] font-display text-[24px] font-black text-white shadow-md">
              {account.displayName[0]}
            </div>
            {!editingName ? (
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-[22px] font-bold">{account.displayName}</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(true);
                      setNameInput(account.displayName);
                    }}
                    className="rounded-full bg-white/60 px-2.5 py-0.5 font-num text-[11px] font-bold text-mauve hover:text-plum hover:bg-white"
                    title="Change display name"
                  >
                    ✎ Edit
                  </button>
                </div>
                <div className="font-num text-[12px] font-semibold text-mauve-2">@{account.username}</div>
              </div>
            ) : (
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="field !py-1 !px-2.5 text-[14px]"
                    placeholder="Your Name"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (nameInput.trim()) {
                        store.updateDisplayName(account.username, nameInput.trim());
                      }
                      setEditingName(false);
                    }}
                    className="rq-rosebtn rounded-xl px-3 py-1 text-[11.5px] font-num"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="btn-glass px-2.5 py-1 text-[11.5px] font-num"
                  >
                    Cancel
                  </button>
                </div>
                <div className="mt-1 font-num text-[12px] font-semibold text-mauve-2">@{account.username}</div>
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-white/90 bg-white/70 p-4">
            <div className="font-num text-[11px] font-bold tracking-wider text-mauve-2">YOUR UNIQUE PAIR CODE</div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-num text-[22px] font-black tracking-widest text-plum">{account.pairCode}</span>
              <button
                type="button"
                onClick={copyCode}
                className="btn-glass px-4 py-1.5 font-num text-[12px]"
              >
                {copied ? '✓ Copied' : 'Copy Code'}
              </button>
            </div>
            <p className="mt-2 text-[12px] font-bold text-mauve">
              Share this code with your partner so they can link desks with you.
            </p>
          </div>

          {/* Live Study Hours (Today & All-Time) */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 p-3.5 text-center shadow-2xs">
              <div className="font-num text-[10.5px] font-bold uppercase tracking-wider text-[#9A6D84]">
                Today's Study Time
              </div>
              <div className="mt-1 font-sans text-[22px] font-black text-[#241830] tabular-nums">
                {formatHM(myTodaySecs)}
              </div>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${isMeStudying ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                <span className="text-[10.5px] font-bold text-[#7E699B]">
                  {isMeStudying ? 'Studying Now' : 'Desk Idle'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-200/80 bg-purple-50/70 p-3.5 text-center shadow-2xs">
              <div className="font-num text-[10.5px] font-bold uppercase tracking-wider text-[#9A6D84]">
                Total Study Time
              </div>
              <div className="mt-1 font-sans text-[22px] font-black text-[#8B5CF6] tabular-nums">
                {formatHM(myTotalSecs)}
              </div>
              <div className="mt-1 text-[10.5px] font-bold text-[#7E699B]">
                All-Time Total
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-white/50 px-4 py-3">
            <span className="font-num text-[12.5px] font-bold text-mauve">Current Study Streak</span>
            <span className="font-num text-[14px] font-black text-[#E5487C]">{account.streak} Days 🔥</span>
          </div>
        </section>

        {/* Partner Connection Card */}
        <section className="rq-panel p-6">
          <div className="rq-eyebrow">PARTNER DESK & REAL-TIME STATS</div>
          {partner ? (
            <div className="mt-3">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-rose-400 font-display text-[24px] font-black text-white shadow-md">
                  {partner.displayName[0]}
                </div>
                <div>
                  <h3 className="font-display text-[20px] font-bold">{partner.displayName}</h3>
                  <div className="font-num text-[12px] font-semibold text-mauve-2">Connected & Synced</div>
                </div>
              </div>

              {/* Partner Live Study Hours */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 p-3.5 text-center shadow-2xs">
                  <div className="font-num text-[10.5px] font-bold uppercase tracking-wider text-[#9A6D84]">
                    Today's Study Time
                  </div>
                  <div className="mt-1 font-sans text-[22px] font-black text-[#241830] tabular-nums">
                    {formatHM(partnerTodaySecs)}
                  </div>
                  <div className="mt-1 flex items-center justify-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${isPartnerStudying ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                    <span className="text-[10.5px] font-bold text-[#7E699B]">
                      {isPartnerStudying ? 'Studying Live' : 'Resting'}
                    </span>
                  </div>
                </div>

                <div className="rounded-2xl border border-purple-200/80 bg-purple-50/70 p-3.5 text-center shadow-2xs">
                  <div className="font-num text-[10.5px] font-bold uppercase tracking-wider text-[#9A6D84]">
                    Total Study Time
                  </div>
                  <div className="mt-1 font-sans text-[22px] font-black text-[#8B5CF6] tabular-nums">
                    {formatHM(partnerTotalSecs)}
                  </div>
                  <div className="mt-1 text-[10.5px] font-bold text-[#7E699B]">
                    All-Time Total
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    store.postWallMessage(
                      `👋 Hi ${partner.displayName}! Sending you love and focus for your NEET study session! 🌸✨`,
                      '👋'
                    );
                    setLinkSuccess(`✓ Said Hi to ${partner.displayName}! Sent to Wall 💌`);
                    setTimeout(() => setLinkSuccess(''), 3000);
                  }}
                  className="w-full rounded-2xl border border-rose-300/80 bg-white/90 py-2.5 font-sans text-[13px] font-extrabold text-[#241830] shadow-2xs hover:bg-white active:scale-95 transition cursor-pointer"
                >
                  👋 Say Hi to {partner.displayName}
                </button>
                <button
                  type="button"
                  onClick={onViewPartner}
                  className="rq-rosebtn w-full rounded-2xl py-2.5 font-num text-[13.5px] cursor-pointer"
                >
                  Inspect {partner.displayName}'s Desk (Read-Only)
                </button>
                <button
                  type="button"
                  onClick={() => store.unlinkPartner()}
                  className="w-full rounded-2xl border border-rose-300/60 bg-white/60 py-2.5 font-num text-[12.5px] font-bold text-rose-700 transition hover:bg-rose-50 cursor-pointer"
                >
                  Unlink Partner
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-[13.5px] font-bold text-mauve">
                Enter your partner's pair code below to link your revision dashboards and shared wall.
              </p>

              <form onSubmit={handleLink} className="mt-4 space-y-3">
                <input
                  type="text"
                  value={partnerCodeInput}
                  onChange={(e) => setPartnerCodeInput(e.target.value)}
                  placeholder="e.g. DUO-9315"
                  className="field !py-2.5 !text-[14px]"
                />
                {linkError && <p className="text-[12px] font-bold text-rose-600">{linkError}</p>}
                {linkSuccess && <p className="text-[12px] font-bold text-emerald-700">{linkSuccess}</p>}
                <button
                  type="submit"
                  className="rq-rosebtn w-full rounded-2xl py-2.5 font-num text-[13.5px]"
                >
                  Link With Partner Code
                </button>
              </form>
            </div>
          )}
        </section>
      </div>

      {/* Target Exam Date & Study Sound Design */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Exam Timeline */}
        <section className="rq-panel p-6">
          <div className="rq-eyebrow">NEET TARGET TIMELINE</div>
          <form onSubmit={handleUpdateExam} className="mt-3 space-y-3">
            <div>
              <label className="block text-[12.5px] font-bold text-mauve">Exam Target Date</label>
              <input
                type="date"
                value={examInput}
                onChange={(e) => setExamInput(e.target.value)}
                className="field mt-1 !py-2 !text-[14px]"
              />
            </div>
            <button type="submit" className="btn-glass px-4 py-2 font-num text-[12px]">
              Update Exam Date
            </button>
          </form>
        </section>



        {/* Sound Effects Preference */}
        <section className="rq-panel p-6 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="rq-eyebrow">STUDY SOUND DESIGN</div>
              <div className="mt-1 font-display text-[18px] font-bold">Web Audio Synthesizer Chimes</div>
              <p className="text-[12.5px] font-bold text-mauve">
                Soft synthesized tones for chapter completions, Wall nudges, and Pomodoro meditation gongs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                sound.enabled = !soundEnabled;
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) sound.playDoneChime();
              }}
              className={`rounded-full px-5 py-2 font-num text-[12.5px] font-bold transition shadow-sm ${
                soundEnabled ? 'bg-[#E5487C] text-white shadow-md' : 'border border-white/80 bg-white/70 text-mauve'
              }`}
            >
              {soundEnabled ? '🔊 Sound On (Testing Chime)' : '🔇 Muted'}
            </button>
          </div>
        </section>
      </div>

      {/* Sign Out */}
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={onSignOut}
          className="rounded-full border border-white/80 bg-white/70 px-8 py-2.5 font-num text-[13.5px] font-bold text-plum transition hover:bg-white"
        >
          Sign Out of DuoStudy
        </button>
      </div>
    </div>
  );
}
