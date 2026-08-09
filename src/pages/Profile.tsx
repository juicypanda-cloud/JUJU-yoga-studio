import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Plus, CalendarClock, ClipboardList, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { Navigate, useNavigate } from 'react-router-dom';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { toast } from 'sonner';

import { ProfileOverview } from '../components/profile/ProfileOverview';
import { AccountSettings } from '../components/profile/AccountSettings';
import { BookingsList } from '../components/profile/BookingsList';
import { TeacherSchedule, TeacherClassSummary, ScheduleRow, RosterStudent, RosterAttendance } from '../components/profile/TeacherSchedule';

const WEEK_DAYS = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

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

export const Profile: React.FC = () => {
  const { user, profile, isSubscribed, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassSummary[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleClassId, setScheduleClassId] = useState('');
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
          const key = String(booking?.userId || booking?.userEmail || booking?.id || '').trim();
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
      toast.error('Устгахад алдаа гарлаа');
    }
  };

  const rosterClass = teacherClasses.find((c) => c.id === rosterClassId);

  return (
    <div className="pt-32 pb-32 min-h-screen bg-gray-50/30">
      <div className="mx-auto w-full max-w-4xl px-3 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-2xl shadow-brand-ink/5 border border-brand-ink/5 overflow-hidden sm:rounded-[3rem]"
        >
          {/* Profile Overview Header */}
          <ProfileOverview user={user} profile={profile} />

          {/* Profile Body */}
          <div className="p-4 sm:p-8 md:p-12">
            {/* Account & Subscription Settings */}
            <AccountSettings profile={profile} isSubscribed={isSubscribed} onLogout={handleLogout} />

            {/* User Bookings & Payment History */}
            <BookingsList
              myPayments={myPayments}
              myBookings={myBookings}
              purchasesLoading={purchasesLoading}
              reconcilingPaymentId={reconcilingPaymentId}
              onReconcilePayment={handleReconcilePayment}
            />

            {/* Teacher Schedule & Roster (if applicable) */}
            {isTeacher && (
              <TeacherSchedule
                teacherClasses={teacherClasses}
                teacherLoading={teacherLoading}
                scheduleRows={scheduleRows}
                onOpenScheduleDialog={openScheduleDialog}
                onOpenRosterDialog={openRosterDialog}
                onDeleteClass={handleDeleteTeacherClass}
                onOpenNewClassDialog={() => {
                  resetNewClassForm();
                  setTeacherClassDialogOpen(true);
                }}
              />
            )}
          </div>
        </motion.div>
      </div>

      {/* Teacher Schedule Modal */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-6 sm:p-8" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-brand-ink">Хуваарь тохируулах</DialogTitle>
            <DialogDescription className="text-brand-ink/60">
              Хичээлийн орох цагийг шинэчлэх.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Эхлэх цаг</label>
                <Input
                  type="time"
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Дуусах цаг</label>
                <Input
                  type="time"
                  value={scheduleEnd}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Танхим / өрөө</label>
              <Input
                value={scheduleRoom}
                onChange={(e) => setScheduleRoom(e.target.value)}
                placeholder="Main Hall"
                className="rounded-xl"
              />
            </div>
            <Button
              className="w-full rounded-full bg-brand-ink py-6 text-[10px] font-black uppercase tracking-widest text-white hover:bg-brand-icon"
              disabled={scheduleSaving}
              onClick={handleSaveSchedule}
            >
              {scheduleSaving ? 'Хадгалж байна...' : 'Хадгалах'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Teacher Roster Modal */}
      <Dialog open={rosterDialogOpen} onOpenChange={setRosterDialogOpen}>
        <DialogContent className="sm:max-w-xl rounded-[2rem] p-6 sm:p-8" showCloseButton>
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-brand-ink">
              Сурагчдын ирц — {rosterClass?.title || 'Хичээл'}
            </DialogTitle>
            <DialogDescription className="text-brand-ink/60">
              Нийт бүртгүүлсэн сурагчдын ирцийг тэмдэглэнэ үү.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[min(60vh,28rem)] space-y-3 overflow-y-auto pr-1 pt-2">
            {rosterClass?.roster.length === 0 ? (
              <p className="py-6 text-center text-sm text-brand-ink/50">Одоогоор бүртгүүлсэн сурагч байхгүй байна.</p>
            ) : (
              rosterClass?.roster.map((s) => {
                const currentAtt = rosterOverride[s.key] ?? s.attendance;
                const saving = rosterSavingKey === s.key;
                return (
                  <div
                    key={s.key}
                    className="flex flex-col gap-2 rounded-2xl border border-brand-ink/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-brand-ink">{s.name}</p>
                      {s.email ? <p className="text-xs text-brand-ink/50">{s.email}</p> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={currentAtt === 'present' ? 'default' : 'outline'}
                        className={`rounded-full px-3 text-xs font-bold ${
                          currentAtt === 'present' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : ''
                        }`}
                        disabled={saving}
                        onClick={() => void setStudentAttendance(s, 'present')}
                      >
                        Ирсэн
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={currentAtt === 'absent' ? 'default' : 'outline'}
                        className={`rounded-full px-3 text-xs font-bold ${
                          currentAtt === 'absent' ? 'bg-rose-600 text-white hover:bg-rose-700' : ''
                        }`}
                        disabled={saving}
                        onClick={() => void setStudentAttendance(s, 'absent')}
                      >
                        Тасалсан
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
