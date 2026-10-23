import { CHAPTERS } from '../data/chapters';
import { sound } from './audio';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export interface TopicItem {
  chapterId: string;
  topicName: string;
  isCompleted?: boolean;
}

export interface ScheduledTest {
  id: string;
  title: string;
  dateStr: string; // YYYY-MM-DD
  duration?: string;
  totalMarks?: number;
  chapterIds: string[];
  topics: { chapterId: string; topicName: string }[];
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export interface DayPlan {
  dayIndex: number; // 1, 2, ...
  dateStr: string; // YYYY-MM-DD
  dateFormatted: string; // e.g. "Thu, 22 Oct"
  dayOfWeek: string; // e.g. "Thursday"
  isToday: boolean;
  isPast: boolean;
  isBufferPeriod: boolean; // last 15 days
  bufferDayNumber?: number; // 15 down to 1
  phase: 'Pass 1: 1 Ch/Day' | 'Pass 2: Rapid Recall' | 'Pass 3: Final Consolidation' | 'Final 15-Day Buffer';
  chapterIds: string[]; // syllabus chapters
  topics: TopicItem[]; // topics assigned to this day
}

export interface UserData {
  completions: Record<string, number>; // chapterId -> 0, 1, or 2
  todayAdds: Record<string, string[]>; // dateISO -> chapterId[]
  todayDone: Record<string, string[]>; // dateISO -> chapterId[]
  todaySkips: Record<string, string[]>; // dateISO -> chapterId[]
  dayLog: Record<string, { done: number; total: number }>; // dateISO -> stats
  planStart: string; // dateISO
  queueStart: string; // dateISO
  timerMinutes: number; // overall total minutes
  dailyStudySeconds?: Record<string, number>; // dateISO -> seconds studied on that date
  activeTimer?: {
    isRunning: boolean;
    startedAt: number; // ms timestamp when started
    accumulatedSeconds: number; // seconds accumulated before current run
  };
  currentActivity?: string;

  // Custom user assignments per date: dateStr -> { chapterIds: string[], topics: TopicItem[] }
  customDayPlans?: Record<string, { chapterIds: string[]; topics: TopicItem[] }>;

  // Reassigned chapters: chapterId -> dateStr (moves chapter to this date, removing from original date)
  reassignedChapters?: Record<string, string>;

  // Topic completions: `${dateStr}::${chapterId}::${topicName}` -> boolean
  topicCompletions?: Record<string, boolean>;

