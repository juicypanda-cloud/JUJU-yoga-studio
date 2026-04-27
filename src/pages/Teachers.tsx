import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'lucide-react';

type Teacher = {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
};

export const Teachers: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'teachers'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows = snapshot.docs.map((teacherDoc) => {
          const data = teacherDoc.data() as Record<string, unknown>;
          return {
            id: teacherDoc.id,
            name: String(data?.name || '').trim() || 'Багш',
            role: String(data?.role || '').trim() || 'Багш',
            bio: String(data?.bio || '').trim(),
            image: String(data?.image || '').trim(),
          } as Teacher;
        });
        setTeachers(rows);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading teachers:', error);
        setTeachers([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Warm cache for first visible teacher cards.
    const links: HTMLLinkElement[] = [];
    teachers
      .slice(0, 6)
      .map((teacher) => teacher.image)
      .filter(Boolean)
      .forEach((url) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
        links.push(link);

        const img = new Image();
        img.decoding = 'async';
        img.src = url;
      });

    return () => {
      links.forEach((link) => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, [teachers]);

  return (
    <div className="pt-32 pb-20 min-h-screen bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-20">
          <h1 className="text-4xl md:text-5xl font-serif mb-6 text-brand-ink">Манай багш нар</h1>
          <p className="text-lg text-brand-ink/60 font-light leading-relaxed">
            Таныг эрүүл мэндийн аялалд тань хөтлөх мэргэжлийн баг хамт олон.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="text-center animate-pulse">
                <div className="mb-8 mx-auto aspect-square max-w-[240px] rounded-full bg-secondary/40" />
                <div className="mx-auto mb-3 h-7 w-40 rounded bg-secondary/40" />
                <div className="mx-auto mb-4 h-4 w-28 rounded bg-secondary/30" />
                <div className="mx-auto h-4 w-56 rounded bg-secondary/30" />
              </div>
            ))}
          </div>
        ) : teachers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-brand-ink/15 py-20 text-center">
            <p className="text-brand-ink/45">Одоогоор багшийн мэдээлэл нэмэгдээгүй байна.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {teachers.map((teacher, i) => (
              <motion.div
                key={teacher.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="relative mb-8 mx-auto aspect-square max-w-[240px] overflow-hidden rounded-full shadow-2xl shadow-brand-ink/10 transition-all duration-500 hover:-translate-y-2">
                  {teacher.image ? (
                    <img
                      src={teacher.image}
                      alt={teacher.name}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading={i < 6 ? 'eager' : 'lazy'}
                      fetchPriority={i < 6 ? 'high' : 'auto'}
                      decoding="async"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-secondary/30 text-brand-ink/30">
                      <User size={72} strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <h3 className="mb-2 text-2xl font-light text-brand-ink">{teacher.name}</h3>
                <p className="mb-4 text-primary font-medium">{teacher.role}</p>
                <p className="text-sm leading-relaxed text-brand-ink/60">
                  {teacher.bio || 'Тун удахгүй багшийн дэлгэрэнгүй мэдээлэл нэмэгдэнэ.'}
                </p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
