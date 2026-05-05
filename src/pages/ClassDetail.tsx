import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, Calendar, CheckCircle2, Loader2, QrCode, Smartphone } from 'lucide-react';
import { Button } from '../components/ui/button';
import { classData } from '../data/classes';
import { db } from '../firebase';
import { addDoc, collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import type { ClassItem } from '../types/class';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { monthKeyValid } from '../lib/bookingScheduleDisplay';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  type PaymentSession,
  buildFallbackQrUrl,
  pickString,
  readJsonSafe,
  waitForImageReady,
} from '../lib/qpayHelpers';

type ClassDetailItem = ClassItem & {
  category: string;
  schedule: string;
  time: string;
  duration: string;
  scheduleEntries: Array<{ day: string; time: string }>;
  price?: number;
  description: string;
  benefits: string[];
  image: string;
};

const normalizeClassDetail = (id: string, raw: any): ClassDetailItem => {
  const normalizedCategory = (() => {
    const categoryRaw = typeof raw?.category === 'string' ? raw.category.trim() : '';
    if (!categoryRaw) return 'Yoga';
    return categoryRaw.toLowerCase() === 'hatha' ? 'Yoga' : categoryRaw;
  })();

  const scheduleSlots = Array.isArray(raw?.scheduleSlots) ? raw.scheduleSlots : [];
  const scheduleEntries = scheduleSlots
    .map((slot: any) => {
      const day = String(slot?.dayOfWeek || '').trim();
      const startTime = String(slot?.startTime || '').trim();
      const endTime = String(slot?.endTime || '').trim();
      const time = startTime && endTime ? `${startTime}-${endTime}` : startTime || endTime;
      if (!day && !time) return null;
      return {
        day: day || 'Өдөр тодорхойгүй',
        time: time || 'Цаг тодорхойгүй',
      };
    })
    .filter((item): item is { day: string; time: string } => Boolean(item));
  const schedule = scheduleSlots.length > 0
    ? scheduleSlots.map((slot: any) => slot?.dayOfWeek).filter(Boolean).join(', ')
    : 'Хуваарь удахгүй';
  const time = scheduleSlots.length > 0
    ? scheduleSlots
      .map((slot: any) => {
        const startTime = slot?.startTime || '';
        const endTime = slot?.endTime || '';
        return startTime && endTime ? `${startTime}-${endTime}` : startTime || endTime;
      })
      .filter(Boolean)
      .join(', ')
    : 'Цаг удахгүй';

  const parsedBenefits = Array.isArray(raw?.benefits)
    ? raw.benefits
    : [];

  const rawType = typeof raw?.type === 'string' ? raw.type.trim().toLowerCase() : '';
  const type: ClassItem['type'] =
    rawType === 'online' || rawType === 'audio' ? rawType : 'offline';

  return {
    id,
    title: typeof raw?.title === 'string' ? raw.title : 'Untitled class',
    type,
    videoUrl: typeof raw?.videoUrl === 'string' ? raw.videoUrl : '',
    audioUrl: typeof raw?.audioUrl === 'string' ? raw.audioUrl : '',
    createdAt: raw?.createdAt,
    image: typeof raw?.image === 'string' ? raw.image : 'https://picsum.photos/seed/class-detail/1200/900',
    category: normalizedCategory,
    schedule,
    time,
    duration: typeof raw?.duration === 'string' ? raw.duration : '60 мин',
    scheduleEntries,
    price: typeof raw?.price === 'number' ? raw.price : undefined,
    description: typeof raw?.description === 'string' ? raw.description : 'Тайлбар удахгүй нэмэгдэнэ.',
    benefits: parsedBenefits.length > 0 ? parsedBenefits : ['Сунгалт, амьсгал, төвлөрөл сайжруулна'],
  };
};

