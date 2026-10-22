import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { store } from '../lib/store';
import { copyToClipboard } from '../lib/clipboard';

const INK = '#241830', MUTED = '#8C6C82', ROSE = '#FF2E79';

const QUICK_NUDGES = [
  { text: '👋 Hi! Hope your study session is going amazing! 🌸', emoji: '👋' },
  { text: 'Take a 5-min water break! 💧', emoji: '💧' },
  { text: 'Crushing it today! Keep going 🔥', emoji: '🔥' },
  { text: 'Sending you study luck & focus 🍀', emoji: '🍀' },
  { text: 'So proud of your progress today ❤️', emoji: '❤️' },
  { text: 'Ready for our evening review quiz? 📝', emoji: '📝' },
];

export default function Wall({ me }: { me: string }) {
  const [input, setInput] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('✨');
  const [copied, setCopied] = useState(false);
  const [quickPairInput, setQuickPairInput] = useState('');
  const [pairError, setPairError] = useState('');
  const [pairSuccess, setPairSuccess] = useState('');

  const meAccount = store.accountOf(me);
  const partner = meAccount?.partner;
  const partnerAccount = partner ? store.accountOf(partner) : null;
  const messages = store.getWallMessages(me);
  const myData = store.dataOf(me);
  const completed = store.completedCount(myData);
  const rev2 = store.rev2Count(myData);
  const syllabusPct = Math.round((completed / 93) * 100);

  const handlePost = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;
    store.postWallMessage(input.trim(), selectedEmoji, me);
    setInput('');
  };

  const sendQuick = (text: string, emoji: string) => {
    store.postWallMessage(text, emoji, me);
  };

  const copyCode = async () => {
    if (meAccount?.pairCode) {
      const ok = await copyToClipboard(meAccount.pairCode);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleQuickLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setPairError('');
    setPairSuccess('');
    if (!quickPairInput.trim()) return;
    const ok = await store.linkWithCode(quickPairInput.trim());
    if (ok) {
      setPairSuccess('Linked with partner desk! Notes synchronized. ❤️');
      setQuickPairInput('');
    } else {
      setPairError('Pair code not found. Check your partner’s exact code.');
    }
  };

  return (
    <div className="mx-auto max-w-[860px] px-5 pb-28 pt-8 sm:px-8" style={{ color: INK }}>
      {/* Header */}
      <div className="text-center">
        <div className="rq-eyebrow">
          {partnerAccount ? 'COUPLE STUDY BOARD · INTIMATE & SHARED' : 'STUDY WALL · PAIR TO SYNCHRONIZE'}
        </div>
        <h1 className="mt-1 font-display text-[44px] font-extrabold leading-tight max-sm:text-[34px]">
          The <em className="font-semibold" style={{ color: ROSE }}>Wall</em>
        </h1>
        <p className="mx-auto mt-2 max-w-[500px] text-[14.5px] font-bold" style={{ color: MUTED }}>
          {partnerAccount
            ? 'Leave encouraging sticky notes, cheer each other through tough chapters, and celebrate milestones together.'
            : 'A private shared bulletin for you and your study partner. Pair your desks to unlock live sticky notes.'}
        </p>

        {partnerAccount ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-1.5 font-num text-[12px] font-bold text-plum-2 shadow-sm">
            <span>Linked with</span>
            <span className="font-black text-[#FF2E79]">{partnerAccount.displayName}</span>
            <span>· Code {partnerAccount.pairCode}</span>
          </div>
        ) : (
          <div className="mt-4 inline-flex items-center gap-2.5 rounded-full border border-purple-200/80 bg-purple-50/70 px-4 py-1.5 text-[12px] font-bold text-[#6D28D9]">
            <span>Your Pair Code:</span>
            <span className="rounded-md border border-purple-300 bg-white px-2 py-0.5 font-mono text-[12.5px] text-[#1A1126] shadow-2xs">
              {meAccount?.pairCode || '...'}
            </span>
            <span>— Share with your partner to synchronize live Wall notes</span>
          </div>
        )}
      </div>

      {/* Couple Shared Milestones Banner */}
      <div className="mt-7 grid grid-cols-3 gap-3">
        <div className="rq-panel p-3 text-center">
          <div className="text-[18px]">🔥</div>
          <div className="font-display text-[17px] font-black leading-tight">
            {meAccount?.streak || 1} {meAccount?.streak === 1 ? 'Day' : 'Days'}
          </div>
          <div className="font-num text-[9.5px] font-bold text-mauve-2 uppercase tracking-wider">
            {partnerAccount ? 'Shared Streak' : 'Study Streak'}
          </div>
        </div>
        <div className="rq-panel p-3 text-center">
          <div className="text-[18px]">🎯</div>
          <div className="font-display text-[17px] font-black leading-tight">{syllabusPct}% Done</div>
          <div className="font-num text-[9.5px] font-bold text-mauve-2 uppercase tracking-wider">Syllabus</div>
        </div>
        <div className="rq-panel p-3 text-center">
          <div className="text-[18px]">⭐</div>
          <div className="font-display text-[17px] font-black leading-tight">{rev2} Rev 2</div>
          <div className="font-num text-[9.5px] font-bold text-mauve-2 uppercase tracking-wider">Mastered</div>
        </div>
      </div>

      {/* Posting Section - ONLY active after pairing */}
      {/* Quick Cheer Shortcuts */}
      <div className="mt-7">
        <div className="font-num text-[11px] font-bold uppercase tracking-wider text-mauve-2">
          {partnerAccount ? `Quick Nudges & Cheers for ${partnerAccount.displayName}` : 'Quick Nudges & Focus Notes'}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {QUICK_NUDGES.map((n) => (
            <button
              key={n.text}
              type="button"
              onClick={() => sendQuick(n.text, n.emoji)}
              className="cursor-pointer rounded-full border border-white/90 bg-white/70 px-3.5 py-1.5 font-num text-[12px] font-bold text-plum-2 shadow-sm transition hover:scale-[1.02] hover:bg-white active:scale-95"
            >
              {n.text}
            </button>
          ))}
        </div>
      </div>

      {/* Message Composer */}
      <form onSubmit={handlePost} className="rq-panel mt-6 p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="font-num text-[12px] font-bold text-mauve">Reaction:</span>
          {['✨', '❤️', '🔥', '☕', '💪', '🌸', '🎉'].map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => setSelectedEmoji(em)}
              className={`h-7 w-7 rounded-full text-[15px] transition ${
                selectedEmoji === em ? 'bg-white shadow-sm scale-110' : 'opacity-60 hover:opacity-100'
              }`}
            >
              {em}
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              partnerAccount
                ? `Write a message, sticky note, or cheer for ${partnerAccount.displayName}...`
                : 'Write a sticky note or study reminder...'
            }
            className="field flex-1 !py-2.5"
          />
          <button
            type="submit"
            className="rq-rosebtn rounded-2xl px-6 font-num text-[13.5px] whitespace-nowrap cursor-pointer"
          >
            Post Note
          </button>
        </div>
      </form>

      {!partnerAccount && (
        <div className="mt-4 rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-50/80 to-rose-50/70 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[18px]">💌</span>
              <div>
                <div className="text-[13px] font-bold text-[#6D28D9]">
                  Your Pair Code: <strong className="font-mono text-[14px] text-[#1A1126]">{meAccount?.pairCode || '...'}</strong>
                </div>
                <div className="text-[11.5px] text-[#8C6C82]">Share this code with your partner to read and sync sticky notes live</div>
              </div>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="cursor-pointer rounded-xl bg-purple-600 px-4 py-2 font-sans text-[12px] font-bold text-white shadow-sm transition hover:bg-purple-700 active:scale-95"
            >
              {copied ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>

          <form onSubmit={handleQuickLink} className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-purple-200/60 pt-3">
            <span className="text-[12px] font-bold text-[#6D28D9]">Or enter partner's code:</span>
            <input
              type="text"
              value={quickPairInput}
              onChange={(e) => setQuickPairInput(e.target.value.toUpperCase())}
              placeholder="e.g. DUO-4821"
              className="field !w-36 !py-1.5 font-mono text-[12.5px] uppercase tracking-wider text-center"
            />
            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-[#241830] px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#3B2050] active:scale-95"
            >
              Link Desks
            </button>
            {pairSuccess && <span className="text-[12px] font-bold text-emerald-600">{pairSuccess}</span>}
            {pairError && <span className="text-[12px] font-bold text-rose-600">{pairError}</span>}
          </form>
        </div>
      )}

      {/* Wall Notes Feed */}
      <div className="mt-8 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((m) => {
            const isMe = m.author === me;
            const authorAcc = store.accountOf(m.author);
            const partnerDisplayName = partnerAccount?.displayName || partnerAccount?.username || (partner || 'Partner');
            
            // "You" for sent messages, and the sender's actual name for received messages
            const displaySender = isMe 
              ? 'You' 
              : (authorAcc?.displayName || (m.author === partner ? partnerDisplayName : m.author));

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-[24px] p-5 shadow-sm transition-all sm:max-w-[70%] ${
                    isMe
                      ? 'border border-[#F06292]/30 bg-gradient-to-br from-white/90 to-rose-50/80 text-plum'
                      : 'border border-purple-200/90 bg-gradient-to-br from-white/95 to-purple-50/60 text-plum'
                  }`}
                  style={{
                    boxShadow: isMe
                      ? '0 12px 28px -10px rgba(229,72,124,0.18)'
                      : '0 12px 28px -10px rgba(109,40,217,0.12)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[17px]">{m.emoji || '✨'}</span>
                      <span className={`font-display text-[15px] font-black ${isMe ? 'text-[#FF2E79]' : 'text-[#6D28D9]'}`}>
                        {displaySender}
                      </span>
                    </div>
                    <span className="font-num text-[10.5px] font-semibold text-mauve-2">{m.createdAt}</span>
                  </div>

                  <p className="mt-2.5 text-[15px] font-bold leading-relaxed">{m.body}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {messages.length === 0 && (
          <div className="rq-panel p-12 text-center">
            <div className="text-[32px]">💌</div>
            <h3 className="mt-2 font-display text-[20px] font-bold">The Wall is clean & ready</h3>
            <p className="mt-1 text-[13.5px] font-bold text-mauve">
              {partnerAccount
                ? 'Post the first note to kick off your joint study momentum!'
                : 'Shared notes from you and your study partner will appear here once paired.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
