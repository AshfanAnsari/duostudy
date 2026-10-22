import { useState } from 'react';
import { CHAPTERS, TOTAL, type Chapter } from '../data/chapters';
import { store, type UserData } from '../lib/store';
import { StatCard, TopicsChips, topicCount } from '../components/ui';

// Revision-list row with expandable subtopics
function RevRow({ c }: { c: Chapter }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="text-[14.5px] font-bold">
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
        <button type="button" onClick={() => setOpen(!open)} className="min-w-0 flex-1 cursor-pointer text-left leading-snug" aria-expanded={open} title="See subtopics">{c.name}</button>
        <span className="flex-none text-[11px] font-black tracking-wide text-mauve-2">{c.subject.toUpperCase()} · {topicCount(c.id)} TOPICS</span>
      </div>
      {open && <TopicsChips id={c.id} />}
    </div>
  );
}

function RevList({ title, items, empty }: { title: string; items: Chapter[]; empty: string }) {
  return (
    <div className="glass-soft flex-1 rounded-3xl p-6 shadow-sm">
      <h3 className="font-display text-[20px] font-bold text-[#241830]">{title}</h3>
      <div className="mt-3.5 grid grid-cols-1 gap-2">
        {items.length === 0 && <p className="text-[13.5px] font-medium text-[#8C6C82]">{empty}</p>}
        {items.map((c) => <RevRow key={c.id} c={c} />)}
      </div>
    </div>
  );
}

