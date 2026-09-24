import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Input } from '../components/ui/input';
import { UserCheck, Search, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  currentMonthKey,
  defaultSessionDate,
  listClassSessionsInMonth,
  sessionTimestamp,
  type AttendanceStatus,
  type SessionOccurrence,
} from '../lib/attendance';

type ClassDoc = {
  id: string;
  title: string;
  teacher: string;
  teacherId: string;
};

type ScheduleDoc = {
  id: string;
  classId: string;
  className?: string;
  teacherName?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
};

type BookingDoc = {
  id: string;
  [key: string]: unknown;
};

type AttendeeRow = {
  bookingId: string;
  attendeeName: string;
  attendeeEmail: string;
  classId: string;
  classTitle: string;
  teacherName: string;
  scheduleId: string;
  status: string;
  createdLabel: string;
};

function resolveDisplayName(booking: Record<string, unknown>): string {
  const firstName = String(booking?.userFirstName || '').trim();
  const lastName = String(booking?.userLastName || '').trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const directName = String(
    fullName ||
      booking?.userName ||
      booking?.displayName ||
      booking?.name ||
      booking?.studentName ||
      ''
  ).trim();
  if (directName) return directName;
  const email = String(booking?.userEmail || booking?.email || '').trim();
  if (email.includes('@')) return email.split('@')[0].trim();
  if (email) return email;
  return String(booking?.userId || 'Хэрэглэгч').trim();
}

type UserProfileLabel = { name: string; email: string };

function pickProfileLabel(d: Record<string, unknown>): UserProfileLabel | null {
  const rawEmail = String(d.email || '').trim();
  const display = String(d.displayName || d.name || '').trim();
  const email = rawEmail;
  const nameSource = display || (rawEmail.includes('@') ? rawEmail.split('@')[0].trim() : '');
  const name = nameSource || '';
  if (!name && !email) return null;
  return { name: name || (email ? email.split('@')[0].trim() : ''), email };
}

function resolveAttendeeDisplayName(
  booking: Record<string, unknown>,
  profileLabels: Record<string, UserProfileLabel>
): string {
  const uid = String(booking?.userId || '').trim();
  if (uid && profileLabels[uid]?.name) return profileLabels[uid].name;
  return resolveDisplayName(booking);
}

function formatCreated(value: unknown): string {
  if (!value) return '—';
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().toLocaleString();
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleString();
  }
  return '—';
}

function isClassBooking(data: Record<string, unknown>): boolean {
  const type = String(data?.type || '').trim().toLowerCase();
  if (type === 'class' || type === 'class_month') return true;
  if (type) return false;
  return Boolean(data?.classId || data?.itemId || data?.scheduleId);
}

function groupKeyForRow(row: AttendeeRow): string {
  if (row.classId) return `class:${row.classId}`;
  if (row.scheduleId) return `slot:${row.scheduleId}`;
  return 'unknown';
}

function rowMatchesSearch(r: AttendeeRow, q: string): boolean {
  const ql = q.toLowerCase();
  return (
    r.attendeeName.toLowerCase().includes(ql) ||
    r.attendeeEmail.toLowerCase().includes(ql) ||
    r.classTitle.toLowerCase().includes(ql) ||
    r.teacherName.toLowerCase().includes(ql)
  );
}

type ClassGroup = {
  key: string;
  classId: string;
  classTitle: string;
  teacherName: string;
  rows: AttendeeRow[];
};

