import { addDays, eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';

/** Matches `Schedule.tsx` / `normalizeDay` output (week starts Monday). */
export const MONGOLIAN_DAYS_MON_FIRST = [
  'Даваа',
  'Мягмар',
  'Лхагва',
  'Пүрэв',
  'Баасан',
  'Бямба',
  'Ням',
] as const;

export function parseLocalYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(y, mo - 1, d, 12, 0, 0, 0);
}

/** `weekKey` = Monday of that ISO-style week (same convention as schedule booking). */
export function sessionDateFromWeekKey(weekKey: string, mongoDay: string): Date | null {
  const monday = parseLocalYmd(weekKey);
  if (!monday) return null;
  const idx = MONGOLIAN_DAYS_MON_FIRST.indexOf(mongoDay as (typeof MONGOLIAN_DAYS_MON_FIRST)[number]);
  if (idx < 0) return null;
  return addDays(monday, idx);
}

export function monthKeyValid(monthKey: string): boolean {
  return /^\d{4}-\d{2}$/.test(String(monthKey || '').trim());
}

export function listOccurrencesInMonth(
  monthKey: string,
  slots: Array<{ id: string; classId: string; day: string; time: string }>
): Array<{ date: Date; scheduleId: string; classId: string; day: string; time: string }> {
  if (!monthKeyValid(monthKey)) return [];
  const [ys, ms] = monthKey.split('-');
  const y = Number(ys);
  const mo = Number(ms);
  if (!y || mo < 1 || mo > 12) return [];
  const start = startOfMonth(new Date(y, mo - 1, 1, 12, 0, 0, 0));
  const end = endOfMonth(start);
  const days = eachDayOfInterval({ start, end });
  const out: Array<{ date: Date; scheduleId: string; classId: string; day: string; time: string }> = [];
  for (const date of days) {
    const dowMon0 = (date.getDay() + 6) % 7;
    const label = MONGOLIAN_DAYS_MON_FIRST[dowMon0];
    for (const s of slots) {
      if (!s.classId || s.day !== label) continue;
      out.push({ date: new Date(date), scheduleId: s.id, classId: s.classId, day: s.day, time: s.time });
    }
  }
  out.sort((a, b) => a.date.getTime() - b.date.getTime() || a.time.localeCompare(b.time));
  return out;
}

/** Next `count` calendar dates (from `from`, inclusive) that fall on this Mongolian weekday label. */
export function upcomingDatesForWeekday(from: Date, mongoDay: string, count: number): Date[] {
  const idx = MONGOLIAN_DAYS_MON_FIRST.indexOf(mongoDay as (typeof MONGOLIAN_DAYS_MON_FIRST)[number]);
  if (idx < 0) return [];
  const out: Date[] = [];
  const d = new Date(from);
  d.setHours(12, 0, 0, 0);
  for (let i = 0; i < 400 && out.length < count; i++) {
    if ((d.getDay() + 6) % 7 === idx) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function formatDisplayDateMn(d: Date): string {
  return format(d, 'yyyy.MM.dd, EEEE');
}
