import { useEffect, useMemo, useRef, useState } from 'react';
import { CHAPTERS } from '../data/chapters';
import { TOPICS } from '../data/topics';

// ── Chapter subtopics (NCERT topics, view-only) ──────────────────────────────
// Every chapter row in the app can expand these: tap the chapter name.
// (User, 2026-10-21: subtopics were only reachable on Subject pages.)
export const topicCount = (id: string) => (TOPICS[id] ?? []).length;
export function TopicsChips({ id }: { id: string }) {
  const topics = TOPICS[id] ?? [];
  if (!topics.length) return null;
  return (
    <div className="mt-3 flex w-full flex-wrap gap-1.5 border-t border-white/50 pt-3">
      {/* phone fix (user, 2026-10-21): long NCERT topic names used to spill
          out of their chip tiles past the screen edge — a chip may never be
          wider than the screen, and its text wraps inside it instead */}
      {topics.map((t) => <span key={t} className="max-w-full rounded-full border border-white/80 bg-white/70 px-3 py-1 text-[12.5px] font-bold leading-snug text-plum-2 shadow-[0_2px_6px_rgba(71,28,43,0.08)] [overflow-wrap:anywhere]">{t}</span>)}
    </div>
  );
}

// ── Glass Toggle (the approved checkbox — dark/light toggle form) ────────────
export function Toggle({ on, onClick, small }: { on: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={`relative flex-none cursor-pointer overflow-hidden rounded-full border transition-all duration-500 ${small ? 'h-[27px] w-[58px]' : 'h-10 w-[92px]'} ${on ? 'border-white/40' : 'border-white/75'}`}
      style={{
        background: on ? 'linear-gradient(180deg, rgba(255,255,255,.22), rgba(255,255,255,0) 46%), linear-gradient(180deg, rgba(74,48,116,.85), rgba(42,27,61,.92))' : 'linear-gradient(168deg, rgba(255,255,255,.8), rgba(255,255,255,.34) 55%, rgba(255,255,255,.55))',
        boxShadow: on ? 'inset 2px 2px 7px rgba(0,0,0,.35), inset -2px -2px 6px rgba(203,179,232,.22), 0 8px 18px rgba(42,27,61,.35)' : 'inset 2px 2px 6px rgba(122,90,180,.18), inset -2px -2px 5px rgba(255,255,255,.85), 0 8px 18px rgba(60,40,110,.18)',
      }}>
      <span className="absolute inset-0 transition-transform duration-700"
        style={{ background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,.5) 48%, transparent 62%)', transform: on ? 'translateX(60%)' : 'translateX(-120%)' }} />
      <span className={`absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full border border-white/90 transition-all duration-500 ${small ? 'h-[21px] w-[21px]' : 'h-[34px] w-[34px]'}`}
        style={{
          left: on ? (small ? 34 : 55) : 3,
          background: on ? 'radial-gradient(circle at 32% 30%, #FFF6E8, #F3DEB8)' : 'radial-gradient(circle at 32% 30%, #EFE9FC, #CBB3E8)',
          boxShadow: '0 3px 8px rgba(60,40,110,.3), inset 0 -3px 6px rgba(122,90,180,.25)',
          transitionTimingFunction: 'cubic-bezier(.6,-0.1,.2,1.25)',
        }}>
        <svg viewBox="0 0 24 24" className={small ? 'h-[11px] w-[11px]' : 'h-[17px] w-[17px]'} fill="none" stroke={on ? '#2A1B3D' : '#6B5588'} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"
          style={{ strokeDasharray: 26, strokeDashoffset: on ? 0 : 26, transition: 'stroke-dashoffset .3s ease .15s' }}>
          <path d="M5 12.5 L10 17.5 L19 7" />
        </svg>
      </span>
    </button>
  );
}