export const ClassAttendanceAdmin: React.FC = () => {
  const [classesById, setClassesById] = useState<Map<string, ClassDoc>>(new Map());
  const [scheduleById, setScheduleById] = useState<Map<string, ScheduleDoc>>(new Map());
  const [bookings, setBookings] = useState<BookingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherFilter, setTeacherFilter] = useState<string>('__all__');
  const [search, setSearch] = useState('');
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const [userProfileLabels, setUserProfileLabels] = useState<Record<string, UserProfileLabel>>({});
  const profileFetchStarted = useRef<Set<string>>(new Set());

  const [dateByGroup, setDateByGroup] = useState<Record<string, string>>({});
  const [sessionStatus, setSessionStatus] = useState<Record<string, AttendanceStatus>>({});
  const [loadingSessionsFor, setLoadingSessionsFor] = useState<string | null>(null);

  const monthKey = currentMonthKey();

  useEffect(() => {
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snap) => {
      const next = new Map<string, ClassDoc>();
      snap.docs.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        next.set(d.id, {
          id: d.id,
          title: typeof data?.title === 'string' ? data.title : 'Хичээл',
          teacher: typeof data?.teacher === 'string' ? data.teacher : '—',
          teacherId: typeof data?.teacherId === 'string' ? data.teacherId : '',
        });
      });
      setClassesById(next);
    });

    const unsubSchedule = onSnapshot(collection(db, 'schedule'), (snap) => {
      const next = new Map<string, ScheduleDoc>();
      snap.docs.forEach((d) => {
        const data = d.data() as Record<string, unknown>;
        next.set(d.id, {
          id: d.id,
          classId: String(data?.classId || ''),
          className: typeof data?.className === 'string' ? data.className : undefined,
          teacherName: typeof data?.teacherName === 'string' ? data.teacherName : undefined,
          dayOfWeek: typeof data?.dayOfWeek === 'string' ? data.dayOfWeek : undefined,
          startTime: typeof data?.startTime === 'string' ? data.startTime : undefined,
          endTime: typeof data?.endTime === 'string' ? data.endTime : undefined,
        });
      });
      setScheduleById(next);
    });

    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsubBookings = onSnapshot(
      q,
      (snap) => {
        setBookings(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as BookingDoc[]);
        setLoading(false);
      },
      (error) => {
        console.error('[ClassAttendanceAdmin] bookings:', error);
        try {
          handleFirestoreError(error, OperationType.LIST, 'bookings');
        } catch {
          toast.error('Бүртгэлүүдийг ачаалахад алдаа гарлаа');
        }
        setLoading(false);
      }
    );

    return () => {
      unsubClasses();
      unsubSchedule();
      unsubBookings();
    };
  }, []);

  useEffect(() => {
    const uids: string[] = [];
    for (const b of bookings) {
      const data = b as Record<string, unknown>;
      if (!isClassBooking(data)) continue;
      const uid = String(data?.userId || '').trim();
      if (!uid || profileFetchStarted.current.has(uid)) continue;
      profileFetchStarted.current.add(uid);
      uids.push(uid);
    }
    if (uids.length === 0) return;
    let cancelled = false;
    void (async () => {
      const updates: Record<string, UserProfileLabel> = {};
      for (const uid of uids) {
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            const label = pickProfileLabel(snap.data() as Record<string, unknown>);
            if (label) updates[uid] = label;
          }
        } catch {
          /* ignore */
        }
      }
      if (cancelled || Object.keys(updates).length === 0) return;
      setUserProfileLabels((prev) => ({ ...prev, ...updates }));
    })();
    return () => {
      cancelled = true;
    };
  }, [bookings]);

  const scheduleSlotsByClassId = useMemo(() => {
    const m = new Map<string, ScheduleDoc[]>();
    scheduleById.forEach((slot) => {
      if (!slot.classId) return;
      const list = m.get(slot.classId);
      if (list) list.push(slot);
      else m.set(slot.classId, [slot]);
    });
    return m;
  }, [scheduleById]);

  const sessionsByClassId = useMemo(() => {
    const m = new Map<string, SessionOccurrence[]>();
    scheduleSlotsByClassId.forEach((slots, classId) => {
      const sessionSlots = slots
        .filter((s) => s.dayOfWeek && s.startTime)
        .map((s) => ({ id: s.id, classId, day: s.dayOfWeek as string, startTime: s.startTime, time: s.startTime || '' }));
      m.set(classId, listClassSessionsInMonth(monthKey, sessionSlots));
    });
    return m;
  }, [scheduleSlotsByClassId, monthKey]);

  const rows = useMemo(() => {
    const out: AttendeeRow[] = [];
    for (const b of bookings) {
      const data = b as Record<string, unknown>;
      if (!isClassBooking(data)) continue;
      const status = String(data?.status || '').toLowerCase();
      if (status === 'cancelled') continue;

      const scheduleId = String(data?.scheduleId || '').trim();
      const classIdFromBooking = String(data?.classId || data?.itemId || '').trim();
      const slot = scheduleId ? scheduleById.get(scheduleId) : undefined;
      const classId = classIdFromBooking || (slot?.classId || '');

      const cls = classId ? classesById.get(classId) : undefined;
      const classTitle =
        cls?.title ||
        slot?.className ||
        (classId ? `ID: ${classId.slice(0, 8)}…` : 'Хичээл тодорхойгүй');

      const teacherName = cls?.teacher || slot?.teacherName || '—';

      out.push({
        bookingId: b.id,
        attendeeName: resolveAttendeeDisplayName(data, userProfileLabels),
        attendeeEmail:
          (String(data?.userEmail || data?.email || '').trim() ||
            (userProfileLabels[String(data?.userId || '').trim()]?.email ?? ''))
            .trim() || '—',
        classId,
        classTitle,
        teacherName,
        scheduleId,
        status: String(data?.status || '—'),
        createdLabel: formatCreated(data?.createdAt),
      });
    }

    out.sort((a, b) => {
      const t = a.teacherName.localeCompare(b.teacherName, 'mn');
      if (t !== 0) return t;
      const c = a.classTitle.localeCompare(b.classTitle, 'mn');
      if (c !== 0) return c;
      return a.attendeeName.localeCompare(b.attendeeName, 'mn');
    });
    return out;
  }, [bookings, classesById, scheduleById, userProfileLabels]);

  const teacherOptions = useMemo(() => {
    const set = new Set<string>();
    classesById.forEach((c) => {
      if (c.teacher && c.teacher !== '—') set.add(c.teacher);
    });
    rows.forEach((r) => {
      if (r.teacherName && r.teacherName !== '—') set.add(r.teacherName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'mn'));
  }, [rows, classesById]);

  const rowsByClassId = useMemo(() => {
    const m = new Map<string, AttendeeRow[]>();
    for (const r of rows) {
      if (!r.classId) continue;
      const list = m.get(r.classId);
      if (list) list.push(r);
      else m.set(r.classId, [r]);
    }
    for (const list of m.values()) {
      list.sort((a, b) => a.attendeeName.localeCompare(b.attendeeName, 'mn'));
    }
    return m;
  }, [rows]);

  const classGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out: ClassGroup[] = [];

    const sortedClasses = Array.from(classesById.values()).sort((a, b) => {
      const t = a.teacher.localeCompare(b.teacher, 'mn');
      if (t !== 0) return t;
      return a.title.localeCompare(b.title, 'mn');
    });

    for (const cls of sortedClasses) {
      if (teacherFilter !== '__all__' && cls.teacher !== teacherFilter) continue;

      const allForClass = rowsByClassId.get(cls.id) ?? [];
      let displayRows = allForClass;

      if (q) {
        const metaMatch =
          cls.title.toLowerCase().includes(q) || cls.teacher.toLowerCase().includes(q);
        const studentMatches = allForClass.filter((r) => rowMatchesSearch(r, q));
        if (!metaMatch && studentMatches.length === 0) continue;
        displayRows = metaMatch ? allForClass : studentMatches;
      }

      out.push({
        key: `class:${cls.id}`,
        classId: cls.id,
        classTitle: cls.title,
        teacherName: cls.teacher,
        rows: displayRows,
      });
    }

    const ghostClassIds = new Set<string>();
    for (const r of rows) {
      if (r.classId && !classesById.has(r.classId)) ghostClassIds.add(r.classId);
    }
    for (const ghostId of ghostClassIds) {
      const ghostRows = rows.filter(
        (x) =>
          x.classId === ghostId &&
          (teacherFilter === '__all__' || x.teacherName === teacherFilter) &&
          (!q || rowMatchesSearch(x, q))
      );
      if (ghostRows.length === 0) continue;
      ghostRows.sort((a, b) => a.attendeeName.localeCompare(b.attendeeName, 'mn'));
      const first = ghostRows[0];
      out.push({ key: `ghost:${ghostId}`, classId: ghostId, classTitle: first.classTitle, teacherName: first.teacherName, rows: ghostRows });
    }

    const orphanMap = new Map<string, ClassGroup>();
    for (const r of rows) {
      if (r.classId) continue;
      if (teacherFilter !== '__all__' && r.teacherName !== teacherFilter) continue;
      if (q && !rowMatchesSearch(r, q)) continue;
      const key = groupKeyForRow(r);
      let g = orphanMap.get(key);
      if (!g) {
        g = { key, classId: '', classTitle: r.classTitle, teacherName: r.teacherName, rows: [] };
        orphanMap.set(key, g);
      }
      g.rows.push(r);
    }
    for (const g of orphanMap.values()) {
      g.rows.sort((a, b) => a.attendeeName.localeCompare(b.attendeeName, 'mn'));
      out.push(g);
    }

    out.sort((a, b) => {
      const t = a.teacherName.localeCompare(b.teacherName, 'mn');
      if (t !== 0) return t;
      return a.classTitle.localeCompare(b.classTitle, 'mn');
    });
    return out;
  }, [rows, rowsByClassId, classesById, teacherFilter, search]);

  const totalAttendeeRowsInView = useMemo(
    () => classGroups.reduce((acc, g) => acc + g.rows.length, 0),
    [classGroups]
  );

  const loadSessionStatuses = async (group: ClassGroup, dateKey: string) => {
    if (!dateKey || group.rows.length === 0) return;
    setLoadingSessionsFor(group.key);
    try {
      const entries = await Promise.all(
        group.rows.map(async (row) => {
          const snap = await getDoc(doc(db, 'bookings', row.bookingId, 'sessions', dateKey));
          const raw = snap.exists() ? String((snap.data() as Record<string, unknown>)?.attendanceStatus || 'unknown') : 'unknown';
          const status: AttendanceStatus = raw === 'attended' || raw === 'missed' ? raw : 'unknown';
          return [`${row.bookingId}:${dateKey}`, status] as const;
        })
      );
      setSessionStatus((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    } finally {
      setLoadingSessionsFor(null);
    }
  };

  const toggleGroup = (group: ClassGroup) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(group.key)) {
        next.delete(group.key);
        return next;
      }
      next.add(group.key);
      const sessions = sessionsByClassId.get(group.classId) || [];
      const date = dateByGroup[group.key] || defaultSessionDate(sessions);
      if (date && date !== dateByGroup[group.key]) {
        setDateByGroup((d) => ({ ...d, [group.key]: date }));
      }
      if (date) void loadSessionStatuses(group, date);
      return next;
    });
  };

  const changeGroupDate = (group: ClassGroup, dateKey: string) => {
    setDateByGroup((prev) => ({ ...prev, [group.key]: dateKey }));
    void loadSessionStatuses(group, dateKey);
  };

  const setAttendance = async (group: ClassGroup, bookingId: string, next: AttendanceStatus) => {
    const dateKey = dateByGroup[group.key];
    const sessions = sessionsByClassId.get(group.classId) || [];
    const occurrence = sessions.find((s) => s.dateKey === dateKey);
    if (!dateKey || !occurrence) {
      toast.error('Энэ хичээлийн тухайн өдрийн цаг тодорхойгүй байна');
      return;
    }
    const key = `${bookingId}:${dateKey}`;
    setSavingKey(key);
    try {
      await setDoc(doc(db, 'bookings', bookingId, 'sessions', dateKey), {
        classStartTime: sessionTimestamp(occurrence.date),
        attendanceStatus: next,
        attendanceMarkedAt: Timestamp.now(),
      });
      setSessionStatus((prev) => ({ ...prev, [key]: next }));
      toast.success('Ирц шинэчлэгдлээ');
    } catch (error) {
      console.error(error);
      try {
        handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}/sessions/${dateKey}`);
      } catch {
        toast.error('Ирц хадгалахад алдаа гарлаа');
      }
    } finally {
      setSavingKey(null);
    }
  };

  if (loading && bookings.length === 0) {
    return <div className="p-8 text-center text-brand-ink/50">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-[100rem] mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-brand-icon">
            <UserCheck size={22} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Хичээл</span>
          </div>
          <h1 className="text-3xl font-light text-brand-ink">Бүх хичээлийн суралцагчид</h1>
          <p className="mt-2 max-w-2xl text-sm text-brand-ink/55">
            Хичээл дээр дарж тухайн өдрийн ирцийг тэмдэглэнэ үү. Ирц өдөр тус бүрээр тусад нь хадгалагдана.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex flex-col gap-2.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-black">
              Багш
            </label>
            <select
              value={teacherFilter}
              onChange={(e) => setTeacherFilter(e.target.value)}
              className="h-11 min-w-[200px] rounded-xl border border-input bg-background px-3 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
            >
              <option value="__all__">Бүх багш</option>
              {teacherOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="relative min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-ink/30" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Хайх (нэр, имэйл, хичээл)…"
              className="h-11 rounded-xl pl-10"
            />
          </div>
        </div>
      </div>

      <div className="mb-4 text-sm text-brand-ink/50">
        Нийт: <strong className="text-brand-ink">{totalAttendeeRowsInView}</strong> суралцагч ·{' '}
        <strong className="text-brand-ink">{classGroups.length}</strong> хичээл
        {teacherFilter !== '__all__' ? (
          <>
            {' '}
            · Багш: <strong className="text-brand-ink">{teacherFilter}</strong>
          </>
        ) : null}
      </div>

      <div className="space-y-3">
        {classGroups.length === 0 ? (
          <div className="rounded-3xl border border-brand-ink/10 bg-white px-6 py-16 text-center text-brand-ink/45 shadow-sm">
            Хичээл олдсонгүй. Хайлт эсвэл багшийн шүүлтийг өөрчилнө үү.
          </div>
        ) : (
          classGroups.map((group) => {
            const open = expandedKeys.has(group.key);
            const sessions = sessionsByClassId.get(group.classId) || [];
            const selectedDate = dateByGroup[group.key] || defaultSessionDate(sessions);
            const sessionsLoading = loadingSessionsFor === group.key;
            return (
              <div
                key={group.key}
                className="overflow-hidden rounded-3xl border border-brand-ink/10 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/30 sm:px-6"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-ink/10 bg-secondary/40 text-brand-ink/70">
                    {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium text-brand-ink">{group.classTitle}</p>
                    <p className="mt-0.5 text-xs text-brand-ink/50">
                      <span className="font-semibold text-brand-ink/70">{group.teacherName}</span>
                      {' · '}
                      <span>{group.rows.length} суралцагч</span>
                    </p>
                  </div>
                </button>
                {open ? (
                  <div className="border-t border-brand-ink/10">
                    {sessions.length > 0 ? (
                      <div className="flex items-center gap-2 border-b border-brand-ink/5 bg-secondary/10 px-6 py-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40">Огноо:</span>
                        <select
                          value={selectedDate}
                          onChange={(e) => changeGroupDate(group, e.target.value)}
                          className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-brand-ink"
                        >
                          {sessions.map((s) => (
                            <option key={s.dateKey} value={s.dateKey}>
                              {s.dateKey} ({s.time})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="border-b border-brand-ink/5 bg-amber-50 px-6 py-3 text-xs text-amber-700">
                        Энэ сард хуваарийн цаг байхгүй тул ирц тэмдэглэх боломжгүй. Хичээл удирдлагаас цагаа нэмнэ үү.
                      </div>
                    )}
                    {group.rows.length === 0 ? (
                      <div className="px-6 py-10 text-center text-sm text-brand-ink/45">
                        Энэ хичээлд одоогоор бүртгэгдсэн суралцагч байхгүй.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] text-left border-collapse">
                          <thead>
                            <tr className="bg-secondary/20">
                              <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black">
                                Суралцагч
                              </th>
                              <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black">
                                Имэйл
                              </th>
                              <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black">
                                Захиалал
                              </th>
                              <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black">
                                Ирц
                              </th>
                              <th className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-black">
                                Огноо
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-brand-ink/5">
                            {group.rows.map((row) => {
                              const statusKey = `${row.bookingId}:${selectedDate}`;
                              const attendance = sessions.length === 0 ? 'unknown' : sessionStatus[statusKey] ?? 'unknown';
                              return (
                                <tr key={row.bookingId} className="hover:bg-secondary/15 transition-colors">
                                  <td className="px-4 py-3 text-sm font-medium text-brand-ink">{row.attendeeName}</td>
                                  <td className="max-w-[220px] truncate px-4 py-3 text-xs text-brand-ink/60">
                                    {row.attendeeEmail}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-ink/70">
                                      {row.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <select
                                      value={attendance}
                                      disabled={sessions.length === 0 || sessionsLoading || savingKey === statusKey}
                                      onChange={(e) => {
                                        const v = e.target.value as AttendanceStatus;
                                        void setAttendance(group, row.bookingId, v);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-brand-ink"
                                    >
                                      <option value="unknown">Тодорхойгүй</option>
                                      <option value="attended">Ирсэн</option>
                                      <option value="missed">Ирээгүй</option>
                                    </select>
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-3 text-xs text-brand-ink/50">
                                    {row.createdLabel}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <p className="mt-6 text-xs text-brand-ink/40">
        Ирц тухайн хичээлийн бодит өдөр бүрээр тусад нь хадгалагдана.
      </p>
    </div>
  );
};
