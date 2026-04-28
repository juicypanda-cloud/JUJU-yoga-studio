import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { User, Mail, Calendar, CreditCard, ShieldCheck, LogOut, ClipboardCheck, CalendarClock, ClipboardList } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  Timestamp,
  updateDoc,
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

export const Profile: React.FC = () => {
  const { user, profile, isSubscribed, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassSummary[]>([]);
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleClassId, setScheduleClassId] = useState('');
  const [scheduleDay, setScheduleDay] = useState('Даваа');
  const [scheduleStart, setScheduleStart] = useState('08:00');
  const [scheduleEnd, setScheduleEnd] = useState('09:00');
  const [scheduleRoom, setScheduleRoom] = useState('Main Hall');
  const [existingScheduleId, setExistingScheduleId] = useState<string | null>(null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
  const [rosterClassId, setRosterClassId] = useState('');
  const [rosterOverride, setRosterOverride] = useState<Record<string, RosterAttendance>>({});
  const [rosterSavingKey, setRosterSavingKey] = useState<string>('');

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
          const firstName = String(b?.userFirstName || '').trim();
          const lastName = String(b?.userLastName || '').trim();
          const fullName = `${firstName} ${lastName}`.trim();
          const name = String(
            fullName || b?.userName || b?.displayName || b?.name || b?.studentName || 'Суралцагч'
          ).trim();
          const email = String(b?.userEmail || b?.email || '').trim();
          const existing = rosterByKey.get(key);
          if (!existing) {
            rosterByKey.set(key, {
              name: name || 'Суралцагч',
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

  useEffect(() => {
    if (!scheduleDialogOpen || !scheduleClassId) return;
    const slot = scheduleRows.find(
      (row) =>
        String(row.classId || '') === scheduleClassId &&
        String(row.dayOfWeek || '') === scheduleDay
    );
    if (slot) {
      setExistingScheduleId(slot.id);
      setScheduleStart(String(slot.startTime || '08:00'));
      setScheduleEnd(String(slot.endTime || '09:00'));
      setScheduleRoom(String(slot.room || 'Main Hall'));
    } else {
      setExistingScheduleId(null);
      setScheduleStart('08:00');
      setScheduleEnd('09:00');
      setScheduleRoom('Main Hall');
    }
  }, [scheduleDialogOpen, scheduleClassId, scheduleDay, scheduleRows]);

  const openScheduleDialog = (presetClassId: string) => {
    setScheduleClassId(presetClassId);
    setScheduleDay('Даваа');
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
            attendanceUpdatedAt: Timestamp.now(),
            attendanceUpdatedBy: user.uid,
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
      const payload = {
        classId: scheduleClassId,
        className: cls.title,
        teacherName: cls.teacher,
        teacherId,
        dayOfWeek: scheduleDay,
        startTime: scheduleStart,
        endTime: scheduleEnd,
        room: scheduleRoom,
        updatedAt: Timestamp.now(),
      };
      if (existingScheduleId) {
        await updateDoc(doc(db, 'schedule', existingScheduleId), payload);
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
                      Миний бүртгэл
                    </h3>

                    {teacherLoading ? (
                      <p className="text-sm text-brand-ink/50">Хичээлийн мэдээлэл ачаалж байна...</p>
                    ) : teacherClasses.length === 0 ? (
                      <p className="text-sm text-brand-ink/50">
                        Танд оноогдсон хичээл олдсонгүй. Админ хэсэгт багштай холболтоо шалгана уу.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
                          <DialogContent className="sm:max-w-md rounded-[2rem] p-6 sm:p-8" showCloseButton>
                            <DialogHeader>
                              <DialogTitle className="font-serif text-2xl text-brand-ink">Хуваарь засах</DialogTitle>
                              <DialogDescription className="text-brand-ink/60">
                                Хичээл, өдөр сонгоод цагийг өөрчлөнө үү.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-2">
                              <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Хичээл</label>
                                <select
                                  value={scheduleClassId}
                                  onChange={(e) => setScheduleClassId(e.target.value)}
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
                                <label className="text-xs font-black uppercase tracking-widest text-brand-ink/40">Өдөр</label>
                                <select
                                  value={scheduleDay}
                                  onChange={(e) => setScheduleDay(e.target.value)}
                                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
                                >
                                  {WEEK_DAYS.map((day) => (
                                    <option key={day} value={day}>
                                      {day}
                                    </option>
                                  ))}
                                </select>
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
                                      <span
                                        className={`mr-2 shrink-0 text-xs font-black uppercase tracking-wider ${
                                          effectiveAttendance === 'present'
                                            ? 'text-emerald-700'
                                            : effectiveAttendance === 'absent'
                                              ? 'text-red-600'
                                              : 'text-brand-ink/40'
                                        }`}
                                      >
                                        {effectiveAttendance === 'present'
                                          ? 'Ирсэн'
                                          : effectiveAttendance === 'absent'
                                            ? 'Ирээгүй'
                                            : 'Ирц бүртгэгдээгүй'}
                                      </span>
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
