import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Mail, Calendar, CreditCard, ShieldCheck, LogOut, ClipboardCheck, CalendarClock, ClipboardList, Plus, Trash2, Receipt, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';

type RosterAttendance = 'present' | 'absent' | 'unknown';

type RosterStudent = {
  key: string;
  name: string;
  email: string;
  attendance: RosterAttendance;
  bookingIds: string[];
};

type TeacherClassSummary = {
  id: string;
  title: string;
  teacher: string;
  teacherId: string;
  duration: string;
  participantCount: number;
  /** Sum of capacity across schedule slots for this class (fallback if none). */
  capacityTotal: number;
  sessionCount: number;
  roster: RosterStudent[];
};

function attendanceFromBooking(booking: Record<string, unknown>): RosterAttendance {
  const raw = String(booking?.attendanceStatus || '').toLowerCase();
  if (raw === 'attended' || raw === 'present') return 'present';
  if (raw === 'missed' || raw === 'absent') return 'absent';
  return 'unknown';
}

function mergeAttendance(a: RosterAttendance, b: RosterAttendance): RosterAttendance {
  const order = { present: 2, absent: 1, unknown: 0 };
  return order[a] >= order[b] ? a : b;
}

function resolveDisplayName(record: Record<string, unknown>, fallbackEmail = '', fallbackName = ''): string {
  const firstName = String(record?.userFirstName || '').trim();
  const lastName = String(record?.userLastName || '').trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const directName = String(
    fullName ||
      record?.userName ||
      record?.displayName ||
      record?.name ||
      record?.studentName ||
      fallbackName ||
      ''
  ).trim();
  if (directName) return directName;

  const email = String(record?.userEmail || record?.email || fallbackEmail || '').trim();
  if (email.includes('@')) return email.split('@')[0].trim();
  if (email) return email;

  return String(record?.userId || fallbackName || 'Unknown user').trim();
}

type ScheduleRow = {
  id: string;
  classId?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  bookedCount?: number;
  capacity?: number;
};

const WEEK_DAYS = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

function dateMs(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().getTime();
  }
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

function formatUnknownDate(value: unknown): string {
  const ms = dateMs(value);
  if (ms != null) return new Date(ms).toLocaleString();
  return '—';
}

function paymentIntentLabel(pi: unknown): string {
  if (!pi || typeof pi !== 'object') return 'Төлбөр';
  const kind = String((pi as Record<string, unknown>).kind || '').toLowerCase();
  if (kind === 'subscription') return 'Гишүүнчлэл';
  if (kind === 'class_month' || kind === 'class_detail') return 'Хичээл';
  if (kind === 'schedule_slot') return 'Цаг сонголт';
  return 'Төлбөр';
}

function qpayStatusLabel(status: unknown, processed: unknown): string {
  const s = String(status || '').toLowerCase();
  if (s === 'paid' || processed === true) return 'Төлөгдсөн';
  if (s === 'failed') return 'Амжилтгүй';
  return 'Хүлээгдэж буй';
}

