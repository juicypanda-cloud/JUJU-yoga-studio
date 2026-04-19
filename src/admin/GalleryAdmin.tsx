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
import { 
  Plus, 
  Pencil, 
  Trash2, 
  X, 
  Save,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

interface GalleryItem {
  id: string;
  title: string;
  image: string;
  category: string;
  createdAt: any;
}

export const GalleryAdmin: React.FC = () => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<Partial<GalleryItem>>({
    title: '',
    image: '',
    category: 'Retreat'
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GalleryItem[];
      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching gallery:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'gallery');
      } catch (e) {
        toast.error('Галлерейг ачаалахад алдаа гарлаа');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    if (!currentItem.title || !currentItem.image) {
      toast.error('Гарчиг болон зураг заавал байх ёстой');
      return;
    }

    setIsSaving(true);
    try {
      if (currentItem.id) {
        const { id, ...rest } = currentItem as GalleryItem;
        const itemRef = doc(db, 'gallery', id);
        await updateDoc(itemRef, {
          ...rest,
          updatedAt: Timestamp.now()
        });
        toast.success('Зураг амжилттай шинэчлэгдлээ');
      } else {
        await addDoc(collection(db, 'gallery'), {
          title: currentItem.title,
          image: currentItem.image,
          category: currentItem.category || 'Retreat',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast.success('Шинэ зураг амжилттай нэмэгдлээ');
      }
      setIsEditing(false);
      setCurrentItem({
        title: '',
        image: '',
        category: 'Retreat'
      });
    } catch (error) {
      console.error('Error saving gallery item:', error);
      try {
        handleFirestoreError(error, currentItem.id ? OperationType.UPDATE : OperationType.CREATE, 'gallery');
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
      await deleteDoc(doc(db, 'gallery', id));
      toast.success('Зураг устгагдлаа', { id: toastId });
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting gallery item:', error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `gallery/${id}`);
      } catch (e) {
        toast.error('Устгахад алдаа гарлаа', { id: toastId });
      }
    }
  };

  if (loading && items.length === 0) {
    return <div className="p-8 text-center">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Галлерей удирдлага</h1>
        {!isEditing && (
          <Button 
            onClick={() => {
              setCurrentItem({
                title: '',
                image: '',
                category: 'Retreat'
              });
              setIsEditing(true);
            }}
            className="bg-brand-ink text-white rounded-full px-6"
          >
            <Plus size={18} className="mr-2" /> Зураг нэмэх
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-serif">{currentItem.id ? 'Зураг засах' : 'Шинэ зураг нэмэх'}</h2>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              <X size={20} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Гарчиг</label>
              <Input 
                value={currentItem.title}
                onChange={(e) => setCurrentItem({ ...currentItem, title: e.target.value })}
                placeholder="Зургийн тайлбар"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Ангилал</label>
              <select 
                value={currentItem.category}
                onChange={(e) => setCurrentItem({ ...currentItem, category: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
              >
                <option value="Retreat">Ретрит</option>
                <option value="Class">Хичээл</option>
                <option value="Event">Арга хэмжээ</option>
                <option value="Other">Бусад</option>
              </select>
            </div>
          </div>

          <MediaImageField
            label="Зураг"
            description="Галерейн зургийг медиа сангаас сонгоно."
            value={currentItem.image || ''}
            onChange={(url) => setCurrentItem({ ...currentItem, image: url })}
          />

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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-accent/40">Галлерей хоосон байна.</p>
            </div>
          ) : (
            items.map((item) => (
              <div 
                key={item.id} 
                className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 group hover:border-brand-icon/30 transition-all relative overflow-hidden"
              >
                <div className="mb-2 aspect-square overflow-hidden rounded-xl bg-gray-100">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="px-2 pb-2">
                  <p className="text-xs font-medium text-brand-ink truncate">{item.title}</p>
                  <p className="text-[10px] text-accent/40 uppercase tracking-widest font-black">{item.category}</p>
                </div>
                
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {deleteId === item.id ? (
                    <div className="flex items-center gap-1 bg-white/90 backdrop-blur-md px-2 py-1 rounded-full shadow-sm border border-red-100">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(item.id)}
                        className="h-7 px-2 text-red-600 hover:bg-red-50 text-[10px] font-bold rounded-full"
                      >
                        Тийм
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setDeleteId(null)}
                        className="h-7 px-2 text-gray-500 hover:bg-gray-50 text-[10px] font-bold rounded-full"
                      >
                        Үгүй
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        onClick={() => {
                          setCurrentItem(item);
                          setIsEditing(true);
                        }}
                        className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-md shadow-sm"
                      >
                        <Pencil size={14} className="text-blue-600" />
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        onClick={() => setDeleteId(item.id)}
                        className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-md shadow-sm"
                      >
                        <Trash2 size={14} className="text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
