import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { MediaImageField } from './MediaImageField';
import { toast } from 'sonner';

type HeroFormData = {
  image: string;
  title: string;
  subtitle: string;
  cta1Text: string;
  cta1Link: string;
  cta2Text: string;
  cta2Link: string;
};

const defaultFormData: HeroFormData = {
  image: '',
  title: 'Ретрит Аялал',
  subtitle: 'Хамгийн үзэсгэлэнтэй газруудад дотоод амар амгалангаа олоорой.',
  cta1Text: 'ОНЛАЙНААР ХИЧЭЭЛЛЭХ',
  cta1Link: '/online',
  cta2Text: 'СТУДИД ХИЧЭЭЛЛЭХ',
  cta2Link: '/classes',
};

export const HomeHeroAdmin: React.FC = () => {
  const [formData, setFormData] = useState<HeroFormData>(defaultFormData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const heroDocRef = doc(db, 'siteContent', 'homeHero');
    const unsubscribe = onSnapshot(heroDocRef, (snapshot) => {
      if (!snapshot.exists()) {
        setFormData(defaultFormData);
        setLoading(false);
        return;
      }

      const data = snapshot.data() as any;
      setFormData({
        image: data?.image || defaultFormData.image,
        title: data?.title || defaultFormData.title,
        subtitle: data?.subtitle || defaultFormData.subtitle,
        cta1Text: data?.cta1Text || defaultFormData.cta1Text,
        cta1Link: data?.cta1Link || defaultFormData.cta1Link,
        cta2Text: data?.cta2Text || defaultFormData.cta2Text,
        cta2Link: data?.cta2Link || defaultFormData.cta2Link,
      });
      setLoading(false);
    }, (error) => {
      console.error('Failed to load hero settings:', error);
      toast.error('Hero мэдээлэл ачаалахад алдаа гарлаа');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    if (saving) return;
    if (!formData.title.trim() || !formData.subtitle.trim()) {
      toast.error('Гарчиг болон тайлбар заавал шаардлагатай');
      return;
    }

    setSaving(true);
    try {
      const image = formData.image?.trim() || '';
      await setDoc(doc(db, 'siteContent', 'homeHero'), {
        ...formData,
        image,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      toast.success('Hero хэсэг амжилттай хадгалагдлаа');
    } catch (error) {
      console.error('Failed to save hero settings:', error);
      toast.error('Hero хэсэг хадгалахад алдаа гарлаа');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Уншиж байна...</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-light mb-8">Нүүр Hero тохиргоо</h1>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <MediaImageField
          label="Hero зураг"
          description="Медиа сангаас нүүр hero зургийг сонгоно."
          value={formData.image || ''}
          onChange={(url) => setFormData({ ...formData, image: url })}
        />

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-black">Гарчиг</label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black uppercase tracking-widest text-black">Дэд тайлбар</label>
          <Textarea
            value={formData.subtitle}
            onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
            className="rounded-xl min-h-[100px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-black">Button 1 текст</label>
            <Input
              value={formData.cta1Text}
              onChange={(e) => setFormData({ ...formData, cta1Text: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-black">Button 1 link</label>
            <Input
              value={formData.cta1Link}
              onChange={(e) => setFormData({ ...formData, cta1Link: e.target.value })}
              placeholder="/online"
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-black">Button 2 текст</label>
            <Input
              value={formData.cta2Text}
              onChange={(e) => setFormData({ ...formData, cta2Text: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-black">Button 2 link</label>
            <Input
              value={formData.cta2Link}
              onChange={(e) => setFormData({ ...formData, cta2Link: e.target.value })}
              placeholder="/classes"
              className="rounded-xl"
            />
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-ink text-white rounded-full px-8 disabled:opacity-70"
          >
            {saving ? 'Хадгалж байна...' : 'Хадгалах'}
          </Button>
        </div>
      </div>
    </div>
  );
};
