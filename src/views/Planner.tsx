import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CHAPTERS, TOTAL } from '../data/chapters';
import { TOPICS } from '../data/topics';
import {
  store,
  todayISO,
  daysToExam,
  examDate,
  type UserData,
  type DayPlan,
} from '../lib/store';
import { sound } from '../lib/audio';
import { Toggle, SearchModal, TopicsChips, topicCount } from '../components/ui';
import PartnerSwitch from '../components/PartnerSwitch';

const INK = '#241830',
  MUTED = '#8C6C82',
  ROSE = '#E5487C';
const byId = (id: string) => CHAPTERS.find((c) => c.id === id)!;

export default function Planner({
  me,
  data,
  viewUser,
  onSwitch,
}: {
  me: string;
  data: UserData;
  viewUser: string;
  onSwitch?: (username: string) => void;
}) {
  const [tab, setTab] = useState<'today' | 'weekly' | 'roadmap' | 'tests'>('today');
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  // Today Pomodoro
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerActive, setTimerActive] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // Today inline search bar
  const [inlineSearch, setInlineSearch] = useState('');
  const [searchKind, setSearchKind] = useState<'all' | 'chapters' | 'topics' | 'tests'>('all');
  const [rolloverNotice, setRolloverNotice] = useState<string | null>(null);

  // Weekly planner navigation
  const [weekOffset, setWeekOffset] = useState(0);

  // Roadmap filters
  const [roadmapFilter, setRoadmapFilter] = useState<'all' | 'Physics' | 'Chemistry' | 'Biology'>('all');
  const [roadmapSearch, setRoadmapSearch] = useState('');

  // Modals for adding chapter / topic to a specific day
  const [targetDateForAdd, setTargetDateForAdd] = useState<string | null>(null);
  const [targetDateForTopic, setTargetDateForTopic] = useState<{ dateStr: string; chapterId?: string } | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [selectedChapterForTopic, setSelectedChapterForTopic] = useState<string>(CHAPTERS[0]?.id || '');

  // Test creation form
  const [testTitle, setTestTitle] = useState('');
  const [testDate, setTestDate] = useState(todayISO());
  const [testDuration, setTestDuration] = useState('60 mins');
  const [testMarks, setTestMarks] = useState(180);
  const [testChapterIds, setTestChapterIds] = useState<string[]>([]);
  const [testSelectedTopic, setTestSelectedTopic] = useState<{ chapterId: string; topicName: string }[]>([]);
  const [testCreateSuccess, setTestCreateSuccess] = useState(false);

  const readOnly = viewUser !== me;
  const t = todayISO();
  const todays = store.todaysChapters(data, t);
  const doneSet = new Set(data.todayDone[t] ?? []);
  const partner = store.accountOf(me)?.partner;
  const partnerAccount = partner ? store.accountOf(partner) : null;
  const partnerData = partner ? store.dataOf(partner) : null;

  // Run automatic rollover of yesterday's incomplete topics on mount
  useEffect(() => {
    if (!readOnly) {
      store.checkAndRolloverIncompleteTopics(me);
    }
  }, [me, readOnly]);

  // Pomodoro timer
  useEffect(() => {
    let interval: number | undefined;
    if (timerActive) {
      interval = window.setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            if (mode === 'focus') {
              store.addStudyTime(me, 25);
              sound.playPomodoroGong();
              setSessionCompleted(true);
              setTimeout(() => setSessionCompleted(false), 7000);
              setMode('break');
              return 5 * 60;
            } else {
              setMode('focus');
              return 25 * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, mode, me]);

  const toggleTimer = () => {
    const next = !timerActive;
    setTimerActive(next);
    if (!readOnly) {
      if (next && mode === 'focus') {
        store.startStudyTimer(me);
      } else if (!next) {
        store.stopStudyTimer(me);
      }
    }
  };

  const resetTimer = (secs: number, newMode: 'focus' | 'break') => {
    if (timerActive && !readOnly) {
      store.stopStudyTimer(me);
    }
    setTimerActive(false);
    setMode(newMode);
    setTimerSeconds(secs);
  };

  const mins = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;
  const timeFormatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const totalMinutesStudied = data.timerMinutes ?? 0;
  const hours = Math.floor(totalMinutesStudied / 60);
  const remMinutes = totalMinutesStudied % 60;

  // Generate full 3-Pass NEET schedule
  const exam = examDate();
  const totalDays = daysToExam();
  const activeSyllabusDays = Math.max(1, totalDays - 15);
  const roadmapPlans: DayPlan[] = store.generateNeetRoadmap(data, exam);
  const completedChaptersCount = store.completedCount(data);
  const masteredCount = store.rev2Count(data);
  const totalTestsCompleted = store.getCompletedTestsCount(viewUser);

  // Today's topics grouped by chapter
  const todayCustomPlan = data.customDayPlans?.[t];
  const todayTopics = todayCustomPlan?.topics || [];
  const todayTopicsByChapter = useMemo(() => {
    const map: Record<string, typeof todayTopics> = {};
    for (const top of todayTopics) {
      if (!map[top.chapterId]) map[top.chapterId] = [];
      map[top.chapterId].push(top);
    }
    return map;
  }, [todayTopics]);

  // Today's tests
  const todaysTests = store.getTestsForDate(viewUser, t);

  // ── Inline Search Results in Today's Focus ──────────────────────────────
  const searchResults = useMemo(() => {
    const q = inlineSearch.trim().toLowerCase();
    if (!q) return { chapters: [], topics: [], tests: [] };

    const chapters =
      searchKind === 'all' || searchKind === 'chapters'
        ? CHAPTERS.filter((c) => c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q)).slice(0, 5)
        : [];

    const topics: { chapterId: string; chapterName: string; topicName: string }[] = [];
    if (searchKind === 'all' || searchKind === 'topics') {
      for (const [cid, tList] of Object.entries(TOPICS)) {
        const c = byId(cid);
        if (!c) continue;
        for (const top of tList) {
          if (top.toLowerCase().includes(q)) {
            topics.push({ chapterId: cid, chapterName: c.name, topicName: top });
            if (topics.length >= 6) break;
          }
        }
        if (topics.length >= 6) break;
      }
    }

    const tests =
      searchKind === 'all' || searchKind === 'tests'
        ? (data.tests || []).filter((test) => test.title.toLowerCase().includes(q)).slice(0, 4)
        : [];

    return { chapters, topics, tests };
  }, [inlineSearch, searchKind, data.tests]);

  // ── Weekly Planner Plans (7 Days window) ─────────────────────────────────
  const weeklyPlans = useMemo(() => {
    const startIdx = Math.max(0, weekOffset * 7);
    return roadmapPlans.slice(startIdx, startIdx + 7);
  }, [roadmapPlans, weekOffset]);

  const weekRangeLabel = useMemo(() => {
    if (!weeklyPlans.length) return '';
    const first = weeklyPlans[0];
    const last = weeklyPlans[weeklyPlans.length - 1];
    return `${first.dateFormatted} – ${last.dateFormatted}`;
  }, [weeklyPlans]);

  // ── Filtered Roadmap Plans ──────────────────────────────────────────────
  const filteredRoadmap = roadmapPlans.filter((plan) => {
    if (plan.isBufferPeriod) {
      if (roadmapFilter !== 'all') return false;
      if (roadmapSearch && !'buffer final mock test revision'.includes(roadmapSearch.toLowerCase())) {
        return false;
      }
      return true;
    }

    const planChapters = plan.chapterIds.map((id) => byId(id)).filter(Boolean);
    if (roadmapFilter !== 'all') {
      const hasSubject = planChapters.some((c) => c.subject === roadmapFilter);
      if (!hasSubject) return false;
    }

    if (roadmapSearch) {
      const q = roadmapSearch.toLowerCase();
      const matchesSearch =
        plan.dateFormatted.toLowerCase().includes(q) ||
        plan.dayOfWeek.toLowerCase().includes(q) ||
        `day ${plan.dayIndex}`.includes(q) ||
        planChapters.some((c) => c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q));
      if (!matchesSearch) return false;
    }

    return true;
  });

  // Handler: 1-Click Rollover
  const handleRollover = () => {
    if (readOnly) return;
    const count = store.rolloverIncompleteToTomorrow(me, t);
    if (count > 0) {
      setRolloverNotice(`⚡ Rolled over ${count} unfinished item(s) to tomorrow!`);
    } else {
      setRolloverNotice('✨ All topics completed for today! Nothing to roll over.');
    }
    setTimeout(() => setRolloverNotice(null), 5000);
  };

  // Handler: Create Test
  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly || !testTitle.trim()) return;

    store.addTest(me, {
      title: testTitle.trim(),
      dateStr: testDate,
      duration: testDuration,
      totalMarks: testMarks,
      chapterIds: testChapterIds,
      topics: testSelectedTopic,
    });

    setTestTitle('');
    setTestChapterIds([]);
    setTestSelectedTopic([]);
    setTestCreateSuccess(true);
    setTimeout(() => setTestCreateSuccess(false), 4000);
  };

  return (
    <div className="mx-auto max-w-[1120px] px-4 pb-28 pt-8 sm:px-8" style={{ color: INK }}>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="rq-eyebrow">3-PASS REVISION ENGINE · 1 CH/DAY + RAPID CYCLES</div>
          <h1 className="mt-1 font-display text-[38px] font-bold leading-tight max-sm:text-[30px] text-[#241830]">
            Study <em className="font-semibold italic" style={{ color: ROSE }}>Planner</em>
          </h1>
          <p className="mt-1.5 text-[14px] font-medium" style={{ color: MUTED }}>
            Pass 1 (1 ch/day), followed by 2 complete revision passes. Final 15 days reserved for full mocks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {partner && onSwitch && (
            <PartnerSwitch
              me={me}
              partner={partner}
              partnerName={partnerAccount?.displayName || 'Her'}
              viewUser={viewUser}
              onSwitch={onSwitch}
            />
          )}

          {/* Study Time Summary */}
          <div className="rq-panel flex items-center gap-4 px-5 py-3 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[18px] shadow-sm">
              ⏱️
            </div>
            <div>
              <div className="font-sans text-[22px] font-bold leading-tight tracking-tight text-[#241830] tabular-nums">
                {hours}h {remMinutes}m
              </div>
              <div className="font-sans text-[10px] font-bold tracking-wider text-[#9A6D84]">
                TOTAL TIME ({readOnly ? partnerAccount?.displayName?.toUpperCase() || viewUser.toUpperCase() : 'YOU'})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Way Tab Switcher */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-purple-100/70 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/80 bg-white/70 p-1.5 shadow-2xs">
          <button
            type="button"
            onClick={() => setTab('today')}
            className={`cursor-pointer rounded-xl px-4 py-2 font-sans text-[13px] font-extrabold transition-all duration-150 active:scale-95 ${
              tab === 'today'
                ? 'bg-gradient-to-r from-[#241830] to-[#3B2050] text-white shadow-sm'
                : 'text-[#7E699B] hover:bg-white/60 hover:text-[#241830]'
            }`}
          >
            🎯 Today's Focus
          </button>
          <button
            type="button"
            onClick={() => setTab('weekly')}
            className={`cursor-pointer rounded-xl px-4 py-2 font-sans text-[13px] font-extrabold transition-all duration-150 active:scale-95 flex items-center gap-2 ${
              tab === 'weekly'
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#6D28D9] text-white shadow-sm'
                : 'text-[#7E699B] hover:bg-white/60 hover:text-[#241830]'
            }`}
          >
            <span>📅 Weekly Planner</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('roadmap')}
            className={`cursor-pointer rounded-xl px-4 py-2 font-sans text-[13px] font-extrabold transition-all duration-150 active:scale-95 flex items-center gap-2 ${
              tab === 'roadmap'
                ? 'bg-gradient-to-r from-[#E03E2D] to-[#FF2E79] text-white shadow-sm'
                : 'text-[#7E699B] hover:bg-white/60 hover:text-[#241830]'
            }`}
          >
            <span>🗓️ Total NEET Roadmap</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                tab === 'roadmap' ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {totalDays}d
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('tests')}
            className={`cursor-pointer rounded-xl px-4 py-2 font-sans text-[13px] font-extrabold transition-all duration-150 active:scale-95 flex items-center gap-2 ${
              tab === 'tests'
                ? 'bg-gradient-to-r from-[#059669] to-[#10B981] text-white shadow-sm'
                : 'text-[#7E699B] hover:bg-white/60 hover:text-[#241830]'
            }`}
          >
            <span>📝 Test Center</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                tab === 'tests' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {totalTestsCompleted} Done
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-[12px] font-bold text-[#8C6C82]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11px] font-black text-emerald-700">
              ✓
            </span>
            <span>Rev 1</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block rounded-md bg-purple-100 px-1.5 py-0.5 text-[11px] font-black text-purple-700">
              ✓✓
            </span>
            <span>Rev 2 (Mastered)</span>
          </span>
          <span className="flex items-center gap-1.5 text-rose-700">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Last 15d Buffer</span>
          </span>
        </div>
      </div>

      {sessionCompleted && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-white/80 p-4 text-center shadow-sm">
          <span className="font-sans text-[13.5px] font-semibold text-emerald-800">
            🎉 25-Minute Focus Session Completed! +25 mins logged.
            {partnerAccount ? ' Partner notified on the Wall.' : ''} Time for a 5-min recharge!
          </span>
        </div>
      )}

      {rolloverNotice && (
        <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50/90 p-4 text-center shadow-sm">
          <span className="font-sans text-[13.5px] font-bold text-purple-900">{rolloverNotice}</span>
        </div>
      )}

      {/* VIEWPORT */}
      <AnimatePresence mode="wait" initial={false}>
        {/* ─────────────────────────────────────────────────────────────
            TAB 1: TODAY'S FOCUS
        ────────────────────────────────────────────────────────────── */}
        {tab === 'today' && (
          <motion.div
            key="tab-today"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="w-full mt-6"
          >
            {/* Inline Quick Search & Add Bar */}
            <div className="rq-panel p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#241830] text-[13px] text-white">
                    🔍
                  </span>
                  <span className="font-sans text-[13.5px] font-extrabold text-[#241830]">
                    Quick Add to Today's Planner
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {(['all', 'chapters', 'topics', 'tests'] as const).map((kind) => (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setSearchKind(kind)}
                      className={`cursor-pointer rounded-lg px-2.5 py-1 text-[11px] font-extrabold capitalize transition ${
                        searchKind === kind ? 'bg-[#241830] text-white' : 'bg-white/80 text-[#7E699B] hover:bg-white'
                      }`}
                    >
                      {kind}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 relative">
                <input
                  type="text"
                  value={inlineSearch}
                  onChange={(e) => setInlineSearch(e.target.value)}
                  placeholder="Type any chapter (e.g. 'Optics'), topic (e.g. 'Friction'), or test name..."
                  className="field !w-full !text-[13.5px] !py-2.5 !px-3.5"
                />
                {inlineSearch && (
                  <button
                    type="button"
                    onClick={() => setInlineSearch('')}
                    className="absolute right-3 top-2.5 cursor-pointer text-[12px] font-bold text-[#8C6C82] hover:text-[#241830]"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Inline Search Results Dropdown */}
              {inlineSearch.trim() && (
                <div className="mt-3 space-y-2 max-h-[320px] overflow-y-auto rounded-2xl border border-purple-100 bg-white/90 p-3 shadow-sm">
                  {searchResults.chapters.length === 0 &&
                    searchResults.topics.length === 0 &&
                    searchResults.tests.length === 0 && (
                      <div className="py-4 text-center text-[12.5px] font-bold text-[#8C6C82]">
                        No matching chapters, topics, or tests found for "{inlineSearch}".
                      </div>
                    )}

                  {/* Chapters found */}
                  {searchResults.chapters.map((c) => {
                    const alreadyInToday = todays.includes(c.id);
                    return (
                      <div
                        key={`sr-ch-${c.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-purple-100/80 bg-white p-2.5 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[9.5px] font-extrabold text-purple-800">
                              {c.subject}
                            </span>
                            <span className="font-sans text-[13.5px] font-bold text-[#241830] truncate">{c.name}</span>
                          </div>
                          <div className="text-[10.5px] font-semibold text-[#8C6C82]">
                            {c.group} · {topicCount(c.id)} Topics
                          </div>
                        </div>

                        {!readOnly && (
                          <button
                            type="button"
                            disabled={alreadyInToday}
                            onClick={() => {
                              store.addChapterToDay(me, c.id, t);
                              setInlineSearch('');
                            }}
                            className={`cursor-pointer rounded-lg px-3 py-1 text-[11.5px] font-bold transition ${
                              alreadyInToday
                                ? 'bg-emerald-50 text-emerald-700 cursor-default'
                                : 'bg-[#241830] text-white hover:bg-rose-600'
                            }`}
                          >
                            {alreadyInToday ? '✓ In Today' : '＋ Add Chapter'}
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Topics found */}
                  {searchResults.topics.map((top, idx) => (
                    <div
                      key={`sr-top-${idx}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-purple-100/80 bg-white p-2.5 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-rose-700 truncate">
                          📖 {top.chapterName}
                        </div>
                        <div className="font-sans text-[13px] font-bold text-[#241830] truncate">{top.topicName}</div>
                      </div>

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            store.addTopicToDay(me, top.chapterId, top.topicName, t);
                            setInlineSearch('');
                          }}
                          className="cursor-pointer rounded-lg bg-rose-600 px-3 py-1 text-[11.5px] font-bold text-white hover:bg-rose-700 transition"
                        >
                          ＋ Add Topic
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Tests found */}
                  {searchResults.tests.map((test) => (
                    <div
                      key={`sr-tst-${test.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-extrabold text-emerald-800">
                            TEST
                          </span>
                          <span className="font-sans text-[13px] font-bold text-[#241830] truncate">{test.title}</span>
                        </div>
                        <div className="text-[10.5px] font-semibold text-[#8C6C82]">
                          Scheduled: {test.dateStr} · {test.duration} · {test.totalMarks} Marks
                        </div>
                      </div>

                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => {
                            // Move/Schedule test for today
                            test.dateStr = t;
                            store.syncUserDataToSupabase(me);
                            setInlineSearch('');
                          }}
                          className="cursor-pointer rounded-lg bg-emerald-700 px-3 py-1 text-[11.5px] font-bold text-white hover:bg-emerald-800 transition"
                        >
                          Schedule Today
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grid: Timer / Co-Working & Today Tasks */}
            <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
              {/* Left Column: Pomodoro & Partner Co-study */}
              <div className="flex flex-col gap-6">
                {/* Co-working Timer Panel */}
                <section className="rq-panel p-6 text-center">
                  <div className="rq-eyebrow">NEET DEEP-WORK POMODORO</div>
                  <div className="mt-3 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => resetTimer(25 * 60, 'focus')}
                      className={`cursor-pointer rounded-full px-4 py-1.5 font-sans text-[12px] font-semibold transition ${
                        mode === 'focus'
                          ? 'bg-[#241830] text-white shadow-sm'
                          : 'bg-white/60 text-[#76637E] hover:bg-white'
                      }`}
                    >
                      Focus (25m)
                    </button>
                    <button
                      type="button"
                      onClick={() => resetTimer(5 * 60, 'break')}
                      className={`cursor-pointer rounded-full px-4 py-1.5 font-sans text-[12px] font-semibold transition ${
                        mode === 'break'
                          ? 'bg-[#E5487C] text-white shadow-sm'
                          : 'bg-white/60 text-[#76637E] hover:bg-white'
                      }`}
                    >
                      Break (5m)
                    </button>
                  </div>

                  <div className="my-6">
                    <div
                      className="font-sans text-[72px] font-extrabold tracking-tight tabular-nums"
                      style={{ color: mode === 'focus' ? INK : ROSE }}
                    >
                      {timeFormatted}
                    </div>
                    <p className="font-sans text-[12px] font-medium tracking-wide text-[#8C6C82]">
                      {timerActive ? (mode === 'focus' ? '🔥 Focus mode engaged' : '☕ Rest and breathe') : 'Paused'}
                    </p>
                  </div>

                  <div className="flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={toggleTimer}
                      className="rq-rosebtn min-w-[130px] rounded-full py-2.5 font-sans text-[13.5px] cursor-pointer"
                    >
                      {timerActive ? 'Pause' : 'Start Session'}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetTimer(25 * 60, 'focus')}
                      className="btn-glass px-5 py-2.5 font-sans text-[13px] cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                </section>

                {/* Partner Live Presence Box */}
                {partnerAccount && partnerData ? (
                  <section className="rq-panel p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="relative flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                        </span>
                        <span className="font-num text-[11px] font-bold tracking-wider text-mauve-2">
                          PARTNER DESK · ONLINE
                        </span>
                      </div>
                      <span className="rq-tag">{partnerAccount.streak} DAY STREAK 🔥</span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-tr from-rose-200 to-amber-100 font-display text-[20px] font-black text-rose-800 shadow-sm">
                        {partnerAccount.displayName[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-display text-[18px] font-extrabold">{partnerAccount.displayName}</div>
                        <div className="truncate text-[12.5px] font-bold text-mauve">
                          {partnerData.currentActivity || 'Active on desk'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl bg-white/70 p-3 text-[12.5px] font-bold text-plum-2">
                      ✨ <span>Dual desks synchronized for NEET UG.</span>
                    </div>
                  </section>
                ) : (
                  <section className="rounded-2xl border border-white/70 bg-white/40 p-4 text-center">
                    <div className="text-[12px] font-bold text-[#7E699B]">
                      Co-working status unlocks when paired with your study partner.
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column: Today's Tasks */}
              <div className="flex flex-col gap-6">
                {/* Active Chapters Panel */}
                <section className="rq-panel p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/60 pb-4">
                    <div>
                      <h2 className="font-display text-[22px] font-extrabold">Active Chapters</h2>
                      <div className="font-num text-[11.5px] font-semibold text-mauve">
                        {doneSet.size} of {todays.length} completed today
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!readOnly && (
                        <>
                          <button
                            type="button"
                            onClick={handleRollover}
                            className="cursor-pointer rounded-full border border-purple-200 bg-white/80 px-3.5 py-1.5 font-sans text-[11.5px] font-bold text-purple-800 hover:bg-white shadow-2xs"
                            title="Move incomplete topics & chapters to tomorrow"
                          >
                            ⚡ Roll Over to Tomorrow
                          </button>
                          <button
                            type="button"
                            onClick={() => setSearchModalOpen(true)}
                            className="rq-rosebtn rounded-full px-4 py-1.5 font-num text-[12px] cursor-pointer"
                          >
                            ＋ Add Chapter
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    {todays.length === 0 && (
                      <div className="py-10 text-center">
                        <p className="font-display text-[17px] font-bold text-mauve">No chapters planned for today.</p>
                        <p className="mt-1 text-[12.5px] font-bold text-mauve-2">
                          Use the quick add bar above or select from the 93 NEET syllabus chapters.
                        </p>
                      </div>
                    )}

                    {todays.map((id) => {
                      const c = byId(id);
                      if (!c) return null;
                      const isDone = doneSet.has(id);
                      const compStage = data.completions[id] ?? 0;
                      const open = openId === id;

                      return (
                        <motion.div
                          key={id}
                          layout
                          className="rounded-[16px] border border-white/90 bg-white/70 p-4 transition-all duration-200"
                          style={{ boxShadow: '0 4px 12px rgba(71,28,43,0.04)' }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="rq-tag flex-none">{c.subject.toUpperCase()}</span>
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => setOpenId(open ? null : id)}
                                className="block w-full cursor-pointer truncate text-left font-display text-[16px] font-bold hover:underline"
                              >
                                <span className={isDone ? 'line-through opacity-50' : ''}>{c.name}</span>
                              </button>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] font-bold text-mauve-2">
                                  {c.group} · {topicCount(id)} Topics
                                </span>
                                {compStage >= 2 ? (
                                  <span className="rounded-md bg-purple-100 px-1.5 py-0.2 font-sans text-[10px] font-black text-purple-700">
                                    ✓✓ Mastered (Rev 2)
                                  </span>
                                ) : compStage === 1 ? (
                                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 font-sans text-[10px] font-black text-emerald-700">
                                    ✓ Revised (Rev 1)
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            {readOnly ? (
                              <span
                                className={`rounded-full px-3 py-1 font-num text-[11px] font-bold ${
                                  isDone ? 'bg-[#E5487C] text-white' : 'bg-white/80 text-mauve'
                                }`}
                              >
                                {isDone ? 'Done' : 'Pending'}
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Toggle small on={isDone} onClick={() => store.toggleDone(me, id, t)} />
                                <button
                                  type="button"
                                  onClick={() => store.removeChapterFromDay(me, id, t)}
                                  className="px-1 text-[16px] font-bold text-mauve transition hover:text-rose-600 cursor-pointer"
                                  title="Remove from today"
                                >
                                  ✕
                                </button>
                              </div>
                            )}
                          </div>

                          {open && <TopicsChips id={id} />}
                        </motion.div>
                      );
                    })}
                  </div>
                </section>

                {/* Topic-Level Focus: Grouped by Chapter Name */}
                {Object.keys(todayTopicsByChapter).length > 0 && (
                  <section className="rq-panel p-6">
                    <div className="flex items-center justify-between border-b border-white/60 pb-3">
                      <div>
                        <h3 className="font-display text-[19px] font-extrabold text-[#241830]">
                          Specific Topics for Today
                        </h3>
                        <p className="text-[11.5px] font-semibold text-mauve">
                          Uncompleted topics automatically roll over to tomorrow with chapter headers.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {Object.entries(todayTopicsByChapter).map(([cid, tList]) => {
                        const chapter = byId(cid);
                        return (
                          <div key={cid} className="rounded-2xl border border-purple-100 bg-white/80 p-4">
                            <div className="flex items-center justify-between border-b border-purple-100/60 pb-2">
                              <span className="font-sans text-[13px] font-black text-[#241830]">
                                📖 {chapter?.subject || 'NEET'} · {chapter?.name || cid}
                              </span>
                              <span className="text-[10.5px] font-bold text-[#8C6C82]">
                                {tList.filter((top) => store.isTopicDone(viewUser, cid, top.topicName, t)).length} /{' '}
                                {tList.length} Done
                              </span>
                            </div>

                            <div className="mt-2.5 space-y-2">
                              {tList.map((top, idx) => {
                                const isDone = store.isTopicDone(viewUser, cid, top.topicName, t);
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between gap-2 rounded-xl bg-purple-50/50 px-3 py-2"
                                  >
                                    <label className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1">
                                      <input
                                        type="checkbox"
                                        checked={isDone}
                                        disabled={readOnly}
                                        onChange={() => store.toggleTopicDone(me, cid, top.topicName, t)}
                                        className="h-4 w-4 rounded accent-rose-600 cursor-pointer"
                                      />
                                      <span
                                        className={`font-sans text-[12.5px] font-medium text-[#241830] truncate ${
                                          isDone ? 'line-through opacity-50' : ''
                                        }`}
                                      >
                                        {top.topicName}
                                      </span>
                                    </label>

                                    {!readOnly && (
                                      <button
                                        type="button"
                                        onClick={() => store.removeTopicFromDay(me, cid, top.topicName, t)}
                                        className="cursor-pointer text-[13px] font-bold text-mauve hover:text-rose-600 px-1"
                                        title="Remove topic"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Scheduled Tests for Today */}
                {todaysTests.length > 0 && (
                  <section className="rq-panel p-6 border-2 border-emerald-200/80 bg-emerald-50/40">
                    <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[18px]">📝</span>
                        <h3 className="font-display text-[19px] font-extrabold text-[#241830]">
                          Today's Scheduled Tests
                        </h3>
                      </div>
                      <span className="rounded-full bg-emerald-200 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-900">
                        {todaysTests.filter((t) => t.isCompleted).length} / {todaysTests.length} Complete
                      </span>
                    </div>

                    <div className="mt-3.5 space-y-3">
                      {todaysTests.map((test) => (
                        <div
                          key={test.id}
                          className="rounded-2xl border border-emerald-200/90 bg-white/90 p-4 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="font-sans text-[15px] font-extrabold text-[#241830]">{test.title}</div>
                              <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-bold text-[#8C6C82]">
                                <span>⏱️ {test.duration}</span>
                                <span>🎯 {test.totalMarks} Marks</span>
                                {test.chapterIds && test.chapterIds.length > 0 && (
                                  <span>• {test.chapterIds.length} Chapters Covered</span>
                                )}
                              </div>
                            </div>

                            {!readOnly && (
                              <button
                                type="button"
                                onClick={() => store.toggleTestCompleted(me, test.id)}
                                className={`cursor-pointer rounded-xl px-3.5 py-1.5 font-sans text-[12px] font-extrabold transition ${
                                  test.isCompleted
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100'
                                }`}
                              >
                                {test.isCompleted ? '✓ Completed' : 'Mark Complete'}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: WEEKLY PLANNER (7-Day Vertical Timeline List)
        ────────────────────────────────────────────────────────────── */}
        {tab === 'weekly' && (
          <motion.div
            key="tab-weekly"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="w-full mt-6"
          >
            {/* Week navigation bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 rq-panel p-4 mb-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={weekOffset <= 0}
                  onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
                  className="btn-glass px-3 py-1.5 text-[12.5px] font-bold disabled:opacity-40 cursor-pointer"
                >
                  ← Previous Week
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="rounded-xl bg-[#241830] px-3.5 py-1.5 font-sans text-[12px] font-bold text-white cursor-pointer"
                >
                  Current Week
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="btn-glass px-3 py-1.5 text-[12.5px] font-bold cursor-pointer"
                >
                  Next Week →
                </button>
              </div>

              <div className="font-sans text-[14.5px] font-extrabold text-[#241830]">
                Week {weekOffset + 1}: <span className="text-[#8B5CF6]">{weekRangeLabel}</span>
              </div>
            </div>

            {/* 7-Day Vertical Timeline List */}
            <div className="space-y-4">
              {weeklyPlans.map((plan) => {
                const chapters = plan.chapterIds.map((id) => byId(id)).filter(Boolean);
                const dayTopics = data.customDayPlans?.[plan.dateStr]?.topics || [];
                const allDone = chapters.every((c) => (data.completions[c.id] ?? 0) >= 1);

                return (
                  <motion.div
                    key={`week-day-${plan.dayIndex}`}
                    className={`rounded-3xl border p-5 sm:p-6 transition-all duration-200 ${
                      plan.isToday
                        ? 'border-purple-400 bg-white shadow-[0_8px_30px_rgba(139,92,246,0.12)] ring-2 ring-purple-300/40'
                        : 'border-white/90 bg-white/80 shadow-xs'
                    }`}
                  >
                    {/* Day header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100/80 pb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-2xl font-mono text-[13px] font-black ${
                            plan.isToday ? 'bg-[#8B5CF6] text-white shadow-xs' : 'bg-purple-100 text-[#241830]'
                          }`}
                        >
                          D{plan.dayIndex}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-sans text-[16px] font-extrabold text-[#241830]">
                              {plan.dateFormatted} ({plan.dayOfWeek})
                            </span>
                            {plan.isToday && (
                              <span className="rounded-full bg-[#8B5CF6] px-2.5 py-0.5 font-sans text-[10.5px] font-extrabold tracking-wider text-white uppercase animate-pulse">
                                TODAY
                              </span>
                            )}
                            <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                              {plan.phase}
                            </span>
                          </div>
                          <div className="font-sans text-[11px] font-bold text-[#8C6C82]">
                            {chapters.length} Chapters · {dayTopics.length} Specific Topics
                          </div>
                        </div>
                      </div>

                      {/* Day actions & status */}
                      <div className="flex items-center gap-2">
                        {!readOnly && (
                          <>
                            <button
                              type="button"
                              onClick={() => setTargetDateForAdd(plan.dateStr)}
                              className="cursor-pointer rounded-full border border-purple-200 bg-white px-3 py-1 font-sans text-[11.5px] font-bold text-purple-900 hover:bg-purple-50 shadow-2xs"
                            >
                              ＋ Chapter
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetDateForTopic({ dateStr: plan.dateStr, chapterId: chapters[0]?.id });
                                setSelectedChapterForTopic(chapters[0]?.id || CHAPTERS[0]?.id);
                              }}
                              className="cursor-pointer rounded-full border border-purple-200 bg-white px-3 py-1 font-sans text-[11.5px] font-bold text-purple-900 hover:bg-purple-50 shadow-2xs"
                            >
                              ＋ Topic
                            </button>
                          </>
                        )}

                        {allDone && chapters.length > 0 ? (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 font-sans text-[11.5px] font-bold text-emerald-800">
                            ✓ Complete
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Chapters Grid */}
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {chapters.map((c) => {
                        const compStage = data.completions[c.id] ?? 0;
                        const isDone = compStage >= 1;

                        const subjectColors =
                          c.subject === 'Physics'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : c.subject === 'Chemistry'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200';

                        return (
                          <div
                            key={c.id}
                            className="rounded-2xl border border-white/90 bg-white/85 p-3.5 shadow-2xs hover:shadow-xs transition"
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-md border px-2 py-0.5 font-sans text-[9.5px] font-extrabold uppercase tracking-wider ${subjectColors}`}
                                  >
                                    {c.subject}
                                  </span>
                                  <span className="text-[11px] font-semibold text-[#8C6C82] truncate">{c.group}</span>
                                </div>
                                <div className="mt-1 font-display text-[15px] font-bold text-[#241830] truncate">
                                  <span className={isDone ? 'line-through opacity-60' : ''}>{c.name}</span>
                                </div>
                                <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-[#8C6C82]">
                                  <span>{topicCount(c.id)} Topics</span>
                                  {compStage >= 2 ? (
                                    <span className="rounded-md bg-purple-100 px-1.5 py-0.2 text-[10px] font-black text-purple-700">
                                      ✓✓ Mastered
                                    </span>
                                  ) : compStage === 1 ? (
                                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[10px] font-black text-emerald-700">
                                      ✓ Revised
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              {!readOnly && (
                                <div className="flex items-center gap-1.5 flex-none">
                                  <Toggle
                                    small
                                    on={isDone}
                                    onClick={() => store.toggleDone(me, c.id, plan.dateStr)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => store.removeChapterFromDay(me, c.id, plan.dateStr)}
                                    className="cursor-pointer px-1 text-[14px] font-bold text-mauve hover:text-rose-600"
                                    title="Remove chapter from this day"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Day Topics */}
                    {dayTopics.length > 0 && (
                      <div className="mt-3.5 rounded-2xl bg-purple-50/60 p-3">
                        <div className="font-sans text-[11px] font-extrabold uppercase tracking-wider text-purple-900 mb-2">
                          Specific Topics Scheduled
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {dayTopics.map((top, idx) => {
                            const isDone = store.isTopicDone(viewUser, top.chapterId, top.topicName, plan.dateStr);
                            const ch = byId(top.chapterId);
                            return (
                              <div
                                key={idx}
                                className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-bold ${
                                  isDone
                                    ? 'bg-emerald-100 border-emerald-200 text-emerald-900 line-through'
                                    : 'bg-white border-purple-200 text-[#241830]'
                                }`}
                              >
                                <span>
                                  {ch?.name ? `${ch.name}: ` : ''}
                                  {top.topicName}
                                </span>
                                {!readOnly && (
                                  <button
                                    type="button"
                                    onClick={() => store.removeTopicFromDay(me, top.chapterId, top.topicName, plan.dateStr)}
                                    className="cursor-pointer text-rose-500 hover:text-rose-700 font-bold ml-1"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: TOTAL NEET ROADMAP (Full Editable 3-Pass Syllabus)
        ────────────────────────────────────────────────────────────── */}
        {tab === 'roadmap' && (
          <motion.div
            key="tab-roadmap"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="w-full mt-6"
          >
            {/* Roadmap Metric Dashboard */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rq-panel p-5">
                <div className="rq-eyebrow">NEET EXAM COUNTDOWN</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-sans text-[36px] font-black text-[#1A1126] tabular-nums">{totalDays}</span>
                  <span className="font-sans text-[14px] font-bold text-[#7E699B]">Days Left</span>
                </div>
                <div className="mt-1 text-[11.5px] font-medium text-[#8C6C82]">Target: {exam}</div>
              </div>

              <div className="rq-panel p-5">
                <div className="rq-eyebrow">PASS 1: 1 CHAPTER / DAY</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-sans text-[36px] font-black text-[#8B5CF6] tabular-nums">93</span>
                  <span className="font-sans text-[14px] font-bold text-[#7E699B]">Days Target</span>
                </div>
                <div className="mt-1 text-[11.5px] font-medium text-[#8C6C82]">
                  {activeSyllabusDays} active days before 15d buffer
                </div>
              </div>

              <div className="rq-panel p-5 border-2 border-rose-300/80 bg-rose-50/50">
                <div className="font-num text-[11px] font-extrabold uppercase tracking-widest text-[#E03E2D]">
                  🎯 MOCK & BUFFER PERIOD
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-sans text-[36px] font-black text-[#E03E2D] tabular-nums">15</span>
                  <span className="font-sans text-[14px] font-bold text-[#E03E2D]">Days Buffer</span>
                </div>
                <div className="mt-1 text-[11.5px] font-bold text-rose-800">100% empty of new chapters</div>
              </div>

              <div className="rq-panel p-5">
                <div className="rq-eyebrow">REVISION 1 & 2 MASTERY</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-sans text-[36px] font-black text-[#1A1126] tabular-nums">
                    {completedChaptersCount}
                  </span>
                  <span className="font-sans text-[14px] font-bold text-[#7E699B]">/ {TOTAL}</span>
                </div>
                <div className="mt-1 text-[11.5px] font-medium text-[#8C6C82]">
                  {masteredCount} chapters awarded ✓✓ Mastered
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rq-panel p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRoadmapFilter('all')}
                  className={`cursor-pointer rounded-xl px-3.5 py-1.5 font-sans text-[12px] font-extrabold transition active:scale-95 ${
                    roadmapFilter === 'all'
                      ? 'bg-[#241830] text-white shadow-xs'
                      : 'bg-white/80 text-[#7E699B] hover:bg-white'
                  }`}
                >
                  All Days ({roadmapPlans.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRoadmapFilter('Physics')}
                  className={`cursor-pointer rounded-xl px-3.5 py-1.5 font-sans text-[12px] font-extrabold transition active:scale-95 ${
                    roadmapFilter === 'Physics'
                      ? 'bg-[#8B5CF6] text-white shadow-xs'
                      : 'bg-white/80 text-[#7E699B] hover:bg-white'
                  }`}
                >
                  Physics (33)
                </button>
                <button
                  type="button"
                  onClick={() => setRoadmapFilter('Chemistry')}
                  className={`cursor-pointer rounded-xl px-3.5 py-1.5 font-sans text-[12px] font-extrabold transition active:scale-95 ${
                    roadmapFilter === 'Chemistry'
                      ? 'bg-[#F59E0B] text-white shadow-xs'
                      : 'bg-white/80 text-[#7E699B] hover:bg-white'
                  }`}
                >
                  Chemistry (28)
                </button>
                <button
                  type="button"
                  onClick={() => setRoadmapFilter('Biology')}
                  className={`cursor-pointer rounded-xl px-3.5 py-1.5 font-sans text-[12px] font-extrabold transition active:scale-95 ${
                    roadmapFilter === 'Biology'
                      ? 'bg-[#E03E2D] text-white shadow-xs'
                      : 'bg-white/80 text-[#7E699B] hover:bg-white'
                  }`}
                >
                  Biology (32)
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={roadmapSearch}
                  onChange={(e) => setRoadmapSearch(e.target.value)}
                  placeholder="Search day or chapter..."
                  className="field !py-1.5 !px-3 !text-[12.5px] !w-48 sm:!w-64"
                />
                {roadmapSearch && (
                  <button
                    type="button"
                    onClick={() => setRoadmapSearch('')}
                    className="cursor-pointer text-[12px] font-bold text-[#8C6C82] hover:text-[#241830]"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Day-by-Day Timeline */}
            <div className="mt-5 space-y-4">
              {filteredRoadmap.length === 0 && (
                <div className="rq-panel p-12 text-center">
                  <p className="font-display text-[18px] font-bold text-[#8C6C82]">
                    No schedule entries found matching your filter.
                  </p>
                </div>
              )}

              {filteredRoadmap.map((plan) => {
                if (plan.isBufferPeriod) {
                  return (
                    <motion.div
                      key={`day-${plan.dayIndex}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-3xl border-2 border-dashed border-rose-300 bg-gradient-to-r from-rose-50/80 via-amber-50/60 to-white/90 p-6 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rose-200/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E03E2D] to-amber-400 text-[16px] text-white shadow-xs">
                            🎯
                          </span>
                          <div>
                            <div className="font-sans text-[15px] font-black text-[#241830]">
                              Day {plan.dayIndex} · {plan.dateFormatted} ({plan.dayOfWeek})
                            </div>
                            <div className="font-num text-[11px] font-bold uppercase tracking-wider text-rose-700">
                              Final Mock & Rapid Revision Buffer · Day {plan.bufferDayNumber} of 15
                            </div>
                          </div>
                        </div>

                        <span className="rounded-full bg-rose-500 px-3.5 py-1 font-sans text-[11.5px] font-black tracking-wide text-white shadow-xs">
                          NO NEW CHAPTERS · REVISION ONLY
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-rose-200/60 bg-white/80 p-3.5">
                          <div className="text-[12px] font-extrabold text-[#241830]">📝 Full-Length Mock Test</div>
                          <div className="mt-1 text-[11px] font-medium text-[#7E699B]">
                            3 Hours 20 Mins exam simulation under strict NEET UG conditions.
                          </div>
                        </div>

                        <div className="rounded-2xl border border-rose-200/60 bg-white/80 p-3.5">
                          <div className="text-[12px] font-extrabold text-[#241830]">🔍 Error Log Deep-Dive</div>
                          <div className="mt-1 text-[11px] font-medium text-[#7E699B]">
                            Diagnose negative markings and review tricky physics/chemistry concepts.
                          </div>
                        </div>

                        <div className="rounded-2xl border border-rose-200/60 bg-white/80 p-3.5">
                          <div className="text-[12px] font-extrabold text-[#241830]">⚡ NCERT Biology Recap</div>
                          <div className="mt-1 text-[11px] font-medium text-[#7E699B]">
                            Rapid recap of high-yield tables, scientist years & diagrams.
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                const chapters = plan.chapterIds.map((id) => byId(id)).filter(Boolean);
                const allDone = chapters.every((c) => (data.completions[c.id] ?? 0) >= 1);

                return (
                  <motion.div
                    key={`day-${plan.dayIndex}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-3xl border p-5 sm:p-6 transition-all duration-200 ${
                      plan.isToday
                        ? 'border-rose-400 bg-white/95 shadow-[0_8px_30px_rgba(224,62,45,0.12)] ring-2 ring-rose-300/40'
                        : 'border-white/90 bg-white/75 shadow-xs hover:bg-white/90'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-100/80 pb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 items-center justify-center rounded-2xl font-mono text-[13px] font-black ${
                            plan.isToday ? 'bg-[#E03E2D] text-white shadow-xs' : 'bg-purple-100 text-[#241830]'
                          }`}
                        >
                          D{plan.dayIndex}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-sans text-[16px] font-extrabold text-[#241830]">
                              {plan.dateFormatted} ({plan.dayOfWeek})
                            </span>
                            {plan.isToday && (
                              <span className="rounded-full bg-[#E03E2D] px-2.5 py-0.5 font-sans text-[10.5px] font-extrabold tracking-wider text-white uppercase animate-pulse">
                                TODAY
                              </span>
                            )}
                            <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                              {plan.phase}
                            </span>
                          </div>
                          <div className="font-sans text-[11px] font-bold text-[#8C6C82]">
                            {chapters.length} {chapters.length === 1 ? 'Chapter' : 'Chapters'} Scheduled
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => setTargetDateForAdd(plan.dateStr)}
                            className="cursor-pointer rounded-full border border-purple-200 bg-white px-3 py-1 font-sans text-[11.5px] font-bold text-purple-900 hover:bg-purple-50 shadow-2xs"
                          >
                            ＋ Add Chapter
                          </button>
                        )}

                        {allDone ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-sans text-[11.5px] font-bold text-emerald-800">
                            ✓ Day Completed
                          </span>
                        ) : (
                          <span className="rounded-full bg-white/80 border border-purple-100 px-3 py-1 font-sans text-[11.5px] font-bold text-[#7E699B]">
                            {chapters.filter((c) => (data.completions[c.id] ?? 0) >= 1).length} / {chapters.length} Done
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {chapters.map((c) => {
                        const compStage = data.completions[c.id] ?? 0;
                        const isDone = compStage >= 1;
                        const open = openId === c.id;

                        const subjectColors =
                          c.subject === 'Physics'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : c.subject === 'Chemistry'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200';

                        return (
                          <div
                            key={c.id}
                            className="rounded-2xl border border-white/90 bg-white/85 p-3.5 shadow-2xs hover:shadow-xs transition"
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-md border px-2 py-0.5 font-sans text-[9.5px] font-extrabold uppercase tracking-wider ${subjectColors}`}
                                  >
                                    {c.subject}
                                  </span>
                                  <span className="text-[11px] font-semibold text-[#8C6C82] truncate">{c.group}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setOpenId(open ? null : c.id)}
                                  className="mt-1.5 block w-full text-left font-display text-[15px] font-bold text-[#241830] hover:underline cursor-pointer"
                                >
                                  <span className={isDone ? 'line-through opacity-60' : ''}>{c.name}</span>
                                </button>
                                <div className="mt-1 flex items-center gap-2 text-[11px] font-bold text-[#8C6C82]">
                                  <span>{topicCount(c.id)} Topics</span>
                                  {compStage >= 2 ? (
                                    <span className="rounded-md bg-purple-100 px-1.5 py-0.2 text-[10px] font-black text-purple-700">
                                      ✓✓ Mastered (Rev 2)
                                    </span>
                                  ) : compStage === 1 ? (
                                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.2 text-[10px] font-black text-emerald-700">
                                      ✓ Revised (Rev 1)
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              {!readOnly && (
                                <div className="flex items-center gap-1.5 flex-none">
                                  <Toggle
                                    small
                                    on={isDone}
                                    onClick={() => store.toggleDone(me, c.id, plan.dateStr)}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => store.removeChapterFromDay(me, c.id, plan.dateStr)}
                                    className="cursor-pointer px-1 text-[14px] font-bold text-mauve hover:text-rose-600"
                                    title="Remove chapter"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>

                            {open && <TopicsChips id={c.id} />}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 4: TEST CENTER (Create tests, track tests completed)
        ────────────────────────────────────────────────────────────── */}
        {tab === 'tests' && (
          <motion.div
            key="tab-tests"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="w-full mt-6"
          >
            {/* Top Stat Banner */}
            <div className="grid gap-4 sm:grid-cols-3 mb-6">
              <div className="rq-panel p-5">
                <div className="rq-eyebrow">TOTAL TESTS COMPLETED</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-sans text-[36px] font-black text-[#059669] tabular-nums">
                    {totalTestsCompleted}
                  </span>
                  <span className="font-sans text-[14px] font-bold text-[#7E699B]">Tests Mastered</span>
                </div>
                <div className="mt-1 text-[11.5px] font-medium text-[#8C6C82]">Tracked across full preparation</div>
              </div>

              <div className="rq-panel p-5">
                <div className="rq-eyebrow">ACTIVE SCHEDULED TESTS</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-sans text-[36px] font-black text-[#8B5CF6] tabular-nums">
                    {(data.tests || []).filter((t) => !t.isCompleted).length}
                  </span>
                  <span className="font-sans text-[14px] font-bold text-[#7E699B]">Upcoming</span>
                </div>
                <div className="mt-1 text-[11.5px] font-medium text-[#8C6C82]">Appear on their scheduled dates</div>
              </div>

              <div className="rq-panel p-5">
                <div className="rq-eyebrow">TODAY'S TESTS</div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-sans text-[36px] font-black text-[#1A1126] tabular-nums">
                    {todaysTests.length}
                  </span>
                  <span className="font-sans text-[14px] font-bold text-[#7E699B]">Due Today</span>
                </div>
                <div className="mt-1 text-[11.5px] font-medium text-[#8C6C82]">Synced with Today's Focus</div>
              </div>
            </div>

            {/* Test Creator Panel */}
            {!readOnly && (
              <section className="rq-panel p-6 mb-6">
                <div className="border-b border-purple-100 pb-3">
                  <h2 className="font-display text-[20px] font-extrabold text-[#241830]">
                    Create & Schedule a New Test
                  </h2>
                  <p className="text-[12.5px] font-medium text-[#8C6C82]">
                    Add any chapters or topics to this test. Tests scheduled for today automatically appear on Today's
                    Focus!
                  </p>
                </div>

                {testCreateSuccess && (
                  <div className="mt-3 rounded-xl bg-emerald-100 p-3 text-[13px] font-bold text-emerald-800">
                    🎉 Test created successfully and added to your schedule!
                  </div>
                )}

                <form onSubmit={handleCreateTest} className="mt-4 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[12px] font-bold text-[#241830] mb-1">Test Title</label>
                      <input
                        type="text"
                        required
                        value={testTitle}
                        onChange={(e) => setTestTitle(e.target.value)}
                        placeholder="e.g. Physics Mechanics Unit Test 1"
                        className="field !w-full !text-[13px] !py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#241830] mb-1">Scheduled Date</label>
                      <input
                        type="date"
                        required
                        value={testDate}
                        onChange={(e) => setTestDate(e.target.value)}
                        className="field !w-full !text-[13px] !py-2"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-[12px] font-bold text-[#241830] mb-1">Duration</label>
                      <input
                        type="text"
                        value={testDuration}
                        onChange={(e) => setTestDuration(e.target.value)}
                        placeholder="e.g. 60 mins, 3 Hours 20 Mins"
                        className="field !w-full !text-[13px] !py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-[12px] font-bold text-[#241830] mb-1">Total Marks</label>
                      <input
                        type="number"
                        value={testMarks}
                        onChange={(e) => setTestMarks(Number(e.target.value))}
                        className="field !w-full !text-[13px] !py-2"
                      />
                    </div>
                  </div>

                  {/* Chapter Selector for Test */}
                  <div>
                    <label className="block text-[12px] font-bold text-[#241830] mb-1">
                      Include Chapters in Test ({testChapterIds.length} selected)
                    </label>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-purple-100 bg-white/70 p-2 space-y-1">
                      {CHAPTERS.map((c) => {
                        const isSelected = testChapterIds.includes(c.id);
                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              if (isSelected) {
                                setTestChapterIds(testChapterIds.filter((id) => id !== c.id));
                              } else {
                                setTestChapterIds([...testChapterIds, c.id]);
                              }
                            }}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg cursor-pointer text-[12px] transition ${
                              isSelected ? 'bg-purple-100 text-purple-900 font-bold' : 'hover:bg-purple-50 text-[#241830]'
                            }`}
                          >
                            <span>
                              [{c.subject}] {c.name}
                            </span>
                            <span>{isSelected ? '✓' : '＋'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="rq-rosebtn rounded-full px-6 py-2.5 font-sans text-[13px] font-bold cursor-pointer"
                  >
                    Schedule Test
                  </button>
                </form>
              </section>
            )}

            {/* List of Scheduled Tests */}
            <section className="rq-panel p-6">
              <h2 className="font-display text-[20px] font-extrabold text-[#241830] border-b border-purple-100 pb-3">
                All Scheduled Tests ({(data.tests || []).length})
              </h2>

              <div className="mt-4 space-y-3">
                {(!data.tests || data.tests.length === 0) && (
                  <div className="py-8 text-center text-[13px] font-bold text-[#8C6C82]">
                    No tests scheduled yet. Create one above to track your mock performance!
                  </div>
                )}

                {(data.tests || []).map((test) => (
                  <div
                    key={test.id}
                    className={`rounded-2xl border p-4 transition ${
                      test.isCompleted ? 'border-emerald-200 bg-emerald-50/50' : 'border-purple-100 bg-white/80'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                              test.isCompleted ? 'bg-emerald-200 text-emerald-900' : 'bg-purple-100 text-purple-900'
                            }`}
                          >
                            {test.isCompleted ? '✓ MASTERED' : 'SCHEDULED'}
                          </span>
                          <span className="font-sans text-[16px] font-extrabold text-[#241830]">{test.title}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-[11.5px] font-semibold text-[#8C6C82]">
                          <span>📅 Date: {test.dateStr}</span>
                          <span>⏱️ Duration: {test.duration}</span>
                          <span>🎯 Marks: {test.totalMarks}</span>
                        </div>

                        {test.chapterIds && test.chapterIds.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {test.chapterIds.map((cid) => {
                              const ch = byId(cid);
                              return (
                                <span
                                  key={cid}
                                  className="rounded-full bg-white border border-purple-100 px-2 py-0.5 text-[10.5px] font-bold text-[#241830]"
                                >
                                  {ch?.name || cid}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {!readOnly && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => store.toggleTestCompleted(me, test.id)}
                            className={`cursor-pointer rounded-xl px-4 py-1.5 font-sans text-[12px] font-extrabold transition ${
                              test.isCompleted
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'border border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50'
                            }`}
                          >
                            {test.isCompleted ? '✓ Completed' : 'Mark Complete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => store.deleteTest(me, test.id)}
                            className="cursor-pointer text-[13px] font-bold text-mauve hover:text-rose-600 px-2 py-1"
                            title="Delete test"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Add Chapter to a Specific Date (Weekly or Roadmap) */}
      {targetDateForAdd && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-plum/30 px-4 pt-[10vh] backdrop-blur-[3px]"
          onClick={() => setTargetDateForAdd(null)}
        >
          <div className="glass w-full max-w-[520px] rounded-[26px] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div>
                <h3 className="font-sans text-[16px] font-extrabold text-[#241830]">
                  Add Chapter to {targetDateForAdd}
                </h3>
                <p className="text-[11.5px] font-medium text-[#8C6C82]">
                  Will automatically reschedule this chapter to this date.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTargetDateForAdd(null)}
                className="cursor-pointer text-[13px] font-bold text-[#8C6C82]"
              >
                ESC
              </button>
            </div>

            <div className="mt-3 max-h-[50vh] overflow-y-auto space-y-1.5">
              {CHAPTERS.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2 rounded-xl border border-purple-100/60 hover:bg-purple-50 transition"
                >
                  <div>
                    <span className="font-bold text-[13px] text-[#241830]">{c.name}</span>
                    <span className="block text-[10.5px] font-extrabold uppercase text-[#8C6C82]">
                      {c.subject} · {c.group}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      store.addChapterToDay(me, c.id, targetDateForAdd);
                      setTargetDateForAdd(null);
                    }}
                    className="rq-rosebtn rounded-xl px-3 py-1 text-[11.5px] font-bold cursor-pointer"
                  >
                    Assign
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Specific Topic to a Date */}
      {targetDateForTopic && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-plum/30 px-4 pt-[10vh] backdrop-blur-[3px]"
          onClick={() => setTargetDateForTopic(null)}
        >
          <div className="glass w-full max-w-[520px] rounded-[26px] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div>
                <h3 className="font-sans text-[16px] font-extrabold text-[#241830]">
                  Add Topic to {targetDateForTopic.dateStr}
                </h3>
                <p className="text-[11.5px] font-medium text-[#8C6C82]">
                  Grouped under its chapter header with next-day rollover.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTargetDateForTopic(null)}
                className="cursor-pointer text-[13px] font-bold text-[#8C6C82]"
              >
                ESC
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <label className="block text-[12px] font-bold text-[#241830] mb-1">Select Chapter</label>
                <select
                  value={selectedChapterForTopic}
                  onChange={(e) => setSelectedChapterForTopic(e.target.value)}
                  className="field !w-full !text-[13px] !py-2"
                >
                  {CHAPTERS.map((c) => (
                    <option key={c.id} value={c.id}>
                      [{c.subject}] {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subtopic quick picks from NCERT */}
              <div>
                <label className="block text-[12px] font-bold text-[#241830] mb-1">Quick Select NCERT Subtopic</label>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-purple-100 bg-white/70 p-2 space-y-1">
                  {(TOPICS[selectedChapterForTopic] || []).map((tName, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        store.addTopicToDay(me, selectedChapterForTopic, tName, targetDateForTopic.dateStr);
                        setTargetDateForTopic(null);
                      }}
                      className="w-full text-left p-1.5 rounded-lg hover:bg-purple-100 text-[12px] font-medium text-[#241830] cursor-pointer"
                    >
                      ＋ {tName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-purple-100 pt-3">
                <label className="block text-[12px] font-bold text-[#241830] mb-1">Or Type Custom Topic Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTopicName}
                    onChange={(e) => setNewTopicName(e.target.value)}
                    placeholder="e.g. Solving 2024 PYQs"
                    className="field !flex-1 !text-[13px] !py-2"
                  />
                  <button
                    type="button"
                    disabled={!newTopicName.trim()}
                    onClick={() => {
                      if (!newTopicName.trim()) return;
                      store.addTopicToDay(me, selectedChapterForTopic, newTopicName.trim(), targetDateForTopic.dateStr);
                      setNewTopicName('');
                      setTargetDateForTopic(null);
                    }}
                    className="rq-rosebtn rounded-xl px-4 py-2 font-sans text-[12.5px] font-bold cursor-pointer disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chapter Search Modal fallback */}
      <SearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        exclude={todays}
        onAdd={(id) => store.addToToday(me, id)}
      />
    </div>
  );
}