// ── Liquid-glass stat card (title, big number, delta, tick scale) ────────────
export function StatCard({ title, value, delta, total, suffix }: { title: string; value: number; delta?: string; total: number; suffix?: string }) {
  const N = 21;
  const upto = Math.round((value / Math.max(1, total)) * (N - 1));
  return (
    <div className="glass w-full max-w-[320px] rounded-3xl p-6 shadow-[0_8px_28px_-8px_rgba(36,24,48,0.08)]">
      <div className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#8C6C82]">{title}</div>
      <div className="mt-1 font-sans text-[62px] font-extrabold leading-tight tracking-tight text-[#241830] tabular-nums">
        {value}<span className="text-[22px] font-semibold text-[#8C6C82] tracking-normal">{suffix ?? ''}</span>
      </div>
      {delta && <div className="mt-0.5 text-[13.5px] font-medium text-[#76637E]">{delta}</div>}
      <div className="mt-5 flex h-[22px] items-end gap-[4px]">
        {Array.from({ length: N }).map((_, i) => (
          <div key={i} className="flex-1 rounded-full transition-all duration-300"
            style={i === upto && value > 0
              ? { height: 22, background: 'linear-gradient(180deg,#fff,#FF2E79)', boxShadow: '0 2px 10px rgba(255,46,121,0.5)' }
              : i < upto
                ? { height: 12, background: 'linear-gradient(180deg,#DDD4EC,#BFAEE3)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)' }
                : { height: 12, background: 'rgba(255,255,255,0.45)', boxShadow: 'inset 0 1px 2px rgba(36,24,48,0.06)' }} />
        ))}
      </div>
      <div className="mt-2.5 flex justify-between text-[11px] font-bold tracking-wider text-[#9A6D84]"><span>0</span><span>{Math.round(total / 2)}</span><span>{total}</span></div>
    </div>
  );
}

// ── Kinetic Text Loader (glass) — shown only during genuine waits ────────────
export function KineticLoader({ text = 'Loading' }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#E9E1F6]/60 backdrop-blur-sm">
      <div className="glass flex items-center gap-3 rounded-full px-8 py-4">
        <span className="relative flex gap-[3px]">
          {text.split('').map((ch, i) => (
            <span key={i} className="inline-block text-[17px] font-light tracking-wide text-plum"
              style={{ animation: `ktl-wave 1.1s ease-in-out ${i * 0.07}s infinite` }}>{ch === ' ' ? ' ' : ch}</span>
          ))}
        </span>
        <span className="h-2.5 w-2.5 rounded-full bg-orchid" style={{ animation: 'ktl-orbit 1.1s ease-in-out infinite' }} />
      </div>
      <style>{`@keyframes ktl-wave { 0%,100% { transform: translateY(0); opacity:.55 } 50% { transform: translateY(-5px); opacity:1 } }
               @keyframes ktl-orbit { 0%,100% { transform: translateY(4px) } 50% { transform: translateY(-6px) } }`}</style>
    </div>
  );
}

