import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ChevronsLeftRight, Clock } from 'lucide-react';
import { classData as staticClassData } from '../data/classes';
import { collection, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { ErrorBoundary } from '../components/ErrorBoundary';
import type { ClassItem as BaseClassItem } from '../types/class';

type ScheduleSlot = {
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
};

type RawClassItem = {
  id?: string;
  title?: string;
  image?: string;
  category?: string;
  teacherId?: string;
  teacher?: string;
  scheduleSlots?: ScheduleSlot[];
  duration?: string;
  type?: 'offline' | 'online' | 'audio';
  videoUrl?: string;
  audioUrl?: string;
  createdAt?: any;
};

type ClassItem = BaseClassItem & {
  category: string;
  scheduleDays: string[];
  duration: string;
  teacherId: string;
  teacherName: string;
};

const CLASS_FALLBACK_IMAGE = 'https://picsum.photos/seed/class-fallback/1200/800';

const normalizeScheduleDays = (item: RawClassItem): string[] => {
  const slots = Array.isArray(item?.scheduleSlots) ? item.scheduleSlots : [];
  return slots
    .map((slot) => (typeof slot?.dayOfWeek === 'string' ? slot.dayOfWeek.trim() : ''))
    .filter(Boolean);
};

const normalizeClassItem = (raw: RawClassItem, fallbackId: string): ClassItem => ({
  id: typeof raw?.id === 'string' ? raw.id : fallbackId,
  title: typeof raw?.title === 'string' ? raw.title : 'Untitled class',
  type: raw?.type === 'online' || raw?.type === 'audio' ? raw.type : 'offline',
  image: typeof raw?.image === 'string' ? raw.image : CLASS_FALLBACK_IMAGE,
  videoUrl: typeof raw?.videoUrl === 'string' ? raw.videoUrl : undefined,
  audioUrl: typeof raw?.audioUrl === 'string' ? raw.audioUrl : undefined,
  createdAt: raw?.createdAt,
  category: typeof raw?.category === 'string' ? raw.category : 'Class',
  teacherId: typeof raw?.teacherId === 'string' ? raw.teacherId : '',
  teacherName: typeof raw?.teacher === 'string' ? raw.teacher : 'Багш',
  scheduleDays: normalizeScheduleDays(raw),
  duration: typeof raw?.duration === 'string' ? raw.duration : '60 min',
});

export const Classes: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState(searchParams.get('category') || 'All');
  const [teacherFilter, setTeacherFilter] = useState('All');
  const [teachersExpanded, setTeachersExpanded] = useState(false);
  const [teachersHovered, setTeachersHovered] = useState(false);
  const [registeredTeachers, setRegisteredTeachers] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const q = query(collection(db, 'classes'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const firestoreClasses = querySnapshot.docs.map((classDoc) =>
          normalizeClassItem({ id: classDoc.id, ...(classDoc.data() as RawClassItem) }, classDoc.id)
        );

        const normalizedData =
          firestoreClasses.length > 0
            ? firestoreClasses
            : (staticClassData as RawClassItem[]).map((item, index) =>
                normalizeClassItem({ ...item, id: String(item?.id || `static-${index}`) }, `static-${index}`)
              );

        setClasses(normalizedData);
      } catch (error) {
        console.error('Error fetching classes:', error);
        setClasses((staticClassData as RawClassItem[]).map((item, index) =>
          normalizeClassItem({ ...item, id: String(item?.id || `static-${index}`) }, `static-${index}`)
        ));
      } finally {
        setLoading(false);
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const names = Array.from(
        new Set(
          snapshot.docs
            .map((teacherDoc) => String((teacherDoc.data() as Record<string, unknown>)?.name || '').trim())
            .filter(Boolean)
        )
      );
      setRegisteredTeachers(names);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setFilter(category);
    } else {
      setFilter('All');
    }

    const teacher = String(searchParams.get('teacher') || '').trim();
    if (teacher) {
      setTeacherFilter(teacher);
      setTeachersExpanded(true);
    } else {
      setTeacherFilter('All');
    }
  }, [searchParams]);

  const filteredClasses = useMemo(
    () =>
      (classes || []).filter((item) => {
        const matchesCategory = filter === 'All' || item?.category === filter;
        const normalizedTeacher = String(item?.teacherName || '').trim();
        const matchesTeacher = teacherFilter === 'All' || normalizedTeacher === teacherFilter;
        return matchesCategory && matchesTeacher;
      }),
    [classes, filter, teacherFilter]
  );

  const teacherOptions = useMemo(() => {
    const unique = [...registeredTeachers];
    return ['All', ...unique];
  }, [registeredTeachers]);
  const showTeacherOptions = teachersExpanded || teachersHovered;

  return (
    <ErrorBoundary>
    <div className="pt-32 pb-20 min-h-screen bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-serif mb-6 text-brand-ink">Манай хичээлүүд</h1>
          <p className="text-lg text-brand-ink/60 font-light leading-relaxed mb-10">
            Таны хэрэгцээнд тохирсон төрөл бүрийн йогийн хичээлүүдийг санал болгож байна.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {[
              { id: 'All', label: 'Бүгд' },
              { id: 'Yoga', label: 'Йог' },
              { id: 'Meditation', label: 'Оксфордын майндфүлнэс бясалгал' }
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
            className="mt-5 flex flex-col items-center gap-3"
            onMouseEnter={() => setTeachersHovered(true)}
            onMouseLeave={() => {
              setTeachersHovered(false);
              setTeachersExpanded(false);
            }}
          >
            <button
              type="button"
              onClick={() => setTeachersExpanded((prev) => !prev)}
              className={`inline-flex w-[158px] items-center justify-center rounded-full border border-brand-ink/10 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-brand-ink transition-all duration-300 hover:bg-secondary/20 ${
                showTeacherOptions ? 'shadow-md shadow-brand-ink/10' : ''
              }`}
            >
              <ChevronsLeftRight
                size={14}
                className={`shrink-0 transition-transform duration-300 ${showTeacherOptions ? 'rotate-90 text-brand-icon' : 'text-brand-ink/60'}`}
              />
              <span className="ml-2 whitespace-nowrap">Бүх багш</span>
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

        {loading ? (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="overflow-hidden rounded-3xl border border-brand-ink/[0.06] bg-secondary/30"
              >
                <div className="aspect-[5/4] animate-pulse bg-secondary" />
                <div className="space-y-4 p-6">
                  <div className="h-3 w-16 animate-pulse rounded-full bg-secondary" />
                  <div className="h-7 w-[85%] max-w-[240px] animate-pulse rounded-md bg-secondary" />
                  <div className="flex gap-2 pt-2">
                    <div className="h-7 w-14 animate-pulse rounded-lg bg-secondary" />
                    <div className="h-7 w-14 animate-pulse rounded-lg bg-secondary" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !filteredClasses || filteredClasses.length === 0 ? (
          <p className="py-16 text-center font-light text-brand-ink/50">
            Таны шүүлтэнд тохирох хичээл олдсонгүй.
          </p>
        ) : (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {filteredClasses?.map((item) => {
              const scheduleDays = item?.scheduleDays || [];
              const categoryLabel =
                item?.category === 'Yoga'
                  ? 'Йог'
                  : item?.category === 'Meditation'
                    ? 'Оксфордын майндфүлнэс бясалгал'
                    : item?.category || 'Хичээл';

              return (
              <motion.div
                key={item?.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="h-full"
              >
                <Link to={`/classes/${item?.id}`} className="block h-full">
                  <article className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-brand-ink/[0.07] bg-white shadow-[0_2px_28px_-6px_rgba(26,26,26,0.1)] transition-all duration-500 ease-out hover:-translate-y-1.5 hover:border-brand-ink/12 hover:shadow-[0_24px_56px_-16px_rgba(26,26,26,0.18)]">
                    <div className="relative aspect-[5/4] shrink-0 overflow-hidden bg-secondary/20">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="absolute inset-0 h-full w-full object-cover block"
                        loading="eager"
                        fetchPriority="high"
                        decoding="async"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink/55 via-brand-ink/10 to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-95"
                        aria-hidden
                      />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-start p-4 md:p-5">
                        <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white backdrop-blur-md">
                          {categoryLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-6 md:p-7">
                      <h3 className="font-serif text-xl leading-snug tracking-tight text-brand-ink transition-colors duration-300 group-hover:text-brand-icon md:text-[1.35rem] line-clamp-2">
                        {item?.title || 'Untitled'}
                      </h3>
                      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-ink/45">
                        Багш: {item?.teacherName || 'Багш'}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {scheduleDays.length > 0 ? (
                          scheduleDays.map((day) => (
                            <span
                              key={`${item?.id}-${day}`}
                              className="rounded-lg border border-brand-ink/8 bg-secondary/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-ink/75"
                            >
                              {day}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-lg border border-dashed border-brand-ink/15 bg-transparent px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-brand-ink/35">
                            Хуваарь удахгүй
                          </span>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-brand-ink/[0.06] pt-5">
                        <span className="inline-flex items-center gap-2 text-[11px] font-medium tabular-nums text-brand-ink/45">
                          <Clock size={14} className="shrink-0 text-brand-icon/70" strokeWidth={1.75} />
                          {item?.duration || '60 min'}
                        </span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-ink/8 text-brand-icon transition-all duration-300 group-hover:border-brand-icon/30 group-hover:bg-brand-icon/10">
                          <ArrowUpRight size={16} strokeWidth={2} className="-translate-x-[1px] translate-y-[1px] transition-transform duration-300 group-hover:translate-x-0 group-hover:translate-y-0" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              </motion.div>
            )})}
          </AnimatePresence>
        </div>
        )}
      </div>
    </div>
    </ErrorBoundary>
  );
};