// ── Stats: Revision 1 / Revision 2 lists, headline %, daily history ─────────
export function Stats({ data }: { data: UserData }) {
  const once = CHAPTERS.filter((c) => (data.completions[c.id] ?? 0) === 1);
  const twice = CHAPTERS.filter((c) => (data.completions[c.id] ?? 0) >= 2);
  const completed = store.completedCount(data);
  const rev2 = store.rev2Count(data);
  const days = Object.entries(data.dayLog).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 14);

  return (
    <div className="mx-auto max-w-[1060px] px-5 pb-24 pt-8 sm:px-8">
      <div className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#9A6D84]">YOUR NUMBERS</div>
      <h1 className="mt-1 font-display text-[40px] font-bold leading-tight text-[#241830]">Stats</h1>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 items-stretch gap-5">
        <StatCard title="Revision 2" value={rev2} total={TOTAL} suffix={` · ${Math.round((rev2 / TOTAL) * 100)}%`} delta={`Completed (Revision 1): ${Math.round((completed / TOTAL) * 100)}%`} />
        <StatCard title="Completed" value={completed} total={TOTAL} suffix={` · ${Math.round((completed / TOTAL) * 100)}%`} delta="First pass done" />
      </div>
      <div className="mt-7 grid grid-cols-1 md:grid-cols-2 items-stretch gap-5">
        <RevList title="Revision 1" items={once} empty="Nothing here yet. Complete a chapter in Today's Planner." />
        <RevList title="Revision 2" items={twice} empty="Add a completed chapter to Today and finish it again to land it here." />
      </div>
      <div className="glass-soft mt-7 rounded-3xl p-6 shadow-sm">
        <h3 className="font-display text-[20px] font-bold text-[#241830]">Daily history</h3>
        {days.length === 0 && <p className="mt-2 text-[13.5px] font-medium text-[#8C6C82]">Your day-by-day percentages will collect here.</p>}
        <div className="mt-3.5 grid grid-cols-1 gap-2.5">
          {days.map(([d, v]) => {
            const pct = v.total ? Math.round((v.done / v.total) * 100) : 0;
            return (
              <div key={d} className="flex items-center gap-3 text-[13.5px] font-medium">
                <span className="w-[92px] flex-none font-medium text-[#8C6C82]">{new Date(d + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                <div className="h-[8px] flex-1 overflow-hidden rounded-full bg-white/60 shadow-inner"><div className="h-full rounded-full bg-gradient-to-r from-[#F2A93B] to-[#E5487C]" style={{ width: pct + '%' }} /></div>
                <span className="w-[44px] flex-none text-right font-sans font-bold tabular-nums text-[#241830]">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Completed / Pending / All Chapters ────────────────────────────────────────
// Subject-wise accordion (user, 2026-10-21): only the subject and its count
// show; tapping the subject reveals its chapter names.
const SUBJ_DOT: Record<string, string> = { Physics: '#B79BDB', Chemistry: '#E9B44C', Biology: '#8CC084' };
export function ChapterList({ me, data, kind, viewUser }: { me: string; data: UserData; kind: 'completed' | 'pending' | 'all'; viewUser: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set());
  const readOnly = viewUser !== me;
  const items = CHAPTERS.filter((c) => kind === 'all' ? true : kind === 'completed' ? (data.completions[c.id] ?? 0) >= 1 : (data.completions[c.id] ?? 0) === 0);
  const todays = store.todaysChapters(data);
  const titles = { completed: ['Completed', 'every finished chapter, grouped by subject'], pending: ['Pending', 'everything still waiting for its first pass, grouped by subject'], all: ['All Chapters', 'the full 93, grouped by subject. Pull any of them into today'] } as const;
  const groups = (['Physics', 'Chemistry', 'Biology'] as const)
    .map((s) => ({ s, list: items.filter((c) => c.subject === s) }))
    .filter((g) => g.list.length > 0);
  const toggleSubject = (s: string) => setOpenSubjects((prev) => { const next = new Set(prev); if (next.has(s)) next.delete(s); else next.add(s); return next; });
  return (
    <div className="mx-auto max-w-[1060px] px-5 pb-24 pt-8 sm:px-8">
      <div className="text-[11px] font-black tracking-[0.26em] text-mauve-2">{items.length} CHAPTERS</div>
      <h1 className="mt-1 font-display text-[44px] font-extrabold leading-none">{titles[kind][0]}</h1>
      <p className="mt-2 text-[14.5px] font-bold text-mauve">{titles[kind][1]}.</p>
      <div className="mt-6 grid grid-cols-1 gap-3">
        {groups.map(({ s, list }) => {
          const open = openSubjects.has(s);
          return (
            <div key={s} className="glass-soft overflow-hidden rounded-[20px]">
              <button type="button" onClick={() => toggleSubject(s)} aria-expanded={open}
                className="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition-transform duration-200 active:scale-[0.99]">
                <span className="h-3 w-3 flex-none rounded-full" style={{ background: SUBJ_DOT[s] }} />
                <span className="min-w-0 flex-1 font-display text-[20px] font-bold">{s}</span>
                <span className="flex-none rounded-full bg-white/70 px-3 py-1 text-[12px] font-black text-mauve-2">{list.length} chapters</span>
                <span aria-hidden className={`flex-none text-[15px] font-black text-mauve-2 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>▾</span>
              </button>
              {open && (
                <div className="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-2">
                  {list.map((c) => (
                    <div key={c.id} className="rounded-[14px] bg-white/55 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => setOpenId(openId === c.id ? null : c.id)} className="block w-full cursor-pointer text-left text-[15px] font-black leading-snug" aria-expanded={openId === c.id} title="See subtopics">{c.name}</button>
                          <div className="text-[11px] font-extrabold tracking-wide text-mauve-2">{c.group.toUpperCase()} · {topicCount(c.id)} TOPICS</div>
                        </div>
                        {!readOnly && (todays.includes(c.id)
                          ? <span className="flex-none rounded-full bg-plum px-3 py-1 text-[11.5px] font-black text-white">In today</span>
                          : <button onClick={() => store.addToToday(me, c.id)} className="btn-glass flex-none px-3 py-1 text-[11.5px]">Add to today</button>)}
                      </div>
                      {openId === c.id && <TopicsChips id={c.id} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <p className="font-bold text-mauve">Nothing here.</p>}
      </div>
    </div>
  );
}

