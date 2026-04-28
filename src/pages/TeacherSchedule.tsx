import React, { useEffect, useMemo, useState } from 'react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { useSearchParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type ScheduleItem = {
  id: string;
  classId: string;
  className: string;
  teacherId?: string;
  teacherName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
};

type ClassItem = {
  id: string;
  title?: string;
  teacher?: string;
  teacherId?: string;
};

type TeacherRecord = {
  id: string;
  name?: string;
  email?: string;
};

const days = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

export const TeacherSchedule: React.FC = () => {
  const { user, profile, isTeacher } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedClassId = String(searchParams.get('classId') || '').trim();

  const [allClasses, setAllClasses] = useState<ClassItem[]>([]);
  const [allTeachers, setAllTeachers] = useState<TeacherRecord[]>([]);
  const [allSchedule, setAllSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<ScheduleItem>>({
    classId: '',
    className: '',
    teacherId: '',
    teacherName: '',
    dayOfWeek: 'Даваа',
    startTime: '08:00',
    endTime: '09:00',
    room: 'Main Hall',
  });

  const myDisplayName = String(profile?.displayName || user?.displayName || '').trim();

  useEffect(() => {
    const unsubClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      const rows = snapshot.docs.map((row) => ({ id: row.id, ...(row.data() as Record<string, unknown>) })) as ClassItem[];
      setAllClasses(rows);
    });
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const rows = snapshot.docs.map((row) => ({ id: row.id, ...(row.data() as Record<string, unknown>) })) as TeacherRecord[];
      setAllTeachers(rows);
    });

    const scheduleQ = query(collection(db, 'schedule'), orderBy('dayOfWeek'), orderBy('startTime'));
    const unsubSchedule = onSnapshot(
      scheduleQ,
      (snapshot) => {
        const rows = snapshot.docs.map((row) => ({ id: row.id, ...(row.data() as Record<string, unknown>) })) as ScheduleItem[];
        setAllSchedule(rows);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => {
      unsubClasses();
      unsubTeachers();
      unsubSchedule();
    };
  }, []);

  const teacherClasses = useMemo(() => {
    const uid = String(user?.uid || '').trim();
    const emailCandidate = String(user?.email || '').trim().toLowerCase();
    const displayNameCandidates = new Set(
      [myDisplayName, String(user?.displayName || '').trim()]
        .map((name) => String(name || '').trim().toLowerCase())
        .filter(Boolean)
    );

    const matchedTeachers = allTeachers.filter((teacher) => {
      const teacherId = String(teacher?.id || '').trim();
      const teacherName = String(teacher?.name || '').trim().toLowerCase();
      const teacherEmail = String(teacher?.email || '').trim().toLowerCase();
      return (
        (uid && teacherId === uid) ||
        (teacherEmail && teacherEmail === emailCandidate) ||
        (teacherName && displayNameCandidates.has(teacherName))
      );
    });

    const matchedTeacherIds = new Set(matchedTeachers.map((teacher) => String(teacher?.id || '').trim()).filter(Boolean));
    const matchedTeacherNames = new Set(
      matchedTeachers
        .map((teacher) => String(teacher?.name || '').trim().toLowerCase())
        .filter(Boolean)
    );
    displayNameCandidates.forEach((name) => matchedTeacherNames.add(name));

    return allClasses.filter((item) => {
      const classTeacherId = String(item?.teacherId || '').trim();
      const classTeacherName = String(item?.teacher || '').trim().toLowerCase();
      if (classTeacherId && (classTeacherId === uid || matchedTeacherIds.has(classTeacherId))) return true;
      if (classTeacherName && matchedTeacherNames.has(classTeacherName)) return true;
      return false;
    });
  }, [allClasses, allTeachers, myDisplayName, user?.displayName, user?.email, user?.uid]);

  const teacherClassIds = useMemo(() => new Set(teacherClasses.map((c) => c.id)), [teacherClasses]);

  const schedule = useMemo(
    () => allSchedule.filter((row) => teacherClassIds.has(String(row?.classId || ''))),
    [allSchedule, teacherClassIds]
  );

  useEffect(() => {
    if (!preselectedClassId) return;
    if (!teacherClassIds.has(preselectedClassId)) return;
    setCurrentItem((prev) => ({ ...prev, classId: preselectedClassId }));
    setIsEditing(true);
  }, [preselectedClassId, teacherClassIds]);

  const resetEditor = () => {
    setCurrentItem({
      classId: preselectedClassId && teacherClassIds.has(preselectedClassId) ? preselectedClassId : '',
      className: '',
      teacherId: '',
      teacherName: '',
      dayOfWeek: 'Даваа',
      startTime: '08:00',
      endTime: '09:00',
      room: 'Main Hall',
    });
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!currentItem.classId || !currentItem.startTime) {
      toast.error('Хичээл болон цаг заавал байх ёстой');
      return;
    }
    const selectedClass = teacherClasses.find((item) => item.id === currentItem.classId);
    if (!selectedClass) {
      toast.error('Зөвхөн өөрийн хичээлийн хуваарьт өөрчлөлт хийж болно');
      return;
    }

    setIsSaving(true);
    const basePayload = {
      ...currentItem,
      className: String(selectedClass?.title || '').trim(),
      teacherName: String(selectedClass?.teacher || myDisplayName || '').trim(),
      teacherId: String(selectedClass?.teacherId || user?.uid || '').trim(),
      updatedAt: Timestamp.now(),
    };

    try {
      if (currentItem.id) {
        const id = String(currentItem.id);
        const { id: _omit, ...rest } = basePayload as ScheduleItem;
        await updateDoc(doc(db, 'schedule', id), rest);
        toast.success('Хуваарь шинэчлэгдлээ');
      } else {
        await addDoc(collection(db, 'schedule'), {
          ...basePayload,
          createdAt: Timestamp.now(),
        });
        toast.success('Шинэ хуваарь нэмэгдлээ');
      }
      setIsEditing(false);
      resetEditor();
    } catch (error) {
      console.error('Error saving teacher schedule:', error);
      toast.error('Хуваарь хадгалахад алдаа гарлаа');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Энэ хуваарийг устгах уу?')) return;
    try {
      await deleteDoc(doc(db, 'schedule', id));
      toast.success('Хуваарь устгагдлаа');
    } catch (error) {
      console.error('Error deleting teacher schedule:', error);
      toast.error('Хуваарь устгахад алдаа гарлаа');
    }
  };

  if (!isTeacher) {
    return <div className="p-8 text-center">Зөвхөн багш нарт зориулсан хэсэг.</div>;
  }

  if (loading && schedule.length === 0) {
    return <div className="p-8 text-center">Уншиж байна...</div>;
  }

  return (
    <div className="min-h-screen bg-white pt-28 pb-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-brand-ink">Миний хичээлийн хуваарь</h1>
            <p className="mt-2 text-sm text-brand-ink/55">Та зөвхөн өөрийн хичээлүүдийн хуваарийг засна.</p>
          </div>
          {!isEditing && (
            <Button
              onClick={() => {
                resetEditor();
                setIsEditing(true);
              }}
              className="rounded-full bg-brand-ink px-6 text-white"
            >
              <Plus size={18} className="mr-2" /> Хуваарь нэмэх
            </Button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-6 rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-serif">{currentItem.id ? 'Хуваарь засах' : 'Шинэ хуваарь нэмэх'}</h2>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>
                <X size={20} />
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-accent/40">Хичээл сонгох</label>
                <select
                  value={currentItem.classId}
                  onChange={(e) => setCurrentItem({ ...currentItem, classId: e.target.value })}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
                >
                  <option value="">Сонгох...</option>
                  {teacherClasses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({item.teacher})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-accent/40">Өдөр</label>
                <select
                  value={currentItem.dayOfWeek}
                  onChange={(e) => setCurrentItem({ ...currentItem, dayOfWeek: e.target.value })}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
                >
                  {days.map((day) => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-accent/40">Эхлэх цаг</label>
                <Input
                  type="time"
                  value={currentItem.startTime}
                  onChange={(e) => setCurrentItem({ ...currentItem, startTime: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-accent/40">Дуусах цаг</label>
                <Input
                  type="time"
                  value={currentItem.endTime}
                  onChange={(e) => setCurrentItem({ ...currentItem, endTime: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-accent/40">Өрөө/Заал</label>
                <Input
                  value={currentItem.room}
                  onChange={(e) => setCurrentItem({ ...currentItem, room: e.target.value })}
                  placeholder="Main Hall"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6">
              <Button variant="outline" onClick={() => !isSaving && setIsEditing(false)} disabled={isSaving} className="rounded-full px-8">
                Цуцлах
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded-full bg-brand-ink px-8 text-white disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save size={18} className="mr-2" /> {isSaving ? 'Хадгалж байна...' : 'Хадгалах'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {days.map((day) => {
              const dayItems = schedule.filter((item) => item.dayOfWeek === day);
              if (dayItems.length === 0) return null;
              return (
                <div key={day} className="space-y-4">
                  <h2 className="border-l-4 border-brand-icon pl-4 text-xl font-serif text-brand-ink">{day}</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {dayItems.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-brand-icon/30"
                      >
                        <div>
                          <div className="mb-1 text-xs font-bold text-brand-icon">
                            {item.startTime} - {item.endTime}
                          </div>
                          <h3 className="text-sm font-medium text-brand-ink">{item.className}</h3>
                          <p className="text-[10px] text-accent/40">
                            {item.teacherName} • {item.room}
                          </p>
                        </div>
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCurrentItem(item);
                              setIsEditing(true);
                            }}
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {schedule.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-gray-200 bg-white py-20 text-center">
                <p className="text-accent/40">Таны хичээлийн хуваарь одоогоор алга байна.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
