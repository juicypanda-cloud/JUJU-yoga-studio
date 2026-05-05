import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { ClassItem } from '../types/class';
import {
  formatDisplayDateMn,
  listOccurrencesInMonth,
  monthKeyValid,
  sessionDateFromWeekKey,
  upcomingDatesForWeekday,
} from '../lib/bookingScheduleDisplay';

type ClassLookupItem = {
  id: string;
  title?: string;
  type?: ClassItem['type'];
  image?: string;
  videoUrl?: string;
  audioUrl?: string;
  createdAt?: any;
  price?: number;
};

type TeacherLookupItem = {
  name?: string;
};

type ScheduleItem = {
  id: string;
  classId: string;
  day: string;
  time: string;
  startTime?: string;
  endTime?: string;
  teacherId?: string;
  teacherName?: string;
  className?: string;
  status?: string;
  capacity: number;
  bookedCount: number;
};

const dayMap: Record<string, string> = {
  Monday: 'Даваа',
  Tuesday: 'Мягмар',
  Wednesday: 'Лхагва',
  Thursday: 'Пүрэв',
  Friday: 'Баасан',
  Saturday: 'Бямба',
  Sunday: 'Ням',
};

const normalizeDay = (rawDay?: string) => {
  const safeDay = String(rawDay || '').trim();
  return dayMap[safeDay] || safeDay || 'Тодорхойгүй өдөр';
};

const normalizeTime = (raw: any) => {
  const start = String(raw?.startTime || '').trim();
  const end = String(raw?.endTime || '').trim();
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  return String(raw?.time || 'No time');
};

const normalizeScheduleItem = (id: string, raw: any): ScheduleItem => ({
  id,
  classId: String(raw?.classId || ''),
  day: normalizeDay(raw?.dayOfWeek),
  time: normalizeTime(raw),
  startTime: raw?.startTime,
  endTime: raw?.endTime,
  teacherId: raw?.teacherId || '',
  teacherName: raw?.teacherName || '',
  className: raw?.className || '',
  status: raw?.status || 'Active',
  capacity: Number(raw?.capacity || 0),
  bookedCount: Number(raw?.bookedCount || 0),
});

type BookingSnap = { id: string; data: Record<string, unknown> };

type ScheduleDisplayRow = {
  key: string;
  sortMs: number;
  date: Date;
  dateLabel: string;
  classTitle: string;
  time: string;
  teacherName: string;
  badge: string;
};

