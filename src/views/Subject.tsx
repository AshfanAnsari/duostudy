import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CHAPTERS } from '../data/chapters';
import { store, type UserData } from '../lib/store';
import { TopicsChips, topicCount } from '../components/ui';

const INK = '#471C2B', MUTED = '#A06A80', ROSE = '#E5487C', GOLD = '#F2A93B';

const THEME_ACCENTS: Record<string, { dot: string; glow: string; soft: string }> = {
  Physics: { dot: '#B79BDB', glow: 'rgba(183, 155, 219, 0.25)', soft: 'rgba(183, 155, 219, 0.12)' },
  Chemistry: { dot: '#F2A93B', glow: 'rgba(242, 169, 59, 0.25)', soft: 'rgba(242, 169, 59, 0.12)' },
  Biology: { dot: '#E5487C', glow: 'rgba(229, 72, 124, 0.25)', soft: 'rgba(229, 72, 124, 0.12)' },
};

export default function Subject({
  me,
  data,
  subject,
  viewUser,
}: {
  me: string;
  data: UserData;
  subject: 'Physics' | 'Chemistry' | 'Biology';
  viewUser: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const readOnly = viewUser !== me;
  const todays = store.todaysChapters(data);
  const subjectChapters = useMemo(() => CHAPTERS.filter((c) => c.subject === subject), [subject]);

  const groups = useMemo(() => {
    const set = new Set<string>();
    for (const c of subjectChapters) set.add(c.group);
    return Array.from(set);
  }, [subjectChapters]);

  const filteredChapters = useMemo(() => {
    return subjectChapters.filter((c) => {
      const matchGroup = selectedGroup === 'all' || c.group === selectedGroup;
      const matchSearch =
        searchQuery === '' ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.group.toLowerCase().includes(searchQuery.toLowerCase());
      return matchGroup && matchSearch;
    });
  }, [subjectChapters, selectedGroup, searchQuery]);

  const completedCount = subjectChapters.filter((c) => (data.completions[c.id] ?? 0) >= 1).length;
  const rev2Count = subjectChapters.filter((c) => (data.completions[c.id] ?? 0) >= 2).length;
  const total = subjectChapters.length;
  const pct = Math.round((completedCount / total) * 100);

  const colors = THEME_ACCENTS[subject] || THEME_ACCENTS.Physics;

  return (
    <div className="mx-auto max-w-[1060px] px-5 pb-28 pt-8 sm:px-8" style={{ color: INK }}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="rq-eyebrow flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors.dot }} />
            <span>NEET UG CURRICULUM · {total} CHAPTERS</span>
          </div>
          <h1 className="mt-1 font-display text-[44px] font-extrabold leading-none max-sm:text-[34px]">
            {subject} <em className="font-semibold" style={{ color: ROSE }}>Syllabus</em>
          </h1>
          <p className="mt-2 text-[14.5px] font-bold" style={{ color: MUTED }}>
            Track NCERT theory, question practice, and both revision passes.
          </p>
        </div>

        {/* Progress Badge */}
        <div className="rq-panel flex items-center gap-5 px-6 py-3.5">
          <div className="text-center">
            <div className="font-display text-[26px] font-black leading-none" style={{ color: colors.dot }}>
              {pct}%
            </div>
            <div className="mt-1 font-num text-[10px] font-semibold tracking-wider text-mauve-2">SYLLABUS</div>
          </div>
          <div className="h-8 w-px bg-white/70" />
          <div className="text-center">
            <div className="font-display text-[26px] font-black leading-none" style={{ color: GOLD }}>
              {completedCount} <span className="text-[16px] font-bold" style={{ color: MUTED }}>/ {total}</span>
            </div>
            <div className="mt-1 font-num text-[10px] font-semibold tracking-wider text-mauve-2">REV 1</div>
          </div>
          <div className="h-8 w-px bg-white/70" />
          <div className="text-center">
            <div className="font-display text-[26px] font-black leading-none" style={{ color: ROSE }}>
              {rev2Count}
            </div>
            <div className="mt-1 font-num text-[10px] font-semibold tracking-wider text-mauve-2">REV 2</div>
          </div>
        </div>
      </div>

      {/* Group Pills & Search */}
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedGroup('all')}
            className={`rounded-full px-4 py-1.5 font-num text-[12px] font-bold transition ${
              selectedGroup === 'all'
                ? 'bg-plum text-white shadow-md'
                : 'border border-white/70 bg-white/50 hover:bg-white/80'
            }`}
            style={selectedGroup !== 'all' ? { color: MUTED } : undefined}
          >
            All Units ({total})
          </button>
          {groups.map((g) => {
            const count = subjectChapters.filter((c) => c.group === g).length;
            const isSel = selectedGroup === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGroup(g)}
                className={`rounded-full px-3.5 py-1.5 font-num text-[12px] font-bold transition ${
                  isSel
                    ? 'bg-plum text-white shadow-md'
                    : 'border border-white/70 bg-white/50 hover:bg-white/80'
                }`}
                style={!isSel ? { color: MUTED } : undefined}
              >
                {g} ({count})
              </button>
            );
          })}
        </div>

        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters..."
            className="field !py-2 !text-[13.5px]"
          />
        </div>
      </div>

      {/* Chapter List */}
      <div className="mt-5 grid grid-cols-1 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredChapters.map((c, idx) => {
            const stage = data.completions[c.id] ?? 0;
            const inToday = todays.includes(c.id);
            const open = openId === c.id;

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ delay: Math.min(0.2, idx * 0.03) }}
                className="rq-panel px-5 py-4 transition-all duration-200"
                style={{
                  background: stage >= 2 ? 'rgba(255, 255, 255, 0.82)' : 'rgba(255, 255, 255, 0.6)',
                }}
              >
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-num text-[10.5px] font-semibold tracking-[0.14em]" style={{ color: MUTED }}>
                        #{c.order} · {c.group.toUpperCase()}
                      </span>
                      {stage >= 2 && (
                        <span className="rounded-full bg-rose-500/15 px-2 py-0.5 font-num text-[10px] font-black text-[#E5487C]">
                          2× REVISED
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : c.id)}
                      className="mt-0.5 block w-full cursor-pointer text-left font-display text-[19px] font-bold leading-snug hover:underline"
                    >
                      {c.name}
                    </button>
                    <div className="mt-1 flex items-center gap-3 text-[12px] font-bold" style={{ color: MUTED }}>
                      <span>{topicCount(c.id)} NCERT Core Topics</span>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : c.id)}
                        className="text-plum underline hover:text-rose-600"
                      >
                        {open ? 'Hide details' : 'View subtopics'}
                      </button>
                    </div>
                  </div>

                  {/* Actions & Passes */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {/* Revision 1 Pill */}
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => store.toggleStage(me, c.id, 1)}
                      className={`cursor-pointer rounded-full px-3.5 py-1.5 font-num text-[11.5px] font-bold transition ${
                        stage >= 1
                          ? 'bg-[#E5487C] text-white shadow-sm'
                          : 'border border-white/80 bg-white/70 text-plum-2 hover:bg-white'
                      }`}
                      title={readOnly ? undefined : 'Toggle Revision 1'}
                    >
                      {stage >= 1 ? '✓ Rev 1 Done' : 'Rev 1'}
                    </button>

                    {/* Revision 2 Pill */}
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => store.toggleStage(me, c.id, 2)}
                      className={`cursor-pointer rounded-full px-3.5 py-1.5 font-num text-[11.5px] font-bold transition ${
                        stage >= 2
                          ? 'bg-[#F2A93B] text-white shadow-sm'
                          : 'border border-white/80 bg-white/70 text-plum-2 hover:bg-white'
                      }`}
                      title={readOnly ? undefined : 'Toggle Revision 2'}
                    >
                      {stage >= 2 ? '✓ Rev 2 Done' : 'Rev 2'}
                    </button>

                    {/* Today Button */}
                    {!readOnly && (
                      inToday ? (
                        <span className="rounded-full bg-plum px-3 py-1.5 font-num text-[11px] font-black text-white">
                          In Today
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => store.addToToday(me, c.id)}
                          className="btn-glass px-3.5 py-1.5 font-num text-[11.5px]"
                        >
                          ＋ Add to today
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Subtopic chips */}
                {open && <TopicsChips id={c.id} />}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredChapters.length === 0 && (
          <div className="rq-panel p-8 text-center">
            <p className="font-bold text-mauve">No chapters found matching your filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
