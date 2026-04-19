import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
type GalleryDoc = {
  id: string;
  image: string;
  title: string;
  category?: string;
};

/** Masonry-style spans (same rhythm as previous static layout) */
const TILE_LAYOUT = [
  'md:col-span-2 md:row-span-2',
  'md:col-span-1 md:row-span-1',
  'md:col-span-1 md:row-span-1',
  'md:col-span-1 md:row-span-2',
  'md:col-span-2 md:row-span-1',
  'md:col-span-1 md:row-span-1',
  'md:col-span-1 md:row-span-1',
  'md:col-span-1 md:row-span-1',
  'md:col-span-1 md:row-span-1',
];

export const Gallery: React.FC = () => {
  const [items, setItems] = useState<GalleryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            image: String(data?.image || '').trim(),
            title: String(data?.title || 'Зураг'),
            category: data?.category,
          } as GalleryDoc;
        });
        setItems(rows.filter((r) => r.image));
        setLoadError(false);
        setLoading(false);
      },
      () => {
        setLoadError(true);
        setItems([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="w-full bg-white">
      <section className="pt-32 pb-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center text-center gap-12">
            <div className="max-w-3xl">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-serif text-brand-ink mb-6 leading-tight"
              >
                Студийн Галерей
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-lg text-brand-ink/60 font-light leading-relaxed"
              >
                Манай студи болон ретритүүдийн торгон агшнуудаас. Бидний хамтдаа өнгөрүүлсэн нандин мөчүүдийг эндээс сонирхоорой.
              </motion.p>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 pb-32">
        {loading ? (
          <p className="text-center text-brand-ink/50 py-20">Уншиж байна...</p>
        ) : loadError ? (
          <p className="text-center text-brand-ink/50 py-20">Галерей ачаалахад түр саатал гарлаа.</p>
        ) : items.length === 0 ? (
          <p className="text-center text-brand-ink/50 py-20 max-w-md mx-auto">
            Одоогоор зураг байхгүй байна. Админ самбараас «Галерей» хэсэгт зураг нэмж, энд харуулна уу.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 auto-rows-[300px]">
            {items.map((img, i) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i, 8) * 0.05 }}
                viewport={{ once: true }}
                onClick={() => {
                  setSelectedImg(img.image);
                  setSelectedTitle(img.title);
                }}
                className={`${TILE_LAYOUT[i % TILE_LAYOUT.length]} rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-700 group relative cursor-zoom-in`}
              >
                <img
                  src={img.image}
                  alt={img.title}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                  loading="lazy"
                  decoding="async"
                />
                <div className="pointer-events-none absolute inset-0 z-[2] bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setSelectedImg(null);
              setSelectedTitle('');
            }}
            className="fixed inset-0 z-[100] bg-brand-ink/95 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
          >
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImg(null);
                setSelectedTitle('');
              }}
              className="absolute top-10 right-10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </motion.button>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative flex max-h-[85vh] w-full max-w-6xl items-center justify-center rounded-lg shadow-2xl"
            >
              <div className="relative h-[min(85vh,900px)] w-full min-h-[240px] overflow-hidden rounded-lg">
                <img
                  src={selectedImg}
                  alt={selectedTitle || 'Gallery'}
                  className="absolute inset-0 h-full w-full object-contain"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
