import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { OnlineContentCard } from '../components/OnlineContentCard';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Search, Play, ArrowLeft, Lock, ChevronsLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { hasActiveSubscription } from '../lib/access';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { getYouTubeVideoId, resolveOnlineContentThumbnail } from '../lib/online-video-thumb';

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const getYouTubeEmbedUrl = (url: string) => {
  const id = getYouTubeVideoId(url);
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : '';
};

const formatDuration = (seconds: number) => {
  const rounded = Math.max(0, Math.round(seconds));
  const hrs = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  if (hrs > 0) return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const ensureYouTubeIframeApi = (): Promise<any> => {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);

  return new Promise((resolve) => {
    const existingScript = document.getElementById('youtube-iframe-api');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve(window.YT);
    };
  });
};

export const OnlineClasses: React.FC = () => {
  const [content, setContent] = useState<any[]>([]);
  const [durationById, setDurationById] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<any | null>(null);
  const [mediaError, setMediaError] = useState('');
  const [filter, setFilter] = useState('All');
  const [teacherFilter, setTeacherFilter] = useState('All');
  const [teachersExpanded, setTeachersExpanded] = useState(false);
  const [teachersHovered, setTeachersHovered] = useState(false);
  const [search, setSearch] = useState('');
  const [accessGateOpen, setAccessGateOpen] = useState(false);
  const { user, profile } = useAuth();
  const allowed = hasActiveSubscription(profile);
  const durationByIdRef = useRef(durationById);
  durationByIdRef.current = durationById;

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'onlineContent'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const firebaseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContent(firebaseData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading online content:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'onlineContent');
      } catch {
        // Keep UI stable even when centralized handler throws.
      }
      setContent([]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!allowed && selectedContent) {
      setSelectedContent(null);
      setMediaError('');
    }
  }, [allowed, selectedContent]);

  const filteredContent = useMemo(
    () =>
      content.filter((item) => {
        const matchesFilter = filter === 'All' || item.category === filter;
        const teacherName = String(item.teacherName || '').trim();
        const matchesTeacher = teacherFilter === 'All' || teacherName === teacherFilter;
        const searchTarget = `${String(item.title || '')} ${teacherName} ${String(item.category || '')}`;
        const matchesSearch = searchTarget
          .toLowerCase()
          .includes(search.toLowerCase());
        return matchesFilter && matchesTeacher && matchesSearch;
      }),
    [content, filter, teacherFilter, search]
  );

  const teacherOptions = useMemo(() => {
    const unique = Array.from(
      new Set(
        content
          .map((item) => String(item?.teacherName || '').trim())
          .filter(Boolean)
      )
    );
    return ['All', ...unique];
  }, [content]);
  const showTeacherOptions = teachersExpanded || teachersHovered;

  useEffect(() => {
    let cancelled = false;

    const loadDurations = async () => {
      if (!allowed) return;
      const candidates = content.filter(
        (item) => !item.duration && getYouTubeVideoId(String(item.mediaURL || ''))
      );
      if (candidates.length === 0) return;

      try {
        const YT = await ensureYouTubeIframeApi();
        for (const item of candidates) {
          if (cancelled) break;
          if (durationByIdRef.current[item.id]) continue;
          const videoId = getYouTubeVideoId(String(item.mediaURL || ''));
          if (!videoId) continue;

          await new Promise<void>((resolve) => {
            const mount = document.createElement('div');
            mount.style.position = 'fixed';
            mount.style.left = '-99999px';
            mount.style.top = '0';
            document.body.appendChild(mount);

            const player = new YT.Player(mount, {
              videoId,
              events: {
                onReady: (event: any) => {
                  const finalize = () => {
                    const seconds = event?.target?.getDuration?.() || 0;
                    if (!cancelled && seconds > 0) {
                      setDurationById((prev) =>
                        prev[item.id] ? prev : { ...prev, [item.id]: formatDuration(seconds) }
                      );
                    }
                    event?.target?.destroy?.();
                    mount.remove();
                    resolve();
                  };
                  window.setTimeout(finalize, 400);
                },
                onError: () => {
                  player?.destroy?.();
                  mount.remove();
                  resolve();
                },
              },
            });
          });
        }
      } catch (error) {
        console.error('Failed to auto-load YouTube durations:', error);
      }
    };

    loadDurations();
    return () => {
      cancelled = true;
    };
  }, [content, allowed]);

  const normalizedContent = useMemo(
    () =>
      filteredContent.map((item) => ({
        ...item,
        duration: item.duration || durationById[item.id] || '',
        thumbnailURL: resolveOnlineContentThumbnail(item),
      })),
    [filteredContent, durationById]
  );

  useEffect(() => {
    // Warm browser cache for above-the-fold thumbnails.
    const urls = normalizedContent
      .slice(0, 12)
      .map((item) => item.thumbnailURL)
      .filter(Boolean);

    urls.forEach((url) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    });
  }, [normalizedContent]);

  const selectedMediaUrl = (selectedContent?.mediaURL || '').trim();
  const selectedEmbedUrl = getYouTubeEmbedUrl(selectedMediaUrl);

  return (
    <div className="pt-32 pb-20 min-h-screen bg-white">
      <Dialog open={accessGateOpen} onOpenChange={setAccessGateOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-brand-ink/10 p-8">
          <DialogHeader className="text-left gap-3">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/35 text-brand-icon">
              <Lock size={22} strokeWidth={1.75} />
            </div>
            <DialogTitle className="font-serif text-2xl text-brand-ink">
              {!user ? 'Нэвтэрнэ үү' : 'Гишүүнчлэл шаардлагатай'}
            </DialogTitle>
            <DialogDescription className="text-brand-ink/60 font-light leading-relaxed">
              {!user
                ? 'Видео хичээлүүдийг үзэхийн тулд эхлээд нэвтэрч, дараа нь идэвхтэй гишүүнчлэлтэй байна уу.'
                : 'Энэхүү контентыг үзэхийн тулд гишүүнчлэлээ идэвхжүүлнэ үү.'}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            {!user && (
              <Link to="/login" className="sm:mr-auto" onClick={() => setAccessGateOpen(false)}>
                <Button variant="outline" className="w-full rounded-full px-8 sm:w-auto text-[11px] font-black tracking-[0.15em] uppercase">
                  Нэвтрэх
                </Button>
              </Link>
            )}
            <Link to="/pricing" onClick={() => setAccessGateOpen(false)}>
              <Button className="w-full rounded-full bg-brand-ink px-8 text-white hover:bg-brand-icon sm:w-auto text-[11px] font-black tracking-[0.15em] uppercase shadow-lg">
                Гишүүнчлэл үзэх
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4">
        <AnimatePresence mode="wait">
          {selectedContent && allowed ? (
            <motion.div
              key="player"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <button 
                onClick={() => {
                  setSelectedContent(null);
                  setMediaError('');
                }}
                className="inline-flex items-center text-brand-ink/60 hover:text-brand-ink transition-colors group"
              >
                <ArrowLeft size={20} className="mr-2 transition-transform group-hover:-translate-x-1" />
                Сан руу буцах
              </button>

              <div className="aspect-video w-full bg-brand-ink rounded-[2rem] overflow-hidden shadow-2xl shadow-brand-ink/20">
                {selectedEmbedUrl ? (
                  <iframe
                    src={selectedEmbedUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title={`${selectedContent?.title || 'Online class'} player`}
                  />
                ) : selectedMediaUrl ? (
                  <video
                    src={selectedMediaUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-cover"
                    onError={() => setMediaError('Видео ачаалахад алдаа гарлаа. URL-аа шалгана уу.')}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/70">
                    Медиа URL олдсонгүй
                  </div>
                )}
              </div>
              {mediaError && (
                <p className="text-sm text-red-500">{mediaError}</p>
              )}

              <div className="max-w-4xl">
                <div className="flex items-center gap-4 mb-8">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-icon">
                    {selectedContent.category === 'Yoga' ? 'Йог' : 'Бясалгал'}
                  </span>
                </div>
                <h1 className="text-5xl font-serif text-brand-ink mb-8 leading-tight">{selectedContent.title}</h1>
                <p className="text-lg text-brand-ink/60 font-light leading-relaxed mb-12">
                  {selectedContent.description}
                </p>
                
                <div className="bg-gray-50 p-10 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 border border-brand-ink/5">
                  <div className="w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center text-brand-icon shrink-0">
                    <Play size={24} fill="currentColor" className="ml-1" />
                  </div>
                  <div>
                    <h4 className="text-xl font-serif text-brand-ink mb-2">Мэргэжлийн багш нарын удирдамж</h4>
                    <p className="text-brand-ink/60 font-light leading-relaxed">
                      Манай багш нар майндфүлнэс болон йогийн чиглэлээр олон жилийн туршлагатай мэргэжилтнүүд юм. Таны аялалыг чиглүүлэхдээ бид баяртай байх болно.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col items-center text-center gap-12 mb-20">
                <div className="max-w-3xl">
                  <h1 className="text-4xl md:text-5xl font-serif text-brand-ink mb-6 leading-tight">Онлайн сан</h1>
                  <p className="text-lg text-brand-ink/60 font-light leading-relaxed">
                    Таны хэрэгцээнд тохирсон төрөл бүрийн йогийн хичээлүүдийг санал болгож байна
                  </p>
                </div>
                
                <div className="flex flex-wrap justify-center gap-4">
                  {[
                    { id: 'All', label: 'Бүгд' },
                    { id: 'Yoga', label: 'Йог' },
                    { id: 'Meditation', label: 'Бясалгал' }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFilter(cat.id)}
                      className={`px-8 py-3 rounded-full text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500 focus:outline-none ${
                        filter === cat.id 
                          ? 'bg-brand-ink text-white shadow-lg shadow-brand-ink/20' 
                          : 'bg-transparent text-brand-ink/40 hover:text-brand-ink'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div
                  className="flex flex-col items-center gap-3"
                  onMouseEnter={() => setTeachersHovered(true)}
                  onMouseLeave={() => setTeachersHovered(false)}
                >
                  <button
                    type="button"
                    onClick={() => setTeachersExpanded((prev) => !prev)}
                    className={`group inline-flex items-center overflow-hidden rounded-full border border-brand-ink/10 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-brand-ink transition-all duration-300 hover:w-[220px] hover:bg-secondary/20 ${
                      showTeacherOptions ? 'w-[220px] shadow-md shadow-brand-ink/10' : 'w-[158px]'
                    }`}
                  >
                    <ChevronsLeftRight
                      size={14}
                      className={`shrink-0 transition-transform duration-300 ${showTeacherOptions ? 'rotate-90 text-brand-icon' : 'text-brand-ink/60 group-hover:rotate-90'}`}
                    />
                    <span className="ml-2 whitespace-nowrap">All Teachers</span>
                    <span
                      className={`ml-2 overflow-hidden whitespace-nowrap text-[9px] font-semibold tracking-[0.14em] normal-case text-brand-ink/45 transition-all duration-300 ${
                        showTeacherOptions ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100'
                      }`}
                    >
                      {teachersExpanded ? 'click to collapse' : 'click to expand'}
                    </span>
                  </button>

                  {showTeacherOptions ? teacherOptions.map((teacherName) => (
                    <button
                      key={teacherName}
                      onClick={() => setTeacherFilter(teacherName)}
                      className={`px-5 py-2 rounded-full text-[10px] font-black tracking-[0.16em] uppercase transition-all duration-300 focus:outline-none ${
                        teacherFilter === teacherName
                          ? 'bg-brand-icon text-white shadow-md shadow-brand-icon/20'
                          : 'bg-secondary/30 text-brand-ink/50 hover:text-brand-ink'
                      }`}
                    >
                      {teacherName === 'All' ? 'Бүх багш' : teacherName}
                    </button>
                  )) : null}
                </div>
              </div>

              <div className="relative mb-16 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-ink/20 group-focus-within:text-brand-ink transition-colors duration-500" size={24} />
                <Input 
                  placeholder="Хичээл, багш эсвэл төрлөөр хайх..." 
                  className="pl-16 py-8 rounded-[1.5rem] border-brand-ink/5 bg-gray-50 focus:bg-white focus:ring-0 focus-visible:ring-0 focus:border-transparent transition-all duration-500 text-lg font-light text-brand-ink/40 focus:text-brand-ink placeholder:text-brand-ink/20 outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="space-y-6 animate-pulse">
                      <div className="aspect-video bg-gray-100 rounded-[2rem]" />
                      <div className="space-y-3">
                        <div className="h-4 bg-gray-100 rounded w-1/4" />
                        <div className="h-6 bg-gray-100 rounded w-3/4" />
                        <div className="h-4 bg-gray-100 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : normalizedContent.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  <AnimatePresence mode="popLayout">
                    {normalizedContent.map((item, index) => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                      >
                        <OnlineContentCard 
                          content={item} 
                          priority={index < 8}
                          accessLocked={!allowed}
                          onClick={() => {
                            if (!allowed) {
                              setAccessGateOpen(true);
                              return;
                            }
                            setMediaError('');
                            setSelectedContent(item);
                          }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-32 bg-gray-50 rounded-[3rem] border border-brand-ink/5">
                  <p className="text-brand-ink/30 text-xl font-serif">Таны хайлтанд тохирох хичээл олдсонгүй.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
