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
  User,
  Mail,
  Instagram,
  Facebook
} from 'lucide-react';
import { toast } from 'sonner';

interface Teacher {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  email?: string;
  instagram?: string;
  facebook?: string;
  specialties: string[];
  createdAt: any;
}

export const TeachersAdmin: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<Partial<Teacher>>({
    name: '',
    role: 'Багш',
    bio: '',
    image: '',
    email: '',
    instagram: '',
    facebook: '',
    specialties: []
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'teachers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTeachers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Teacher[];
      setTeachers(fetchedTeachers);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching teachers:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'teachers');
      } catch (e) {
        toast.error('Багш нарын мэдээллийг ачаалахад алдаа гарлаа');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    if (!currentTeacher.name || !currentTeacher.role) {
      toast.error('Нэр болон мэргэжил заавал байх ёстой');
      return;
    }

    setIsSaving(true);
    try {
      if (currentTeacher.id) {
        const { id, ...rest } = currentTeacher as any;
        const teacherRef = doc(db, 'teachers', id);
        await updateDoc(teacherRef, {
          ...rest,
          updatedAt: Timestamp.now()
        });
        toast.success('Багшийн мэдээлэл амжилттай шинэчлэгдлээ');
      } else {
        const { id: _omit, ...payload } = currentTeacher as any;
        await addDoc(collection(db, 'teachers'), {
          ...payload,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast.success('Шинэ багш амжилттай нэмэгдлээ');
      }
      setIsEditing(false);
      setCurrentTeacher({
        name: '',
        role: 'Багш',
        bio: '',
        image: '',
        email: '',
        instagram: '',
        facebook: '',
        specialties: []
      });
    } catch (error) {
      console.error('Error saving teacher:', error);
      try {
        handleFirestoreError(error, currentTeacher.id ? OperationType.UPDATE : OperationType.CREATE, 'teachers');
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
      await deleteDoc(doc(db, 'teachers', id));
      toast.success('Багшийн мэдээлэл устгагдлаа', { id: toastId });
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting teacher:', error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `teachers/${id}`);
      } catch (e) {
        toast.error('Устгахад алдаа гарлаа', { id: toastId });
      }
    }
  };

  if (loading && teachers.length === 0) {
    return <div className="p-8 text-center">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Багш нарын удирдлага</h1>
        {!isEditing && (
          <Button 
            onClick={() => {
              setCurrentTeacher({
                name: '',
                role: 'Багш',
                bio: '',
                image: '',
                email: '',
                instagram: '',
                facebook: '',
                specialties: []
              });
              setIsEditing(true);
            }}
            className="bg-brand-ink text-white rounded-full px-6"
          >
            <Plus size={18} className="mr-2" /> Шинэ багш
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-serif">{currentTeacher.id ? 'Багшийн мэдээлэл засах' : 'Шинэ багш нэмэх'}</h2>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              <X size={20} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Нэр</label>
              <Input 
                value={currentTeacher.name}
                onChange={(e) => setCurrentTeacher({ ...currentTeacher, name: e.target.value })}
                placeholder="Багшийн нэр"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Цол/Мэргэжил</label>
              <Input 
                value={currentTeacher.role}
                onChange={(e) => setCurrentTeacher({ ...currentTeacher, role: e.target.value })}
                placeholder="Йогийн багш, Бясалгалын хөтөч..."
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-accent/40">Намтар</label>
            <Textarea 
              value={currentTeacher.bio}
              onChange={(e) => setCurrentTeacher({ ...currentTeacher, bio: e.target.value })}
              placeholder="Багшийн товч намтар..."
              className="rounded-xl h-32"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MediaImageField
              label="Зураг"
              description="Медиа сангаас профайл зураг сонгоно."
              value={currentTeacher.image || ''}
              onChange={(url) => setCurrentTeacher({ ...currentTeacher, image: url })}
            />
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Имэйл</label>
              <Input 
                value={currentTeacher.email}
                onChange={(e) => setCurrentTeacher({ ...currentTeacher, email: e.target.value })}
                placeholder="example@mail.com"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Instagram</label>
              <Input 
                value={currentTeacher.instagram}
                onChange={(e) => setCurrentTeacher({ ...currentTeacher, instagram: e.target.value })}
                placeholder="@username"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Facebook</label>
              <Input 
                value={currentTeacher.facebook}
                onChange={(e) => setCurrentTeacher({ ...currentTeacher, facebook: e.target.value })}
                placeholder="facebook.com/username"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.length === 0 ? (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-accent/40">Багш бүртгэгдээгүй байна.</p>
            </div>
          ) : (
            teachers.map((item) => (
              <div 
                key={item.id} 
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:border-brand-icon/30 transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-gray-100 bg-gray-100">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="w-full h-full p-4 text-accent/20" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg font-serif text-brand-ink truncate">{item.name}</h3>
                    <p className="text-xs text-brand-icon font-bold uppercase tracking-widest">{item.role}</p>
                  </div>
                </div>
                <p className="text-sm text-accent/60 line-clamp-3 mb-6 font-light">{item.bio}</p>
                <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                  <div className="flex gap-2">
                    {item.instagram && <Instagram size={16} className="text-accent/40" />}
                    {item.facebook && <Facebook size={16} className="text-accent/40" />}
                    {item.email && <Mail size={16} className="text-accent/40" />}
                  </div>
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
                            setCurrentTeacher(item);
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
