import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hero } from '../components/Hero';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  MapPin,
  Calendar,
  Users,
  Clock,
  Star,
  Play,
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { hasActiveSubscription } from '../lib/access';
import { getYouTubeVideoId, getYouTubePosterUrl } from '../lib/online-video-thumb';
import type { ClassItem } from '../types/class';

/** Masonry aspect rhythm (reused for Firestore gallery + fallback) */
const GALLERY_ASPECT_CYCLE = [
  'aspect-[3/4]',
  'aspect-square',
  'aspect-[4/5]',
  'aspect-[3/2]',
  'aspect-[4/3]',
  'aspect-[2/3]',
  'aspect-[3/4]',
  'aspect-square',
] as const;

type HomeGalleryMoment = {
  id: string;
  url: string;
  title: string;
  aspect: string;
};

const FALLBACK_GALLERY_MOMENTS: HomeGalleryMoment[] = [
  { id: 'fallback-0', url: 'https://picsum.photos/seed/yoga-1/800/1067', title: 'Morning Flow', aspect: GALLERY_ASPECT_CYCLE[0] },
  { id: 'fallback-1', url: 'https://picsum.photos/seed/yoga-2/800/800', title: 'Meditation Space', aspect: GALLERY_ASPECT_CYCLE[1] },
  { id: 'fallback-2', url: 'https://picsum.photos/seed/yoga-3/800/1000', title: 'Nature Connection', aspect: GALLERY_ASPECT_CYCLE[2] },
  { id: 'fallback-3', url: 'https://picsum.photos/seed/yoga-4/1200/800', title: 'Studio Light', aspect: GALLERY_ASPECT_CYCLE[3] },
  { id: 'fallback-4', url: 'https://picsum.photos/seed/yoga-5/1067/800', title: 'Community', aspect: GALLERY_ASPECT_CYCLE[4] },
  { id: 'fallback-5', url: 'https://picsum.photos/seed/yoga-6/800/1200', title: 'Serenity', aspect: GALLERY_ASPECT_CYCLE[5] },
  { id: 'fallback-6', url: 'https://picsum.photos/seed/yoga-7/800/1067', title: 'Breath', aspect: GALLERY_ASPECT_CYCLE[6] },
  { id: 'fallback-7', url: 'https://picsum.photos/seed/yoga-8/800/800', title: 'Balance', aspect: GALLERY_ASPECT_CYCLE[7] },
];

/** Shop hero carousel: e-book + notebook (`public/images/juju-notebook.png`). */
const HOME_SHOP_SLIDES = [
  {
    src: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=82&w=1600',
    alt: 'Цахим ном',
    title: 'Цахим ном',
    body: 'Хаанаас ч уншиж, давтахад тохиромжтой цахим хувилбарууд.',
  },
  {
    src: '/images/juju-notebook.png',
    alt: 'Майндфүлнэс тэмдэглэлийн дэвтэр',
    title: 'Дэвтэр',
    body: 'Хичээлийн тэмдэглэл, өдрийн төлөвлөгөө — өөрийн гараар бичихэд тохиромжтой.',
  },
] as const;

const normalizeHomeGalleryMoment = (id: string, raw: any, idx: number): HomeGalleryMoment => ({
  id,
  url: String(raw?.image || '').trim(),
  title: String(raw?.title || 'Зураг'),
  aspect: GALLERY_ASPECT_CYCLE[idx % GALLERY_ASPECT_CYCLE.length],
});

type HomeClassItem = ClassItem & {
  duration: string;
  instructor?: string;
  description: string;
};

type HomeBlogItem = {
  id: string;
  title: string;
  image: string;
  description: string;
  category?: string;
};

type HomeRetreatItem = {
  id: string;
  title: string;
  image: string;
  description: string;
  duration: string;
  location: string;
};

/** Smaller mq poster for home cards (matches online library). */
const getYouTubeThumbnail = (url?: string) => {
  const id = url ? getYouTubeVideoId(url.trim()) : '';
  return id ? getYouTubePosterUrl(id, 'list') : '';
};

