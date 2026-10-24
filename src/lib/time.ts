import type { Period } from '@/lib/types';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + days);
  return d.getTime();
}

export function addMonths(ts: number, months: number): number {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + months);
  return d.getTime();
}

/** Weeks start on Monday. */
export function startOfWeek(ts: number): number {
  const d = new Date(startOfDay(ts));
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d.getTime();
}

export function startOfMonth(ts: number): number {
  const d = new Date(startOfDay(ts));
  d.setDate(1);
  return d.getTime();
}

export function startOfYear(ts: number): number {
  const d = new Date(startOfMonth(ts));
  d.setMonth(0);
  return d.getTime();
}

export function periodRange(period: Period, anchor: number): { start: number; end: number } {
  switch (period) {
    case 'day': {
      const start = startOfDay(anchor);
      return { start, end: addDays(start, 1) };
    }
    case 'week': {
      const start = startOfWeek(anchor);
      return { start, end: addDays(start, 7) };
    }
    case 'month': {
      const start = startOfMonth(anchor);
      return { start, end: addMonths(start, 1) };
    }
    case 'year': {
      const start = startOfYear(anchor);
      return { start, end: addMonths(start, 12) };
    }
  }
}

export function shiftPeriod(period: Period, anchor: number, step: number): number {
  switch (period) {
    case 'day':
      return addDays(anchor, step);
    case 'week':
      return addDays(anchor, step * 7);
    case 'month':
      return addMonths(startOfMonth(anchor), step);
    case 'year':
      return addMonths(startOfYear(anchor), step * 12);
  }
}

/** ISO week number, used for "Week 43" labels. */
export function isoWeek(ts: number): number {
  const local = new Date(ts);
  const d = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / DAY + 1) / 7);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 0:42:18 */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${pad(m)}:${pad(s)}`;
}

/** 1 h 05 m · 25 m · <1 m */
export function formatDuration(ms: number): string {
  const mins = Math.round(ms / MINUTE);
  if (mins < 1) return '<1 m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} m`;
  return `${h} h ${pad(m)} m`;
}

/** 12 h · 7.5 h · 0 h */
export function formatHours(ms: number): string {
  const h = ms / HOUR;
  if (h === 0) return '0 h';
  if (h < 10) return `${Math.round(h * 10) / 10} h`;
  return `${Math.round(h)} h`;
}

export function formatPct(fraction: number): string {
  const pct = fraction * 100;
  if (pct === 0) return '0%';
  if (pct < 10) return `${Math.round(pct * 10) / 10}%`;
  return `${Math.round(pct)}%`;
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function formatShortTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours() % 12 || 12;
  return `${h}:${pad(d.getMinutes())}`;
}

export function formatDate(ts: number, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  return new Date(ts).toLocaleDateString('en-US', opts);
}

export function weekdayName(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { weekday: 'long' });
}

export function daysBetween(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY);
}
