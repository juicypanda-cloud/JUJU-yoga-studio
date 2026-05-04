import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, Loader2, QrCode, Smartphone, User } from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { ClassItem } from '../types/class';
import {
  type PaymentSession,
  buildFallbackQrUrl,
  hasPaidStatus,
  pickString,
  readJsonSafe,
  waitForImageReady,
} from '../lib/qpayHelpers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

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

const getCurrentWeekKey = (now: Date = new Date()) => {
  const d = new Date(now);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
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

const dayOrder = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

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

function getSlotPrice(item: ScheduleItem, classesMap: Record<string, ClassLookupItem>): number {
  const rec = classesMap[item.classId];
  const p = rec?.price;
  return typeof p === 'number' && p > 0 ? p : 0;
}

export const Schedule: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [classes, setClasses] = useState<Record<string, ClassLookupItem>>({});
  const [teachers, setTeachers] = useState<Record<string, TeacherLookupItem>>({});
  const [myRecurringBookedScheduleIds, setMyRecurringBookedScheduleIds] = useState<Set<string>>(new Set());
  const [myWeeklyBookedScheduleIds, setMyWeeklyBookedScheduleIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const currentWeekKey = useMemo(() => getCurrentWeekKey(), []);

  const [payTarget, setPayTarget] = useState<ScheduleItem | null>(null);
  const payTargetRef = useRef<ScheduleItem | null>(null);
  payTargetRef.current = payTarget;

  const [scheduleOrderId, setScheduleOrderId] = useState('');
  const [scheduleBookingSession, setScheduleBookingSession] = useState<PaymentSession | null>(null);
  const [scheduleBookingLoading, setScheduleBookingLoading] = useState(false);
  const [scheduleCheckingPayment, setScheduleCheckingPayment] = useState(false);
  const [scheduleBookingSuccess, setScheduleBookingSuccess] = useState(false);
  const [scheduleUseQrFallback, setScheduleUseQrFallback] = useState(false);
  const [schedulePayDialogOpen, setSchedulePayDialogOpen] = useState(false);

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
      setMyRecurringBookedScheduleIds(new Set());
      setMyWeeklyBookedScheduleIds(new Set());
      return;
    }

    const myBookingsQuery = query(collection(db, 'bookings'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(myBookingsQuery, (snapshot) => {
      const recurringIds = new Set<string>();
      const weeklyIds = new Set<string>();
      const scheduleIdsByClassId = new Map<string, string[]>();

      schedule.forEach((slot) => {
        const classId = String(slot?.classId || '').trim();
        if (!classId) return;
        const row = scheduleIdsByClassId.get(classId) || [];
        row.push(String(slot?.id || '').trim());
        scheduleIdsByClassId.set(classId, row.filter(Boolean));
      });

      snapshot.docs.forEach((bookingDoc) => {
        const data = bookingDoc.data() as any;
        const status = String(data?.status || '').toLowerCase();
        if (status === 'cancelled') return;
        const scheduleId = String(data?.scheduleId || '').trim();
        if (!scheduleId) {
          const classId = String(data?.classId || data?.itemId || '').trim();
          if (!classId) return;
          const mappedScheduleIds = scheduleIdsByClassId.get(classId) || [];
          mappedScheduleIds.forEach((mappedId) => recurringIds.add(mappedId));
          return;
        }

        const weekKey = String(data?.weekKey || '').trim();
        if (!weekKey) {
          // Legacy/recurring booking without week key.
          recurringIds.add(scheduleId);
          return;
        }
        if (weekKey === currentWeekKey) {
          weeklyIds.add(scheduleId);
        }
      });
      setMyRecurringBookedScheduleIds(recurringIds);
      setMyWeeklyBookedScheduleIds(weeklyIds);
    });

    return () => unsubscribe();
  }, [currentWeekKey, schedule, user?.uid]);

  const isSlotAlreadyBooked = (scheduleId?: string) => {
    const id = String(scheduleId || '').trim();
    if (!id) return false;
    return myRecurringBookedScheduleIds.has(id) || myWeeklyBookedScheduleIds.has(id);
  };

  const resetSchedulePaymentUi = () => {
    setPayTarget(null);
    setScheduleBookingSession(null);
    setScheduleBookingSuccess(false);
    setScheduleUseQrFallback(false);
    setScheduleBookingLoading(false);
    setScheduleCheckingPayment(false);
  };

  const finalizeScheduleBooking = async (item: ScheduleItem, opts?: { fromPaidFlow?: boolean }) => {
    if (!user?.uid) {
      toast.error('Хичээл захиалахын тулд нэвтэрнэ үү');
      return;
    }
    if (isSlotAlreadyBooked(item.id)) {
      toast.error('Та энэ хичээлд аль хэдийн бүртгүүлсэн байна');
      return;
    }
    if ((item.bookedCount || 0) >= (item.capacity || 0)) {
      toast.error('Хичээл дүүрсэн байна');
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const schedRef = doc(db, 'schedule', item.id);
        const schedSnap = await transaction.get(schedRef);
        if (!schedSnap.exists()) {
          throw new Error('NO_SCHEDULE');
        }
        const raw = schedSnap.data() as Record<string, unknown>;
        const cap = Number(raw?.capacity ?? 0);
        const booked = Number(raw?.bookedCount ?? 0);
        if (booked >= cap) {
          throw new Error('FULL');
        }
        const bookingRef = doc(collection(db, 'bookings'));
        transaction.set(bookingRef, {
          userId: user.uid,
          scheduleId: item.id,
          type: 'class',
          status: 'booked',
          weekKey: currentWeekKey,
          createdAt: new Date().toISOString(),
        });
        transaction.update(schedRef, { bookedCount: increment(1) });
      });
      toast.success('Хичээл амжилттай захиалагдлаа!');
      if (opts?.fromPaidFlow) setScheduleBookingSuccess(true);
    } catch (error) {
      console.error('Booking error:', error);
      const code = error instanceof Error ? error.message : '';
      if (code === 'FULL') toast.error('Хичээл дүүрсэн байна');
      else toast.error('Хичээл захиалахад алдаа гарлаа');
    }
  };

  const createScheduleInvoice = async () => {
    const item = payTargetRef.current;
    if (!user || !item) return;
    const amount = getSlotPrice(item, classes);
    if (amount <= 0) return;

    setScheduleBookingLoading(true);
    try {
      const classTitle = getClassInfo(item).title;
      const payload = {
        amount,
        orderId: scheduleOrderId || `sched-${item.id}-${user.uid}-${Date.now()}`,
        description: `${classTitle} — хуваарийн захиалга`,
        receiverCode: 'terminal',
        senderBranchCode: 'SCHEDULE',
        receiverData: {
          name: pickString(profile?.displayName) ?? pickString(user.displayName) ?? 'JUJU user',
          email: pickString(user.email),
        },
      };

      const response = await fetch('/api/qpay/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await readJsonSafe(response);
      if (!response.ok) {
        throw new Error(pickString(data?.error) ?? 'QPay invoice үүсгэхэд алдаа гарлаа');
      }

      const links = Array.isArray(data?.urls) ? data.urls : [];
      const deeplinkFromUrls = links
        .map((linkItem: unknown) =>
          linkItem && typeof linkItem === 'object' ? (linkItem as Record<string, unknown>).link : null
        )
        .find((v: unknown) => typeof v === 'string' && v.startsWith('qpay://'));

      const session: PaymentSession = {
        invoiceId: pickString(data?.invoice_id) ?? pickString(data?.invoiceId) ?? pickString(data?.id) ?? '',
        qrText: pickString(data?.qr_text) ?? pickString(data?.qrText) ?? pickString(data?.qrcode),
        qrImage: pickString(data?.qr_image) ?? pickString(data?.qr_image_url) ?? pickString(data?.qrImage),
        deeplink: pickString(data?.deeplink) ?? (deeplinkFromUrls as string | null),
      };
      if (!session.invoiceId) throw new Error('invoice_id олдсонгүй');

      const fallbackQrUrl = buildFallbackQrUrl(session.qrText ?? session.invoiceId);
      const primaryReady = await waitForImageReady(session.qrImage);
      const useFallback = !primaryReady;
      if (useFallback) {
        const fallbackReady = await waitForImageReady(fallbackQrUrl);
        if (!fallbackReady) throw new Error('QR зураг ачаалагдсангүй');
      }

      setScheduleBookingSession(session);
      setScheduleUseQrFallback(useFallback);
      toast.success('Төлбөрийн QR амжилттай үүслээ');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Төлбөр үүсгэхэд алдаа гарлаа');
    } finally {
      setScheduleBookingLoading(false);
    }
  };

  const checkSchedulePayment = async (silent = false) => {
    const item = payTargetRef.current;
    if (!scheduleBookingSession?.invoiceId || scheduleBookingSuccess || !item) return;
    if (!silent && scheduleCheckingPayment) return;
    if (!silent) setScheduleCheckingPayment(true);
    try {
      const response = await fetch('/api/qpay/payment/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: scheduleBookingSession.invoiceId }),
      });
      const data = await readJsonSafe(response);
      if (!response.ok) throw new Error(pickString(data?.error) ?? 'Төлбөр шалгах үед алдаа гарлаа');

      if (hasPaidStatus(data)) {
        await finalizeScheduleBooking(item, { fromPaidFlow: true });
      }
    } catch (error) {
      if (!silent) toast.error(error instanceof Error ? error.message : 'Төлбөр шалгахад алдаа гарлаа');
    } finally {
      if (!silent) setScheduleCheckingPayment(false);
    }
  };

  useEffect(() => {
    if (!scheduleBookingSession?.invoiceId || scheduleBookingSuccess) return;
    const timer = window.setInterval(() => {
      void checkSchedulePayment(true);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [scheduleBookingSession?.invoiceId, scheduleBookingSuccess]);

  const handleBook = async (item: ScheduleItem) => {
    if (!user) {
      toast.error('Хичээл захиалахын тулд нэвтэрнэ үү');
      return;
    }

    if ((item?.bookedCount || 0) >= (item?.capacity || 0)) {
      toast.error('Хичээл дүүрсэн байна');
      return;
    }

    if (isSlotAlreadyBooked(item?.id)) {
      toast.error('Та энэ хичээлд аль хэдийн бүртгүүлсэн байна');
      return;
    }

    const amount = getSlotPrice(item, classes);
    if (amount <= 0) {
      await finalizeScheduleBooking(item);
      return;
    }

    setScheduleBookingSuccess(false);
    setScheduleBookingSession(null);
    setScheduleUseQrFallback(false);
    setPayTarget(item);
    setScheduleOrderId(`sched-${item.id}-${user.uid}-${Date.now()}`);
    setSchedulePayDialogOpen(true);
  };

  const getClassInfo = (item: ScheduleItem) => {
    const classRecord: ClassLookupItem = classes?.[item?.classId] ?? { id: item.classId };
    const teacherRecord = teachers?.[item?.teacherId || ''] || {};

    return {
      title:
        typeof classRecord?.title === 'string'
          ? classRecord.title
          : typeof item?.className === 'string'
            ? item.className
            : 'Untitled class',
      level: 'Бүх түвшин',
      duration: '60 min',
      time: item?.time || 'No time',
      status: item?.status || 'Active',
      teacherName: teacherRecord?.name || item?.teacherName || 'Багш',
      seatsLeft: Math.max(0, (item?.capacity || 0) - (item?.bookedCount || 0)),
    };
  };

  const groupedSchedule = useMemo(() => {
    const groups: Record<string, ScheduleItem[]> = {};

    (schedule || []).forEach((item) => {
      const key = item?.day || 'Тодорхойгүй өдөр';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    return dayOrder
      .filter((day) => (groups?.[day] || []).length > 0)
      .map((day) => ({ day, items: groups?.[day] || [] }));
  }, [schedule]);

  return (
    <ErrorBoundary>
      <Dialog
        open={schedulePayDialogOpen && Boolean(payTarget)}
        onOpenChange={(open) => {
          setSchedulePayDialogOpen(open);
          if (!open) resetSchedulePaymentUi();
        }}
      >
        <DialogContent className="sm:max-w-md rounded-[2rem] p-8">
          <DialogHeader className="gap-2">
            <DialogTitle className="flex items-center gap-2 font-serif text-2xl text-brand-ink">
              <QrCode className="text-brand-icon" size={22} />
              Хичээлийн төлбөр
            </DialogTitle>
            <DialogDescription className="text-brand-ink/60">
              {payTarget ? (
                <>
                  {getClassInfo(payTarget).title} — {payTarget.day} {payTarget.time}
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          {payTarget && scheduleBookingSuccess ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-brand-ink/70">Төлбөр баталгаажлаа. Захиалга амжилттай үүслээ.</p>
              <Button
                type="button"
                className="rounded-full bg-brand-ink px-8 text-white hover:bg-brand-icon"
                onClick={() => {
                  resetSchedulePaymentUi();
                  setSchedulePayDialogOpen(false);
                }}
              >
                Хаах
              </Button>
            </div>
          ) : payTarget && !scheduleBookingSession ? (
            <div className="space-y-4">
              <p className="text-sm text-brand-ink/60">
                Үнэ: {getSlotPrice(payTarget, classes).toLocaleString()} ₮. Төлбөр баталгаажсаны дараа л суудал таньд тоологдоно.
              </p>
              <Button
                type="button"
                onClick={() => void createScheduleInvoice()}
                disabled={scheduleBookingLoading}
                className="w-full rounded-full bg-brand-ink py-6 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-brand-icon"
              >
                {scheduleBookingLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> QR үүсгэж байна...
                  </span>
                ) : (
                  `QPay QR үүсгэх: ${getSlotPrice(payTarget, classes).toLocaleString()}₮`
                )}
              </Button>
            </div>
          ) : scheduleBookingSession ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-brand-ink/10 bg-gray-50 p-4 flex flex-col items-center">
                <img
                  src={
                    !scheduleUseQrFallback && scheduleBookingSession.qrImage
                      ? scheduleBookingSession.qrImage
                      : buildFallbackQrUrl(scheduleBookingSession.qrText ?? scheduleBookingSession.invoiceId)
                  }
                  alt="QPay QR"
                  className="h-56 w-56 rounded-xl bg-white p-2"
                  onError={() => {
                    if (!scheduleUseQrFallback) setScheduleUseQrFallback(true);
                  }}
                />
              </div>
              {scheduleBookingSession.deeplink ? (
                <a
                  href={scheduleBookingSession.deeplink}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-icon py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white"
                >
                  <Smartphone size={14} />
                  QPay апп-аар нээх
                </a>
              ) : null}
              <Button
                type="button"
                onClick={() => void checkSchedulePayment(false)}
                disabled={scheduleCheckingPayment}
                className="w-full rounded-full bg-brand-ink py-6 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-brand-icon"
              >
                {scheduleCheckingPayment ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" /> Төлбөр шалгаж байна...
                  </span>
                ) : (
                  'Төлбөр шалгах'
                )}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="pt-32 pb-20 min-h-screen bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-5xl font-light tracking-tight mb-4">Хичээлийн хуваарь</h1>
              <p className="text-accent/60">
                Дасгал сургуулилт хийх тохиромжтой цагаа олоорой. Төлбөртэй хичээлийг QPay-ээр төлсний дараа л захиалга баталгаажина.
              </p>
            </div>

            {loading ? (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-secondary/10 rounded-2xl" />
                ))}
              </div>
            ) : !groupedSchedule || groupedSchedule.length === 0 ? (
              <p className="text-center text-gray-800 py-16">No data available</p>
            ) : (
              <div className="space-y-12">
                {groupedSchedule?.map((group) => (
                  <motion.div
                    key={group?.day}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                  >
                    <h2 className="text-2xl font-light mb-6 flex items-center gap-3 text-gray-800">
                      <CalendarIcon className="text-primary" size={24} />
                      {group?.day}
                    </h2>
                    <div className="bg-white rounded-3xl border border-accent/5 overflow-hidden shadow-sm">
                      <Table>
                        <TableHeader className="bg-secondary/5">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="py-4 px-6">Хичээл</TableHead>
                            <TableHead className="py-4 px-6">Цаг</TableHead>
                            <TableHead className="py-4 px-6">Багш</TableHead>
                            <TableHead className="py-4 px-6">Суудал</TableHead>
                            <TableHead className="py-4 px-6 text-right">Үйлдэл</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group?.items?.map((item) => {
                            const classInfo = getClassInfo(item);

                            return (
                              <TableRow key={item?.id} className="border-accent/5 hover:bg-secondary/5 transition-colors">
                                <TableCell className="py-6 px-6 text-gray-800">
                                  <div className="font-medium text-gray-800">{classInfo?.title}</div>
                                  <div className="text-xs text-gray-600 uppercase tracking-widest mt-1">{classInfo?.level}</div>
                                </TableCell>
                                <TableCell className="py-6 px-6 text-gray-800">
                                  <div className="flex items-center gap-2 text-gray-800">
                                    <Clock size={14} />
                                    {classInfo?.time}
                                  </div>
                                </TableCell>
                                <TableCell className="py-6 px-6 text-gray-800">
                                  <div className="flex items-center gap-2 text-gray-800">
                                    <User size={14} className="text-primary" />
                                    {classInfo?.teacherName}
                                  </div>
                                </TableCell>
                                <TableCell className="py-6 px-6 text-gray-800">
                                  <Badge variant="secondary" className="bg-secondary/20 text-gray-800 border-none">
                                    {classInfo?.status} • {classInfo?.seatsLeft} үлдсэн
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-6 px-6 text-right">
                                  {isSlotAlreadyBooked(item?.id) ? (
                                    <Button
                                      disabled
                                      className="rounded-full bg-gray-100 px-6 text-gray-500"
                                    >
                                      Бүртгэгдсэн
                                    </Button>
                                  ) : (
                                  <Button
                                    onClick={() => handleBook(item)}
                                    disabled={(item?.bookedCount || 0) >= (item?.capacity || 0)}
                                    className={`rounded-full px-6 ${(item?.bookedCount || 0) >= (item?.capacity || 0)
                                        ? 'bg-gray-100 text-gray-400'
                                        : 'bg-primary hover:bg-primary/90 text-white'
                                      }`}
                                  >
                                    {(item?.bookedCount || 0) >= (item?.capacity || 0) ? 'Дүүрсэн' : 'Захиалах'}
                                  </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
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