function monthKeyFromBookingData(b: Record<string, unknown>): string {
  const mk = String(b.monthKey || '').trim();
  if (monthKeyValid(mk)) return mk;
  const c = b.createdAt;
  if (c && typeof (c as { toDate?: () => Date }).toDate === 'function') {
    const d = (c as Timestamp).toDate();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  if (typeof c === 'string') {
    const d = new Date(c);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  }
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
}

function buildMyScheduleRows(
  bookings: BookingSnap[],
  scheduleItems: ScheduleItem[],
  classes: Record<string, ClassLookupItem>,
  teachers: Record<string, TeacherLookupItem>,
  now: Date
): ScheduleDisplayRow[] {
  const scheduleById = new Map(scheduleItems.map((s) => [s.id, s]));
  const slotsByClass = new Map<string, ScheduleItem[]>();
  scheduleItems.forEach((s) => {
    const cid = String(s.classId || '').trim();
    if (!cid) return;
    slotsByClass.set(cid, [...(slotsByClass.get(cid) || []), s]);
  });

  const rows: ScheduleDisplayRow[] = [];

  const classTitle = (classId: string, slot?: ScheduleItem) => {
    const rec = classes[classId];
    if (typeof rec?.title === 'string' && rec.title.trim()) return rec.title.trim();
    if (slot && typeof slot.className === 'string' && slot.className.trim()) return slot.className.trim();
    return 'Хичээл';
  };

  const teacherName = (slot?: ScheduleItem) => {
    const tid = String(slot?.teacherId || '').trim();
    const fromTeachers = tid ? teachers[tid]?.name : undefined;
    if (typeof fromTeachers === 'string' && fromTeachers.trim()) return fromTeachers.trim();
    if (slot && typeof slot.teacherName === 'string' && slot.teacherName.trim()) return slot.teacherName.trim();
    return 'Багш';
  };

  for (const { id: bookingId, data: b } of bookings) {
    const status = String(b?.status || '').toLowerCase();
    if (status === 'cancelled') continue;

    const scheduleId = String(b?.scheduleId || '').trim();
    const weekKey = String(b?.weekKey || '').trim();
    const classId = String(b?.classId || b?.itemId || '').trim();
    const typ = String(b?.type || '');
    const monthKeyStored = String(b?.monthKey || '').trim();

    if (scheduleId && weekKey) {
      const slot = scheduleById.get(scheduleId);
      if (!slot) continue;
      const d = sessionDateFromWeekKey(weekKey, slot.day);
      if (!d) continue;
      rows.push({
        key: `${bookingId}-${scheduleId}-${weekKey}`,
        sortMs: d.getTime(),
        date: d,
        dateLabel: formatDisplayDateMn(d),
        classTitle: classTitle(slot.classId, slot),
        time: slot.time,
        teacherName: teacherName(slot),
        badge: 'Нэг удаагийн захиалга',
      });
      continue;
    }

    if (scheduleId && !weekKey) {
      const slot = scheduleById.get(scheduleId);
      if (!slot) continue;
      const dates = upcomingDatesForWeekday(now, slot.day, 8);
      dates.forEach((d, idx) => {
        rows.push({
          key: `${bookingId}-${scheduleId}-r${idx}-${d.getTime()}`,
          sortMs: d.getTime(),
          date: d,
          dateLabel: formatDisplayDateMn(d),
          classTitle: classTitle(slot.classId, slot),
          time: slot.time,
          teacherName: teacherName(slot),
          badge: 'Давтамжит',
        });
      });
      continue;
    }

    if (classId && (typ === 'class_month' || monthKeyValid(monthKeyStored))) {
      const mk = monthKeyValid(monthKeyStored) ? monthKeyStored : monthKeyFromBookingData(b);
      const slots = slotsByClass.get(classId) || [];
      const occ = listOccurrencesInMonth(
        mk,
        slots.map((s) => ({ id: s.id, classId: s.classId, day: s.day, time: s.time }))
      );
      occ.forEach((o) => {
        const slot = scheduleById.get(o.scheduleId);
        rows.push({
          key: `${bookingId}-${o.scheduleId}-${o.date.getTime()}`,
          sortMs: o.date.getTime(),
          date: o.date,
          dateLabel: formatDisplayDateMn(o.date),
          classTitle: classTitle(classId, slot),
          time: o.time,
          teacherName: teacherName(slot),
          badge: `${mk} сарын эрх`,
        });
      });
      continue;
    }

    if (classId && typ === 'class' && !scheduleId) {
      const mk = monthKeyFromBookingData(b);
      const slots = slotsByClass.get(classId) || [];
      const occ = listOccurrencesInMonth(
        mk,
        slots.map((s) => ({ id: s.id, classId: s.classId, day: s.day, time: s.time }))
      );
      occ.forEach((o) => {
        const slot = scheduleById.get(o.scheduleId);
        rows.push({
          key: `${bookingId}-legacy-${o.scheduleId}-${o.date.getTime()}`,
          sortMs: o.date.getTime(),
          date: o.date,
          dateLabel: formatDisplayDateMn(o.date),
          classTitle: classTitle(classId, slot),
          time: o.time,
          teacherName: teacherName(slot),
          badge: `${mk} (өмнөх бүртгэл)`,
        });
      });
    }
  }

  rows.sort((a, b) => a.sortMs - b.sortMs);
  return rows;
}

export const Schedule: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [classes, setClasses] = useState<Record<string, ClassLookupItem>>({});
  const [teachers, setTeachers] = useState<Record<string, TeacherLookupItem>>({});
  const [myBookings, setMyBookings] = useState<BookingSnap[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [nowTick] = useState(() => new Date());

  useEffect(() => {
    const unsubscribeClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const lookup: Record<string, ClassLookupItem> = {};
      snapshot.docs.forEach((classDoc) => {
        const raw = classDoc.data() as Record<string, unknown>;
        lookup[classDoc.id] = {
          id: classDoc.id,
          title: typeof raw.title === 'string' ? raw.title : undefined,
          type: raw.type === 'online' || raw.type === 'audio' ? raw.type : 'offline',
          image: typeof raw.image === 'string' ? raw.image : undefined,
          videoUrl: typeof raw.videoUrl === 'string' ? raw.videoUrl : undefined,
          audioUrl: typeof raw.audioUrl === 'string' ? raw.audioUrl : undefined,
          createdAt: raw.createdAt,
          price: typeof raw.price === 'number' ? raw.price : undefined,
        };
      });
      setClasses(lookup);
    });

    const unsubscribeTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const lookup: Record<string, TeacherLookupItem> = {};
      snapshot.docs.forEach((teacherDoc) => {
        lookup[teacherDoc.id] = teacherDoc.data() as TeacherLookupItem;
      });
      setTeachers(lookup);
    });

    const scheduleQuery = query(collection(db, 'schedule'), orderBy('startTime', 'asc'));
    const unsubscribeSchedule = onSnapshot(
      scheduleQuery,
      (snapshot) => {
        const normalized = snapshot.docs.map((scheduleDoc) =>
          normalizeScheduleItem(scheduleDoc.id, scheduleDoc.data())
        );
        setSchedule(normalized);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading schedule:', error);
        setSchedule([]);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeClasses();
      unsubscribeTeachers();
      unsubscribeSchedule();
    };
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setMyBookings([]);
      return;
    }
    const myBookingsQuery = query(collection(db, 'bookings'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(myBookingsQuery, (snapshot) => {
      const list: BookingSnap[] = snapshot.docs.map((d) => ({ id: d.id, data: d.data() as Record<string, unknown> }));
      setMyBookings(list);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const displayRows = useMemo(
    () => buildMyScheduleRows(myBookings, schedule, classes, teachers, nowTick),
    [myBookings, schedule, classes, teachers, nowTick]
  );

  const groupedByDate = useMemo(() => {
    const map = new Map<string, ScheduleDisplayRow[]>();
    for (const r of displayRows) {
      const key = `${r.date.getFullYear()}-${String(r.date.getMonth() + 1).padStart(2, '0')}-${String(r.date.getDate()).padStart(2, '0')}`;
      map.set(key, [...(map.get(key) || []), r]);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [displayRows]);

  return (
    <ErrorBoundary>
      <div className="pt-32 pb-20 min-h-screen bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-5xl font-light tracking-tight mb-4">Миний хуваарь</h1>
              <p className="text-accent/60 max-w-xl mx-auto">
                Таны бүртгэлтэй хичээлүүд — огноо, цаг, багшийн мэдээлэлтэй. Сард нэг төлбөртэй хичээлийг &quot;Хичээлүүд&quot;
                хуудаснаас сонгон бүртгүүлнэ үү.
              </p>
            </div>

            {!user ? (
              <div className="rounded-3xl border border-brand-ink/10 bg-secondary/5 px-8 py-14 text-center">
                <p className="text-brand-ink/70 mb-6">Хуваарь харахын тулд нэвтэрнэ үү.</p>
                <Button asChild className="rounded-full bg-brand-ink px-8 text-white hover:bg-brand-icon">
                  <Link to="/login">Нэвтрэх</Link>
                </Button>
              </div>
            ) : loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-secondary/10 rounded-2xl" />
                ))}
              </div>
            ) : displayRows.length === 0 ? (
              <div className="rounded-3xl border border-brand-ink/10 bg-white px-8 py-14 text-center shadow-sm">
                <p className="text-brand-ink/70 mb-6">Одоогоор бүртгэлтэй хичээл алга.</p>
                <Button asChild variant="outline" className="rounded-full border-brand-ink/20">
                  <Link to="/classes">Хичээлүүд үзэх</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-12">
                {groupedByDate.map(([dateKey, items]) => (
                  <motion.div
                    key={dateKey}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <h2 className="text-2xl font-light mb-6 flex items-center gap-3 text-gray-800">
                      <CalendarIcon className="text-primary" size={24} />
                      {items[0] ? format(items[0].date, 'yyyy.MM.dd') : dateKey}
                    </h2>
                    <div className="bg-white rounded-3xl border border-accent/5 overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-secondary/5">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="py-4 px-6">Огноо</TableHead>
                            <TableHead className="py-4 px-6">Хичээл</TableHead>
                            <TableHead className="py-4 px-6">Цаг</TableHead>
                            <TableHead className="py-4 px-6">Багш</TableHead>
                            <TableHead className="py-4 px-6">Төрөл</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((row) => (
                            <TableRow key={row.key} className="border-accent/5 hover:bg-secondary/5 transition-colors">
                              <TableCell className="py-5 px-6 text-gray-800 whitespace-nowrap">{row.dateLabel}</TableCell>
                              <TableCell className="py-5 px-6 text-gray-800">
                                <div className="font-medium text-gray-800">{row.classTitle}</div>
                              </TableCell>
                              <TableCell className="py-5 px-6 text-gray-800">
                                <div className="flex items-center gap-2 text-gray-800">
                                  <Clock size={14} />
                                  {row.time}
                                </div>
                              </TableCell>
                              <TableCell className="py-5 px-6 text-gray-800">
                                <div className="flex items-center gap-2 text-gray-800">
                                  <User size={14} className="text-primary" />
                                  {row.teacherName}
                                </div>
                              </TableCell>
                              <TableCell className="py-5 px-6 text-gray-800">
                                <Badge variant="secondary" className="bg-secondary/20 text-gray-800 border-none">
                                  {row.badge}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};
