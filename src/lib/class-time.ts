const DEFAULT_TIMEZONE = 'Asia/Ulaanbaatar';

const toDateFromUnknown = (value: unknown): Date | null => {
  if (!value) return null;

  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
};

const getDateKeyInTimezone = (date: Date, timeZone: string): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

export const isTodayClass = (
  classStartTime: unknown,
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE
): boolean => {
  const start = toDateFromUnknown(classStartTime);
  if (!start) return false;
  return getDateKeyInTimezone(start, timeZone) === getDateKeyInTimezone(now, timeZone);
};

export const isFutureClass = (
  classStartTime: unknown,
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE
): boolean => {
  const start = toDateFromUnknown(classStartTime);
  if (!start) return false;

  const startKey = getDateKeyInTimezone(start, timeZone);
  const todayKey = getDateKeyInTimezone(now, timeZone);
  return startKey > todayKey;
};

export const isPastClass = (
  classStartTime: unknown,
  now: Date = new Date(),
  timeZone: string = DEFAULT_TIMEZONE
): boolean => {
  const start = toDateFromUnknown(classStartTime);
  if (!start) return false;

  const startKey = getDateKeyInTimezone(start, timeZone);
  const todayKey = getDateKeyInTimezone(now, timeZone);
  return startKey < todayKey;
};

export const isAttendanceEditableNow = (
  classStartTime: unknown,
  now: Date = new Date()
): { editable: boolean; reason?: string } => {
  const start = toDateFromUnknown(classStartTime);
  if (!start) {
    return { editable: false, reason: 'Хичээлийн эхлэх цаг тодорхойгүй байна' };
  }

  if (now < start) {
    return { editable: false, reason: 'Attendance cannot be edited before class starts' };
  }

  const endOfClassDay = new Date(start);
  endOfClassDay.setHours(23, 59, 59, 999);
  if (now > endOfClassDay) {
    return { editable: false, reason: 'Attendance is locked' };
  }

  return { editable: true };
};

export const resolveClassStartTime = (scheduleDoc: Record<string, any>): Date | null => {
  const directCandidates = [
    scheduleDoc?.startAt,
    scheduleDoc?.start_time,
    scheduleDoc?.startTime,
    scheduleDoc?.classStartTime,
    scheduleDoc?.sessionStartAt,
    scheduleDoc?.date,
    scheduleDoc?.classDate,
  ];

  for (const candidate of directCandidates) {
    const date = toDateFromUnknown(candidate);
    if (date) return date;
  }

  return null;
};
