import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Mail, Calendar, CreditCard, ShieldCheck, LogOut, Users, ClipboardCheck, CheckCircle2, XCircle, CalendarClock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

type TeacherClassSummary = {
  id: string;
  title: string;
  teacher: string;
  duration: string;
  participantCount: number;
  sessionCount: number;
};

export const Profile: React.FC = () => {
  const { user, profile, isSubscribed, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassSummary[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);

  const subscriptionPlanLabel = (() => {
    const plan = String(profile?.subscriptionPlan || '').trim().toLowerCase();
    if (plan === 'online-video') return 'Online Video';
    if (plan === 'online-audio') return 'Online Audio';
    if (plan === 'yearly') return 'Жилийн багц';
    return 'Сарын багц';
  })();

  if (!user) {
    navigate('/');
    return null;
  }

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

    const recompute = () => {
      const displayNameCandidates = new Set(
        [profile?.displayName, user?.displayName]
          .map((name) => String(name || '').trim())
          .filter(Boolean)
          .map((name) => name.toLowerCase())
      );
      const emailCandidate = String(user?.email || '').trim().toLowerCase();

      const matchedTeachers = teachers.filter((teacher) => {
        const teacherName = String(teacher?.name || '').trim().toLowerCase();
        const teacherEmail = String(teacher?.email || '').trim().toLowerCase();
        return (
          String(teacher?.id || '') === user.uid ||
          (teacherEmail && teacherEmail === emailCandidate) ||
          (teacherName && displayNameCandidates.has(teacherName))
        );
      });

      const matchedTeacherIds = new Set(matchedTeachers.map((teacher) => String(teacher?.id || '')));
      const matchedTeacherNames = new Set(
        matchedTeachers.map((teacher) => String(teacher?.name || '').trim().toLowerCase()).filter(Boolean)
      );
      displayNameCandidates.forEach((name) => matchedTeacherNames.add(name));

      const teacherOwnedClasses = classes.filter((classItem) => {
        const classTeacherId = String(classItem?.teacherId || '');
        const classTeacherName = String(classItem?.teacher || '').trim().toLowerCase();
        return (
          classTeacherId === user.uid ||
          matchedTeacherIds.has(classTeacherId) ||
          (classTeacherName && matchedTeacherNames.has(classTeacherName))
        );
      });

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

        const participantKeys = new Set(
          classBookings.map((booking) => {
            return (
              String(booking?.userId || '') ||
              String(booking?.userEmail || '') ||
              String(booking?.id || '')
            );
          })
        );

        return {
          id: classId,
          title: String(classItem?.title || 'Untitled class'),
          teacher: String(classItem?.teacher || profile?.displayName || user?.displayName || 'Багш'),
          duration: String(classItem?.duration || '60 мин'),
          participantCount: participantKeys.size,
          sessionCount: classSchedules.length,
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
      recompute();
    });
    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      bookings = snapshot.docs.map((bookingDoc) => ({ id: bookingDoc.id, ...bookingDoc.data() }));
      recompute();
    });
    return () => {
      unsubTeachers();
      unsubClasses();
      unsubSchedules();
      unsubBookings();
    };
  }, [isTeacher, profile?.displayName, user]);

  return (
    <div className="pt-32 pb-32 min-h-screen bg-gray-50/30">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[3rem] shadow-2xl shadow-brand-ink/5 border border-brand-ink/5 overflow-hidden"
          >
            {/* Profile Header */}
            <div className="bg-brand-ink p-12 text-white relative overflow-hidden">
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
            <div className="p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Subscription Info */}
                <div className="space-y-8">
                  <h3 className="text-xl font-serif text-brand-ink flex items-center gap-3">
                    <CreditCard className="text-brand-icon" size={20} />
                    Гишүүнчлэлийн төлөв
                  </h3>
                  
                  <div className={`p-8 rounded-[2rem] border transition-all duration-500 ${
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
                {isTeacher && (
                  <div className="mb-12 rounded-[2rem] border border-brand-ink/10 p-8">
                    <h3 className="mb-6 flex items-center gap-3 text-xl font-serif text-brand-ink">
                      <ClipboardCheck className="text-brand-icon" size={20} />
                      Багшийн хичээлийн хяналт
                    </h3>

                    {teacherLoading ? (
                      <p className="text-sm text-brand-ink/50">Хичээлийн мэдээлэл ачаалж байна...</p>
                    ) : teacherClasses.length === 0 ? (
                      <p className="text-sm text-brand-ink/50">
                        Танд оноогдсон хичээл олдсонгүй. Админ хэсэгт багштай холболтоо шалгана уу.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-brand-icon/20 bg-brand-icon/5 p-5">
                          <p className="text-sm text-brand-ink/70">
                            Энгийн урсгал: <span className="font-semibold text-brand-ink">1) Хичээл сонгох</span> →{' '}
                            <span className="font-semibold text-brand-ink">2) Ирсэн / Тасалсан</span> →{' '}
                            <span className="font-semibold text-brand-ink">3) Хуваарь засах</span>
                          </p>
                        </div>
                        {teacherClasses.map((classItem) => (
                          <div key={classItem.id} className="rounded-2xl border border-brand-ink/5 p-5">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-lg font-medium text-brand-ink">{classItem.title}</p>
                                <p className="text-xs uppercase tracking-[0.2em] text-brand-ink/40">
                                  {classItem.duration} • {classItem.sessionCount} хуваарь
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="inline-flex items-center gap-2 rounded-full bg-brand-icon/10 px-4 py-2 text-xs font-bold text-brand-icon">
                                  <Users size={14} />
                                  {classItem.participantCount} хүн бүртгэгдсэн
                                </div>
                                <Button
                                  asChild
                                  className="rounded-full bg-green-600 px-5 text-white hover:bg-green-700"
                                >
                                  <Link to={`/teacher/attendance?classId=${classItem.id}`}>
                                    <CheckCircle2 size={14} className="mr-2" />
                                    Ирц (check/cross)
                                  </Link>
                                </Button>
                                <Button
                                  asChild
                                  variant="outline"
                                  className="rounded-full border-red-200 px-5 text-red-600 hover:bg-red-50"
                                >
                                  <Link to={`/teacher/attendance?classId=${classItem.id}`}>
                                    <XCircle size={14} className="mr-2" />
                                    Тасалсан тэмдэглэх
                                  </Link>
                                </Button>
                                <Button
                                  asChild
                                  variant="outline"
                                  className="rounded-full px-5"
                                >
                                  <Link to={`/teacher/schedule?classId=${classItem.id}`}>
                                    <CalendarClock size={14} className="mr-2" />
                                    Хуваарь засах
                                  </Link>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
