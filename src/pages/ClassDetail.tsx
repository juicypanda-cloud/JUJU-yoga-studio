import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Clock, Calendar, CheckCircle2, Play, Lock, LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';
import { classData } from '../data/classes';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../lib/access';
import { getYouTubeVideoId, getYouTubePosterUrl } from '../lib/online-video-thumb';

type ClassContentType = 'offline' | 'online' | 'audio';

type ClassDetailItem = {
  id: string;
  title: string;
  type: ClassContentType;
  videoUrl?: string;
  audioUrl?: string;
  category: string;
  schedule: string;
  time: string;
  duration: string;
  price?: number;
  description: string;
  benefits: string[];
  image: string;
};

function getYouTubeEmbedUrl(url: string, autoplay = false) {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return '';
  const autoplayParam = autoplay ? '&autoplay=1' : '';
  return `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&controls=1&disablekb=1${autoplayParam}`;
}

function getYouTubePosterForPreview(url: string) {
  const videoId = getYouTubeVideoId(url);
  return videoId ? getYouTubePosterUrl(videoId, 'list') : '';
}

const normalizeClassDetail = (id: string, raw: any): ClassDetailItem => {
  const scheduleSlots = raw?.scheduleSlots || [];
  const schedule = Array.isArray(scheduleSlots) && scheduleSlots.length > 0
    ? scheduleSlots.map((slot: any) => slot?.dayOfWeek).filter(Boolean).join(', ')
    : (raw?.schedule || 'Хуваарь удахгүй');
  const time = Array.isArray(scheduleSlots) && scheduleSlots.length > 0
    ? scheduleSlots
      .map((slot: any) => {
        const startTime = slot?.startTime || '';
        const endTime = slot?.endTime || '';
        return startTime && endTime ? `${startTime}-${endTime}` : startTime || endTime;
      })
      .filter(Boolean)
      .join(', ')
    : (raw?.time || 'Цаг удахгүй');

  const parsedBenefits = Array.isArray(raw?.benefits)
    ? raw.benefits
    : typeof raw?.benefits === 'string'
      ? raw.benefits.split(',').map((item: string) => item.trim()).filter(Boolean)
      : [];

  return {
    id,
    title: raw?.title || raw?.name || 'No name',
    type: raw?.type || 'offline',
    videoUrl: raw?.videoUrl || '',
    audioUrl: raw?.audioUrl || '',
    category: raw?.category || 'Yoga',
    schedule,
    time,
    duration: raw?.duration || '60 мин',
    price: typeof raw?.price === 'number' ? raw.price : undefined,
    description: raw?.description || 'Тайлбар удахгүй нэмэгдэнэ.',
    benefits: parsedBenefits.length > 0 ? parsedBenefits : ['Сунгалт, амьсгал, төвлөрөл сайжруулна'],
    image: raw?.image || 'https://picsum.photos/seed/class-detail/1200/900',
  };
};