  // Scheduled tests:
  tests?: ScheduledTest[];
  testsCompletedCount?: number;
}

export interface Account {
  id?: string;
  username: string;
  displayName: string;
  pairCode: string;
  partner?: string;
  partnerId?: string;
  streak: number;
  currentFocus: string;
}

export interface WallMessage {
  id: string;
  pairKey: string;
  author: string;
  body: string;
  createdAt: string;
  emoji?: string;
}

// ── Date utilities ────────────────────────────────────────────────────────────
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

let TARGET_EXAM_DATE = '2027-05-02';

export function examDate(): string {
  return TARGET_EXAM_DATE;
}

export function daysToExam(): number {
  const now = new Date();
  const exam = new Date(TARGET_EXAM_DATE + 'T12:00:00');
  const diff = exam.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ── Clean Initial State for New Users & Fresh Desks ─────────────────────────
function createFreshUserData(): UserData {
  const planStart = todayISO();
  const completions: Record<string, number> = {};
  for (const c of CHAPTERS) completions[c.id] = 0;

  return {
    completions,
    todayAdds: {},
    todayDone: {},
    todaySkips: {},
    dayLog: {},
    planStart,
    queueStart: planStart,
    timerMinutes: 0,
    dailyStudySeconds: {},
    activeTimer: {
      isRunning: false,
      startedAt: 0,
      accumulatedSeconds: 0,
    },
    currentActivity: '',
    customDayPlans: {},
    reassignedChapters: {},
    topicCompletions: {},
    tests: [],
    testsCompletedCount: 0,
  };
}

interface StoreState {
  ready: boolean;
  version: number;
  currentUsername: string | null;
  accounts: Record<string, Account>;
  userData: Record<string, UserData>;
  wallMessages: WallMessage[];
}

const STORAGE_KEY = 'duostudy_state_v4';

const TIMER_VAULT_KEY = 'duostudy-timer-v1';

interface TimerVaultRecord {
  activeTimer?: UserData['activeTimer'];
  dailyStudySeconds?: Record<string, number>;
  timerMinutes?: number;
  savedAt?: number;
}

function readTimerVault(): Record<string, TimerVaultRecord> {
  try {
    return JSON.parse(localStorage.getItem(TIMER_VAULT_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

/* The timer vault is a tiny standalone record written synchronously on
   every store change. Restoring it here — at state creation, in every
   mode (local, signed-in, fresh) — means a running timer comes back even
   if the main state record was lost, trimmed, or replaced on load. It
   keeps counting from its original startedAt until the user stops it. */
function applyTimerVault(state: StoreState) {
  let vault: Record<string, TimerVaultRecord>;
  try {
    vault = readTimerVault();
  } catch (e) {
    return;
  }
  for (const [username, rec] of Object.entries(vault)) {
    if (!rec) continue;
    if (!state.userData[username]) {
      if (username !== state.currentUsername) continue;
      state.userData[username] = createFreshUserData();
    }
    const d = state.userData[username];
    if (rec.dailyStudySeconds) {
      if (!d.dailyStudySeconds) d.dailyStudySeconds = {};
      for (const [k, v] of Object.entries(rec.dailyStudySeconds)) {
        d.dailyStudySeconds[k] = Math.max(d.dailyStudySeconds[k] ?? 0, v as number);
      }
    }
    if (typeof rec.timerMinutes === 'number') {
      d.timerMinutes = Math.max(d.timerMinutes ?? 0, rec.timerMinutes);
    }
    if (rec.activeTimer?.isRunning && rec.activeTimer.startedAt > 0) {
      if (!d.activeTimer?.isRunning || d.activeTimer.startedAt !== rec.activeTimer.startedAt) {
        d.activeTimer = rec.activeTimer;
      }
    } else if (!d.activeTimer && rec.activeTimer) {
      d.activeTimer = rec.activeTimer;
    }
  }

  // Cross-key rescue: a timer started under a different local username
  // (e.g. before sign-in switched the active desk) must not be stranded.
  // If the active desk has no running timer, adopt any running one found.
  const cur = state.currentUsername;
  if (cur) {
    const curData = state.userData[cur];
    if (!curData?.activeTimer?.isRunning) {
      let best: UserData['activeTimer'] | undefined;
      for (const rec of Object.values(vault)) {
        const t = rec?.activeTimer;
        if (t?.isRunning && t.startedAt > 0 && (!best || t.startedAt > best.startedAt)) {
          best = t;
        }
      }
      if (!best) {
        for (const d of Object.values(state.userData)) {
          const t = d?.activeTimer;
          if (t?.isRunning && t.startedAt > 0) {
            best = t;
            break;
          }
        }
      }
      if (best) {
        if (!state.userData[cur]) state.userData[cur] = createFreshUserData();
        state.userData[cur].activeTimer = best;
      }
    }
  }
}

function getInitialState(): StoreState {
  const initialAccounts: Record<string, Account> = {
    ashfan: {
      username: 'ashfan',
      displayName: 'Ashfan',
      pairCode: 'DUO-7842',
      partner: 'partner',
      streak: 12,
      currentFocus: 'NEET UG 2027 Syllabus',
    },
    partner: {
      username: 'partner',
      displayName: 'Her',
      pairCode: 'DUO-3921',
      partner: 'ashfan',
      streak: 12,
      currentFocus: 'Physics & Biology Revision',
    },
  };

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const accs = { ...initialAccounts, ...(parsed.accounts || {}) };
      const curUser = parsed.currentUsername || 'ashfan';
      const restored: StoreState = {
        ...parsed,
        accounts: accs,
        currentUsername: curUser,
        ready: true,
        version: 0,
      };
      applyTimerVault(restored);
      return restored;
    }
  } catch (e) {}

  const fresh: StoreState = {
    ready: true,
    version: 0,
    currentUsername: 'ashfan',
    accounts: initialAccounts,
    userData: {},
    wallMessages: [],
  };
  applyTimerVault(fresh);
  return fresh;
}

class DuoStore {
  private state: StoreState = getInitialState();
  private listeners: Set<() => void> = new Set();
  private currentUserId: string | null = null;
  private realtimeChannel: RealtimeChannel | null = null;
  private broadcastChannel: BroadcastChannel | null =
    typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new BroadcastChannel('duostudy_sync_channel')
      : null;

  public get ready(): boolean {
    return this.state.ready;
  }

  constructor() {
    this.init();
    this.setupCrossTabSync();
  }

  private setupCrossTabSync() {
    if (typeof window === 'undefined') return;

    if (this.broadcastChannel) {
      this.broadcastChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'NEW_WALL_MESSAGE' && data.message) {
          const msg = data.message as WallMessage;
          if (!this.state.wallMessages.some((m) => m.id === msg.id)) {
            this.state.wallMessages.unshift(msg);
            try { sound.playCheerChime(); } catch {}
            this.notify(false);
          }
        } else if (data.type === 'STATE_SYNC' && data.state) {
          this.mergeExternalState(data.state);
        }
      };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          this.mergeExternalState(parsed);
        } catch {}
      }
    });
  }

  private mergeExternalState(incoming: Partial<StoreState>) {
    let changed = false;

    if (incoming.accounts) {
      for (const [k, acc] of Object.entries(incoming.accounts)) {
        if (!this.state.accounts[k] || JSON.stringify(this.state.accounts[k]) !== JSON.stringify(acc)) {
          this.state.accounts[k] = acc;
          changed = true;
        }
      }
    }

    if (incoming.wallMessages && Array.isArray(incoming.wallMessages)) {
      const existingIds = new Set(this.state.wallMessages.map((m) => m.id));
      for (const msg of incoming.wallMessages) {
        if (!existingIds.has(msg.id)) {
          this.state.wallMessages.unshift(msg);
          existingIds.add(msg.id);
          changed = true;
        }
      }
    }

    if (incoming.userData) {
      for (const [k, uData] of Object.entries(incoming.userData)) {
        if (k !== this.state.currentUsername) {
          this.state.userData[k] = uData;
          changed = true;
        }
      }
    }

    if (changed) {
      this.notify(false);
    }
  }

  private async init() {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    try {
      // 1.5s timeout guard so network latency never leaves the user stuck
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
        setTimeout(() => resolve({ data: { session: null } }), 1500)
      );

      const { data: sessionData } = await Promise.race([sessionPromise, timeoutPromise]);
      const session = sessionData?.session;
      if (session && session.user) {
        this.currentUserId = session.user.id;
        await Promise.race([
          this.loadSupabaseUserData(session.user.id),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      }
    } catch (e) {
      console.warn('Supabase session load error:', e);
    } finally {
      try {
        this.setupRealtimeWall();
      } catch (err) {
        console.warn('Realtime channel error:', err);
      }
      this.notify();
    }
  }

  private setupRealtimeWall() {
    if (!isSupabaseConfigured || !supabase) return;
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = supabase
      .channel('public:wall_messages')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wall_messages' },
        async () => {
          await this.fetchSupabaseWallMessages();
          sound.playCheerChime();
          this.notify();
        }
      )
      .subscribe();
  }

  private async loadSupabaseUserData(userId: string) {
    if (!supabase) return;

    // 1. Fetch own profile (maybeSingle prevents PGRST116 when row doesn't exist)
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    let meUsername: string;

    if (!profile) {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const authUser = userData?.user;
        const usernameFromEmail = authUser?.email?.split('@')[0] || `desk_${userId.slice(0, 4)}`;
        const generatedCode = `DUO-${Math.floor(1000 + Math.random() * 9000)}`;

        await supabase.from('profiles').insert({
          id: userId,
          username: usernameFromEmail,
          pair_code: generatedCode,
        });

        meUsername = usernameFromEmail;
        this.state.currentUsername = usernameFromEmail;
        this.state.accounts[usernameFromEmail] = {
          id: userId,
          username: usernameFromEmail,
          displayName: usernameFromEmail.charAt(0).toUpperCase() + usernameFromEmail.slice(1),
          pairCode: generatedCode,
          streak: 1,
          currentFocus: 'NEET UG Syllabus',
        };
      } catch (e) {
        console.warn('Fallback profile creation:', e);
        meUsername = `desk_${userId.slice(0, 4)}`;
        this.state.currentUsername = meUsername;
      }
    } else {
      meUsername = profile.username;
      this.state.currentUsername = meUsername;

      // Check partner profile if linked
      let partnerUsername: string | undefined = undefined;
      if (profile.partner_id) {
        const { data: partnerProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', profile.partner_id)
          .maybeSingle();

        if (partnerProfile && partnerProfile.username) {
          const pName: string = partnerProfile.username;
          partnerUsername = pName;
          this.state.accounts[pName] = {
            id: partnerProfile.id,
            username: pName,
            displayName: pName.charAt(0).toUpperCase() + pName.slice(1),
            pairCode: partnerProfile.pair_code,
            partner: meUsername,
            partnerId: userId,
            streak: 1,
            currentFocus: 'NEET UG Syllabus',
          };

          // Fetch partner's user_data by user_id (read-only)
          const { data: partnerData } = await supabase
            .from('user_data')
            .select('*')
            .eq('user_id', partnerProfile.id)
            .maybeSingle();

          if (partnerData) {
            this.state.userData[pName] = {
              completions: partnerData.completions || {},
              todayAdds: partnerData.today_adds || {},
              todayDone: partnerData.today_done || {},
              todaySkips: partnerData.today_skips || {},
              dayLog: partnerData.day_log || {},
              planStart: partnerData.plan_start || todayISO(),
              queueStart: partnerData.queue_start || todayISO(),
              timerMinutes:
                typeof (partnerData as any).timer_minutes === 'number'
                  ? (partnerData as any).timer_minutes
                  : 0,
              dailyStudySeconds: (partnerData as any).daily_study_seconds || {},
              activeTimer:
                (partnerData as any).active_timer &&
                typeof (partnerData as any).active_timer === 'object' &&
                Object.keys((partnerData as any).active_timer).length > 0
                  ? (partnerData as any).active_timer
                  : { isRunning: false, startedAt: 0, accumulatedSeconds: 0 },
              currentActivity: 'Studying for NEET UG',
            };
          }
        }
      }

      this.state.accounts[meUsername] = {
        id: profile.id,
        username: profile.username,
        displayName: profile.username.charAt(0).toUpperCase() + profile.username.slice(1),
        pairCode: profile.pair_code,
        partner: partnerUsername,
        partnerId: profile.partner_id,
        streak: 1,
        currentFocus: 'NEET UG Syllabus',
      };
    }

    // 2. Fetch own user_data using user_id column
    const { data: myData } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (myData) {
      // Timer state is merged, never overwritten: a running timer started
      // before the tab was closed must still be running after this load,
      // counting from its original startedAt until the user stops it here.
      const prev = this.state.userData[meUsername];
      const vault = this.timerVaultOf(meUsername);
      const remoteTimer = (myData as any).active_timer as UserData['activeTimer'] | undefined;
      // Include vault records from any local username: a timer started in
      // local mode before sign-in must follow the user onto their desk.
      const anyVaultTimers = Object.values(readTimerVault())
        .map((r) => r?.activeTimer)
        .filter(Boolean) as NonNullable<UserData['activeTimer']>[];
      const timerCandidates = [
        remoteTimer,
        vault?.activeTimer,
        prev?.activeTimer,
        ...anyVaultTimers,
      ].filter(Boolean) as NonNullable<UserData['activeTimer']>[];
      const runningTimer = timerCandidates
        .filter((c) => c.isRunning && c.startedAt > 0)
        .sort((a, b) => b.startedAt - a.startedAt)[0];
      const mergedDaily: Record<string, number> = {
        ...(((myData as any).daily_study_seconds as Record<string, number>) ?? {}),
      };
      for (const src of [prev?.dailyStudySeconds, vault?.dailyStudySeconds]) {
        if (src) {
          for (const [k, v] of Object.entries(src)) {
            mergedDaily[k] = Math.max(mergedDaily[k] ?? 0, v as number);
          }
        }
      }
      this.state.userData[meUsername] = {
        completions: myData.completions || {},
        todayAdds: myData.today_adds || {},
        todayDone: myData.today_done || {},
        todaySkips: myData.today_skips || {},
        dayLog: myData.day_log || {},
        planStart: myData.plan_start || todayISO(),
        queueStart: myData.queue_start || todayISO(),
        timerMinutes: Math.max(
          typeof (myData as any).timer_minutes === 'number' ? (myData as any).timer_minutes : 0,
          prev?.timerMinutes ?? 0,
          vault?.timerMinutes ?? 0,
        ),
        dailyStudySeconds: mergedDaily,
        activeTimer:
          runningTimer ??
          timerCandidates[0] ?? { isRunning: false, startedAt: 0, accumulatedSeconds: 0 },
        currentActivity: this.state.userData[meUsername]?.currentActivity || 'Studying for NEET UG',
      };
      this.saveTimerVault(meUsername);
    } else {
      // Create initial row in user_data if missing — but never wipe a
      // timer that is already running locally.
      const initData = createFreshUserData();
      const prevData = this.state.userData[meUsername];
      const vault = this.timerVaultOf(meUsername);
      if (prevData?.activeTimer) initData.activeTimer = prevData.activeTimer;
      if (prevData?.dailyStudySeconds) initData.dailyStudySeconds = prevData.dailyStudySeconds;
      if (prevData?.timerMinutes) initData.timerMinutes = prevData.timerMinutes;
      if (vault?.activeTimer?.isRunning && vault.activeTimer.startedAt > 0) {
        initData.activeTimer = vault.activeTimer;
        if (vault.dailyStudySeconds) initData.dailyStudySeconds = vault.dailyStudySeconds;
        if (typeof vault.timerMinutes === 'number') initData.timerMinutes = vault.timerMinutes;
      }
      if (!initData.activeTimer?.isRunning) {
        for (const rec of Object.values(readTimerVault())) {
          const t = rec?.activeTimer;
          if (t?.isRunning && t.startedAt > 0) {
            initData.activeTimer = t;
            break;
          }
        }
      }
      this.state.userData[meUsername] = initData;
      try {
        await supabase.from('user_data').insert({
          user_id: userId,
          completions: initData.completions,
          today_adds: initData.todayAdds,
          today_done: initData.todayDone,
          today_skips: initData.todaySkips,
          day_log: initData.dayLog,
          plan_start: initData.planStart,
          queue_start: initData.queueStart,
        });
      } catch (e) {
        console.warn('Initial user_data insert notice:', e);
      }
    }

    // 3. Fetch Wall messages
    await this.fetchSupabaseWallMessages();
  }

  private async fetchSupabaseWallMessages() {
    if (!supabase) return;
    const me = this.me();
    if (!me) return;

    const p = me.partner;
    const pairKey = p ? [me.username, p].sort().join(':') : me.username;

    try {
      const { data, error } = await supabase
        .from('wall_messages')
        .select('id, pair_key, text, created_at')
        .or(`pair_key.eq.${pairKey},pair_key.eq.${me.username}${p ? `,pair_key.eq.${p}` : ''}`)
        .order('created_at', { ascending: false })
        .limit(60);

      if (!error && data) {
        const fetched: WallMessage[] = data.map((m) => {
          let author = '';
          let body = m.text || '';
          let emoji = '✨';

          try {
            const parsed = JSON.parse(m.text);
            if (parsed && typeof parsed === 'object') {
              if (parsed.author) author = parsed.author;
              if (parsed.body) body = parsed.body;
              if (parsed.emoji) emoji = parsed.emoji;
            }
          } catch {
            body = m.text || '';
          }

          if (!author) {
            const myName = (me.displayName || me.username || '').toLowerCase();
            const partnerAcc = p ? this.state.accounts[p] : undefined;
            const partnerName = partnerAcc?.displayName
              ? partnerAcc.displayName.toLowerCase()
              : (p ? p.toLowerCase() : '');

            const lowerBody = body.toLowerCase();
            if (partnerName && lowerBody.includes(`hi ${partnerName}`)) {
              author = me.username;
            } else if (myName && lowerBody.includes(`hi ${myName}`)) {
              author = p || me.username;
            } else if (m.pair_key === me.username) {
              author = me.username;
            } else if (p && m.pair_key === p) {
              author = p;
            } else {
              author = p || me.username;
            }
          }

          const d = new Date(m.created_at);
          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return {
            id: m.id,
            pairKey: m.pair_key,
            author,
            body,
            emoji,
            createdAt: `Today, ${timeStr}`,
          };
        });

        const fetchedIds = new Set(fetched.map((m) => m.id));
        const localUnsynced = this.state.wallMessages.filter((m) => !fetchedIds.has(m.id));
        this.state.wallMessages = [...fetched, ...localUnsynced];
      }
    } catch (e) {
      console.warn('fetchSupabaseWallMessages notice:', e);
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      // A failed write (e.g. storage quota) must not silently kill all
      // persistence — retry with a trimmed wall history in the stored
      // copy only; the in-memory state keeps everything.
      try {
        const trimmed = {
          ...this.state,
          wallMessages: (this.state.wallMessages || []).slice(0, 50),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch (e2) {
        console.warn('DuoStudy persist failed:', e2);
      }
    }
  }

  /* ── Timer vault ────────────────────────────────────────────────────────────
     The study timer must survive the tab being closed/removed and a full
     reload: it keeps counting from `startedAt` until the user comes back
     and stops it. Supabase hydration replaces userData wholesale and the
     user_data table historically had no timer columns, which wiped the
     running timer on every load. The vault is a small dedicated
     localStorage record (outside `state`) that hydration merges back in. */
  private TIMER_KEY = 'duostudy-timer-v1';

  private saveTimerVault(username: string) {
    try {
      const d = this.state.userData[username];
      if (!d) return;
      const all = JSON.parse(localStorage.getItem(this.TIMER_KEY) || '{}');
      all[username] = {
        activeTimer: d.activeTimer ?? { isRunning: false, startedAt: 0, accumulatedSeconds: 0 },
        dailyStudySeconds: d.dailyStudySeconds ?? {},
        timerMinutes: d.timerMinutes ?? 0,
        savedAt: Date.now(),
      };
      localStorage.setItem(this.TIMER_KEY, JSON.stringify(all));
    } catch (e) {}
  }

  private timerVaultOf(username: string): {
    activeTimer?: UserData['activeTimer'];
    dailyStudySeconds?: Record<string, number>;
    timerMinutes?: number;
    savedAt?: number;
  } | null {
    try {
      const all = JSON.parse(localStorage.getItem(this.TIMER_KEY) || '{}');
      return all[username] ?? null;
    } catch (e) {
      return null;
    }
  }

  private notify(broadcast = true) {
    this.state = {
      ...this.state,
      accounts: { ...this.state.accounts },
      userData: { ...this.state.userData },
      version: (this.state.version || 0) + 1,
    };
    this.persist();
    // Keep the standalone timer vault in step with every change, so the
    // timer can be restored on load even if the main record is unusable.
    if (this.state.currentUsername) this.saveTimerVault(this.state.currentUsername);

    if (broadcast && this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'STATE_SYNC',
          state: {
            accounts: this.state.accounts,
            wallMessages: this.state.wallMessages,
            userData: this.state.userData,
          },
        });
      } catch {}
    }

    for (const l of this.listeners) l();
  }

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getSnapshot = () => this.state;

  public me(): Account | null {
    if (!this.state.currentUsername) return null;
    return this.state.accounts[this.state.currentUsername] ?? null;
  }

  public ensureActiveAccount(preferredUsername = 'ashfan'): Account {
    if (this.state.currentUsername && this.state.accounts[this.state.currentUsername]) {
      return this.state.accounts[this.state.currentUsername];
    }

    const existing = Object.keys(this.state.accounts);
    let target = preferredUsername;
    if (!this.state.accounts[target] && existing.length > 0) {
      target = existing[0];
    }

    if (!this.state.accounts[target]) {
      this.state.accounts[target] = {
        username: target,
        displayName: target === 'ashfan' ? 'Ashfan' : target.charAt(0).toUpperCase() + target.slice(1),
        pairCode: 'DUO-7842',
        partner: 'partner',
        streak: 12,
        currentFocus: 'NEET UG 2027 Syllabus',
      };
      if (target === 'ashfan' && !this.state.accounts['partner']) {
        this.state.accounts['partner'] = {
          username: 'partner',
          displayName: 'Her',
          pairCode: 'DUO-3921',
          partner: 'ashfan',
          streak: 12,
          currentFocus: 'Physics & Biology Revision',
        };
      }
    }

    this.state.currentUsername = target;
    this.notify();
    return this.state.accounts[target];
  }

  public accountOf(username: string): Account | null {
    return this.state.accounts[username] ?? null;
  }

  public partnerOf(username: string): string | null {
    return this.state.accounts[username]?.partner ?? null;
  }

  public dataOf(username: string): UserData {
    if (!this.state.userData[username]) {
      this.state.userData[username] = createFreshUserData();
    }
    return this.state.userData[username];
  }

  public updateDisplayName(username: string, newDisplayName: string) {
    const acc = this.state.accounts[username];
    if (!acc || !newDisplayName.trim()) return;
    acc.displayName = newDisplayName.trim();
    this.notify();
  }

  // ── Calculation helpers ───────────────────────────────────────────────────
  public completedCount(data: UserData): number {
    return CHAPTERS.filter((c) => (data.completions[c.id] ?? 0) >= 1).length;
  }

  public rev2Count(data: UserData): number {
    return CHAPTERS.filter((c) => (data.completions[c.id] ?? 0) >= 2).length;
  }

  public assignedListOn(data: UserData, dateStr: string = todayISO()): string[] {
    const pendingPass1 = CHAPTERS.filter((c) => (data.completions[c.id] ?? 0) === 0);
    const pendingPass2 = CHAPTERS.filter((c) => (data.completions[c.id] ?? 0) === 1);
    const queue = pendingPass1.length > 0 ? pendingPass1 : pendingPass2;
    if (queue.length === 0) return [];

    const nowMs = new Date(dateStr + 'T12:00:00').getTime();
    const examMs = new Date(TARGET_EXAM_DATE + 'T12:00:00').getTime();
    const bufferMs = 15 * 86400000;
    const deadlineMs = examMs - bufferMs;
    const daysRemaining = Math.max(1, Math.ceil((deadlineMs - nowMs) / 86400000));

    const pace = Math.min(3, Math.max(1, Math.ceil(queue.length / daysRemaining)));
    return queue.slice(0, pace).map((c) => c.id);
  }

  public todaysChapters(data: UserData, dateStr: string = todayISO()): string[] {
    const roadmap = this.generateNeetRoadmap(data);
    const dayPlan = roadmap.find((p) => p.dateStr === dateStr);
    const roadmapChapters = dayPlan ? dayPlan.chapterIds : this.assignedListOn(data, dateStr);
    const adds = data.todayAdds[dateStr] ?? [];
    const customAdds = data.customDayPlans?.[dateStr]?.chapterIds ?? [];
    const skips = new Set(data.todaySkips[dateStr] ?? []);
    const merged = Array.from(new Set([...roadmapChapters, ...adds, ...customAdds])).filter((id) => !skips.has(id));
    return merged;
  }

  // ── Synced actions ────────────────────────────────────────────────────────
  public async syncUserDataToSupabase(username: string) {
    // Vault first: localStorage is synchronous, so the timer record lands
    // even if the tab is killed before the network sync below completes.
    this.saveTimerVault(username);
    if (!supabase || !this.currentUserId) return;
    const me = this.me();
    if (!me || me.username !== username) return;

    const data = this.dataOf(username);
    try {
      await supabase
        .from('user_data')
        .update({
          completions: data.completions,
          today_adds: data.todayAdds,
          today_done: data.todayDone,
          today_skips: data.todaySkips,
          day_log: data.dayLog,
          plan_start: data.planStart,
          queue_start: data.queueStart,
        })
        .eq('user_id', this.currentUserId);
    } catch (e) {
      console.warn('Sync user data notice:', e);
    }

    // Timer fields sync in a separate call: if the timer columns are not
    // in the table yet, only this call fails — the core sync above is safe.
    try {
      await supabase
        .from('user_data')
        .update({
          daily_study_seconds: data.dailyStudySeconds ?? {},
          active_timer: data.activeTimer ?? {},
          timer_minutes: data.timerMinutes ?? 0,
        })
        .eq('user_id', this.currentUserId);
    } catch (e) {}
  }

  public toggleDone(username: string, chapterId: string, dateStr: string = todayISO()) {
    const data = this.dataOf(username);
    const doneList = new Set(data.todayDone[dateStr] ?? []);
    const isDone = doneList.has(chapterId);

    if (isDone) {
      doneList.delete(chapterId);
      data.completions[chapterId] = Math.max(0, (data.completions[chapterId] ?? 1) - 1);
    } else {
      doneList.add(chapterId);
      data.completions[chapterId] = Math.min(2, (data.completions[chapterId] ?? 0) + 1);
      sound.playDoneChime();
    }

    data.todayDone[dateStr] = Array.from(doneList);
    const todays = this.todaysChapters(data, dateStr);
    data.dayLog[dateStr] = { done: doneList.size, total: todays.length };

    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public toggleStage(username: string, chapterId: string, stage: 1 | 2) {
    const data = this.dataOf(username);
    const current = data.completions[chapterId] ?? 0;
    if (stage === 1) {
      data.completions[chapterId] = current >= 1 ? 0 : 1;
    } else if (stage === 2) {
      data.completions[chapterId] = current >= 2 ? 1 : 2;
    }
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public addToToday(username: string, chapterId: string, dateStr: string = todayISO()) {
    const data = this.dataOf(username);
    if (!data.reassignedChapters) data.reassignedChapters = {};
    if (!data.customDayPlans) data.customDayPlans = {};
    data.reassignedChapters[chapterId] = dateStr;

    if (!data.customDayPlans[dateStr]) {
      data.customDayPlans[dateStr] = { chapterIds: [], topics: [] };
    }
    if (!data.customDayPlans[dateStr].chapterIds.includes(chapterId)) {
      data.customDayPlans[dateStr].chapterIds.push(chapterId);
    }

    const adds = new Set(data.todayAdds[dateStr] ?? []);
    adds.add(chapterId);
    data.todayAdds[dateStr] = Array.from(adds);

    if (data.todaySkips[dateStr]) {
      data.todaySkips[dateStr] = data.todaySkips[dateStr].filter((id) => id !== chapterId);
    }

    const todays = this.todaysChapters(data, dateStr);
    const doneList = data.todayDone[dateStr] ?? [];
    data.dayLog[dateStr] = { done: doneList.length, total: todays.length };
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public removeFromToday(username: string, chapterId: string, dateStr: string = todayISO()) {
    const data = this.dataOf(username);
    const skips = new Set(data.todaySkips[dateStr] ?? []);
    skips.add(chapterId);
    data.todaySkips[dateStr] = Array.from(skips);

    if (data.todayAdds[dateStr]) {
      data.todayAdds[dateStr] = data.todayAdds[dateStr].filter((id) => id !== chapterId);
    }
    if (data.todayDone[dateStr]) {
      data.todayDone[dateStr] = data.todayDone[dateStr].filter((id) => id !== chapterId);
    }

    const todays = this.todaysChapters(data, dateStr);
    const doneList = data.todayDone[dateStr] ?? [];
    data.dayLog[dateStr] = { done: doneList.length, total: todays.length };
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  // ── Authentication with Synthetic Emails ─────────────────────────────────
  public async signin(u: string, p: string): Promise<string | null> {
    const clean = u.trim().toLowerCase();
    if (!clean) return 'Please enter your username';
    if (!p) return 'Please enter your password';

    if (isSupabaseConfigured && supabase) {
      try {
        const syntheticEmail = `${clean}@studyhome.app`;
        const { data, error } = await supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password: p,
        });

        if (!error && data.user) {
          this.currentUserId = data.user.id;
          await this.loadSupabaseUserData(data.user.id);
          this.setupRealtimeWall();
          this.notify();
          return null;
        }

        if (error) {
          // If local account exists with this name, log them in locally
          if (this.state.accounts[clean]) {
            this.state.currentUsername = clean;
            this.notify();
            return null;
          }
          if (error.message?.toLowerCase().includes('invalid login credentials')) {
            return 'Invalid credentials. If this is your first time, please click "Create Desk" above!';
          }
          return error.message || 'Invalid username or password';
        }
      } catch (err: any) {
        if (this.state.accounts[clean]) {
          this.state.currentUsername = clean;
          this.notify();
          return null;
        }
        return err?.message || 'Connection error. Please try again.';
      }
    }

    // Local / Offline fallback
    if (!this.state.accounts[clean]) {
      this.state.accounts[clean] = {
        username: clean,
        displayName: clean.charAt(0).toUpperCase() + clean.slice(1),
        pairCode: `DUO-${Math.floor(1000 + Math.random() * 9000)}`,
        streak: 1,
        currentFocus: 'NEET UG Preparation',
      };
      this.state.userData[clean] = createFreshUserData();
    }
    this.state.currentUsername = clean;
    this.notify();
    return null;
  }

  public async signup(u: string, p: string, pairCode?: string): Promise<string | null> {
    const clean = u.trim().toLowerCase();
    if (!clean || clean.length < 3) return 'Username must be at least 3 characters.';
    if (!p || p.length < 6) return 'Password must be at least 6 characters.';

    if (isSupabaseConfigured && supabase) {
      try {
        const syntheticEmail = `${clean}@studyhome.app`;
        const generatedCode = `DUO-${Math.floor(1000 + Math.random() * 9000)}`;

        const { data, error } = await supabase.auth.signUp({
          email: syntheticEmail,
          password: p,
        });

        if (!error && data.user) {
          this.currentUserId = data.user.id;

          // 1. Create Profile row
          try {
            await supabase.from('profiles').insert({
              id: data.user.id,
              username: clean,
              pair_code: generatedCode,
            });
          } catch (e) {
            console.warn('Profile insert warning:', e);
          }

          // 2. Create User Data row
          try {
            const initData = createFreshUserData();
            await supabase.from('user_data').insert({
              user_id: data.user.id,
              completions: initData.completions,
              today_adds: initData.todayAdds,
              today_done: initData.todayDone,
              today_skips: initData.todaySkips,
              day_log: initData.dayLog,
              plan_start: initData.planStart,
              queue_start: initData.queueStart,
            });
          } catch (e) {
            console.warn('UserData insert warning:', e);
          }

          // 3. Link with pair code if provided
          if (pairCode) {
            try {
              await supabase.rpc('link_with_code', { p_code: pairCode.trim() });
            } catch (e) {}
          }

          await this.loadSupabaseUserData(data.user.id);
          this.setupRealtimeWall();
          this.notify();
          return null;
        }

        // If user is already registered in Supabase, attempt sign in with credentials
        if (error) {
          if (error.message?.toLowerCase().includes('already registered')) {
            const signInRes = await supabase.auth.signInWithPassword({
              email: syntheticEmail,
              password: p,
            });
            if (!signInRes.error && signInRes.data.user) {
              this.currentUserId = signInRes.data.user.id;
              await this.loadSupabaseUserData(signInRes.data.user.id);
              this.setupRealtimeWall();
              this.notify();
              return null;
            }
            return 'This username is already taken. If it is yours, please switch to Sign In.';
          }
          console.warn('Supabase signup notice:', error.message);
          return this.createLocalAccount(clean, pairCode);
        }
      } catch (err: any) {
        console.warn('Supabase signup exception, using local desk:', err);
        return this.createLocalAccount(clean, pairCode);
      }
    }

    return this.createLocalAccount(clean, pairCode);
  }

  private createLocalAccount(clean: string, pairCode?: string): string | null {
    if (this.state.accounts[clean]) return 'Username already exists. Please choose another.';
    let partnerUsername: string | undefined = undefined;
    if (pairCode) {
      const target = Object.values(this.state.accounts).find(
        (acc) => acc.pairCode.toLowerCase() === pairCode.trim().toLowerCase()
      );
      if (target) partnerUsername = target.username;
    }

    this.state.accounts[clean] = {
      username: clean,
      displayName: clean.charAt(0).toUpperCase() + clean.slice(1),
      pairCode: `DUO-${Math.floor(1000 + Math.random() * 9000)}`,
      partner: partnerUsername,
      streak: 1,
      currentFocus: 'NEET UG Syllabus',
    };
    this.state.userData[clean] = createFreshUserData();

    if (partnerUsername && this.state.accounts[partnerUsername]) {
      this.state.accounts[partnerUsername].partner = clean;
    }

    this.state.currentUsername = clean;
    this.notify();
    return null;
  }

  public async signout() {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
      this.currentUserId = null;
    }
    this.state.currentUsername = null;
    this.notify();
  }

  // ── Couple Linking & Wall ────────────────────────────────────────────────
  public async linkWithCode(pairCode: string): Promise<boolean> {
    const me = this.me();
    if (!me) return false;
    const cleanCode = pairCode.trim();
    if (!cleanCode) return false;

    if (supabase && this.currentUserId) {
      try {
        const { data, error } = await supabase.rpc('link_with_code', {
          p_code: cleanCode,
        });

        const isSuccess = Boolean(
          !error && data && (
            (typeof data === 'string' && !data.startsWith('ERROR')) ||
            (typeof data === 'object' && (data.success === true || !data.error))
          )
        );

        if (isSuccess) {
          await this.loadSupabaseUserData(this.currentUserId);
          this.setupRealtimeWall();
          this.notify();
          return true;
        }
      } catch (err) {
        console.warn('RPC link error:', err);
      }
    }

    // Local / cross-tab lookup:
    // First, refresh accounts from localStorage in case target was created in another tab
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.accounts) {
          this.state.accounts = { ...this.state.accounts, ...parsed.accounts };
        }
      }
    } catch {}

    const target = Object.values(this.state.accounts).find(
      (acc) => acc.pairCode.toLowerCase() === cleanCode.toLowerCase() && acc.username !== me.username
    );
    if (!target) return false;

    me.partner = target.username;
    target.partner = me.username;
    this.notify();
    return true;
  }

  public async unlinkPartner() {
    const me = this.me();
    if (!me || !me.partner) return;

    if (supabase && this.currentUserId) {
      await supabase.rpc('unlink_partner');
      await this.loadSupabaseUserData(this.currentUserId);
      this.notify();
      return;
    }

    // Local fallback
    const partner = this.state.accounts[me.partner];
    if (partner) partner.partner = undefined;
    me.partner = undefined;
    this.notify();
  }

  public getWallMessages(username?: string): WallMessage[] {
    const active = username || this.state.currentUsername;
    if (!active) return this.state.wallMessages;
    const acc = this.accountOf(active);
    const p = acc?.partner;
    const pairKey = p ? [active, p].sort().join(':') : active;

    return this.state.wallMessages.filter(
      (m) =>
        m.pairKey === pairKey ||
        (p && (m.pairKey === `${p}:${active}` || m.pairKey === `${active}:${p}`)) ||
        m.author === active ||
        (p && m.author === p) ||
        (!p && m.pairKey === active)
    );
  }

  public async postWallMessage(body: string, emoji?: string, authorOverride?: string) {
    const me = this.me();
    const author = authorOverride || me?.username;
    if (!author || !body.trim()) return;

    const myAcc = this.accountOf(author);
    const p = myAcc?.partner || me?.partner;
    const pairKey = p ? [author, p].sort().join(':') : author;
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: WallMessage = {
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      pairKey,
      author,
      body: body.trim(),
      createdAt: `Today, ${timeStr}`,
      emoji: emoji || '✨',
    };

    // Optimistic local add
    if (!this.state.wallMessages.some((m) => m.id === newMsg.id)) {
      this.state.wallMessages.unshift(newMsg);
    }
    try {
      sound.playCheerChime();
    } catch (e) {}

    // Broadcast immediately to other tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'NEW_WALL_MESSAGE',
          message: newMsg,
        });
      } catch {}
    }

    this.notify();

    // Supabase insert with verified schema: only pair_key and text
    if (supabase && this.currentUserId) {
      try {
        const payloadText = JSON.stringify({
          author,
          body: body.trim(),
          emoji: emoji || '✨',
        });
        const { error } = await supabase.from('wall_messages').insert({
          pair_key: pairKey,
          text: payloadText,
        });
        if (error) {
          console.warn('Supabase wall_messages insert notice:', error.message);
        }
      } catch (err) {
        console.warn('Failed to insert wall message to Supabase:', err);
      }
    }
  }

  public addStudyTime(username: string, minutes: number) {
    const data = this.dataOf(username);
    data.timerMinutes = (data.timerMinutes || 0) + minutes;
    const t = todayISO();
    if (!data.dailyStudySeconds) data.dailyStudySeconds = {};
    data.dailyStudySeconds[t] = (data.dailyStudySeconds[t] || 0) + minutes * 60;
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public getTodayStudySeconds(username: string): number {
    const data = this.dataOf(username);
    const t = todayISO();
    const saved = data.dailyStudySeconds?.[t] ?? 0;
    if (data.activeTimer?.isRunning && data.activeTimer.startedAt > 0) {
      const live = Math.max(0, Math.floor((Date.now() - data.activeTimer.startedAt) / 1000));
      return saved + live;
    }
    return saved;
  }

  public getTotalStudySeconds(username: string): number {
    const data = this.dataOf(username);
    let totalSecs = (data.timerMinutes || 0) * 60;
    if (data.dailyStudySeconds) {
      const sumDays = Object.values(data.dailyStudySeconds).reduce((a, b) => a + b, 0);
      if (sumDays > totalSecs) totalSecs = sumDays;
    }
    if (data.activeTimer?.isRunning && data.activeTimer.startedAt > 0) {
      const live = Math.max(0, Math.floor((Date.now() - data.activeTimer.startedAt) / 1000));
      totalSecs += live;
    }
    return totalSecs;
  }

  public startStudyTimer(username: string) {
    const data = this.dataOf(username);
    if (!data.dailyStudySeconds) data.dailyStudySeconds = {};
    data.activeTimer = {
      isRunning: true,
      startedAt: Date.now(),
      accumulatedSeconds: data.dailyStudySeconds[todayISO()] || 0,
    };
    data.currentActivity = 'Studying for NEET';
    sound.playPomodoroGong();
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public stopStudyTimer(username: string) {
    const data = this.dataOf(username);
    if (!data.dailyStudySeconds) data.dailyStudySeconds = {};
    const t = todayISO();
    let sessionSeconds = 0;
    if (data.activeTimer?.isRunning && data.activeTimer.startedAt > 0) {
      sessionSeconds = Math.max(0, Math.floor((Date.now() - data.activeTimer.startedAt) / 1000));
    }
    data.dailyStudySeconds[t] = (data.dailyStudySeconds[t] || 0) + sessionSeconds;
    const addedMins = Math.floor(sessionSeconds / 60);
    data.timerMinutes = (data.timerMinutes || 0) + addedMins;
    data.activeTimer = {
      isRunning: false,
      startedAt: 0,
      accumulatedSeconds: 0,
    };
    data.currentActivity = 'Taking a study break';
    sound.playDoneChime();
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public isTimerRunning(username: string): boolean {
    const data = this.dataOf(username);
    return Boolean(data.activeTimer?.isRunning);
  }

  public generateNeetRoadmap(data: UserData, targetExam: string = examDate()): DayPlan[] {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const exam = new Date(targetExam + 'T12:00:00');
    const totalDays = Math.max(1, Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const BUFFER_DAYS = 15;
    const activeDays = Math.max(1, totalDays - BUFFER_DAYS);

    // Pedagogical balanced interleaving of NEET chapters: Physics, Chemistry, Biology
    const physics = CHAPTERS.filter((c) => c.subject === 'Physics');
    const chemistry = CHAPTERS.filter((c) => c.subject === 'Chemistry');
    const biology = CHAPTERS.filter((c) => c.subject === 'Biology');

    const interleaved: typeof CHAPTERS = [];
    const maxLen = Math.max(physics.length, chemistry.length, biology.length);
    for (let i = 0; i < maxLen; i++) {
      if (physics[i]) interleaved.push(physics[i]);
      if (chemistry[i]) interleaved.push(chemistry[i]);
      if (biology[i]) interleaved.push(biology[i]);
    }
    const totalChapters = interleaved.length; // 93

    // ── 3-PASS REVISION DISTRIBUTION ──────────────────────────────────────────
    // Pass 1: 1 chapter per day (covers all 93 chapters in 93 days, or ceil(93/(activeDays/3)))
    // Pass 2 & Pass 3: remaining active days split in half to revise 2 more times!
    let p1Days = 93;
    let p2Days = 0;
    let p3Days = 0;

    if (activeDays >= 93 + 2) {
      p1Days = 93;
      const remaining = activeDays - 93;
      p2Days = Math.max(1, Math.floor(remaining / 2));
      p3Days = remaining - p2Days;
    } else {
      // If less than 95 days left, divide active days into 3 equal periods
      p1Days = Math.max(1, Math.floor(activeDays / 3));
      p2Days = Math.max(1, Math.floor(activeDays / 3));
      p3Days = Math.max(1, activeDays - p1Days - p2Days);
    }

    const reassignedMap = data.reassignedChapters || {};
    const reassignedSet = new Set(Object.keys(reassignedMap));

    const plans: DayPlan[] = [];

    for (let d = 0; d < totalDays; d++) {
      const curDate = new Date(today.getTime() + d * 86400000);
      const y = curDate.getFullYear();
      const m = String(curDate.getMonth() + 1).padStart(2, '0');
      const day = String(curDate.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${day}`;
      const isToday = d === 0;
      const isBufferPeriod = d >= activeDays;

      const dateFormatted = curDate.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
      });
      const dayOfWeek = curDate.toLocaleDateString('en-IN', {
        weekday: 'short',
      });

      let chapterIds: string[] = [];
      let bufferDayNumber: number | undefined;
      let phase: DayPlan['phase'] = 'Pass 1: 1 Ch/Day';

      if (isBufferPeriod) {
        // Last 15 days left empty: reserved for full mocks & grand revision buffer
        chapterIds = [];
        bufferDayNumber = totalDays - d; // counts down 15, 14, ..., 1
        phase = 'Final 15-Day Buffer';
      } else if (d < p1Days) {
        // Pass 1: 1 chapter per day
        phase = 'Pass 1: 1 Ch/Day';
        if (p1Days === 93) {
          chapterIds = [interleaved[d % totalChapters].id];
        } else {
          const sIdx = Math.floor((d * totalChapters) / p1Days);
          const eIdx = Math.min(totalChapters, Math.floor(((d + 1) * totalChapters) / p1Days));
          chapterIds = interleaved.slice(sIdx, eIdx).map((c) => c.id);
        }
      } else if (d < p1Days + p2Days) {
        // Pass 2: Second complete revision
        phase = 'Pass 2: Rapid Recall';
        const p2Idx = d - p1Days;
        const sIdx = Math.floor((p2Idx * totalChapters) / p2Days);
        const eIdx = Math.min(totalChapters, Math.floor(((p2Idx + 1) * totalChapters) / p2Days));
        chapterIds = interleaved.slice(sIdx, eIdx).map((c) => c.id);
      } else {
        // Pass 3: Third complete revision
        phase = 'Pass 3: Final Consolidation';
        const p3Idx = d - p1Days - p2Days;
        const sIdx = Math.floor((p3Idx * totalChapters) / p3Days);
        const eIdx = Math.min(totalChapters, Math.floor(((p3Idx + 1) * totalChapters) / p3Days));
        chapterIds = interleaved.slice(sIdx, eIdx).map((c) => c.id);
      }

      // ── Rescheduling handling ───────────────────────────────────────────
      // If any chapter in this day was reassigned to ANOTHER date, remove it from this day
      chapterIds = chapterIds.filter((cid) => {
        if (reassignedSet.has(cid)) {
          return reassignedMap[cid] === dateStr;
        }
        return true;
      });

      // Add chapters specifically reassigned to this date
      for (const [cid, targetDate] of Object.entries(reassignedMap)) {
        if (targetDate === dateStr && !chapterIds.includes(cid)) {
          chapterIds.push(cid);
        }
      }

      // Check customDayPlans override for this date
      const custom = data.customDayPlans?.[dateStr];
      if (custom?.chapterIds && custom.chapterIds.length > 0) {
        for (const cid of custom.chapterIds) {
          if (!chapterIds.includes(cid)) chapterIds.push(cid);
        }
      }

      const dayTopics: TopicItem[] = custom?.topics || [];

      plans.push({
        dayIndex: d + 1,
        dateStr,
        dateFormatted,
        dayOfWeek,
        isToday,
        isPast: false,
        isBufferPeriod,
        bufferDayNumber,
        phase,
        chapterIds,
        topics: dayTopics,
      });
    }

    return plans;
  }

  // ── Editable Schedule & Rescheduling Methods ─────────────────────────────
  public addChapterToDay(username: string, chapterId: string, targetDateStr: string = todayISO()) {
    const data = this.dataOf(username);
    if (!data.customDayPlans) data.customDayPlans = {};
    if (!data.reassignedChapters) data.reassignedChapters = {};

    // Remove from previous reassigned date if any
    data.reassignedChapters[chapterId] = targetDateStr;

    if (!data.customDayPlans[targetDateStr]) {
      data.customDayPlans[targetDateStr] = { chapterIds: [], topics: [] };
    }
    if (!data.customDayPlans[targetDateStr].chapterIds.includes(chapterId)) {
      data.customDayPlans[targetDateStr].chapterIds.push(chapterId);
    }

    // Also sync to today's active list if adding to today
    if (targetDateStr === todayISO()) {
      const adds = new Set(data.todayAdds[targetDateStr] ?? []);
      adds.add(chapterId);
      data.todayAdds[targetDateStr] = Array.from(adds);
      if (data.todaySkips[targetDateStr]) {
        data.todaySkips[targetDateStr] = data.todaySkips[targetDateStr].filter((id) => id !== chapterId);
      }
    }

    sound.playSwitchDesk(false);
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public removeChapterFromDay(username: string, chapterId: string, dateStr: string) {
    const data = this.dataOf(username);
    if (data.reassignedChapters?.[chapterId] === dateStr) {
      delete data.reassignedChapters[chapterId];
    }
    if (data.customDayPlans?.[dateStr]) {
      data.customDayPlans[dateStr].chapterIds = data.customDayPlans[dateStr].chapterIds.filter(
        (id) => id !== chapterId
      );
    }
    if (dateStr === todayISO()) {
      this.removeFromToday(username, chapterId, dateStr);
      return;
    }
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public addTopicToDay(username: string, chapterId: string, topicName: string, dateStr: string = todayISO()) {
    const data = this.dataOf(username);
    if (!data.customDayPlans) data.customDayPlans = {};
    if (!data.customDayPlans[dateStr]) {
      data.customDayPlans[dateStr] = { chapterIds: [], topics: [] };
    }
    const already = data.customDayPlans[dateStr].topics.some(
      (t) => t.chapterId === chapterId && t.topicName === topicName
    );
    if (!already) {
      data.customDayPlans[dateStr].topics.push({
        chapterId,
        topicName,
        isCompleted: false,
      });
      // Also ensure parent chapter is in the day plan
      if (!data.customDayPlans[dateStr].chapterIds.includes(chapterId)) {
        data.customDayPlans[dateStr].chapterIds.push(chapterId);
      }
    }

    sound.playSwitchDesk(false);
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public removeTopicFromDay(username: string, chapterId: string, topicName: string, dateStr: string) {
    const data = this.dataOf(username);
    if (data.customDayPlans?.[dateStr]) {
      data.customDayPlans[dateStr].topics = data.customDayPlans[dateStr].topics.filter(
        (t) => !(t.chapterId === chapterId && t.topicName === topicName)
      );
    }
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public toggleTopicDone(username: string, chapterId: string, topicName: string, dateStr: string) {
    const data = this.dataOf(username);
    if (!data.topicCompletions) data.topicCompletions = {};
    const key = `${dateStr}::${chapterId}::${topicName}`;
    const nextVal = !data.topicCompletions[key];
    data.topicCompletions[key] = nextVal;

    if (data.customDayPlans?.[dateStr]?.topics) {
      const item = data.customDayPlans[dateStr].topics.find(
        (t) => t.chapterId === chapterId && t.topicName === topicName
      );
      if (item) item.isCompleted = nextVal;
    }

    if (nextVal) {
      sound.playDoneChime();
    }
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public isTopicDone(username: string, chapterId: string, topicName: string, dateStr: string): boolean {
    const data = this.dataOf(username);
    const key = `${dateStr}::${chapterId}::${topicName}`;
    return Boolean(data.topicCompletions?.[key]);
  }

  // ── Automatic & Manual Rollover of Incomplete Items ─────────────────────
  public rolloverIncompleteToTomorrow(username: string, fromDateStr: string = todayISO()): number {
    const data = this.dataOf(username);
    const fromDate = new Date(fromDateStr + 'T12:00:00');
    const toDate = new Date(fromDate.getTime() + 86400000);
    const y = toDate.getFullYear();
    const m = String(toDate.getMonth() + 1).padStart(2, '0');
    const d = String(toDate.getDate()).padStart(2, '0');
    const toDateStr = `${y}-${m}-${d}`;

    if (!data.customDayPlans) data.customDayPlans = {};
    const fromPlan = data.customDayPlans[fromDateStr] || { chapterIds: [], topics: [] };
    if (!data.customDayPlans[toDateStr]) {
      data.customDayPlans[toDateStr] = { chapterIds: [], topics: [] };
    }

    let rolledCount = 0;

    // Rollover incomplete topics:
    if (fromPlan.topics && fromPlan.topics.length > 0) {
      for (const top of fromPlan.topics) {
        const isDone = this.isTopicDone(username, top.chapterId, top.topicName, fromDateStr);
        if (!isDone) {
          const already = data.customDayPlans[toDateStr].topics.some(
            (t) => t.chapterId === top.chapterId && t.topicName === top.topicName
          );
          if (!already) {
            data.customDayPlans[toDateStr].topics.push({
              chapterId: top.chapterId,
              topicName: top.topicName,
              isCompleted: false,
            });
            if (!data.customDayPlans[toDateStr].chapterIds.includes(top.chapterId)) {
              data.customDayPlans[toDateStr].chapterIds.push(top.chapterId);
            }
            rolledCount++;
          }
        }
      }
    }

    // Rollover incomplete chapters:
    const doneSet = new Set(data.todayDone[fromDateStr] ?? []);
    const todays = this.todaysChapters(data, fromDateStr);
    for (const cid of todays) {
      if (!doneSet.has(cid)) {
        if (!data.customDayPlans[toDateStr].chapterIds.includes(cid)) {
          data.customDayPlans[toDateStr].chapterIds.push(cid);
          rolledCount++;
        }
      }
    }

    sound.playDoneChime();
    this.notify();
    this.syncUserDataToSupabase(username);
    return rolledCount;
  }

  public checkAndRolloverIncompleteTopics(username: string) {
    const data = this.dataOf(username);
    if (!data.customDayPlans) return;
    const today = todayISO();

    const dates = Object.keys(data.customDayPlans).sort();
    let rolled = false;

    for (const d of dates) {
      if (d < today) {
        const plan = data.customDayPlans[d];
        if (plan?.topics && plan.topics.length > 0) {
          const incompleteTopics: TopicItem[] = [];
          for (const top of plan.topics) {
            const isDone = this.isTopicDone(username, top.chapterId, top.topicName, d);
            if (!isDone) {
              incompleteTopics.push(top);
            }
          }
          if (incompleteTopics.length > 0) {
            if (!data.customDayPlans[today]) {
              data.customDayPlans[today] = { chapterIds: [], topics: [] };
            }
            for (const inc of incompleteTopics) {
              const alreadyHas = data.customDayPlans[today].topics.some(
                (t) => t.chapterId === inc.chapterId && t.topicName === inc.topicName
              );
              if (!alreadyHas) {
                data.customDayPlans[today].topics.push({ ...inc, isCompleted: false });
                if (!data.customDayPlans[today].chapterIds.includes(inc.chapterId)) {
                  data.customDayPlans[today].chapterIds.push(inc.chapterId);
                }
                rolled = true;
              }
            }
          }
        }
      }
    }

    if (rolled) {
      this.notify();
      this.syncUserDataToSupabase(username);
    }
  }

  // ── Scheduled Tests Engine ──────────────────────────────────────────────
  public addTest(
    username: string,
    test: Omit<ScheduledTest, 'id' | 'isCompleted'>
  ): ScheduledTest {
    const data = this.dataOf(username);
    if (!data.tests) data.tests = [];

    const newTest: ScheduledTest = {
      ...test,
      id: `test-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      isCompleted: false,
    };
    data.tests.unshift(newTest);

    sound.playCheerChime();
    this.notify();
    this.syncUserDataToSupabase(username);
    return newTest;
  }

  public toggleTestCompleted(username: string, testId: string) {
    const data = this.dataOf(username);
    if (!data.tests) return;
    const target = data.tests.find((t) => t.id === testId);
    if (!target) return;

    target.isCompleted = !target.isCompleted;
    if (target.isCompleted) {
      target.completedAt = todayISO();
      data.testsCompletedCount = (data.testsCompletedCount || 0) + 1;
      sound.playPomodoroGong();
    } else {
      target.completedAt = undefined;
      data.testsCompletedCount = Math.max(0, (data.testsCompletedCount || 1) - 1);
    }

    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public deleteTest(username: string, testId: string) {
    const data = this.dataOf(username);
    if (!data.tests) return;
    data.tests = data.tests.filter((t) => t.id !== testId);
    this.notify();
    this.syncUserDataToSupabase(username);
  }

  public getTestsForDate(username: string, dateStr: string = todayISO()): ScheduledTest[] {
    const data = this.dataOf(username);
    if (!data.tests) return [];

    // Return tests scheduled for this date OR containing topics scheduled for this date
    const dayTopics = data.customDayPlans?.[dateStr]?.topics || [];
    const dayTopicKeys = new Set(dayTopics.map((t) => `${t.chapterId}::${t.topicName}`));

    return data.tests.filter((t) => {
      if (t.dateStr === dateStr) return true;
      if (t.topics && t.topics.length > 0) {
        return t.topics.some((top) => dayTopicKeys.has(`${top.chapterId}::${top.topicName}`));
      }
      return false;
    });
  }

  public getCompletedTestsCount(username: string): number {
    const data = this.dataOf(username);
    if (typeof data.testsCompletedCount === 'number') {
      return data.testsCompletedCount;
    }
    return (data.tests || []).filter((t) => t.isCompleted).length;
  }

  public setExamDate(dateStr: string) {
    TARGET_EXAM_DATE = dateStr;
    this.notify();
  }
}

export const store = new DuoStore();
