import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Trash2, Edit, Video, Music, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { resolveOnlineContentThumbnail } from '../lib/online-video-thumb';

export const OnlineContentAdmin: React.FC = () => {
  const [content, setContent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    type: 'video',
    duration: '',
    mediaURL: '',
    category: 'Yoga',
    level: 'Beginner',
    description: '',
  });

  useEffect(() => {
    const q = query(collection(db, 'onlineContent'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setContent(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        // Thumbnail is auto-derived from YouTube URL for videos.
        thumbnailURL:
          formData.type === 'video'
            ? resolveOnlineContentThumbnail({ mediaURL: formData.mediaURL })
            : '',
      };

      if (editingItem) {
        await updateDoc(doc(db, 'onlineContent', editingItem.id), payload);
        toast.success('Амжилттай шинэчлэгдлээ');
      } else {
        await addDoc(collection(db, 'onlineContent'), {
          ...payload,
          createdAt: new Date().toISOString(),
        });
        toast.success('Амжилттай нэмэгдлээ');
      }
      setIsAddOpen(false);
      setEditingItem(null);
      setFormData({
        title: '',
        type: 'video',
        duration: '',
        mediaURL: '',
        category: 'Yoga',
        level: 'Beginner',
        description: '',
      });
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error('Хадгалахад алдаа гарлаа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      type: item.type,
      duration: item.duration || '',
      mediaURL: item.mediaURL,
      category: item.category,
      level: item.level,
      description: item.description || '',
    });
    setIsAddOpen(true);
  };

  const handleDelete = async (id: string) => {
    const toastId = toast.loading('Устгаж байна...');
    try {
      await deleteDoc(doc(db, 'onlineContent', id));
      toast.success('Амжилттай устгагдлаа', { id: toastId });
      setDeleteId(null);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error('Устгахад алдаа гарлаа', { id: toastId });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-light">Онлайн хичээлүүд</h1>
          <p className="text-accent/40 text-sm">Видео болон аудио сангаа удирдана уу.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => {
          setIsAddOpen(open);
          if (!open) {
            setEditingItem(null);
            setFormData({
              title: '',
              type: 'video',
              duration: '',
              mediaURL: '',
              category: 'Yoga',
              level: 'Beginner',
              description: '',
            });
          }
        }}>
          <DialogTrigger
            render={
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-full">
                <Plus className="mr-2 h-4 w-4" /> Контент нэмэх
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[600px] rounded-3xl">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Засах' : 'Онлайн контент нэмэх'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Гарчиг</label>
                <Input 
                  required 
                  value={formData.title} 
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Жишээ: Өглөөний йог"
                  className="rounded-xl"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Төрөл</label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Видео</SelectItem>
                      <SelectItem value="audio">Аудио</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ангилал</label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yoga">Йог</SelectItem>
                      <SelectItem value="Meditation">Бясалгал</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Медиа URL (Видео/Аудио)</label>
                <Input 
                  required 
                  value={formData.mediaURL} 
                  onChange={(e) => setFormData({ ...formData, mediaURL: e.target.value })}
                  placeholder="Медиа сангаас URL-ыг хуулж тавина уу"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Хугацаа</label>
                <Input
                  required
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="Жишээ: 24:15 эсвэл 45 мин"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Түвшин</label>
                <Select 
                  value={formData.level} 
                  onValueChange={(val) => setFormData({ ...formData, level: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Анхан шат</SelectItem>
                    <SelectItem value="Advanced">Ахисан шат</SelectItem>
                    <SelectItem value="All Levels">Бүх түвшин</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Тайлбар</label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Хичээлийн товч тайлбар..."
                  className="rounded-xl min-h-[100px]"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-6 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Хадгалж байна...' : editingItem ? 'Шинэчлэх' : 'Хадгалах'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {content.map((item) => (
          // Cards also use derived thumbnail so old entries without thumbnailURL still render.
          (() => {
            const thumb = resolveOnlineContentThumbnail(item);
            return (
          <Card key={item.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all rounded-2xl group">
            <div className="relative aspect-video overflow-hidden">
              <img
                src={thumb || 'https://picsum.photos/seed/online-content-admin/1280/720'}
                alt={item.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute top-3 right-3 flex gap-2">
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
                      className="h-8 w-8 rounded-full bg-white/90 backdrop-blur-md"
                      onClick={() => handleEdit(item)}
                    >
                      <Edit size={14} />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-8 w-8 rounded-full"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </>
                )}
              </div>
              <div className="absolute bottom-3 left-3">
                <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] uppercase font-bold flex items-center gap-2">
                  {item.type === 'video' ? <Video size={12} /> : <Music size={12} />}
                  {item.type}
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary font-bold mb-2">
                <span>{item.category}</span>
                <span>•</span>
                <span>{item.level}</span>
              </div>
              <h3 className="text-xl font-medium mb-4">{item.title}</h3>
              <Button variant="outline" className="w-full rounded-full border-accent/10 hover:bg-secondary/20">
                <a href={item.mediaURL} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center">
                  <ExternalLink className="mr-2 h-4 w-4" /> Үзэх
                </a>
              </Button>
            </CardContent>
          </Card>
            );
          })()
        ))}
      </div>
    </div>
  );
};