export const Profile: React.FC = () => {
  const { user, profile, isSubscribed, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassSummary[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleClassId, setScheduleClassId] = useState('');
  /** Firestore `schedule` doc id when editing; `null` = add new slot */
  const [scheduleRowId, setScheduleRowId] = useState<string | null>(null);
  const [scheduleStart, setScheduleStart] = useState('08:00');
  const [scheduleEnd, setScheduleEnd] = useState('09:00');
  const [scheduleRoom, setScheduleRoom] = useState('Main Hall');
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
  const [rosterClassId, setRosterClassId] = useState('');
  const [rosterOverride, setRosterOverride] = useState<Record<string, RosterAttendance>>({});
  const [rosterSavingKey, setRosterSavingKey] = useState<string>('');
  const [teacherClassDialogOpen, setTeacherClassDialogOpen] = useState(false);
  const [newClassTitle, setNewClassTitle] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const [newClassDuration, setNewClassDuration] = useState('60 мин');
  const [newClassCategory, setNewClassCategory] = useState('Yoga');
  const [newClassPrice, setNewClassPrice] = useState('');
  const [newClassImage, setNewClassImage] = useState('');
  const [newClassDay, setNewClassDay] = useState('Даваа');
  const [newClassStart, setNewClassStart] = useState('08:00');
  const [newClassEnd, setNewClassEnd] = useState('09:00');
  const [creatingClass, setCreatingClass] = useState(false);
  const [myPayments, setMyPayments] = useState<Array<Record<string, unknown> & { id: string }>>([]);
  const [myBookings, setMyBookings] = useState<Array<Record<string, unknown> & { id: string }>>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [reconcilingPaymentId, setReconcilingPaymentId] = useState<string | null>(null);

  const handleReconcilePayment = async (invoiceId: string) => {
    if (!user) return;
    setReconcilingPaymentId(invoiceId);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/qpay/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, invoiceId }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        toast.error(String(data.error ?? data.details ?? 'Алдаа'));
        return;
      }
      if (data.paid === true || data.idempotent === true) {
        toast.success('Төлбөр баталгаажлаа');
      } else {
        toast.message('QPay дээр төлбөр олдсонгүй эсвэл түр хүлээгдэж байна.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Шалгахад алдаа гарлаа');
    } finally {
      setReconcilingPaymentId(null);
    }
  };

  const resetNewClassForm = () => {
    setNewClassTitle('');
    setNewClassDescription('');
    setNewClassDuration('60 мин');
    setNewClassCategory('Yoga');
    setNewClassPrice('');
    setNewClassImage('');
    setNewClassDay('Даваа');
    setNewClassStart('08:00');
    setNewClassEnd('09:00');
  };

  const subscriptionPlanLabel = (() => {
    const plan = String(profile?.subscriptionPlan || '').trim().toLowerCase();
    if (plan === 'online-video') return 'Online Video';
    if (plan === 'online-audio') return 'Online Audio';
    if (plan === 'yearly') return 'Жилийн багц';
    return 'Сарын багц';
  })();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (!user) return;
    setPurchasesLoading(true);
    const payQ = query(collection(db, 'qpayEvents'), where('userId', '==', user.uid));
    const bookQ = query(collection(db, 'bookings'), where('userId', '==', user.uid));
    const unsubPay = onSnapshot(
      payQ,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown> & { id: string }>;
        rows.sort((a, b) => (dateMs(b.createdAt) ?? 0) - (dateMs(a.createdAt) ?? 0));
        setMyPayments(rows);
        setPurchasesLoading(false);
      },
      () => setPurchasesLoading(false)
    );
    const unsubBook = onSnapshot(bookQ, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown> & { id: string }>;
      rows.sort((a, b) => (dateMs(b.createdAt) ?? 0) - (dateMs(a.createdAt) ?? 0));
      setMyBookings(rows);
    });
    return () => {
      unsubPay();
      unsubBook();
    };
  }, [user]);

  const handleLogout = () => {
    signOut(auth);
    navigate('/');
  };

  const scheduleRowsForSelectedClass = scheduleRows
    .filter((row) => String(row.classId || '') === scheduleClassId)
    .sort((a, b) => {
      const da = WEEK_DAYS.indexOf(String(a.dayOfWeek || ''));
      const db = WEEK_DAYS.indexOf(String(b.dayOfWeek || ''));
      if (da !== db) return da - db;
      return String(a.startTime || '').localeCompare(String(b.startTime || ''));
    });

  useEffect(() => {
    if (!user || !isTeacher) {
      setTeacherClasses([]);
      return;
    }

    setTeacherLoading(true);

    let teachers: any[] = [];
    let classes: any[] = [];
    let schedules: any[] = [];
    let bookings: any[] = [];
    let bookingUnsubs: Array<() => void> = [];
    let bookingSubscriptionKey = '';
    const bookingsById = new Map<string, any>();

    const chunk = <T,>(items: T[], size: number) => {
      const out: T[][] = [];
      for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
      return out;
    };

    const clearBookingListeners = () => {
      bookingUnsubs.forEach((unsub) => unsub());
      bookingUnsubs = [];
      bookingSubscriptionKey = '';
      bookingsById.clear();
      bookings = [];
    };

    const upsertBookingSnapshot = (snapshot: any) => {
      snapshot.docChanges().forEach((change: any) => {
        const id = change.doc.id;
        if (change.type === 'removed') {
          bookingsById.delete(id);
        } else {
          bookingsById.set(id, { id, ...change.doc.data() });
        }
      });
      bookings = Array.from(bookingsById.values());
      recompute();
    };

    const ensureBookingListeners = (classIds: string[], scheduleIds: string[]) => {
      const normalizedClassIds = Array.from(new Set(classIds)).filter(Boolean).sort();
      const normalizedScheduleIds = Array.from(new Set(scheduleIds)).filter(Boolean).sort();
      const nextKey = `${normalizedClassIds.join(',')}|${normalizedScheduleIds.join(',')}`;
      if (nextKey === bookingSubscriptionKey) return;

      clearBookingListeners();
      bookingSubscriptionKey = nextKey;

      if (normalizedClassIds.length === 0 && normalizedScheduleIds.length === 0) return;

      const bookingsRef = collection(db, 'bookings');
      const classBatches = chunk(normalizedClassIds, 10);
      const scheduleBatches = chunk(normalizedScheduleIds, 10);

      classBatches.forEach((batch) => {
        bookingUnsubs.push(
          onSnapshot(query(bookingsRef, where('itemId', 'in', batch)), upsertBookingSnapshot)
        );
        bookingUnsubs.push(
          onSnapshot(query(bookingsRef, where('classId', 'in', batch)), upsertBookingSnapshot)
        );
      });

      scheduleBatches.forEach((batch) => {
        bookingUnsubs.push(
          onSnapshot(query(bookingsRef, where('scheduleId', 'in', batch)), upsertBookingSnapshot)
        );
      });
    };

    const recompute = () => {
      const uid = String(user?.uid || '').trim();
      const emailCandidates = new Set(
        [user?.email, profile?.email]
          .map((e) => String(e || '').trim().toLowerCase())
          .filter(Boolean)
      );

      /** Firestore `teachers/{id}` doc ids explicitly tied to this signed-in account */
      const myTeacherDocIds = new Set<string>();
      for (const teacher of teachers) {
        const docId = String(teacher?.id || '').trim();
        if (!docId) continue;
        const teacherEmail = String(teacher?.email || '').trim().toLowerCase();
        if (teacherEmail && emailCandidates.has(teacherEmail)) {
          myTeacherDocIds.add(docId);
        }
        if (docId === uid) {
          myTeacherDocIds.add(docId);
        }
        const raw = teacher as Record<string, unknown>;
        const linkedUid = String(raw?.userId || raw?.accountId || raw?.authUid || '').trim();
        if (linkedUid && linkedUid === uid) {
          myTeacherDocIds.add(docId);
        }
      }

      const teacherOwnedClasses = classes.filter((classItem) => {
        const classTeacherId = String(classItem?.teacherId || '').trim();
        if (!classTeacherId) return false;
        return classTeacherId === uid || myTeacherDocIds.has(classTeacherId);
      });

      const teacherClassIds = teacherOwnedClasses.map((cls) => String(cls?.id || '')).filter(Boolean);
      const teacherScheduleIds = schedules
        .filter((slot) => teacherClassIds.includes(String(slot?.classId || '')))
        .map((slot) => String(slot?.id || ''))
        .filter(Boolean);
      ensureBookingListeners(teacherClassIds, teacherScheduleIds);

      const nextTeacherClasses: TeacherClassSummary[] = teacherOwnedClasses.map((classItem) => {
        const classId = String(classItem?.id || '');
        const classSchedules = schedules.filter((slot) => String(slot?.classId || '') === classId);
        const scheduleIds = new Set(classSchedules.map((slot) => String(slot?.id || '')));

        const classBookings = bookings.filter((booking) => {
          const bookingType = String(booking?.type || '').toLowerCase();
          const bookingStatus = String(booking?.status || '').toLowerCase();
          if (bookingType && bookingType !== 'class') return false;
          if (bookingStatus === 'cancelled') return false;

          return (
            String(booking?.itemId || '') === classId ||
            String(booking?.classId || '') === classId ||
            scheduleIds.has(String(booking?.scheduleId || ''))
          );
        });

        const participantKeys = new Set<string>();
        classBookings.forEach((booking) => {
          const key =
            String(booking?.userId || booking?.userEmail || booking?.id || '').trim();
          if (key) participantKeys.add(key);
        });

        const rosterByKey = new Map<
          string,
          { name: string; email: string; attendance: RosterAttendance; bookingIds: string[] }
        >();
        classBookings.forEach((booking) => {
          const b = booking as Record<string, unknown>;
          const key = String(b?.userId || b?.userEmail || b?.id || '').trim();
          if (!key) return;
          const bookingId = String(b?.id || '').trim();
          const att = attendanceFromBooking(b);
          const email = String(b?.userEmail || b?.email || '').trim();
          const name = resolveDisplayName(b, email);
          const existing = rosterByKey.get(key);
          if (!existing) {
            rosterByKey.set(key, {
              name,
              email,
              attendance: att,
              bookingIds: bookingId ? [bookingId] : [],
            });
          } else {
            rosterByKey.set(key, {
              name: name || existing.name,
              email: email || existing.email,
              attendance: mergeAttendance(existing.attendance, att),
              bookingIds: bookingId
                ? Array.from(new Set([...existing.bookingIds, bookingId]))
                : existing.bookingIds,
            });
          }
        });
        const roster: RosterStudent[] = Array.from(rosterByKey.entries())
          .map(([k, v]) => ({ key: k, ...v }))
          .sort((a, b) => a.name.localeCompare(b.name, 'mn'));

        const capacityTotal =
          classSchedules.length > 0
            ? classSchedules.reduce((sum, slot) => sum + (Number(slot?.capacity) || 20), 0)
            : 20;

        return {
          id: classId,
          title: String(classItem?.title || 'Untitled class'),
          teacher: String(classItem?.teacher || profile?.displayName || user?.displayName || 'Багш'),
          teacherId: String(classItem?.teacherId || ''),
          duration: String(classItem?.duration || '60 мин'),
          participantCount: participantKeys.size,
          capacityTotal,
          sessionCount: classSchedules.length,
          roster,
        };
      });

      setTeacherClasses(nextTeacherClasses);
      setTeacherLoading(false);
    };

    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      teachers = snapshot.docs.map((teacherDoc) => ({ id: teacherDoc.id, ...teacherDoc.data() }));
      recompute();
    });
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      classes = snapshot.docs.map((classDoc) => ({ id: classDoc.id, ...classDoc.data() }));
      recompute();
    });
    const unsubSchedules = onSnapshot(collection(db, 'schedule'), (snapshot) => {
      schedules = snapshot.docs.map((scheduleDoc) => ({ id: scheduleDoc.id, ...scheduleDoc.data() }));
      setScheduleRows(
        snapshot.docs.map((scheduleDoc) => ({
          id: scheduleDoc.id,
          ...(scheduleDoc.data() as Record<string, unknown>),
        })) as ScheduleRow[]
      );
      recompute();
    });
    return () => {
      unsubTeachers();
      unsubClasses();
      unsubSchedules();
      clearBookingListeners();
    };
  }, [isTeacher, profile?.displayName, profile?.email, user]);

  useEffect(() => {
    if (!scheduleDialogOpen || !scheduleClassId) return;
    if (scheduleRowId) {
      const slot = scheduleRows.find(
        (row) => row.id === scheduleRowId && String(row.classId || '') === scheduleClassId
      );
      if (slot) {
        setScheduleStart(String(slot.startTime || '08:00'));
        setScheduleEnd(String(slot.endTime || '09:00'));
        setScheduleRoom(String(slot.room || 'Main Hall'));
      }
    } else {
      setScheduleStart('08:00');
      setScheduleEnd('09:00');
      setScheduleRoom('Main Hall');
    }
  }, [scheduleDialogOpen, scheduleClassId, scheduleRowId, scheduleRows]);

  const openScheduleDialog = (presetClassId: string) => {
    const rows = scheduleRows.filter((row) => String(row.classId || '') === presetClassId);
    setScheduleClassId(presetClassId);
    setScheduleRowId(rows[0]?.id ?? null);
    setScheduleDialogOpen(true);
  };

  const openRosterDialog = (classId: string) => {
    setRosterClassId(classId);
    setRosterOverride({});
    setRosterDialogOpen(true);
  };

  const rosterClass = teacherClasses.find((c) => c.id === rosterClassId);

  const setStudentAttendance = async (student: RosterStudent, next: RosterAttendance) => {
    if (!user) return;
    if (!student.bookingIds || student.bookingIds.length === 0) {
      toast.error('Бүртгэлийн бичлэг олдсонгүй');
      return;
    }
    if (rosterSavingKey) return;

    const previous = rosterOverride[student.key] ?? student.attendance;
    setRosterSavingKey(student.key);
    setRosterOverride((current) => ({ ...current, [student.key]: next }));

    try {
      const attendanceStatus = next === 'present' ? 'attended' : next === 'absent' ? 'missed' : 'unknown';
      await Promise.all(
        student.bookingIds.map((bookingId) =>
          updateDoc(doc(db, 'bookings', bookingId), {
            attendanceStatus,
            attendanceMarkedAt: Timestamp.now(),
          })
        )
      );
      toast.success('Ирц хадгалагдлаа');
    } catch (err) {
      setRosterOverride((current) => ({ ...current, [student.key]: previous }));
      toast.error('Ирц хадгалахад алдаа гарлаа');
    } finally {
      setRosterSavingKey('');
    }
  };

  const handleSaveSchedule = async () => {
    if (!user || scheduleSaving) return;
    const cls = teacherClasses.find((item) => item.id === scheduleClassId);
    if (!cls || !scheduleClassId || !scheduleStart) {
      toast.error('Хичээл болон цаг заавал сонгоно уу');
      return;
    }
    setScheduleSaving(true);
    try {
      const teacherId = cls.teacherId || user.uid;
      const existingSlot = scheduleRowId
        ? scheduleRows.find((row) => row.id === scheduleRowId)
        : null;
      const dayOfWeek = String(existingSlot?.dayOfWeek || 'Даваа');
      const payload = {
        classId: scheduleClassId,
        className: cls.title,
        teacherName: cls.teacher,
        teacherId,
        dayOfWeek,
        startTime: scheduleStart,
        endTime: scheduleEnd,
        room: scheduleRoom,
        updatedAt: Timestamp.now(),
      };
      if (scheduleRowId) {
        await updateDoc(doc(db, 'schedule', scheduleRowId), payload);
      } else {
        await addDoc(collection(db, 'schedule'), {
          ...payload,
          capacity: 20,
          bookedCount: 0,
          createdAt: Timestamp.now(),
        });
      }
      toast.success('Хуваарь хадгалагдлаа');
      setScheduleDialogOpen(false);
    } catch (error) {
      console.error('Schedule save failed:', error);
      toast.error('Хуваарь хадгалахад алдаа гарлаа');
    } finally {
      setScheduleSaving(false);
    }
  };

  const handleCreateTeacherClass = async () => {
    if (!user) return;
    const title = newClassTitle.trim();
    if (!title) {
      toast.error('Хичээлийн нэр заавал');
      return;
    }
    setCreatingClass(true);
    try {
      const teacherName = String(profile?.displayName || user.displayName || 'Багш').trim();
      const priceNum = Math.max(0, Number(newClassPrice) || 0);
      const image =
        newClassImage.trim() ||
        'https://images.unsplash.com/photo-1544367567-0f2fcb51e627?auto=format&fit=crop&w=1200&q=80';
      const classPayload = {
        title,
        description: newClassDescription.trim() || 'Тайлбар удахгүй нэмэгдэнэ.',
        duration: newClassDuration.trim() || '60 мин',
        teacherId: user.uid,
        teacher: teacherName,
        type: 'offline' as const,
        category: newClassCategory,
        image,
        price: priceNum,
        benefits: ['Сунгалт, амьсгал, төвлөрөл сайжруулна'],
        scheduleSlots: [{ dayOfWeek: newClassDay, startTime: newClassStart, endTime: newClassEnd }],
        videoUrl: '',
        audioUrl: '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const classRef = await addDoc(collection(db, 'classes'), classPayload);
      await addDoc(collection(db, 'schedule'), {
        classId: classRef.id,
        className: title,
        teacherName,
        dayOfWeek: newClassDay,
        startTime: newClassStart,
        endTime: newClassEnd,
        capacity: 20,
        bookedCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      toast.success('Хичээл нэмэгдлээ');
      setTeacherClassDialogOpen(false);
      resetNewClassForm();
    } catch (error) {
      console.error('Create teacher class failed:', error);
      toast.error('Хичээл үүсгэхэд алдаа гарлаа');
    } finally {
      setCreatingClass(false);
    }
  };

  const handleDeleteTeacherClass = async (classId: string) => {
    if (!user) return;
    if (!teacherClasses.some((c) => c.id === classId)) return;
    if (!window.confirm('Энэ хичээлийг устгах уу? Холбогдох хуваарийн бичлэгүүд хамт устгагдана.')) return;
    try {
      const scheduleQuery = query(collection(db, 'schedule'), where('classId', '==', classId));
      const scheduleSnap = await getDocs(scheduleQuery);
      const batch = writeBatch(db);
      scheduleSnap.docs.forEach((d) => batch.delete(d.ref));
      batch.delete(doc(db, 'classes', classId));
      await batch.commit();
      toast.success('Хичээл устгагдлаа');
      if (scheduleClassId === classId) setScheduleDialogOpen(false);
      if (rosterClassId === classId) setRosterDialogOpen(false);
    } catch (error) {
      console.error('Delete teacher class failed:', error);
      toast.error('Устгахад алдаа гарлаа');
    }
  };

  return (
    <div className="pt-32 pb-32 min-h-screen bg-gray-50/30">
      <div className="mx-auto w-full max-w-4xl px-3 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl shadow-brand-ink/5 border border-brand-ink/5 overflow-hidden sm:rounded-[3rem]"
        >
            {/* Profile Header */}
            <div className="bg-brand-ink p-6 text-white relative overflow-hidden sm:p-10 md:p-12">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-icon/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="relative h-24 w-24 shrink-0 rounded-full border-4 border-white/10 overflow-hidden bg-secondary/25">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Профайл зураг'}
                      className="h-full w-full object-cover"
                      loading="eager"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User size={40} className="text-white/40" />
                    </div>
                  )}
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-3xl font-serif mb-2">{user.displayName || 'Хэрэглэгч'}</h1>
                  <p className="text-white/60 font-light flex items-center justify-center md:justify-start gap-2">
                    <Mail size={14} />
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Content */}
            <div className="p-4 sm:p-8 md:p-12">
              <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
                {/* Subscription Info */}
                <div className="space-y-8">
                  <h3 className="text-xl font-serif text-brand-ink flex items-center gap-3">
                    <CreditCard className="text-brand-icon" size={20} />
                    Гишүүнчлэлийн төлөв
                  </h3>
                  
                  <div className={`rounded-[2rem] border p-5 transition-all duration-500 sm:p-8 ${
                    isSubscribed 
                      ? 'bg-green-50/50 border-green-100' 
                      : 'bg-gray-50 border-brand-ink/5'
                  }`}>
                    <div className="flex items-center justify-between mb-6">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                        isSubscribed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {isSubscribed ? 'Идэвхтэй' : 'Идэвхгүй'}
                      </span>
                      {isSubscribed && (
                        <span className="text-xs text-brand-ink/40 font-light">
                          {subscriptionPlanLabel}
                        </span>
                      )}
                    </div>
                    
                    {isSubscribed ? (
                      <div className="space-y-4">
                        <p className="text-sm text-brand-ink/60 font-light leading-relaxed">
                          Таны гишүүнчлэл {new Date(profile?.subscriptionEndDate).toLocaleDateString()} хүртэл хүчинтэй байна.
                        </p>
                        <Link to="/online">
                          <Button variant="link" className="p-0 h-auto text-brand-icon hover:text-brand-icon/80 text-xs font-bold uppercase tracking-widest">
                            Хичээл үзэх
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <p className="text-sm text-brand-ink/60 font-light leading-relaxed">
                          Та одоогоор гишүүнчлэлгүй байна. Онлайн сангийн хичээлүүдийг үзэхийн тулд гишүүн болоорой.
                        </p>
                        <Link to="/pricing">
                          <Button className="w-full bg-brand-ink text-white hover:bg-brand-icon rounded-full py-6 text-[10px] font-black tracking-widest uppercase transition-all duration-500">
                            Гишүүн болох
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Details */}
                <div className="space-y-8">
                  <h3 className="text-xl font-serif text-brand-ink flex items-center gap-3">
                    <ShieldCheck className="text-brand-icon" size={20} />
                    Бүртгэлийн мэдээлэл
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between py-4 border-b border-brand-ink/5">
                      <div className="flex items-center gap-3 text-brand-ink/40">
                        <Calendar size={16} />
                        <span className="text-sm font-light">Бүртгүүлсэн огноо</span>
                      </div>
                      <span className="text-sm text-brand-ink font-medium">
                        {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Тодорхойгүй'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-brand-ink/5">
                      <div className="flex items-center gap-3 text-brand-ink/40">
                        <User size={16} />
                        <span className="text-sm font-light">Хэрэглэгчийн төрөл</span>
                      </div>
                      <span className="text-sm text-brand-ink font-medium capitalize">
                        {profile?.role || 'Хэрэглэгч'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-8">
                    <Button 
                      onClick={handleLogout}
                      variant="outline" 
                      className="w-full rounded-full py-6 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-500 text-[10px] font-black tracking-widest uppercase"
                    >
                      <LogOut size={16} className="mr-2" />
                      Системээс гарах
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mt-12 border-t border-brand-ink/10 pt-12">
                <h3 className="mb-6 flex items-center gap-3 text-xl font-serif text-brand-ink">
                  <Receipt className="text-brand-icon" size={20} />
                  Миний худалдан авалт
                </h3>
                {purchasesLoading ? (
                  <p className="text-sm text-brand-ink/50">Уншиж байна...</p>
                ) : myPayments.length === 0 && myBookings.length === 0 ? (
                  <p className="text-sm text-brand-ink/60">
                    Одоогоор бүртгэлгүй. Хичээл эсвэл гишүүнчлэл худалдан авсны дараа энд харагдана.
                  </p>
                ) : (
                  <div className="space-y-8">
                    {myPayments.length > 0 ? (
                      <div>
                        <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-brand-ink/40">Төлбөрийн түүх</h4>
                        <ul className="divide-y divide-brand-ink/10 rounded-2xl border border-brand-ink/10 bg-gray-50/50">
                          {myPayments.map((row) => {
                            const meta = row.metadata as Record<string, unknown> | undefined;
                            const desc = String(meta?.description || '').trim();
                            const pi = row.paymentIntent;
                            const amount = Number(row.amount ?? 0);
                            const st = qpayStatusLabel(row.status, row.processed);
                            const invoiceKey = String(row.invoiceId ?? row.id);
                            const showReconcile =
                              String(row.status || '').toLowerCase() !== 'paid' && row.processed !== true;
                            return (
                              <li key={row.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-medium text-brand-ink">
                                    {paymentIntentLabel(pi)}
                                    {desc ? ` — ${desc}` : ''}
                                  </p>
                                  <p className="text-xs text-brand-ink/45">{formatUnknownDate(row.createdAt)}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="text-sm font-semibold text-brand-ink">{amount.toLocaleString()} ₮</span>
                                  <span
                                    className={`rounded-full px-3 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                                      st === 'Төлөгдсөн'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : st === 'Амжилтгүй'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-amber-100 text-amber-900'
                                    }`}
                                  >
                                    {st}
                                  </span>
                                  {showReconcile ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 rounded-full text-[10px] font-black uppercase tracking-wider"
                                      disabled={reconcilingPaymentId === invoiceKey}
                                      onClick={() => void handleReconcilePayment(invoiceKey)}
                                    >
                                      {reconcilingPaymentId === invoiceKey ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        'Төлбөр шалгах'
                                      )}
                                    </Button>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}

                    {myBookings.length > 0 ? (
                      <div>
                        <h4 className="mb-3 text-xs font-black uppercase tracking-widest text-brand-ink/40">Бүртгэл / захиалга</h4>
                        <ul className="divide-y divide-brand-ink/10 rounded-2xl border border-brand-ink/10 bg-gray-50/50">
                          {myBookings.map((b) => {
                            const classId = String(b.classId || b.itemId || '').trim();
                            const bookingStatus = String(b.status || '').toLowerCase();
                            const typeRaw = String(b.type || '').toLowerCase();
                            const typeLabel =
                              typeRaw === 'class_month' ? 'Сарын хичээл' : typeRaw === 'class' ? 'Хуваарь' : 'Бүртгэл';
                            return (
                              <li key={b.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-medium text-brand-ink">{typeLabel}</p>
                                  <p className="text-xs text-brand-ink/45">
                                    {formatUnknownDate(b.createdAt)}
                                    {String(b.monthKey || '').trim() ? ` · ${b.monthKey}` : ''}
                                  </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className="rounded-full bg-brand-ink/5 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-ink/70">
                                    {bookingStatus === 'confirmed' ? 'Баталгаажсан' : bookingStatus || '—'}
                                  </span>
                                  {classId ? (
                                    <Link
                                      to={`/classes/${classId}`}
                                      className="text-xs font-bold uppercase tracking-wider text-brand-icon hover:underline"
                                    >
                                      Хичээл рүү
                                    </Link>
                                  ) : null}
                                  <Link
                                    to="/schedule"
                                    className="text-xs font-bold uppercase tracking-wider text-brand-ink/50 hover:text-brand-ink"
                                  >
                                    Хуваарь
                                  </Link>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="mt-12 border-t border-brand-ink/10 pt-12">
                {isTeacher && (
                  <div className="mb-12 rounded-2xl border border-brand-ink/10 p-4 sm:rounded-[2rem] sm:p-8">
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="flex items-center gap-3 text-xl font-serif text-brand-ink">
                        <ClipboardCheck className="text-brand-icon" size={20} />
                        Миний бүртгэл
                      </h3>
                      {!teacherLoading ? (
                        <Button
                          type="button"
                          className="shrink-0 rounded-full bg-brand-ink px-5 text-white hover:bg-brand-icon"
                          onClick={() => {
                            resetNewClassForm();
                            setTeacherClassDialogOpen(true);
                          }}
                        >
                          <Plus size={16} className="mr-2" />
                          Шинэ хичээл нэмэх
                        </Button>
                      ) : null}
                    </div>

                    <Dialog open={teacherClassDialogOpen} onOpenChange={setTeacherClassDialogOpen}>
                      <DialogContent className="sm:max-w-lg rounded-[2rem] p-6 sm:p-8" showCloseButton>
                        <DialogHeader>
                          <DialogTitle className="font-serif text-2xl text-brand-ink">Шинэ хичээл</DialogTitle>
                          <DialogDescription className="text-brand-ink/60">
                            Үүссэн хичээл «Хичээлүүд» болон тухайн хичээлийн дэлгэрэнгүй хуудсанд шууд харагдана.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto pr-1 pt-2">
                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Гарчиг</label>
                            <Input
                              value={newClassTitle}
                              onChange={(e) => setNewClassTitle(e.target.value)}
                              placeholder="Жишээ: Өглөөний Vinyasa"
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Тайлбар</label>
                            <Textarea
                              value={newClassDescription}
                              onChange={(e) => setNewClassDescription(e.target.value)}
                              placeholder="Хичээлийн товч агуулга..."
                              className="min-h-[88px] rounded-xl"
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Хугацаа</label>
                              <Input
                                value={newClassDuration}
                                onChange={(e) => setNewClassDuration(e.target.value)}
                                placeholder="60 мин"
                                className="rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Төрөл</label>
                              <select
                                value={newClassCategory}
                                onChange={(e) => setNewClassCategory(e.target.value)}
                                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
                              >
                                <option value="Yoga">Yoga</option>
                                <option value="Meditation">Meditation</option>
                                <option value="Hatha">Hatha</option>
                              </select>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Үнэ (₮)</label>
                              <Input
                                type="number"
                                min={0}
                                value={newClassPrice}
                                onChange={(e) => setNewClassPrice(e.target.value)}
                                placeholder="0"
                                className="rounded-xl"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Зураг URL</label>
                              <Input
                                value={newClassImage}
                                onChange={(e) => setNewClassImage(e.target.value)}
                                placeholder="Хоосон бол өгөгдмөл зураг"
                                className="rounded-xl"
                              />
                            </div>
                          </div>
                          <div className="rounded-xl border border-brand-ink/10 bg-secondary/20 p-4">
                            <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/50">
                              Эхний хуваарь
                            </p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-brand-ink/40">Өдөр</span>
                                <select
                                  value={newClassDay}
                                  onChange={(e) => setNewClassDay(e.target.value)}
                                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-brand-ink"
                                >
                                  {WEEK_DAYS.map((d) => (
                                    <option key={d} value={d}>
                                      {d}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-brand-ink/40">Эхлэх</span>
                                <Input
                                  type="time"
                                  value={newClassStart}
                                  onChange={(e) => setNewClassStart(e.target.value)}
                                  className="rounded-xl"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase text-brand-ink/40">Дуусах</span>
                                <Input
                                  type="time"
                                  value={newClassEnd}
                                  onChange={(e) => setNewClassEnd(e.target.value)}
                                  className="rounded-xl"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              className="rounded-full"
                              onClick={() => setTeacherClassDialogOpen(false)}
                              disabled={creatingClass}
                            >
                              Буцах
                            </Button>
                            <Button
                              type="button"
                              className="rounded-full bg-brand-ink text-white"
                              onClick={() => void handleCreateTeacherClass()}
                              disabled={creatingClass}
                            >
                              {creatingClass ? 'Үүсгэж байна...' : 'Үүсгэх'}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {teacherLoading ? (
                      <p className="text-sm text-brand-ink/50">Хичээлийн мэдээлэл ачаалж байна...</p>
                    ) : (
                      <>
                        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                          <DialogContent className="sm:max-w-md rounded-[2rem] p-6 sm:p-8" showCloseButton>
                            <DialogHeader>
                              <DialogTitle className="font-serif text-2xl text-brand-ink">Хуваарь засах</DialogTitle>
                              <DialogDescription className="text-brand-ink/60">
                                Хичээл сонгоод цаг, өрөөг тохируулна уу. Шинэ цаг нэмэх бол «Шинэ хуваарь нэмэх» дарна уу.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                              <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Хичээл</label>
                                <select
                                  value={scheduleClassId}
                                  onChange={(e) => {
                                    const nextClassId = e.target.value;
                                    const rows = scheduleRows.filter(
                                      (row) => String(row.classId || '') === nextClassId
                                    );
                                    setScheduleClassId(nextClassId);
                                    setScheduleRowId(rows[0]?.id ?? null);
                                  }}
                                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
                                >
                                  {teacherClasses.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">
                                  Хуваарь
                                </label>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setScheduleRowId(null)}
                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                                      scheduleRowId === null
                                        ? 'border-brand-icon bg-brand-icon text-white'
                                        : 'border-brand-ink/10 bg-white text-brand-ink/70 hover:border-brand-icon/40'
                                    }`}
                                  >
                                    <Plus size={14} />
                                    Шинэ хуваарь нэмэх
                                  </button>
                                  {scheduleRowsForSelectedClass.map((row) => {
                                    const active = scheduleRowId === row.id;
                                    const label = [row.startTime, row.endTime].filter(Boolean).join('–');
                                    return (
                                      <button
                                        key={row.id}
                                        type="button"
                                        onClick={() => setScheduleRowId(row.id)}
                                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                                          active
                                            ? 'border-brand-icon bg-brand-icon text-white'
                                            : 'border-brand-ink/10 bg-white text-brand-ink/70 hover:border-brand-icon/40'
                                        }`}
                                      >
                                        {label || 'Цаг'} {row.room ? `· ${row.room}` : ''}
                                      </button>
                                    );
                                  })}
                                </div>
                                {scheduleRowId === null && scheduleRowsForSelectedClass.length === 0 ? (
                                  <p className="text-xs text-brand-ink/45">
                                    Эхний хуваариа доорх цаг, өрөөгөөр үүсгэнэ үү.
                                  </p>
                                ) : null}
                              </div>
                              <div className="rounded-xl border border-brand-ink/10 bg-secondary/20 p-4">
                                <p className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/50">
                                  Одоогийн цаг
                                </p>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-brand-ink/40">Эхлэх</span>
                                    <Input
                                      type="time"
                                      value={scheduleStart}
                                      onChange={(e) => setScheduleStart(e.target.value)}
                                      className="rounded-xl"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[10px] font-bold uppercase text-brand-ink/40">Дуусах</span>
                                    <Input
                                      type="time"
                                      value={scheduleEnd}
                                      onChange={(e) => setScheduleEnd(e.target.value)}
                                      className="rounded-xl"
                                    />
                                  </div>
                                </div>
                                <div className="mt-3 space-y-1">
                                  <span className="text-[10px] font-bold uppercase text-brand-ink/40">Өрөө / заал</span>
                                  <Input
                                    value={scheduleRoom}
                                    onChange={(e) => setScheduleRoom(e.target.value)}
                                    className="rounded-xl"
                                    placeholder="Main Hall"
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-full"
                                  onClick={() => setScheduleDialogOpen(false)}
                                  disabled={scheduleSaving}
                                >
                                  Буцах
                                </Button>
                                <Button
                                  type="button"
                                  className="rounded-full bg-brand-ink text-white"
                                  onClick={() => void handleSaveSchedule()}
                                  disabled={scheduleSaving}
                                >
                                  {scheduleSaving ? 'Хадгалж байна...' : 'Хадгалах'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={rosterDialogOpen} onOpenChange={setRosterDialogOpen}>
                          <DialogContent className="sm:max-w-lg rounded-[2rem] p-6 sm:p-8" showCloseButton>
                            <DialogHeader>
                              <DialogTitle className="font-serif text-2xl text-brand-ink">
                                {rosterClass?.title ?? 'Ирц'}
                              </DialogTitle>
                              <DialogDescription className="text-brand-ink/60">
                                Бүртгэлтэй суралцагчид болон ирцийн төлөв.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[min(60vh,28rem)] space-y-2 overflow-y-auto pr-1 pt-2">
                              {rosterClass && rosterClass.roster.length === 0 ? (
                                <p className="text-sm text-brand-ink/50">
                                  Энэ хичээлд суралцагчийн бүртгэл байхгүй.
                                </p>
                              ) : (
                                rosterClass?.roster.map((student) => (
                                  (() => {
                                    const effectiveAttendance =
                                      rosterOverride[student.key] ?? student.attendance;
                                    const saving = rosterSavingKey === student.key;
                                    return (
                                  <div
                                    key={student.key}
                                    className="flex flex-col gap-1 rounded-xl border border-brand-ink/10 bg-secondary/15 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div className="min-w-0">
                                      <p className="font-medium text-brand-ink">{student.name}</p>
                                      {student.email ? (
                                        <p className="truncate text-xs text-brand-ink/45">{student.email}</p>
                                      ) : null}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 pt-2 sm:justify-end sm:pt-0">
                                      <Button
                                        type="button"
                                        variant={effectiveAttendance === 'present' ? 'default' : 'outline'}
                                        size="sm"
                                        className={
                                          effectiveAttendance === 'present'
                                            ? 'rounded-full bg-emerald-600 text-white hover:bg-emerald-700'
                                            : 'rounded-full'
                                        }
                                        disabled={saving}
                                        onClick={() => void setStudentAttendance(student, 'present')}
                                      >
                                        Ирсэн
                                      </Button>
                                      <Button
                                        type="button"
                                        variant={effectiveAttendance === 'absent' ? 'default' : 'outline'}
                                        size="sm"
                                        className={
                                          effectiveAttendance === 'absent'
                                            ? 'rounded-full bg-red-600 text-white hover:bg-red-700'
                                            : 'rounded-full'
                                        }
                                        disabled={saving}
                                        onClick={() => void setStudentAttendance(student, 'absent')}
                                      >
                                        Ирээгүй
                                      </Button>
                                    </div>
                                  </div>
                                    );
                                  })()
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {teacherClasses.length > 0 ? (
                          <div className="mt-4 space-y-4">
                            {teacherClasses.map((classItem) => (
                          <div
                            key={classItem.id}
                            className="flex flex-col gap-4 rounded-2xl border border-brand-ink/5 p-5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <button
                              type="button"
                              className="min-w-0 flex-1 rounded-xl p-1 text-left outline-none ring-offset-background transition-colors hover:bg-brand-ink/[0.03] focus-visible:ring-2 focus-visible:ring-brand-icon/25 -m-1"
                              onClick={() => openRosterDialog(classItem.id)}
                            >
                              <p className="text-lg font-medium text-brand-ink">{classItem.title}</p>
                              <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/40">
                                {classItem.duration} • {classItem.sessionCount} хуваарь
                              </p>
                            </button>
                            <div className="flex w-full shrink-0 flex-row flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:w-auto sm:gap-x-5">
                              <span className="text-sm tabular-nums tracking-tight text-brand-ink/55">
                                {classItem.participantCount}/{classItem.capacityTotal}
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full px-4 text-xs font-semibold"
                                  onClick={() => openRosterDialog(classItem.id)}
                                >
                                  <ClipboardList size={14} className="mr-2" />
                                  Ирц
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="rounded-full px-4 text-xs font-semibold whitespace-nowrap"
                                  onClick={() => openScheduleDialog(classItem.id)}
                                >
                                  <CalendarClock size={14} className="mr-2" />
                                  Хуваарь засах
                                </Button>
                                <Button type="button" variant="outline" size="sm" asChild className="rounded-full px-4 text-xs font-semibold">
                                  <Link to={`/classes/${classItem.id}`}>Дэлгэрэнгүй</Link>
                                </Button>
                                {user?.uid && classItem.teacherId === user.uid ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full border-red-200 px-4 text-xs font-semibold text-red-600 hover:bg-red-50"
                                    onClick={() => void handleDeleteTeacherClass(classItem.id)}
                                  >
                                    <Trash2 size={14} className="mr-2" />
                                    Устгах
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-2xl border border-dashed border-brand-ink/15 p-6 text-center text-sm text-brand-ink/50">
                            Жагсаалт хоосон. «Шинэ хичээл нэмэх» товчоор өөрийн хичээлээ үүсгэнэ үү. Админаар оноогдсон хичээлүүд энд бас харагдана.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}

              </div>
            </div>
          </motion.div>
      </div>
    </div>
  );
};
