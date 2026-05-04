import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Input } from '../components/ui/input';
import { UserCheck, Search } from 'lucide-react';
import { toast } from 'sonner';

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
  attendance: 'attended' | 'missed' | 'present' | 'absent' | 'unknown';
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

function normalizeAttendance(raw: unknown): AttendeeRow['attendance'] {
  const s = String(raw || '').toLowerCase();
  if (s === 'attended' || s === 'present') return s === 'present' ? 'present' : 'attended';
  if (s === 'missed' || s === 'absent') return s === 'absent' ? 'absent' : 'missed';
  return 'unknown';
}

function isClassBooking(data: Record<string, unknown>): boolean {
  const type = String(data?.type || '').trim().toLowerCase();
  if (type === 'class') return true;
  if (type && type !== 'class') return false;
  return Boolean(data?.classId || data?.itemId || data?.scheduleId);
}

export const ClassAttendanceAdmin: React.FC = () => {
  const [classesById, setClassesById] = useState<Map<string, ClassDoc>>(new Map());
  const [scheduleById, setScheduleById] = useState<Map<string, ScheduleDoc>>(new Map());
  const [bookings, setBookings] = useState<BookingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherFilter, setTeacherFilter] = useState<string>('__all__');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

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
        attendeeName: resolveDisplayName(data),
        attendeeEmail: String(data?.userEmail || data?.email || '').trim() || '—',
        classId,
        classTitle,
        teacherName,
        scheduleId,
        status: String(data?.status || '—'),
        attendance: normalizeAttendance(data?.attendanceStatus),
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
  }, [bookings, classesById, scheduleById]);

  const teacherOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.teacherName && r.teacherName !== '—') set.add(r.teacherName);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'mn'));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (teacherFilter !== '__all__' && r.teacherName !== teacherFilter) return false;
      if (!q) return true;
      return (
        r.attendeeName.toLowerCase().includes(q) ||
        r.attendeeEmail.toLowerCase().includes(q) ||
        r.classTitle.toLowerCase().includes(q) ||
        r.teacherName.toLowerCase().includes(q)
      );
    });
  }, [rows, teacherFilter, search]);

  const setAttendance = async (bookingId: string, next: 'attended' | 'missed' | 'unknown') => {
    setSavingId(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        attendanceStatus: next,
        attendanceMarkedAt: Timestamp.now(),
      });
      toast.success('Ирц шинэчлэгдлээ');
    } catch (error) {
      console.error(error);
      try {
        handleFirestoreError(error, OperationType.UPDATE, `bookings/${bookingId}`);
      } catch {
        toast.error('Ирц хадгалахад алдаа гарлаа');
      }
    } finally {
      setSavingId(null);
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
            Бүх багшийн хичээлд бүртгэлтэй суралцагчид, ирцийн төлөв. Багшаар шүүж, нэрээр хайна уу.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-brand-ink/40">Багш</label>
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
        Нийт: <strong className="text-brand-ink">{filteredRows.length}</strong>
        {teacherFilter !== '__all__' ? (
          <>
            {' '}
            · Багш: <strong className="text-brand-ink">{teacherFilter}</strong>
          </>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-3xl border border-brand-ink/10 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left border-collapse">
            <thead>
              <tr className="border-b border-brand-ink/10 bg-secondary/30">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-ink/40">
                  Суралцагч
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-ink/40">
                  Имэйл
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-ink/40">
                  Хичээл
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-ink/40">
                  Багш
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-ink/40">
                  Захиалал
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-ink/40">
                  Ирц
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-brand-ink/40">
                  Огноо
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-ink/5">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-brand-ink/45">
                    Суралцагчийн бүртгэл олдсонгүй.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.bookingId} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-brand-ink">{row.attendeeName}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-brand-ink/60">{row.attendeeEmail}</td>
                    <td className="px-4 py-3 text-sm text-brand-ink">{row.classTitle}</td>
                    <td className="px-4 py-3 text-sm text-brand-ink/80">{row.teacherName}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-ink/70">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={
                          row.attendance === 'present'
                            ? 'attended'
                            : row.attendance === 'absent'
                              ? 'missed'
                              : row.attendance
                        }
                        disabled={savingId === row.bookingId}
                        onChange={(e) => {
                          const v = e.target.value as 'attended' | 'missed' | 'unknown';
                          void setAttendance(row.bookingId, v);
                        }}
                        className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-brand-ink"
                      >
                        <option value="unknown">Тодорхойгүй</option>
                        <option value="attended">Ирсэн</option>
                        <option value="missed">Ирээгүй</option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-brand-ink/50">{row.createdLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-6 text-xs text-brand-ink/40">
        Хуваарийн захиалгаас үүссэн бүртгэлүүд хичээлийн нэр, багшийг хуваарийн бичлэгээс авна.
      </p>
    </div>
  );
};
