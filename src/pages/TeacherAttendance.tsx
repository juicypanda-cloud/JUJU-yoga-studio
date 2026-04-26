import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { collection, onSnapshot, Timestamp, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { CheckCircle2, XCircle, Users, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { isFutureClass, isTodayClass, isAttendanceEditableNow, resolveClassStartTime } from '../lib/class-time';

type TeacherClassSummary = {
  id: string;
  title: string;
  teacher: string;
  duration: string;
  participantCount: number;
  sessionCount: number;
  hasEditableSessionNow: boolean;
};

type AttendanceRow = {
  id: string;
  bookingId: string;
  name: string;
  email: string;
  bookingStatus: string;
  attendanceStatus: 'attended' | 'missed' | 'unknown';
  bookedAt: string;
  classStartTime: Date | null;
};

const formatBookedAt = (value: any) => {
  if (!value) return 'Тодорхойгүй';
  if (typeof value?.toDate === 'function') return value.toDate().toLocaleString();
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }
  return 'Тодорхойгүй';
};

export const TeacherAttendance: React.FC = () => {
  const { user, profile, isTeacher, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [teacherClasses, setTeacherClasses] = useState<TeacherClassSummary[]>([]);
  const [attendanceByClass, setAttendanceByClass] = useState<Record<string, AttendanceRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [attendanceOverride, setAttendanceOverride] = useState<Record<string, 'attended' | 'missed'>>({});
  const [selectedClassId, setSelectedClassId] = useState<string | null>(searchParams.get('classId'));

  useEffect(() => {
    if (!user || (!isTeacher && !isAdmin)) return;

    let teachers: any[] = [];
    let classes: any[] = [];
    let schedules: any[] = [];
    let bookings: any[] = [];
    let users: any[] = [];

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

      const userById = new Map(
        users.map((u) => [String(u?.id || ''), { displayName: u?.displayName, email: u?.email }])
      );

      const classSource = isAdmin ? classes : teacherOwnedClasses;

      const nextAttendanceByClass: Record<string, AttendanceRow[]> = {};
      const nextTeacherClasses: TeacherClassSummary[] = classSource.map((classItem) => {
        const classId = String(classItem?.id || '');
        const classSchedules = schedules.filter((slot) => String(slot?.classId || '') === classId);
        const classStartTimes = classSchedules.map((slot) => resolveClassStartTime(slot)).filter(Boolean) as Date[];

        if (!isAdmin) {
          // Backward-compatible fallback: if older schedule docs do not have timestamp start fields yet,
          // keep the class visible so teachers can still view registered students.
          const visibleForTeacher =
            classStartTimes.length === 0 ||
            classStartTimes.some((start) => isTodayClass(start) || isFutureClass(start));
          if (!visibleForTeacher) return null as any;
        }

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

        const attendanceRows: AttendanceRow[] = classBookings.map((booking) => {
          const bookingUserId = String(booking?.userId || '');
          const profileInfo = userById.get(bookingUserId);
          const attendanceStatusRaw = String(booking?.attendanceStatus || '').toLowerCase();
          let attendanceStatus: 'attended' | 'missed' | 'unknown' = 'unknown';
          if (attendanceStatusRaw === 'attended' || attendanceStatusRaw === 'missed') {
            attendanceStatus = attendanceStatusRaw;
          } else if (attendanceStatusRaw === 'present') {
            attendanceStatus = 'attended';
          } else if (attendanceStatusRaw === 'absent') {
            attendanceStatus = 'missed';
          }

          const bookingScheduleId = String(booking?.scheduleId || '');
          const bookingSchedule = classSchedules.find((slot) => String(slot?.id || '') === bookingScheduleId);
          const classStartTime = booking?.classStartTime
            ? resolveClassStartTime({ startAt: booking?.classStartTime })
            : resolveClassStartTime(bookingSchedule || {});

          return {
            id: `${classId}-${String(booking?.id || bookingUserId || Math.random())}`,
            bookingId: String(booking?.id || ''),
            name: String(booking?.userName || profileInfo?.displayName || 'Хэрэглэгч'),
            email: String(booking?.userEmail || profileInfo?.email || '—'),
            bookingStatus: String(booking?.status || 'confirmed'),
            attendanceStatus,
            bookedAt: formatBookedAt(booking?.createdAt),
            classStartTime,
          };
        });

        nextAttendanceByClass[classId] = attendanceRows;

        const participantKeys = new Set(
          attendanceRows.map((row, index) => {
            const booking = classBookings[index];
            return String(booking?.userId || '') || String(booking?.userEmail || '') || row.bookingId;
          })
        );

        return {
          id: classId,
          title: String(classItem?.title || 'Untitled class'),
          teacher: String(classItem?.teacher || profile?.displayName || user?.displayName || 'Багш'),
          duration: String(classItem?.duration || '60 мин'),
          participantCount: participantKeys.size,
          sessionCount: classSchedules.length,
          hasEditableSessionNow: classStartTimes.some((start) => isAttendanceEditableNow(start).editable),
        };
      }).filter(Boolean);

      setTeacherClasses(nextTeacherClasses);
      setAttendanceByClass(nextAttendanceByClass);
      setLoading(false);

      if (!selectedClassId && nextTeacherClasses.length > 0) {
        setSelectedClassId(nextTeacherClasses[0].id);
      }
      if (selectedClassId && !nextTeacherClasses.some((item) => item.id === selectedClassId)) {
        setSelectedClassId(nextTeacherClasses[0]?.id || null);
      }
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
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      users = snapshot.docs.map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }));
      recompute();
    });

    return () => {
      unsubTeachers();
      unsubClasses();
      unsubSchedules();
      unsubBookings();
      unsubUsers();
    };
  }, [isAdmin, isTeacher, profile?.displayName, user]);

  const selectedClass = useMemo(
    () => teacherClasses.find((classItem) => classItem.id === selectedClassId) || null,
    [selectedClassId, teacherClasses]
  );

  const rows = selectedClassId ? attendanceByClass[selectedClassId] || [] : [];

  const markAttendance = async (bookingId: string, status: 'attended' | 'missed') => {
    if (!bookingId) return;
    const row = rows.find((item) => item.bookingId === bookingId);
    const editGuard = isAdmin ? { editable: true } : isAttendanceEditableNow(row?.classStartTime);
    if (!editGuard.editable) {
      toast.error(editGuard.reason || 'Ирц засах боломжгүй байна');
      return;
    }

    setAttendanceOverride((prev) => ({ ...prev, [bookingId]: status }));
    setSavingBookingId(bookingId);
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        attendanceStatus: status,
        attendanceMarkedAt: Timestamp.now(),
      });
      toast.success(status === 'attended' ? 'Ирц: Ирсэн' : 'Ирц: Тасалсан');
    } catch (error) {
      console.error('Attendance update failed:', error);
      setAttendanceOverride((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
      toast.error('Ирц шинэчлэхэд алдаа гарлаа');
    } finally {
      setSavingBookingId(null);
    }
  };

  if (!user) return null;
  if (!isTeacher && !isAdmin) {
    return (
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl rounded-3xl border border-brand-ink/10 bg-white p-10 text-center">
            <p className="text-brand-ink/60">Энэ хуудсыг зөвхөн багш эрхтэй хэрэглэгч үзнэ.</p>
            <Link to="/profile">
              <Button className="mt-6 rounded-full">Профайл руу буцах</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 pb-20 pt-32">
      <div className="container mx-auto px-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light text-brand-ink">Багшийн ирц бүртгэл</h1>
              <p className="mt-2 text-sm text-brand-ink/50">
                {isAdmin ? 'Админ: бүх хичээлийн ирцийг үзэх боломжтой.' : 'Багш: өнөөдөр болон цаашдын хичээлийн ирцийг бүртгэнэ.'}
              </p>
            </div>
            <Link to="/profile">
              <Button variant="outline" className="rounded-full">
                <ArrowLeft size={14} className="mr-2" />
                Профайл руу буцах
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-brand-ink/10 bg-white p-10 text-center text-brand-ink/50">
              Мэдээлэл ачаалж байна...
            </div>
          ) : teacherClasses.length === 0 ? (
            <div className="rounded-3xl border border-brand-ink/10 bg-white p-10 text-center text-brand-ink/50">
              Танд оноогдсон хичээл олдсонгүй.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {teacherClasses.map((classItem) => (
                  <button
                    key={classItem.id}
                    type="button"
                    onClick={() => setSelectedClassId(classItem.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedClassId === classItem.id
                        ? 'border-brand-icon bg-brand-icon/5'
                        : 'border-brand-ink/10 bg-white hover:border-brand-icon/40'
                    }`}
                  >
                    <p className="text-base font-medium text-brand-ink">{classItem.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.15em] text-brand-ink/40">
                      {classItem.duration} • {classItem.sessionCount} хуваарь
                    </p>
                    <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-icon/10 px-3 py-1 text-xs font-bold text-brand-icon">
                      <Users size={13} />
                      {classItem.participantCount} оролцогч
                    </p>
                  </button>
                ))}
              </div>

              <div className="rounded-3xl border border-brand-ink/10 bg-white p-6">
                <h2 className="mb-4 text-xl font-serif text-brand-ink">
                  {selectedClass?.title || 'Хичээл сонгоно уу'}
                </h2>
                {!isAdmin && selectedClass && !selectedClass.hasEditableSessionNow && (
                  <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Энэ хичээлийн ирцийг одоо өөрчлөх боломжгүй байна. (Эхлэхээс өмнө болон өдөр өнгөрсний дараа түгжигдэнэ)
                  </p>
                )}

                {rows.length === 0 ? (
                  <p className="text-sm text-brand-ink/50">Энэ хичээлд бүртгэлтэй сурагч алга.</p>
                ) : (
                  <div className="space-y-3">
                    {rows.map((row) => (
                      (() => {
                        const effectiveStatus = attendanceOverride[row.bookingId] || row.attendanceStatus;
                        const isPresent = effectiveStatus === 'attended';
                        const isAbsent = effectiveStatus === 'missed';
                        const canEdit = isAdmin || isAttendanceEditableNow(row.classStartTime).editable;
                        return (
                      <div
                        key={row.id}
                        className="grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-4 md:grid-cols-[1.2fr_1.2fr_0.8fr_auto]"
                      >
                        <div>
                          <p className="font-medium text-brand-ink">{row.name}</p>
                          <p className="text-xs text-brand-ink/50">{row.bookedAt}</p>
                        </div>
                        <p className="text-sm text-brand-ink/70">{row.email}</p>
                        <p className={`text-sm uppercase ${isPresent ? 'text-green-700' : isAbsent ? 'text-red-600' : 'text-brand-icon'}`}>
                          {effectiveStatus}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className={`rounded-full px-4 text-white ${isPresent ? 'bg-green-700 ring-2 ring-green-300' : 'bg-green-600 hover:bg-green-700'}`}
                            disabled={savingBookingId === row.bookingId || !canEdit}
                            onClick={() => markAttendance(row.bookingId, 'attended')}
                          >
                            <CheckCircle2 size={14} className="mr-1" />
                            Ирсэн
                          </Button>
                          <Button
                            size="sm"
                            className={`rounded-full px-4 text-white ${isAbsent ? 'bg-red-700 ring-2 ring-red-300' : 'bg-red-600 hover:bg-red-700'}`}
                            disabled={savingBookingId === row.bookingId || !canEdit}
                            onClick={() => markAttendance(row.bookingId, 'missed')}
                          >
                            <XCircle size={14} className="mr-1" />
                            Тасалсан
                          </Button>
                        </div>
                      </div>
                        );
                      })()
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
