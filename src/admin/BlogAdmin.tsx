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
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  date: string;
  createdAt: any;
}

export const BlogAdmin: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPost, setCurrentPost] = useState<Partial<BlogPost>>({
    title: '',
    excerpt: '',
    content: '',
    image: '',
    category: 'MINDFULNESS',
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  });

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'blog'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BlogPost[];
      setPosts(fetchedPosts);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'blog');
      } catch (e) {
        toast.error('Нийтлэлүүдийг ачаалахад алдаа гарлаа');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    if (!currentPost.title || !currentPost.content) {
      toast.error('Гарчиг болон агуулга заавал байх ёстой');
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading('Хадгалж байна...');
    try {
      if (currentPost.id) {
        const { id, ...rest } = currentPost as any;
        const postRef = doc(db, 'blog', id);
        await updateDoc(postRef, {
          ...rest,
          updatedAt: Timestamp.now()
        });
        toast.success('Нийтлэл амжилттай шинэчлэгдлээ', { id: toastId });
      } else {
        const { id: _omit, ...payload } = currentPost as any;
        await addDoc(collection(db, 'blog'), {
          ...payload,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        toast.success('Шинэ нийтлэл амжилттай нэмэгдлээ', { id: toastId });
      }
      setIsEditing(false);
      setCurrentPost({
        title: '',
        excerpt: '',
        content: '',
        image: '',
        category: 'MINDFULNESS',
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      });
    } catch (error) {
      console.error('Error saving post:', error);
      try {
        handleFirestoreError(error, currentPost.id ? OperationType.UPDATE : OperationType.CREATE, 'blog');
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
      await deleteDoc(doc(db, 'blog', id));
      toast.success('Нийтлэл устгагдлаа', { id: toastId });
      setDeleteId(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      try {
        handleFirestoreError(error, OperationType.DELETE, `blog/${id}`);
      } catch (e) {
        toast.error('Устгахад алдаа гарлаа', { id: toastId });
      }
    }
  };

  if (loading && posts.length === 0) {
    return <div className="p-8 text-center">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light">Блог удирдлага</h1>
        {!isEditing && (
          <Button 
            onClick={() => {
              setCurrentPost({
                title: '',
                excerpt: '',
                content: '',
                image: '',
                category: 'MINDFULNESS',
                date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              });
              setIsEditing(true);
            }}
            className="bg-brand-ink text-white rounded-full px-6"
          >
            <Plus size={18} className="mr-2" /> Шинэ нийтлэл
          </Button>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-serif">{currentPost.id ? 'Нийтлэл засах' : 'Шинэ нийтлэл нэмэх'}</h2>
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              <X size={20} />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Гарчиг</label>
              <Input 
                value={currentPost.title}
                onChange={(e) => setCurrentPost({ ...currentPost, title: e.target.value })}
                placeholder="Нийтлэлийн гарчиг"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Ангилал</label>
              <select 
                value={currentPost.category}
                onChange={(e) => setCurrentPost({ ...currentPost, category: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-icon/20"
              >
                <option value="MINDFULNESS">MINDFULNESS</option>
                <option value="WELLNESS">WELLNESS</option>
                <option value="YOGA">YOGA</option>
                <option value="LIFESTYLE">LIFESTYLE</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-accent/40">Товч агуулга</label>
            <Textarea 
              value={currentPost.excerpt}
              onChange={(e) => setCurrentPost({ ...currentPost, excerpt: e.target.value })}
              placeholder="Нийтлэлийн товч тайлбар..."
              className="rounded-xl h-24"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-accent/40">Үндсэн агуулга (HTML дэмжинэ)</label>
            <Textarea 
              value={currentPost.content}
              onChange={(e) => setCurrentPost({ ...currentPost, content: e.target.value })}
              placeholder="Нийтлэлийн дэлгэрэнгүй агуулга..."
              className="rounded-xl h-64 font-mono text-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MediaImageField
              label="Зураг"
              description="Нийтлэлийн нүүр зургийг медиа сангаас сонгоно."
              value={currentPost.image || ''}
              onChange={(url) => setCurrentPost({ ...currentPost, image: url })}
            />
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-accent/40">Огноо</label>
              <Input 
                value={currentPost.date}
                onChange={(e) => setCurrentPost({ ...currentPost, date: e.target.value })}
                placeholder="15 Apr 2024"
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
        <div className="grid grid-cols-1 gap-4">
          {posts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <p className="text-accent/40">Нийтлэл байхгүй байна.</p>
            </div>
          ) : (
            posts.map((post) => (
              <div 
                key={post.id} 
                className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6 group hover:border-brand-icon/30 transition-all"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  <img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-icon">{post.category}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-[10px] font-medium text-accent/40 flex items-center gap-1">
                      <Calendar size={10} /> {post.date}
                    </span>
                  </div>
                  <h3 className="text-lg font-serif text-brand-ink truncate">{post.title}</h3>
                  <p className="text-sm text-accent/60 line-clamp-1 font-light">{post.excerpt}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {deleteId === post.id ? (
                    <div className="flex items-center gap-2 bg-red-50 px-3 py-1 rounded-full border border-red-100">
                      <span className="text-[10px] font-bold text-red-600 uppercase">Устгах уу?</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDelete(post.id)}
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
                          setCurrentPost(post);
                          setIsEditing(true);
                        }}
                        className="text-blue-600 hover:bg-blue-50"
                      >
                        <Pencil size={18} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setDeleteId(post.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={18} />
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
