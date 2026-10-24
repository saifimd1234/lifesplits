import type { LifeGroup } from '@/constants/theme';
import { defaultEmojiFor } from '@/lib/emoji';
import { addDays, DAY, MINUTE, startOfDay } from '@/lib/time';
import type { Category, Goal, Lap, Session } from '@/lib/types';

/** Small deterministic PRNG so sample data looks the same on every device. */
function rng(seed: number) {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Step = { cat: string; min: number; max: number; p?: number; notes?: string[] };

const WEEKDAY: Step[] = [
  { cat: 'Getting ready', min: 18, max: 30 },
  { cat: 'Breakfast', min: 15, max: 25, notes: ['Oats and eggs', 'Toast + coffee'] },
  { cat: 'Workout', min: 45, max: 75, p: 0.6, notes: ['Upper body + 15 min run', 'Legs', 'Push day'] },
  { cat: 'Commute', min: 30, max: 45 },
  { cat: 'Work', min: 180, max: 250 },
  { cat: 'Lunch', min: 30, max: 45 },
  { cat: 'Work', min: 150, max: 210 },
  { cat: 'Commute', min: 30, max: 45 },
  { cat: 'Scrolling', min: 20, max: 80, notes: ['Meant to be 10 minutes'] },
  { cat: 'Spanish', min: 30, max: 60, p: 0.5, notes: ['Duolingo + one podcast', 'Tutor call'] },
  { cat: 'Dinner', min: 25, max: 40 },
  { cat: 'Chores', min: 20, max: 45, notes: ['Kitchen cleanup'] },
  { cat: 'Reading', min: 20, max: 50, p: 0.6 },
  { cat: 'TV', min: 40, max: 90 },
];

const WEEKEND: Step[] = [
  { cat: 'Getting ready', min: 20, max: 35 },
  { cat: 'Breakfast', min: 20, max: 35 },
  { cat: 'Workout', min: 60, max: 90, p: 0.7, notes: ['Long run', 'Full body'] },
  { cat: 'Meal prep', min: 40, max: 70, p: 0.5 },
  { cat: 'Chores', min: 40, max: 80, notes: ['Laundry', 'Groceries'] },
  { cat: 'Scrolling', min: 30, max: 90 },
  { cat: 'Lunch', min: 30, max: 50 },
  { cat: 'Spanish', min: 30, max: 60, p: 0.6 },
  { cat: 'Reading', min: 30, max: 70, p: 0.7 },
  { cat: 'TV', min: 60, max: 120 },
  { cat: 'Dinner', min: 30, max: 45 },
];

export function buildSampleData(now: number, id: () => string) {
  const rand = rng(43);
  const today = startOfDay(now);
  const start = addDays(today, -23);

  const goals: Goal[] = [
    { id: id(), name: 'Physique', color: '#C2410C', targetPct: 25, effortHours: 150, startDate: start, targetDate: addDays(start, 60), createdAt: start, archived: false },
    { id: id(), name: 'Learn Spanish', color: '#2563EB', targetPct: 15, effortHours: 120, startDate: start, targetDate: addDays(start, 91), createdAt: start, archived: false },
    { id: id(), name: 'Read 12 books', color: '#0F766E', targetPct: 5, effortHours: 40, startDate: start, targetDate: addDays(start, 91), createdAt: start, archived: false },
  ];
  const [physique, spanish, reading] = goals;

  const catDefs: [string, LifeGroup, string | null][] = [
    ['Getting ready', 'routine', null],
    ['Breakfast', 'routine', null],
    ['Work', 'work', null],
    ['Commute', 'commute', null],
    ['Lunch', 'routine', null],
    ['Chores', 'routine', null],
    ['Dinner', 'routine', null],
    ['Scrolling', 'leisure', null],
    ['TV', 'leisure', null],
    ['Break', 'other', null],
    ['Workout', 'other', physique.id],
    ['Meal prep', 'other', physique.id],
    ['Spanish', 'other', spanish.id],
    ['Reading', 'other', reading.id],
  ];
  const categories: Category[] = catDefs.map(([name, group, goalId]) => ({ id: id(), name, emoji: defaultEmojiFor(name), group, goalId }));
  const byName = new Map(categories.map((c) => [c.name, c]));

  const sessions: Session[] = [];
  const laps: Lap[] = [];

  for (let day = start; day < today; day = addDays(day, 1)) {
    const weekend = [0, 6].includes(new Date(day).getDay());
    const plan = weekend ? WEEKEND : WEEKDAY;
    const wake = day + 7 * 60 * MINUTE + Math.floor(rand() * 50) * MINUTE;
    const session: Session = { id: id(), startedAt: wake, endedAt: null };
    let t = wake;
    for (const step of plan) {
      if (step.p !== undefined && rand() > step.p) continue;
      const mins = step.min + Math.floor(rand() * (step.max - step.min + 1));
      const cat = byName.get(step.cat)!;
      const isGoal = cat.goalId !== null;
      laps.push({
        id: id(),
        sessionId: session.id,
        startedAt: t,
        endedAt: t + mins * MINUTE,
        categoryId: cat.id,
        goalId: cat.goalId,
        note: step.notes && rand() < 0.5 ? step.notes[Math.floor(rand() * step.notes.length)] : '',
        energy: isGoal || rand() < 0.3 ? 2 + Math.floor(rand() * 4) : null,
        focus: isGoal || step.cat === 'Scrolling' ? (step.cat === 'Scrolling' ? 1 : 3 + Math.floor(rand() * 3)) : null,
        // Goal laps tend to feel better than scrolling, so the mood patterns have something to show.
        mood: isGoal ? 3 + Math.floor(rand() * 3) : step.cat === 'Scrolling' ? 1 + Math.floor(rand() * 2) : rand() < 0.4 ? 2 + Math.floor(rand() * 3) : null,
      });
      t += mins * MINUTE;
      if (t > day + DAY - 30 * MINUTE) break;
    }
    // Wind down until a realistic bedtime so sleep (the gap to the next day) looks like a real night.
    const bedtime = day + 22 * 60 * MINUTE + Math.floor(rand() * 75) * MINUTE;
    if (t < bedtime) {
      const tv = byName.get('TV')!;
      laps.push({ id: id(), sessionId: session.id, startedAt: t, endedAt: bedtime, categoryId: tv.id, goalId: null, note: '', energy: null, focus: null, mood: null });
      t = bedtime;
    }
    session.endedAt = t;
    sessions.push(session);
  }

  return { goals, categories, sessions, laps };
}