export const ClassDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile, isSubscribed, isAdmin } = useAuth();
  const premiumAccess = canAccess({ user, isSubscribed, isAdmin, role: profile?.role });
  const [classItem, setClassItem] = useState<ClassDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaLoadTimedOut, setMediaLoadTimedOut] = useState(false);
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false);

  const mediaSourceUrl =
    classItem?.type === 'online'
      ? (classItem?.videoUrl || '')
      : classItem?.type === 'audio'
        ? (classItem?.audioUrl || '')
        : '';
  const embedUrl = getYouTubeEmbedUrl(mediaSourceUrl);
  const autoplayEmbedUrl = getYouTubeEmbedUrl(mediaSourceUrl, true);
  const mediaThumbnail = classItem?.image || getYouTubePosterForPreview(mediaSourceUrl);
  const hasMediaType = classItem?.type === 'online' || classItem?.type === 'audio';

  useEffect(() => {
    const fetchClass = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const classDoc = await getDoc(doc(db, 'classes', id));
        if (classDoc.exists()) {
          setClassItem(normalizeClassDetail(classDoc.id, classDoc.data()));
          return;
        }
      } catch (error) {
        console.error('[ClassDetail] Failed to fetch class from Firestore:', error);
      }

      const staticItem = classData.find((item) => item.id === id);
      if (staticItem) {
        setClassItem(normalizeClassDetail(staticItem.id, staticItem));
      } else {
        setClassItem(null);
      }
      setLoading(false);
    };

    fetchClass().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    setMediaLoaded(false);
    setMediaLoadTimedOut(false);
    setHasStartedPlayback(false);
  }, [classItem?.id, classItem?.videoUrl, classItem?.audioUrl, classItem?.type]);

  useEffect(() => {
    if (!hasStartedPlayback || mediaLoaded) return;
    const timeoutId = window.setTimeout(() => setMediaLoadTimedOut(true), 2500);
    return () => window.clearTimeout(timeoutId);
  }, [mediaLoaded, embedUrl, hasStartedPlayback]);

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
                <p className="text-base font-semibold text-brand-ink mb-6">
                  Үнэ: {classItem.price.toLocaleString()} ₮
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

            {hasMediaType && mediaSourceUrl ? (
            <div className="space-y-6">
              <h3 className="text-2xl font-serif text-brand-ink">Class Content</h3>
              {!embedUrl ? (
                <p className="text-brand-ink/60">Invalid video link</p>
              ) : !user ? (
                <div className="rounded-[2rem] border border-brand-ink/10 bg-white p-10 text-center shadow-inner">
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-icon shadow-md">
                    <LogIn size={26} />
                  </div>
                  <h4 className="font-serif text-xl text-brand-ink mb-2">Нэвтэрнэ үү</h4>
                  <p className="text-sm text-brand-ink/60 font-light leading-relaxed mb-8">
                    Энэхүү видео / аудио хэсгийг үзэхийн тулд эхлээд бүртгэлээрээ нэвтэрнэ үү.
                  </p>
                  <Link to="/login">
                    <Button className="bg-brand-ink text-white hover:bg-brand-icon rounded-full px-10 py-6 text-[11px] font-black tracking-[0.2em] uppercase shadow-lg">
                      Нэвтрэх
                    </Button>
                  </Link>
                </div>
              ) : !premiumAccess ? (
                <div className="rounded-[2rem] border border-brand-ink/10 bg-white p-10 text-center shadow-inner">
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-icon shadow-md">
                    <Lock size={26} />
                  </div>
                  <h4 className="font-serif text-xl text-brand-ink mb-2">Гишүүнчлэл шаардлагатай</h4>
                  <p className="text-sm text-brand-ink/60 font-light leading-relaxed mb-8">
                    Онлайн болон аудио контентыг үзэхийн тулд идэвхтэй гишүүнчлэлтэй байх шаардлагатай.
                  </p>
                  <Link to="/pricing">
                    <Button className="bg-brand-ink text-white hover:bg-brand-icon rounded-full px-10 py-6 text-[11px] font-black tracking-[0.2em] uppercase shadow-lg">
                      Гишүүнчлэл сонгох
                    </Button>
                  </Link>
                </div>
              ) : classItem?.type === 'online' ? (
                <div className="relative aspect-video overflow-hidden rounded-2xl shadow-lg shadow-brand-ink/10 bg-black">
                  <div
                    className={`absolute inset-0 transition-opacity duration-500 ${
                      hasStartedPlayback ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMediaLoadTimedOut(false);
                        setMediaLoaded(false);
                        setHasStartedPlayback(true);
                      }}
                      className="relative h-full w-full overflow-hidden group"
                    >
                      {mediaThumbnail ? (
                        <img
                          src={mediaThumbnail}
                          alt={`${classItem.title} cover`}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="h-full w-full bg-gray-200 animate-pulse" />
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-black/25 transition-colors duration-300 group-hover:bg-black/40" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-brand-ink shadow-xl transition-transform duration-300 group-hover:scale-105">
                          <Play size={26} className="ml-1" />
                        </span>
                      </div>
                    </button>
                  </div>
                  {hasStartedPlayback && (
                    <>
                      {!mediaLoaded && !mediaLoadTimedOut && (
                        <div className="absolute inset-0 animate-pulse bg-gray-200" />
                      )}
                      <iframe
                        src={autoplayEmbedUrl}
                        className={`h-full w-full transition-opacity duration-500 ${
                          mediaLoaded || mediaLoadTimedOut ? 'opacity-100' : 'opacity-0'
                        }`}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                        loading="lazy"
                        onLoad={() => setMediaLoaded(true)}
                        title={`${classItem.title} ${classItem?.type}`}
                      />
                    </>
                  )}
                </div>
              ) : (
                <div
                  className={`relative overflow-hidden rounded-2xl shadow-lg shadow-brand-ink/10 ${
                    classItem?.type === 'audio' ? 'h-24' : 'aspect-video'
                  }`}
                >
                  {!mediaLoaded && !mediaLoadTimedOut && (
                    <div className="absolute inset-0 animate-pulse bg-gray-200" />
                  )}
                  <iframe
                    src={embedUrl}
                    className={`h-full w-full transition-opacity duration-500 ${
                      mediaLoaded || mediaLoadTimedOut ? 'opacity-100' : 'opacity-0'
                    }`}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                    loading="lazy"
                    onLoad={() => setMediaLoaded(true)}
                    title={`${classItem.title} ${classItem?.type}`}
                  />
                </div>
              )}
            </div>
            ) : null}

            <div className="pt-8 flex justify-center">
              <Link to="/schedule">
                <Button className="bg-brand-ink text-white hover:bg-brand-icon rounded-full px-12 py-8 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl w-full sm:w-auto">
                  Одоо бүртгүүлэх
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