const normalizeClassItem = (id: string, raw: Record<string, unknown>): HomeClassItem => {
  const rawType = typeof raw.type === 'string' ? raw.type.trim().toLowerCase() : '';
  const type: ClassItem['type'] =
    rawType === 'online' || rawType === 'audio' ? rawType : 'offline';
  const title = typeof raw.title === 'string' ? raw.title : 'Untitled class';
  const image =
    typeof raw.image === 'string'
      ? raw.image
      : getYouTubeThumbnail(typeof raw.videoUrl === 'string' ? raw.videoUrl : '') ||
        'https://picsum.photos/seed/class-fallback/1600/900';
  const duration = typeof raw.duration === 'string' ? raw.duration : '60 min';
  const instructor = typeof raw.teacher === 'string' ? raw.teacher : '';
  const description =
    typeof raw.description === 'string'
      ? raw.description
      : 'Дэлгэрэнгүй мэдээлэл удахгүй нэмэгдэнэ.';

  return {
    id,
    title,
    type,
    image,
    videoUrl: typeof raw.videoUrl === 'string' ? raw.videoUrl : '',
    audioUrl: typeof raw.audioUrl === 'string' ? raw.audioUrl : '',
    createdAt: raw.createdAt,
    duration,
    instructor,
    description,
  };
};

const normalizeBlogItem = (id: string, raw: any): HomeBlogItem => ({
  id,
  title: typeof raw?.title === 'string' ? raw.title : 'Untitled blog',
  image: typeof raw?.image === 'string' ? raw.image : 'https://picsum.photos/seed/blog-fallback/1200/800',
  description: (raw?.shortDescription || raw?.excerpt || raw?.description || '')
    .toString()
    .slice(0, 180),
  category: raw?.category || '',
});

const normalizeRetreatItem = (id: string, raw: any): HomeRetreatItem => ({
  id,
  title: typeof raw?.title === 'string' ? raw.title : 'Untitled retreat',
  image: typeof raw?.image === 'string' ? raw.image : 'https://picsum.photos/seed/retreat-fallback/1200/800',
  description:
    typeof raw?.description === 'string' ? raw.description : 'Дэлгэрэнгүй мэдээлэл удахгүй нэмэгдэнэ.',
  duration: typeof raw?.duration === 'string' ? raw.duration : '',
  location: typeof raw?.location === 'string' ? raw.location : '',
});

const getCreatedAtSeconds = (raw: any) => {
  const createdAt = raw?.createdAt;
  if (typeof createdAt?.seconds === 'number') {
    return createdAt.seconds;
  }
  if (createdAt?.toMillis) {
    return Math.floor(createdAt.toMillis() / 1000);
  }
  return 0;
};