export const ClassDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const [classItem, setClassItem] = useState<ClassDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBookingPayment, setShowBookingPayment] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingSession, setBookingSession] = useState<PaymentSession | null>(null);
  const [orderId, setOrderId] = useState('');
  const [useQrFallback, setUseQrFallback] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    if (!id) {
      setClassItem(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const classRef = doc(db, 'classes', id);
    const unsubscribe = onSnapshot(
      classRef,
      (classDoc) => {
        if (classDoc.exists()) {
          setClassItem(normalizeClassDetail(classDoc.id, classDoc.data()));
        } else {
          const staticItem = classData.find((item) => item.id === id);
          if (staticItem) {
            setClassItem(normalizeClassDetail(staticItem.id, staticItem));
          } else {
            setClassItem(null);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.error('[ClassDetail] Class subscription error:', error);
        const staticItem = classData.find((item) => item.id === id);
        if (staticItem) {
          setClassItem(normalizeClassDetail(staticItem.id, staticItem));
        } else {
          setClassItem(null);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

  useEffect(() => {
    if (!user?.uid || !id) return;
    setOrderId(`class-${id}-${user.uid}-${Date.now()}`);
  }, [id, user?.uid]);

  const currentMonthKey = () => format(new Date(), 'yyyy-MM');

  const ensureNotAlreadyBooked = async () => {
    if (!user?.uid || !id) return false;
    const mkTarget = currentMonthKey();
    const q = query(collection(db, 'bookings'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    return snapshot.docs.some((item) => {
      const d = item.data() as Record<string, unknown>;
      if (String(d?.status || '').toLowerCase() === 'cancelled') return false;
      const cid = String(d?.classId || '').trim();
      const iid = String(d?.itemId || '').trim();
      if (cid !== id && iid !== id) return false;
      const mkDoc = String(d?.monthKey || '').trim();
      if (monthKeyValid(mkDoc) && mkDoc === mkTarget) return true;
      if (String(d?.type || '') === 'class' && !monthKeyValid(mkDoc)) {
        const c = d?.createdAt;
        let created = new Date();
        if (c && typeof (c as { toDate?: () => Date }).toDate === 'function') {
          created = (c as { toDate: () => Date }).toDate();
        } else if (typeof c === 'string') {
          const t = new Date(c);
          if (!Number.isNaN(t.getTime())) created = t;
        }
        const mkLegacy = format(created, 'yyyy-MM');
        return mkLegacy === mkTarget;
      }
      return false;
    });
  };

  const finalizeClassBooking = async () => {
    if (!user?.uid || !id || !classItem) return;
    const alreadyBooked = await ensureNotAlreadyBooked();
    if (alreadyBooked) {
      toast.error('Та энэ хичээлд аль хэдийн бүртгүүлсэн байна');
      return;
    }
    setBookingLoading(true);
    try {
    const monthKey = currentMonthKey();
    await addDoc(collection(db, 'bookings'), {
      userId: user.uid,
      classId: id,
      itemId: id,
      type: 'class_month',
      monthKey,
      status: 'confirmed',
      source: 'class-detail',
      amountPaid: Number(classItem.price || 0),
      createdAt: new Date().toISOString(),
    });
    setBookingSuccess(true);
    toast.success('Хичээл таны хуваарьт нэмэгдлээ');
    } catch (error) {
      console.error(error);
      toast.error('Бүртгүүлэхэд алдаа гарлаа');
    } finally {
      setBookingLoading(false);
    }
  };

  const createBookingInvoice = async () => {
    if (!user || !classItem) return;
    if (!id) return;

    if (await ensureNotAlreadyBooked()) {
      toast.error('Та энэ хичээлд аль хэдийн бүртгүүлсэн байна');
      return;
    }

    setBookingLoading(true);
    try {
      const idToken = await user.getIdToken();
      const payload = {
        amount: Number(classItem.price || 0),
        orderId: orderId || `class-${id}-${Date.now()}`,
        description: `${classItem.title} class booking`,
        receiverCode: 'terminal',
        senderBranchCode: 'CLASS',
        receiverData: {
          name: pickString(profile?.displayName) ?? pickString(user.displayName) ?? 'JUJU user',
          email: pickString(user.email),
        },
        idToken,
        paymentIntent: { kind: 'class_month', classId: id, monthKey: currentMonthKey() },
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
        .map((item: unknown) => (item && typeof item === 'object' ? (item as Record<string, unknown>).link : null))
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

      setBookingSession(session);
      setUseQrFallback(useFallback);
      setIsQrModalOpen(true);
      toast.success('Төлбөрийн QR амжилттай үүслээ');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Төлбөр үүсгэхэд алдаа гарлаа');
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    if (!bookingSession?.invoiceId || bookingSuccess) return;
    if (!(typeof classItem?.price === 'number' && classItem.price > 0)) return;
    const ref = doc(db, 'qpayEvents', bookingSession.invoiceId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data() as Record<string, unknown>;
      if (d.processed === true && String(d.status || '') === 'paid') {
        setBookingSuccess(true);
        toast.success('Төлбөр баталгаажлаа. Хичээл таны хуваарьт нэмэгдлээ.');
      }
    });
    return () => unsub();
  }, [bookingSession?.invoiceId, bookingSuccess, classItem?.price]);

  if (loading) {
    return (
      <div className="pt-32 pb-20 min-h-screen flex flex-col items-center justify-center">
        <p className="text-brand-ink/60">Уншиж байна...</p>
      </div>
    );
  }

  if (!classItem) {
    return (
      <div className="pt-32 pb-20 min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-serif mb-4">Хичээл олдсонгүй</h1>
        <Link to="/classes">
          <Button variant="outline" className="rounded-full">
            Буцах
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-32 pb-20 min-h-screen bg-white">
      <Dialog open={isQrModalOpen && Boolean(bookingSession)} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] p-8">
          <DialogHeader className="gap-2">
            <DialogTitle className="flex items-center gap-2 font-serif text-2xl text-brand-ink">
              <QrCode className="text-brand-icon" size={22} />
              QPay QR
            </DialogTitle>
            <DialogDescription className="text-brand-ink/60">
              QR уншуулж төлбөрөө хийгээрэй. Төлбөр баталгаажмагц бүртгэл автоматаар үүснэ (таб хаасан ч ажиллана).
            </DialogDescription>
          </DialogHeader>

          {bookingSession ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-brand-ink/10 bg-gray-50 p-4 flex flex-col items-center">
                <img
                  src={
                    !useQrFallback && bookingSession.qrImage
                      ? bookingSession.qrImage
                      : buildFallbackQrUrl(bookingSession.qrText ?? bookingSession.invoiceId)
                  }
                  alt="QPay QR"
                  className="h-56 w-56 rounded-xl bg-white p-2"
                  onError={() => {
                    if (!useQrFallback) setUseQrFallback(true);
                  }}
                />
              </div>
              {bookingSession.deeplink ? (
                <a
                  href={bookingSession.deeplink}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-icon py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white"
                >
                  <Smartphone size={14} />
                  QPay апп-аар нээх
                </a>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4">
        <Link to="/classes" className="inline-flex items-center text-brand-ink/60 hover:text-brand-ink transition-colors mb-12 group">
          <ArrowLeft size={20} className="mr-2 transition-transform group-hover:-translate-x-1" />
          Буцах
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left Column: Image & Basic Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="relative aspect-[4/3] rounded-[2rem] overflow-hidden shadow-2xl shadow-brand-ink/10">
              <img
                src={classItem.image}
                alt={classItem.title}
                className="absolute inset-0 h-full w-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              <div className="absolute top-8 left-8">
                <span className="bg-white/90 backdrop-blur-md px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-icon shadow-xl">
                  {classItem.category === 'Yoga'
                    ? 'Йог'
                    : classItem.category === 'Meditation'
                      ? 'Оксфордын майндфүлнэс бясалгал'
                      : classItem.category || 'Хичээл'}
                </span>
              </div>
            </div>

            {classItem.scheduleEntries.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {classItem.scheduleEntries.map((entry, index) => (
                  <div
                    key={`${entry.day}-${entry.time}-${index}`}
                    className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-brand-ink/5 border border-brand-ink/5 hover:shadow-brand-ink/10 hover:-translate-y-2 transition-all duration-500 group/info"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-brand-icon mb-4 shadow-sm group-hover/info:bg-brand-icon group-hover/info:text-white transition-colors duration-500">
                      <Calendar size={20} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/30 mb-1">
                      Хуваарь {index + 1}
                    </p>
                    <p className="text-brand-ink font-medium">{entry.day}</p>
                    <p className="text-brand-ink/70 text-sm mt-1">{entry.time}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-brand-ink/5 border border-brand-ink/5 hover:shadow-brand-ink/10 hover:-translate-y-2 transition-all duration-500 group/info">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-brand-icon mb-4 shadow-sm group-hover/info:bg-brand-icon group-hover/info:text-white transition-colors duration-500">
                    <Calendar size={20} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/30 mb-1">Хуваарь</p>
                  <p className="text-brand-ink font-medium">{classItem.schedule}</p>
                </div>
                <div className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-brand-ink/5 border border-brand-ink/5 hover:shadow-brand-ink/10 hover:-translate-y-2 transition-all duration-500 group/info">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-brand-icon mb-4 shadow-sm group-hover/info:bg-brand-icon group-hover/info:text-white transition-colors duration-500">
                    <Clock size={20} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-ink/30 mb-1">Цаг & Хугацаа</p>
                  <p className="text-brand-ink font-medium">{classItem.time} • {classItem.duration}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Column: Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-12"
          >
            <div>
              <h1 className="text-4xl font-serif text-brand-ink mb-8 leading-tight">
                {classItem.title}
              </h1>
              {typeof classItem.price === 'number' && classItem.price > 0 && (
                <p className="text-base font-semibold text-brand-ink mb-2">
                  Сарын эрх: {classItem.price.toLocaleString()} ₮ / {currentMonthKey()}
                </p>
              )}
              {typeof classItem.price === 'number' && classItem.price > 0 && (
                <p className="text-sm text-brand-ink/55 mb-6">
                  Нэг удаагийн төлбөрөөр сонгосон сард тухайн хичээлийн бүх суудлын хуваарь таны &quot;Миний хуваарь&quot; хуудсанд харагдана.
                </p>
              )}
              <p className="text-base text-brand-ink/60 font-light leading-relaxed">
                {classItem.description}
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-2xl font-serif text-brand-ink">Хичээлийн давуу талууд</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {classItem.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-6 bg-white rounded-[2rem] border border-brand-ink/5 shadow-2xl shadow-brand-ink/5 hover:shadow-brand-ink/10 hover:-translate-y-1 transition-all duration-500 group/benefit">
                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-brand-icon shrink-0 group-hover/benefit:bg-brand-icon group-hover/benefit:text-white transition-colors duration-500">
                      <CheckCircle2 size={20} />
                    </div>
                    <span className="text-brand-ink/80 font-light">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 space-y-6">
              {classItem.type === 'offline' ? (
                <>
                  {showBookingPayment ? (
                    <div className="rounded-[2rem] border border-brand-ink/10 bg-white p-6 sm:p-8">
                      {bookingSuccess ? (
                        <div className="text-center space-y-4">
                          <h4 className="text-xl font-serif text-brand-ink">Бүртгэл амжилттай</h4>
                          <p className="text-sm text-brand-ink/60">
                            {typeof classItem.price === 'number' && classItem.price > 0
                              ? 'Төлбөр баталгаажлаа. Хичээл таны хуваарьт нэмэгдлээ.'
                              : 'Хичээл таны хуваарьт нэмэгдлээ.'}
                          </p>
                          <Link to="/schedule">
                            <Button className="rounded-full bg-brand-ink px-8 text-white hover:bg-brand-icon">Миний хуваарь руу очих</Button>
                          </Link>
                        </div>
                      ) : !(typeof classItem.price === 'number' && classItem.price > 0) ? (
                        <div className="space-y-4">
                          <h4 className="text-xl font-serif text-brand-ink">Төлбөргүй бүртгэл</h4>
                          <p className="text-sm text-brand-ink/60">
                            Энэ хичээл төлбөргүй. Доорх товч дарж бүртгэлээ баталгаажуулна уу.
                          </p>
                          <Button
                            onClick={() => void finalizeClassBooking()}
                            disabled={bookingLoading}
                            className="w-full rounded-full bg-brand-ink py-6 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-brand-icon"
                          >
                            {bookingLoading ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 size={14} className="animate-spin" /> Бүртгэж байна...
                              </span>
                            ) : (
                              'Бүртгүүлэх'
                            )}
                          </Button>
                        </div>
                      ) : !bookingSession ? (
                        <div className="space-y-4">
                          <h4 className="text-xl font-serif text-brand-ink">Хичээлийн төлбөр</h4>
                          <p className="text-sm text-brand-ink/60">
                            Сарын төлбөр: {Number(classItem.price || 0).toLocaleString()} ₮ ({currentMonthKey()}). Төлбөр
                            баталгаажсаны дараа сарын бүх суудал таны хуваарьд орно.
                          </p>
                          <Button
                            onClick={createBookingInvoice}
                            disabled={bookingLoading}
                            className="w-full rounded-full bg-brand-ink py-6 text-[11px] font-black uppercase tracking-[0.2em] text-white hover:bg-brand-icon"
                          >
                            {bookingLoading ? (
                              <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> QR үүсгэж байна...</span>
                            ) : (
                              `QPay QR үүсгэх: ${Number(classItem.price || 0).toLocaleString()}₮`
                            )}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-5">
                          <h4 className="text-xl font-serif text-brand-ink">QPay төлбөр</h4>
                          <div className="rounded-2xl border border-brand-ink/10 bg-gray-50 p-5 text-center">
                            <p className="text-sm text-brand-ink/60 mb-4">QR popup-аар нээгдсэн.</p>
                            <Button
                              type="button"
                              onClick={() => setIsQrModalOpen(true)}
                              className="rounded-full bg-brand-ink px-8 text-white hover:bg-brand-icon"
                            >
                              QR дахин нээх
                            </Button>
                          </div>
                          <p className="text-center text-xs text-brand-ink/45">
                            Төлбөр баталгаажмагц энд амжилттай гэж гарна. Хуудсыг нээлттэй үлдээх шаардлагагүй.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {!showBookingPayment ? (
                    <div className="flex justify-center">
                      <Button
                        onClick={() => {
                          if (!user) {
                            toast.error('Бүртгүүлэхийн тулд нэвтэрнэ үү');
                            return;
                          }
                          setShowBookingPayment(true);
                        }}
                        className="bg-brand-ink text-white hover:bg-brand-icon rounded-full px-12 py-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl w-full sm:w-auto"
                      >
                        Одоо бүртгүүлэх
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex justify-center">
                  <Link to="/classes">
                    <Button className="bg-brand-ink text-white hover:bg-brand-icon rounded-full px-12 py-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl w-full sm:w-auto">
                      Хичээлүүд рүү очих
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
