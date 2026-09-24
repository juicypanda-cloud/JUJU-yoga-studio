import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { listOccurrencesInMonth } from './bookingScheduleDisplay';

export type AttendanceStatus = 'attended' | 'missed' | 'unknown';

export type SessionSlotLike = { id: string; classId: string; day: string; startTime?: string; time: string };

export type SessionOccurrence = {
  dateKey: string;
  date: Date;
  scheduleId: string;
  time: string;
};

/** `YYYY-MM-DD` key used as the session subcollection doc id. */
export function sessionDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Combine a calendar day with a class's `HH:MM` start time into a real Date. */
export function withStartTime(date: Date, startTime?: string): Date {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(startTime || '').trim());
  const result = new Date(date);
  if (match) {
    result.setHours(Number(match[1]), Number(match[2]), 0, 0);
  } else {
    result.setHours(0, 0, 0, 0);
  }
  return result;
}

/** All calendar occurrences for one class in one month, with a real classStartTime per row. */
export function listClassSessionsInMonth(monthKey: string, slots: SessionSlotLike[]): SessionOccurrence[] {
  const occ = listOccurrencesInMonth(
    monthKey,
    slots.map((s) => ({ id: s.id, classId: s.classId, day: s.day, time: s.time }))
  );
  const startTimeByScheduleId = new Map(slots.map((s) => [s.id, s.startTime]));
  return occ.map((o) => {
    const withTime = withStartTime(o.date, startTimeByScheduleId.get(o.scheduleId));
    return { dateKey: sessionDateKey(withTime), date: withTime, scheduleId: o.scheduleId, time: o.time };
  });
}

export function sessionTimestamp(date: Date): Timestamp {
  return Timestamp.fromDate(date);
}

/** Pick a sensible default session date: today if the class runs today this month, else the most recent past occurrence, else the first upcoming one. */
export function defaultSessionDate(sessions: SessionOccurrence[]): string {
  if (sessions.length === 0) return '';
  const todayKey = sessionDateKey(new Date());
  const todayMatch = sessions.find((s) => s.dateKey === todayKey);
  if (todayMatch) return todayMatch.dateKey;
  const now = Date.now();
  const past = sessions.filter((s) => s.date.getTime() <= now);
  if (past.length > 0) return past[past.length - 1].dateKey;
  return sessions[0].dateKey;
}

export function currentMonthKey(): string {
  return format(new Date(), 'yyyy-MM');
}