export const Home: React.FC = () => {
  const { user, profile } = useAuth();
  const allowPremium = hasActiveSubscription(profile);
  const premiumLibraryPath = !user ? '/login' : !allowPremium ? '/pricing' : '/online';

  const [offlineClasses, setOfflineClasses] = useState<HomeClassItem[]>([]);
  const [onlineClasses, setOnlineClasses] = useState<HomeClassItem[]>([]);
  const [blogs, setBlogs] = useState<HomeBlogItem[]>([]);
  const [retreats, setRetreats] = useState<HomeRetreatItem[]>([]);
  const [activeFeatureTab, setActiveFeatureTab] = useState<'classes' | 'videos' | 'retreats' | 'mindfulness'>('classes');
  const [loadingOffline, setLoadingOffline] = useState(true);
  const [loadingOnline, setLoadingOnline] = useState(true);
  const [loadingBlogs, setLoadingBlogs] = useState(true);
  const [loadingRetreats, setLoadingRetreats] = useState(true);
  const [offlineError, setOfflineError] = useState(false);
  const [onlineError, setOnlineError] = useState(false);
  const [blogError, setBlogError] = useState(false);
  const [retreatError, setRetreatError] = useState(false);
  const [galleryMoments, setGalleryMoments] = useState<HomeGalleryMoment[]>([]);
  const [lightbox, setLightbox] = useState<{ url: string; title: string } | null>(null);
  const [shopSlideIndex, setShopSlideIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setShopSlideIndex((i) => (i + 1) % HOME_SHOP_SLIDES.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const goShopPrev = () => {
    setShopSlideIndex((i) => (i - 1 + HOME_SHOP_SLIDES.length) % HOME_SHOP_SLIDES.length);
  };

  const goShopNext = () => {
    setShopSlideIndex((i) => (i + 1) % HOME_SHOP_SLIDES.length);
  };

  useEffect(() => {
    const classesQuery = query(collection(db, 'classes'), limit(80));
    const retreatsQuery = query(collection(db, 'retreats'), limit(6));
    const blogQuery = query(
      collection(db, 'blog'),
      orderBy('createdAt', 'desc'),
      limit(2)
    );
    const unsubClasses = onSnapshot(classesQuery, (snapshot) => {
      const normalizedClasses = snapshot.docs.map((classDoc) =>
        normalizeClassItem(classDoc.id, classDoc.data() as Record<string, unknown>)
      );
      const latestOffline = normalizedClasses
        .filter((item) => item.type === 'offline')
        .sort((a, b) => getCreatedAtSeconds(b) - getCreatedAtSeconds(a))
        .slice(0, 6);
      const latestOnline = normalizedClasses
        .filter((item) => item.type === 'online' || Boolean(item.videoUrl))
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 3);

      setOfflineClasses(latestOffline);
      setOnlineClasses(latestOnline);
      setLoadingOffline(false);
      setLoadingOnline(false);
      setOfflineError(false);
      setOnlineError(false);
    }, (error) => {
      console.error('Failed to load classes:', error);
      setOfflineClasses([]);
      setOnlineClasses([]);
      setLoadingOffline(false);
      setLoadingOnline(false);
      setOfflineError(true);
      setOnlineError(true);
    });

    const unsubBlogs = onSnapshot(blogQuery, (snapshot) => {
      const items = snapshot.docs.map((blogDoc) => normalizeBlogItem(blogDoc.id, blogDoc.data()));
      setBlogs(items);
      setLoadingBlogs(false);
      setBlogError(false);
    }, (error) => {
      console.error('Failed to load blogs:', error);
      setBlogs([]);
      setLoadingBlogs(false);
      setBlogError(true);
    });

    const unsubRetreats = onSnapshot(retreatsQuery, (snapshot) => {
      const items = snapshot.docs
        .map((retreatDoc) => ({
          data: retreatDoc.data(),
          item: normalizeRetreatItem(retreatDoc.id, retreatDoc.data()),
        }))
        .sort((a, b) => getCreatedAtSeconds(b?.data) - getCreatedAtSeconds(a?.data))
        .slice(0, 6)
        .map((entry) => entry.item);
      setRetreats(items);
      setLoadingRetreats(false);
      setRetreatError(false);
    }, (error) => {
      console.error('Failed to load retreats:', error);
      setRetreats([]);
      setLoadingRetreats(false);
      setRetreatError(true);
    });

    return () => {
      unsubClasses();
      unsubBlogs();
      unsubRetreats();
    };
  }, []);

  useEffect(() => {
    const galleryQuery = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'), limit(16));
    const unsubGallery = onSnapshot(
      galleryQuery,
      (snapshot) => {
        const rows = snapshot.docs
          .map((docSnap, i) => normalizeHomeGalleryMoment(docSnap.id, docSnap.data(), i))
          .filter((row) => row.url);
        setGalleryMoments(rows);
      },
      (error) => {
        console.error('Failed to load home gallery:', error);
        setGalleryMoments([]);
      }
    );
    return () => unsubGallery();
  }, []);

  useEffect(() => {
    onlineClasses.slice(0, 4).forEach((item) => {
      if (item?.image) {
        const img = new Image();
        img.decoding = 'async';
        img.src = item.image;
      }
    });
  }, [onlineClasses]);

  useEffect(() => {
    galleryMoments.slice(0, 12).forEach((item) => {
      if (item?.url) {
        const img = new Image();
        img.src = item.url;
      }
    });
  }, [galleryMoments]);

  const mindfulnessItem = blogs.find((item) => String(item.category || '').toLowerCase().includes('mindful')) || blogs[0];
  const featuredItems = {
    classes: {
      id: offlineClasses[0]?.id || 'feature-classes',
      title: 'Студийн хичээлүүд',
      description:
        'Өдрийн хуваарь, багш нар, түвшин болон хичээлийн төрлөөр шүүж өөрт тохирох хичээлээ сонгоно уу. Бүх жагсаалт, дэлгэрэнгүй мэдээллийг «Хичээлүүд» хуудаснаас үзээрэй.',
      image: offlineClasses[0]?.image || 'https://picsum.photos/seed/classes-feature/1600/900',
      meta: 'Хичээлүүд хуудас руу →',
      path: '/classes',
    },
    videos: {
      id: onlineClasses[0]?.id || 'feature-videos',
      title: 'Онлайн видео сан',
      description:
        'Гэрээсээ эсвэл хаанаас ч хүссэн цагтаа йог, бясалгалын видео хичээлүүдийг үзээрэй. Бүх контентыг «Онлайн сан» хуудаснаас сонгоно уу.',
      image: onlineClasses[0]?.image || 'https://picsum.photos/seed/videos-feature/1600/900',
      meta: 'Онлайн сан руу →',
      path: '/online',
    },
    retreats: {
      id: retreats[0]?.id || 'feature-retreats',
      title: 'Ретрит аяллууд',
      description:
        'Байгаль, чимээгүй орчинд төвлөрөн амрах, багшийн удирдлага дор практик хийх боломж. Огноо, байршил, үнийн мэдээллийг «Ретритүүд» хуудаснаас үзээрэй.',
      image: retreats[0]?.image || 'https://picsum.photos/seed/retreats-feature/1600/900',
      meta: 'Ретритүүд хуудас руу →',
      path: '/retreats',
    },
    mindfulness: {
      id: mindfulnessItem?.id || 'feature-mindfulness',
      title: 'Майндфүлнэс',
      description:
        'Өдөр тутмын амьдралд майндфүлнэсийг хэрхэн хэрэгжүүлэх талаар зөвлөгөө, практик. Дэлгэрэнгүй агуулгыг «Майндфүлнэс» хуудаснаас уншина уу.',
      image: mindfulnessItem?.image || 'https://picsum.photos/seed/mindfulness-feature/1600/900',
      meta: 'Майндфүлнэс хуудас руу →',
      path: '/mindfulness',
    },
  };
  const currentFeature = featuredItems[activeFeatureTab];
  const isCurrentFeatureLoading = (
    (activeFeatureTab === 'classes' && loadingOffline) ||
    (activeFeatureTab === 'videos' && loadingOnline) ||
    (activeFeatureTab === 'retreats' && loadingRetreats) ||
    (activeFeatureTab === 'mindfulness' && loadingBlogs)
  );
  const isCurrentFeatureError = (
    (activeFeatureTab === 'classes' && offlineError) ||
    (activeFeatureTab === 'videos' && onlineError) ||
    (activeFeatureTab === 'retreats' && retreatError) ||
    (activeFeatureTab === 'mindfulness' && blogError)
  );
  const displayGalleryMoments =
    galleryMoments.length > 0 ? galleryMoments : FALLBACK_GALLERY_MOMENTS;

  return (
    <div className="w-full">
      <Hero />
      
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16 mx-auto text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-serif mb-6 text-brand-ink"
            >
              Манай хичээлүүд
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-lg text-brand-ink/60 font-light leading-relaxed"
            >
              Доорх чиглүүлэгээр студийн хичээл, онлайн видео сан, ретрит, майндфүлнэс хуудас руу шилжиж, өөрт тохирох сонголтоо хийгээрэй.
            </motion.p>
          </div>

          {isCurrentFeatureLoading ? (
            <div className="space-y-8">
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-10 w-32 rounded-full bg-gray-100 animate-pulse" />
                ))}
              </div>
              <div className="w-full h-[600px] rounded-3xl bg-gray-100 animate-pulse" />
            </div>
          ) : isCurrentFeatureError ? (
            <p className="text-center text-brand-ink/60 py-10">Агуулга ачаалахад түр саатал гарлаа. Дахин оролдоно уу.</p>
          ) : (
            <>
              {/* Class Tabs */}
              <div className="flex flex-wrap justify-center gap-4 mb-16">
                {[
                  { id: 'classes', label: 'Хичээлүүд' },
                  { id: 'videos', label: 'Видео сан' },
                  { id: 'retreats', label: 'Ретритүүд' },
                  { id: 'mindfulness', label: 'Майндфүлнэс' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveFeatureTab(tab.id as 'classes' | 'videos' | 'retreats' | 'mindfulness')}
                    className={`px-8 py-3 rounded-full text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 ${
                      activeFeatureTab === tab.id
                        ? 'bg-brand-ink text-white shadow-lg shadow-brand-ink/20'
                        : 'bg-transparent text-brand-ink/40 hover:text-brand-ink'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Single Interactive Image */}
              <div className="relative w-full h-[600px] rounded-3xl overflow-hidden group">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${activeFeatureTab}-${currentFeature?.id}`}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0"
                  >
                    {currentFeature?.image ? (
                      <img
                        src={currentFeature.image}
                        alt={currentFeature.title || ''}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                      />
                    ) : null}
                    {/* Overlay Gradient */}
                    <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-brand-ink/80 via-brand-ink/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
                    
                    {/* Details Overlay */}
                    <div className="absolute inset-0 z-[3] flex flex-col md:flex-row items-end justify-between p-10 md:p-16 gap-8">
                      <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="max-w-xl"
                      >
                        <h3 className="text-2xl md:text-4xl font-serif text-white mb-4">
                          {currentFeature?.title}
                        </h3>
                        <p className="text-sm md:text-base text-white/80 font-light leading-relaxed mb-4">
                          {currentFeature?.description}
                        </p>
                        <p className="text-xs md:text-sm text-white/70 font-light leading-relaxed">
                          {currentFeature?.meta || '—'}
                        </p>
                      </motion.div>
                      
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Link
                          to={
                            activeFeatureTab === 'videos'
                              ? premiumLibraryPath
                              : currentFeature?.path || '/classes'
                          }
                        >
                          <Button className="w-12 h-12 rounded-full bg-white text-brand-ink hover:bg-brand-icon hover:text-white transition-all duration-500 shadow-2xl group/btn p-0">
                            <ArrowRight size={16} className="transition-transform duration-500 group-hover/btn:translate-x-1" />
                          </Button>
                        </Link>
                      </motion.div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </section>
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-24 mx-auto text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-serif mb-6 text-brand-ink"
            >
              Яагаад Juju гэж?
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-lg text-brand-ink/60 font-light leading-relaxed"
            >
              Бид таныг өөрийгөө нээж, дотоод амар амгалангаа олоход тань туслах хамгийн таатай орчин, мэргэжлийн багш нарыг санал болгож байна.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
            {[
              { 
                title: 'Мэргэжлийн багш нар', 
                desc: 'Олон улсын эрхтэй, туршлагатай багш нар танд зөв техникийг зааж өгнө.',
                icon: Star
              },
              { 
                title: 'Таатай орчин', 
                desc: 'Сэтгэл амар амгалан байх хамгийн тохилог, цэвэрхэн орчинг бүрдүүлсэн.',
                icon: MapPin
              },
              { 
                title: 'Хамт олон', 
                desc: 'Ижил зорилготой, найрсаг хамт олон таныг үргэлж дэмжих болно.',
                icon: Users
              },
              { 
                title: 'Цогц хөтөлбөр', 
                desc: 'Бие болон сэтгэл зүйн эрүүл мэндэд чиглэсэн олон талт хичээлүүд.',
                icon: Clock
              }
            ].map((feature, idx) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="text-left group"
              >
                <div className="flex flex-col items-start">
                  <div className="w-16 h-16 rounded-full bg-white border border-secondary/20 text-brand-icon flex items-center justify-center mb-8 shadow-xl shadow-brand-icon/5">
                    <feature.icon size={28} />
                  </div>
                  <h3 className="text-xl font-serif mb-4 text-brand-ink">{feature.title}</h3>
                  <p className="text-sm text-brand-ink/60 font-light leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <h2 className="text-4xl md:text-5xl font-serif mb-8 text-brand-ink leading-tight">
                Oxford Mindfulness
              </h2>

              <div className="space-y-6 text-base text-brand-ink/60 font-light leading-relaxed max-w-xl">
                <p>
                  Oxford Mindfulness Foundation (OMF) нь Оксфордын Их Сургуулийн Сэтгэл Судлалын Тэнхимтэй хамтран ажилладаг дэлхийд хүлээн зөвшөөрөгдсөн байгууллага юм.
                </p>
                <p>
                  Бид Оксфордын хөтөлбөрийг албан ёсны эрхтэйгээр, шинжлэх ухааны үндэслэлтэйгээр зааж, таныг сэтгэл зүйн хувьд эрүүл, амар амгалан байхад тань тусалдаг.
                </p>
              </div>

              <div className="mt-12">
                <Link to="/mindfulness">
                  <Button variant="link" className="p-0 h-auto text-[11px] font-black tracking-[0.2em] uppercase text-brand-ink hover:text-brand-ink/80 transition-colors group">
                    Дэлгэрэнгүй мэдээлэл
                    <ArrowRight size={14} className="ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative aspect-square lg:aspect-auto lg:h-[500px] rounded-2xl overflow-hidden grayscale hover:grayscale-0 transition-all duration-1000"
            >
              <img
                src="https://images.unsplash.com/photo-1518199266791-5375a83190b7?auto=format&fit=crop&q=80&w=1200"
                alt="Mindfulness Practice"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </motion.div>
          </div>
        </div>
      </section>
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-20 mx-auto text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-serif mb-6 text-brand-ink"
            >
              Сүүлийн үеийн мэдээ
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-lg text-brand-ink/60 font-light leading-relaxed"
            >
              Манай студийн шинэ мэдээ мэдээлэл, нийтлэлүүдтэй танилцаарай.
            </motion.p>
          </div>

          {loadingBlogs ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              {[1, 2].map((item) => (
                <div key={item} className="space-y-4">
                  <div className="aspect-[16/10] rounded-2xl bg-gray-100 animate-pulse" />
                  <div className="h-8 rounded bg-gray-100 animate-pulse" />
                  <div className="h-16 rounded bg-gray-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : blogError ? (
            <p className="text-center text-brand-ink/60 py-10">Unable to load blog posts right now.</p>
          ) : blogs.length === 0 ? (
            <p className="text-center text-brand-ink/60 py-10">No blog posts available</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              {blogs.map((news, idx) => (
                <motion.div
                  key={news.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  viewport={{ once: true }}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-8 shadow-2xl shadow-brand-ink/5 group-hover:shadow-brand-ink/10 group-hover:-translate-y-2 transition-all duration-500">
                    <img
                      src={news.image}
                      alt={news.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-serif mb-4 text-brand-ink group-hover:text-primary transition-colors duration-300">
                    {news.title}
                  </h3>
                  <p className="text-base text-brand-ink/60 font-light leading-relaxed mb-8">
                    {news.description || 'Нийтлэлийн тайлбар удахгүй нэмэгдэнэ.'}
                  </p>
                  <Link to="/blog">
                    <Button variant="link" className="p-0 h-auto text-[11px] font-black tracking-[0.2em] uppercase text-brand-ink hover:text-brand-ink/80 transition-colors group/btn">
                      Дэлгэрэнгүй үзэх
                      <ArrowRight size={14} className="ml-2 transition-transform group-hover/btn:translate-x-1" />
                    </Button>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-20 mx-auto text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-serif mb-6 text-brand-ink"
            >
              Онлайн хичээлүүд
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-lg text-brand-ink/60 font-light leading-relaxed"
            >
              Хүссэн газраасаа, хүссэн цагтаа хичээллэх боломжтой видео сан.
            </motion.p>
          </div>

          {loadingOnline ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              {[1, 2].map((item) => (
                <div key={item} className="space-y-4">
                  <div className="aspect-[16/10] rounded-2xl bg-gray-100 animate-pulse" />
                  <div className="h-8 rounded bg-gray-100 animate-pulse" />
                  <div className="h-16 rounded bg-gray-100 animate-pulse" />
                </div>
              ))}
            </div>
          ) : onlineError ? (
            <p className="text-center text-brand-ink/60 py-10">Unable to load online classes right now.</p>
          ) : onlineClasses.length === 0 ? (
            <p className="text-center text-brand-ink/60 py-10">Одоогоор онлайн хичээл байхгүй байна.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {onlineClasses.map((video) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  viewport={{ once: true }}
                  className="group cursor-pointer"
                >
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-8 shadow-2xl shadow-brand-ink/5">
                    <img
                      src={video.image}
                      alt={video.title}
                      className="absolute inset-0 h-full w-full object-cover block"
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                    />
                    <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-brand-ink/85 via-brand-ink/25 to-transparent opacity-70" />
                    <Link to={premiumLibraryPath} className="absolute inset-0 z-[4] flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white">
                        <Play size={24} fill="currentColor" className="ml-1" />
                      </div>
                    </Link>
                    <div className="absolute bottom-6 left-6 right-6 z-[4]">
                      <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black tracking-widest uppercase text-white mb-3">
                        {video.duration || '60 min'}
                      </span>
                      <h3 className="text-2xl font-serif text-white line-clamp-2">
                        {video.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-base text-brand-ink/60 font-light leading-relaxed line-clamp-2">
                    {video.description}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
          
          <div className="mt-20 text-center">
            <Link to={premiumLibraryPath}>
              <Button className="bg-brand-ink text-white hover:bg-brand-icon rounded-full px-12 py-7 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 shadow-xl">
                Бүх видеог үзэх
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16 mx-auto text-center">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-serif mb-6 text-brand-ink"
            >
              Цахим ном & дэвтэр
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-lg text-brand-ink/60 font-light leading-relaxed"
            >
              Йогын хөтөлбөр, бясалгалын тэмдэглэл, цахим ном зэрэг бүтээгдэхүүнийг студиээр дамжуулан худалдан авах боломжтой. Өөрийн дадал, суралцалтаа дэвтэртээ үлдээгээрэй.
            </motion.p>
          </div>

          <div className="relative w-full h-[600px] overflow-hidden rounded-3xl bg-brand-ink group">
            {HOME_SHOP_SLIDES.map((slide, i) => (
              <motion.img
                key={slide.src}
                src={slide.src}
                alt={slide.alt}
                aria-hidden={i !== shopSlideIndex}
                initial={false}
                animate={{ opacity: i === shopSlideIndex ? 1 : 0 }}
                transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            ))}
            <button
              type="button"
              aria-label="Өмнөх зураг"
              onClick={goShopPrev}
              className="absolute left-3 top-1/2 z-[5] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/90 text-brand-ink shadow-lg backdrop-blur-sm transition hover:bg-white md:left-6"
            >
              <ChevronLeft size={26} strokeWidth={2} className="-translate-x-px" />
            </button>
            <button
              type="button"
              aria-label="Дараагийн зураг"
              onClick={goShopNext}
              className="absolute right-3 top-1/2 z-[5] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/90 text-brand-ink shadow-lg backdrop-blur-sm transition hover:bg-white md:right-6"
            >
              <ChevronRight size={26} strokeWidth={2} className="translate-x-px" />
            </button>
            <div className="pointer-events-none absolute left-6 top-6 z-[3] md:left-10 md:top-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] text-white backdrop-blur-md">
                <BookOpen className="h-4 w-4 text-white/90" strokeWidth={1.75} aria-hidden />
                Дэлгүүр
              </span>
            </div>
            <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-brand-ink/80 via-brand-ink/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-700" />
            <div className="absolute inset-0 z-[3] flex w-full flex-col justify-end p-10 md:p-16">
              <AnimatePresence mode="sync" initial={false}>
                <motion.div
                  key={shopSlideIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="max-w-xl text-left"
                >
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-white/70">
                    Студийн дэлгүүр
                  </p>
                  <h3 className="mb-4 font-serif text-2xl text-white md:text-4xl">
                    {HOME_SHOP_SLIDES[shopSlideIndex].title}
                  </h3>
                  <p className="mb-4 text-sm font-light leading-relaxed text-white/80 md:text-base">
                    {HOME_SHOP_SLIDES[shopSlideIndex].body}
                  </p>
                  <Link
                    to="/contact"
                    className="inline-block text-xs font-light leading-relaxed text-white/90 underline-offset-4 transition hover:text-white hover:underline md:text-sm"
                  >
                    Захиалах ба асуух
                  </Link>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-20 mx-auto text-center">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-sm uppercase tracking-[0.3em] text-brand-ink/40 mb-4 block"
            >
              Visual Story
            </motion.span>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-5xl font-serif mb-6 text-brand-ink"
            >
              Манай студийн агшнууд
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              viewport={{ once: true }}
              className="text-lg text-brand-ink/60 font-light leading-relaxed"
            >
              Студид өрнөж буй өдөр тутмын амьдрал, хичээлүүдийн агшнууд.
            </motion.p>
          </div>

          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {displayGalleryMoments.map((img, idx) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ 
                  delay: idx * 0.1,
                  duration: 0.8,
                  ease: [0.21, 0.45, 0.32, 0.9]
                }}
                viewport={{ once: true }}
                onClick={() => setLightbox({ url: img.url, title: img.title })}
                className="relative group cursor-zoom-in overflow-hidden rounded-2xl bg-white/50 break-inside-avoid"
              >
                <div className={`relative ${img.aspect} overflow-hidden`}>
                  <img
                    src={img.url}
                    alt={img.title}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="pointer-events-none absolute inset-0 z-[2] bg-brand-ink/0 group-hover:bg-brand-ink/10 transition-colors duration-700" />
                  
                  {/* Editorial Label */}
                  <div className="pointer-events-none absolute bottom-6 left-6 z-[2] opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                    <p className="text-white text-sm font-serif italic tracking-wider">{img.title}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <Link to="/gallery">
              <Button variant="link" className="p-0 h-auto text-[11px] font-black tracking-[0.2em] uppercase text-brand-icon hover:text-brand-icon/80 transition-colors group/btn">
                Бүх зургийг үзэх
                <ArrowRight size={14} className="ml-2 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[100] bg-brand-ink/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
          >
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
              className="absolute top-10 right-10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </motion.button>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative flex max-h-[85vh] w-full max-w-6xl items-center justify-center rounded-lg shadow-2xl"
            >
              <div className="relative h-[min(85vh,900px)] w-full min-h-[240px] overflow-hidden rounded-lg">
                <img
                  src={lightbox.url}
                  alt={lightbox.title || 'Gallery'}
                  className="absolute inset-0 h-full w-full object-contain"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
