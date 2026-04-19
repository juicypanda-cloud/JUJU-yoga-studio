import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  Timestamp,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { MediaImageField } from './MediaImageField';
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save,
  Image as ImageIcon,
  Clock,
  Users
} from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleSlot {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

type ClassContentType = 'offline' | 'online' | 'audio';

const formatTimeInput = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};

const normalizeTime = (value: string, fallback: string) => {
  const match = value.match(/^(\d{1,2}):?(\d{0,2})$/);
  if (!match) return fallback;

  const hours = Math.min(23, Math.max(0, Number(match[1] || 0)));
  const minutes = Math.min(59, Math.max(0, Number((match[2] || '0').padEnd(2, '0'))));

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const shiftTime = (value: string, minutesToAdd: number) => {
  const safeValue = normalizeTime(value, '08:00');
  const [hours, minutes] = safeValue.split(':').map(Number);
  const totalMinutes = (hours * 60 + minutes + minutesToAdd + 24 * 60) % (24 * 60);
  const nextHours = Math.floor(totalMinutes / 60);
  const nextMinutes = totalMinutes % 60;
  return `${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}`;
};

interface YogaClass {
  id: string;
  title: string;
  type: ClassContentType;
  videoUrl?: string;
  audioUrl?: string;
  description: string;
  duration: string;
  teacherId: string;
  teacher: string;
  image: string;
  category: string;
  price?: number;
  benefits?: string[];
  scheduleSlots?: ScheduleSlot[];
  createdAt: any;
}

export const ClassesAdmin: React.FC = () => {
  const weekDays = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];
  const [classes, setClasses] = useState<YogaClass[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentClass, setCurrentClass] = useState<Partial<YogaClass>>({
    title: '',
    type: 'offline',
    videoUrl: '',
    audioUrl: '',
    description: '',
    duration: '60 мин',
    teacherId: '',
    teacher: '',
    image: '',
    category: 'Hatha',
    price: 0,
    benefits: [''],
    scheduleSlots: [{ dayOfWeek: 'Даваа', startTime: '08:00', endTime: '09:00' }]
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const updateScheduleSlot = (index: number, field: keyof ScheduleSlot, value: string) => {
    const existingSlots = currentClass.scheduleSlots || [{ dayOfWeek: 'Даваа', startTime: '08:00', endTime: '09:00' }];
    const nextSlots = [...existingSlots];
    nextSlots[index] = { ...nextSlots[index], [field]: value };
    setCurrentClass({ ...currentClass, scheduleSlots: nextSlots });
  };

  const syncClassSchedule = async (
    classId: string,
    className: string,
    teacherName: string,
    scheduleSlots: ScheduleSlot[]
  ) => {
    const scheduleQuery = query(collection(db, 'schedule'), where('classId', '==', classId));
    const existingSnapshot = await getDocs(scheduleQuery);
    const existingByKey = new Map<string, any>();

    existingSnapshot.docs.forEach((scheduleDoc) => {
      const data = scheduleDoc.data() as any;
      const key = `${data?.dayOfWeek || ''}|${data?.startTime || ''}|${data?.endTime || ''}`;
      existingByKey.set(key, scheduleDoc);
    });

    const batch = writeBatch(db);
    const usedKeys = new Set<string>();

    scheduleSlots.forEach((slot) => {
      const key = `${slot.dayOfWeek}|${slot.startTime}|${slot.endTime}`;
      const existingDoc = existingByKey.get(key);
      usedKeys.add(key);

      if (existingDoc) {
        batch.update(existingDoc.ref, {
          className,
          teacherName,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          updatedAt: Timestamp.now(),
        });
      } else {
        const newScheduleRef = doc(collection(db, 'schedule'));
        batch.set(newScheduleRef, {
          classId,
          className,
          teacherName,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          capacity: 20,
          bookedCount: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    });

    existingSnapshot.docs.forEach((scheduleDoc) => {
      const data = scheduleDoc.data() as any;
      const key = `${data?.dayOfWeek || ''}|${data?.startTime || ''}|${data?.endTime || ''}`;
      if (!usedKeys.has(key)) {
        batch.delete(scheduleDoc.ref);
      }
    });

    await batch.commit();
  };

  const deleteClassSchedule = async (classId: string) => {
    const scheduleQuery = query(collection(db, 'schedule'), where('classId', '==', classId));
    const snapshot = await getDocs(scheduleQuery);
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((scheduleDoc) => batch.delete(scheduleDoc.ref));
    await batch.commit();
  };

  useEffect(() => {
    const q = query(collection(db, 'classes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedClasses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as YogaClass[];
      setClasses(fetchedClasses);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching classes:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'classes');
      } catch (e) {
        toast.error('Хичээлүүдийг ачаалахад алдаа гарлаа');
      }
      setLoading(false);
    });

    const unsubscribeTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      setTeachers(snapshot.docs.map((teacherDoc) => ({ id: teacherDoc.id, ...teacherDoc.data() })));
    });

    return () => {
      unsubscribe();
      unsubscribeTeachers();
    };
  }, []);

  const handleSave = async () => {
    if (isSaving) return;

    if (!currentClass.title || !currentClass.teacherId) {
      toast.error('Гарчиг болон багшийн нэр заавал байх ёстой');
      return;
    }

    const selectedTeacher = teachers.find((teacher) => teacher.id === currentClass.teacherId);
    const classType: ClassContentType = 'offline';

    const validScheduleSlots = (currentClass.scheduleSlots || []).filter(
      (slot) => slot?.dayOfWeek && slot?.startTime && slot?.endTime
    );
    const validBenefits = (currentClass.benefits || []).map((benefit) => benefit.trim()).filter(Boolean);
    const className = currentClass.title || '';
    const teacherName = selectedTeacher?.name || currentClass.teacher || '';
    const classPrice = Number(currentClass.price || 0);

    setIsSaving(true);
    try {
      if (currentClass.id) {
        const classRef = doc(db, 'classes', currentClass.id);
        await updateDoc(classRef, {
          ...currentClass,
          type: classType,
          videoUrl: '',
          audioUrl: '',
          teacher: teacherName,
          price: Number.isFinite(classPrice) ? classPrice : 0,
          benefits: validBenefits,
          scheduleSlots: validScheduleSlots,
          updatedAt: Timestamp.now()
        });
        await syncClassSchedule(currentClass.id, className, teacherName, validScheduleSlots);
        toast.success('Хичээл амжилттай шинэчлэгдлээ');
      } else {
        const createdClassRef = await addDoc(collection(db, 'classes'), {
          ...currentClass,
          type: classType,
          videoUrl: '',
          audioUrl: '',
          teacher: teacherName,
          price: Number.isFinite(classPrice) ? classPrice : 0,
          benefits: validBenefits,
          scheduleSlots: validScheduleSlots,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        await syncClassSchedule(createdClassRef.id, className, teacherName, validScheduleSlots);
        toast.success('Шинэ хичээл амжилттай нэмэгдлээ');
      }
      setIsEditing(false);
      setCurrentClass({
        title: '',
        type: 'offline',
        videoUrl: '',
        audioUrl: '',
        description: '',
        duration: '60 мин',
        teacherId: '',
        teacher: '',
        image: '',
        category: 'Hatha',
        price: 0,
        benefits: [''],
        scheduleSlots: [{ dayOfWeek: 'Даваа', startTime: '08:00', endTime: '09:00' }]
      });
    } catch (error) {
      console.error('Error saving class:', error);
      try {
        handleFirestoreError(error, currentClass.id ? OperationType.UPDATE : OperationType.CREATE, 'classes');
      } catch (e) {
        toast.error('Хадгалахад алдаа гарлаа');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const toastId = toast.loading('Устгаж байна...');
    try {
      await deleteDoc(doc(db, 'classes', id));
      await deleteClassSchedule(id);
      toast.success('Хичээл устгагдлаа', { id: toastId });
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting class:', error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `classes/${id}`);
      } catch (e) {
        toast.error('Устгахад алдаа гарлаа', { id: toastId });
      }
    }
  };

  if (loading && classes.length === 0) {
    return <div className="p-8 text-center">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Хичээл удирдлага</h1>
        {!isEditing && (
          <Button 
            onClick={() => {
              setCurrentClass({
                title: '',
                type: 'offline',
                videoUrl: '',
                audioUrl: '',
                description: '',
                duration: '60 мин',
                teacherId: '',
                teacher: '',
                image: '',
                category: 'Hatha',
                price: 0,
                benefits: [''],
                scheduleSlots: [{ dayOfWeek: 'Даваа', startTime: '08:00', endTime: '09:00' }]
              });
              setIsEditing(true);
            }}
            className="bg-brand-ink text-white rounded-full px-6"
          >
            <Plus size={18} className="mr-2" /> Шинэ хичээл
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-serif">{currentClass.id ? 'Хичээл засах' : 'Шинэ хичээл нэмэх'}</h2>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              <X size={20} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">Гарчиг</label>
              <Input 
                value={currentClass.title}
                onChange={(e) => setCurrentClass({ ...currentClass, title: e.target.value })}
                placeholder="Хичээлийн нэр"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">Багш</label>
              <select
                value={currentClass.teacherId || ''}
                onChange={(e) => {
                  const teacher = teachers.find((item) => item.id === e.target.value);
                  setCurrentClass({
                    ...currentClass,
                    teacherId: e.target.value,
                    teacher: teacher?.name || ''
                  });
                }}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
              >
                <option value="">Багш сонгох...</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name || teacher.displayName || 'Unnamed teacher'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">Төрөл</label>
              <Input 
                value={currentClass.category}
                onChange={(e) => setCurrentClass({ ...currentClass, category: e.target.value })}
                placeholder="Hatha, Vinyasa..."
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">Хугацаа</label>
              <Input 
                value={currentClass.duration}
                onChange={(e) => setCurrentClass({ ...currentClass, duration: e.target.value })}
                placeholder="60 мин"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-black">Долоо хоногийн өдөр ба цаг</label>
            <div className="space-y-3">
              {(currentClass.scheduleSlots || [{ dayOfWeek: 'Даваа', startTime: '08:00', endTime: '09:00' }]).map((slot, index) => (
                <div key={`schedule-slot-${index}`} className="flex gap-3">
                  <select
                    value={slot.dayOfWeek}
                    onChange={(e) => updateScheduleSlot(index, 'dayOfWeek', e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm text-black focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
                  >
                    {weekDays.map((day) => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                  <div className="flex items-center rounded-xl border border-input overflow-hidden bg-background">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => updateScheduleSlot(index, 'startTime', shiftTime(slot.startTime, -15))}
                      className="h-10 rounded-none border-r px-3"
                    >
                      -
                    </Button>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={slot.startTime}
                      onChange={(e) => updateScheduleSlot(index, 'startTime', formatTimeInput(e.target.value))}
                      onBlur={(e) => updateScheduleSlot(index, 'startTime', normalizeTime(e.target.value, '08:00'))}
                      placeholder="08:00"
                      className="rounded-none border-0 text-center shadow-none focus-visible:ring-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => updateScheduleSlot(index, 'startTime', shiftTime(slot.startTime, 15))}
                      className="h-10 rounded-none border-l px-3"
                    >
                      +
                    </Button>
                  </div>
                  <div className="flex items-center rounded-xl border border-input overflow-hidden bg-background">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => updateScheduleSlot(index, 'endTime', shiftTime(slot.endTime, -15))}
                      className="h-10 rounded-none border-r px-3"
                    >
                      -
                    </Button>
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={slot.endTime}
                      onChange={(e) => updateScheduleSlot(index, 'endTime', formatTimeInput(e.target.value))}
                      onBlur={(e) => updateScheduleSlot(index, 'endTime', normalizeTime(e.target.value, '09:00'))}
                      placeholder="09:00"
                      className="rounded-none border-0 text-center shadow-none focus-visible:ring-0"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => updateScheduleSlot(index, 'endTime', shiftTime(slot.endTime, 15))}
                      className="h-10 rounded-none border-l px-3"
                    >
                      +
                    </Button>
                  </div>
                  {(currentClass.scheduleSlots || []).length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const nextSlots = (currentClass.scheduleSlots || []).filter((_, i) => i !== index);
                        setCurrentClass({ 
                          ...currentClass, 
                          scheduleSlots: nextSlots.length > 0 ? nextSlots : [{ dayOfWeek: 'Даваа', startTime: '08:00', endTime: '09:00' }]
                        });
                      }}
                      className="rounded-xl"
                    >
                      Устгах
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentClass({ 
                  ...currentClass, 
                  scheduleSlots: [...(currentClass.scheduleSlots || []), { dayOfWeek: 'Даваа', startTime: '08:00', endTime: '09:00' }]
                })}
                className="rounded-xl"
              >
                Өдөр/цаг нэмэх
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-black">Тайлбар</label>
            <Textarea 
              value={currentClass.description}
              onChange={(e) => setCurrentClass({ ...currentClass, description: e.target.value })}
              placeholder="Хичээлийн дэлгэрэнгүй тайлбар..."
              className="rounded-xl h-32"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-black">Хичээлийн давуу талууд</label>
            <div className="space-y-3">
              {(currentClass.benefits || ['']).map((benefit, index) => (
                <div key={`benefit-${index}`} className="flex gap-3">
                  <Input
                    value={benefit}
                    onChange={(e) => {
                      const nextBenefits = [...(currentClass.benefits || [''])];
                      nextBenefits[index] = e.target.value;
                      setCurrentClass({ ...currentClass, benefits: nextBenefits });
                    }}
                    placeholder="Жишээ: Уян хатан байдлыг сайжруулна"
                    className="rounded-xl"
                  />
                  {(currentClass.benefits || []).length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        const nextBenefits = (currentClass.benefits || []).filter((_, i) => i !== index);
                        setCurrentClass({ ...currentClass, benefits: nextBenefits.length > 0 ? nextBenefits : [''] });
                      }}
                      className="rounded-xl"
                    >
                      Устгах
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentClass({ ...currentClass, benefits: [...(currentClass.benefits || ['']), ''] })}
                className="rounded-xl"
              >
                Давуу тал нэмэх
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MediaImageField
              label="Зураг"
              description="Зөвхөн медиа сангаас сонгоно."
              value={currentClass.image || ''}
              onChange={(url) => setCurrentClass({ ...currentClass, image: url })}
            />
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-black">Үнэ (₮)</label>
              <Input
                type="number"
                min={0}
                value={currentClass.price ?? 0}
                onChange={(e) => setCurrentClass({ ...currentClass, price: Number(e.target.value) })}
                placeholder="0"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-4">
            <Button variant="outline" onClick={() => !isSaving && setIsEditing(false)} disabled={isSaving} className="rounded-full px-8">
              Цуцлах
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="bg-brand-ink text-white rounded-full px-8 disabled:opacity-70 disabled:cursor-not-allowed">
              <Save size={18} className="mr-2" /> {isSaving ? 'Хадгалж байна...' : 'Хадгалах'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-accent/40">Хичээл байхгүй байна.</p>
            </div>
          ) : (
            classes.map((item) => (
              <div 
                key={item.id} 
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex gap-6 group hover:border-brand-icon/30 transition-all"
              >
                <div className="h-32 w-32 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-icon">{item.category}</span>
                  </div>
                  <h3 className="text-lg font-serif text-brand-ink truncate mb-2">{item.title}</h3>
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center gap-2 text-xs text-accent/60">
                      <Users size={14} /> <span>{item.teacher}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-accent/60">
                      <Clock size={14} /> <span>{item.duration}</span>
                    </div>
                    {item.scheduleSlots && item.scheduleSlots.length > 0 && (
                      <div className="text-xs text-accent/60">
                        Хуваарь: {item.scheduleSlots.map((slot) => `${slot.dayOfWeek} ${slot.startTime}-${slot.endTime}`).join(', ')}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-brand-ink">
                      {item.price && item.price > 0 ? `${item.price.toLocaleString()} ₮` : item.category}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {deleteId === item.id ? (
                        <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDelete(item.id)}
                            className="h-7 px-2 text-red-600 hover:bg-red-100 text-[10px] font-bold"
                          >
                            Тийм
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setDeleteId(null)}
                            className="h-7 px-2 text-gray-500 hover:bg-gray-100 text-[10px] font-bold"
                          >
                            Үгүй
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setCurrentClass({
                                ...item,
                                type: item.type || 'offline',
                                videoUrl: item.videoUrl || '',
                                audioUrl: item.audioUrl || '',
                                benefits: item.benefits && item.benefits.length > 0 ? item.benefits : [''],
                                scheduleSlots: item.scheduleSlots && item.scheduleSlots.length > 0
                                  ? item.scheduleSlots
                                  : [{ dayOfWeek: 'Даваа', startTime: '08:00', endTime: '09:00' }]
                              });
                              setIsEditing(true);
                            }}
                            className="text-blue-600 hover:bg-blue-50 h-8 w-8"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setDeleteId(item.id)}
                            className="text-red-600 hover:bg-red-50 h-8 w-8"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
