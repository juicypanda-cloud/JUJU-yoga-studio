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
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save,
  Clock,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleItem {
  id: string;
  classId: string;
  className: string;
  teacherName: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room?: string;
  createdAt: any;
}

export const ScheduleAdmin: React.FC = () => {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<ScheduleItem>>({
    classId: '',
    className: '',
    teacherName: '',
    dayOfWeek: 'Даваа',
    startTime: '08:00',
    endTime: '09:00',
    room: 'Main Hall'
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const scheduleQ = query(collection(db, 'schedule'), orderBy('dayOfWeek'), orderBy('startTime'));
    const unsubscribeSchedule = onSnapshot(scheduleQ, (snapshot) => {
      setSchedule(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ScheduleItem[]);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching schedule:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'schedule');
      } catch (e) {
        toast.error('Хуваарийн мэдээллийг ачаалахад алдаа гарлаа');
      }
      setLoading(false);
    });

    const unsubscribeClasses = onSnapshot(collection(db, 'classes'), (snapshot) => {
      setClasses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeSchedule();
      unsubscribeClasses();
    };
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    if (!currentItem.classId || !currentItem.startTime) {
      toast.error('Хичээл болон цаг заавал байх ёстой');
      return;
    }

    const selectedClass = classes.find(c => c.id === currentItem.classId);
    setIsSaving(true);
    try {
      if (currentItem.id) {
        const { id, ...rest } = currentItem as ScheduleItem;
        const dataToSave = {
          ...rest,
          className: selectedClass?.title || '',
          teacherId: selectedClass?.teacherId || '',
          teacherName: selectedClass?.teacher || '',
          updatedAt: Timestamp.now()
        };
        await updateDoc(doc(db, 'schedule', id), dataToSave);
        toast.success('Хуваарь амжилттай шинэчлэгдлээ');
      } else {
        const { id: _omit, ...rest } = currentItem as any;
        const dataToSave = {
          ...rest,
          className: selectedClass?.title || '',
          teacherId: selectedClass?.teacherId || '',
          teacherName: selectedClass?.teacher || '',
          updatedAt: Timestamp.now()
        };
        await addDoc(collection(db, 'schedule'), {
          ...dataToSave,
          createdAt: Timestamp.now()
        });
        toast.success('Шинэ хуваарь амжилттай нэмэгдлээ');
      }
      setIsEditing(false);
      setCurrentItem({
        classId: '',
        className: '',
        teacherName: '',
        dayOfWeek: 'Даваа',
        startTime: '08:00',
        endTime: '09:00',
        room: 'Main Hall'
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
      try {
        handleFirestoreError(error, currentItem.id ? OperationType.UPDATE : OperationType.CREATE, 'schedule');
      } catch (e) {
        toast.error('Хадгалахад алдаа гарлаа');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Та энэ хуваарийг устгахдаа итгэлтэй байна уу?')) return;

    try {
      await deleteDoc(doc(db, 'schedule', id));
      toast.success('Хуваарь устгагдлаа');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `schedule/${id}`);
      } catch (e) {
        toast.error('Устгахад алдаа гарлаа');
      }
    }
  };

  const days = ['Даваа', 'Мягмар', 'Лхагва', 'Пүрэв', 'Баасан', 'Бямба', 'Ням'];

  if (loading && schedule.length === 0) {
    return <div className="p-8 text-center">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Хуваарь удирдлага</h1>
        {!isEditing && (
          <Button 
            onClick={() => {
              setCurrentItem({
                classId: '',
                className: '',
                teacherName: '',
                dayOfWeek: 'Даваа',
                startTime: '08:00',
                endTime: '09:00',
                room: 'Main Hall'
              });
              setIsEditing(true);
            }}
            className="bg-brand-ink text-white rounded-full px-6"
          >
            <Plus size={18} className="mr-2" /> Хуваарь нэмэх
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-serif">{currentItem.id ? 'Хуваарь засах' : 'Шинэ хуваарь нэмэх'}</h2>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              <X size={20} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Хичээл сонгох</label>
              <select 
                value={currentItem.classId}
                onChange={(e) => setCurrentItem({ ...currentItem, classId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
              >
                <option value="">Сонгох...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.title} ({c.teacher})</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Өдөр</label>
              <select 
                value={currentItem.dayOfWeek}
                onChange={(e) => setCurrentItem({ ...currentItem, dayOfWeek: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
              >
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

          <div className="pt-6 flex justify-end gap-4">
            <Button variant="outline" onClick={() => !isSaving && setIsEditing(false)} disabled={isSaving} className="rounded-full px-8">
              Цуцлах
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-brand-ink text-white rounded-full px-8 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save size={18} className="mr-2" /> {isSaving ? 'Хадгалж байна...' : 'Хадгалах'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {days.map(day => {
            const dayItems = schedule.filter(item => item.dayOfWeek === day);
            if (dayItems.length === 0) return null;

            return (
              <div key={day} className="space-y-4">
                <h2 className="text-xl font-serif text-brand-ink border-l-4 border-brand-icon pl-4">{day}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {dayItems.map(item => (
                    <div 
                      key={item.id} 
                      className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 group hover:border-brand-icon/30 transition-all flex justify-between items-center"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-xs text-brand-icon font-bold mb-1">
                          <Clock size={12} /> {item.startTime} - {item.endTime}
                        </div>
                        <h3 className="text-sm font-medium text-brand-ink">{item.className}</h3>
                        <p className="text-[10px] text-accent/40">{item.teacherName} • {item.room}</p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setCurrentItem(item);
                            setIsEditing(true);
                          }}
                          className="text-blue-600 hover:bg-blue-50 h-8 w-8"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:bg-red-50 h-8 w-8"
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
          {schedule.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-accent/40">Хуваарь хоосон байна.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
