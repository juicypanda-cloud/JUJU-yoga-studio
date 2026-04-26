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
import { MediaImageField } from './MediaImageField';
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save,
  Image as ImageIcon,
  Calendar,
  MapPin,
  Tag
} from 'lucide-react';
import { toast } from 'sonner';

interface Retreat {
  id: string;
  title: string;
  description: string;
  location: string;
  date: string;
  duration: string;
  price: number;
  image: string;
  includedProgram?: string;
  whatToBring?: string;
  travelSchedule?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  createdAt: any;
}

export const RetreatsAdmin: React.FC = () => {
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentRetreat, setCurrentRetreat] = useState<Partial<Retreat>>({
    title: '',
    description: '',
    location: '',
    date: '',
    duration: '',
    price: 0,
    image: '',
    includedProgram: '',
    whatToBring: '',
    travelSchedule: '',
    status: 'upcoming'
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'retreats'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedRetreats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Retreat[];
      setRetreats(fetchedRetreats);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching retreats:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'retreats');
      } catch (e) {
        toast.error('Ретритүүдийг ачаалахад алдаа гарлаа');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    if (!currentRetreat.title || !currentRetreat.location) {
      toast.error('Гарчиг болон байршил заавал байх ёстой');
      return;
    }

    setIsSaving(true);
    try {
      if (currentRetreat.id) {
        const { id, ...rest } = currentRetreat as any;
        const retreatRef = doc(db, 'retreats', id);
        await updateDoc(retreatRef, {
          ...rest,
          updatedAt: Timestamp.now()
        });
        toast.success('Ретрит амжилттай шинэчлэгдлээ');
      } else {
        const { id: _omit, ...payload } = currentRetreat as any;
        await addDoc(collection(db, 'retreats'), {
          ...payload,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast.success('Шинэ ретрит амжилттай нэмэгдлээ');
      }
      setIsEditing(false);
      setCurrentRetreat({
        title: '',
        description: '',
        location: '',
        date: '',
        duration: '',
        price: 0,
        image: '',
        includedProgram: '',
        whatToBring: '',
        travelSchedule: '',
        status: 'upcoming'
      });
    } catch (error) {
      console.error('Error saving retreat:', error);
      try {
        handleFirestoreError(error, currentRetreat.id ? OperationType.UPDATE : OperationType.CREATE, 'retreats');
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
      await deleteDoc(doc(db, 'retreats', id));
      toast.success('Ретрит устгагдлаа', { id: toastId });
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting retreat:', error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `retreats/${id}`);
      } catch (e) {
        toast.error('Устгахад алдаа гарлаа', { id: toastId });
      }
    }
  };

  if (loading && retreats.length === 0) {
    return <div className="p-8 text-center">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Ретрит удирдлага</h1>
        {!isEditing && (
          <Button 
            onClick={() => {
              setCurrentRetreat({
                title: '',
                description: '',
                location: '',
                date: '',
                duration: '',
                price: 0,
                image: '',
                includedProgram: '',
                whatToBring: '',
                travelSchedule: '',
                status: 'upcoming'
              });
              setIsEditing(true);
            }}
            className="bg-brand-ink text-white rounded-full px-6"
          >
            <Plus size={18} className="mr-2" /> Шинэ ретрит
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-serif">{currentRetreat.id ? 'Ретрит засах' : 'Шинэ ретрит нэмэх'}</h2>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              <X size={20} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Гарчиг</label>
              <Input 
                value={currentRetreat.title}
                onChange={(e) => setCurrentRetreat({ ...currentRetreat, title: e.target.value })}
                placeholder="Ретритийн нэр"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Байршил</label>
              <Input 
                value={currentRetreat.location}
                onChange={(e) => setCurrentRetreat({ ...currentRetreat, location: e.target.value })}
                placeholder="Улаанбаатар, Тэрэлж..."
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Огноо</label>
              <Input 
                value={currentRetreat.date}
                onChange={(e) => setCurrentRetreat({ ...currentRetreat, date: e.target.value })}
                placeholder="2024.06.15 - 06.20"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Хугацаа</label>
              <Input 
                value={currentRetreat.duration}
                onChange={(e) => setCurrentRetreat({ ...currentRetreat, duration: e.target.value })}
                placeholder="5 шөнө, 6 өдөр"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Төлөв</label>
              <select 
                value={currentRetreat.status}
                onChange={(e) => setCurrentRetreat({ ...currentRetreat, status: e.target.value as any })}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
              >
                <option value="upcoming">Удахгүй болох</option>
                <option value="ongoing">Явагдаж буй</option>
                <option value="completed">Дууссан</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-accent/40">Тайлбар</label>
            <Textarea 
              value={currentRetreat.description}
              onChange={(e) => setCurrentRetreat({ ...currentRetreat, description: e.target.value })}
              placeholder="Ретритийн дэлгэрэнгүй тайлбар..."
              className="rounded-xl h-32"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Хөтөлбөрт багтсан</label>
              <Textarea
                value={currentRetreat.includedProgram || ''}
                onChange={(e) => setCurrentRetreat({ ...currentRetreat, includedProgram: e.target.value })}
                placeholder={'Мөр мөрөөр бичнэ:\nӨглөө, оройн йогийн хичээл\nМайндфүлнэс бясалгал\nЭрүүл хоол'}
                className="rounded-xl min-h-[140px]"
              />
              <p className="text-[11px] text-accent/40">Жагсаалтын нэг мөр = нэг item</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Юу авч ирэх вэ?</label>
              <Textarea
                value={currentRetreat.whatToBring || ''}
                onChange={(e) => setCurrentRetreat({ ...currentRetreat, whatToBring: e.target.value })}
                placeholder={'Мөр мөрөөр бичнэ:\nЙогийн гудас\nБиед эвтэйхэн хувцас\nТэмдэглэлийн дэвтэр'}
                className="rounded-xl min-h-[140px]"
              />
              <p className="text-[11px] text-accent/40">Жагсаалтын нэг мөр = нэг item</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-accent/40">Аяллын хуваарь</label>
            <Textarea
              value={currentRetreat.travelSchedule || ''}
              onChange={(e) => setCurrentRetreat({ ...currentRetreat, travelSchedule: e.target.value })}
              placeholder={'Мөр бүрийг дараах форматаар бичнэ:\n07:00 | Өглөөний йог | Өдрийг эрч хүчтэй эхлүүлэх дасгал\n08:30 | Өглөөний цай | Эрүүл, шим тэжээлтэй хоол'}
              className="rounded-xl min-h-[180px]"
            />
            <p className="text-[11px] text-accent/40">Формат: Цаг | Үйл ажиллагаа | Тайлбар</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MediaImageField
              label="Зураг"
              description="Ретритийн зургийг медиа сангаас сонгоно."
              value={currentRetreat.image || ''}
              onChange={(url) => setCurrentRetreat({ ...currentRetreat, image: url })}
            />
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Үнэ (₮)</label>
              <Input 
                type="number"
                value={currentRetreat.price}
                onChange={(e) => setCurrentRetreat({ ...currentRetreat, price: Number(e.target.value) })}
                placeholder="0"
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
        <div className="grid grid-cols-1 gap-6">
          {retreats.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-accent/40">Ретрит байхгүй байна.</p>
            </div>
          ) : (
            retreats.map((item) => (
              <div 
                key={item.id} 
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 group hover:border-brand-icon/30 transition-all"
              >
                <div className="h-48 w-full shrink-0 overflow-hidden rounded-2xl bg-gray-100 md:w-64">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-grow min-w-0 flex flex-col justify-between py-2">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        item.status === 'upcoming' ? 'bg-green-50 text-green-600' :
                        item.status === 'ongoing' ? 'bg-blue-50 text-blue-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {item.status === 'upcoming' ? 'Удахгүй болох' : item.status === 'ongoing' ? 'Явагдаж буй' : 'Дууссан'}
                      </span>
                      <span className="text-xs font-bold text-brand-ink">{item.price.toLocaleString()} ₮</span>
                    </div>
                    <h3 className="text-2xl font-serif text-brand-ink mb-4">{item.title}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 text-sm text-accent/60">
                        <MapPin size={16} className="text-brand-icon" /> <span>{item.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-accent/60">
                        <Calendar size={16} className="text-brand-icon" /> <span>{item.date}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 mt-6">
                    {deleteId === item.id ? (
                      <div className="flex items-center gap-2 bg-red-50 px-4 py-1 rounded-full border border-red-100">
                        <span className="text-xs font-bold text-red-600 uppercase">Устгах уу?</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(item.id)}
                          className="h-8 px-4 text-red-600 hover:bg-red-100 text-xs font-bold rounded-full"
                        >
                          Тийм
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setDeleteId(null)}
                          className="h-8 px-4 text-gray-500 hover:bg-gray-100 text-xs font-bold rounded-full"
                        >
                          Үгүй
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setCurrentRetreat(item);
                            setIsEditing(true);
                          }}
                          className="rounded-full px-6"
                        >
                          <Pencil size={14} className="mr-2" /> Засах
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setDeleteId(item.id)}
                          className="text-red-600 hover:bg-red-50 rounded-full px-6"
                        >
                          <Trash2 size={14} className="mr-2" /> Устгах
                        </Button>
                      </>
                    )}
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
