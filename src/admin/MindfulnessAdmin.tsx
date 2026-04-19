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
import { Textarea } from '../components/ui/textarea';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save,
  Heart,
  Quote
} from 'lucide-react';
import { toast } from 'sonner';

interface MindfulnessTip {
  id: string;
  title: string;
  content: string;
  author: string;
  category: string;
  createdAt: any;
}

export const MindfulnessAdmin: React.FC = () => {
  const [tips, setTips] = useState<MindfulnessTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTip, setCurrentTip] = useState<Partial<MindfulnessTip>>({
    title: '',
    content: '',
    author: 'Lotus Yoga',
    category: 'Daily'
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'mindfulness'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTips = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MindfulnessTip[];
      setTips(fetchedTips);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching mindfulness tips:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'mindfulness');
      } catch (e) {
        toast.error('Мэдээллийг ачаалахад алдаа гарлаа');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    if (!currentTip.title || !currentTip.content) {
      toast.error('Гарчиг болон агуулга заавал байх ёстой');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(currentTip.id ? 'Шинэчилж байна...' : 'Хадгалж байна...');
    try {
      if (currentTip.id) {
        const { id, ...rest } = currentTip as any;
        await updateDoc(doc(db, 'mindfulness', id), {
          ...rest,
          updatedAt: Timestamp.now()
        });
        toast.success('Амжилттай шинэчлэгдлээ', { id: toastId });
      } else {
        const { id: _omit, ...payload } = currentTip as any;
        await addDoc(collection(db, 'mindfulness'), {
          ...payload,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast.success('Амжилттай нэмэгдлээ', { id: toastId });
      }
      setIsEditing(false);
      setCurrentTip({
        title: '',
        content: '',
        author: 'Lotus Yoga',
        category: 'Daily'
      });
    } catch (error) {
      console.error('Error saving mindfulness tip:', error);
      try {
        handleFirestoreError(error, currentTip.id ? OperationType.UPDATE : OperationType.CREATE, 'mindfulness');
      } catch (e) {
        toast.error('Хадгалахад алдаа гарлаа', { id: toastId });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const toastId = toast.loading('Устгаж байна...');
    try {
      await deleteDoc(doc(db, 'mindfulness', id));
      toast.success('Амжилттай устгагдлаа', { id: toastId });
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting mindfulness tip:', error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `mindfulness/${id}`);
      } catch (e) {
        toast.error('Устгахад алдаа гарлаа', { id: toastId });
      }
    }
  };

  if (loading && tips.length === 0) {
    return <div className="p-8 text-center">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Mindfulness удирдлага</h1>
        {!isEditing && (
          <Button 
            onClick={() => {
              setCurrentTip({
                title: '',
                content: '',
                author: 'Lotus Yoga',
                category: 'Daily'
              });
              setIsEditing(true);
            }}
            className="bg-brand-ink text-white rounded-full px-6"
          >
            <Plus size={18} className="mr-2" /> Шинэ зөвлөгөө
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-serif">{currentTip.id ? 'Засах' : 'Шинэ зөвлөгөө нэмэх'}</h2>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              <X size={20} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Гарчиг</label>
              <Input 
                value={currentTip.title}
                onChange={(e) => setCurrentTip({ ...currentTip, title: e.target.value })}
                placeholder="Зөвлөгөөний гарчиг"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Ангилал</label>
              <select 
                value={currentTip.category}
                onChange={(e) => setCurrentTip({ ...currentTip, category: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
              >
                <option value="Daily">Өдөр тутмын</option>
                <option value="Meditation">Бясалгал</option>
                <option value="Breathing">Амьсгал</option>
                <option value="Quote">Ишлэл</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-accent/40">Агуулга</label>
            <Textarea 
              value={currentTip.content}
              onChange={(e) => setCurrentTip({ ...currentTip, content: e.target.value })}
              placeholder="Дэлгэрэнгүй агуулга..."
              className="rounded-xl h-32"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-accent/40">Зохиогч</label>
            <Input 
              value={currentTip.author}
              onChange={(e) => setCurrentTip({ ...currentTip, author: e.target.value })}
              placeholder="Lotus Yoga"
              className="rounded-xl"
            />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tips.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-accent/40">Мэдээлэл байхгүй байна.</p>
            </div>
          ) : (
            tips.map((item) => (
              <div 
                key={item.id} 
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-brand-icon/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-icon bg-secondary/40 px-3 py-1 rounded-full">
                      {item.category}
                    </span>
                    <Quote size={20} className="text-brand-ink/35" />
                  </div>
                  <h3 className="text-lg font-serif text-brand-ink mb-2">{item.title}</h3>
                  <p className="text-sm text-accent/60 font-light line-clamp-4 mb-4">{item.content}</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <span className="text-xs text-accent/40 italic">— {item.author}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {deleteId === item.id ? (
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:bg-red-50 h-8 px-3 text-xs font-bold"
                        >
                          Тийм
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setDeleteId(null)}
                          className="text-accent/40 hover:bg-gray-50 h-8 px-3 text-xs font-bold"
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
                            setCurrentTip(item);
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
            ))
          )}
        </div>
      )}
    </div>
  );
};