// ── Wave canvas — dependency-free cube ripple inside glass (cursor-reactive) ─
export function WaveCanvas({ subtle = false }: { subtle?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const host = cv.parentElement as HTMLElement;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    let raf = 0; const ripples: { x: number; y: number; t0: number }[] = [];
    const size = () => { cv.width = host.clientWidth; cv.height = host.clientHeight; };
    size(); const ro = new ResizeObserver(size); ro.observe(host);
    let last = 0;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const move = (e: PointerEvent) => {
      if (reduced) return;
      const now = performance.now(); if (now - last < 120) return; last = now;
      const r = host.getBoundingClientRect();
      ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, t0: now });
      if (ripples.length > 6) ripples.shift();
    };
    host.addEventListener('pointermove', move);
    const idle = reduced ? 0 : window.setInterval(() => { ripples.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, t0: performance.now() }); if (ripples.length > 6) ripples.shift(); }, 3400);
    const GAP = 25;
    const frame = (ts: number) => {
      const t = ts / 1000, now = performance.now(), w = cv.width, h = cv.height;
      ctx.clearRect(0, 0, w, h);
      for (let x = GAP / 2; x < w; x += GAP) for (let y = GAP / 2; y < h; y += GAP) {
        let hv = Math.sin(x * 0.021 + t * 1.05) * 0.5 + Math.cos(y * 0.026 + t * 0.8) * 0.5 + Math.sin((x + y) * 0.011 - t * 0.55) * 0.35;
        for (const r of ripples) {
          const age = (now - r.t0) / 1000, d = Math.hypot(x - r.x, y - r.y), front = age * 190, rel = d - front;
          hv += Math.exp(-(rel * rel) / 2600) * Math.exp(-age / 1.7) * Math.cos(rel * 0.055) * 1.5 / (1 + d * 0.004);
        }
        const k = Math.max(0, Math.min(1, (hv + 1.1) / 2.5));
        if (subtle) {
          const boost = Math.max(0, hv - 1.0);
          const s = 2.0 + k * 1.6 + boost * 5.5;
          ctx.fillStyle = `rgba(90,62,150,${(boost * 0.22).toFixed(3)})`;   /* nothing shows at rest; wakes only under the cursor */
          ctx.beginPath(); ctx.roundRect(x - s / 2, y - s / 2 - boost * 3, s, s, 1.6); ctx.fill();
        } else {
          const s = 4 + k * 6.2;
          const warm = hv > 1.05;
          ctx.fillStyle = warm ? 'rgba(214,110,84,.75)' : `rgba(${128 + k * 90},${96 + k * 120},${196 + k * 50},${0.35 + k * 0.4})`;
          ctx.beginPath(); ctx.roundRect(x - s / 2, y - s / 2 - hv * 4, s, s, 2); ctx.fill();
        }
      }
      if (!reduced) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); clearInterval(idle); host.removeEventListener('pointermove', move); };
  }, [subtle]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden />;
}

// ── Search Modal (Vengeance pattern) — any-word matching, add to Today ───────
function SearchModalContent({ onClose, onAdd, exclude }: { onClose: () => void; onAdd: (id: string) => void; exclude: string[] }) {
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return CHAPTERS.filter((c) => { const name = c.name.toLowerCase(); return words.every((w) => name.split(/\s+/).some((nw) => nw.startsWith(w)) || name.includes(w)); }).slice(0, 8);
  }, [q]);
  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-plum/30 px-4 pt-[10vh] backdrop-blur-[3px]" onClick={onClose}>
      <div className="glass w-full max-w-[520px] rounded-[26px] p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-2 pb-3">
          <svg viewBox="0 0 24 24" className="h-5 w-5 flex-none" fill="none" stroke="#6B5588" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" /></svg>
          <input autoFocus aria-label="Search chapters" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any word. Try “motion” or “cell”"
            className="w-full bg-transparent text-[16px] font-bold text-plum outline-none placeholder:text-mauve-2" />
          <button onClick={onClose} className="btn-glass px-3 py-1 text-[12px]">ESC</button>
        </div>
        <div className="max-h-[46vh] overflow-auto">
          {results.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-t border-plum/10 px-2 py-3">
              <div>
                <div className="font-bold text-plum">{c.name}</div>
                <div className="text-[11px] font-extrabold uppercase text-mauve-2">{c.subject} · {c.group}</div>
              </div>
              {exclude.includes(c.id) ? (
                <span className="text-[12px] font-black text-mauve">Already added</span>
              ) : (
                <button onClick={() => onAdd(c.id)} className="rq-rosebtn rounded-xl px-3 py-1 text-[12px] font-bold">Add to Today</button>
              )}
            </div>
          ))}
          {q.trim() && results.length === 0 && (
            <div className="px-2 py-6 text-center text-[13px] font-bold text-mauve">No chapters found for "{q}".</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SearchModal({ open, onClose, onAdd, exclude }: { open: boolean; onClose: () => void; onAdd: (id: string) => void; exclude: string[] }) {
  if (!open) return null;
  return <SearchModalContent onClose={onClose} onAdd={onAdd} exclude={exclude} />;
}

